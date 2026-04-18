"use client";

import { useEffect, useState, useCallback } from "react";
import { useAccount, useProvider } from "@starknet-react/core";
import { Contract, shortString, num } from "starknet";
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
      { name: "trait_3_word", type: "core::felt252" },
      { name: "bar_fills_accurate", type: "core::bool" },
      { name: "palette_revealed", type: "core::bool" },
      { name: "type_revealed", type: "core::bool" },
    ],
  },
  {
    type: "function",
    name: "get_token_of_owner",
    inputs: [{ name: "owner", type: "core::starknet::contract_address::ContractAddress" }],
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

      // O(1) lookup — no loop needed with owner_to_token mapping
      const tokenIdRaw = await contract.get_token_of_owner(ownerAddress);
      const tokenId = Number(tokenIdRaw);

      if (tokenId === 0) {
        console.log("[useMyCard] no card found for", ownerAddress);
        return null;
      }

      console.log("[useMyCard] found tokenId:", tokenId, "for", ownerAddress);

      const [raw, traitRaw, lossesRaw] = await Promise.all([
        contract.get_card({ low: tokenId, high: 0 }),
        contract.get_trait_state({ low: tokenId, high: 0 }),
        contract.get_battle_losses({ low: tokenId, high: 0 }),
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
        id: `${ownerAddress}-${tokenId}`,
        tokenId,
        owner: ownerAddress,
        commitment: raw.commitment?.toString() ?? "0x0",
        revealedType: revealed !== 255 ? (revealed as VibeTypeIndex) : undefined,
        paletteRevealed: Boolean(raw.palette_revealed),
        mintTimestamp: Number(raw.mint_timestamp) * 1000,
        personaName,
        isAnchored: true,
        battleRecord: { wins: 0, losses: Number(lossesRaw), total: Number(lossesRaw) },
        traitReveal: {
          trait1Word: traitRaw.trait_1_word && traitRaw.trait_1_word !== '0x0' ? String(traitRaw.trait_1_word) : undefined,
          trait2Word: traitRaw.trait_2_word && traitRaw.trait_2_word !== '0x0' ? String(traitRaw.trait_2_word) : undefined,
          trait3Word: traitRaw.trait_3_word && traitRaw.trait_3_word !== '0x0' ? String(traitRaw.trait_3_word) : undefined,
          barFillsAccurate: Boolean(traitRaw.bar_fills_accurate),
          paletteRevealed: Boolean(traitRaw.palette_revealed),
          typeRevealed: Boolean(traitRaw.type_revealed),
          lossCount: Number(lossesRaw),
        },
        recentBattles: [],
      };

      return onchainCard;
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

    // If we have a valid anchored card for this address with a resolved tokenId, use it
    if (local?.isAnchored && local.owner.toLowerCase() === address.toLowerCase()) {
      const isFreshSession =
        sessionStorage.getItem("privacyScanDone") ||
        sessionStorage.getItem("quizVibeType");
      if (isFreshSession) return;

      const hasValidTokenId =
        local.tokenId !== undefined ||
        (() => {
          const parts = local.id.split("-");
          const last = Number(parts[parts.length - 1]);
          return Number.isInteger(last) && last > 0 && last < 1_000_000;
        })();

      if (hasValidTokenId) {
        setCard(local);
        return;
      }
    }

    // Fetch from chain (single lookup, no loop)
    fetchFromChain(address).then((found) => {
      if (found) {
        const isFreshSession =
          sessionStorage.getItem("privacyScanDone") ||
          sessionStorage.getItem("quizVibeType");
        const hasNoLocalCard = !loadLocalCard();
        if (!isFreshSession || hasNoLocalCard) {
          saveCardLocally(found);
          setCard(found);
        }
      }
    });
  }, [address, fetchFromChain]);

  return { card, loading };
}
