"use client";

import { useCallback, useState } from "react";
import { useAccount, useSendTransaction, useProvider } from "@starknet-react/core";
import { CONTRACT_ADDRESSES } from "@/lib/constants";
import { generateSalt, generatePersonaName } from "@/lib/utils";
import { saveCardLocally, updateLocalCard, loadLocalCard } from "@/lib/storage";
import { CardData, VibeTypeIndex } from "@/lib/types";
import { hash, shortString, CallData, Contract, num } from "starknet";

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
          calldata: CallData.compile([commitment, "0x0", nameFelt]),
        };

        console.log('[useMint] calling sendAsync with call:', call);
        const result = await sendAsync([call]);
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

        // Resolve the real onchain token ID so battle page can use it directly.
        // Clears scan session markers so useMyCard re-fetches on next render.
        sessionStorage.removeItem("privacyScanDone");
        sessionStorage.removeItem("quizVibeType");
        try {
          const contract = new Contract({
            abi: VIBECARD_COUNTER_ABI as any,
            address: CONTRACT_ADDRESSES.vibeCard,
            providerOrAccount: provider,
          });
          const counterRaw = await contract.token_counter();
          const total = Number(counterRaw);
          const stripLeadingZeros = (a: string) =>
            "0x" + a.toLowerCase().replace(/^0x0*/, "");
          const normalizedAddress = stripLeadingZeros(address);
          // Scan the last 20 tokens (covers all reasonable activity windows)
          for (let id = total; id >= Math.max(1, total - 20); id--) {
            const raw = await contract.get_card({ low: id, high: 0 });
            const ownerHex = (() => { try { return num.toHex(raw.owner?.toString() ?? "0x0"); } catch { return raw.owner?.toString() ?? ""; } })();
            if (stripLeadingZeros(ownerHex) === normalizedAddress) {
              updateLocalCard({ id: `${address}-${id}`, tokenId: id });
              break;
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
