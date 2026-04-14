"use client";

/**
 * /seed — batch card minter
 *
 * Lets you scan a list of addresses one by one, review the computed card,
 * and mint each to Starknet with a single click. Useful for seeding the
 * leaderboard before launch.
 *
 * Not linked from the main nav — access directly at /seed.
 */

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useAccount } from "@starknet-react/core";
import { VibeCard } from "@/components/VibeCard";
import { ConnectModal } from "@/components/ConnectModal";
import { usePrivacyScore, ChainScanStatus } from "@/hooks/usePrivacyScore";
import { useMint } from "@/hooks/useMint";
import { CardData, VibeTypeIndex } from "@/lib/types";
import { generatePersonaName } from "@/lib/utils";
import { VIBE_TYPES } from "@/lib/vibeTypes";

// ── Chain pill ─────────────────────────────────────────────────────────────

function ChainPill({ chain }: { chain: ChainScanStatus }) {
  const textColor =
    chain.status === "done"
      ? "rgba(34,197,94,0.9)"
      : chain.status === "scanning"
      ? "rgba(167,139,250,0.9)"
      : chain.status === "no_activity"
      ? "rgba(255,255,255,0.2)"
      : "rgba(255,255,255,0.3)";

  const icon =
    chain.status === "done"
      ? "✓"
      : chain.status === "no_activity"
      ? "–"
      : chain.status === "scanning"
      ? "⟳"
      : "·";

  return (
    <span
      className="px-2 py-0.5 rounded-full text-[10px] font-card"
      style={{
        background: `${textColor}18`,
        border: `1px solid ${textColor}33`,
        color: textColor,
      }}
    >
      <motion.span
        animate={chain.status === "scanning" ? { rotate: 360 } : {}}
        transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
        style={{ display: "inline-block", marginRight: 3 }}
      >
        {icon}
      </motion.span>
      {chain.name}
    </span>
  );
}

// ── Row for each address in the queue ─────────────────────────────────────

type RowState =
  | { phase: "idle" }
  | { phase: "scanning" }
  | { phase: "ready"; card: CardData }
  | { phase: "minting" }
  | { phase: "done"; txHash: string }
  | { phase: "error"; msg: string };

// ── Main page ──────────────────────────────────────────────────────────────

export default function SeedPage() {
  const { address } = useAccount();
  const [showConnect, setShowConnect] = useState(false);

  // Address queue
  const [rawInput, setRawInput] = useState("");
  const [queue, setQueue] = useState<string[]>([]);
  const [cursor, setCursor] = useState(0); // which address is active
  const [rowStates, setRowStates] = useState<Record<number, RowState>>({});

  // One shared scan hook — runs sequentially
  const { scanning, chainStatuses, profile, vibeType, error: scanError, scan, reset } =
    usePrivacyScore();
  const { mint, minting, txHash: lastTxHash, error: mintError } = useMint();

  function setRow(i: number, state: RowState) {
    setRowStates((prev) => ({ ...prev, [i]: state }));
  }

  // ── Add addresses from textarea ──────────────────────────────────────────
  function handleAdd() {
    const lines = rawInput
      .split(/[\n,]+/)
      .map((s) => s.trim())
      .filter(Boolean);
    if (!lines.length) return;
    const base = queue.length;
    setQueue((q) => [...q, ...lines]);
    const init: Record<number, RowState> = {};
    lines.forEach((_, i) => (init[base + i] = { phase: "idle" }));
    setRowStates((prev) => ({ ...prev, ...init }));
    setRawInput("");
  }

  // ── Scan the address at index i ──────────────────────────────────────────
  async function handleScan(i: number) {
    reset();
    setRow(i, { phase: "scanning" });
    await scan(queue[i]);
  }

  // When scan completes, profile & vibeType are set — build the card
  // We watch these in a useEffect inside the row, but for simplicity we
  // trigger card building via the "Review" button press after scanning completes.
  function buildCard(i: number): CardData | null {
    if (!profile || vibeType === null) return null;
    const personaName = profile.ensName ?? generatePersonaName();
    return {
      id: `seed-${i}-${Date.now()}`,
      owner: address ?? queue[i],
      commitment: "0x0",
      revealedType: vibeType as VibeTypeIndex,
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
        trait1Word: profile.identityLabel,
      },
      recentBattles: [],
      privacyProfile: profile,
    };
  }

  function handleReviewReady(i: number) {
    const card = buildCard(i);
    if (!card) return;
    setRow(i, { phase: "ready", card });
  }

  async function handleMint(i: number, card: CardData) {
    if (!address) { setShowConnect(true); return; }
    if (card.revealedType === undefined) return;
    setRow(i, { phase: "minting" });
    await mint(card.revealedType as VibeTypeIndex, card.personaName);
    if (mintError) {
      setRow(i, { phase: "error", msg: mintError });
    } else {
      setRow(i, { phase: "done", txHash: lastTxHash ?? "" });
      // Advance cursor
      setCursor(i + 1);
    }
  }

  const rowState = (i: number): RowState => rowStates[i] ?? { phase: "idle" };
  const activeScan = Object.values(rowStates).some((r) => r.phase === "scanning");

  return (
    <div className="min-h-screen bg-[#080810] px-6 py-12">
      <ConnectModal open={showConnect} onClose={() => setShowConnect(false)} />

      <div className="max-w-3xl mx-auto">
        {/* Header */}
        <div className="mb-10">
          <p className="text-[11px] font-card tracking-[0.3em] text-white/20 uppercase mb-1">
            Dev tool
          </p>
          <h1 className="font-card text-3xl font-medium text-white mb-2">
            Seed the leaderboard
          </h1>
          <p className="text-white/40 text-sm font-ui">
            Scan a batch of addresses, review their computed cards, and mint
            them to Starknet Sepolia one by one. You&apos;ll sign each mint
            transaction with your connected wallet.
          </p>
        </div>

        {/* Wallet status */}
        <div className="mb-8 flex items-center gap-3">
          {address ? (
            <div className="flex items-center gap-2 text-xs font-ui">
              <span className="w-1.5 h-1.5 rounded-full bg-green-400" />
              <span className="text-white/60 font-mono">
                {address.slice(0, 10)}…{address.slice(-8)}
              </span>
              <span className="text-green-400">connected</span>
            </div>
          ) : (
            <button
              onClick={() => setShowConnect(true)}
              className="text-xs font-card text-violet-400 underline underline-offset-2"
            >
              Connect wallet to mint →
            </button>
          )}
        </div>

        {/* Address input */}
        <div
          className="p-5 rounded-2xl mb-8"
          style={{
            background: "rgba(255,255,255,0.03)",
            border: "1px solid rgba(255,255,255,0.08)",
          }}
        >
          <p className="text-xs font-card text-white/50 mb-3 uppercase tracking-widest">
            Add addresses
          </p>
          <textarea
            value={rawInput}
            onChange={(e) => setRawInput(e.target.value)}
            placeholder={"0x1234… or name.eth\n0x5678…\nAnotherAddress.eth"}
            rows={4}
            className="w-full bg-transparent text-xs font-mono text-white/70 resize-none outline-none placeholder:text-white/20"
            style={{ borderBottom: "1px solid rgba(255,255,255,0.08)" }}
          />
          <div className="flex items-center justify-between mt-3">
            <p className="text-[10px] text-white/20 font-ui">
              One per line, or comma-separated. EVM, ENS, Starknet, Solana all
              accepted.
            </p>
            <motion.button
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              onClick={handleAdd}
              disabled={!rawInput.trim()}
              className="px-4 py-1.5 rounded-lg font-card text-xs font-medium disabled:opacity-30 transition-all"
              style={{
                background: "rgba(127,119,221,0.2)",
                border: "1px solid rgba(127,119,221,0.4)",
                color: "#a78bfa",
              }}
            >
              Add to queue →
            </motion.button>
          </div>
        </div>

        {/* Queue */}
        {queue.length > 0 && (
          <div className="flex flex-col gap-4">
            {queue.map((addr, i) => {
              const rs = rowState(i);
              const isActive = cursor === i;
              const vt =
                rs.phase === "ready" && rs.card.revealedType !== undefined
                  ? VIBE_TYPES[rs.card.revealedType]
                  : null;

              return (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.04 }}
                  className="rounded-2xl overflow-hidden"
                  style={{
                    background:
                      rs.phase === "done"
                        ? "rgba(34,197,94,0.05)"
                        : isActive
                        ? "rgba(127,119,221,0.07)"
                        : "rgba(255,255,255,0.02)",
                    border:
                      rs.phase === "done"
                        ? "1px solid rgba(34,197,94,0.2)"
                        : isActive
                        ? "1px solid rgba(127,119,221,0.25)"
                        : "1px solid rgba(255,255,255,0.06)",
                  }}
                >
                  {/* Row header */}
                  <div className="flex items-center gap-3 px-5 py-3">
                    <span className="text-xs font-card text-white/20 w-4 shrink-0">
                      {i + 1}
                    </span>
                    <p className="flex-1 text-xs font-mono text-white/60 truncate">
                      {addr}
                    </p>
                    <span
                      className="text-[10px] font-card px-2 py-0.5 rounded-full uppercase tracking-wider"
                      style={{
                        background:
                          rs.phase === "done"
                            ? "rgba(34,197,94,0.12)"
                            : rs.phase === "error"
                            ? "rgba(239,68,68,0.12)"
                            : rs.phase === "minting"
                            ? "rgba(251,191,36,0.12)"
                            : rs.phase === "ready"
                            ? "rgba(127,119,221,0.15)"
                            : rs.phase === "scanning"
                            ? "rgba(167,139,250,0.12)"
                            : "rgba(255,255,255,0.06)",
                        color:
                          rs.phase === "done"
                            ? "#22c55e"
                            : rs.phase === "error"
                            ? "#ef4444"
                            : rs.phase === "minting"
                            ? "#fbbf24"
                            : rs.phase === "ready"
                            ? "#a78bfa"
                            : rs.phase === "scanning"
                            ? "#c4b5fd"
                            : "rgba(255,255,255,0.3)",
                      }}
                    >
                      {rs.phase === "done"
                        ? "✓ minted"
                        : rs.phase === "error"
                        ? "⚠ error"
                        : rs.phase === "minting"
                        ? "signing…"
                        : rs.phase === "ready"
                        ? "ready to mint"
                        : rs.phase === "scanning"
                        ? "scanning…"
                        : "idle"}
                    </span>
                  </div>

                  <AnimatePresence>
                    {/* Scanning: show chain pills */}
                    {rs.phase === "scanning" && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="px-5 pb-4 flex flex-wrap gap-1.5"
                      >
                        {chainStatuses.map((c) => (
                          <ChainPill key={c.chainId} chain={c} />
                        ))}
                        {/* If scan finished but profile ready, show review button */}
                        {!scanning && profile && (
                          <button
                            onClick={() => handleReviewReady(i)}
                            className="ml-2 text-xs font-card text-violet-400 underline underline-offset-2"
                          >
                            Review card →
                          </button>
                        )}
                      </motion.div>
                    )}

                    {/* Ready: show mini card preview + mint button */}
                    {rs.phase === "ready" && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="px-5 pb-5 flex flex-col sm:flex-row gap-5 items-start"
                      >
                        <div className="shrink-0">
                          <VibeCard
                            card={rs.card}
                            interactive={false}
                            size="sm"
                          />
                        </div>
                        <div className="flex flex-col gap-3 pt-1 flex-1">
                          <div>
                            <p className="font-card text-base text-white">
                              {rs.card.personaName}
                            </p>
                            {vt && (
                              <p
                                className="text-xs font-card mt-0.5"
                                style={{ color: vt.primary }}
                              >
                                {vt.name} (hidden)
                              </p>
                            )}
                          </div>
                          {rs.card.privacyProfile && (
                            <div className="flex flex-col gap-1 text-[11px] font-ui text-white/40">
                              <span>
                                Identity: {rs.card.privacyProfile.identityLeakage}
                              </span>
                              <span>
                                Geographic:{" "}
                                {rs.card.privacyProfile.geographicSignal}
                              </span>
                              <span>
                                Financial:{" "}
                                {rs.card.privacyProfile.financialProfile}
                              </span>
                              <span>
                                Behavioral:{" "}
                                {rs.card.privacyProfile.behavioralFingerprint}
                              </span>
                            </div>
                          )}
                          <motion.button
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.97 }}
                            onClick={() => handleMint(i, rs.card)}
                            disabled={minting || !address}
                            className="self-start px-5 py-2.5 rounded-xl font-card text-sm font-medium transition-all disabled:opacity-40"
                            style={{
                              background:
                                "linear-gradient(135deg, #a78bfa, #7F77DD)",
                              color: "#080810",
                            }}
                          >
                            {minting ? "Waiting for signature…" : "⚡ Mint this card"}
                          </motion.button>
                          {mintError && (
                            <p className="text-xs text-red-400">{mintError}</p>
                          )}
                        </div>
                      </motion.div>
                    )}

                    {/* Done */}
                    {rs.phase === "done" && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        className="px-5 pb-3 flex items-center gap-3"
                      >
                        <span className="text-green-400 text-xs font-ui">
                          ✓ Minted onchain
                        </span>
                        {rs.txHash && (
                          <a
                            href={`https://sepolia.voyager.online/tx/${rs.txHash}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs font-ui text-white/30 hover:text-white/60 transition-colors"
                          >
                            View tx ↗
                          </a>
                        )}
                      </motion.div>
                    )}

                    {/* Error */}
                    {rs.phase === "error" && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        className="px-5 pb-3"
                      >
                        <p className="text-xs text-red-400">{rs.msg}</p>
                      </motion.div>
                    )}

                    {/* Idle: scan button only for the cursor row */}
                    {rs.phase === "idle" && isActive && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        className="px-5 pb-4"
                      >
                        <motion.button
                          whileHover={{ scale: 1.02 }}
                          whileTap={{ scale: 0.97 }}
                          onClick={() => handleScan(i)}
                          disabled={activeScan}
                          className="px-4 py-2 rounded-xl font-card text-xs font-medium transition-all disabled:opacity-30"
                          style={{
                            background: "rgba(127,119,221,0.12)",
                            border: "1px solid rgba(127,119,221,0.3)",
                            color: "#a78bfa",
                          }}
                        >
                          🔍 Scan this address
                        </motion.button>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              );
            })}
          </div>
        )}

        {queue.length === 0 && (
          <div className="text-center py-16 text-white/20 font-ui text-sm">
            Add some addresses above to get started.
          </div>
        )}
      </div>
    </div>
  );
}
