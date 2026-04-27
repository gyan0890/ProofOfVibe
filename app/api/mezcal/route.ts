import { NextRequest, NextResponse } from "next/server";

const MEZCAL_URL = process.env.NEXT_PUBLIC_MEZCAL_API_URL;
const MEZCAL_KEY = process.env.NEXT_PUBLIC_MEZCAL_API_KEY;

/** GET /api/mezcal?contract=0x...&selector=0x...&calldata=a,b&chain=SN_SEPOLIA */
export async function GET(req: NextRequest) {
  if (!MEZCAL_URL || !MEZCAL_KEY) {
    return NextResponse.json({ error: "Mezcal not configured" }, { status: 503 });
  }

  const p = req.nextUrl.searchParams;
  const contract = p.get("contract");
  const selector = p.get("selector");
  const calldataRaw = p.get("calldata"); // comma-joined from client
  const chain = p.get("chain") ?? "SN_SEPOLIA";

  if (!contract || !selector) {
    return NextResponse.json({ error: "contract and selector required" }, { status: 400 });
  }

  const url = new URL(`${MEZCAL_URL}/v1/${chain}/contract/${contract}/read`);
  url.searchParams.set("selector", selector);
  url.searchParams.set("block_tag", "latest");
  // Mezcal expects repeated params: calldata=a&calldata=b
  if (calldataRaw) {
    for (const c of calldataRaw.split(",")) url.searchParams.append("calldata", c);
  }

  try {
    const res = await fetch(url.toString(), {
      headers: { "X-Mezcal-Api-Key": MEZCAL_KEY },
      cache: "no-store",
    });
    const text = await res.text();
    if (!res.ok) {
      console.error(`[mezcal proxy] ${res.status} from Mezcal:`, text);
      return NextResponse.json({ error: text }, { status: res.status });
    }
    return new NextResponse(text, {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (e: any) {
    console.error("[mezcal proxy] fetch failed:", e.message);
    return NextResponse.json({ error: e.message }, { status: 502 });
  }
}
