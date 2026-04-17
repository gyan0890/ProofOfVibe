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

      // Search for the card owned by this address.
      // Strip leading zeros before comparing — the wallet returns "0x0612..."
      // but the contract may return "0x612..." for the same address.
      const stripLeadingZeros = (a: string) =>
        "0x" + a.toLowerCase().replace(/^0x0*/, "");
      const normalizedOwner = stripLeadingZeros(ownerAddress);
      console.log("[useMyCard] scanning chain — total tokens:", total, "looking for:", normalizedOwner);
      for (let id = 1; id <= total; id++) {
        const raw = await contract.get_card({ low: id, high: 0 });
        // num.toHex handles decimal, hex, and BigInt — always gives "0x..." hex string
        const rawOwner: string = (() => {
          try { return num.toHex(raw.owner?.toString() ?? "0x0"); } catch { return raw.owner?.toString() ?? ""; }
        })();
        console.log(`[useMyCard] token #${id} owner raw="${raw.owner?.toString()}" asHex="${rawOwner}" normalized="${stripLeadingZeros(rawOwner)}" match=${stripLeadingZeros(rawOwner) === normalizedOwner}`);
        if (stripLeadingZeros(rawOwner) !== normalizedOwner) continue;

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
          tokenId: id,
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
      console.log("[useMyCard] no card found on chain for", ownerAddress);
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

    // If we already have an anchored card for this address with a valid token ID,
    // use the cached version. Skip chain fetch during fresh scan/quiz sessions.
    if (local?.isAnchored && local.owner.toLowerCase() === address.toLowerCase()) {
      const isFreshSession =
        sessionStorage.getItem("privacyScanDone") ||
        sessionStorage.getItem("quizVibeType");
      if (isFreshSession) return;

      // Only skip chain fetch if we already have a valid small-integer token ID.
      // Cards created during scan/quiz get timestamp-based IDs (>1M) that can't
      // be used for battle — fall through to chain fetch in that case.
      const hasValidTokenId =
        local.tokenId !== undefined ||
        (() => {
          const parts = local.id.split("-");
          const last = Number(parts[parts.length - 1]);
          return Number.isInteger(last) && last > 0 && last < 1_000_000;
        })();

      console.log("[useMyCard] local card found — isAnchored:", local.isAnchored, "id:", local.id, "tokenId:", local.tokenId, "hasValidTokenId:", hasValidTokenId);
      if (hasValidTokenId) {
        setCard(local);
        return;
      }
      // Fall through: card is anchored but tokenId not yet resolved → fetch chain
    }

    // Otherwise always check chain — covers: no card, unanchored card, different address
    fetchFromChain(address).then((found) => {
      if (found) {
        // Normally skip during a fresh scan/quiz session to avoid racing with
        // the scan result. But if localStorage is completely empty (e.g. cleared
        // by browser or by a previous bad stale-check), always restore — the user
        // has a real onchain card and we must show it.
        const isFreshSession =
          sessionStorage.getItem("privacyScanDone") ||
          sessionStorage.getItem("quizVibeType");
        const hasNoLocalCard = !loadLocalCard();
        console.log("[useMyCard] chain found card — isFreshSession:", !!isFreshSession, "hasNoLocalCard:", hasNoLocalCard, "will save:", !isFreshSession || hasNoLocalCard);
        if (!isFreshSession || hasNoLocalCard) {
          saveCardLocally(found);
          setCard(found);
        }
      }
    });
  }, [address, fetchFromChain]);

  return { card, loading };
}
