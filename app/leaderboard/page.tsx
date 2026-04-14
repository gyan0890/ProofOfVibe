"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { VIBE_TYPES } from "@/lib/vibeTypes";
import { VibeCard } from "@/components/VibeCard";
import { useOnchainCards } from "@/hooks/useOnchainCards";
import { CardData } from "@/lib/types";
import { revealPercent } from "@/lib/utils";

// ── Card row (only shown when real onchain cards exist) ────────────────────

function CardRow({ card, rank }: { card: CardData; rank: number }) {
  const primaryColor =
    card.traitReveal.paletteRevealed && card.revealedType !== undefined
      ? VIBE_TYPES[card.revealedType].primary
      : "#888780";
  const isTop3 = rank <= 3;

  return (
    <motion.div
      initial={{ opacity: 0, x: -12 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: rank * 0.05 }}
      className="flex items-center gap-4 px-4 py-3 rounded-xl transition-colors hover:bg-white/3"
      style={{
        background: isTop3 ? `${primaryColor}08` : "rgba(255,255,255,0.02)",
        border: isTop3
          ? `1px solid ${primaryColor}22`
          : "1px solid rgba(255,255,255,0.05)",
      }}
    >
      <span className="text-sm font-card text-white/30 w-5 text-center shrink-0">
        {rank}
      </span>
      {/* Mini card thumbnail */}
      <div className="w-10 h-14 rounded-lg overflow-hidden shrink-0 relative">
        <div className="absolute inset-0 scale-[0.31] origin-top-left pointer-events-none">
          <VibeCard card={card} interactive={false} size="sm" />
        </div>
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-card text-white truncate">{card.personaName}</p>
        <p className="text-xs text-white/30 font-ui mt-0.5">
          {revealPercent(card.traitReveal.lossCount)}% revealed ·{" "}
          {card.battleRecord.total} battles
        </p>
      </div>
      <div className="text-right shrink-0">
        <p className="text-sm font-card text-white/60">
          {card.battleRecord.wins}W · {card.battleRecord.losses}L
        </p>
      </div>
    </motion.div>
  );
}

// ── Coming Soon state ──────────────────────────────────────────────────────

function ComingSoon({ loading }: { loading: boolean }) {
  return (
    <div className="flex flex-col items-center gap-10 py-16 text-center">
      {/* Animated orbs placeholder */}
      <div className="relative w-48 h-48">
        {[
          { color: "#7F77DD", delay: 0,   x: 0,   y: -60, size: 44 },
          { color: "#D4537E", delay: 0.4, x: 52,  y: 20,  size: 36 },
          { color: "#1D9E75", delay: 0.8, x: -52, y: 20,  size: 36 },
          { color: "#BA7517", delay: 1.2, x: 28,  y: 56,  size: 28 },
          { color: "#185FA5", delay: 0.2, x: -28, y: 56,  size: 28 },
        ].map((orb, i) => (
          <motion.div
            key={i}
            className="absolute rounded-full"
            style={{
              width: orb.size,
              height: orb.size,
              background: `radial-gradient(circle at 35% 35%, ${orb.color}CC, ${orb.color}44)`,
              left: "50%",
              top: "50%",
              marginLeft: -orb.size / 2,
              marginTop: -orb.size / 2,
              x: orb.x,
              y: orb.y,
            }}
            animate={{
              scale: loading ? [1, 1.15, 1] : [1, 1.08, 1],
              opacity: loading ? [0.4, 0.9, 0.4] : [0.6, 1, 0.6],
            }}
            transition={{
              duration: 2.4,
              repeat: Infinity,
              delay: orb.delay,
              ease: "easeInOut",
            }}
          />
        ))}
        {/* Centre glow */}
        <motion.div
          className="absolute rounded-full"
          style={{
            width: 20,
            height: 20,
            background: "rgba(255,255,255,0.15)",
            left: "50%",
            top: "50%",
            marginLeft: -10,
            marginTop: -10,
          }}
          animate={{ scale: [1, 1.6, 1], opacity: [0.3, 0.8, 0.3] }}
          transition={{ duration: 1.8, repeat: Infinity, ease: "easeInOut" }}
        />
      </div>

      <div className="flex flex-col gap-3">
        <p className="text-[11px] font-card tracking-[0.3em] text-white/30 uppercase">
          Season 01
        </p>
        <h2 className="font-card text-3xl font-medium text-white">
          {loading ? "Scanning the chain…" : "The arena is filling up"}
        </h2>
        <p className="text-white/40 text-sm font-ui max-w-xs mx-auto leading-relaxed">
          {loading
            ? "Checking Sepolia for sealed cards…"
            : "No battles have been fought yet. Mint your card and be the first to enter."}
        </p>
      </div>

      {!loading && (
        <div className="flex flex-col sm:flex-row gap-3">
          <Link
            href="/reveal"
            className="min-touch px-6 py-3 rounded-xl font-card text-sm text-[#080810] font-medium transition-all hover:scale-105"
            style={{ background: "linear-gradient(135deg, #a78bfa, #7F77DD)" }}
          >
            ⚡ Mint your card
          </Link>
          <Link
            href="/onboard"
            className="min-touch px-6 py-3 rounded-xl font-card text-sm text-white transition-all hover:scale-105"
            style={{
              background: "rgba(255,255,255,0.06)",
              border: "1px solid rgba(255,255,255,0.12)",
            }}
          >
            ← Back to start
          </Link>
        </div>
      )}

      {/* Vibe type legend */}
      {!loading && (
        <div className="flex flex-wrap gap-2 justify-center max-w-sm">
          {VIBE_TYPES.map((t) => (
            <div
              key={t.index}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-card"
              style={{
                background: `${t.primary}12`,
                border: `1px solid ${t.primary}33`,
                color: t.primary,
              }}
            >
              <span
                className="w-1.5 h-1.5 rounded-full"
                style={{ background: t.primary }}
              />
              {t.name}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Page ───────────────────────────────────────────────────────────────────

export default function LeaderboardPage() {
  const { cards, loading } = useOnchainCards(50);

  const sorted = [...cards].sort(
    (a, b) => b.battleRecord.total - a.battleRecord.total
  );

  return (
    <div className="min-h-screen bg-[#080810] px-6 py-12">
      <div className="max-w-2xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div>
            <Link
              href="/"
              className="text-white/30 hover:text-white/60 transition-colors text-sm font-ui mb-3 inline-block"
            >
              ← Back
            </Link>
            <p className="text-[11px] font-card tracking-[0.3em] text-white/30 uppercase mb-1">
              Season 01
            </p>
            <h1 className="font-card text-3xl font-medium text-white">
              Leaderboard
            </h1>
          </div>
          <div className="text-right">
            {loading ? (
              <p className="text-xs text-white/30 font-ui">● Syncing…</p>
            ) : cards.length > 0 ? (
              <>
                <p className="text-xs font-card text-white">
                  {cards.length} card{cards.length !== 1 ? "s" : ""}
                </p>
                <p className="text-xs text-green-400 font-ui mt-0.5">
                  ● Live · Sepolia
                </p>
              </>
            ) : (
              <p className="text-xs text-white/20 font-ui">
                ● No cards yet
              </p>
            )}
          </div>
        </div>

        {/* Real cards exist → show ranking */}
        {!loading && cards.length > 0 && (
          <div className="flex flex-col gap-2">
            {sorted.map((card, i) => (
              <Link key={card.id} href={`/card/${card.id}`}>
                <CardRow card={card} rank={i + 1} />
              </Link>
            ))}
          </div>
        )}

        {/* No real cards yet → Coming Soon */}
        {(loading || cards.length === 0) && (
          <ComingSoon loading={loading} />
        )}
      </div>
    </div>
  );
}
