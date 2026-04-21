import { NextRequest, NextResponse } from "next/server";
import { resolvePendingBattles } from "@/lib/resolveOracle";

// Simple guard: only the Vercel cron or a request with the right secret can trigger this
function isAuthorized(req: NextRequest): boolean {
  if (req.headers.get("x-vercel-cron") === "1") return true;
  const secret = req.headers.get("x-oracle-secret");
  if (secret && secret === process.env.ORACLE_SECRET) return true;
  return false;
}

export async function GET(req: NextRequest) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const result = await resolvePendingBattles(5);
  return NextResponse.json(result);
}
