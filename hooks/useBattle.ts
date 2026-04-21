"use client";

import { useCallback, useState } from "react";
import { useAccount, useProvider, useSendTransaction } from "@starknet-react/core";
import { hash, Contract } from "starknet";
import { CONTRACT_ADDRESSES } from "@/lib/constants";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface OnchainBattle {
  challengerToken: number;
  defenderToken: number;
  status: 0 | 1 | 2 | 3;
  winner: number;
  challengerActivityScore: number;
  defenderActivityScore: number;
  initiatedAt: number; // ms timestamp
}

// ---------------------------------------------------------------------------
// ABI — only the battle-related entries
// ---------------------------------------------------------------------------

const BATTLE_READ_ABI = [
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

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export function useBattle() {
  const { address } = useAccount();
  const { provider } = useProvider();
  const { sendAsync } = useSendTransaction({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // -------------------------------------------------------------------------
  // Helper: generate a random hex nonce
  // -------------------------------------------------------------------------
  function randomNonce(): string {
    const bytes = new Uint8Array(16);
    crypto.getRandomValues(bytes);
    return (
      "0x" +
      Array.from(bytes)
        .map((b) => b.toString(16).padStart(2, "0"))
        .join("")
    );
  }

  // Helper: run sendAsync once, retry once if Cartridge gives a nonce error
  const sendWithNonceRetry = useCallback(
    async (calls: Parameters<typeof sendAsync>[0]) => {
      try {
        return await sendAsync(calls);
      } catch (e: any) {
        const msg = e?.message ?? "";
        if (msg.toLowerCase().includes("nonce") || msg.toLowerCase().includes("invalid transaction nonce")) {
          console.warn("[useBattle] nonce error, retrying once…", msg);
          await new Promise((r) => setTimeout(r, 1200));
          return await sendAsync(calls);
        }
        throw e;
      }
    },
    [sendAsync]
  );

  // -------------------------------------------------------------------------
  // initiateBattle
  // -------------------------------------------------------------------------
  const initiateBattle = useCallback(
    async (
      challengerTokenId: number,
      defenderTokenId: number,
      move: number,
      activityScore: number,
      onTxHash?: (txHash: string) => void
    ): Promise<{ txHash: string; battleId: number; move: number; nonce: string } | null> => {
      if (!address) {
        setError("Wallet not connected");
        return null;
      }
      setLoading(true);
      setError(null);
      try {
        const nonce = randomNonce();
        const commitment = hash.computePedersenHash(move.toString(), nonce);

        const call = {
          contractAddress: CONTRACT_ADDRESSES.vibeCard as `0x${string}`,
          entrypoint: "initiate_battle",
          calldata: [
            { low: challengerTokenId, high: 0 },
            { low: defenderTokenId, high: 0 },
            commitment,
            activityScore.toString(),
          ],
        };

        const result = await sendWithNonceRetry([call]);
        if (!result?.transaction_hash) return null;

        const txHash = result.transaction_hash;

        // Parse battle_id from receipt events
        let battleId = 0;
        try {
          // Wait for the transaction to be confirmed before reading the receipt.
          // getTransactionReceipt immediately after sendAsync returns "tx not found"
          // because the tx is still pending in the mempool.
          await provider.waitForTransaction(txHash, { retryInterval: 2000 });
          const receipt = await provider.getTransactionReceipt(txHash);
          const battleInitiatedKey = hash.getSelectorFromName("BattleInitiated");
          const events = (receipt as any).events as Array<{ keys: string[]; data: string[] }>;
          console.log("[useBattle] receipt events:", JSON.stringify(events?.slice(0, 3)));
          const ev = events?.find(
            (e) =>
              e.keys &&
              e.keys[0]?.toLowerCase() === battleInitiatedKey.toLowerCase()
          );
          if (ev) {
            // battle_id (u256) may be in keys[1] (if indexed) or data[0]/data[1] (non-indexed low/high)
            const idHex = ev.keys[1] ?? ev.data?.[0];
            if (idHex) {
              battleId = Number(BigInt(idHex));
            }
            console.log("[useBattle] BattleInitiated event found, keys:", ev.keys, "data:", ev.data, "→ battleId:", battleId);
          } else {
            console.warn("[useBattle] BattleInitiated event NOT found in receipt. Events:", events?.map(e => e.keys?.[0]));
          }
        } catch (parseErr) {
          console.warn("useBattle: could not parse battleId from receipt", parseErr);
        }

        // Store challenger move+nonce server-side so the oracle can auto-resolve
        // when the defender responds — no need for challenger to be online.
        if (battleId > 0) {
          fetch("/api/battle-attack", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ battleId, move, nonce }),
          }).catch(() => {});
        }

        return { txHash, battleId, move, nonce };
      } catch (e: any) {
        console.error("useBattle.initiateBattle error:", e);
        setError(e?.message ?? "initiateBattle failed");
        return null;
      } finally {
        setLoading(false);
      }
    },
    [address, provider, sendAsync, sendWithNonceRetry]
  );

  // -------------------------------------------------------------------------
  // submitDefense
  // -------------------------------------------------------------------------
  const submitDefense = useCallback(
    async (
      battleId: number,
      move: number,
      activityScore: number
    ): Promise<{ txHash: string; move: number; nonce: string } | null> => {
      if (!address) {
        setError("Wallet not connected");
        return null;
      }
      setLoading(true);
      setError(null);
      try {
        const nonce = randomNonce();
        const commitment = hash.computePedersenHash(move.toString(), nonce);

        const call = {
          contractAddress: CONTRACT_ADDRESSES.vibeCard as `0x${string}`,
          entrypoint: "submit_defense",
          calldata: [
            { low: battleId, high: 0 },
            commitment,
            activityScore.toString(),
          ],
        };

        const result = await sendWithNonceRetry([call]);
        if (!result?.transaction_hash) return null;

        // Save defender's move+nonce server-side so the challenger can fetch it for resolve
        fetch("/api/battle-defense", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ battleId, move, nonce }),
        }).catch(() => {});

        return { txHash: result.transaction_hash, move, nonce };
      } catch (e: any) {
        console.error("useBattle.submitDefense error:", e);
        setError(e?.message ?? "submitDefense failed");
        return null;
      } finally {
        setLoading(false);
      }
    },
    [address, sendAsync, sendWithNonceRetry]
  );

  // -------------------------------------------------------------------------
  // resolveBattle
  // -------------------------------------------------------------------------
  const resolveBattle = useCallback(
    async (
      battleId: number,
      challengerMove: number,
      challengerNonce: string,
      defenderMove: number,
      defenderNonce: string
    ): Promise<{ txHash: string } | null> => {
      if (!address) {
        setError("Wallet not connected");
        return null;
      }
      setLoading(true);
      setError(null);
      try {
        const call = {
          contractAddress: CONTRACT_ADDRESSES.vibeCard as `0x${string}`,
          entrypoint: "resolve_battle",
          calldata: [
            { low: battleId, high: 0 },
            challengerMove.toString(),
            challengerNonce,
            defenderMove.toString(),
            defenderNonce,
          ],
        };

        const result = await sendWithNonceRetry([call]);
        if (!result?.transaction_hash) return null;

        return { txHash: result.transaction_hash };
      } catch (e: any) {
        console.error("useBattle.resolveBattle error:", e);
        setError(e?.message ?? "resolveBattle failed");
        return null;
      } finally {
        setLoading(false);
      }
    },
    [address, sendAsync, sendWithNonceRetry]
  );

  // -------------------------------------------------------------------------
  // claimExpiredBattle — challenger calls this after the 1h window passes
  // -------------------------------------------------------------------------
  const claimExpiredBattle = useCallback(
    async (battleId: number): Promise<{ txHash: string } | null> => {
      if (!address) {
        setError("Wallet not connected");
        return null;
      }
      setLoading(true);
      setError(null);
      try {
        const call = {
          contractAddress: CONTRACT_ADDRESSES.vibeCard as `0x${string}`,
          entrypoint: "claim_expired_battle",
          calldata: [{ low: battleId, high: 0 }],
        };

        const result = await sendWithNonceRetry([call]);
        if (!result?.transaction_hash) return null;

        return { txHash: result.transaction_hash };
      } catch (e: any) {
        console.error("useBattle.claimExpiredBattle error:", e);
        setError(e?.message ?? "claimExpiredBattle failed");
        return null;
      } finally {
        setLoading(false);
      }
    },
    [address, sendAsync, sendWithNonceRetry]
  );

  // -------------------------------------------------------------------------
  // getBattle — read-only, no state mutation
  // -------------------------------------------------------------------------
  const getBattle = useCallback(
    async (battleId: number): Promise<OnchainBattle | null> => {
      if (!provider) return null;
      try {
        const contract = new Contract({
          abi: BATTLE_READ_ABI as any,
          address: CONTRACT_ADDRESSES.vibeCard,
          providerOrAccount: provider,
        });

        const raw = await contract.get_battle({ low: battleId, high: 0 });

        const status = Number(raw.status) as 0 | 1 | 2 | 3;

        return {
          challengerToken: Number(raw.challenger_token),
          defenderToken: Number(raw.defender_token),
          status,
          winner: Number(raw.winner),
          challengerActivityScore: Number(raw.challenger_activity_score),
          defenderActivityScore: Number(raw.defender_activity_score),
          initiatedAt: Number(raw.initiated_at) * 1000,
        };
      } catch (e) {
        console.error("useBattle.getBattle error:", e);
        return null;
      }
    },
    [provider]
  );

  return {
    loading,
    error,
    initiateBattle,
    submitDefense,
    resolveBattle,
    claimExpiredBattle,
    getBattle,
  };
}
