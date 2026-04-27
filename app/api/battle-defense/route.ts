import { Redis } from "@upstash/redis";
import { NextRequest, NextResponse } from "next/server";
import { RpcProvider, Contract, shortString } from "starknet";
import { resolvePendingBattles } from "@/lib/resolveOracle";
import { sendChannelMessage } from "@/lib/telegram";

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
});

const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL ?? "https://proof-of-vibe-kohl.vercel.app").replace(/\/$/, "");
const VIBECARD_ADDRESS = process.env.NEXT_PUBLIC_VIBECARD_CONTRACT_ADDRESS!;
const RPC_URL = process.env.NEXT_PUBLIC_STARKNET_RPC_URL!;

const BATTLE_ABI = [
  { type: "struct", name: "vibe_card::BattleData", members: [
    { name: "challenger_token", type: "core::integer::u256" },
    { name: "defender_token", type: "core::integer::u256" },
    { name: "challenger_commitment", type: "core::felt252" },
    { name: "defender_commitment", type: "core::felt252" },
    { name: "challenger_activity_score", type: "core::integer::u32" },
    { name: "defender_activity_score", type: "core::integer::u32" },
    { name: "status", type: "core::integer::u8" },
    { name: "winner", type: "core::integer::u256" },
    { name: "initiated_at", type: "core::integer::u64" },
  ]},
  { type: "struct", name: "vibe_card::CardData", members: [
    { name: "owner", type: "core::starknet::contract_address::ContractAddress" },
    { name: "commitment", type: "core::felt252" },
    { name: "ipfs_cid", type: "core::felt252" },
    { name: "revealed_type", type: "core::integer::u8" },
    { name: "palette_revealed", type: "core::bool" },
    { name: "mint_timestamp", type: "core::integer::u64" },
    { name: "persona_name", type: "core::felt252" },
  ]},
  { type: "function", name: "get_battle",
    inputs: [{ name: "battle_id", type: "core::integer::u256" }],
    outputs: [{ type: "vibe_card::BattleData" }], state_mutability: "view" },
  { type: "function", name: "get_card",
    inputs: [{ name: "token_id", type: "core::integer::u256" }],
    outputs: [{ type: "vibe_card::CardData" }], state_mutability: "view" },
] as const;

function key(battleId: number) { return `battle-defense:${battleId}`; }

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

    await redis.set(key(Number(battleId)), { move, nonce }, { ex: 60 * 60 * 24 * 30 });
    await redis.zadd("battles:pending_resolve", { score: Date.now(), member: String(battleId) });

    // Notify Telegram before returning (Vercel kills the function after response)
    await notifyTelegram(Number(battleId));

    // Fire-and-forget resolve — cron is the safety net if this gets cut off
    resolvePendingBattles(1).then(({ resolved, skipped }) => {
      console.log(`[defense] resolve triggered — resolved: ${resolved}, skipped: ${JSON.stringify(skipped)}`);
    }).catch((e) => console.error("[defense] resolve error:", e));

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("battle-defense POST error:", e);
    return NextResponse.json({ error: "internal error" }, { status: 500 });
  }
}

async function notifyTelegram(battleId: number) {
  try {
    const provider = new RpcProvider({ nodeUrl: RPC_URL });
    const contract = new Contract({ abi: BATTLE_ABI as any, address: VIBECARD_ADDRESS, providerOrAccount: provider });

    const battle = await contract.get_battle({ low: battleId, high: 0 });
    const challengerTokenId = Number(battle.challenger_token);
    const defenderTokenId = Number(battle.defender_token);

    const getName = async (tokenId: number): Promise<string> => {
      try {
        const raw = await contract.get_card({ low: tokenId, high: 0 });
        return shortString.decodeShortString(raw.persona_name?.toString() ?? "0x0");
      } catch { return `Card #${tokenId}`; }
    };

    const [challengerName, defenderName] = await Promise.all([
      getName(challengerTokenId),
      getName(defenderTokenId),
    ]);

    const text =
      `🛡 <b>Battle #${battleId}</b>\n` +
      `<b>${defenderName}</b> responded to <b>${challengerName}</b>'s challenge!\n\n` +
      `⚡ Oracle is resolving the battle…`;

    await sendChannelMessage(text);
  } catch (e) {
    console.error("[defense] Telegram notify error:", e);
  }
}
