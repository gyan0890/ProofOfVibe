"use client";

import { useRef, useState } from "react";
import { motion, useMotionValue, useSpring, useTransform } from "framer-motion";
import { CardData, TraitRevealState, VibeTypeIndex } from "@/lib/types";
import { VIBE_TYPES, getVibeType } from "@/lib/vibeTypes";
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
  fill,
  color,
  revealed,
}: {
  label: string;
  fill: number;
  color: string;
  revealed: boolean;
}) {
  return (
    <div className="flex items-center gap-2 w-full">
      <span
        className="text-[10px] font-card tracking-widest w-28 shrink-0 truncate"
        style={{ color: revealed ? "rgba(255,255,255,0.7)" : "rgba(255,255,255,0.3)" }}
      >
        {revealed ? label.toUpperCase() : "░░░░░░░"}
      </span>
      <div
        className="flex-1 h-1 rounded-full"
        style={{ background: "rgba(255,255,255,0.08)" }}
      >
        <motion.div
          className="h-1 rounded-full"
          style={{ background: color }}
          initial={{ width: "0%" }}
          animate={{ width: `${fill}%` }}
          transition={{ duration: 0.8, ease: "easeOut" }}
        />
      </div>
    </div>
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

  const traitLabels: [string, boolean][] = [
    [traits[0], !!traitReveal.trait1Word || isTypeRevealed],
    [traits[1], !!traitReveal.trait2Word || isTypeRevealed],
    [traits[2], traitReveal.barFillsAccurate || isTypeRevealed],
  ];

  const traitFills = traitReveal.barFillsAccurate || isTypeRevealed
    ? [72, 58, 84]
    : [
        Math.floor(50 + Math.random() * 30),
        Math.floor(40 + Math.random() * 30),
        Math.floor(60 + Math.random() * 30),
      ];

  const sizeMap = { sm: { w: 200, h: 300 }, md: { w: 320, h: 480 }, lg: { w: 380, h: 570 } };
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
              className="absolute inset-2 rounded-full flex items-center justify-center"
              style={{
                background: `radial-gradient(circle at 40% 40%, ${primaryColor}CC, ${primaryColor}44)`,
              }}
              animate={{ scale: [1, 1.04, 1] }}
              transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
            >
              {isTypeRevealed ? (
                <motion.span
                  className="text-white font-card font-medium text-sm text-center px-2 leading-tight"
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.4 }}
                >
                  {vibeType?.name}
                </motion.span>
              ) : (
                <span className="text-white/60 font-card text-5xl font-light">?</span>
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
                label={revealed && vibeType ? vibeType.traits[i] : "░░░░░░░"}
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
