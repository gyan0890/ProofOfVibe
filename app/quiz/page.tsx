"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useRouter } from "next/navigation";
import { QUIZ_QUESTIONS } from "@/demo/mockData";
import { computePrivacyFromQuiz } from "@/lib/quizScoring";
import { generatePersonaName, generateSalt } from "@/lib/utils";
import { saveCardLocally } from "@/lib/storage";
import { CardData } from "@/lib/types";

export default function QuizPage() {
  const router = useRouter();
  const [currentQ, setCurrentQ] = useState(0);
  const [answers, setAnswers] = useState<number[]>([]);
  const [calculating, setCalculating] = useState(false);
  const [direction, setDirection] = useState(1);

  const progress = (currentQ / QUIZ_QUESTIONS.length) * 100;

  function handleAnswer(answerIndex: number) {
    const newAnswers = [...answers, answerIndex];
    setAnswers(newAnswers);

    if (currentQ < QUIZ_QUESTIONS.length - 1) {
      setDirection(1);
      setCurrentQ(currentQ + 1);
    } else {
      setCalculating(true);
      const { profile, vibeType } = computePrivacyFromQuiz(QUIZ_QUESTIONS, newAnswers);
      const personaName = generatePersonaName();
      const salt = generateSalt();

      // Persist card to localStorage so it survives tab close
      const card: CardData = {
        id: `local-${Date.now()}`,
        owner: "unanchored",
        commitment: "0x" + salt.slice(0, 16),
        revealedType: vibeType,
        paletteRevealed: true,
        mintTimestamp: Date.now(),
        personaName,
        isAnchored: false,
        battleRecord: { wins: 0, losses: 0, total: 0 },
        traitReveal: {
          barFillsAccurate: false,
          paletteRevealed: true,        // colour visible from day 1
          typeRevealed: false,          // type name stays hidden
          lossCount: 0,
          // trait words are sealed — only cracked by battle attacks on-chain
        },
        recentBattles: [],
        privacyProfile: profile,
      };
      saveCardLocally(card);

      // Keep session for reveal page
      sessionStorage.setItem("quizVibeType", String(vibeType));
      sessionStorage.setItem("quizPrivacyProfile", JSON.stringify(profile));
      sessionStorage.setItem("personaName", personaName);
      sessionStorage.setItem("salt", salt);
      sessionStorage.setItem("isAnchored", "false");

      setTimeout(() => {
        router.push("/reveal");
      }, 3000);
    }
  }

  const q = QUIZ_QUESTIONS[currentQ];

  return (
    <div className="min-h-screen bg-[#080810] flex flex-col">
      {/* Progress bar */}
      <div className="h-0.5 bg-white/5">
        <motion.div
          className="h-full"
          style={{ background: "linear-gradient(90deg, #7F77DD, #D4537E)" }}
          animate={{ width: `${progress}%` }}
          transition={{ duration: 0.4, ease: "easeOut" }}
        />
      </div>

      {/* Counter */}
      <div className="flex items-center justify-between px-6 pt-6 pb-2">
        <button
          onClick={() => {
            if (currentQ > 0) {
              setDirection(-1);
              setCurrentQ(currentQ - 1);
              setAnswers(answers.slice(0, -1));
            }
          }}
          className="min-touch flex items-center text-white/30 hover:text-white/60 transition-colors text-sm"
        >
          {currentQ > 0 ? "← Back" : ""}
        </button>
        <span className="text-[11px] font-card tracking-widest text-white/30">
          {currentQ + 1} / {QUIZ_QUESTIONS.length}
        </span>
      </div>

      {/* Question */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 pb-24">
        <AnimatePresence mode="wait">
          {calculating ? (
            <motion.div
              key="calculating"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="flex flex-col items-center gap-6 text-center"
            >
              <div className="relative w-24 h-24">
                <motion.div
                  className="absolute inset-0 rounded-full"
                  style={{ background: "conic-gradient(#7F77DD, #D4537E, #BA7517, #7F77DD)" }}
                  animate={{ rotate: 360 }}
                  transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                />
                <div className="absolute inset-2 rounded-full bg-[#080810] flex items-center justify-center">
                  <span className="text-2xl">✦</span>
                </div>
              </div>
              <div>
                <p className="font-card text-xl text-white mb-2">Calculating your vibe...</p>
                <p className="text-white/40 text-sm">Reading the signals</p>
              </div>
              {/* Particle dots */}
              <div className="flex gap-2">
                {[0, 1, 2].map((i) => (
                  <motion.div
                    key={i}
                    className="w-2 h-2 rounded-full bg-violet-400"
                    animate={{ y: [0, -8, 0], opacity: [0.4, 1, 0.4] }}
                    transition={{ duration: 0.8, repeat: Infinity, delay: i * 0.2 }}
                  />
                ))}
              </div>
            </motion.div>
          ) : (
            <motion.div
              key={currentQ}
              initial={{ opacity: 0, x: direction * 40 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -direction * 40 }}
              transition={{ duration: 0.25, ease: "easeOut" }}
              className="w-full max-w-lg"
            >
              <h2 className="font-card text-2xl sm:text-3xl font-medium text-white mb-10 text-center leading-snug">
                {q.question}
              </h2>
              <div className="grid grid-cols-1 gap-3">
                {q.answers.map((a, i) => (
                  <motion.button
                    key={i}
                    onClick={() => handleAnswer(i)}
                    whileHover={{ scale: 1.02, x: 4 }}
                    whileTap={{ scale: 0.98 }}
                    className="min-touch flex items-center gap-4 p-4 rounded-xl text-left transition-all w-full"
                    style={{
                      background: "rgba(255,255,255,0.04)",
                      border: "1px solid rgba(255,255,255,0.08)",
                    }}
                  >
                    <span className="text-2xl w-8 shrink-0 text-center">{a.icon}</span>
                    <span className="font-ui text-white/80 text-sm leading-snug">{a.label}</span>
                  </motion.button>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
