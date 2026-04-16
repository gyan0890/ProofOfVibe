"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import { VibeCard } from "@/components/VibeCard";
import { DEMO_CARDS, DEMO_SEASON_DAY, DEMO_SEASON_TOTAL } from "@/demo/mockData";
import { CardData } from "@/lib/types";

const REVEAL_LEVELS: Partial<CardData["traitReveal"]>[] = [
  { lossCount: 0, paletteRevealed: false, typeRevealed: false },
  { lossCount: 1, trait1Word: "methodical", paletteRevealed: false, typeRevealed: false },
  { lossCount: 2, trait1Word: "methodical", trait2Word: "long-horizon", paletteRevealed: false, typeRevealed: false },
  { lossCount: 3, trait1Word: "methodical", trait2Word: "long-horizon", barFillsAccurate: true, paletteRevealed: false, typeRevealed: false },
  { lossCount: 5, trait1Word: "methodical", trait2Word: "long-horizon", barFillsAccurate: true, paletteRevealed: true, typeRevealed: false },
  { lossCount: 8, trait1Word: "methodical", trait2Word: "long-horizon", barFillsAccurate: true, paletteRevealed: true, typeRevealed: true },
];

export default function DemoPage() {
  const [revealLevel, setRevealLevel] = useState(0);
  const [battleStep, setBattleStep] = useState(0);
  const [autoPlay, setAutoPlay] = useState(false);

  const demoCard: CardData = {
    ...DEMO_CARDS[0],
    revealedType: 0,
    traitReveal: {
      barFillsAccurate: false,
      paletteRevealed: false,
      typeRevealed: false,
      lossCount: 0,
      ...(REVEAL_LEVELS[revealLevel] ?? {}),
    },
  };

  useEffect(() => {
    if (!autoPlay) return;
    const t = setInterval(() => {
      setRevealLevel((l) => {
        if (l >= REVEAL_LEVELS.length - 1) {
          setAutoPlay(false);
          return l;
        }
        return l + 1;
      });
    }, 2000);
    return () => clearInterval(t);
  }, [autoPlay]);

  return (
    <div className="min-h-screen bg-[#080810] px-6 py-12">
      <div className="max-w-5xl mx-auto">
        {/* Demo banner */}
        <div className="flex items-center justify-between mb-8 px-4 py-3 rounded-xl" style={{ background: "rgba(186,117,23,0.1)", border: "1px solid rgba(186,117,23,0.25)" }}>
          <p className="text-sm font-ui text-amber-400">
            🎭 This is a demo — mint your real card to battle onchain
          </p>
          <Link href="/onboard" className="text-xs font-card text-amber-300 hover:text-amber-200 transition-colors">
            Mint now →
          </Link>
        </div>

        <p className="text-[11px] font-card tracking-[0.3em] text-white/30 uppercase mb-2">Demo Mode</p>
        <h1 className="font-card text-3xl font-medium text-white mb-2">Proof of Vibe</h1>
        <p className="text-white/40 font-ui text-sm mb-10">Season 01 · Day {DEMO_SEASON_DAY} of {DEMO_SEASON_TOTAL}</p>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
          {/* Card reveal demo */}
          <div>
            <h2 className="font-card text-lg font-medium text-white mb-6">Card Reveal Demo</h2>
            <div className="flex flex-col items-center gap-6">
              <VibeCard card={demoCard} interactive={true} size="md" justRevealed={revealLevel === REVEAL_LEVELS.length - 1} />

              <div className="w-full max-w-xs">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs text-white/40 font-ui">Reveal level {revealLevel + 1}/{REVEAL_LEVELS.length}</span>
                  <span className="text-xs text-white/30 font-ui">{revealLevel === 0 ? "Fully hidden" : revealLevel === REVEAL_LEVELS.length - 1 ? "Fully revealed" : "Partially revealed"}</span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={REVEAL_LEVELS.length - 1}
                  value={revealLevel}
                  onChange={(e) => { setRevealLevel(Number(e.target.value)); setAutoPlay(false); }}
                  className="w-full accent-violet-500"
                />
                <button
                  onClick={() => { setRevealLevel(0); setAutoPlay(true); }}
                  className="mt-3 w-full py-2 rounded-lg text-xs font-card text-white/60 hover:text-white transition-colors"
                  style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)" }}
                >
                  {autoPlay ? "Playing..." : "▶ Auto-play reveal sequence"}
                </button>
              </div>
            </div>
          </div>

          {/* Mock battle */}
          <div>
            <h2 className="font-card text-lg font-medium text-white mb-6">Mock Battle</h2>
            <div className="p-5 rounded-2xl" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)" }}>
              <div className="flex gap-4 justify-center mb-6">
                <div className="flex flex-col items-center gap-2">
                  <VibeCard card={DEMO_CARDS[0]} interactive={false} size="sm" isTargeted={battleStep === 2} />
                  <span className="text-xs text-white/40 font-ui">Mystic Wanderer</span>
                </div>
                <div className="flex items-center">
                  <span className="text-white/20 font-card text-xl">vs</span>
                </div>
                <div className="flex flex-col items-center gap-2">
                  <VibeCard card={DEMO_CARDS[1]} interactive={false} size="sm" isTargeted={battleStep === 3} />
                  <span className="text-xs text-white/40 font-ui">Shadow Cipher</span>
                </div>
              </div>

              <div className="flex flex-col gap-2">
                {[
                  "Challenge initiated",
                  "Moves committed (hidden)",
                  "Resolving...",
                  "Mystic Wanderer wins! Fragment extracted from Shadow Cipher.",
                ].map((label, i) => (
                  <div
                    key={i}
                    className="flex items-center gap-2 text-xs font-ui"
                    style={{ color: i <= battleStep ? "rgba(255,255,255,0.7)" : "rgba(255,255,255,0.2)" }}
                  >
                    <span>{i < battleStep ? "✓" : i === battleStep ? "→" : "○"}</span>
                    <span>{label}</span>
                  </div>
                ))}
              </div>

              <button
                onClick={() => setBattleStep((s) => Math.min(s + 1, 3))}
                disabled={battleStep >= 3}
                className="mt-4 w-full py-2.5 rounded-lg text-sm font-card text-white transition-all hover:scale-105 disabled:opacity-30 disabled:cursor-not-allowed"
                style={{ background: "rgba(127,119,221,0.15)", border: "1px solid rgba(127,119,221,0.25)" }}
              >
                {battleStep >= 3 ? "Battle complete" : "Next step →"}
              </button>
              {battleStep >= 3 && (
                <button onClick={() => setBattleStep(0)} className="mt-2 w-full py-2 text-xs text-white/30 hover:text-white/60 transition-colors font-ui">
                  Reset demo
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Real leaderboard CTA */}
        <div className="mt-12 text-center">
          <Link
            href="/leaderboard"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-xl font-card text-sm text-white transition-all hover:scale-105"
            style={{ background: "rgba(127,119,221,0.12)", border: "1px solid rgba(127,119,221,0.25)" }}
          >
            ⚔️ View live battle arena →
          </Link>
        </div>
      </div>
    </div>
  );
}
