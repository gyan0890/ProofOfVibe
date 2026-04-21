"use client";

import { useEffect, useState } from "react";
import { motion, useScroll, useTransform } from "framer-motion";
import Link from "next/link";
import { VibeCard } from "@/components/VibeCard";
import { useOnchainCards } from "@/hooks/useOnchainCards";
import { seasonTimeRemaining } from "@/lib/utils";

function CountdownUnit({ value, label }: { value: number; label: string }) {
  return (
    <div className="flex flex-col items-center">
      <span className="font-card text-2xl font-semibold text-white tabular-nums">
        {String(value).padStart(2, "0")}
      </span>
      <span className="text-[10px] text-white/30 tracking-widest uppercase mt-1">{label}</span>
    </div>
  );
}

function LiveStat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="flex items-center gap-2 text-[12px] text-white/50">
      <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
      <span className="font-card tracking-wide">
        <span className="text-white font-medium">{value}</span> {label}
      </span>
    </div>
  );
}

export default function LandingPage() {
  const [countdown, setCountdown] = useState(seasonTimeRemaining());
  const { scrollY } = useScroll();
  const heroY = useTransform(scrollY, [0, 400], [0, -80]);
  const { cards: onchainCards } = useOnchainCards(6);
  const floatingCards = onchainCards.slice(0, 4);

  useEffect(() => {
    const t = setInterval(() => setCountdown(seasonTimeRemaining()), 1000);
    return () => clearInterval(t);
  }, []);

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#080810]">
      {/* Hero */}
      <motion.section
        style={{ y: heroY }}
        className="relative min-h-screen flex flex-col items-center justify-center px-6 pt-28 pb-32"
      >
        {/* Floating background cards */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          {floatingCards.map((card, i) => (
            <motion.div
              key={card.id}
              className="absolute opacity-20 blur-sm"
              style={{ left: `${8 + i * 22}%`, top: `${5 + (i % 2) * 20}%` }}
              animate={{
                y: [0, -20, 0],
                rotate: [i % 2 === 0 ? -8 : 8, i % 2 === 0 ? -12 : 12, i % 2 === 0 ? -8 : 8],
              }}
              transition={{ duration: 5 + i * 0.7, repeat: Infinity, ease: "easeInOut", delay: i * 0.4 }}
            >
              <VibeCard card={card} interactive={false} size="sm" />
            </motion.div>
          ))}
        </div>

        <div className="relative z-10 flex flex-col items-center text-center max-w-2xl">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
            <p className="text-[11px] font-card tracking-[0.3em] text-white/40 uppercase mb-6">
              Proof of Vibe · Season 01
            </p>
            <h1 className="font-card text-5xl sm:text-6xl font-semibold text-white leading-tight mb-4">
              Your onchain soul.
              <br />
              <span className="text-white/50">Proven. Hidden.</span>
            </h1>
            <p className="text-white/50 text-lg font-ui mb-4 max-w-lg">
              Battle to reveal. Season ends in{" "}
              <span className="text-white font-medium">{countdown.days}d {countdown.hours}h</span>.
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2, duration: 0.5 }}
            className="flex gap-6 mb-10 p-4 rounded-2xl"
            style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)" }}
          >
            <CountdownUnit value={countdown.days} label="days" />
            <div className="w-px bg-white/10" />
            <CountdownUnit value={countdown.hours} label="hours" />
            <div className="w-px bg-white/10" />
            <CountdownUnit value={countdown.minutes} label="min" />
            <div className="w-px bg-white/10" />
            <CountdownUnit value={countdown.seconds} label="sec" />
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.35, duration: 0.5 }}
            className="flex flex-col sm:flex-row gap-3 mb-10"
          >
            <Link
              href="/onboard"
              className="min-touch flex items-center justify-center px-8 py-3 rounded-xl font-card font-medium text-[#080810] text-sm tracking-wide transition-all hover:scale-105 active:scale-95"
              style={{ background: "linear-gradient(135deg, #a78bfa, #7F77DD)" }}
            >
              Reveal My Vibe
            </Link>
            <Link
              href="/quiz"
              className="min-touch flex items-center justify-center px-8 py-3 rounded-xl font-card font-medium text-white text-sm tracking-wide border border-white/20 hover:border-white/40 transition-all"
            >
              I am new to web3
            </Link>
            <Link
              href="/leaderboard"
              className="min-touch flex items-center justify-center px-8 py-3 rounded-xl font-card font-medium text-white/60 text-sm tracking-wide hover:text-white transition-all"
              style={{ border: "1px solid rgba(239,68,68,0.25)", background: "rgba(239,68,68,0.07)" }}
            >
              ⚔️ Leaderboard
            </Link>
          </motion.div>


          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
            className="flex flex-wrap justify-center gap-x-6 gap-y-2"
          >
            {onchainCards.length > 0 && (
              <LiveStat value={onchainCards.length} label="cards minted onchain" />
            )}
          </motion.div>
        </div>
      </motion.section>

      {/* How it works */}
      <section className="relative z-10 px-6 py-24 max-w-4xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="text-center mb-16"
        >
          <p className="text-[11px] font-card tracking-[0.3em] text-white/30 uppercase mb-3">How it works</p>
          <h2 className="font-card text-3xl font-medium text-white">Three acts. One season.</h2>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[
            { step: "01", title: "Mint", color: "#7F77DD", desc: "Connect with a passkey — no wallet install needed. Your onchain history (or a quick quiz) determines your Vibe Type. It's committed onchain, sealed in a cryptographic envelope." },
            { step: "02", title: "Battle", color: "#D85A30", desc: "Challenge other cards. Each battle extracts fragments from the loser's hidden identity. Win enough and your card stays mysterious. Lose enough and your vibe is exposed." },
            { step: "03", title: "Reveal", color: "#1D9E75", desc: "Day 14. The season clock ticks to zero. Every hidden card reveals simultaneously. The salt key is published by the Starknet Foundation. Nothing is hidden anymore." },
          ].map((item, i) => (
            <motion.div
              key={item.step}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1, duration: 0.5 }}
              className="p-6 rounded-2xl flex flex-col gap-4"
              style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)" }}
            >
              <span
                className="text-[10px] font-card tracking-widest px-2 py-1 rounded-md self-start"
                style={{ background: `${item.color}22`, color: item.color }}
              >
                STEP {item.step}
              </span>
              <h3 className="font-card text-xl font-medium text-white">{item.title}</h3>
              <p className="text-white/50 text-sm font-ui leading-relaxed">{item.desc}</p>
            </motion.div>
          ))}
        </div>

        <motion.div
          initial={{ opacity: 0, y: 12 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.3 }}
          className="text-center mt-12 flex flex-wrap justify-center gap-6"
        >
<Link href="/demo" className="inline-flex items-center gap-2 text-sm text-white/50 hover:text-white/80 transition-colors font-ui">
            <span className="w-1 h-1 rounded-full bg-green-500" />
            Try the demo →
          </Link>
          <Link href="/leaderboard" className="inline-flex items-center gap-2 text-sm text-white/50 hover:text-white/80 transition-colors font-ui">
            View leaderboard →
          </Link>
          <Link href="/season" className="inline-flex items-center gap-2 text-sm text-white/50 hover:text-white/80 transition-colors font-ui">
            Season stats →
          </Link>
        </motion.div>
      </section>
    </main>
  );
}
