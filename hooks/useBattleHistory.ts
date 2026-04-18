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
  won: boolean | null; // null if unresolved
  initiatedAt: number; // ms
}

const MAX_PROBE = 200;
const STOP_AFTER = 3;

export function useBattleHistory(myTokenId: number | null | undefined) {
  const { provider } = useProvider();
  const [history, setHistory] = useState<BattleHistoryEntry[]>([]);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    if (!myTokenId || !provider) return;
    setLoading(true);
    try {
      const contract = new Contract({
        abi: BATTLE_ABI as any,
        address: CONTRACT_ADDRESSES.vibeCard,
        providerOrAccount: provider,
      });

      const entries: BattleHistoryEntry[] = [];
      let zeros = 0;

      for (let id = 1; id <= MAX_PROBE; id++) {
        let b: any;
        try { b = await contract.get_battle({ low: id, high: 0 }); }
        catch { zeros++; if (zeros >= STOP_AFTER) break; continue; }

        const initiatedAt = Number(b.initiated_at);
        if (initiatedAt === 0) { zeros++; if (zeros >= STOP_AFTER) break; continue; }
        zeros = 0;

        const challengerToken = Number(b.challenger_token);
        const defenderToken = Number(b.defender_token);
        const isChallenger = challengerToken === myTokenId;
        const isDefender = defenderToken === myTokenId;
        if (!isChallenger && !isDefender) continue;

        const status = Number(b.status) as 0 | 1 | 2;
        const winner = Number(b.winner);
        const opponentToken = isChallenger ? defenderToken : challengerToken;

        let opponentName = "Card #" + opponentToken;
        try {
          const card = await contract.get_card({ low: opponentToken, high: 0 });
          opponentName = shortString.decodeShortString(card.persona_name?.toString() ?? "0x0");
        } catch {}

        entries.push({
          battleId: id,
          role: isChallenger ? "challenger" : "defender",
          opponentToken,
          opponentName,
          status,
          won: status === 2 ? winner === myTokenId : null,
          initiatedAt: initiatedAt * 1000,
        });
      }

      setHistory(entries.sort((a, b) => b.initiatedAt - a.initiatedAt));
    } catch (e) {
      console.error("useBattleHistory error:", e);
    } finally {
      setLoading(false);
    }
  }, [myTokenId, provider]);

  useEffect(() => { load(); }, [load]);

  return { history, loading, refresh: load };
}
