import { Redis } from "@upstash/redis";
import { NextRequest, NextResponse } from "next/server";
import { resolvePendingBattles } from "@/lib/resolveOracle";

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
});

function key(battleId: number) {
  return `battle-defense:${battleId}`;
}

/** GET /api/battle-defense?battleId=N */
export async function GET(req: NextRequest) {
  const id = Number(req.nextUrl.searchParams.get("battleId"));
  if (!id) return NextResponse.json({ error: "battleId required" }, { status: 400 });
  try {
    const data = await redis.get<{ move: number; nonce: string }>(key(id));
    return NextResponse.json({ defense: data ?? null });
  } catch (e) {
    console.error("battle-defense GET error:", e);
    return NextResponse.json({ defense: null });
  }
}

/** POST /api/battle-defense  body: { battleId, move, nonce } */
export async function POST(req: NextRequest) {
  try {
    const { battleId, move, nonce } = await req.json();
    if (!battleId || move === undefined || !nonce) {
      return NextResponse.json({ error: "battleId, move, nonce required" }, { status: 400 });
    }

    // Store defense move and enqueue
    await redis.set(key(Number(battleId)), { move, nonce }, { ex: 86400 });
    await redis.zadd("battles:pending_resolve", { score: Date.now(), member: String(battleId) });

    // Respond to the client immediately — don't block on resolution
    const responsePromise = NextResponse.json({ ok: true });

    // Trigger resolution in the background — no await so the client gets an instant response
    resolvePendingBattles(1).then(({ resolved, skipped }) => {
      console.log(`[defense] immediate resolve triggered — resolved: ${resolved}, skipped: ${JSON.stringify(skipped)}`);
    }).catch((e) => {
      console.error("[defense] immediate resolve error:", e);
    });

    return responsePromise;
  } catch (e) {
    console.error("battle-defense POST error:", e);
    return NextResponse.json({ error: "internal error" }, { status: 500 });
  }
}
