import { RpcProvider, Account, CallData, cairo } from "starknet";
import { Redis } from "@upstash/redis";

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
    } catch (e: any) {
      const msg = e?.message ?? String(e);
      console.error(`[oracle] battle ${battleId} failed:`, msg);

      if (msg.includes("Already resolved") || msg.includes("Not ready to resolve")) {
        await redis.zrem("battles:pending_resolve", String(battleId));
        skipped.push({ battleId, reason: "Already resolved onchain" });
      } else {
        skipped.push({ battleId, reason: msg.slice(0, 120) });
      }
    }
  }

  return { resolved, skipped };
}
