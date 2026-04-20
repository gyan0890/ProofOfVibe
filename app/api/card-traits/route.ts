import { Redis } from "@upstash/redis";
import { NextRequest, NextResponse } from "next/server";

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
});

// Key: card-traits:{tokenId}
// Value: PrivacyProfile — stored permanently (season lasts weeks)
function key(tokenId: number) {
  return `card-traits:${tokenId}`;
}

/** GET /api/card-traits?tokenId=N */
export async function GET(req: NextRequest) {
  const id = Number(req.nextUrl.searchParams.get("tokenId"));
  if (!id) return NextResponse.json({ traits: null });
  try {
    const data = await redis.get<object>(key(id));
    return NextResponse.json({ traits: data ?? null });
  } catch (e) {
    console.error("card-traits GET error:", e);
    return NextResponse.json({ traits: null });
  }
}

/** POST /api/card-traits  body: { tokenId, privacyProfile } */
export async function POST(req: NextRequest) {
  try {
    const { tokenId, privacyProfile } = await req.json();
    if (!tokenId || !privacyProfile) {
      return NextResponse.json({ error: "tokenId and privacyProfile required" }, { status: 400 });
    }
    // Store without expiry — persists for the whole season
    await redis.set(key(Number(tokenId)), privacyProfile);
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("card-traits POST error:", e);
    return NextResponse.json({ error: "internal error" }, { status: 500 });
  }
}
