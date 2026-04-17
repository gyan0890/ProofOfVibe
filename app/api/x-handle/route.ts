import { Redis } from "@upstash/redis";
import { NextRequest, NextResponse } from "next/server";

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
});

// Key format: xhandle:{normalizedAddress}
function key(address: string) {
  return `xhandle:${address.toLowerCase()}`;
}

/** GET /api/x-handle?address=0x... */
export async function GET(req: NextRequest) {
  const address = req.nextUrl.searchParams.get("address");
  if (!address) {
    return NextResponse.json({ error: "address required" }, { status: 400 });
  }
  try {
    const handle = await redis.get<string>(key(address));
    return NextResponse.json({ handle: handle ?? null });
  } catch (e) {
    console.error("x-handle GET error:", e);
    return NextResponse.json({ handle: null });
  }
}

/** POST /api/x-handle  body: { address, handle } */
export async function POST(req: NextRequest) {
  try {
    const { address, handle } = await req.json();
    if (!address || typeof address !== "string") {
      return NextResponse.json({ error: "address required" }, { status: 400 });
    }
    // Allow clearing the handle by passing empty string
    const cleaned = (handle ?? "").replace(/^@/, "").trim().slice(0, 30);
    if (cleaned) {
      await redis.set(key(address), cleaned);
    } else {
      await redis.del(key(address));
    }
    return NextResponse.json({ ok: true, handle: cleaned || null });
  } catch (e) {
    console.error("x-handle POST error:", e);
    return NextResponse.json({ error: "internal error" }, { status: 500 });
  }
}
