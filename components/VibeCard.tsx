"use client";

import { useRef, useState } from "react";
import { motion, useMotionValue, useSpring, useTransform } from "framer-motion";
import { CardData, TraitRevealState, VibeTypeIndex } from "@/lib/types";
import { VIBE_TYPES, getVibeType } from "@/lib/vibeTypes";
import { VIBE_CREATURES } from "@/lib/vibeCreatures";
import { truncateAddress } from "@/lib/utils";
import { StarknetLogo } from "./icons/StarknetLogo";

interface VibeCardProps {
  card: CardData;
  interactive?: boolean;
  size?: "sm" | "md" | "lg";
  isTargeted?: boolean;
  justRevealed?: boolean;
  className?: string;
}

function TraitBar({
  label,
  subLabel,
  fill,
  color,
  revealed,
}: {
  label: string;
  subLabel?: string;
  fill: number;
  color: string;
  revealed: boolean;
}) {
  const CRACK_COLOR = "#ef4444";
  return (
    <motion.div
      className="flex flex-col gap-0.5 w-full rounded-lg px-1.5 py-1"
      animate={revealed ? { background: "rgba(239,68,68,0.06)" } : { background: "rgba(0,0,0,0)" }}
      transition={{ duration: 0.5 }}
      style={{ border: revealed ? "1px solid rgba(239,68,68,0.18)" : "1px solid transparent" }}
    >
      <div className="flex items-center gap-2 w-full">
        {/* Lock/unlock icon */}
        <span className="text-[9px] shrink-0" style={{ opacity: revealed ? 1 : 0.3 }}>
          {revealed ? "🔓" : "🔒"}
        </span>
        <span
          className="text-[10px] font-card tracking-widest w-24 shrink-0 truncate"
          style={{ color: revealed ? CRACK_COLOR : "rgba(255,255,255,0.25)" }}
        >
          {revealed ? label.toUpperCase() : "░░░░░░░"}
        </span>
        <div
          className="flex-1 h-1.5 rounded-full overflow-hidden"
          style={{ background: "rgba(255,255,255,0.08)" }}
        >
          <motion.div
            className="h-full rounded-full"
            style={{
              background: revealed
                ? `linear-gradient(90deg, ${CRACK_COLOR}cc, ${CRACK_COLOR})`
                : color,
              boxShadow: revealed ? `0 0 6px ${CRACK_COLOR}88` : "none",
            }}
            initial={{ width: "0%" }}
            animate={{ width: `${fill}%` }}
            transition={{ duration: 0.8, ease: "easeOut" }}
          />
        </div>
        {/* Score number — shown when revealed */}
        {revealed && (
          <motion.span
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-[9px] font-card shrink-0 tabular-nums"
            style={{ color: CRACK_COLOR, minWidth: "2rem", textAlign: "right" }}
          >
            {fill}/100
          </motion.span>
        )}
      </div>
      {/* Sub-label */}
      {revealed && subLabel && (
        <motion.p
          initial={{ opacity: 0, y: -2 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="text-[9px] font-ui truncate"
          style={{ color: CRACK_COLOR + "aa", paddingLeft: "calc(1.25rem + 6.5rem + 0.5rem)" }}
        >
          {subLabel}
        </motion.p>
      )}
    </motion.div>
  );
}

export function VibeCard({
  card,
  interactive = true,
  size = "md",
  isTargeted = false,
  justRevealed = false,
  className = "",
}: VibeCardProps) {
  const cardRef = useRef<HTMLDivElement>(null);

  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);
  const rotateX = useSpring(useTransform(mouseY, [-1, 1], [12, -12]), {
    stiffness: 150,
    damping: 20,
  });
  const rotateY = useSpring(useTransform(mouseX, [-1, 1], [-12, 12]), {
    stiffness: 150,
    damping: 20,
  });

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!interactive || !cardRef.current) return;
    const rect = cardRef.current.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width - 0.5) * 2;
    const y = ((e.clientY - rect.top) / rect.height - 0.5) * 2;
    mouseX.set(x);
    mouseY.set(y);
  };

  const handleMouseLeave = () => {
    mouseX.set(0);
    mouseY.set(0);
  };

  const { traitReveal, revealedType, battleRecord, personaName, isAnchored, owner } = card;
  const isPaletteRevealed = traitReveal.paletteRevealed;
  const isTypeRevealed = traitReveal.typeRevealed && revealedType !== undefined;

  const vibeType =
    isTypeRevealed && revealedType !== undefined
      ? getVibeType(revealedType)
      : isPaletteRevealed && revealedType !== undefined
      ? getVibeType(revealedType)
      : null;

  const primaryColor = vibeType ? vibeType.primary : "#888780";
  const traits = vibeType ? vibeType.traits : (["░░░░░░░", "░░░░░░░", "░░░░░░░"] as [string, string, string]);

  // Privacy cards have 4 bars (identity, geographic, behavioral, financial).
  // Quiz cards keep 3 bars mapped to their vibe type trait words.
  const isPrivacyCard = !!card.privacyProfile;
  const p = card.privacyProfile;

  // Bar order: IDENTITY (trait1Word) | GEOGRAPHIC (trait2Word) | FINANCIAL (trait3Word) | BEHAVIORAL (barFillsAccurate milestone)
  // Matches contract: move 0→identity, move 1→geographic, move 2→financial, loss≥2→behavioral hint
  const PRIVACY_LABELS = ["IDENTITY", "GEOGRAPHIC", "FINANCIAL", "BEHAVIORAL"];
  const privacyDescriptions = p
    ? [p.identityLabel, p.geographicLabel, p.financialLabel, p.behavioralLabel]
    : ["", "", "", ""];

  // Each bar: [displayLabel, isRevealed]
  const traitLabels: [string, boolean][] = isPrivacyCard
    ? [
        [PRIVACY_LABELS[0], !!traitReveal.trait1Word || isTypeRevealed],
        [PRIVACY_LABELS[1], !!traitReveal.trait2Word || isTypeRevealed],
        [PRIVACY_LABELS[2], !!traitReveal.trait3Word || isTypeRevealed],
        [PRIVACY_LABELS[3], traitReveal.barFillsAccurate || isTypeRevealed],
      ]
    : [
        [traitReveal.trait1Word || traits[0], !!traitReveal.trait1Word || isTypeRevealed],
        [traitReveal.trait2Word || traits[1], !!traitReveal.trait2Word || isTypeRevealed],
        [traits[2], traitReveal.barFillsAccurate || isTypeRevealed],
      ];

  // Bar fills order: [identity, geographic, financial, behavioral]
  const privacyFills: [number, number, number, number] | null = p
    ? [p.identityLeakage, p.geographicSignal, p.financialProfile, p.behavioralFingerprint]
    : null;

  const traitFills: number[] = isPrivacyCard
    ? traitReveal.barFillsAccurate || isTypeRevealed
      ? (privacyFills ?? [72, 58, 65, 84])
      : [
          traitReveal.trait1Word && privacyFills ? privacyFills[0] : Math.floor(45 + Math.random() * 35),
          traitReveal.trait2Word && privacyFills ? privacyFills[1] : Math.floor(40 + Math.random() * 35),
          traitReveal.trait3Word && privacyFills ? privacyFills[2] : Math.floor(40 + Math.random() * 35),
          Math.floor(55 + Math.random() * 30),
        ]
    : traitReveal.barFillsAccurate || isTypeRevealed
      ? [72, 58, 84]
      : [
          traitReveal.trait1Word ? 72 : Math.floor(45 + Math.random() * 35),
          traitReveal.trait2Word ? 58 : Math.floor(40 + Math.random() * 35),
          Math.floor(55 + Math.random() * 30),
        ];

  // Sub-labels (privacy scan description shown under each revealed bar)
  const privacySubLabels: string[] = isPrivacyCard
    ? [
        traitReveal.trait1Word || isTypeRevealed ? privacyDescriptions[0] : "",
        traitReveal.trait2Word || isTypeRevealed ? privacyDescriptions[1] : "",
        traitReveal.trait3Word || isTypeRevealed ? privacyDescriptions[2] : "",
        traitReveal.barFillsAccurate || isTypeRevealed ? privacyDescriptions[3] : "",
      ]
    : ["", "", ""];

  // Privacy cards are slightly taller to fit the 4th bar
  const sizeMap = {
    sm: { w: 200, h: isPrivacyCard ? 320 : 300 },
    md: { w: 320, h: isPrivacyCard ? 510 : 480 },
    lg: { w: 380, h: isPrivacyCard ? 600 : 570 },
  };
  const { w, h } = sizeMap[size];

  const cardStyle: React.CSSProperties = {
    width: w,
    height: h,
    minWidth: w,
    minHeight: h,
    perspective: 800,
  };

  return (
    <motion.div
      ref={cardRef}
      style={{ ...cardStyle, rotateX: interactive ? rotateX : 0, rotateY: interactive ? rotateY : 0, transformStyle: "preserve-3d" }}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      className={`relative cursor-default select-none ${className} ${justRevealed ? "animate-orb-burst" : ""}`}
    >
      {/* Halo behind card */}
      <motion.div
        className="absolute inset-0 rounded-[20px] pointer-events-none"
        style={{
          background: `radial-gradient(circle, ${primaryColor}4D 0%, transparent 70%)`,
          filter: "blur(24px)",
        }}
        animate={{ scale: [1.0, 1.08, 1.0] }}
        transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
      />

      {/* Card surface */}
      <div
        className={`
          relative w-full h-full rounded-[20px] overflow-hidden flex flex-col
          scanlines grain
          ${isTargeted ? "animate-shake" : ""}
        `}
        style={{
          background: "rgba(255,255,255,0.04)",
          backdropFilter: "blur(12px)",
          border: `1px solid ${isTypeRevealed ? primaryColor + "99" : isPaletteRevealed ? primaryColor + "66" : "rgba(255,255,255,0.08)"}`,
          transition: "border-color 0.4s ease",
        }}
      >
        {/* Crack overlay — visible when lossCount >= 1, intensifies with each loss */}
        {(traitReveal.lossCount ?? 0) >= 1 && (() => {
          const losses = traitReveal.lossCount ?? 0;
          const baseAlpha = Math.min(0.08 + losses * 0.06, 0.40);
          const dimAlpha = Math.min(0.05 + losses * 0.04, 0.28);
          const glowAlpha = Math.min(0.03 + losses * 0.025, 0.15);
          return (
            <motion.div
              className="absolute inset-0 rounded-[20px] pointer-events-none overflow-hidden"
              style={{ zIndex: 10 }}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.9, ease: "easeIn" }}
            >
              {/* Corner glow at crack origin (top-left) */}
              <div
                className="absolute top-0 left-0 w-40 h-40 rounded-tl-[20px]"
                style={{
                  background: `radial-gradient(ellipse at 0% 0%, rgba(239,68,68,${glowAlpha}), transparent 65%)`,
                }}
              />
              {/* SVG crack lines */}
              <svg
                className="absolute inset-0 w-full h-full"
                viewBox="0 0 320 480"
                preserveAspectRatio="none"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                {/* Primary crack — zigzag from top-left toward center */}
                <motion.path
                  d="M 18 0 L 52 48 L 38 88 L 78 148 L 60 210 L 105 300 L 88 390"
                  stroke={`rgba(239,68,68,${baseAlpha})`}
                  strokeWidth="0.9"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  initial={{ pathLength: 0 }}
                  animate={{ pathLength: 1 }}
                  transition={{ duration: 0.8, ease: "easeOut" }}
                />
                {/* Branch A — short spur off primary */}
                <motion.path
                  d="M 52 48 L 115 72 L 155 62"
                  stroke={`rgba(239,68,68,${dimAlpha})`}
                  strokeWidth="0.6"
                  strokeLinecap="round"
                  initial={{ pathLength: 0 }}
                  animate={{ pathLength: 1 }}
                  transition={{ duration: 0.6, delay: 0.3, ease: "easeOut" }}
                />
                {/* Branch B — off primary at mid-card */}
                <motion.path
                  d="M 78 148 L 128 165 L 152 155"
                  stroke={`rgba(239,68,68,${dimAlpha * 0.8})`}
                  strokeWidth="0.5"
                  strokeLinecap="round"
                  initial={{ pathLength: 0 }}
                  animate={{ pathLength: 1 }}
                  transition={{ duration: 0.5, delay: 0.5, ease: "easeOut" }}
                />
                {/* Secondary crack — right side, appears at loss >= 2 */}
                {losses >= 2 && (
                  <motion.path
                    d="M 320 175 L 262 208 L 278 268 L 238 345 L 255 420"
                    stroke={`rgba(239,68,68,${dimAlpha})`}
                    strokeWidth="0.7"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    initial={{ pathLength: 0 }}
                    animate={{ pathLength: 1 }}
                    transition={{ duration: 0.7, ease: "easeOut" }}
                  />
                )}
                {/* Tertiary crack — bottom-center, appears at loss >= 4 */}
                {losses >= 4 && (
                  <motion.path
                    d="M 160 480 L 148 415 L 170 370 L 145 320"
                    stroke={`rgba(239,68,68,${dimAlpha * 0.9})`}
                    strokeWidth="0.6"
                    strokeLinecap="round"
                    initial={{ pathLength: 0 }}
                    animate={{ pathLength: 1 }}
                    transition={{ duration: 0.6, ease: "easeOut" }}
                  />
                )}
                {/* Hair-line micro-cracks near origin */}
                <motion.path
                  d="M 38 88 L 22 110"
                  stroke={`rgba(239,68,68,${dimAlpha * 0.6})`}
                  strokeWidth="0.4"
                  strokeLinecap="round"
                  initial={{ pathLength: 0 }}
                  animate={{ pathLength: 1 }}
                  transition={{ duration: 0.4, delay: 0.6, ease: "easeOut" }}
                />
                <motion.path
                  d="M 60 210 L 30 225 L 18 260"
                  stroke={`rgba(239,68,68,${dimAlpha * 0.5})`}
                  strokeWidth="0.35"
                  strokeLinecap="round"
                  initial={{ pathLength: 0 }}
                  animate={{ pathLength: 1 }}
                  transition={{ duration: 0.4, delay: 0.7, ease: "easeOut" }}
                />
              </svg>
            </motion.div>
          );
        })()}
        {/* Top bar */}
        <div className="px-4 pt-4 pb-3">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-card tracking-[0.2em] text-white/40 uppercase">
              Proof of Vibe
            </span>
            <StarknetLogo size={16} className="opacity-60" />
          </div>
          <div
            className="mt-2 h-px w-full"
            style={{ background: `${primaryColor}66` }}
          />
          <p className="mt-1 text-[10px] font-ui text-white/30 tracking-wider">
            SEASON 01 · DAY {card.mintTimestamp ? "?" : "—"} OF 14
          </p>
        </div>

        {/* Aura orb */}
        <div className="flex-1 flex flex-col items-center justify-center gap-3 px-4">
          <div className="relative" style={{ width: 160, height: 160 }}>
            {/* Rotating gradient ring */}
            <motion.div
              className="absolute inset-0 rounded-full"
              style={{
                background: `conic-gradient(from 0deg, ${primaryColor}, ${primaryColor}33, ${primaryColor}88, ${primaryColor})`,
                filter: "blur(4px)",
              }}
              animate={{ rotate: 360 }}
              transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
            />
            {/* Orb fill */}
            <motion.div
              className="absolute inset-2 rounded-full flex items-center justify-center overflow-hidden"
              style={{
                background: `radial-gradient(circle at 40% 40%, ${primaryColor}CC, ${primaryColor}44)`,
              }}
              animate={{ scale: [1, 1.04, 1] }}
              transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
            >
              {/* Creature illustration — visible whenever vibe type is known */}
              {revealedType !== undefined && VIBE_CREATURES[revealedType] && (() => {
                const Creature = VIBE_CREATURES[revealedType];
                return (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <Creature size={156} />
                  </div>
                );
              })()}

              {/* Type name overlay — only when fully revealed */}
              {isTypeRevealed ? (
                <motion.span
                  className="relative z-10 text-white font-card font-medium text-sm text-center px-2 leading-tight"
                  style={{ textShadow: "0 0 8px rgba(0,0,0,0.8)" }}
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.4 }}
                >
                  {vibeType?.name}
                </motion.span>
              ) : (
                <span className="relative z-10 text-white/60 font-card text-5xl font-light" style={{ textShadow: "0 0 12px rgba(0,0,0,0.9)" }}>?</span>
              )}
            </motion.div>
          </div>

          {/* Type pill */}
          <div
            className="pill"
            style={{
              background: isTypeRevealed
                ? `${primaryColor}22`
                : isPaletteRevealed
                ? `${primaryColor}11`
                : "rgba(255,255,255,0.06)",
              border: `1px solid ${isTypeRevealed ? primaryColor + "66" : "rgba(255,255,255,0.1)"}`,
              color: isTypeRevealed ? primaryColor : "rgba(255,255,255,0.25)",
            }}
          >
            {isTypeRevealed ? (
              vibeType?.name?.toUpperCase()
            ) : (
              <>
                <span className="opacity-60">🔒</span>
                <span>▓▓▓▓▓▓▓▓</span>
              </>
            )}
          </div>

          {/* Trait bars */}
          <div className="w-full flex flex-col gap-2 mt-1">
            {traitLabels.map(([label, revealed], i) => (
              <TraitBar
                key={i}
                label={label}
                subLabel={privacySubLabels[i]}
                fill={traitFills[i]}
                color={primaryColor}
                revealed={revealed}
              />
            ))}
          </div>
        </div>

        {/* Battle record */}
        <div className="px-4 py-2 border-t border-white/5">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-ui text-white/30 tracking-wider">
              W {battleRecord.wins} · L {battleRecord.losses} · {battleRecord.total} BATTLES
            </span>
            <div className="flex gap-1">
              {card.recentBattles.slice(-5).map((b, i) => (
                <span
                  key={i}
                  className="text-[9px] font-bold px-1 py-0.5 rounded"
                  style={{
                    background: b.won ? "rgba(34,197,94,0.15)" : "rgba(239,68,68,0.15)",
                    color: b.won ? "#22c55e" : "#ef4444",
                    border: `1px solid ${b.won ? "rgba(34,197,94,0.3)" : "rgba(239,68,68,0.3)"}`,
                  }}
                >
                  {b.won ? "W" : "L"}
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* Identity footer */}
        <div className="px-4 pb-4 pt-1">
          <div className="flex items-center gap-2">
            <span
              className="w-1.5 h-1.5 rounded-full shrink-0"
              style={{ background: isAnchored ? "#22c55e" : "#f59e0b" }}
            />
            <span className="text-[10px] font-card text-white/40 tracking-wide truncate flex-1">
              {isAnchored ? truncateAddress(owner) : personaName}
            </span>
            <span
              className="text-[9px] font-ui tracking-widest uppercase"
              style={{ color: isAnchored ? "#22c55e" : "#f59e0b" }}
            >
              {isAnchored ? "ONCHAIN" : "UNANCHORED"}
            </span>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
