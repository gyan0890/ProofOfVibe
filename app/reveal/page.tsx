"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { VibeCard } from "@/components/VibeCard";
import { CardData, VibeTypeIndex } from "@/lib/types";
import { generatePersonaName, generateSalt } from "@/lib/utils";
import { SHARE_TWEET_TEMPLATE } from "@/lib/constants";
import { DEMO_CARDS } from "@/demo/mockData";

type RevealStep = "pulse" | "flip" | "aura" | "text" | "actions";

export default function RevealPage() {
  const router = useRouter();
  const [step, setStep] = useState<RevealStep>("pulse");
  const [card, setCard] = useState<CardData | null>(null);

  useEffect(() => {
    // Build card from session
    const vibeType = sessionStorage.getItem("quizVibeType");
    const personaName = sessionStorage.getItem("personaName") ?? generatePersonaName();
    const isAnchored = sessionStorage.getItem("isAnchored") === "true";
    const owner = sessionStorage.getItem("walletAddress") ?? "demo";

    const newCard: CardData = {
      id: `session-${Date.now()}`,
      owner,
      commitment: "0x" + Math.random().toString(16).slice(2),
      revealedType: vibeType !== null ? (parseInt(vibeType) as VibeTypeIndex) : undefined,
      paletteRevealed: false,
      mintTimestamp: Date.now(),
      personaName,
      isAnchored,
      battleRecord: { wins: 0, losses: 0, total: 0 },
      traitReveal: {
        barFillsAccurate: false,
        paletteRevealed: false,
        typeRevealed: false,
        lossCount: 0,
      },
      recentBattles: [],
    };
    setCard(newCard);

    // Sequence
    const timings: [RevealStep, number][] = [
      ["flip", 1500],
      ["aura", 2300],
      ["text", 2900],
      ["actions", 3300],
    ];
    const timeouts = timings.map(([s, t]) => setTimeout(() => setStep(s), t));
    return () => timeouts.forEach(clearTimeout);
  }, []);

  if (!card) return null;

  const cardUrl = typeof window !== "undefined"
    ? `${window.location.origin}/card/${card.id}`
    : "";

  return (
    <div className="min-h-screen bg-[#080810] flex flex-col items-center justify-center px-6 py-12">
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
              Sealing your vibe...
            </p>
          </motion.div>
        )}

        {step !== "pulse" && card && (
          <motion.div
            key="card-reveal"
            className="flex flex-col items-center gap-8"
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
                    Your vibe is... <span className="text-white/40">🔒 HIDDEN</span>
                  </p>
                  <p className="text-white/40 text-sm font-ui">
                    Battle others to stay mysterious. Lose and they extract fragments.
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
                  className="flex flex-col gap-3 w-full max-w-xs"
                >
                  <a
                    href={`https://x.com/intent/tweet?text=${encodeURIComponent(SHARE_TWEET_TEMPLATE(cardUrl))}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="min-touch flex items-center justify-center gap-2 px-6 py-3 rounded-xl font-card text-sm text-white transition-all hover:scale-105"
                    style={{ background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.12)" }}
                  >
                    𝕏 Share on X
                  </a>
                  <Link
                    href="/leaderboard"
                    className="min-touch flex items-center justify-center gap-2 px-6 py-3 rounded-xl font-card text-sm text-white transition-all hover:scale-105"
                    style={{ background: "rgba(127,119,221,0.15)", border: "1px solid rgba(127,119,221,0.3)" }}
                  >
                    ⚔️ Find someone to battle
                  </Link>
                  <Link
                    href={`/card/${card.id}`}
                    className="min-touch flex items-center justify-center gap-2 px-6 py-3 rounded-xl font-card text-sm text-white/60 transition-all hover:text-white"
                  >
                    View my card →
                  </Link>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
