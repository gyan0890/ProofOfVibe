"use client";

import { useEffect, useState, useCallback } from "react";
import { useAccount, useProvider } from "@starknet-react/core";
import { Contract, shortString } from "starknet";
import { CONTRACT_ADDRESSES } from "@/lib/constants";
import { CardData, VibeTypeIndex } from "@/lib/types";
import { loadLocalCard, saveCardLocally, updateLocalCard } from "@/lib/storage";

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
    name: "get_trait_state",
    inputs: [{ name: "token_id", type: "core::integer::u256" }],
    outputs: [{ type: "vibe_card::TraitRevealState" }],
    state_mutability: "view",
  },
  {
    type: "function",
    name: "get_battle_losses",
    inputs: [{ name: "token_id", type: "core::integer::u256" }],
    outputs: [{ type: "core::integer::u8" }],
    state_mutability: "view",
  },
] as const;

export function useMyCard() {
  const { address } = useAccount();
  const { provider } = useProvider();
  const [card, setCard] = useState<CardData | null>(null);
  const [loading, setLoading] = useState(false);

  const fetchFromChain = useCallback(async (ownerAddress: string) => {
    setLoading(true);
    try {
      const contract = new Contract({
        abi: VIBECARD_READ_ABI as any,
        address: CONTRACT_ADDRESSES.vibeCard,
        providerOrAccount: provider,
      });

      const counterRaw = await contract.token_counter();
      const total = Number(counterRaw);
      if (total === 0) return null;

      // Search for the card owned by this address
      const normalizedOwner = ownerAddress.toLowerCase();
      for (let id = 1; id <= total; id++) {
        const raw = await contract.get_card({ low: id, high: 0 });
        const rawOwner: string = raw.owner?.toString() ?? "";
        if (rawOwner.toLowerCase() !== normalizedOwner) continue;

        const [traitRaw, lossesRaw] = await Promise.all([
          contract.get_trait_state({ low: id, high: 0 }),
          contract.get_battle_losses({ low: id, high: 0 }),
        ]);

        const revealed = Number(raw.revealed_type);
        const personaName = (() => {
          try {
            return shortString.decodeShortString(raw.persona_name?.toString() ?? "0x0");
          } catch {
            return "Unknown";
          }
        })();

        const onchainCard: CardData = {
          id: `${ownerAddress}-${id}`,
          owner: ownerAddress,
          commitment: raw.commitment?.toString() ?? "0x0",
          revealedType: revealed !== 255 ? (revealed as VibeTypeIndex) : undefined,
          paletteRevealed: Boolean(raw.palette_revealed),
          mintTimestamp: Number(raw.mint_timestamp) * 1000,
          personaName,
          isAnchored: true,
          battleRecord: { wins: 0, losses: Number(lossesRaw), total: Number(lossesRaw) },
          traitReveal: {
            barFillsAccurate: Boolean(traitRaw.bar_fills_accurate),
            paletteRevealed: Boolean(traitRaw.palette_revealed),
            typeRevealed: Boolean(traitRaw.type_revealed),
            lossCount: Number(lossesRaw),
          },
          recentBattles: [],
        };

        return onchainCard;
      }
      return null;
    } catch (e) {
      console.error("useMyCard: chain fetch failed", e);
      return null;
    } finally {
      setLoading(false);
    }
  }, [provider]);

  useEffect(() => {
    if (!address) return;

    const local = loadLocalCard();

    // If we already have an anchored card for this address locally, use it.
    // Skip during a fresh scan/quiz — the page is about to build its own card
    // and we don't want to populate onchainCard before it does.
    if (local?.isAnchored && local.owner.toLowerCase() === address.toLowerCase()) {
      const isFreshSession =
        sessionStorage.getItem("privacyScanDone") ||
        sessionStorage.getItem("quizVibeType");
      if (!isFreshSession) {
        setCard(local);
      }
      return;
    }

    // Otherwise always check chain — covers: no card, unanchored card, different address
    fetchFromChain(address).then((found) => {
      if (found) {
        // Don't touch localStorage or React state during a fresh scan/quiz session —
        // doing so populates onchainCard, which can race with the scan result and
        // cause the stale-closure bug where the onchain card overwrites the scan card.
        const isFreshSession =
          sessionStorage.getItem("privacyScanDone") ||
          sessionStorage.getItem("quizVibeType");
        if (!isFreshSession) {
          saveCardLocally(found);
          setCard(found);
        }
      }
    });
  }, [address, fetchFromChain]);

  return { card, loading };
}
