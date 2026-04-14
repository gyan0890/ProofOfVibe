import { NextRequest } from "next/server";

const PRIVACY_API_BASE =
  "http://ec2-13-39-163-72.eu-west-3.compute.amazonaws.com:3000";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const address = request.nextUrl.searchParams.get("address");
  if (!address) {
    return new Response("Missing address parameter", { status: 400 });
  }

  try {
    const upstream = await fetch(
      `${PRIVACY_API_BASE}/api/scan?address=${encodeURIComponent(address)}`,
      {
        headers: {
          Accept: "text/event-stream",
          "Cache-Control": "no-cache",
        },
      }
    );

    if (!upstream.ok) {
      return new Response(`Upstream error: ${upstream.status}`, {
        status: 502,
      });
    }

    // Stream the SSE response straight through to the client
    return new Response(upstream.body, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache, no-transform",
        Connection: "keep-alive",
        "X-Accel-Buffering": "no",
        "Access-Control-Allow-Origin": "*",
      },
    });
  } catch (err: any) {
    return new Response(`Privacy API unavailable: ${err?.message ?? "unknown"}`, {
      status: 503,
    });
  }
}
