"use client";

import { useEffect, useState, useCallback } from "react";
import { useProvider } from "@starknet-react/core";
import { Contract, shortString } from "starknet";
import { CONTRACT_ADDRESSES } from "@/lib/constants";
import {
  isMezcalEnabled,
  mezcalGetBattle,
  mezcalGetRawCard,
  mezcalGetBattles,
} from "@/lib/mezcalClient";

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

    const { entries: cached, ts } = loadCache(myTokenId);
    if (cached.length > 0) setHistory(cached);
    if (Date.now() - ts < CACHE_TTL_MS && cached.length > 0) {
      setLoading(false);
      return;
    }

    const addr = CONTRACT_ADDRESSES.vibeCard;
    const maxScanned = getMaxScanned(myTokenId);
    const startId = Math.max(1, maxScanned - 2);
    const ceiling = maxScanned + LOOK_AHEAD;

    try {
      // ── Mezcal path: fetch all battle IDs in the window in parallel ────
      if (isMezcalEnabled()) { try {
        const t0 = performance.now();
        const ids = Array.from({ length: ceiling - startId + 1 }, (_, i) => startId + i);
        const battleMap = await mezcalGetBattles(addr, ids);

        const newEntries: BattleHistoryEntry[] = [];
        let newMax = maxScanned;

        for (const [id, b] of Array.from(battleMap.entries())) {
          if (!b) continue;
          if (id > newMax) newMax = id;

          const isChallenger = b.challengerToken === myTokenId;
          const isDefender = b.defenderToken === myTokenId;
          if (!isChallenger && !isDefender) continue;

          const status = b.status as 0 | 1 | 2;
          const opponentToken = isChallenger ? b.defenderToken : b.challengerToken;
          newEntries.push({
            battleId: id,
            role: isChallenger ? "challenger" : "defender",
            opponentToken,
            opponentName: `Card #${opponentToken}`,
            status,
            won: status === 2 ? b.winner === myTokenId : null,
            initiatedAt: b.initiatedAt,
          });
        }

        setMaxScanned(myTokenId, newMax);

        // Resolve opponent names in parallel via Mezcal
        const uniqueOpponents = Array.from(new Set(newEntries.map((e) => e.opponentToken)));
        const nameMap = new Map<number, string>();
        await Promise.allSettled(
          uniqueOpponents.map(async (tokenId) => {
            try {
              const card = await mezcalGetRawCard(addr, tokenId);
              nameMap.set(tokenId, card.personaName);
            } catch {}
          })
        );
        for (const entry of newEntries) {
          const name = nameMap.get(entry.opponentToken);
          if (name) entry.opponentName = name;
        }

        const mergedMap = new Map<number, BattleHistoryEntry>();
        for (const e of cached) mergedMap.set(e.battleId, e);
        for (const e of newEntries) mergedMap.set(e.battleId, e);
        const merged = Array.from(mergedMap.values()).sort((a, b) => b.initiatedAt - a.initiatedAt);

        console.log(
          `[Mezcal] useBattleHistory: ${merged.length} entries in ${(performance.now() - t0).toFixed(0)}ms`
        );

        saveCache(myTokenId, merged);
        setHistory(merged);
        return;
      } catch (mezcalErr) {
        console.warn("[Mezcal] useBattleHistory failed, falling back to RPC:", mezcalErr);
      } }

      // ── RPC fallback: sequential scan ─────────────────────────────────
      const contract = new Contract({
        abi: BATTLE_ABI as any,
        address: addr,
        providerOrAccount: provider,
      });

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
          opponentName: "Card #" + opponentToken,
          status,
          won: status === 2 ? winner === myTokenId : null,
          initiatedAt: initiatedAt * 1000,
        });
      }

      setMaxScanned(myTokenId, newMax);

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
