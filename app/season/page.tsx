"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import { useOnchainCards } from "@/hooks/useOnchainCards";
import { seasonTimeRemaining } from "@/lib/utils";

export default function SeasonPage() {
  const [countdown, setCountdown] = useState(seasonTimeRemaining());

  useEffect(() => {
    const t = setInterval(() => setCountdown(seasonTimeRemaining()), 1000);
    return () => clearInterval(t);
  }, []);

  const { cards, loading: cardsLoading } = useOnchainCards(50);

  const stats = {
    minted: cards.length,
    battles: cards.reduce((s, c) => s + c.battleRecord.total, 0),
    traitsRevealed: cards.filter(c => c.traitReveal.trait1Word).length,
    fullReveals: cards.filter(c => c.traitReveal.typeRevealed).length,
  };

  const ghostCandidates = [...cards]
    .filter((c) => !c.traitReveal.typeRevealed && c.traitReveal.lossCount === 0)
    .sort((a, b) => b.mintTimestamp - a.mintTimestamp)
    .slice(0, 5);

  const hotCards = [...cards]
    .sort((a, b) => b.battleRecord.total - a.battleRecord.total)
    .slice(0, 5);

  return (
    <div className="min-h-screen bg-[#080810] px-6 py-12">
      <div className="max-w-3xl mx-auto">
        <Link href="/" className="text-white/30 hover:text-white/60 transition-colors text-sm font-ui mb-8 inline-block">← Back</Link>

        <p className="text-[11px] font-card tracking-[0.3em] text-white/30 uppercase mb-2">Season 01</p>
        <h1 className="font-card text-3xl font-medium text-white mb-8">Season Stats</h1>

        {/* Countdown */}
        <div className="p-6 rounded-2xl mb-8" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)" }}>
          <p className="text-sm text-white/40 font-ui mb-4">Mass reveal in</p>
          <div className="flex gap-6">
            {[
              { v: countdown.days, l: "days" },
              { v: countdown.hours, l: "hours" },
              { v: countdown.minutes, l: "min" },
              { v: countdown.seconds, l: "sec" },
            ].map(({ v, l }) => (
              <div key={l} className="flex flex-col items-center">
                <span className="font-card text-3xl font-semibold text-white tabular-nums">{String(v).padStart(2, "0")}</span>
                <span className="text-[10px] text-white/30 tracking-widest uppercase mt-1">{l}</span>
              </div>
            ))}
          </div>
          <p className="text-xs text-white/30 font-ui mt-4">
            Day 14 · All hidden cards reveal simultaneously · Salt key published by Starknet Foundation
          </p>
        </div>

        {/* Live stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-10">
          {[
            { label: "Cards Minted", value: stats.minted.toLocaleString() },
            { label: "Battles Fought", value: stats.battles.toLocaleString() },
            { label: "Traits Revealed", value: stats.traitsRevealed.toLocaleString() },
            { label: "Full Reveals", value: stats.fullReveals.toLocaleString() },
          ].map((s) => (
            <div key={s.label} className="p-4 rounded-xl text-center" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}>
              <p className="font-card text-xl font-semibold text-white">{s.value}</p>
              <p className="text-[10px] text-white/30 font-ui mt-1 uppercase tracking-wide">{s.label}</p>
            </div>
          ))}
        </div>

        {/* Ghost candidates */}
        <div className="mb-8">
          <h2 className="font-card text-lg font-medium text-white mb-4">Ghost Candidates 👻</h2>
          <p className="text-xs text-white/30 font-ui mb-4">Cards most likely to survive the season undetected</p>
          <div className="flex flex-col gap-2">
            {ghostCandidates.length === 0 ? (
              <p className="text-xs text-white/20 font-ui py-4 text-center">No ghost candidates yet — battle to create some.</p>
            ) : ghostCandidates.map((card, i) => (
              <Link key={card.id} href={`/card/${card.id}`}>
                <motion.div
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.05 }}
                  className="flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-white/3 transition-colors"
                  style={{ background: "rgba(136,135,128,0.06)", border: "1px solid rgba(136,135,128,0.15)" }}
                >
                  <span className="text-white/30 text-sm font-card w-4">{i + 1}</span>
                  <div className="flex-1">
                    <p className="text-sm font-card text-white">{card.personaName}</p>
                    <p className="text-xs text-white/30 font-ui">0 losses · {card.battleRecord.wins} wins</p>
                  </div>
                  <span className="text-xs text-white/20 font-ui">0% revealed</span>
                </motion.div>
              </Link>
            ))}
          </div>
        </div>

        {/* Hottest cards */}
        <div>
          <h2 className="font-card text-lg font-medium text-white mb-4">Hottest Cards 🔥</h2>
          <p className="text-xs text-white/30 font-ui mb-4">Most battled in the last 24h</p>
          <div className="flex flex-col gap-2">
            {hotCards.length === 0 ? (
              <p className="text-xs text-white/20 font-ui py-4 text-center">No battles yet — be the first to challenge.</p>
            ) : hotCards.map((card, i) => (
              <Link key={card.id} href={`/card/${card.id}`}>
                <motion.div
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.05 }}
                  className="flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-white/3 transition-colors"
                  style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.05)" }}
                >
                  <span className="text-white/30 text-sm font-card w-4">{i + 1}</span>
                  <div className="flex-1">
                    <p className="text-sm font-card text-white">{card.personaName}</p>
                    <p className="text-xs text-white/30 font-ui">{card.battleRecord.total} battles total</p>
                  </div>
                  <span className="text-xs text-white/60 font-ui">{card.battleRecord.total} battles</span>
                </motion.div>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
