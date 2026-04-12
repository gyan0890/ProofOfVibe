"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import { VibeCard } from "@/components/VibeCard";
import { LEADERBOARD_MOCK_CARDS, DEMO_CARDS } from "@/demo/mockData";
import { CardData } from "@/lib/types";

type BattleStep = "confirm" | "move" | "waiting" | "resolved";

export default function BattlePage({ params }: { params: { id: string } }) {
  const defender = LEADERBOARD_MOCK_CARDS.find((c) => c.id === params.id) ?? DEMO_CARDS[1];
  const challenger = DEMO_CARDS[0];
  const [step, setStep] = useState<BattleStep>("confirm");
  const [selectedMove, setSelectedMove] = useState<number | null>(null);
  const [result, setResult] = useState<"win" | "lose" | null>(null);

  const moves = ["Move Alpha", "Move Beta", "Move Gamma"];

  function handleMove(i: number) {
    setSelectedMove(i);
    setStep("waiting");
    // Simulate opponent response
    setTimeout(() => {
      setResult(Math.random() > 0.5 ? "win" : "lose");
      setStep("resolved");
    }, 2500);
  }

  return (
    <div className="min-h-screen bg-[#080810] px-6 py-12">
      <div className="max-w-3xl mx-auto">
        <Link href={`/card/${params.id}`} className="text-white/30 hover:text-white/60 transition-colors text-sm font-ui mb-8 inline-block">
          ← Back
        </Link>

        <AnimatePresence mode="wait">
          {step === "confirm" && (
            <motion.div key="confirm" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
              <p className="text-[11px] font-card tracking-[0.3em] text-white/30 uppercase mb-2">Battle</p>
              <h1 className="font-card text-2xl font-medium text-white mb-8">
                You&apos;re challenging <span className="text-violet-400">{defender.personaName}</span>
              </h1>
              <div className="flex flex-col sm:flex-row gap-8 items-center justify-center mb-10">
                <div className="flex flex-col items-center gap-2">
                  <VibeCard card={challenger} interactive={false} size="sm" />
                  <span className="text-xs text-white/40 font-ui">You</span>
                </div>
                <span className="font-card text-2xl text-white/20">⚔️</span>
                <div className="flex flex-col items-center gap-2">
                  <VibeCard card={defender} interactive={false} size="sm" />
                  <span className="text-xs text-white/40 font-ui">Them</span>
                </div>
              </div>
              <div className="flex justify-center">
                <button
                  onClick={() => setStep("move")}
                  className="min-touch px-8 py-3 rounded-xl font-card text-sm text-white hover:scale-105 transition-all"
                  style={{ background: "rgba(239,68,68,0.15)", border: "1px solid rgba(239,68,68,0.3)" }}
                >
                  Choose your move →
                </button>
              </div>
            </motion.div>
          )}

          {step === "move" && (
            <motion.div key="move" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
              <h2 className="font-card text-xl font-medium text-white mb-2">Choose your move</h2>
              <p className="text-white/40 text-sm font-ui mb-8">Your move is hidden until your opponent commits too.</p>
              <div className="grid grid-cols-1 gap-4">
                {moves.map((move, i) => (
                  <motion.button
                    key={i}
                    whileHover={{ scale: 1.02, x: 4 }}
                    whileTap={{ scale: 0.97 }}
                    onClick={() => handleMove(i)}
                    className="min-touch p-5 rounded-2xl text-left flex items-center gap-4"
                    style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}
                  >
                    <span className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-card font-bold text-white/40" style={{ background: "rgba(255,255,255,0.06)" }}>
                      {i + 1}
                    </span>
                    <div>
                      <p className="font-card text-white font-medium">{move}</p>
                      <p className="text-white/30 text-xs font-ui mt-0.5">Trait channel #{i + 1}</p>
                    </div>
                  </motion.button>
                ))}
              </div>
            </motion.div>
          )}

          {step === "waiting" && (
            <motion.div key="waiting" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex flex-col items-center gap-6 py-24 text-center">
              <motion.div className="w-16 h-16 rounded-full border-2 border-violet-500/30" animate={{ rotate: 360 }} transition={{ duration: 2, repeat: Infinity, ease: "linear" }} />
              <p className="font-card text-lg text-white">Waiting for opponent...</p>
              <p className="text-white/30 text-sm font-ui">Move committed onchain. Opponent has 1 hour to respond.</p>
            </motion.div>
          )}

          {step === "resolved" && result && (
            <motion.div key="resolved" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="flex flex-col items-center gap-6 py-12 text-center">
              <motion.div
                className="w-20 h-20 rounded-full flex items-center justify-center text-4xl"
                style={{ background: result === "win" ? "rgba(34,197,94,0.15)" : "rgba(239,68,68,0.15)" }}
                animate={{ scale: [1, 1.1, 1] }}
                transition={{ duration: 0.5 }}
              >
                {result === "win" ? "🏆" : "💀"}
              </motion.div>
              <div>
                <h2 className="font-card text-2xl font-medium text-white mb-2">
                  {result === "win" ? "You extracted a fragment" : "A fragment was revealed"}
                </h2>
                <p className="text-white/40 text-sm font-ui">
                  {result === "win" ? `You won the battle against ${defender.personaName}.` : `${defender.personaName} extracted a trait fragment from your card.`}
                </p>
              </div>
              <div className="flex gap-3">
                <Link href="/leaderboard" className="min-touch px-5 py-2.5 rounded-xl font-card text-sm text-white transition-all hover:scale-105" style={{ background: "rgba(127,119,221,0.15)", border: "1px solid rgba(127,119,221,0.3)" }}>
                  View leaderboard
                </Link>
                <Link href={`/card/${challenger.id}`} className="min-touch px-5 py-2.5 rounded-xl font-card text-sm text-white/60 hover:text-white transition-all">
                  My card →
                </Link>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
