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

const MAX_BATTLE_PROBE = 200;
const STOP_AFTER_CONSECUTIVE_ZEROS = 3;

/** Battle where I am the defender and need to respond (status=0) */
export interface PendingChallenge {
  battleId: number;
  challengerToken: number;
  initiatedAt: number; // ms
}

/** Battle where I am the challenger and need to resolve (status=1) */
export interface BattleToResolve {
  battleId: number;
  defenderToken: number;
  initiatedAt: number; // ms
}

export function usePendingChallenges(myTokenId: number | null | undefined) {
  const { provider } = useProvider();
  const [challenges, setChallenges] = useState<PendingChallenge[]>([]);
  const [toResolve, setToResolve] = useState<BattleToResolve[]>([]);
  const [loading, setLoading] = useState(false);

  const refresh = useCallback(async () => {
    if (!myTokenId || !provider) return;
    setLoading(true);
    try {
      const contract = new Contract({
        abi: BATTLE_ABI as any,
        address: CONTRACT_ADDRESSES.vibeCard,
        providerOrAccount: provider,
      });

      const pendingDefender: PendingChallenge[] = [];
      const pendingChallenger: BattleToResolve[] = [];
      let consecutiveZeros = 0;

      for (let id = 1; id <= MAX_BATTLE_PROBE; id++) {
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

        const status = Number(b.status);
        const challengerToken = Number(b.challenger_token);
        const defenderToken = Number(b.defender_token);

        // I'm the defender and battle is waiting for my response
        if (status === 0 && defenderToken === myTokenId) {
          pendingDefender.push({
            battleId: id,
            challengerToken,
            initiatedAt: initiatedAt * 1000,
          });
        }

        // I'm the challenger and the defender has committed — ready to resolve
        if (status === 1 && challengerToken === myTokenId) {
          pendingChallenger.push({
            battleId: id,
            defenderToken,
            initiatedAt: initiatedAt * 1000,
          });
        }
      }

      setChallenges(pendingDefender);
      setToResolve(pendingChallenger);
    } catch (e) {
      console.error("usePendingChallenges error:", e);
    } finally {
      setLoading(false);
    }
  }, [myTokenId, provider]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { challenges, toResolve, loading, refresh };
}
