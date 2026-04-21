"use client";

import { motion } from "framer-motion";
import Link from "next/link";

const fadeUp = (delay = 0) => ({
  initial: { opacity: 0, y: 16 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true },
  transition: { duration: 0.5, delay },
});

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-[11px] font-card tracking-[0.3em] text-white/30 uppercase mb-3">
      {children}
    </p>
  );
}

function Card({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <div
      className={`rounded-2xl p-6 ${className}`}
      style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)" }}
    >
      {children}
    </div>
  );
}

export default function HowItWorksPage() {
  return (
    <main className="min-h-screen bg-[#080810] pt-24 pb-32 px-6">
      <div className="max-w-3xl mx-auto">
        <Link href="/" className="text-white/30 hover:text-white/60 transition-colors text-sm font-ui mb-10 inline-block">
          ← Back
        </Link>

        {/* Hero */}
        <motion.div {...fadeUp()} className="mb-16">
          <SectionLabel>Guide</SectionLabel>
          <h1 className="font-card text-4xl sm:text-5xl font-semibold text-white leading-tight mb-4">
            How Proof of Vibe works
          </h1>
          <p className="text-white/50 font-ui text-lg max-w-xl">
            A 14-day game of privacy, strategy, and onchain identity. Every battle reveals a little more — or keeps you hidden a little longer.
          </p>
        </motion.div>

        {/* ── Phase 1: Mint ── */}
        <motion.section {...fadeUp(0.05)} className="mb-14">
          <SectionLabel>Phase 01</SectionLabel>
          <h2 className="font-card text-2xl font-medium text-white mb-6">Mint your Vibe Card</h2>
          <div className="grid sm:grid-cols-2 gap-4">
            <Card>
              <p className="text-2xl mb-3">🔗</p>
              <h3 className="font-card text-white font-medium mb-2">Scan a wallet</h3>
              <p className="text-white/40 text-sm font-ui leading-relaxed">
                Connect any EVM, Bitcoin, or Solana wallet. We analyse your onchain history — transaction count, DeFi activity, NFT interactions — and compute a <span className="text-white/70">Privacy Score</span>. Lower score = less exposure = stronger position in battle.
              </p>
            </Card>
            <Card>
              <p className="text-2xl mb-3">📝</p>
              <h3 className="font-card text-white font-medium mb-2">Take the quiz</h3>
              <p className="text-white/40 text-sm font-ui leading-relaxed">
                No wallet? Answer 6 questions about your onchain behaviour and we derive your Vibe Type and privacy score from your answers.
              </p>
            </Card>
          </div>
          <Card className="mt-4">
            <p className="text-2xl mb-3">🔒</p>
            <h3 className="font-card text-white font-medium mb-2">Your identity is sealed onchain</h3>
            <p className="text-white/40 text-sm font-ui leading-relaxed">
              Your Vibe Type, privacy score, and trait words are committed as a cryptographic hash on Starknet Sepolia — nobody can see them, not even the contract. They are only revealed progressively through battle losses, or all at once when the season ends on Day 14.
            </p>
          </Card>
        </motion.section>

        {/* ── Phase 2: Battle ── */}
        <motion.section {...fadeUp(0.05)} className="mb-14">
          <SectionLabel>Phase 02</SectionLabel>
          <h2 className="font-card text-2xl font-medium text-white mb-2">The Battle System</h2>
          <p className="text-white/40 font-ui text-sm mb-6">
            Battles are commit-reveal: both sides lock their move onchain before either is shown. No bluffing, no front-running.
          </p>

          {/* Flow */}
          <div className="flex flex-col gap-2 mb-6">
            {[
              { n: "1", title: "Challenger picks a move", desc: "Choose one of three attack types. Your move is hashed (hidden) and submitted to the contract." },
              { n: "2", title: "Defender responds", desc: "The defender sees the challenge, picks their counter-move, and commits it onchain — also hidden." },
              { n: "3", title: "Oracle resolves", desc: "Once both moves are committed, our oracle automatically calls resolve_battle within ~2 minutes. Both moves are revealed simultaneously and a winner is determined." },
              { n: "4", title: "Loser takes damage", desc: "The winner's move determines which privacy dimension cracks on the loser's card. Lose enough times and your full identity is exposed before season end." },
            ].map((step) => (
              <div
                key={step.n}
                className="flex gap-4 p-4 rounded-xl"
                style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)" }}
              >
                <span
                  className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-card font-bold text-white/50 shrink-0 mt-0.5"
                  style={{ background: "rgba(127,119,221,0.15)" }}
                >
                  {step.n}
                </span>
                <div>
                  <p className="font-card text-white text-sm font-medium mb-0.5">{step.title}</p>
                  <p className="text-white/40 text-xs font-ui leading-relaxed">{step.desc}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Winner logic */}
          <Card>
            <h3 className="font-card text-white font-medium mb-3">⚖️ How the winner is decided</h3>
            <div className="flex flex-col gap-3 text-sm font-ui">
              <div className="flex gap-3 items-start">
                <span className="text-green-400 shrink-0 mt-0.5">→</span>
                <p className="text-white/50"><span className="text-white/80">Lower privacy score wins.</span> A lower score means your onchain footprint is smaller — you&apos;ve left less traceable data. That makes you harder to expose, so you win.</p>
              </div>
              <div className="flex gap-3 items-start">
                <span className="text-yellow-400 shrink-0 mt-0.5">→</span>
                <p className="text-white/50"><span className="text-white/80">Score 0 = inactive wallet = auto-loss.</span> A wallet with zero activity has no proof of anything. The contract treats it as a forfeit.</p>
              </div>
              <div className="flex gap-3 items-start">
                <span className="text-violet-400 shrink-0 mt-0.5">→</span>
                <p className="text-white/50"><span className="text-white/80">Vibe Type affinity</span> (when both cards are revealed) can override the score — certain types counter others like a privacy rock-paper-scissors.</p>
              </div>
              <div className="flex gap-3 items-start">
                <span className="text-white/30 shrink-0 mt-0.5">→</span>
                <p className="text-white/50">If both wallets have identical scores and types cancel out, the higher move index wins as a final tiebreaker.</p>
              </div>
            </div>
          </Card>
        </motion.section>

        {/* ── Attack Types ── */}
        <motion.section {...fadeUp(0.05)} className="mb-14">
          <SectionLabel>Attack types</SectionLabel>
          <h2 className="font-card text-2xl font-medium text-white mb-2">What each move targets</h2>
          <p className="text-white/40 font-ui text-sm mb-6">
            The winning move determines <em>which</em> part of the loser&apos;s identity gets cracked open. Choose strategically.
          </p>

          <div className="flex flex-col gap-4">
            {/* Identity Attack */}
            <Card>
              <div className="flex items-start gap-4">
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center text-lg shrink-0"
                  style={{ background: "rgba(239,68,68,0.12)", border: "1px solid rgba(239,68,68,0.25)" }}
                >
                  🪪
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-card text-white font-medium">Identity Attack</h3>
                    <span
                      className="text-[10px] font-card px-2 py-0.5 rounded-md"
                      style={{ background: "rgba(239,68,68,0.12)", color: "#ef4444" }}
                    >
                      Move 1
                    </span>
                  </div>
                  <p className="text-white/40 text-sm font-ui leading-relaxed mb-3">
                    Targets the loser&apos;s <span className="text-white/70">Identity dimension</span> — the core label that defines their Vibe Type. This is the most revealing attack: it exposes what kind of onchain entity they fundamentally are.
                  </p>
                  <div
                    className="rounded-xl p-3 text-xs font-ui text-white/40"
                    style={{ background: "rgba(239,68,68,0.05)", border: "1px solid rgba(239,68,68,0.12)" }}
                  >
                    <p className="text-white/60 font-medium mb-1">What gets revealed</p>
                    <p>The loser&apos;s identity trait word is stamped onchain — e.g. <span className="text-white/60">"identity"</span>. After enough losses the full Vibe Type label becomes visible to anyone.</p>
                  </div>
                </div>
              </div>
            </Card>

            {/* Geographic Strike */}
            <Card>
              <div className="flex items-start gap-4">
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center text-lg shrink-0"
                  style={{ background: "rgba(245,158,11,0.12)", border: "1px solid rgba(245,158,11,0.25)" }}
                >
                  🌍
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-card text-white font-medium">Geographic Strike</h3>
                    <span
                      className="text-[10px] font-card px-2 py-0.5 rounded-md"
                      style={{ background: "rgba(245,158,11,0.12)", color: "#f59e0b" }}
                    >
                      Move 2
                    </span>
                  </div>
                  <p className="text-white/40 text-sm font-ui leading-relaxed mb-3">
                    Targets the loser&apos;s <span className="text-white/70">Geographic dimension</span> — the onchain patterns that hint at regional behaviour, such as which chains, bridges, and localised protocols they use.
                  </p>
                  <div
                    className="rounded-xl p-3 text-xs font-ui text-white/40"
                    style={{ background: "rgba(245,158,11,0.05)", border: "1px solid rgba(245,158,11,0.12)" }}
                  >
                    <p className="text-white/60 font-medium mb-1">What gets revealed</p>
                    <p>The loser&apos;s geographic trait word is exposed onchain — their location-linked behaviour pattern becomes part of the public record for the remainder of the season.</p>
                  </div>
                </div>
              </div>
            </Card>

            {/* Financial Raid */}
            <Card>
              <div className="flex items-start gap-4">
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center text-lg shrink-0"
                  style={{ background: "rgba(16,185,129,0.12)", border: "1px solid rgba(16,185,129,0.25)" }}
                >
                  💰
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-card text-white font-medium">Financial Raid</h3>
                    <span
                      className="text-[10px] font-card px-2 py-0.5 rounded-md"
                      style={{ background: "rgba(16,185,129,0.12)", color: "#10b981" }}
                    >
                      Move 3
                    </span>
                  </div>
                  <p className="text-white/40 text-sm font-ui leading-relaxed mb-3">
                    Targets the loser&apos;s <span className="text-white/70">Financial dimension</span> — the money trail: DeFi protocols used, transaction volume, token holdings, and overall financial footprint onchain.
                  </p>
                  <div
                    className="rounded-xl p-3 text-xs font-ui text-white/40"
                    style={{ background: "rgba(16,185,129,0.05)", border: "1px solid rgba(16,185,129,0.12)" }}
                  >
                    <p className="text-white/60 font-medium mb-1">What gets revealed</p>
                    <p>The loser&apos;s financial trait word is committed onchain, exposing their money behaviour pattern. Combined with other revealed dimensions, a full picture of the wallet starts to emerge.</p>
                  </div>
                </div>
              </div>
            </Card>
          </div>
        </motion.section>

        {/* ── Loss milestones ── */}
        <motion.section {...fadeUp(0.05)} className="mb-14">
          <SectionLabel>Loss milestones</SectionLabel>
          <h2 className="font-card text-2xl font-medium text-white mb-6">How damage accumulates</h2>
          <div className="flex flex-col gap-3">
            {[
              { losses: "1 loss", icon: "🔓", color: "#ef4444", desc: "First trait dimension cracked. A hairline fracture appears on your card." },
              { losses: "2 losses", icon: "📊", color: "#f59e0b", desc: "Activity bars become accurate — your real transaction volume is now visible to challengers." },
              { losses: "3 losses", icon: "🔓🔓", color: "#f59e0b", desc: "Second trait dimension exposed. Your pattern is becoming readable." },
              { losses: "4 losses", icon: "🎨", color: "#a78bfa", desc: "Card palette revealed — your Vibe Type colour scheme becomes visible, narrowing the guesses." },
              { losses: "5+ losses", icon: "💀", color: "#ef4444", desc: "Third trait dimension cracked. All three dimensions exposed. Your full identity is readable onchain before season end." },
              { losses: "Day 14", icon: "⏳", color: "#10b981", desc: "Season ends. Every remaining sealed card is revealed simultaneously. The salt key is published. Nothing is hidden anymore." },
            ].map((m) => (
              <div
                key={m.losses}
                className="flex items-center gap-4 px-4 py-3 rounded-xl"
                style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)" }}
              >
                <span className="text-xl shrink-0">{m.icon}</span>
                <div className="flex-1">
                  <span
                    className="text-[10px] font-card tracking-wider px-2 py-0.5 rounded-md mr-2"
                    style={{ background: `${m.color}22`, color: m.color }}
                  >
                    {m.losses.toUpperCase()}
                  </span>
                  <span className="text-white/50 text-xs font-ui">{m.desc}</span>
                </div>
              </div>
            ))}
          </div>
        </motion.section>

        {/* ── Phase 3: Reveal ── */}
        <motion.section {...fadeUp(0.05)} className="mb-16">
          <SectionLabel>Phase 03</SectionLabel>
          <h2 className="font-card text-2xl font-medium text-white mb-4">Season end reveal</h2>
          <Card>
            <p className="text-white/50 font-ui text-sm leading-relaxed mb-4">
              On Day 14, the season clock hits zero and the Starknet Foundation publishes the global salt key. Every sealed card — no matter how many battles they won — is cryptographically unmasked simultaneously. There is no escape from the reveal; winning battles only delays it.
            </p>
            <p className="text-white/50 font-ui text-sm leading-relaxed">
              <span className="text-white/80">The goal is not to stay hidden forever</span> — it&apos;s to be the last one standing with your identity intact when the clock runs out.
            </p>
          </Card>
        </motion.section>

        {/* CTA */}
        <motion.div {...fadeUp(0.05)} className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link
            href="/onboard"
            className="min-touch flex items-center justify-center px-8 py-3 rounded-xl font-card font-medium text-[#080810] text-sm tracking-wide transition-all hover:scale-105"
            style={{ background: "linear-gradient(135deg, #a78bfa, #7F77DD)" }}
          >
            Reveal My Vibe
          </Link>
          <Link
            href="/leaderboard"
            className="min-touch flex items-center justify-center px-8 py-3 rounded-xl font-card font-medium text-white/60 text-sm tracking-wide hover:text-white transition-all"
            style={{ border: "1px solid rgba(239,68,68,0.25)", background: "rgba(239,68,68,0.07)" }}
          >
            ⚔️ Battle Arena
          </Link>
        </motion.div>
      </div>
    </main>
  );
}
