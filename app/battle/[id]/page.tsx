"use client";

import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import { useAccount, useProvider } from "@starknet-react/core";
import { Contract, shortString } from "starknet";
import { VibeCard } from "@/components/VibeCard";
import { CardData, VibeTypeIndex } from "@/lib/types";
import { CONTRACT_ADDRESSES } from "@/lib/constants";
import { loadLocalCard } from "@/lib/storage";
import { useMyCard } from "@/hooks/useMyCard";
import { useBattle, OnchainBattle } from "@/hooks/useBattle";

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

function parseTokenId(id: string): number | null {
  const parts = id.split("-");
  const last = Number(parts[parts.length - 1]);
  if (Number.isInteger(last) && last > 0 && last < 1_000_000) return last;
  return null;
}

/** Resolve the battle-usable token ID from a CardData object.
 *  Prefers the explicit tokenId field; falls back to parsing the id string. */
function resolveTokenId(card: { id: string; tokenId?: number } | null): number | null {
  if (!card) return null;
  if (card.tokenId !== undefined && card.tokenId > 0) return card.tokenId;
  return parseTokenId(card.id);
}

const MOVES = [
  { label: "Identity Attack", description: "Target their public wallet signals" },
  { label: "Geographic Strike", description: "Expose their location patterns" },
  { label: "Financial Raid", description: "Uncover their money trail" },
];

type BattleStep = "pick" | "confirm" | "waiting" | "resolve" | "resolved";

interface PendingBattle {
  battleId: number;
  move: number;
  nonce: string;
}

export default function BattlePage({ params }: { params: { id: string } }) {
  const { address } = useAccount();
  const { provider } = useProvider();
  const { initiateBattle, resolveBattle, claimExpiredBattle, getBattle, loading: battleLoading, error: battleError } = useBattle();

  // useMyCard gives us the canonical version with a resolved tokenId.
  // The battle page reads localStorage once on mount, but if the local card
  // still has a stale scan-timestamp ID this hook will fix it asynchronously.
  const { card: myCard } = useMyCard();

  const [challengerCard, setChallengerCard] = useState<CardData | null>(null);
  const [challengerTokenId, setChallengerTokenId] = useState<number | null>(null);

  const [defenderCard, setDefenderCard] = useState<CardData | null>(null);
  const [defenderTokenId, setDefenderTokenId] = useState<number | null>(null);
  const [defenderLoading, setDefenderLoading] = useState(true);

  const [step, setStep] = useState<BattleStep>("pick");
  const [selectedMove, setSelectedMove] = useState<number | null>(null);
  const [activeBattle, setActiveBattle] = useState<PendingBattle | null>(null);
  const [onchainBattle, setOnchainBattle] = useState<OnchainBattle | null>(null);
  const [txHash, setTxHash] = useState<string | null>(null);
  const [localError, setLocalError] = useState<string | null>(null);
  const [xHandle, setXHandle] = useState(""); // defender handle
  const [myXHandle, setMyXHandle] = useState(""); // challenger handle

  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    const local = loadLocalCard();
    if (!local) return;
    setChallengerCard(local);
    setChallengerTokenId(resolveTokenId(local));

    // Pre-fill challenger's own X handle
    if (local.xHandle) {
      setMyXHandle(`@${local.xHandle}`);
    } else if (local.owner) {
      fetch(`/api/x-handle?address=${encodeURIComponent(local.owner)}`)
        .then((r) => r.json())
        .then(({ handle }) => { if (handle) setMyXHandle(`@${handle}`); })
        .catch(() => {});
    }
  }, []);

  // Sync from useMyCard whenever it resolves a better tokenId
  useEffect(() => {
    if (!myCard) return;
    const id = resolveTokenId(myCard);
    if (id !== null) {
      setChallengerCard(myCard);
      setChallengerTokenId(id);
    }
  }, [myCard]);

  useEffect(() => {
    if (!provider) return;
    const tokenId = parseTokenId(params.id);
    if (tokenId === null) { setDefenderLoading(false); return; }
    setDefenderTokenId(tokenId);

    async function fetchDefender() {
      setDefenderLoading(true);
      try {
        const contract = new Contract({
          abi: VIBECARD_READ_ABI as any,
          address: CONTRACT_ADDRESSES.vibeCard,
          providerOrAccount: provider,
        });

        const [raw, traitRaw, lossesRaw] = await Promise.all([
          contract.get_card({ low: tokenId, high: 0 }),
          contract.get_trait_state({ low: tokenId, high: 0 }),
          contract.get_battle_losses({ low: tokenId, high: 0 }),
        ]);

        const owner: string = raw.owner?.toString() ?? "0x0";
        const revealed = Number(raw.revealed_type);
        const losses = Number(lossesRaw);

        const personaName = (() => {
          try { return shortString.decodeShortString(raw.persona_name?.toString() ?? "0x0"); }
          catch { return `Vibe #${tokenId}`; }
        })();

        const card: CardData = {
          id: params.id,
          owner,
          commitment: raw.commitment?.toString() ?? "0x0",
          revealedType: revealed !== 255 ? (revealed as VibeTypeIndex) : undefined,
          paletteRevealed: Boolean(raw.palette_revealed),
          mintTimestamp: Number(raw.mint_timestamp) * 1000,
          personaName,
          isAnchored: true,
          battleRecord: { wins: 0, losses, total: losses },
          traitReveal: {
            barFillsAccurate: Boolean(traitRaw.bar_fills_accurate),
            paletteRevealed: Boolean(traitRaw.palette_revealed),
            typeRevealed: Boolean(traitRaw.type_revealed),
            lossCount: losses,
          },
          recentBattles: [],
        };
        setDefenderCard(card);

        // Auto-fetch defender's X handle from Redis
        try {
          const res = await fetch(`/api/x-handle?address=${encodeURIComponent(card.owner)}`);
          const { handle } = await res.json();
          if (handle) setXHandle(`@${handle}`);
        } catch {}
      } catch (e) {
        console.error("BattlePage: fetch defender failed", e);
      } finally {
        setDefenderLoading(false);
      }
    }

    fetchDefender();
  }, [params.id, provider]);

  useEffect(() => {
    if (step !== "waiting" || activeBattle === null) return;

    pollRef.current = setInterval(async () => {
      const battle = await getBattle(activeBattle.battleId);
      if (!battle) return;
      setOnchainBattle(battle);
      if (battle.status === 1) {
        clearInterval(pollRef.current!);
        setStep("resolve");
      }
    }, 5000);

    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [step, activeBattle, getBattle]);

  async function handleCommitMove() {
    if (selectedMove === null || challengerTokenId === null || defenderTokenId === null) return;
    setLocalError(null);

    const activityScore = loadLocalCard()?.privacyProfile?.totalTransactions ?? 0;

    const result = await initiateBattle(
      challengerTokenId,
      defenderTokenId,
      selectedMove,
      activityScore
    );

    if (!result) {
      setLocalError(battleError ?? "Transaction failed");
      return;
    }

    const pending: PendingBattle = { battleId: result.battleId, move: result.move, nonce: result.nonce };
    localStorage.setItem(`pendingBattle_${result.battleId}`, JSON.stringify(pending));
    setActiveBattle(pending);
    setTxHash(result.txHash);
    setStep("waiting");
  }

  async function handleClaimExpired() {
    if (!activeBattle || activeBattle.battleId === 0) return;
    setLocalError(null);

    const result = await claimExpiredBattle(activeBattle.battleId);

    if (!result) {
      setLocalError(battleError ?? "Claim failed");
      return;
    }

    setTxHash(result.txHash);
    const updated = await getBattle(activeBattle.battleId);
    if (updated) setOnchainBattle(updated);
    setStep("resolved");
  }

  async function handleResolve() {
    if (!activeBattle) return;
    setLocalError(null);

    let pending = activeBattle;
    const saved = localStorage.getItem(`pendingBattle_${activeBattle.battleId}`);
    if (saved) {
      try { pending = JSON.parse(saved) as PendingBattle; } catch { /* ignore */ }
    }

    const result = await resolveBattle(pending.battleId, pending.move, pending.nonce, 0, "0x1");

    if (!result) {
      setLocalError(battleError ?? "Resolve failed");
      return;
    }

    setTxHash(result.txHash);
    const updated = await getBattle(pending.battleId);
    if (updated) setOnchainBattle(updated);
    setStep("resolved");
  }

  // Build Twitter share URL — includes both challenger and defender handles when available
  function buildTweetUrl(defenderName: string, cardUrl: string, defHandle?: string, chalHandle?: string) {
    const defTag = defHandle ? `@${defHandle.replace(/^@/, "")}` : `"${defenderName}"`;
    const subject = chalHandle ? `@${chalHandle.replace(/^@/, "")}` : "I";
    const text = `${subject} challenged ${defTag} on Proof of Vibe! Defend your card and save your privacy 👻\n${cardUrl} #ProofOfVibe #Starknet`;
    return `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}`;
  }

  const isSelf =
    address &&
    defenderCard?.owner &&
    defenderCard.owner.toLowerCase() === address.toLowerCase();

  const displayError = localError ?? battleError;

  const wonBattle =
    onchainBattle &&
    challengerTokenId !== null &&
    onchainBattle.winner === challengerTokenId;

  if (defenderLoading) {
    return (
      <div className="min-h-screen bg-[#080810] flex items-center justify-center">
        <motion.div
          className="w-8 h-8 rounded-full bg-violet-500/30"
          animate={{ scale: [1, 1.4, 1], opacity: [0.4, 1, 0.4] }}
          transition={{ duration: 1, repeat: Infinity }}
        />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col" style={{ backgroundColor: "#080810" }}>
      <div className="max-w-3xl mx-auto w-full px-6 py-12">
        <Link
          href={`/card/${params.id}`}
          className="text-white/30 hover:text-white/60 transition-colors text-sm font-ui mb-8 inline-block"
        >
          Back
        </Link>

        <AnimatePresence mode="wait">
          {step === "pick" && (
            <motion.div key="pick" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
              <p className="text-[11px] font-card tracking-[0.3em] text-white/30 uppercase mb-2">Battle</p>

              {isSelf && (
                <div
                  className="mb-6 px-4 py-3 rounded-xl text-sm font-ui"
                  style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.25)", color: "#ef4444" }}
                >
                  You can&apos;t battle yourself.
                </div>
              )}

              {(!challengerCard || !challengerCard.isAnchored) && (
                <div className="mb-6 text-white/60 font-ui text-sm">
                  You need a minted card to battle.{" "}
                  <Link href="/reveal" className="text-violet-400 hover:underline">Mint yours</Link>
                </div>
              )}
              {challengerCard?.isAnchored && challengerTokenId === null && (
                <div className="mb-6 text-white/60 font-ui text-sm">
                  Resolving your card ID…{" "}
                  <Link href="/reveal" className="text-violet-400 hover:underline">
                    Visit your card page first
                  </Link>{" "}
                  then come back.
                </div>
              )}

              <h1 className="font-card text-2xl font-medium text-white mb-8">
                Challenge{" "}
                <span style={{ color: "rgba(127,119,221,1)" }}>
                  {defenderCard?.personaName ?? `Card #${defenderTokenId}`}
                </span>
              </h1>

              <div className="flex flex-col sm:flex-row gap-8 items-center justify-center mb-10">
                <div className="flex flex-col items-center gap-2">
                  {challengerCard ? (
                    <VibeCard card={challengerCard} interactive={false} size="sm" />
                  ) : (
                    <div
                      className="w-[200px] h-[300px] rounded-[20px] flex items-center justify-center text-white/20 text-xs font-ui"
                      style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)" }}
                    >
                      No card
                    </div>
                  )}
                  <span className="text-xs text-white/40 font-ui">You</span>
                </div>
                <span className="font-card text-2xl text-white/20">vs</span>
                <div className="flex flex-col items-center gap-2">
                  {defenderCard ? (
                    <VibeCard card={defenderCard} interactive={false} size="sm" />
                  ) : (
                    <div
                      className="w-[200px] h-[300px] rounded-[20px] flex items-center justify-center text-white/20 text-xs font-ui"
                      style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)" }}
                    >
                      Not found
                    </div>
                  )}
                  <span className="text-xs text-white/40 font-ui">Them</span>
                </div>
              </div>

              {!isSelf && challengerCard?.isAnchored && challengerTokenId !== null && (
                <div className="grid grid-cols-1 gap-4">
                  {MOVES.map((move, i) => (
                    <motion.button
                      key={i}
                      whileHover={{ scale: 1.02, x: 4 }}
                      whileTap={{ scale: 0.97 }}
                      onClick={() => { setSelectedMove(i); setStep("confirm"); }}
                      className="min-touch p-5 rounded-2xl text-left flex items-center gap-4"
                      style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}
                    >
                      <span
                        className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-card font-bold text-white/40 shrink-0"
                        style={{ background: "rgba(255,255,255,0.06)" }}
                      >
                        {i + 1}
                      </span>
                      <div>
                        <p className="font-card text-white font-medium">{move.label}</p>
                        <p className="text-white/30 text-xs font-ui mt-0.5">{move.description}</p>
                      </div>
                    </motion.button>
                  ))}
                </div>
              )}
            </motion.div>
          )}

          {step === "confirm" && selectedMove !== null && (
            <motion.div key="confirm" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
              <p className="text-[11px] font-card tracking-[0.3em] text-white/30 uppercase mb-2">Confirm Move</p>
              <h2 className="font-card text-2xl font-medium text-white mb-6">{MOVES[selectedMove].label}</h2>
              <p className="text-white/40 text-sm font-ui mb-8">
                {MOVES[selectedMove].description}
                <br />
                Your move will be committed onchain as a hash — revealed only when resolved.
              </p>

              {displayError && (
                <div
                  className="mb-4 px-4 py-3 rounded-xl text-sm font-ui"
                  style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.25)", color: "#ef4444" }}
                >
                  {displayError}
                </div>
              )}

              <div className="flex gap-3">
                <button
                  onClick={() => setStep("pick")}
                  className="min-touch px-5 py-3 rounded-xl font-card text-sm text-white/40 hover:text-white transition-all"
                >
                  Back
                </button>
                <button
                  onClick={handleCommitMove}
                  disabled={battleLoading}
                  className="min-touch flex-1 px-8 py-3 rounded-xl font-card text-sm text-white hover:scale-105 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  style={{ background: "rgba(239,68,68,0.15)", border: "1px solid rgba(239,68,68,0.3)" }}
                >
                  {battleLoading ? "Committing..." : "Commit move onchain"}
                </button>
              </div>
            </motion.div>
          )}

          {step === "waiting" && activeBattle !== null && (
            <motion.div
              key="waiting"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex flex-col items-center gap-6 py-24 text-center"
            >
              <motion.div
                className="w-16 h-16 rounded-full border-2"
                style={{ borderColor: "rgba(127,119,221,0.3)" }}
                animate={{ rotate: 360 }}
                transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
              />
              <p className="font-card text-lg text-white">
                Waiting for {defenderCard?.personaName ?? "opponent"} to respond...
              </p>
              <p className="text-white/30 text-sm font-ui">Battle #{activeBattle.battleId}</p>
              <p className="text-white/20 text-xs font-ui">Expires in ~1h if no response</p>

              {onchainBattle && activeBattle.battleId > 0 && onchainBattle.initiatedAt > 0 && Date.now() > onchainBattle.initiatedAt + 3_600_000 && (
                <button
                  onClick={handleClaimExpired}
                  disabled={battleLoading}
                  className="min-touch px-6 py-2.5 rounded-xl font-card text-sm text-white transition-all hover:scale-105 disabled:opacity-50"
                  style={{ background: "rgba(239,68,68,0.12)", border: "1px solid rgba(239,68,68,0.25)" }}
                >
                  {battleLoading ? "Claiming…" : "Claim win (expired)"}
                </button>
              )}

              {/* ── Share on X ── */}
              <div className="flex flex-col items-center gap-3 mt-4 w-full max-w-xs">
                <p className="text-[10px] font-ui text-white/25 tracking-wider uppercase">
                  Share on 𝕏 to notify the defender
                </p>
                <div className="flex gap-2 w-full">
                  <input
                    type="text"
                    placeholder="Your @handle"
                    value={myXHandle}
                    onChange={(e) => {
                      setMyXHandle(e.target.value);
                      // Persist for next time
                      const local = loadLocalCard();
                      if (local?.owner) {
                        fetch("/api/x-handle", {
                          method: "POST",
                          headers: { "Content-Type": "application/json" },
                          body: JSON.stringify({ address: local.owner, handle: e.target.value.replace(/^@/, "") }),
                        }).catch(() => {});
                      }
                    }}
                    className="flex-1 px-3 py-2 rounded-lg text-xs font-ui text-white/70 bg-white/5 border border-white/10 focus:outline-none focus:border-white/20 placeholder-white/20"
                  />
                  <input
                    type="text"
                    placeholder="Defender @handle"
                    value={xHandle}
                    onChange={(e) => setXHandle(e.target.value)}
                    className="flex-1 px-3 py-2 rounded-lg text-xs font-ui text-white/70 bg-white/5 border border-white/10 focus:outline-none focus:border-white/20 placeholder-white/20"
                  />
                </div>
                <a
                  href={buildTweetUrl(
                    defenderCard?.personaName ?? `Card #${defenderTokenId}`,
                    `https://proof-of-vibe-kohl.vercel.app/card/${params.id}`,
                    xHandle || undefined,
                    myXHandle || undefined
                  )}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="min-touch w-full px-4 py-2.5 rounded-xl text-xs font-card text-white text-center transition-all hover:scale-105 flex items-center justify-center gap-2"
                  style={{ background: "rgba(29,161,242,0.15)", border: "1px solid rgba(29,161,242,0.3)" }}
                >
                  𝕏 Post challenge
                </a>
              </div>
            </motion.div>
          )}

          {step === "resolve" && activeBattle !== null && (
            <motion.div
              key="resolve"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="flex flex-col items-center gap-6 py-16 text-center"
            >
              <p className="text-[11px] font-card tracking-[0.3em] text-white/30 uppercase">
                Defender has committed
              </p>
              <h2 className="font-card text-2xl font-medium text-white">
                Battle #{activeBattle.battleId} is ready to resolve
              </h2>
              <p className="text-white/40 text-sm font-ui max-w-sm">
                Both sides have committed. Reveal your move onchain to determine the winner.
              </p>

              {displayError && (
                <div
                  className="px-4 py-3 rounded-xl text-sm font-ui w-full max-w-sm"
                  style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.25)", color: "#ef4444" }}
                >
                  {displayError}
                </div>
              )}

              <button
                onClick={handleResolve}
                disabled={battleLoading}
                className="min-touch px-8 py-3 rounded-xl font-card text-sm text-white hover:scale-105 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                style={{ background: "rgba(239,68,68,0.15)", border: "1px solid rgba(239,68,68,0.3)" }}
              >
                {battleLoading ? "Resolving..." : "Reveal & Resolve"}
              </button>
            </motion.div>
          )}

          {step === "resolved" && (
            <motion.div
              key="resolved"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="flex flex-col items-center gap-6 py-12 text-center"
            >
              <motion.div
                className="w-20 h-20 rounded-full flex items-center justify-center text-4xl"
                style={{ background: wonBattle ? "rgba(34,197,94,0.15)" : "rgba(239,68,68,0.15)" }}
                animate={{ scale: [1, 1.1, 1] }}
                transition={{ duration: 0.5 }}
              >
                {wonBattle ? "W" : "L"}
              </motion.div>

              <div>
                <h2
                  className="font-card text-2xl font-medium mb-2"
                  style={{ color: wonBattle ? "#22c55e" : "#ef4444" }}
                >
                  {wonBattle ? "You extracted a fragment!" : "A trait was revealed from your card"}
                </h2>
                <p className="text-white/40 text-sm font-ui">
                  {wonBattle
                    ? `You defeated ${defenderCard?.personaName ?? "the defender"}.`
                    : `${defenderCard?.personaName ?? "The defender"} exposed your card.`}
                </p>
              </div>

              {txHash && (
                <a
                  href={`https://sepolia.voyager.online/tx/${txHash}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs font-ui text-white/30 hover:text-white/60 transition-colors"
                >
                  View on Voyager
                </a>
              )}

              <div className="flex gap-3">
                <Link
                  href="/leaderboard"
                  className="min-touch px-5 py-2.5 rounded-xl font-card text-sm text-white transition-all hover:scale-105"
                  style={{ background: "rgba(127,119,221,0.15)", border: "1px solid rgba(127,119,221,0.3)" }}
                >
                  View leaderboard
                </Link>
                {challengerCard && (
                  <Link
                    href={`/card/${challengerCard.id}`}
                    className="min-touch px-5 py-2.5 rounded-xl font-card text-sm text-white/60 hover:text-white transition-all"
                  >
                    My card
                  </Link>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
