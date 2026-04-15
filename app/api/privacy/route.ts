import { NextRequest } from "next/server";

// New endpoint — plain JSON export, no SSE needed
const PRIVACY_API_BASE = "http://178.104.192.180:3000";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
// The upstream scan can take up to ~15 s
export const maxDuration = 30;

export async function GET(request: NextRequest) {
  const address = request.nextUrl.searchParams.get("address");
  if (!address) {
    return new Response("Missing address parameter", { status: 400 });
  }

  try {
    const upstream = await fetch(
      `${PRIVACY_API_BASE}/api/scan/${encodeURIComponent(address)}/export`,
      { headers: { Accept: "application/json" } }
    );

    if (!upstream.ok) {
      return new Response(`Upstream error: ${upstream.status}`, { status: 502 });
    }

    const data = await upstream.json();

    // The upstream API returns {"error": "..."} with HTTP 200 for unsupported
    // addresses (e.g. Starknet). Forward those as 422 so the UI can handle them.
    if (data?.error) {
      return Response.json({ error: data.error }, { status: 422 });
    }

    return Response.json(data);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "unknown error";
    return new Response(`Privacy API unavailable: ${msg}`, { status: 503 });
  }
}
