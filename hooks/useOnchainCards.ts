"use client";

import { useEffect, useState } from "react";
import { useProvider } from "@starknet-react/core";
import { Contract, shortString } from "starknet";
import { CONTRACT_ADDRESSES } from "@/lib/constants";
import { CardData, VibeTypeIndex } from "@/lib/types";

const VIBECARD_READ_ABI = [
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
    type: "struct",
    name: "vibe_card::TraitRevealState",
    members: [
      { name: "trait_1_word", type: "core::felt252" },
      { name: "trait_2_word", type: "core::felt252" },
      { name: "bar_fills_accurate", type: "core::bool" },
      { name: "palette_revealed", type: "core::bool" },
      { name: "type_revealed", type: "core::bool" },
    ],
  },
  {
    type: "function",
    name: "token_counter",
    inputs: [],
    outputs: [{ type: "core::integer::u256" }],
    state_mutability: "view",
  },
  {
    type: "function",
    name: "get_card",
    inputs: [{ name: "token_id", type: "core::integer::u256" }],
    outputs: [{ type: "vibe_card::CardData" }],
    state_mutability: "view",
  },
  {
    type: "function",
    name: "get_battle_losses",
    inputs: [{ name: "token_id", type: "core::integer::u256" }],
    outputs: [{ type: "core::integer::u8" }],
    state_mutability: "view",
  },
  {
    type: "function",
    name: "get_battle_wins",
    inputs: [{ name: "token_id", type: "core::integer::u256" }],
    outputs: [{ type: "core::integer::u8" }],
    state_mutability: "view",
  },
] as const;

export function useOnchainCards(limit = 50) {
  const { provider } = useProvider();
  const [cards, setCards] = useState<CardData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!provider) return;

    async function fetchCards() {
      setLoading(true);
      setError(null);
      try {
        const contract = new Contract({
          abi: VIBECARD_READ_ABI as any,
          address: CONTRACT_ADDRESSES.vibeCard,
          providerOrAccount: provider,
        });

        const counterRaw = await contract.token_counter();
        const total = Math.min(Number(counterRaw), limit);
        if (total === 0) {
          setCards([]);
          return;
        }

        // Fetch cards in batches to avoid RPC rate limits, with per-call retry
        const delay = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));
        const fetchWithRetry = async <T>(fn: () => Promise<T>, retries = 3, backoff = 400): Promise<T> => {
          for (let i = 0; i < retries; i++) {
            try { return await fn(); } catch (e: any) {
              if (i === retries - 1) throw e;
              await delay(backoff * (i + 1));
            }
          }
          throw new Error("unreachable");
        };

        const BATCH_SIZE = 5;
        const ids = Array.from({ length: total }, (_, i) => i + 1);
        const allResults: PromiseSettledResult<CardData>[] = [];
        for (let b = 0; b < ids.length; b += BATCH_SIZE) {
          if (b > 0) await delay(200);
          const batch = ids.slice(b, b + BATCH_SIZE);
          const batchResults = await Promise.allSettled(
            batch.map(async (id) => {
              const [raw, lossesRaw, winsRaw] = await Promise.all([
                fetchWithRetry(() => contract.get_card({ low: id, high: 0 }) as Promise<any>),
                fetchWithRetry(() => contract.get_battle_losses({ low: id, high: 0 }) as Promise<any>),
                fetchWithRetry(() => contract.get_battle_wins({ low: id, high: 0 }) as Promise<any>),
              ]);

              const owner: string = raw.owner?.toString() ?? "0x0";
              const revealed = Number(raw.revealed_type);
              const losses = Number(lossesRaw);
              const wins = Number(winsRaw);

              const personaName = (() => {
                try {
                  return shortString.decodeShortString(raw.persona_name?.toString() ?? "0x0");
                } catch {
                  return `Vibe #${id}`;
                }
              })();

              const card: CardData = {
                id: `${owner}-${id}`,
                owner,
                commitment: raw.commitment?.toString() ?? "0x0",
                revealedType: revealed !== 255 ? (revealed as VibeTypeIndex) : undefined,
                paletteRevealed: Boolean(raw.palette_revealed),
                mintTimestamp: Number(raw.mint_timestamp) * 1000,
                personaName,
                isAnchored: true,
                battleRecord: { wins, losses, total: wins + losses },
                traitReveal: {
                  barFillsAccurate: false,
                  paletteRevealed: Boolean(raw.palette_revealed),
                  typeRevealed: revealed !== 255,
                  lossCount: losses,
                },
                recentBattles: [],
              };
              return card;
            })
          );
          allResults.push(...batchResults);
        }

        const fetched = allResults
          .filter((r): r is PromiseFulfilledResult<CardData> => r.status === "fulfilled")
          .map((r) => r.value);

        setCards(fetched);
      } catch (e: any) {
        setError(e?.message ?? "Failed to load cards");
      } finally {
        setLoading(false);
      }
    }

    fetchCards();
  }, [provider, limit]);

  return { cards, loading, error };
}
