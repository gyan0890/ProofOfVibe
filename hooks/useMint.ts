"use client";

import { useCallback, useState } from "react";
import { useAccount, useContract, useSendTransaction } from "@starknet-react/core";
import { CONTRACT_ADDRESSES } from "@/lib/constants";
import { generateSalt, generatePersonaName } from "@/lib/utils";
import { saveCardLocally, updateLocalCard, loadLocalCard } from "@/lib/storage";
import { CardData, VibeTypeIndex } from "@/lib/types";
import { hash } from "starknet";

const VIBECARD_ABI = [
  {
    type: "function",
    name: "mint",
    inputs: [
      { name: "commitment", type: "core::felt252" },
      { name: "ipfs_cid", type: "core::felt252" },
      { name: "persona_name", type: "core::felt252" },
    ],
    outputs: [{ type: "core::integer::u256" }],
    state_mutability: "external",
  },
] as const;

export function useMint() {
  const { address } = useAccount();
  const [minting, setMinting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { contract } = useContract({
    abi: VIBECARD_ABI,
    address: CONTRACT_ADDRESSES.vibeCard as `0x${string}`,
  });

  const { sendAsync } = useSendTransaction({});

  const mint = useCallback(
    async (vibeType: VibeTypeIndex, personaName?: string) => {
      if (!address || !contract) {
        setError("Wallet not connected");
        return null;
      }

      setMinting(true);
      setError(null);

      try {
        const salt = generateSalt();
        const name = personaName ?? generatePersonaName();

        // commitment = hash(address + vibe_type + salt)
        const commitment = hash.computePedersenHashOnElements([
          address,
          vibeType.toString(),
          "0x" + salt,
        ]);

        // Encode persona name as felt252 (truncate to 31 chars)
        const nameBytes = new TextEncoder().encode(name.slice(0, 31));
        const nameFelt =
          "0x" +
          Array.from(nameBytes)
            .map((b) => b.toString(16).padStart(2, "0"))
            .join("");

        const calls = contract.populate("mint", [commitment, "0x0", nameFelt]);

        const result = await sendAsync([calls]);

        // Update local card to anchored
        const existing = loadLocalCard();
        if (existing) {
          updateLocalCard({
            owner: address,
            isAnchored: true,
            personaName: name,
            commitment,
          });
        } else {
          const newCard: CardData = {
            id: `${address}-${Date.now()}`,
            owner: address,
            commitment,
            revealedType: vibeType,
            paletteRevealed: false,
            mintTimestamp: Date.now(),
            personaName: name,
            isAnchored: true,
            battleRecord: { wins: 0, losses: 0, total: 0 },
            traitReveal: {
              barFillsAccurate: false,
              paletteRevealed: false,
              typeRevealed: false,
              lossCount: 0,
            },
            recentBattles: [],
          };
          saveCardLocally(newCard);
        }

        return result;
      } catch (e: any) {
        setError(e?.message ?? "Mint failed");
        return null;
      } finally {
        setMinting(false);
      }
    },
    [address, contract, sendAsync]
  );

  return { mint, minting, error };
}
