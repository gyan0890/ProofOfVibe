import { Redis } from "@upstash/redis";
import { NextRequest, NextResponse } from "next/server";
import { RpcProvider, Contract, shortString } from "starknet";
import { sendChannelMessage } from "@/lib/telegram";

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
});

const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL ?? "https://proof-of-vibe-kohl.vercel.app").replace(/\/$/, "");
const VIBECARD_ADDRESS = process.env.NEXT_PUBLIC_VIBECARD_CONTRACT_ADDRESS!;
const RPC_URL = process.env.NEXT_PUBLIC_STARKNET_RPC_URL!;

const CARD_ABI = [
  { type: "struct", name: "vibe_card::CardData", members: [
    { name: "owner", type: "core::starknet::contract_address::ContractAddress" },
    { name: "commitment", type: "core::felt252" },
    { name: "ipfs_cid", type: "core::felt252" },
    { name: "revealed_type", type: "core::integer::u8" },
    { name: "palette_revealed", type: "core::bool" },
    { name: "mint_timestamp", type: "core::integer::u64" },
    { name: "persona_name", type: "core::felt252" },
  ]},
  { type: "function", name: "get_card",
    inputs: [{ name: "token_id", type: "core::integer::u256" }],
    outputs: [{ type: "vibe_card::CardData" }], state_mutability: "view" },
] as const;

function key(battleId: number) { return `battle-attack:${battleId}`; }

async function fetchPersonaName(tokenId: number): Promise<string> {
  try {
    const provider = new RpcProvider({ nodeUrl: RPC_URL });
    const contract = new Contract({ abi: CARD_ABI as any, address: VIBECARD_ADDRESS, providerOrAccount: provider });
    const raw = await contract.get_card({ low: tokenId, high: 0 });
    return shortString.decodeShortString(raw.persona_name?.toString() ?? "0x0");
  } catch {
    return `Card #${tokenId}`;
  }
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

/** POST /api/battle-attack  body: { battleId, move, nonce, challengerTokenId?, defenderTokenId? } */
export async function POST(req: NextRequest) {
  try {
    const { battleId, move, nonce, challengerTokenId, defenderTokenId } = await req.json();
    if (!battleId || move === undefined || !nonce) {
      return NextResponse.json({ error: "battleId, move, nonce required" }, { status: 400 });
    }

    await redis.set(key(Number(battleId)), { move, nonce }, { ex: 60 * 60 * 24 * 30 });

    if (challengerTokenId && defenderTokenId) {
      await notifyTelegram(battleId, challengerTokenId, defenderTokenId);
    }

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("battle-attack POST error:", e);
    return NextResponse.json({ error: "internal error" }, { status: 500 });
  }
}

async function notifyTelegram(battleId: number, challengerTokenId: number, defenderTokenId: number) {
  const [challengerName, defenderName] = await Promise.all([
    fetchPersonaName(challengerTokenId),
    fetchPersonaName(defenderTokenId),
  ]);

  const respondUrl = `${SITE_URL}/battle/respond/${battleId}`;

  const text =
    `⚔️ <b>Battle #${battleId}</b>\n` +
    `<b>${challengerName}</b> challenged <b>${defenderName}</b>!\n\n` +
    `🛡 Defend your card: ${respondUrl}`;

  await sendChannelMessage(text);
}
