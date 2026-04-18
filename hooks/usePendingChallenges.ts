"use client";

import { useEffect, useState, useCallback } from "react";
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

// Maximum battle IDs to probe before giving up.
// Stop early when we see STOP_AFTER_CONSECUTIVE_ZEROS consecutive
// battles with initiated_at === 0 (default Cairo storage = never written).
const MAX_BATTLE_PROBE = 200;
const STOP_AFTER_CONSECUTIVE_ZEROS = 3;

export interface PendingChallenge {
  battleId: number;
  challengerToken: number;
  initiatedAt: number; // ms
}

export function usePendingChallenges(defenderTokenId: number | null | undefined) {
  const { provider } = useProvider();
  const [challenges, setChallenges] = useState<PendingChallenge[]>([]);
  const [loading, setLoading] = useState(false);

  const refresh = useCallback(async () => {
    if (!defenderTokenId || !provider) return;
    setLoading(true);
    try {
      const contract = new Contract({
        abi: BATTLE_ABI as any,
        address: CONTRACT_ADDRESSES.vibeCard,
        providerOrAccount: provider,
      });

      const pending: PendingChallenge[] = [];
      let consecutiveZeros = 0;

      for (let id = 1; id <= MAX_BATTLE_PROBE; id++) {
        let b: any;
        try {
          b = await contract.get_battle({ low: id, high: 0 });
        } catch {
          // RPC error for this slot — treat as empty and keep scanning
          consecutiveZeros++;
          if (consecutiveZeros >= STOP_AFTER_CONSECUTIVE_ZEROS) break;
          continue;
        }

        const initiatedAt = Number(b.initiated_at);

        if (initiatedAt === 0) {
          // Battle slot never written — we've gone past the last real battle
          consecutiveZeros++;
          if (consecutiveZeros >= STOP_AFTER_CONSECUTIVE_ZEROS) break;
          continue;
        }

        // Real battle — reset the zero counter
        consecutiveZeros = 0;

        if (
          Number(b.status) === 0 &&
          Number(b.defender_token) === defenderTokenId
        ) {
          pending.push({
            battleId: id,
            challengerToken: Number(b.challenger_token),
            initiatedAt: initiatedAt * 1000,
          });
        }
      }

      setChallenges(pending);
    } catch (e) {
      console.error("usePendingChallenges error:", e);
    } finally {
      setLoading(false);
    }
  }, [defenderTokenId, provider]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { challenges, loading, refresh };
}
