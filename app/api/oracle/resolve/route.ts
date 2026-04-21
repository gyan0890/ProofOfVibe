import { NextRequest, NextResponse } from "next/server";
import { RpcProvider, Account, CallData, cairo, num } from "starknet";
import { Redis } from "@upstash/redis";

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
});

const VIBECARD_ADDRESS = process.env.NEXT_PUBLIC_VIBECARD_CONTRACT_ADDRESS!;
const RPC_URL = process.env.NEXT_PUBLIC_STARKNET_RPC_URL!;
const ORACLE_ADDRESS = process.env.ORACLE_ADDRESS!;
const ORACLE_PRIVATE_KEY = process.env.ORACLE_PRIVATE_KEY!;

// Simple guard: only the Vercel cron or a request with the right secret can trigger this
function isAuthorized(req: NextRequest): boolean {
  // Vercel cron calls set this header automatically
  if (req.headers.get("x-vercel-cron") === "1") return true;
  // Allow manual trigger with secret for testing
  const secret = req.headers.get("x-oracle-secret");
  if (secret && secret === process.env.ORACLE_SECRET) return true;
  return false;
}

export async function GET(req: NextRequest) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  if (!ORACLE_ADDRESS || !ORACLE_PRIVATE_KEY) {
    return NextResponse.json({ error: "Oracle wallet not configured" }, { status: 500 });
  }

  const provider = new RpcProvider({ nodeUrl: RPC_URL });
  const oracle = new Account({
    provider,
    address: ORACLE_ADDRESS,
    signer: ORACLE_PRIVATE_KEY,
  });

  // Pop up to 5 battles from the queue (oldest first)
  const pending = await redis.zrange("battles:pending_resolve", 0, 4);
  if (!pending || pending.length === 0) {
    return NextResponse.json({ resolved: [], skipped: [], message: "No battles pending" });
  }

  const resolved: number[] = [];
  const skipped: { battleId: number; reason: string }[] = [];

  for (const item of pending) {
    const battleId = Number(item);
    if (!battleId) continue;

    try {
      // Fetch both moves from Redis
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

      // Remove from queue and clean up moves
      await Promise.all([
        redis.zrem("battles:pending_resolve", String(battleId)),
        redis.del(`battle-attack:${battleId}`),
        redis.del(`battle-defense:${battleId}`),
      ]);

      resolved.push(battleId);
    } catch (e: any) {
      const msg = e?.message ?? String(e);
      console.error(`[oracle] battle ${battleId} failed:`, msg);

      // If already resolved onchain, remove from queue silently
      if (msg.includes("Already resolved") || msg.includes("Not ready to resolve")) {
        await redis.zrem("battles:pending_resolve", String(battleId));
        skipped.push({ battleId, reason: "Already resolved onchain" });
      } else {
        skipped.push({ battleId, reason: msg.slice(0, 120) });
      }
    }
  }

  return NextResponse.json({ resolved, skipped });
}
