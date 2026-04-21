"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import { useAccount, useProvider } from "@starknet-react/core";
import { Contract, shortString, num } from "starknet";
import { VibeCard } from "@/components/VibeCard";
import { CardData, VibeTypeIndex } from "@/lib/types";
import { CONTRACT_ADDRESSES } from "@/lib/constants";
import { loadLocalCard } from "@/lib/storage";
import { useBattle, OnchainBattle } from "@/hooks/useBattle";

const VIBECARD_READ_ABI = [
  { type: "struct", name: "vibe_card::CardData", members: [
    { name: "owner", type: "core::starknet::contract_address::ContractAddress" },
    { name: "commitment", type: "core::felt252" },
    { name: "ipfs_cid", type: "core::felt252" },
    { name: "revealed_type", type: "core::integer::u8" },
    { name: "palette_revealed", type: "core::bool" },
    { name: "mint_timestamp", type: "core::integer::u64" },
    { name: "persona_name", type: "core::felt252" },
  ]},
  { type: "struct", name: "vibe_card::TraitRevealState", members: [
    { name: "trait_1_word", type: "core::felt252" },
    { name: "trait_2_word", type: "core::felt252" },
    { name: "bar_fills_accurate", type: "core::bool" },
    { name: "palette_revealed", type: "core::bool" },
    { name: "type_revealed", type: "core::bool" },
  ]},
  { type: "function", name: "get_card",
    inputs: [{ name: "token_id", type: "core::integer::u256" }],
    outputs: [{ type: "vibe_card::CardData" }], state_mutability: "view" },
  { type: "function", name: "get_trait_state",
    inputs: [{ name: "token_id", type: "core::integer::u256" }],
    outputs: [{ type: "vibe_card::TraitRevealState" }], state_mutability: "view" },
  { type: "function", name: "get_battle_losses",
    inputs: [{ name: "token_id", type: "core::integer::u256" }],
    outputs: [{ type: "core::integer::u8" }], state_mutability: "view" },
] as const;

const MOVES = [
  { label: "Identity Attack", description: "Target their public wallet signals" },
  { label: "Geographic Strike", description: "Expose their location patterns" },
  { label: "Financial Raid", description: "Uncover their money trail" },
];

type Step = "loading" | "pick" | "confirm" | "submitted" | "already_responded" | "not_defender" | "error";

export default function RespondPage({ params }: { params: { battleId: string } }) {
  const battleId = parseInt(params.battleId, 10);
  const { address } = useAccount();
  const { provider } = useProvider();
  const { submitDefense, getBattle, loading: battleLoading, error: battleError } = useBattle();

  const [step, setStep] = useState<Step>("loading");
  const [battle, setBattle] = useState<OnchainBattle | null>(null);
  const [challengerCard, setChallengerCard] = useState<CardData | null>(null);
  const [defenderCard, setDefenderCard] = useState<CardData | null>(null);
  const [selectedMove, setSelectedMove] = useState<number | null>(null);
  const [txHash, setTxHash] = useState<string | null>(null);
  const [localError, setLocalError] = useState<string | null>(null);
  const [challengerXHandle, setChallengerXHandle] = useState<string | null>(null);
  const [myXHandle, setMyXHandle] = useState<string | null>(null);

  useEffect(() => {
    if (!provider || isNaN(battleId)) return;

    async function load() {
      try {
        const b = await getBattle(battleId);
        if (!b) { setStep("error"); setLocalError("Battle not found onchain."); return; }
        setBattle(b);

        if (b.status !== 0) { setStep("already_responded"); return; }

        const contract = new Contract({
          abi: VIBECARD_READ_ABI as any,
          address: CONTRACT_ADDRESSES.vibeCard,
          providerOrAccount: provider,
        });

        const fetchCard = async (tokenId: number): Promise<CardData> => {
          const [raw, traitRaw, lossesRaw] = await Promise.all([
            contract.get_card({ low: tokenId, high: 0 }),
            contract.get_trait_state({ low: tokenId, high: 0 }),
            contract.get_battle_losses({ low: tokenId, high: 0 }),
          ]);
          const revealed = Number(raw.revealed_type);
          const losses = Number(lossesRaw);
          const owner: string = raw.owner != null ? num.toHex(raw.owner.toString()) : "0x0";
          const personaName = (() => {
            try { return shortString.decodeShortString(raw.persona_name?.toString() ?? "0x0"); }
            catch { return `Vibe #${tokenId}`; }
          })();
          return {
            id: `chain-${tokenId}`, tokenId, owner,
            commitment: raw.commitment?.toString() ?? "0x0",
            revealedType: revealed !== 255 ? (revealed as VibeTypeIndex) : undefined,
            paletteRevealed: Boolean(raw.palette_revealed),
            mintTimestamp: Number(raw.mint_timestamp) * 1000,
            personaName, isAnchored: true,
            battleRecord: { wins: 0, losses, total: losses },
            traitReveal: {
              barFillsAccurate: Boolean(traitRaw.bar_fills_accurate),
              paletteRevealed: Boolean(traitRaw.palette_revealed),
              typeRevealed: Boolean(traitRaw.type_revealed),
              lossCount: losses,
            },
            recentBattles: [],
          };
        };

        const [cCard, dCard] = await Promise.all([
          fetchCard(b.challengerToken),
          fetchCard(b.defenderToken),
        ]);
        setChallengerCard(cCard);

        // Check the connected wallet owns the defender card
        // Compare as BigInt: num.toHex may still differ in zero-padding
        const ownsDefender = (() => {
          if (!address) return false;
          try { return BigInt(dCard.owner) === BigInt(address); } catch { return false; }
        })();
        if (!ownsDefender) {
          setStep("not_defender");
          return;
        }

        // Prefer localStorage version (has privacyProfile for activityScore)
        const local = loadLocalCard();
        if (local?.tokenId === b.defenderToken || local?.isAnchored) {
          setDefenderCard({ ...dCard, privacyProfile: local?.privacyProfile });
        } else {
          setDefenderCard(dCard);
        }
        // Fetch challenger's X handle (to tag them in the defender's tweet)
        try {
          const res = await fetch(`/api/x-handle?address=${encodeURIComponent(num.toHex(cCard.owner))}`);
          const { handle } = await res.json();
          if (handle) setChallengerXHandle(handle);
        } catch {}

        // Pre-fill defender's own handle from localStorage
        const localCard = loadLocalCard();
        if (localCard?.xHandle) setMyXHandle(localCard.xHandle);

        setStep("pick");
      } catch (e: any) {
        console.error("RespondPage load error:", e);
        setStep("error");
        setLocalError(e?.message ?? "Failed to load battle.");
      }
    }

    load();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [provider, battleId, address]);

  async function handleSubmitDefense() {
    if (selectedMove === null) return;
    setLocalError(null);
    const activityScore = loadLocalCard()?.privacyProfile?.totalTransactions ?? 0;
    const result = await submitDefense(battleId, selectedMove, activityScore);
    if (!result) { setLocalError(battleError ?? "Transaction failed"); return; }
    localStorage.setItem(`pendingDefense_${battleId}`, JSON.stringify({ move: result.move, nonce: result.nonce }));
    setTxHash(result.txHash);
    setStep("submitted");
    // Signal Nav + BattleBanner to re-fetch — clears the notification immediately
    window.dispatchEvent(new Event("proofofvibe:battleUpdated"));
  }

  const displayError = localError ?? battleError;

  if (step === "loading") {
    return (
      <div className="min-h-screen bg-[#080810] flex items-center justify-center">
        <motion.div className="w-8 h-8 rounded-full bg-violet-500/30"
          animate={{ scale: [1, 1.4, 1], opacity: [0.4, 1, 0.4] }}
          transition={{ duration: 1, repeat: Infinity }} />
      </div>
    );
  }

  if (step === "error" || step === "not_defender") {
    return (
      <div className="min-h-screen bg-[#080810] flex flex-col items-center justify-center gap-4 px-6 text-center">
        <p className="font-card text-white/60 text-lg">
          {step === "not_defender"
            ? "You don't own the defender card for this battle."
            : (displayError ?? "Something went wrong")}
        </p>
        <Link href="/leaderboard" className="text-xs font-ui text-violet-400 hover:text-violet-300 transition-colors">
          ← Battle Arena
        </Link>
      </div>
    );
  }

  if (step === "already_responded") {
    return (
      <div className="min-h-screen bg-[#080810] flex flex-col items-center justify-center gap-6 px-6 text-center">
        <div className="w-16 h-16 rounded-full flex items-center justify-center text-3xl"
          style={{ background: "rgba(127,119,221,0.15)" }}>✓</div>
        <div>
          <h2 className="font-card text-2xl font-medium text-white mb-2">Already responded</h2>
          <p className="text-white/40 text-sm font-ui">
            Defense for Battle #{battleId} is committed.
            <br />Waiting for the challenger to resolve.
          </p>
        </div>
        <Link href="/leaderboard"
          className="min-touch px-5 py-2.5 rounded-xl font-card text-sm text-white transition-all hover:scale-105"
          style={{ background: "rgba(127,119,221,0.12)", border: "1px solid rgba(127,119,221,0.28)" }}>
          Battle Arena
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col" style={{ backgroundColor: "#080810" }}>
      <div className="max-w-3xl mx-auto w-full px-6 py-12">
        <Link href="/leaderboard"
          className="text-white/30 hover:text-white/60 transition-colors text-sm font-ui mb-8 inline-block">
          ← Back
        </Link>

        <AnimatePresence mode="wait">
          {step === "pick" && (
            <motion.div key="pick" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
              <p className="text-[11px] font-card tracking-[0.3em] text-white/30 uppercase mb-2">Defend</p>
              <h1 className="font-card text-2xl font-medium text-white mb-2">
                You&apos;re being challenged!
              </h1>
              <p className="text-white/40 text-sm font-ui mb-8">
                Battle #{battleId} · Commit your defensive move onchain to counter.
              </p>

              <div className="flex flex-col sm:flex-row gap-8 items-center justify-center mb-10">
                <div className="flex flex-col items-center gap-2">
                  {challengerCard
                    ? <VibeCard card={challengerCard} interactive={false} size="sm" />
                    : <div className="w-[200px] h-[300px] rounded-[20px] flex items-center justify-center text-white/20 text-xs font-ui"
                        style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)" }}>Challenger</div>}
                  <span className="text-xs text-white/40 font-ui">
                    {challengerCard?.personaName ?? "Challenger"}
                  </span>
                </div>
                <span className="font-card text-2xl text-white/20">vs</span>
                <div className="flex flex-col items-center gap-2">
                  {defenderCard
                    ? <VibeCard card={defenderCard} interactive={false} size="sm" />
                    : <div className="w-[200px] h-[300px] rounded-[20px] flex items-center justify-center text-white/20 text-xs font-ui"
                        style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)" }}>You</div>}
                  <span className="text-xs text-white/40 font-ui">You (Defender)</span>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4">
                {MOVES.map((move, i) => (
                  <motion.button key={i}
                    whileHover={{ scale: 1.02, x: 4 }} whileTap={{ scale: 0.97 }}
                    onClick={() => { setSelectedMove(i); setStep("confirm"); }}
                    className="min-touch p-5 rounded-2xl text-left flex items-center gap-4"
                    style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}>
                    <span className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-card font-bold text-white/40 shrink-0"
                      style={{ background: "rgba(255,255,255,0.06)" }}>{i + 1}</span>
                    <div>
                      <p className="font-card text-white font-medium">{move.label}</p>
                      <p className="text-white/30 text-xs font-ui mt-0.5">{move.description}</p>
                    </div>
                  </motion.button>
                ))}
              </div>
            </motion.div>
          )}

          {step === "confirm" && selectedMove !== null && (
            <motion.div key="confirm" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
              <p className="text-[11px] font-card tracking-[0.3em] text-white/30 uppercase mb-2">Confirm Defense</p>
              <h2 className="font-card text-2xl font-medium text-white mb-2">{MOVES[selectedMove].label}</h2>
              <p className="text-white/40 text-sm font-ui mb-8">
                {MOVES[selectedMove].description}
                <br />Sealed as a hash — revealed only when the battle resolves.
              </p>

              {displayError && (
                <div className="mb-4 px-4 py-3 rounded-xl text-sm font-ui"
                  style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.25)", color: "#ef4444" }}>
                  {displayError}
                </div>
              )}

              <div className="flex gap-3">
                <button onClick={() => setStep("pick")}
                  className="min-touch px-5 py-3 rounded-xl font-card text-sm text-white/40 hover:text-white transition-all">
                  Back
                </button>
                <button onClick={handleSubmitDefense} disabled={battleLoading}
                  className="min-touch flex-1 px-8 py-3 rounded-xl font-card text-sm text-white hover:scale-105 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  style={{ background: "rgba(127,119,221,0.15)", border: "1px solid rgba(127,119,221,0.3)" }}>
                  {battleLoading ? "Committing defense…" : "Commit defense onchain"}
                </button>
              </div>
            </motion.div>
          )}

          {step === "submitted" && (
            <motion.div key="submitted" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
              className="flex flex-col items-center gap-6 py-12 text-center">
              <motion.div className="w-20 h-20 rounded-full flex items-center justify-center text-4xl"
                style={{ background: "rgba(127,119,221,0.15)" }}
                animate={{ scale: [1, 1.08, 1] }} transition={{ duration: 1.5, repeat: Infinity }}>
                🛡️
              </motion.div>
              <div>
                <h2 className="font-card text-2xl font-medium text-white mb-2">Defense committed!</h2>
                <p className="text-white/40 text-sm font-ui max-w-sm">
                  Your move is sealed onchain. The challenger will reveal and resolve —
                  check your card page for the result.
                </p>
              </div>
              {txHash && (
                <a href={`https://sepolia.voyager.online/tx/${txHash}`} target="_blank" rel="noopener noreferrer"
                  className="text-xs font-ui text-white/30 hover:text-white/60 transition-colors">
                  View on Voyager ↗
                </a>
              )}
              {/* Post to X */}
              <a
                href={`https://twitter.com/intent/tweet?text=${encodeURIComponent(
                  [
                    myXHandle ? `@${myXHandle}` : "I",
                    "just defended against",
                    challengerXHandle ? `@${challengerXHandle}` : (challengerCard?.personaName ?? "a challenger"),
                    `in Proof of Vibe! 🛡️\n\nBattle #${battleId} — identity still sealed.\n\nThink you can crack it? → https://proof-of-vibe-kohl.vercel.app #ProofOfVibe #Starknet`,
                  ].join(" ")
                )}`}
                target="_blank"
                rel="noopener noreferrer"
                className="min-touch flex items-center gap-2 px-5 py-2.5 rounded-xl font-card text-sm text-white transition-all hover:scale-105"
                style={{ background: "rgba(0,0,0,0.6)", border: "1px solid rgba(255,255,255,0.15)" }}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.746l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                </svg>
                Post to X
              </a>
              <div className="flex gap-3">
                {defenderCard && (
                  <Link href={`/card/${defenderCard.id}`}
                    className="min-touch px-5 py-2.5 rounded-xl font-card text-sm text-white transition-all hover:scale-105"
                    style={{ background: "rgba(127,119,221,0.12)", border: "1px solid rgba(127,119,221,0.28)" }}>
                    My card
                  </Link>
                )}
                <Link href="/leaderboard"
                  className="min-touch px-5 py-2.5 rounded-xl font-card text-sm text-white/50 hover:text-white transition-all">
                  Battle Arena
                </Link>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
