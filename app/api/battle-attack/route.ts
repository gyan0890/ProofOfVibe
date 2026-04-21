import { Redis } from "@upstash/redis";
import { NextRequest, NextResponse } from "next/server";

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
});

function key(battleId: number) {
  return `battle-attack:${battleId}`;
}

/** GET /api/battle-attack?battleId=N */
export async function GET(req: NextRequest) {
  const id = Number(req.nextUrl.searchParams.get("battleId"));
  if (!id) return NextResponse.json({ error: "battleId required" }, { status: 400 });
  try {
    const data = await redis.get<{ move: number; nonce: string }>(key(id));
    return NextResponse.json({ attack: data ?? null });
  } catch (e) {
    console.error("battle-attack GET error:", e);
    return NextResponse.json({ attack: null });
  }
}

/** POST /api/battle-attack  body: { battleId, move, nonce } */
export async function POST(req: NextRequest) {
  try {
    const { battleId, move, nonce } = await req.json();
    if (!battleId || move === undefined || !nonce) {
      return NextResponse.json({ error: "battleId, move, nonce required" }, { status: 400 });
    }
    await redis.set(key(Number(battleId)), { move, nonce }, { ex: 86400 });
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("battle-attack POST error:", e);
    return NextResponse.json({ error: "internal error" }, { status: 500 });
  }
}
