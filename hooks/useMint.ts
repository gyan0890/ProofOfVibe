"use client";

import { useCallback, useState } from "react";
import { useAccount, useSendTransaction, useProvider } from "@starknet-react/core";
import { CONTRACT_ADDRESSES } from "@/lib/constants";
import { generateSalt, generatePersonaName } from "@/lib/utils";
import { saveCardLocally, updateLocalCard, loadLocalCard } from "@/lib/storage";
import { CardData, VibeTypeIndex } from "@/lib/types";
import { hash, shortString, Contract, num } from "starknet";

const VIBECARD_COUNTER_ABI = [
  {
    type: "function",
    name: "token_counter",
    inputs: [],
    outputs: [{ type: "core::integer::u256" }],
    state_mutability: "view",
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
    outputs: [
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
    ],
    state_mutability: "view",
  },
] as const;

export function useMint() {
  const { address } = useAccount();
  const { provider } = useProvider();
  const [minting, setMinting] = useState(false);
  const [txHash, setTxHash] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const { sendAsync } = useSendTransaction({});

  const mint = useCallback(
    async (vibeType: VibeTypeIndex, personaName?: string) => {
      if (!address) {
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

        // Encode persona name as felt252 using shortString (max 31 ASCII chars)
        const nameFelt = shortString.encodeShortString(name.slice(0, 31));

        const call = {
          contractAddress: CONTRACT_ADDRESSES.vibeCard as `0x${string}`,
          entrypoint: "mint",
          calldata: [num.toHex(commitment), "0x0", num.toHex(nameFelt)],
        };

        console.log('[useMint] calling sendAsync with call:', call);
        let result;
        try {
          result = await sendAsync([call]);
        } catch (nonceErr: any) {
          // Cartridge sometimes has a stale nonce on the first tx after connecting.
          // Detect the nonce mismatch error and retry once after a short delay.
          const msg = nonceErr?.message ?? "";
          if (msg.toLowerCase().includes("nonce") || msg.toLowerCase().includes("invalid transaction nonce")) {
            console.warn("[useMint] nonce error on first attempt, retrying once…", msg);
            await new Promise((r) => setTimeout(r, 1200));
            result = await sendAsync([call]);
          } else {
            throw nonceErr;
          }
        }
        console.log('[useMint] sendAsync result:', result);

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
            mintTxHash: result.transaction_hash,
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

        // Resolve the real onchain token ID with a single O(1) lookup.
        // Clears scan session markers so useMyCard re-fetches on next render.
        sessionStorage.removeItem("privacyScanDone");
        sessionStorage.removeItem("quizVibeType");
        try {
          await provider.waitForTransaction(result.transaction_hash, { retryInterval: 2000 });
          const contract = new Contract({
            abi: VIBECARD_COUNTER_ABI as any,
            address: CONTRACT_ADDRESSES.vibeCard,
            providerOrAccount: provider,
          });
          const tokenIdRaw = await contract.get_token_of_owner(address);
          const tokenId = Number(tokenIdRaw);
          if (tokenId > 0) {
            updateLocalCard({ id: `${address}-${tokenId}`, tokenId });
            console.log("[useMint] resolved tokenId:", tokenId);
            // Signal reveal page / useMyCard to re-fetch with the real tokenId
            window.dispatchEvent(new CustomEvent("proofofvibe:minted", { detail: { tokenId } }));

            // Store the privacy profile in Redis so any viewer can access
            // the real labels+scores when traits get cracked in battles
            const freshCard = loadLocalCard();
            if (freshCard?.privacyProfile) {
              fetch("/api/card-traits", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ tokenId, privacyProfile: freshCard.privacyProfile }),
              }).catch(() => {});
            }
          }
        } catch (resolveErr) {
          console.warn("[useMint] token ID resolution failed:", resolveErr);
        }

        return result;
      } catch (e: any) {
        console.error('[useMint] sendAsync threw:', e);
        setError(e?.message ?? "Mint failed");
        return null;
      } finally {
        setMinting(false);
      }
    },
    [address, sendAsync]
  );

  return { mint, minting, txHash, error };
}
