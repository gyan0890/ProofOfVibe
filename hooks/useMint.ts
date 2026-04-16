"use client";

import { useCallback, useState } from "react";
import { useAccount, useSendTransaction } from "@starknet-react/core";
import { CONTRACT_ADDRESSES } from "@/lib/constants";
import { generateSalt, generatePersonaName } from "@/lib/utils";
import { saveCardLocally, updateLocalCard, loadLocalCard } from "@/lib/storage";
import { CardData, VibeTypeIndex } from "@/lib/types";
import { hash, shortString, CallData } from "starknet";

export function useMint() {
  const { address } = useAccount();
  const [minting, setMinting] = useState(false);
  const [txHash, setTxHash] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [accountNotDeployed, setAccountNotDeployed] = useState(false);

  const { sendAsync } = useSendTransaction({});

  const mint = useCallback(
    async (vibeType: VibeTypeIndex, personaName?: string) => {
      if (!address) {
        setError("Wallet not connected");
        return null;
      }

      setMinting(true);
      setError(null);
      setAccountNotDeployed(false);

      try {
        const salt = generateSalt();
        const name = personaName ?? generatePersonaName();

        // commitment = hash(address + vibe_type + salt)
        const commitment = hash.computePedersenHashOnElements([
          address,
          vibeType.toString(),
          "0x" + salt,
        ]);

        // Encode persona name as felt252 using shortString (max 31 ASCII chars)
        const nameFelt = shortString.encodeShortString(name.slice(0, 31));

        const call = {
          contractAddress: CONTRACT_ADDRESSES.vibeCard as `0x${string}`,
          entrypoint: "mint",
          calldata: CallData.compile([commitment, "0x0", nameFelt]),
        };

        const result = await sendAsync([call]);

        // Only mark the card as anchored if we actually got a transaction hash back.
        // Cartridge can return a result object without a hash on partial failures,
        // which would cause "Sealed onchain" to appear even though nothing landed.
        if (!result?.transaction_hash) {
          return null;
        }

        setTxHash(result.transaction_hash);

        // Update local card to anchored now that we have a confirmed submission
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
        const msg: string = e?.message ?? "Mint failed";
        const msgLower = msg.toLowerCase();
        // Detect undeployed Cartridge account — show faucet modal instead of raw error
        const isNotDeployed =
          msgLower.includes("contract not found") ||
          msgLower.includes("is not deployed") ||
          msgLower.includes("class hash not found") ||
          msgLower.includes("invalid transaction nonce") ||
          msgLower.includes("nonce");
        if (isNotDeployed) {
          setAccountNotDeployed(true);
        } else {
          setError(msg);
        }
        return null;
      } finally {
        setMinting(false);
      }
    },
    [address, sendAsync]
  );

  return { mint, minting, txHash, error, accountNotDeployed };
}
