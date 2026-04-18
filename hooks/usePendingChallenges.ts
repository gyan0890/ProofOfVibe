"use client";

import { useEffect, useState, useCallback } from "react";
import { useProvider } from "@starknet-react/core";
import { Contract } from "starknet";
import { CONTRACT_ADDRESSES } from "@/lib/constants";

const BATTLE_ABI = [
  {
    type: "function",
    name: "battle_counter",
    inputs: [],
    outputs: [{ type: "core::integer::u256" }],
    state_mutability: "view",
  },
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

      // Get the actual total battle count so we never miss newer battles
      const totalRaw = await contract.battle_counter();
      const total = Number(totalRaw);
      if (total === 0) { setChallenges([]); return; }

      // Fetch all battles in parallel
      const ids = Array.from({ length: total }, (_, i) => i + 1);
      const results = await Promise.all(
        ids.map(async (id) => {
          try {
            const b = await contract.get_battle({ low: id, high: 0 });
            return { id, b };
          } catch {
            return null;
          }
        })
      );

      const pending: PendingChallenge[] = results
        .filter((r): r is { id: number; b: any } => r !== null)
        .filter(({ b }) =>
          Number(b.status) === 0 &&
          Number(b.defender_token) === defenderTokenId
        )
        .map(({ id, b }) => ({
          battleId: id,
          challengerToken: Number(b.challenger_token),
          initiatedAt: Number(b.initiated_at) * 1000,
        }));

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
