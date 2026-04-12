"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import { VibeCard } from "@/components/VibeCard";
import { LEADERBOARD_MOCK_CARDS, DEMO_CARDS } from "@/demo/mockData";
import { CardData } from "@/lib/types";
import { VIBE_TYPES } from "@/lib/vibeTypes";

export default function CardPage({ params }: { params: { id: string } }) {
  const [card, setCard] = useState<CardData | null>(null);
  const [guessDistribution] = useState(() =>
    VIBE_TYPES.map((t) => ({ type: t, count: Math.floor(Math.random() * 30) }))
  );

  useEffect(() => {
    const found = LEADERBOARD_MOCK_CARDS.find((c) => c.id === params.id);
    if (found) {
      setCard(found);
    } else {
      // fallback: first demo card
      setCard(DEMO_CARDS[0]);
    }
  }, [params.id]);

  if (!card) {
    return (
      <div className="min-h-screen bg-[#080810] flex items-center justify-center">
        <div className="w-[320px] h-[480px] rounded-[20px] animate-shimmer" />
      </div>
    );
  }

  const totalGuesses = guessDistribution.reduce((s, g) => s + g.count, 0) || 1;
  const primaryColor = card.traitReveal.paletteRevealed && card.revealedType !== undefined
    ? VIBE_TYPES[card.revealedType].primary
    : "#888780";

  return (
    <div
      className="min-h-screen flex flex-col"
      style={{
        background: `radial-gradient(ellipse at top, ${primaryColor}0F 0%, #080810 60%)`,
        backgroundColor: "#080810",
      }}
    >
      <div className="max-w-5xl mx-auto w-full px-6 py-12">
        <Link href="/" className="text-white/30 hover:text-white/60 transition-colors text-sm font-ui mb-8 inline-block">
          ← Back
        </Link>

        <div className="flex flex-col lg:flex-row gap-10 items-start">
          {/* Card */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="lg:sticky lg:top-8"
          >
            <VibeCard card={card} interactive={true} size="md" />
          </motion.div>

          {/* Right panel */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="flex-1 flex flex-col gap-6"
          >
            {/* Header */}
            <div>
              <h1 className="font-card text-2xl font-medium text-white mb-1">
                {card.personaName}
              </h1>
              <p className="text-white/40 text-sm font-ui">
                {card.isAnchored ? `${card.owner}` : "Unanchored card"}
              </p>
            </div>

            {/* Status */}
            {card.traitReveal.typeRevealed && card.revealedType !== undefined ? (
              <div
                className="px-4 py-3 rounded-xl"
                style={{ background: `${VIBE_TYPES[card.revealedType].primary}15`, border: `1px solid ${VIBE_TYPES[card.revealedType].primary}33` }}
              >
                <p className="text-xs text-white/40 font-ui mb-1">Revealed</p>
                <p className="font-card font-medium" style={{ color: VIBE_TYPES[card.revealedType].primary }}>
                  {VIBE_TYPES[card.revealedType].name}
                </p>
              </div>
            ) : (
              <div className="px-4 py-3 rounded-xl bg-white/3 border border-white/6">
                <p className="text-xs text-white/40 font-ui mb-1">Status</p>
                <p className="font-card font-medium text-white/60">🔒 Hidden</p>
              </div>
            )}

            {/* Community Read */}
            <div
              className="p-5 rounded-2xl"
              style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)" }}
            >
              <h3 className="font-card font-medium text-white/80 mb-4 text-sm">Community Read</h3>
              <div className="flex flex-col gap-2">
                {guessDistribution.map(({ type, count }) => {
                  const pct = Math.round((count / totalGuesses) * 100);
                  return (
                    <div key={type.index} className="flex items-center gap-3">
                      <div className="w-3 h-3 rounded-full shrink-0" style={{ background: type.primary }} />
                      <div className="flex-1 h-1.5 rounded-full bg-white/5 overflow-hidden">
                        <motion.div
                          className="h-full rounded-full"
                          style={{ background: type.primary }}
                          initial={{ width: 0 }}
                          animate={{ width: `${pct}%` }}
                          transition={{ duration: 0.8, delay: 0.2 + type.index * 0.05 }}
                        />
                      </div>
                      <span className="text-xs text-white/30 font-ui w-8 text-right">{pct}%</span>
                    </div>
                  );
                })}
              </div>
              <p className="text-xs text-white/20 font-ui mt-3">{totalGuesses} community reads</p>
            </div>

            {/* Battle CTA */}
            <Link
              href={`/battle/${card.id}`}
              className="min-touch flex items-center justify-center gap-2 px-6 py-3 rounded-xl font-card text-sm text-white transition-all hover:scale-105"
              style={{ background: "rgba(239,68,68,0.12)", border: "1px solid rgba(239,68,68,0.25)" }}
            >
              ⚔️ Battle this card
            </Link>

            {/* Recent battles */}
            {card.recentBattles.length > 0 && (
              <div>
                <h3 className="font-card font-medium text-white/60 mb-3 text-sm">Recent Battles</h3>
                <div className="flex flex-col gap-2">
                  {card.recentBattles.slice(0, 5).map((b) => (
                    <div
                      key={b.battleId}
                      className="flex items-center gap-3 px-3 py-2 rounded-lg"
                      style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.05)" }}
                    >
                      <span
                        className="text-xs font-bold px-2 py-0.5 rounded"
                        style={{
                          background: b.won ? "rgba(34,197,94,0.1)" : "rgba(239,68,68,0.1)",
                          color: b.won ? "#22c55e" : "#ef4444",
                        }}
                      >
                        {b.won ? "W" : "L"}
                      </span>
                      <span className="text-xs text-white/50 font-ui flex-1">{b.opponentPersona}</span>
                      <span className="text-xs text-white/20 font-ui">
                        {new Date(b.timestamp).toLocaleDateString()}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </motion.div>
        </div>
      </div>
    </div>
  );
}
