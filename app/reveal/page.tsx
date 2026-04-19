"use client";

import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import { useAccount, useDisconnect } from "@starknet-react/core";
import { VibeCard } from "@/components/VibeCard";
import { ConnectModal } from "@/components/ConnectModal";
import { CardData, VibeTypeIndex } from "@/lib/types";
import { generatePersonaName } from "@/lib/utils";
import { SHARE_TWEET_TEMPLATE } from "@/lib/constants";
import { loadLocalCard, saveCardLocally, updateLocalCard, clearLocalCard } from "@/lib/storage";
import { useMint } from "@/hooks/useMint";
import { useMyCard } from "@/hooks/useMyCard";
import { usePrivacyScore } from "@/hooks/usePrivacyScore";
import { useBattleHistory } from "@/hooks/useBattleHistory";
import { VIBE_TYPES } from "@/lib/vibeTypes";

type RevealStep = "pulse" | "flip" | "aura" | "text" | "actions";


// ── Privacy score bar ──────────────────────────────────────────────────────

function ScoreBar({
  label,
  score,
  color,
}: {
  label: string;
  score: number;
  color: string;
}) {
  return (
    <div className="flex items-center gap-3 w-full">
      <span className="text-xs font-card text-white/50 w-28 shrink-0">
        {label}
      </span>
      <div
        className="flex-1 h-1.5 rounded-full"
        style={{ background: "rgba(255,255,255,0.06)" }}
      >
        <motion.div
          className="h-1.5 rounded-full"
          style={{ background: color }}
          initial={{ width: "0%" }}
          animate={{ width: `${score}%` }}
          transition={{ duration: 1, ease: "easeOut" }}
        />
      </div>
      <span className="text-xs font-ui text-white/30 w-8 text-right">
        {score}
      </span>
    </div>
  );
}

// ── Faucet modal ──────────────────────────────────────────────────────────

function FaucetModal({ address, onClose, onConfirm }: { address: string; onClose: () => void; onConfirm: () => void }) {
  const [copied, setCopied] = useState(false);
  function copy() {
    navigator.clipboard.writeText(address);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }
  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center px-6"
        onClick={onClose}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 8 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95 }}
          transition={{ duration: 0.2 }}
          className="w-full max-w-sm p-6 rounded-2xl flex flex-col gap-4"
          style={{ background: "#0d0d1a", border: "1px solid rgba(255,255,255,0.1)" }}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-start justify-between">
            <div>
              <h2 className="font-card text-lg font-medium text-white">Fund your wallet first</h2>
              <p className="text-white/40 text-sm font-ui mt-1">
                Your Cartridge account needs a small amount of Sepolia ETH or STRK before minting.
              </p>
            </div>
            <button onClick={onClose} className="text-white/30 hover:text-white transition-colors text-xl ml-3 shrink-0">×</button>
          </div>

          {/* Steps */}
          <div className="flex flex-col gap-3">
            <div className="flex gap-3 items-start">
              <span className="w-5 h-5 rounded-full bg-violet-500/20 text-violet-400 text-xs font-card flex items-center justify-center shrink-0 mt-0.5">1</span>
              <div className="flex-1">
                <p className="text-white/70 text-xs font-ui mb-1.5">Copy your wallet address</p>
                <button
                  onClick={copy}
                  className="w-full flex items-center justify-between gap-2 px-3 py-2 rounded-xl text-xs font-mono transition-all"
                  style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)" }}
                >
                  <span className="text-white/50 truncate">{address.slice(0, 14)}…{address.slice(-8)}</span>
                  <span className={copied ? "text-green-400 shrink-0" : "text-violet-400 shrink-0"}>
                    {copied ? "✓ Copied!" : "Copy"}
                  </span>
                </button>
              </div>
            </div>

            <div className="flex gap-3 items-start">
              <span className="w-5 h-5 rounded-full bg-violet-500/20 text-violet-400 text-xs font-card flex items-center justify-center shrink-0 mt-0.5">2</span>
              <div className="flex-1">
                <p className="text-white/70 text-xs font-ui mb-1.5">Get free Sepolia ETH or STRK</p>
                <a
                  href="https://faucet.starknet.io"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-between gap-2 px-3 py-2 rounded-xl text-xs font-card transition-all hover:scale-105"
                  style={{ background: "rgba(127,119,221,0.12)", border: "1px solid rgba(127,119,221,0.3)", color: "#a78bfa" }}
                >
                  faucet.starknet.io
                  <span>↗</span>
                </a>
              </div>
            </div>

            <div className="flex gap-3 items-start">
              <span className="w-5 h-5 rounded-full bg-violet-500/20 text-violet-400 text-xs font-card flex items-center justify-center shrink-0 mt-0.5">3</span>
              <p className="text-white/70 text-xs font-ui mt-0.5">Come back and mint — your first transaction deploys the account automatically.</p>
            </div>
          </div>

          <button
            onClick={() => { onClose(); onConfirm(); }}
            className="w-full py-2.5 rounded-xl font-card text-sm font-medium text-[#080810] transition-all hover:scale-105"
            style={{ background: "linear-gradient(135deg, #a78bfa, #7F77DD)" }}
          >
            Got it — Mint my card ⚡
          </button>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

// ── Main page ──────────────────────────────────────────────────────────────

export default function RevealPage() {
  const [step, setStep] = useState<RevealStep>("pulse");
  const [card, setCard] = useState<CardData | null>(null);
  // Tracks an existing onchain card without auto-showing it
  const [existingCard, setExistingCard] = useState<CardData | null>(null);
  const [showFaucetModal, setShowFaucetModal] = useState(false);
  const { address } = useAccount();
  const { mint, minting, txHash, error: mintError } = useMint();
  const { disconnect } = useDisconnect();


  const { card: onchainCard, loading: onchainLoading } = useMyCard();
  const myTokenId = onchainCard?.tokenId ?? null;
  const { history: battleHistory, loading: historyLoading } = useBattleHistory(myTokenId);
  const [showConnectModal, setShowConnectModal] = useState(false);
  const animationStarted = useRef(false);
  // Tracks whether the user has built a card from a fresh scan this session.
  // A ref (not state) so it is immune to stale closures in the onchain effect.
  const freshScanCardRef = useRef(false);

  // Privacy scan state
  const {
    scanning,
    profile: scanProfile,
    vibeType: scanVibeType,
    error: scanError,
    unsupportedChain,
    scan,
    reset: resetScan,
  } = usePrivacyScore();
  const [showingScan, setShowingScan] = useState(false);
  const [noActivityFound, setNoActivityFound] = useState(false);
  // The address to scan — defaults to connected wallet, but user can type any address
  const [scanInputAddress, setScanInputAddress] = useState("");

  // Sync input with connected wallet whenever wallet changes
  useEffect(() => {
    if (address && !scanInputAddress) setScanInputAddress(address);
  }, [address]);

  function startAnimation() {
    if (animationStarted.current) return;
    animationStarted.current = true;
    const timings: [RevealStep, number][] = [
      ["flip", 1500],
      ["aura", 2300],
      ["text", 2900],
      ["actions", 3300],
    ];
    timings.forEach(([s, t]) => setTimeout(() => setStep(s), t));
  }

  // ── Mount: check for existing card ──────────────────────────────────────
  useEffect(() => {
    // Clear only cards that are falsely marked anchored with zero proof:
    // no privacyProfile, no tokenId, and no mintTxHash.
    // Cards restored from chain (useMyCard) have tokenId set even without
    // a privacyProfile, so we must preserve them or they get wiped every visit.
    const stale = loadLocalCard();
    console.log("[reveal] mount — local card:", stale ? { id: stale.id, isAnchored: stale.isAnchored, tokenId: stale.tokenId, hasMintTx: !!stale.mintTxHash, hasProfile: !!stale.privacyProfile } : null);
    if (stale?.isAnchored && !stale.privacyProfile && !stale.tokenId && !stale.mintTxHash) {
      console.log("[reveal] clearing stale card — no proof of mint");
      clearLocalCard();
    }

    const local = loadLocalCard();

    // Only auto-load a local card if:
    //   (a) it was anchored onchain — useMyCard will pick it up, but show it immediately too
    //   (b) it was just created this session (quiz or scan markers present)
    // Otherwise the card is stale from a previous visit — clear it and show the scan options.
    const freshFromQuiz = !!sessionStorage.getItem("quizVibeType");
    const freshFromScan = !!sessionStorage.getItem("privacyScanDone");

    if (local && (freshFromQuiz || freshFromScan)) {
      // If the local card is anchored, it came from a previous mint.
      // Only keep it if both conditions hold:
      //   (a) it has a privacyProfile (it was legitimately built from a scan)
      //   (b) it genuinely came from a successful mint (isAnchored set only after tx hash)
      // If either is missing, it was corrupted by a failed mint — discard and start fresh.
      if (local.isAnchored) {
        if (!local.privacyProfile) {
          // Anchored but no privacy data — stale/corrupted, clear it
          clearLocalCard();
          return;
        }
        // Anchored with privacy data = legitimately minted card, show it
        setCard(local);
        startAnimation();
        return;
      }
      // Unanchored fresh session card — show it
      setCard(local);
      startAnimation();
      return;
    }

    // Anchored cards are handled by useMyCard (which checks address on chain).
    // Don't pre-populate existingCard from localStorage here — it would show
    // the old owner's card to a newly connected different account.

    // Stale local card — remove it so the user starts fresh
    if (local && !local.isAnchored) {
      clearLocalCard();
    }

    const vibeType = sessionStorage.getItem("quizVibeType");
    if (vibeType !== null) {
      const idx = parseInt(vibeType) as VibeTypeIndex;
      const personaName =
        sessionStorage.getItem("personaName") ?? generatePersonaName();
      const isAnchored = sessionStorage.getItem("isAnchored") === "true";
      const owner = sessionStorage.getItem("walletAddress") ?? "unanchored";

      // Try to load the full privacy profile written by the quiz page
      let privacyProfile: import("@/lib/types").PrivacyProfile | undefined;
      const rawProfile = sessionStorage.getItem("quizPrivacyProfile");
      if (rawProfile) {
        try { privacyProfile = JSON.parse(rawProfile); } catch { /* ignore */ }
      }

      // Publicly visible first trait: use identity label if available
      const firstTrait = privacyProfile?.identityLabel ?? VIBE_TYPES[idx]?.traits[0] ?? "unknown";

      const newCard: CardData = {
        id: `session-${Date.now()}`,
        owner,
        commitment: "0x0",
        revealedType: idx,
        paletteRevealed: true,
        mintTimestamp: Date.now(),
        personaName,
        isAnchored,
        battleRecord: { wins: 0, losses: 0, total: 0 },
        traitReveal: {
          barFillsAccurate: false,
          paletteRevealed: true,  // colour visible from creation
          typeRevealed: false,    // name stays hidden
          lossCount: 0,
          trait1Word: firstTrait, // identity dimension publicly shown
        },
        recentBattles: [],
        privacyProfile,
      };
      setCard(newCard);
      saveCardLocally(newCard);
      startAnimation();
      return;
    }
  }, []);

  // ── Privacy scan result → build card ────────────────────────────────────
  useEffect(() => {
    if (!scanProfile || scanVibeType === null) return;

    // Detect wallets with no on-chain activity — all scores zero, no transactions
    const allZero =
      scanProfile.identityLeakage === 0 &&
      scanProfile.geographicSignal === 0 &&
      scanProfile.financialProfile === 0 &&
      scanProfile.behavioralFingerprint === 0 &&
      (scanProfile.totalTransactions ?? 0) === 0;

    if (allZero) {
      setNoActivityFound(true);
      // Stay in scanning view to show the no-activity message
      return;
    }

    const personaName =
      scanProfile.ensName ??
      sessionStorage.getItem("personaName") ??
      generatePersonaName();
    const owner = address ?? scanProfile.scannedAddress;

    const newCard: CardData = {
      id: `scan-${Date.now()}`,
      owner,
      commitment: "0x0",
      revealedType: scanVibeType,
      paletteRevealed: true,
      mintTimestamp: Date.now(),
      personaName,
      isAnchored: false,
      battleRecord: { wins: 0, losses: 0, total: 0 },
      traitReveal: {
        barFillsAccurate: false,
        paletteRevealed: true,               // colour visible from creation
        typeRevealed: false,                  // name stays hidden
        lossCount: 0,
        trait1Word: scanProfile.identityLabel, // identity is the publicly shown trait
        // trait2Word, trait3 stay hidden until battle losses reveal them
      },
      recentBattles: [],
      privacyProfile: scanProfile,
    };

    freshScanCardRef.current = true;  // must be before setCard (sync, not stale)
    setCard(newCard);
    saveCardLocally(newCard);
    sessionStorage.setItem("privacyScanDone", "1");
    setShowingScan(false);
    startAnimation();
  }, [scanProfile, scanVibeType]);

  // ── Onchain card loads ───────────────────────────────────────────────────
  useEffect(() => {
    console.log("[reveal] onchainCard updated:", onchainCard ? { id: onchainCard.id, tokenId: onchainCard.tokenId, isAnchored: onchainCard.isAnchored } : null);
    if (!onchainCard) return;

    // If a fresh scan card was built this session (ref is sync — never stale),
    // the onchain card must NOT override it. Store it as existingCard only.
    if (freshScanCardRef.current) {
      setExistingCard(onchainCard);
      return;
    }

    const freshFromQuiz = !!sessionStorage.getItem("quizVibeType");
    const freshFromScan = !!sessionStorage.getItem("privacyScanDone");
    const freshSession = freshFromQuiz || freshFromScan;

    if (freshSession && !card) {
      // Fresh session but no card built yet — use the onchain card
      setCard(onchainCard);
      setStep("actions");
      animationStarted.current = true;
    } else if (!freshSession) {
      // Returning user — show their onchain card directly
      setCard(onchainCard);
      setStep("actions");
      animationStarted.current = true;
    }
  }, [onchainCard]);

  // ── Clear existingCard when a different address connects ───────────────
  useEffect(() => {
    if (!existingCard) return;
    if (!address) {
      // No wallet connected — clear the existing card hint
      setExistingCard(null);
      return;
    }
    if (existingCard.owner.toLowerCase() !== address.toLowerCase()) {
      // Different account connected — this card belongs to someone else
      setExistingCard(null);
      clearLocalCard();
    }
  }, [address, existingCard]);

  // ── Wallet connects mid-flow ─────────────────────────────────────────────
  useEffect(() => {
    if (!address || !card || card.isAnchored || onchainCard) return;
    updateLocalCard({ owner: address });
    setCard((c) => (c ? { ...c, owner: address } : c));
    if (!scanInputAddress) setScanInputAddress(address);
  }, [address]);

  // ── Mint handler ─────────────────────────────────────────────────────────
  // Step 1: clicking Mint always shows the faucet modal first.
  // Users with funds dismiss it and proceed; users without funds use the link.
  function handleLockIn() {
    console.log('[handleLockIn] clicked', { address, revealedType: card?.revealedType });
    if (!address) {
      setShowConnectModal(true);
      return;
    }
    if (card?.revealedType === undefined) {
      console.warn('[handleLockIn] no revealedType — aborting');
      return;
    }
    setShowFaucetModal(true);
  }

  // Step 2: "Got it" in the faucet modal fires the actual Cartridge transaction.
  async function doMint() {
    console.log('[doMint] fired', { address, revealedType: card?.revealedType });
    if (!address || card?.revealedType === undefined) return;
    // Always generate a fresh name at mint time — never use the locally cached name
    // which may have been built with an old algorithm or stale session data.
    const result = await mint(card.revealedType as VibeTypeIndex);
    // Only mark as anchored if the transaction was actually submitted
    if (result) {
      setCard((c) => (c ? { ...c, isAnchored: true, owner: address } : c));
    }
  }

  // ── Proceed as Ghost when wallet has no activity ─────────────────────────
  function handleProceedAsGhost() {
    if (!scanProfile || scanVibeType === null) return;
    const personaName = scanProfile.ensName ?? generatePersonaName();
    const owner = address ?? scanProfile.scannedAddress;
    const newCard: CardData = {
      id: `scan-${Date.now()}`,
      owner,
      commitment: "0x0",
      revealedType: scanVibeType,
      paletteRevealed: true,
      mintTimestamp: Date.now(),
      personaName,
      isAnchored: false,
      battleRecord: { wins: 0, losses: 0, total: 0 },
      traitReveal: {
        barFillsAccurate: false,
        paletteRevealed: true,
        typeRevealed: false,
        lossCount: 0,
        trait1Word: scanProfile.identityLabel,
      },
      recentBattles: [],
      privacyProfile: scanProfile,
    };
    freshScanCardRef.current = true;
    setCard(newCard);
    saveCardLocally(newCard);
    sessionStorage.setItem("privacyScanDone", "1");
    setNoActivityFound(false);
    setShowingScan(false);
    startAnimation();
  }

  // ── Start privacy scan ───────────────────────────────────────────────────
  function handleStartScan() {
    const target = scanInputAddress.trim();
    if (!target) return;
    setShowingScan(true);
    scan(target);
  }

  // ── No card yet — show options or scanning ───────────────────────────────
  if (!card) {
    return (
      <div className="min-h-screen bg-[#080810] flex flex-col items-center justify-center px-6 py-12">
        <ConnectModal
          open={showConnectModal}
          onClose={() => setShowConnectModal(false)}
        />

        <AnimatePresence mode="wait">
          {/* ── Scanning in progress ───────────────────────────────────── */}
          {showingScan && (
            <motion.div
              key="scanning"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="w-full max-w-sm flex flex-col gap-6"
            >
              <div className="text-center">
                <motion.div
                  className="w-10 h-10 rounded-full mx-auto mb-4"
                  style={{ background: "rgba(127,119,221,0.3)" }}
                  animate={{ scale: [1, 1.4, 1], opacity: [0.5, 1, 0.5] }}
                  transition={{ duration: 1.2, repeat: Infinity }}
                />
                <p className="font-card text-white text-base mb-1">
                  {scanning
                    ? "Reading wallet history…"
                    : unsupportedChain
                    ? "Chain not supported"
                    : scanError
                    ? "Scan failed"
                    : "Scan complete"}
                </p>
                <p className="text-white/30 text-xs font-ui font-mono truncate max-w-[260px] mx-auto">
                  {scanInputAddress.slice(0, 12)}…{scanInputAddress.slice(-8)}
                </p>
              </div>

              {unsupportedChain && (
                <div className="flex flex-col gap-3 text-center">
                  <div
                    className="p-3 rounded-xl text-xs font-ui"
                    style={{
                      background: "rgba(255,180,0,0.08)",
                      border: "1px solid rgba(255,180,0,0.2)",
                      color: "rgba(255,200,80,0.9)",
                    }}
                  >
                    <p className="font-medium mb-1">Starknet not supported yet</p>
                    <p className="text-white/40">
                      The scanner supports EVM, Bitcoin, and Solana addresses.
                      Use your EVM wallet address, or take the quiz instead.
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <motion.button
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => { resetScan(); setShowingScan(false); }}
                      className="min-touch flex-1 p-3 rounded-xl font-card text-sm text-white/60 text-center"
                      style={{ border: "1px solid rgba(255,255,255,0.1)" }}
                    >
                      ← Try another
                    </motion.button>
                    <Link
                      href="/quiz"
                      className="min-touch flex-1 p-3 rounded-xl font-card text-sm text-center"
                      style={{
                        background: "rgba(212,83,126,0.12)",
                        border: "1px solid rgba(212,83,126,0.25)",
                        color: "rgba(212,83,126,0.9)",
                      }}
                    >
                      Take the quiz ✨
                    </Link>
                  </div>
                </div>
              )}

              {noActivityFound && (
                <motion.div
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex flex-col gap-3"
                >
                  <div
                    className="p-4 rounded-xl text-center"
                    style={{
                      background: "rgba(255,255,255,0.04)",
                      border: "1px solid rgba(255,255,255,0.1)",
                    }}
                  >
                    <p className="font-card text-white/80 font-medium mb-1">🫥 No on-chain activity found</p>
                    <p className="text-white/40 text-xs font-ui mt-1">
                      This wallet has no transaction history, so all privacy scores are 0.
                      Try a different wallet, take the quiz, or proceed as a Ghost.
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <motion.button
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => { setNoActivityFound(false); resetScan(); setShowingScan(false); }}
                      className="min-touch flex-1 p-3 rounded-xl font-card text-sm text-white/60 text-center"
                      style={{ border: "1px solid rgba(255,255,255,0.1)" }}
                    >
                      ← Try another
                    </motion.button>
                    <Link
                      href="/quiz"
                      className="min-touch flex-1 p-3 rounded-xl font-card text-sm text-center"
                      style={{
                        background: "rgba(212,83,126,0.12)",
                        border: "1px solid rgba(212,83,126,0.25)",
                        color: "rgba(212,83,126,0.9)",
                      }}
                    >
                      Take the quiz ✨
                    </Link>
                  </div>
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={handleProceedAsGhost}
                    className="min-touch w-full p-3 rounded-xl font-card text-sm text-white/40 text-center"
                    style={{ border: "1px solid rgba(255,255,255,0.07)" }}
                  >
                    I'm a Ghost — proceed anyway
                  </motion.button>
                </motion.div>
              )}

              {scanError && (
                <div className="flex flex-col gap-3">
                  <p className="text-red-400 text-xs font-ui text-center">
                    {scanError}
                  </p>
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => {
                      resetScan();
                      setShowingScan(false);
                    }}
                    className="min-touch w-full p-3 rounded-xl font-card text-sm text-white/60 text-center"
                    style={{ border: "1px solid rgba(255,255,255,0.1)" }}
                  >
                    ← Go back
                  </motion.button>
                </div>
              )}

              {scanning && (
                <button
                  onClick={() => {
                    resetScan();
                    setNoActivityFound(false);
                    setShowingScan(false);
                  }}
                  className="text-white/20 text-xs font-ui text-center hover:text-white/40 transition-colors"
                >
                  Cancel
                </button>
              )}
            </motion.div>
          )}

          {/* ── Options view ───────────────────────────────────────────── */}
          {!showingScan && (
            <motion.div
              key="options"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="w-full max-w-sm flex flex-col gap-4"
            >
              {address && onchainLoading ? (
                <div className="flex flex-col items-center gap-4 py-8">
                  <motion.div
                    className="w-10 h-10 rounded-full bg-violet-500/30"
                    animate={{ scale: [1, 1.5, 1], opacity: [0.5, 1, 0.5] }}
                    transition={{ duration: 1, repeat: Infinity }}
                  />
                  <p className="text-white/30 font-card text-sm tracking-widest uppercase">
                    Looking up your card…
                  </p>
                </div>
              ) : onchainCard && address?.toLowerCase() !== "0x06103a29315c29c70c19064386d898cb37c7a634442a825b14f96a5215f9e702" ? (
                /* ── Already minted — surface the existing card ─────── */
                <motion.div
                  key="already-minted"
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="w-full max-w-sm flex flex-col gap-4 text-center"
                >
                  <div
                    className="p-5 rounded-2xl flex flex-col gap-3"
                    style={{ background: "rgba(34,197,94,0.06)", border: "1px solid rgba(34,197,94,0.2)" }}
                  >
                    <span className="text-3xl">✅</span>
                    <p className="font-card text-white font-medium">You already have a card</p>
                    <p className="text-white/40 text-sm font-ui">
                      <strong className="text-white/70">{onchainCard.personaName}</strong> is sealed onchain. One card per wallet.
                    </p>
                  </div>
                  <button
                    onClick={() => { setCard(onchainCard); setStep("actions"); animationStarted.current = true; }}
                    className="w-full py-3 rounded-xl font-card text-sm text-white hover:scale-105 transition-all"
                    style={{ background: "rgba(127,119,221,0.15)", border: "1px solid rgba(127,119,221,0.3)" }}
                  >
                    View my card →
                  </button>
                </motion.div>
              ) : (
                <>
                  {/* ── Option A: Scan any wallet ─────────────────────── */}
                  <div
                    className="p-4 rounded-2xl flex flex-col gap-3"
                    style={{
                      background: "rgba(127,119,221,0.07)",
                      border: "1px solid rgba(127,119,221,0.22)",
                    }}
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">🔍</span>
                      <div>
                        <p className="font-card font-medium text-white text-sm">
                          Analyze wallet history
                        </p>
                        <p className="text-white/40 text-xs font-ui mt-0.5">
                          EVM · Bitcoin · Solana · ENS names accepted
                        </p>
                      </div>
                    </div>

                    {/* Address input */}
                    <input
                      type="text"
                      value={scanInputAddress}
                      onChange={(e) => setScanInputAddress(e.target.value)}
                      placeholder="0x… or name.eth or Solana address"
                      className="w-full px-3 py-2.5 rounded-xl text-xs font-mono text-white/80 outline-none transition-colors"
                      style={{
                        background: "rgba(255,255,255,0.05)",
                        border: "1px solid rgba(255,255,255,0.1)",
                        caretColor: "#a78bfa",
                      }}
                      onFocus={(e) =>
                        (e.target.style.borderColor = "rgba(127,119,221,0.5)")
                      }
                      onBlur={(e) =>
                        (e.target.style.borderColor = "rgba(255,255,255,0.1)")
                      }
                    />

                    <motion.button
                      whileHover={{ scale: scanInputAddress.trim() ? 1.02 : 1 }}
                      whileTap={{ scale: scanInputAddress.trim() ? 0.97 : 1 }}
                      onClick={handleStartScan}
                      disabled={!scanInputAddress.trim()}
                      className="w-full py-2.5 rounded-xl font-card text-sm font-medium transition-all disabled:opacity-40"
                      style={{
                        background: "linear-gradient(135deg, #a78bfa, #7F77DD)",
                        color: "#080810",
                      }}
                    >
                      Scan this wallet →
                    </motion.button>

                    {!address && (
                      <p className="text-[10px] text-white/25 font-ui text-center">
                        You can scan any wallet.{" "}
                        <button
                          onClick={() => setShowConnectModal(true)}
                          className="text-violet-400/70 hover:text-violet-400 underline underline-offset-2 transition-colors"
                        >
                          Connect Starknet wallet
                        </button>{" "}
                        to mint your card onchain.
                      </p>
                    )}
                  </div>

                  {/* ── Option B: Take quiz ───────────────────────────── */}
                  <Link href="/quiz">
                    <motion.div
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      className="min-touch w-full p-4 rounded-2xl text-left flex items-center gap-4 cursor-pointer"
                      style={{
                        background: "rgba(212,83,126,0.06)",
                        border: "1px solid rgba(212,83,126,0.2)",
                      }}
                    >
                      <span className="text-2xl">✨</span>
                      <div>
                        <p className="font-card font-medium text-white text-sm">
                          Take the quiz instead
                        </p>
                        <p className="text-white/40 text-xs font-ui mt-0.5">
                          5 questions · answer-based Vibe · seal onchain anytime
                        </p>
                      </div>
                    </motion.div>
                  </Link>

                  {/* ── Option C: Retrieve existing card ─────────────── */}
                  {!address && (
                    <motion.button
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => setShowConnectModal(true)}
                      className="min-touch w-full p-4 rounded-2xl text-left flex items-center gap-4"
                      style={{
                        background: "rgba(255,255,255,0.03)",
                        border: "1px solid rgba(255,255,255,0.08)",
                      }}
                    >
                      <span className="text-2xl">🔗</span>
                      <div>
                        <p className="font-card font-medium text-white text-sm">
                          Connect Starknet wallet
                        </p>
                        <p className="text-white/40 text-xs font-ui mt-0.5">
                          Retrieve an existing minted card from Sepolia
                        </p>
                      </div>
                    </motion.button>
                  )}
                </>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    );
  }

  // ── Card exists — show reveal animation + actions ─────────────────────────

  const cardUrl =
    typeof window !== "undefined"
      ? `${window.location.origin}/card/${myTokenId ?? card.tokenId ?? card.id}`
      : "";

  const hasPrivacy = !!card.privacyProfile;

  return (
    <div className="min-h-screen bg-[#080810] flex flex-col items-center justify-center px-6 py-12">
      <ConnectModal
        open={showConnectModal}
        onClose={() => setShowConnectModal(false)}
      />

      {showFaucetModal && address && (
        <FaucetModal address={address} onClose={() => setShowFaucetModal(false)} onConfirm={doMint} />
      )}

      <AnimatePresence mode="wait">
        {step === "pulse" && (
          <motion.div
            key="pulse"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex flex-col items-center gap-4"
          >
            <motion.div
              className="w-12 h-12 rounded-full bg-violet-500/30"
              animate={{ scale: [1, 1.5, 1], opacity: [0.5, 1, 0.5] }}
              transition={{ duration: 1, repeat: Infinity }}
            />
            <p className="text-white/30 font-card text-sm tracking-widest uppercase">
              {hasPrivacy ? "Sealing your footprint…" : "Sealing your vibe…"}
            </p>
          </motion.div>
        )}

        {step !== "pulse" && (
          <motion.div
            key="card-reveal"
            className="flex flex-col items-center gap-8 w-full max-w-xs"
          >
            <motion.div
              initial={{ opacity: 0, rotateY: 90 }}
              animate={{ opacity: 1, rotateY: 0 }}
              transition={{ duration: 0.8, ease: [0.23, 1, 0.32, 1] }}
              style={{ perspective: 800 }}
            >
              <VibeCard card={card} interactive={true} size="md" />
            </motion.div>

            <AnimatePresence>
              {(step === "text" || step === "actions") && (
                <motion.div
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4 }}
                  className="text-center"
                >
                  <p className="font-card text-xl text-white mb-1">
                    One trait visible.{" "}
                    <span className="text-white/40">The rest? 🔒</span>
                  </p>
                  <p className="text-white/40 text-sm font-ui">
                    {hasPrivacy
                      ? "Your identity hint is public. Battle to protect what's left."
                      : "Your first trait is public. Battle to stay mysterious."}
                  </p>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Privacy score summary */}
            <AnimatePresence>
              {step === "actions" && hasPrivacy && card.privacyProfile && (
                <motion.div
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4, delay: 0.1 }}
                  className="w-full p-4 rounded-2xl flex flex-col gap-3"
                  style={{
                    background: "rgba(127,119,221,0.06)",
                    border: "1px solid rgba(127,119,221,0.15)",
                  }}
                >
                  <p className="text-xs font-card text-white/40 tracking-widest uppercase">
                    Privacy Exposure
                  </p>
                  <ScoreBar
                    label="Identity"
                    score={card.privacyProfile.identityLeakage}
                    color="#a78bfa"
                  />
                  <ScoreBar
                    label="Geographic"
                    score={card.privacyProfile.geographicSignal}
                    color="#7F77DD"
                  />
                  <ScoreBar
                    label="Financial"
                    score={card.privacyProfile.financialProfile}
                    color="#D4537E"
                  />
                  <ScoreBar
                    label="Behavioral"
                    score={card.privacyProfile.behavioralFingerprint}
                    color="#1D9E75"
                  />
                  <p className="text-[10px] font-ui text-white/20 mt-1">
                    These scores are sealed in your card. Opponents uncover them by winning battles.
                  </p>
                </motion.div>
              )}
            </AnimatePresence>

            <AnimatePresence>
              {step === "actions" && (
                <motion.div
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4 }}
                  className="flex flex-col gap-3 w-full"
                >
                  {/* Lock-in CTA */}
                  {!card.isAnchored && (
                    <motion.button
                      onClick={handleLockIn}
                      disabled={minting}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.97 }}
                      className="min-touch flex items-center justify-center gap-2 px-6 py-3 rounded-xl font-card text-sm text-[#080810] font-medium transition-all disabled:opacity-50"
                      style={{
                        background:
                          "linear-gradient(135deg, #a78bfa, #7F77DD)",
                      }}
                    >
                      {minting
                        ? "Minting…"
                        : !address
                        ? "🔗 Connect Starknet wallet to mint"
                        : "⚡ Mint to Starknet"}
                    </motion.button>
                  )}

                  {card.isAnchored && (
                    <div className="flex flex-col items-center gap-1">
                      <div
                        className="flex items-center justify-center gap-2 text-xs font-ui py-1"
                        style={{ color: "#22c55e" }}
                      >
                        <span className="w-1.5 h-1.5 rounded-full bg-green-500" />
                        Sealed onchain · Sepolia
                      </div>
                      {txHash && (
                        <a
                          href={`https://sepolia.voyager.online/tx/${txHash}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs font-ui text-white/30 hover:text-white/60 transition-colors"
                        >
                          View tx on Voyager ↗
                        </a>
                      )}
                    </div>
                  )}

                  {mintError && !card.isAnchored && (
                    <div
                      className="p-3 rounded-xl text-xs font-ui text-center"
                      style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)" }}
                    >
                      <p className="text-red-400 mb-1">{mintError}</p>
                      {(mintError.includes("Sepolia ETH") || mintError.includes("nonce")) && (
                        <a
                          href="https://faucet.starknet.io"
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-violet-400 underline underline-offset-2 hover:text-violet-300 transition-colors"
                        >
                          Get free Sepolia ETH/STRK → faucet.starknet.io
                        </a>
                      )}
                    </div>
                  )}

                  <a
                    href={`https://x.com/intent/tweet?text=${encodeURIComponent(
                      SHARE_TWEET_TEMPLATE(cardUrl)
                    )}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="min-touch flex items-center justify-center gap-2 px-6 py-3 rounded-xl font-card text-sm text-white transition-all hover:scale-105"
                    style={{
                      background: "rgba(255,255,255,0.08)",
                      border: "1px solid rgba(255,255,255,0.12)",
                    }}
                  >
                    𝕏 Share on X
                  </a>

                  <Link
                    href="/leaderboard"
                    className="min-touch flex items-center justify-center gap-2 px-6 py-3 rounded-xl font-card text-sm text-white transition-all hover:scale-105"
                    style={{
                      background: "rgba(127,119,221,0.15)",
                      border: "1px solid rgba(127,119,221,0.3)",
                    }}
                  >
                    ⚔️ Find someone to battle
                  </Link>

                  <Link
                    href={`/card/${myTokenId ?? card.tokenId ?? card.id}`}
                    className="min-touch flex items-center justify-center gap-2 px-6 py-3 rounded-xl font-card text-sm text-white/60 transition-all hover:text-white"
                  >
                    View my card →
                  </Link>

                  {/* Battle history */}
                  {(battleHistory.length > 0 || historyLoading) && (
                    <div
                      className="w-full mt-2 rounded-2xl overflow-hidden"
                      style={{ border: "1px solid rgba(255,255,255,0.07)", background: "rgba(255,255,255,0.02)" }}
                    >
                      <p className="px-4 pt-3 pb-2 text-[10px] font-ui tracking-[0.2em] uppercase text-white/25">
                        Battle History
                      </p>
                      {historyLoading && (
                        <p className="px-4 pb-3 text-xs font-ui text-white/20">Loading…</p>
                      )}
                      {battleHistory.map((b) => (
                        <div
                          key={b.battleId}
                          className="flex items-center justify-between gap-3 px-4 py-2.5 border-t"
                          style={{ borderColor: "rgba(255,255,255,0.05)" }}
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            <span className="text-[10px] font-ui text-white/25 shrink-0">#{b.battleId}</span>
                            <span className="text-xs font-ui text-white/25 shrink-0">
                              {b.role === "challenger" ? "⚔️ vs" : "🛡️ vs"}
                            </span>
                            <Link
                              href={`/card/${b.opponentToken}`}
                              className="text-xs font-card text-white/60 hover:text-white transition-colors truncate"
                            >
                              {b.opponentName}
                            </Link>
                          </div>
                          <div className="shrink-0">
                            {b.won === null ? (
                              <span className="text-[10px] font-ui px-2 py-0.5 rounded-full"
                                style={{ background: "rgba(255,255,255,0.06)", color: "rgba(255,255,255,0.3)" }}>
                                {b.status === 0 ? "pending" : "awaiting resolve"}
                              </span>
                            ) : b.won ? (
                              <span className="text-[10px] font-ui px-2 py-0.5 rounded-full"
                                style={{ background: "rgba(34,197,94,0.12)", color: "#4ade80" }}>
                                W
                              </span>
                            ) : (
                              <span className="text-[10px] font-ui px-2 py-0.5 rounded-full"
                                style={{ background: "rgba(239,68,68,0.12)", color: "#f87171" }}>
                                L
              </span>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Escape hatch — disconnect or start fresh */}
                  <div
                    className="flex items-center justify-center gap-3 pt-2 pb-1"
                    style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }}
                  >
                    <button
                      onClick={() => { clearLocalCard(); setCard(null); resetScan(); setShowingScan(false); }}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-ui transition-all hover:scale-105"
                      style={{
                        background: "rgba(255,255,255,0.04)",
                        border: "1px solid rgba(255,255,255,0.1)",
                        color: "rgba(255,255,255,0.45)",
                      }}
                    >
                      ↺ Scan a different wallet
                    </button>
                    {address && (
                      <button
                        onClick={() => { clearLocalCard(); disconnect(); }}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-ui transition-all hover:scale-105"
                        style={{
                          background: "rgba(239,68,68,0.06)",
                          border: "1px solid rgba(239,68,68,0.18)",
                          color: "rgba(239,68,68,0.6)",
                        }}
                      >
                        Disconnect
                      </button>
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
