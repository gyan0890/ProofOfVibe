/**
 * Mezcal HTTP client — typed contract read layer.
 *
 * Used as a fast read alternative to starknet.js RPC calls.
 * Configure via:
 *   NEXT_PUBLIC_MEZCAL_API_URL  — base URL (e.g. https://preview.188.245.249.37.nip.io)
 *   NEXT_PUBLIC_MEZCAL_API_KEY  — mzk_live_* key
 *
 * All functions throw on error so callers can catch and fall back to the RPC.
 */

import { hash, shortString } from "starknet";
import { CardData, VibeTypeIndex } from "@/lib/types";

// ---------------------------------------------------------------------------
// Config helpers (read lazily so tree-shaking works in SSR contexts)
// ---------------------------------------------------------------------------

function base(): string | undefined { return process.env.NEXT_PUBLIC_MEZCAL_API_URL; }
function key(): string | undefined { return process.env.NEXT_PUBLIC_MEZCAL_API_KEY; }
function chain(): string { return process.env.NEXT_PUBLIC_CHAIN_ID ?? "SN_SEPOLIA"; }

export function isMezcalEnabled(): boolean {
  return Boolean(base() && key());
}

// ---------------------------------------------------------------------------
// Core HTTP call
// ---------------------------------------------------------------------------

async function contractRead(
  contractAddress: string,
  fnName: string,
  calldata: string[] = []
): Promise<string[]> {
  if (!isMezcalEnabled()) throw new Error("Mezcal not configured");

  const selector = hash.getSelectorFromName(fnName);

  // Route through our Next.js proxy to avoid CORS and keep the API key server-side
  const isServer = typeof window === "undefined";
  let resp: Response;
  const t0 = typeof performance !== "undefined" ? performance.now() : 0;

  if (isServer) {
    // Server-side: call Mezcal directly (no CORS restriction)
    const url = new URL(`${base()}/v1/${chain()}/contract/${contractAddress}/read`);
    url.searchParams.set("selector", selector);
    if (calldata.length > 0) url.searchParams.set("calldata", calldata.join(","));
    url.searchParams.set("block_tag", "latest");
    resp = await fetch(url.toString(), {
      headers: { "X-Mezcal-Api-Key": key()! },
      cache: "no-store",
    });
  } else {
    // Browser: proxy through /api/mezcal to avoid CORS
    const url = new URL("/api/mezcal", window.location.origin);
    url.searchParams.set("contract", contractAddress);
    url.searchParams.set("selector", selector);
    if (calldata.length > 0) url.searchParams.set("calldata", calldata.join(","));
    url.searchParams.set("chain", chain());
    resp = await fetch(url.toString(), { cache: "no-store" });
  }

  if (!resp.ok) {
    const text = await resp.text().catch(() => String(resp.status));
    throw new Error(`Mezcal ${resp.status} for ${fnName}: ${text}`);
  }

  const json = (await resp.json()) as { result: string[] };
  if (process.env.NODE_ENV === "development") {
    const elapsed = typeof performance !== "undefined" ? `${(performance.now() - t0).toFixed(0)}ms` : "";
    console.debug(`[Mezcal] ${fnName}(${calldata.join(",")}) → ${json.result.length} felts ${elapsed}`);
  }
  return json.result;
}

// ---------------------------------------------------------------------------
// Encoding helpers
// ---------------------------------------------------------------------------

/** Encode a number as u256 calldata (low, high as decimal strings) */
function u256(n: number): string[] {
  return [String(n), "0"];
}

/** Decode a felt252 hex/decimal string to boolean */
function toBool(s: string): boolean {
  return s !== "0x0" && s !== "0" && s !== "0x00" && s !== "";
}

// ---------------------------------------------------------------------------
// Typed reads
// ---------------------------------------------------------------------------

export async function mezcalTokenCounter(contractAddress: string): Promise<number> {
  const res = await contractRead(contractAddress, "token_counter");
  return Number(BigInt(res[0]));
}

/** Returns raw CardData fields — caller maps to CardData type */
export async function mezcalGetRawCard(contractAddress: string, tokenId: number) {
  const res = await contractRead(contractAddress, "get_card", u256(tokenId));
  // Struct layout (7 felts):
  // [0] owner  [1] commitment  [2] ipfs_cid  [3] revealed_type
  // [4] palette_revealed  [5] mint_timestamp  [6] persona_name
  return {
    owner: res[0],
    commitment: res[1],
    revealedType: Number(BigInt(res[3])),
    paletteRevealed: toBool(res[4]),
    mintTimestamp: Number(BigInt(res[5])) * 1000,
    personaName: (() => {
      try { return shortString.decodeShortString(res[6]); }
      catch { return `Vibe #${tokenId}`; }
    })(),
  };
}

export async function mezcalGetBattleLosses(contractAddress: string, tokenId: number): Promise<number> {
  const res = await contractRead(contractAddress, "get_battle_losses", u256(tokenId));
  return Number(BigInt(res[0]));
}

export async function mezcalGetBattleWins(contractAddress: string, tokenId: number): Promise<number> {
  const res = await contractRead(contractAddress, "get_battle_wins", u256(tokenId));
  return Number(BigInt(res[0]));
}

/**
 * Fetch card data + losses + wins in 3 parallel calls, return a complete CardData.
 * Returns null if the card doesn't exist (owner === 0x0).
 */
export async function mezcalFetchCardData(
  contractAddress: string,
  tokenId: number
): Promise<CardData | null> {
  const [rawCard, losses, wins] = await Promise.all([
    mezcalGetRawCard(contractAddress, tokenId),
    mezcalGetBattleLosses(contractAddress, tokenId),
    mezcalGetBattleWins(contractAddress, tokenId),
  ]);

  if (!rawCard.owner || rawCard.owner === "0x0") return null;

  return {
    id: `${rawCard.owner}-${tokenId}`,
    owner: rawCard.owner,
    commitment: rawCard.commitment,
    revealedType: rawCard.revealedType !== 255 ? (rawCard.revealedType as VibeTypeIndex) : undefined,
    paletteRevealed: rawCard.paletteRevealed,
    mintTimestamp: rawCard.mintTimestamp,
    personaName: rawCard.personaName,
    isAnchored: true,
    tokenId,
    battleRecord: { wins, losses, total: wins + losses },
    traitReveal: {
      barFillsAccurate: losses >= 2,
      paletteRevealed: rawCard.paletteRevealed,
      typeRevealed: rawCard.revealedType !== 255,
      lossCount: losses,
    },
    recentBattles: [],
  };
}

// ---------------------------------------------------------------------------
// Battle data
// ---------------------------------------------------------------------------

export interface MezcalBattle {
  challengerToken: number;
  defenderToken: number;
  challengerCommitment: string;
  defenderCommitment: string;
  challengerActivityScore: number;
  defenderActivityScore: number;
  status: 0 | 1 | 2 | 3;
  winner: number;
  initiatedAt: number; // ms
}

/**
 * Fetch battle by ID.
 * Returns null if the battle doesn't exist (initiated_at === 0).
 *
 * BattleData struct layout (12 felts):
 * [0,1] challenger_token (u256)   [2,3] defender_token (u256)
 * [4]   challenger_commitment     [5]   defender_commitment
 * [6]   challenger_activity_score [7]   defender_activity_score
 * [8]   status                    [9,10] winner (u256)
 * [11]  initiated_at
 */
export async function mezcalGetBattle(
  contractAddress: string,
  battleId: number
): Promise<MezcalBattle | null> {
  const res = await contractRead(contractAddress, "get_battle", u256(battleId));
  const initiatedAt = Number(BigInt(res[11]));
  if (initiatedAt === 0) return null;

  return {
    challengerToken: Number(BigInt(res[0])),
    defenderToken: Number(BigInt(res[2])),
    challengerCommitment: res[4],
    defenderCommitment: res[5],
    challengerActivityScore: Number(BigInt(res[6])),
    defenderActivityScore: Number(BigInt(res[7])),
    status: Number(BigInt(res[8])) as 0 | 1 | 2 | 3,
    winner: Number(BigInt(res[9])),
    initiatedAt: initiatedAt * 1000,
  };
}

/** Batch-fetch battle IDs in parallel. Returns a map of id → battle (null = not found). */
export async function mezcalGetBattles(
  contractAddress: string,
  battleIds: number[]
): Promise<Map<number, MezcalBattle | null>> {
  const results = await Promise.allSettled(
    battleIds.map((id) => mezcalGetBattle(contractAddress, id))
  );
  const map = new Map<number, MezcalBattle | null>();
  battleIds.forEach((id, i) => {
    const r = results[i];
    map.set(id, r.status === "fulfilled" ? r.value : null);
  });
  return map;
}
