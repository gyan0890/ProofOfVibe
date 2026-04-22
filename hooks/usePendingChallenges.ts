"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useProvider } from "@starknet-react/core";
import { Contract } from "starknet";
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
    type: "function",
    name: "get_battle",
    inputs: [{ name: "battle_id", type: "core::integer::u256" }],
    outputs: [{ type: "vibe_card::BattleData" }],
    state_mutability: "view",
  },
] as const;

// Scan this many IDs ahead of the highest known battle
const LOOK_AHEAD = 20;
const STOP_AFTER_CONSECUTIVE_ZEROS = 3;
// Minimum ms between focus-triggered refreshes
const FOCUS_COOLDOWN_MS = 60_000;

const maxIdKey = (tokenId: number) => `pov:maxBattleId:${tokenId}`;

function getStoredMaxId(tokenId: number): number {
  try { return parseInt(localStorage.getItem(maxIdKey(tokenId)) ?? "0") || 0; } catch { return 0; }
}
function setStoredMaxId(tokenId: number, id: number) {
  try { if (id > 0) localStorage.setItem(maxIdKey(tokenId), String(id)); } catch {}
}

export interface PendingChallenge {
  battleId: number;
  challengerToken: number;
  initiatedAt: number;
}

export interface BattleToResolve {
  battleId: number;
  defenderToken: number;
  initiatedAt: number;
}

export function usePendingChallenges(myTokenId: number | null | undefined) {
  const { provider } = useProvider();
  const [challenges, setChallenges] = useState<PendingChallenge[]>([]);
  const [toResolve, setToResolve] = useState<BattleToResolve[]>([]);
  const [loading, setLoading] = useState(false);
  const lastRefreshAt = useRef<number>(0);

  const refresh = useCallback(async () => {
    if (!myTokenId || !provider) return;
    setLoading(true);
    try {
      const contract = new Contract({
        abi: BATTLE_ABI as any,
        address: CONTRACT_ADDRESSES.vibeCard,
        providerOrAccount: provider,
      });

      const storedMax = getStoredMaxId(myTokenId);
      // Start just behind the last known ID so we don't miss edge cases
      const startId = Math.max(1, storedMax - 2);
      const ceiling = storedMax + LOOK_AHEAD;

      const pendingDefender: PendingChallenge[] = [];
      const pendingChallenger: BattleToResolve[] = [];
      let consecutiveZeros = 0;
      let newMax = storedMax;

      for (let id = startId; id <= ceiling; id++) {
        let b: any;
        try {
          b = await contract.get_battle({ low: id, high: 0 });
        } catch {
          consecutiveZeros++;
          if (consecutiveZeros >= STOP_AFTER_CONSECUTIVE_ZEROS) break;
          continue;
        }

        const initiatedAt = Number(b.initiated_at);
        if (initiatedAt === 0) {
          consecutiveZeros++;
          if (consecutiveZeros >= STOP_AFTER_CONSECUTIVE_ZEROS) break;
          continue;
        }
        consecutiveZeros = 0;
        if (id > newMax) newMax = id;

        const status = Number(b.status);
        const challengerToken = Number(b.challenger_token);
        const defenderToken = Number(b.defender_token);

        if (status === 0 && defenderToken === myTokenId) {
          pendingDefender.push({ battleId: id, challengerToken, initiatedAt: initiatedAt * 1000 });
        }
        if (status === 1 && challengerToken === myTokenId) {
          pendingChallenger.push({ battleId: id, defenderToken, initiatedAt: initiatedAt * 1000 });
        }
      }

      setStoredMaxId(myTokenId, newMax);
      setChallenges(pendingDefender);
      setToResolve(pendingChallenger);
      lastRefreshAt.current = Date.now();
    } catch (e) {
      console.error("usePendingChallenges error:", e);
    } finally {
      setLoading(false);
    }
  }, [myTokenId, provider]);

  useEffect(() => { refresh(); }, [refresh]);

  useEffect(() => {
    const onFocus = () => {
      if (Date.now() - lastRefreshAt.current > FOCUS_COOLDOWN_MS) refresh();
    };
    const onBattleUpdate = () => refresh();
    window.addEventListener("focus", onFocus);
    window.addEventListener("proofofvibe:battleUpdated", onBattleUpdate);
    return () => {
      window.removeEventListener("focus", onFocus);
      window.removeEventListener("proofofvibe:battleUpdated", onBattleUpdate);
    };
  }, [refresh]);

  return { challenges, toResolve, loading, refresh };
}
