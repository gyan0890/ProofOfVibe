import Link from "next/link";

const VIBE_TYPES = [
  { name: "The Architect",    color: "#7F77DD", emoji: "🏛️", desc: "Methodical. Long-horizon. Governance-native." },
  { name: "The Degen",        color: "#D85A30", emoji: "🎲", desc: "High-velocity. Risk-tolerant. Nocturnal." },
  { name: "The Ghost",        color: "#888780", emoji: "👻", desc: "Minimal-footprint. Privacy-seeking. Rare-mover." },
  { name: "The Builder",      color: "#1D9E75", emoji: "🔧", desc: "Contract-deployer. Testnet-native. Ecosystem-OG." },
  { name: "The Whale Hunter", color: "#185FA5", emoji: "🐋", desc: "Large-positions. Patient-accumulator. LP-deep." },
  { name: "The Socialite",    color: "#D4537E", emoji: "🌐", desc: "Frequent-connector. NFT-native. Community-anchor." },
  { name: "The Oracle",       color: "#BA7517", emoji: "🔮", desc: "Data-driven. Yield-optimizer. Multi-protocol." },
];

const REVEAL_MILESTONES = [
  { losses: "0",      icon: "✅", label: "Sealed",           desc: "Card fully hidden onchain" },
  { losses: "1",      icon: "🔓", label: "First Crack",      desc: "Identity dimension exposed" },
  { losses: "2",      icon: "📊", label: "Activity Visible", desc: "Onchain bars turn accurate" },
  { losses: "3",      icon: "🔓", label: "Second Crack",     desc: "Geographic signals leak" },
  { losses: "4",      icon: "🎨", label: "Palette Drops",    desc: "Card color narrows the guess" },
  { losses: "6+",     icon: "💀", label: "Full Reveal",      desc: "Identity completely exposed" },
  { losses: "Day 14", icon: "⏳", label: "Mass Reveal",      desc: "Every hidden card unmasked" },
];

export default function OnePager() {
  return (
    <div
      style={{
        background: "#080810",
        color: "rgba(255,255,255,0.88)",
        fontFamily: "'Inter', sans-serif",
        minHeight: "100vh",
      }}
    >
      <style>{`
        @media print {
          .no-print { display: none !important; }
        }
      `}</style>

      {/* Sticky nav */}
      <div
        className="no-print"
        style={{
          position: "sticky", top: 0, zIndex: 50,
          background: "rgba(8,8,16,0.9)", backdropFilter: "blur(12px)",
          borderBottom: "1px solid rgba(255,255,255,0.07)",
          display: "flex", alignItems: "center", justifyContent: "space-between",
          padding: "12px 24px",
        }}
      >
        <span style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 14, color: "rgba(255,255,255,0.5)" }}>
          Proof of Vibe · 1-Pager
        </span>
        <div style={{ display: "flex", gap: 12 }}>
          <Link
            href="/"
            style={{
              padding: "6px 16px", borderRadius: 8, fontSize: 12,
              background: "transparent", border: "1px solid rgba(255,255,255,0.12)",
              color: "rgba(255,255,255,0.5)", textDecoration: "none",
              fontFamily: "'Space Grotesk', sans-serif",
            }}
          >
            ← Back
          </Link>
        </div>
      </div>

      <div style={{ maxWidth: 900, margin: "0 auto", padding: "48px 24px 80px" }}>

        {/* ── HERO ─── */}
        <div style={{ textAlign: "center", marginBottom: 64 }}>
          <div style={{
            display: "inline-block",
            padding: "4px 14px", borderRadius: 20,
            background: "rgba(127,119,221,0.12)", border: "1px solid rgba(127,119,221,0.25)",
            fontSize: 11, letterSpacing: "0.1em", textTransform: "uppercase",
            color: "#a78bfa", marginBottom: 20,
            fontFamily: "'Space Grotesk', sans-serif",
          }}>
            Season 01 · Built on Starknet
          </div>

          <h1 style={{
            fontFamily: "'Space Grotesk', sans-serif",
            fontSize: "clamp(40px, 7vw, 72px)", fontWeight: 700,
            lineHeight: 1.08, margin: "0 0 16px",
            background: "linear-gradient(135deg, #ffffff 0%, #a78bfa 50%, #7F77DD 100%)",
            WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
          }}>
            Proof of Vibe
          </h1>

          <p style={{
            fontSize: 22, color: "rgba(255,255,255,0.5)", margin: "0 0 10px",
            fontFamily: "'Space Grotesk', sans-serif", fontWeight: 400,
          }}>
            Your onchain soul. Proven. Hidden.
          </p>

          <p style={{
            fontSize: 15, color: "rgba(255,255,255,0.35)",
            maxWidth: 540, margin: "0 auto 32px",
            lineHeight: 1.7,
          }}>
            A 14-day privacy game on Starknet. Mint your identity card,
            battle opponents in commit-reveal duels, and survive unmasked until the season ends.
          </p>

          <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" }}>
            {[
              { label: "⚡ No wallet install needed", sub: "Cartridge passkey auth" },
              { label: "🔒 Cryptographic privacy",    sub: "Commitment hashes onchain" },
              { label: "⚔️ 14-day season",            sub: "Mass reveal on Day 14" },
            ].map((b) => (
              <div key={b.label} style={{
                padding: "10px 18px", borderRadius: 10,
                background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)",
                textAlign: "center",
              }}>
                <div style={{ fontSize: 13, fontFamily: "'Space Grotesk', sans-serif", fontWeight: 500 }}>{b.label}</div>
                <div style={{ fontSize: 11, color: "rgba(255,255,255,0.35)", marginTop: 2 }}>{b.sub}</div>
              </div>
            ))}
          </div>
        </div>

        <hr style={{ border: "none", borderTop: "1px solid rgba(255,255,255,0.06)", margin: "0 0 56px" }} />

        {/* ── THREE ACTS ─── */}
        <Section title="How It Works" subtitle="Three acts. Fourteen days. One mass reveal.">
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16 }}>
            {[
              {
                act: "01", title: "Mint", color: "#7F77DD", icon: "🃏",
                body: "Connect with a passkey or take a 5-question quiz. Your Vibe Type is determined from your onchain history — then sealed in a cryptographic commitment. Nobody can see what you are.",
              },
              {
                act: "02", title: "Battle", color: "#D85A30", icon: "⚔️",
                body: "Challenge any card. Pick an attack targeting Identity, Geography, or Finance. The defender commits a counter-move. An oracle resolves both moves simultaneously — no front-running possible.",
              },
              {
                act: "03", title: "Reveal", color: "#BA7517", icon: "👁️",
                body: "Day 14 — the season clock hits zero. The salt key is published. Every hidden card reveals simultaneously. Win enough battles and you stay mysterious the longest.",
              },
            ].map((a) => (
              <div key={a.act} style={{
                padding: 20, borderRadius: 12,
                background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)",
                position: "relative", overflow: "hidden",
              }}>
                <div style={{
                  position: "absolute", top: 0, left: 0, right: 0, height: 2,
                  background: "linear-gradient(90deg, " + a.color + "88, " + a.color + "22)",
                }} />
                <div style={{ fontSize: 24, marginBottom: 8 }}>{a.icon}</div>
                <div style={{
                  fontSize: 10, textTransform: "uppercase", letterSpacing: "0.12em",
                  color: a.color, fontFamily: "'Space Grotesk', sans-serif",
                  marginBottom: 4, fontWeight: 600,
                }}>
                  Act {a.act}
                </div>
                <div style={{
                  fontSize: 17, fontWeight: 600,
                  fontFamily: "'Space Grotesk', sans-serif", marginBottom: 8,
                }}>
                  {a.title}
                </div>
                <p style={{ fontSize: 12.5, color: "rgba(255,255,255,0.5)", lineHeight: 1.65, margin: 0 }}>
                  {a.body}
                </p>
              </div>
            ))}
          </div>
        </Section>

        {/* ── BATTLE SYSTEM ─── */}
        <Section title="Battle System" subtitle="Commit-reveal. No bluffing. Oracle resolves in ~2 minutes.">
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
            <div style={{ padding: 20, borderRadius: 12, background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)" }}>
              <div style={{ fontSize: 12, fontFamily: "'Space Grotesk', sans-serif", fontWeight: 600, color: "rgba(255,255,255,0.5)", marginBottom: 14, textTransform: "uppercase", letterSpacing: "0.08em" }}>
                Three Attack Dimensions
              </div>
              {[
                { move: "🪪 Identity Attack",    what: "Exposes core Vibe Type label" },
                { move: "🌍 Geographic Strike",  what: "Reveals location-linked patterns" },
                { move: "💰 Financial Raid",     what: "Exposes DeFi usage and tx volume" },
              ].map((m) => (
                <div key={m.move} style={{
                  display: "flex", justifyContent: "space-between", alignItems: "flex-start",
                  padding: "10px 0", borderBottom: "1px solid rgba(255,255,255,0.05)", gap: 12,
                }}>
                  <span style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 13, fontWeight: 500 }}>{m.move}</span>
                  <span style={{ fontSize: 12, color: "rgba(255,255,255,0.4)", textAlign: "right", flexShrink: 0 }}>{m.what}</span>
                </div>
              ))}
            </div>

            <div style={{ padding: 20, borderRadius: 12, background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)" }}>
              <div style={{ fontSize: 12, fontFamily: "'Space Grotesk', sans-serif", fontWeight: 600, color: "rgba(255,255,255,0.5)", marginBottom: 14, textTransform: "uppercase", letterSpacing: "0.08em" }}>
                Winner Determination
              </div>
              {[
                { rule: "1. Privacy Score", desc: "Lower score wins — smaller footprint is harder to expose" },
                { rule: "2. Vibe Affinity",  desc: "Rock-paper-scissors type counters can override score" },
                { rule: "3. Move Index",     desc: "Higher move index breaks final ties" },
              ].map((r) => (
                <div key={r.rule} style={{ padding: "10px 0", borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
                  <div style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 13, fontWeight: 500, marginBottom: 2 }}>{r.rule}</div>
                  <div style={{ fontSize: 12, color: "rgba(255,255,255,0.4)" }}>{r.desc}</div>
                </div>
              ))}
            </div>
          </div>
        </Section>

        {/* ── PROGRESSIVE REVEAL ─── */}
        <Section title="Progressive Exposure" subtitle="Every loss cracks the card a little more.">
          <div style={{ display: "flex", gap: 0, alignItems: "stretch", borderRadius: 12, overflow: "hidden", border: "1px solid rgba(255,255,255,0.08)" }}>
            {REVEAL_MILESTONES.map((m, i) => (
              <div
                key={i}
                style={{
                  flex: 1, padding: "16px 10px", textAlign: "center",
                  background: i === REVEAL_MILESTONES.length - 1
                    ? "rgba(239,68,68,0.06)"
                    : i === 0 ? "rgba(34,197,94,0.06)" : "rgba(255,255,255,0.02)",
                  borderRight: i < REVEAL_MILESTONES.length - 1 ? "1px solid rgba(255,255,255,0.06)" : "none",
                }}
              >
                <div style={{ fontSize: 18, marginBottom: 6 }}>{m.icon}</div>
                <div style={{
                  fontSize: 10, fontFamily: "'Space Grotesk', sans-serif", fontWeight: 600,
                  color: i === 0 ? "#4ade80" : i === REVEAL_MILESTONES.length - 1 ? "#ef4444" : "rgba(255,255,255,0.7)",
                  marginBottom: 4,
                }}>
                  {m.losses === "1" ? "1 loss" : m.losses === "0" ? "0 losses" : m.losses}
                </div>
                <div style={{ fontSize: 11, fontWeight: 600, fontFamily: "'Space Grotesk', sans-serif", marginBottom: 3 }}>
                  {m.label}
                </div>
                <div style={{ fontSize: 10, color: "rgba(255,255,255,0.35)", lineHeight: 1.4 }}>
                  {m.desc}
                </div>
              </div>
            ))}
          </div>
        </Section>

        {/* ── VIBE TYPES ─── */}
        <Section title="Seven Vibe Types" subtitle="Each type has unique battle strengths, weaknesses, and color identity.">
          <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 8 }}>
            {VIBE_TYPES.map((v) => (
              <div key={v.name} style={{
                padding: "14px 10px", borderRadius: 10, textAlign: "center",
                background: "rgba(255,255,255,0.03)",
                border: "1px solid " + v.color + "30",
              }}>
                <div style={{
                  width: 32, height: 32, borderRadius: "50%",
                  background: v.color + "22", border: "1.5px solid " + v.color + "55",
                  margin: "0 auto 8px",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: 14,
                }}>
                  {v.emoji}
                </div>
                <div style={{
                  fontSize: 11, fontWeight: 600, fontFamily: "'Space Grotesk', sans-serif",
                  color: v.color, marginBottom: 4,
                }}>
                  {v.name.replace("The ", "")}
                </div>
                <div style={{ fontSize: 9.5, color: "rgba(255,255,255,0.35)", lineHeight: 1.5 }}>
                  {v.desc.split(". ")[0]}
                </div>
              </div>
            ))}
          </div>
        </Section>

        {/* ── TECH STACK ─── */}
        <Section title="Technical Foundation" subtitle="Privacy guarantees backed by cryptography, not promises.">
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 16 }}>
            {[
              {
                title: "Smart Contracts", color: "#7F77DD",
                items: [
                  "Cairo on Starknet Sepolia",
                  "VibeCard — ERC721 + commit-reveal",
                  "SeasonClock — mass reveal trigger",
                  "VibeLeaderboard — battle records",
                  "keccak256(owner + type + salt)",
                ],
              },
              {
                title: "Privacy Architecture", color: "#1D9E75",
                items: [
                  "Salt encrypted and stored on IPFS",
                  "Salt key published Day 14",
                  "Commit-reveal: no front-running",
                  "Publicly verifiable reveals",
                  "Roadmap: Garaga ZK proofs",
                ],
              },
              {
                title: "Frontend & Auth", color: "#BA7517",
                items: [
                  "Next.js 14 App Router + TypeScript",
                  "Cartridge passkey (no wallet install)",
                  "ArgentX + Braavos support",
                  "Framer Motion animations",
                  "Vercel deployment",
                ],
              },
            ].map((col) => (
              <div key={col.title} style={{
                padding: 20, borderRadius: 12,
                background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)",
              }}>
                <div style={{
                  fontSize: 13, fontWeight: 600, fontFamily: "'Space Grotesk', sans-serif",
                  color: col.color, marginBottom: 12,
                }}>
                  {col.title}
                </div>
                <ul style={{ margin: 0, padding: 0, listStyle: "none" }}>
                  {col.items.map((item) => (
                    <li key={item} style={{
                      fontSize: 12, color: "rgba(255,255,255,0.5)", lineHeight: 1.6,
                      paddingLeft: 12, position: "relative",
                    }}>
                      <span style={{ position: "absolute", left: 0, color: col.color }}>·</span>
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </Section>

        {/* ── WHY IT MATTERS ─── */}
        <Section title="Why Proof of Vibe?" subtitle="Privacy as gameplay, not just a feature.">
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
            {[
              {
                icon: "🧬", title: "Onchain Identity, Gamified",
                body: "Your wallet history isn't just data — it's your character class. Proof of Vibe turns the invisible fingerprint every wallet leaves behind into a playable card.",
              },
              {
                icon: "🔏", title: "Privacy as the Core Mechanic",
                body: "Most Web3 games ignore privacy. Here, staying hidden is how you win. Cryptographic commitments mean nobody — not even the contract — can see your type until battles force it open.",
              },
              {
                icon: "⏱️", title: "14-Day Tension",
                body: "The season clock creates urgency. Every battle you survive extends your anonymity. Day 14 is a forced reveal — making the final leaderboard a true measure of skill and strategy.",
              },
              {
                icon: "🚀", title: "Zero Barriers to Entry",
                body: "Cartridge passkey authentication means new-to-crypto users can play without installing a wallet. A 5-question quiz replaces the wallet scan for wallets with no onchain history.",
              },
            ].map((c) => (
              <div key={c.title} style={{
                display: "flex", gap: 14, padding: 18, borderRadius: 12,
                background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)",
              }}>
                <div style={{ fontSize: 24, flexShrink: 0 }}>{c.icon}</div>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 600, fontFamily: "'Space Grotesk', sans-serif", marginBottom: 6 }}>
                    {c.title}
                  </div>
                  <p style={{ fontSize: 12.5, color: "rgba(255,255,255,0.5)", lineHeight: 1.65, margin: 0 }}>
                    {c.body}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </Section>

        {/* ── ROADMAP ─── */}
        <Section title="Roadmap" subtitle="Season 01 is live. What comes next.">
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12 }}>
            {[
              {
                phase: "Now", label: "Season 01 Live",
                items: ["Starknet Sepolia testnet", "Cartridge passkey auth", "Commit-reveal battles", "14-day mass reveal"],
                color: "#4ade80",
              },
              {
                phase: "Soon", label: "Season 02",
                items: ["Mainnet deployment", "More vibe types", "Team battles (2v2)", "Seasonal rewards"],
                color: "#7F77DD",
              },
              {
                phase: "Later", label: "ZK Upgrade",
                items: ["Garaga ZK proofs", "Fully trustless reveals", "On-chain score verification", "Provably fair resolution"],
                color: "#BA7517",
              },
              {
                phase: "Vision", label: "Ecosystem",
                items: ["Cross-game identity layer", "Vibe Type as credential", "Third-party integrations", "DAO season governance"],
                color: "#185FA5",
              },
            ].map((p) => (
              <div key={p.phase} style={{
                padding: 16, borderRadius: 12,
                background: "rgba(255,255,255,0.03)",
                border: "1px solid " + p.color + "33",
              }}>
                <div style={{ marginBottom: 10 }}>
                  <span style={{
                    padding: "2px 8px", borderRadius: 20, fontSize: 9,
                    background: p.color + "22", color: p.color,
                    fontFamily: "'Space Grotesk', sans-serif", fontWeight: 600,
                    textTransform: "uppercase", letterSpacing: "0.08em",
                  }}>
                    {p.phase}
                  </span>
                </div>
                <div style={{ fontSize: 13, fontWeight: 600, fontFamily: "'Space Grotesk', sans-serif", marginBottom: 8 }}>
                  {p.label}
                </div>
                <ul style={{ margin: 0, padding: 0, listStyle: "none" }}>
                  {p.items.map((item) => (
                    <li key={item} style={{
                      fontSize: 11.5, color: "rgba(255,255,255,0.45)", lineHeight: 1.7,
                      paddingLeft: 12, position: "relative",
                    }}>
                      <span style={{ position: "absolute", left: 0, color: p.color }}>·</span>
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </Section>

        {/* ── CTA ─── */}
        <div style={{
          textAlign: "center", marginTop: 64, padding: "40px 24px",
          borderRadius: 16,
          background: "linear-gradient(135deg, rgba(127,119,221,0.08) 0%, rgba(8,8,16,0) 100%)",
          border: "1px solid rgba(127,119,221,0.15)",
        }}>
          <div style={{
            fontSize: 11, letterSpacing: "0.12em", textTransform: "uppercase",
            color: "#a78bfa", marginBottom: 12, fontFamily: "'Space Grotesk', sans-serif",
          }}>
            Season 01 · Live Now
          </div>
          <h2 style={{
            fontFamily: "'Space Grotesk', sans-serif",
            fontSize: 28, fontWeight: 700, margin: "0 0 12px",
          }}>
            Ready to prove your vibe?
          </h2>
          <p style={{ fontSize: 14, color: "rgba(255,255,255,0.4)", margin: "0 0 28px" }}>
            Mint your card. Stay hidden as long as you can.
          </p>
          <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" }}>
            <Link
              href="/onboard"
              style={{
                padding: "12px 28px", borderRadius: 10, fontSize: 14,
                background: "linear-gradient(135deg, #a78bfa, #7F77DD)",
                color: "#080810", fontWeight: 600,
                fontFamily: "'Space Grotesk', sans-serif", textDecoration: "none",
              }}
            >
              Mint Your Card →
            </Link>
            <Link
              href="/demo"
              style={{
                padding: "12px 28px", borderRadius: 10, fontSize: 14,
                background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.12)",
                color: "rgba(255,255,255,0.7)",
                fontFamily: "'Space Grotesk', sans-serif", textDecoration: "none",
              }}
            >
              Try the Demo
            </Link>
          </div>
        </div>

        <div style={{
          textAlign: "center", marginTop: 48,
          fontSize: 12, color: "rgba(255,255,255,0.2)",
          fontFamily: "'Space Grotesk', sans-serif",
        }}>
          Proof of Vibe · Built on Starknet · Season 01
        </div>
      </div>
    </div>
  );
}

function Section({ title, subtitle, children }: { title: string; subtitle?: string; children: React.ReactNode }) {
  return (
    <section style={{ marginBottom: 56 }}>
      <div style={{ marginBottom: 20 }}>
        <h2 style={{
          fontFamily: "'Space Grotesk', sans-serif",
          fontSize: 22, fontWeight: 700,
          margin: "0 0 4px", color: "rgba(255,255,255,0.92)",
        }}>
          {title}
        </h2>
        {subtitle && (
          <p style={{ fontSize: 13, color: "rgba(255,255,255,0.4)", margin: 0 }}>{subtitle}</p>
        )}
      </div>
      {children}
    </section>
  );
}
