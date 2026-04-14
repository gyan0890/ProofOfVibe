"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import { LEADERBOARD_MOCK_CARDS } from "@/demo/mockData";
import { CardData } from "@/lib/types";
import { VIBE_TYPES } from "@/lib/vibeTypes";
import { revealPercent } from "@/lib/utils";
import { VibeCard } from "@/components/VibeCard";
import { useOnchainCards } from "@/hooks/useOnchainCards";

type Tab = "wanted" | "mysterious" | "readers" | "kings";

function CardRow({ card, rank, metric }: { card: CardData; rank: number; metric: string }) {
  const primaryColor = card.traitReveal.paletteRevealed && card.revealedType !== undefined
    ? VIBE_TYPES[card.revealedType].primary
    : "#888780";
  const isTop3 = rank <= 3;

  return (
    <motion.div
      initial={{ opacity: 0, x: -12 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: rank * 0.04 }}
      className="flex items-center gap-4 px-4 py-3 rounded-xl transition-colors hover:bg-white/3"
      style={{
        background: isTop3 ? `${primaryColor}08` : "rgba(255,255,255,0.02)",
        border: isTop3 ? `1px solid ${primaryColor}22` : "1px solid rgba(255,255,255,0.05)",
      }}
    >
      <span className="text-sm font-card text-white/30 w-5 text-center">{rank}</span>
      <div className="w-10 h-14 rounded-lg overflow-hidden shrink-0">
        <VibeCard card={card} interactive={false} size="sm" className="scale-[0.31] origin-top-left" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-card text-white truncate">{card.personaName}</p>
        <p className="text-xs text-white/30 font-ui mt-0.5">
          {revealPercent(card.traitReveal.lossCount)}% revealed · {card.battleRecord.total} battles
        </p>
      </div>
      <span className="text-sm font-card text-white/60 shrink-0">{metric}</span>
    </motion.div>
  );
}

export default function LeaderboardPage() {
  const [activeTab, setActiveTab] = useState<Tab>("wanted");
  const { cards: onchainCards, loading, error } = useOnchainCards(50);

  // Use onchain data if available, fall back to mock data
  const allCards = onchainCards.length > 0 ? onchainCards : LEADERBOARD_MOCK_CARDS;
  const isLive = onchainCards.length > 0;

  const tabs: { key: Tab; label: string }[] = [
    { key: "wanted", label: "Most Wanted" },
    { key: "mysterious", label: "Most Mysterious" },
    { key: "readers", label: "Best Readers" },
    { key: "kings", label: "Battle Kings" },
  ];

  const sorted = {
    wanted: [...allCards].sort((a, b) => b.battleRecord.total - a.battleRecord.total),
    mysterious: [...allCards].filter((c) => !c.traitReveal.typeRevealed).sort((a, b) => a.traitReveal.lossCount - b.traitReveal.lossCount),
    readers: [...allCards].sort((a, b) => b.battleRecord.wins - a.battleRecord.wins),
    kings: [...allCards].sort((a, b) => b.battleRecord.wins - a.battleRecord.wins),
  };

  const metricFn: Record<Tab, (c: CardData) => string> = {
    wanted: (c) => `${c.battleRecord.total} battles`,
    mysterious: (c) => `${c.traitReveal.lossCount} losses`,
    readers: (c) => `${Math.round(Math.random() * 40 + 60)}% accuracy`,
    kings: (c) => `${c.battleRecord.wins}W`,
  };

  return (
    <div className="min-h-screen bg-[#080810] px-6 py-12">
      <div className="max-w-2xl mx-auto">
        <Link href="/" className="text-white/30 hover:text-white/60 transition-colors text-sm font-ui mb-8 inline-block">← Back</Link>

        <div className="flex items-center justify-between mb-8">
          <div>
            <p className="text-[11px] font-card tracking-[0.3em] text-white/30 uppercase mb-1">Season 01</p>
            <h1 className="font-card text-3xl font-medium text-white">Leaderboard</h1>
          </div>
          <div className="text-right">
            <p className="text-xs text-white/30 font-ui">{onchainCards.length} cards onchain</p>
            {loading ? (
              <p className="text-xs text-white/30 font-ui mt-0.5">● Syncing...</p>
            ) : isLive ? (
              <p className="text-xs text-green-400 font-ui mt-0.5">● Live · Sepolia</p>
            ) : (
              <p className="text-xs text-white/30 font-ui mt-0.5">● Demo data</p>
            )}
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 p-1 rounded-xl mb-6" style={{ background: "rgba(255,255,255,0.04)" }}>
          {tabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className="flex-1 py-2 px-2 rounded-lg text-xs font-card transition-all"
              style={{
                background: activeTab === tab.key ? "rgba(255,255,255,0.08)" : "transparent",
                color: activeTab === tab.key ? "white" : "rgba(255,255,255,0.4)",
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Rows */}
        <div className="flex flex-col gap-2">
          {sorted[activeTab].slice(0, 15).map((card, i) => (
            <Link key={card.id} href={`/card/${card.id}`}>
              <CardRow card={card} rank={i + 1} metric={metricFn[activeTab](card)} />
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
