import { RpcProvider, Account, CallData, cairo, Contract, shortString } from "starknet";
import { Redis } from "@upstash/redis";
import { sendChannelMessage } from "@/lib/telegram";

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
});

const VIBECARD_ADDRESS = process.env.NEXT_PUBLIC_VIBECARD_CONTRACT_ADDRESS!;
const RPC_URL = process.env.NEXT_PUBLIC_STARKNET_RPC_URL!;
const ORACLE_ADDRESS = process.env.ORACLE_ADDRESS!;
const ORACLE_PRIVATE_KEY = process.env.ORACLE_PRIVATE_KEY!;

export interface ResolveResult {
  resolved: number[];
  skipped: { battleId: number; reason: string }[];
}

const NOTIFY_ABI = [
  { type: "struct", name: "vibe_card::BattleData", members: [
    { name: "challenger_token", type: "core::integer::u256" },
    { name: "defender_token", type: "core::integer::u256" },
    { name: "challenger_commitment", type: "core::felt252" },
    { name: "defender_commitment", type: "core::felt252" },
    { name: "challenger_activity_score", type: "core::integer::u32" },
    { name: "defender_activity_score", type: "core::integer::u32" },
    { name: "status", type: "core::integer::u8" },
    { name: "winner", type: "core::integer::u256" },
    { name: "initiated_at", type: "core::integer::u64" },
  ]},
  { type: "struct", name: "vibe_card::CardData", members: [
    { name: "owner", type: "core::starknet::contract_address::ContractAddress" },
    { name: "commitment", type: "core::felt252" },
    { name: "ipfs_cid", type: "core::felt252" },
    { name: "revealed_type", type: "core::integer::u8" },
    { name: "palette_revealed", type: "core::bool" },
    { name: "mint_timestamp", type: "core::integer::u64" },
    { name: "persona_name", type: "core::felt252" },
  ]},
  { type: "function", name: "get_battle",
    inputs: [{ name: "battle_id", type: "core::integer::u256" }],
    outputs: [{ type: "vibe_card::BattleData" }], state_mutability: "view" },
  { type: "function", name: "get_card",
    inputs: [{ name: "token_id", type: "core::integer::u256" }],
    outputs: [{ type: "vibe_card::CardData" }], state_mutability: "view" },
] as const;

/**
 * Pop up to `limit` battles from the pending queue and resolve them onchain.
 * Called by the Vercel cron AND immediately after a defender submits their move.
 */
export async function resolvePendingBattles(limit = 5): Promise<ResolveResult> {
  if (!ORACLE_ADDRESS || !ORACLE_PRIVATE_KEY) {
    return { resolved: [], skipped: [{ battleId: 0, reason: "Oracle wallet not configured" }] };
  }

  const provider = new RpcProvider({ nodeUrl: RPC_URL });
  const oracle = new Account({ provider, address: ORACLE_ADDRESS, signer: ORACLE_PRIVATE_KEY });
  const readContract = new Contract({ abi: NOTIFY_ABI as any, address: VIBECARD_ADDRESS, providerOrAccount: provider });

  const pending = await redis.zrange("battles:pending_resolve", 0, limit - 1);
  if (!pending || pending.length === 0) {
    return { resolved: [], skipped: [] };
  }

  const resolved: number[] = [];
  const skipped: { battleId: number; reason: string }[] = [];

  for (const item of pending) {
    const battleId = Number(item);
    if (!battleId) continue;

    try {
      const [attackData, defenseData] = await Promise.all([
        redis.get<{ move: number; nonce: string }>(`battle-attack:${battleId}`),
        redis.get<{ move: number; nonce: string }>(`battle-defense:${battleId}`),
      ]);

      if (!attackData || !defenseData) {
        skipped.push({ battleId, reason: `Missing moves — attack:${!!attackData} defense:${!!defenseData}` });
        continue;
      }

      // Pre-flight: confirm defender tx is confirmed before submitting resolve
      const onchainBattle = await readContract.get_battle({ low: battleId, high: 0 });
      const onchainStatus = Number(onchainBattle.status);
      if (onchainStatus === 2) {
        await redis.zrem("battles:pending_resolve", String(battleId));
        skipped.push({ battleId, reason: "Already resolved onchain" });
        continue;
      }
      if (onchainStatus !== 1) {
        skipped.push({ battleId, reason: `Defender tx not yet confirmed (status ${onchainStatus}) — will retry` });
        continue;
      }

      console.log(`[oracle] resolving battle ${battleId} — challenger move ${attackData.move}, defender move ${defenseData.move}`);

      const u256 = cairo.uint256(battleId);
      const calldata = CallData.compile([
        u256,
        attackData.move,
        attackData.nonce,
        defenseData.move,
        defenseData.nonce,
      ]);

      const result = await oracle.execute([{
        contractAddress: VIBECARD_ADDRESS,
        entrypoint: "resolve_battle",
        calldata,
      }]);

      console.log(`[oracle] battle ${battleId} resolved — tx: ${result.transaction_hash}`);

      await Promise.all([
        redis.zrem("battles:pending_resolve", String(battleId)),
        redis.del(`battle-attack:${battleId}`),
        redis.del(`battle-defense:${battleId}`),
      ]);

      resolved.push(battleId);
      await notifyResolved(provider, battleId);
    } catch (e: any) {
      const msg = e?.message ?? String(e);
      console.error(`[oracle] battle ${battleId} failed:`, msg);

      if (msg.includes("Already resolved")) {
        await redis.zrem("battles:pending_resolve", String(battleId));
        skipped.push({ battleId, reason: "Already resolved onchain" });
      } else if (msg.includes("Not ready to resolve")) {
        // Defender tx not yet confirmed onchain — leave in queue for cron retry
        skipped.push({ battleId, reason: "Defender tx pending — will retry" });
      } else {
        skipped.push({ battleId, reason: msg.slice(0, 120) });
      }
    }
  }

  return { resolved, skipped };
}


async function notifyResolved(provider: RpcProvider, battleId: number) {
  try {
    const contract = new Contract({ abi: NOTIFY_ABI as any, address: VIBECARD_ADDRESS, providerOrAccount: provider });
    const battle = await contract.get_battle({ low: battleId, high: 0 });

    const winnerToken = Number(battle.winner);
    const challengerToken = Number(battle.challenger_token);
    const defenderToken = Number(battle.defender_token);

    const getName = async (tokenId: number): Promise<string> => {
      try {
        const raw = await contract.get_card({ low: tokenId, high: 0 });
        return shortString.decodeShortString(raw.persona_name?.toString() ?? "0x0");
      } catch { return `Card #${tokenId}`; }
    };

    const [challengerName, defenderName] = await Promise.all([
      getName(challengerToken),
      getName(defenderToken),
    ]);

    const winnerName = winnerToken === challengerToken ? challengerName : defenderName;
    const loserName = winnerToken === challengerToken ? defenderName : challengerName;

    const text =
      `🏆 <b>Battle #${battleId} resolved!</b>
` +
      `<b>${winnerName}</b> defeated <b>${loserName}</b>`;

    await sendChannelMessage(text);
  } catch (e) {
    console.error(`[oracle] notify resolved error for battle ${battleId}:`, e);
  }
}
