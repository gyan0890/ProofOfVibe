import { RpcProvider, Account, CallData, cairo, Contract, shortString } from "starknet";
import { Redis } from "@upstash/redis";
import { sendChannelMessage } from "@/lib/telegram";

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
});

const VIBECARD_ADDRESS = process.env.NEXT_PUBLIC_VIBECARD_CONTRACT_ADDRESS!;
const ORACLE_ADDRESS = process.env.ORACLE_ADDRESS!;
const ORACLE_PRIVATE_KEY = process.env.ORACLE_PRIVATE_KEY!;

// Try RPC URLs in order — Alchemy v0_10 rejects l1_data_gas, so prefer fallbacks
const ORACLE_RPC_URLS = [
  process.env.NEXT_PUBLIC_STARKNET_RPC_FALLBACK_1,
  process.env.NEXT_PUBLIC_STARKNET_RPC_FALLBACK_2,
  process.env.NEXT_PUBLIC_STARKNET_RPC_URL,
  "https://starknet-sepolia-rpc.publicnode.com",
].filter(Boolean) as string[];

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

  // Use first available RPC for reads; execute() will iterate ORACLE_RPC_URLS
  const readProvider = new RpcProvider({ nodeUrl: ORACLE_RPC_URLS[0] });
  const readContract = new Contract({ abi: NOTIFY_ABI as any, address: VIBECARD_ADDRESS, providerOrAccount: readProvider });

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

      const RESOURCE_BOUNDS = {
        l1_gas:      { max_amount: BigInt(0),        max_price_per_unit: BigInt('0x200000000000000') },
        l2_gas:      { max_amount: BigInt(0x100000), max_price_per_unit: BigInt('0x1000000000') },
        l1_data_gas: { max_amount: BigInt(0x2000),   max_price_per_unit: BigInt('0x20000000000') },
      };

      let result: { transaction_hash: string } | undefined;
      let execError: any;
      for (const rpcUrl of ORACLE_RPC_URLS) {
        try {
          const provider = new RpcProvider({ nodeUrl: rpcUrl });
          const oracle = new Account({ provider, address: ORACLE_ADDRESS, signer: ORACLE_PRIVATE_KEY });
          result = await oracle.execute([{
            contractAddress: VIBECARD_ADDRESS,
            entrypoint: "resolve_battle",
            calldata,
          }], { version: "0x3", resourceBounds: RESOURCE_BOUNDS, tip: BigInt(0) });
          execError = undefined;
          console.log(`[oracle] used rpc: ${rpcUrl.slice(0, 50)}`);
          break;
        } catch (rpcErr: any) {
          execError = rpcErr;
          const msg = rpcErr?.baseError?.data ?? rpcErr?.message ?? "";
          if (String(msg).includes("unexpected field") || String(msg).includes("l1_data_gas")) {
            console.warn(`[oracle] ${rpcUrl.slice(0,50)} rejected l1_data_gas — trying next`);
            continue;
          }
          throw rpcErr;
        }
      }
      if (!result) throw execError ?? new Error("All RPC URLs failed");

      console.log(`[oracle] battle ${battleId} resolved — tx: ${result.transaction_hash}`);

      await Promise.all([
        redis.zrem("battles:pending_resolve", String(battleId)),
        redis.del(`battle-attack:${battleId}`),
        redis.del(`battle-defense:${battleId}`),
      ]);

      resolved.push(battleId);
      await notifyResolved(readProvider, battleId);
    } catch (e: any) {
      const msg = e?.message ?? String(e);
      const base = e?.baseError;
      const detail = base
        ? `code=${base.code} message=${base.message} data=${JSON.stringify(base.data ?? "").slice(0, 300)}`
        : msg.slice(0, 400);
      console.error(`[oracle] battle ${battleId} failed:`, detail);

      if (msg.includes("Already resolved")) {
        await redis.zrem("battles:pending_resolve", String(battleId));
        skipped.push({ battleId, reason: "Already resolved onchain" });
        await notifyResolved(readProvider, battleId);
      } else if (msg.includes("Not ready to resolve")) {
        // Defender tx not yet confirmed onchain — leave in queue for cron retry
        skipped.push({ battleId, reason: "Defender tx pending — will retry" });
      } else {
        skipped.push({ battleId, reason: detail });
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
