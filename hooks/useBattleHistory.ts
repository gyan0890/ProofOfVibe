"use client";

import { useEffect, useState, useCallback } from "react";
import { useProvider } from "@starknet-react/core";
import { Contract, shortString } from "starknet";
import { CONTRACT_ADDRESSES } from "@/lib/constants";

const BATTLE_ABI = [
  {
    type: "struct",
    name: "vibe_card::BattleData",
    members: [
      { name: "challenger_token", type: "core::integer::u256" },
      { name: "defender_token", type: "core::integer::u256" },
      { name: "challenger_commitment", type: "core::felt252" },
      { name: "defender_commitment", type: "core::felt252" },
      { name: "challenger_activity_score", type: "core::integer::u32" },
      { name: "defender_activity_score", type: "core::integer::u32" },
      { name: "status", type: "core::integer::u8" },
      { name: "winner", type: "core::integer::u256" },
      { name: "initiated_at", type: "core::integer::u64" },
    ],
  },
  {
    type: "struct",
    name: "vibe_card::CardData",
    members: [
      { name: "owner", type: "core::starknet::contract_address::ContractAddress" },
      { name: "commitment", type: "core::felt252" },
      { name: "ipfs_cid", type: "core::felt252" },
      { name: "revealed_type", type: "core::integer::u8" },
      { name: "palette_revealed", type: "core::bool" },
      { name: "mint_timestamp", type: "core::integer::u64" },
      { name: "persona_name", type: "core::felt252" },
    ],
  },
  {
    type: "function",
    name: "get_battle",
    inputs: [{ name: "battle_id", type: "core::integer::u256" }],
    outputs: [{ type: "vibe_card::BattleData" }],
    state_mutability: "view",
  },
  {
    type: "function",
    name: "get_card",
    inputs: [{ name: "token_id", type: "core::integer::u256" }],
    outputs: [{ type: "vibe_card::CardData" }],
    state_mutability: "view",
  },
] as const;

export interface BattleHistoryEntry {
  battleId: number;
  role: "challenger" | "defender";
  opponentToken: number;
  opponentName: string;
  status: 0 | 1 | 2;
  won: boolean | null;
  initiatedAt: number;
}

const LOOK_AHEAD = 20;
const STOP_AFTER = 3;
// Cache TTL: 5 minutes
const CACHE_TTL_MS = 5 * 60_000;

const cacheKey = (id: number) => `pov:battleHistory:${id}`;
const maxScannedKey = (id: number) => `pov:battleHistory:maxScanned:${id}`;

function loadCache(tokenId: number): { entries: BattleHistoryEntry[]; ts: number } {
  try {
    const raw = localStorage.getItem(cacheKey(tokenId));
    if (!raw) return { entries: [], ts: 0 };
    return JSON.parse(raw);
  } catch { return { entries: [], ts: 0 }; }
}

function saveCache(tokenId: number, entries: BattleHistoryEntry[]) {
  try { localStorage.setItem(cacheKey(tokenId), JSON.stringify({ entries, ts: Date.now() })); } catch {}
}

function getMaxScanned(tokenId: number): number {
  try { return parseInt(localStorage.getItem(maxScannedKey(tokenId)) ?? "0") || 0; } catch { return 0; }
}

function setMaxScanned(tokenId: number, id: number) {
  try { if (id > 0) localStorage.setItem(maxScannedKey(tokenId), String(id)); } catch {}
}

export function useBattleHistory(myTokenId: number | null | undefined) {
  const { provider } = useProvider();
  const [history, setHistory] = useState<BattleHistoryEntry[]>([]);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    if (!myTokenId || !provider) return;
    setLoading(true);

    // Show cached data immediately while we fetch new
    const { entries: cached, ts } = loadCache(myTokenId);
    if (cached.length > 0) setHistory(cached);

    // Skip full refresh if cache is fresh
    if (Date.now() - ts < CACHE_TTL_MS && cached.length > 0) {
      setLoading(false);
      return;
    }

    try {
      const contract = new Contract({
        abi: BATTLE_ABI as any,
        address: CONTRACT_ADDRESSES.vibeCard,
        providerOrAccount: provider,
      });

      const maxScanned = getMaxScanned(myTokenId);
      const startId = Math.max(1, maxScanned - 2);
      const ceiling = maxScanned + LOOK_AHEAD;

      const newEntries: BattleHistoryEntry[] = [];
      let zeros = 0;
      let newMax = maxScanned;

      for (let id = startId; id <= ceiling; id++) {
        let b: any;
        try { b = await contract.get_battle({ low: id, high: 0 }); }
        catch { zeros++; if (zeros >= STOP_AFTER) break; continue; }

        const initiatedAt = Number(b.initiated_at);
        if (initiatedAt === 0) { zeros++; if (zeros >= STOP_AFTER) break; continue; }
        zeros = 0;
        if (id > newMax) newMax = id;

        const challengerToken = Number(b.challenger_token);
        const defenderToken = Number(b.defender_token);
        const isChallenger = challengerToken === myTokenId;
        const isDefender = defenderToken === myTokenId;
        if (!isChallenger && !isDefender) continue;

        const status = Number(b.status) as 0 | 1 | 2;
        const winner = Number(b.winner);
        const opponentToken = isChallenger ? defenderToken : challengerToken;

        newEntries.push({
          battleId: id,
          role: isChallenger ? "challenger" : "defender",
          opponentToken,
          opponentName: "Card #" + opponentToken, // resolved below
          status,
          won: status === 2 ? winner === myTokenId : null,
          initiatedAt: initiatedAt * 1000,
        });
      }

      setMaxScanned(myTokenId, newMax);

      // Batch-resolve opponent names in parallel (max 5 at a time)
      const BATCH = 5;
      for (let i = 0; i < newEntries.length; i += BATCH) {
        const slice = newEntries.slice(i, i + BATCH);
        await Promise.allSettled(
          slice.map(async (entry) => {
            try {
              const card = await contract.get_card({ low: entry.opponentToken, high: 0 });
              entry.opponentName = shortString.decodeShortString(card.persona_name?.toString() ?? "0x0");
            } catch {}
          })
        );
      }

      // Merge: new entries override stale cached ones for the same battle ID
      const mergedMap = new Map<number, BattleHistoryEntry>();
      for (const e of cached) mergedMap.set(e.battleId, e);
      for (const e of newEntries) mergedMap.set(e.battleId, e);
      const merged = Array.from(mergedMap.values()).sort((a, b) => b.initiatedAt - a.initiatedAt);

      saveCache(myTokenId, merged);
      setHistory(merged);
    } catch (e) {
      console.error("useBattleHistory error:", e);
    } finally {
      setLoading(false);
    }
  }, [myTokenId, provider]);

  useEffect(() => { load(); }, [load]);

  return { history, loading, refresh: load };
}
