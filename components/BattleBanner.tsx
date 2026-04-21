"use client";

import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { useMyCard } from "@/hooks/useMyCard";
import { usePendingChallenges } from "@/hooks/usePendingChallenges";

/**
 * Global fixed banner that appears on every page when the connected wallet
 * has pending battles to respond to (defender) or battles ready to resolve
 * (challenger). Rendered in the root layout just below the Nav.
 */
export function BattleBanner() {
  const { card } = useMyCard();
  const myTokenId = card?.tokenId ?? null;
  const { challenges, toResolve } = usePendingChallenges(myTokenId);

  const hasActions = challenges.length > 0 || toResolve.length > 0;

  return (
    <AnimatePresence>
      {hasActions && (
        <motion.div
          key="battle-banner"
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          className="fixed top-[52px] left-0 right-0 z-40 flex flex-col items-center gap-1 px-4 py-1.5 pointer-events-none"
        >
          {/* Defender: battles I need to respond to */}
          {challenges.length > 0 && (
            <div
              className="flex items-center gap-3 px-4 py-2 rounded-xl shadow-lg pointer-events-auto"
              style={{
                background: "rgba(239,68,68,0.15)",
                border: "1px solid rgba(239,68,68,0.4)",
                backdropFilter: "blur(12px)",
              }}
            >
              <motion.span
                animate={{ scale: [1, 1.2, 1] }}
                transition={{ duration: 0.6, repeat: Infinity, repeatDelay: 1.5 }}
              >
                ⚔️
              </motion.span>
              <span className="text-sm font-card text-white">
                {challenges.length === 1
                  ? "You've been challenged!"
                  : `${challenges.length} challenges waiting!`}
              </span>
              <div className="flex gap-2">
                {challenges.map((c) => (
                  <Link
                    key={c.battleId}
                    href={`/battle/respond/${c.battleId}`}
                    className="px-3 py-1 rounded-lg text-xs font-card font-medium text-white transition-all hover:scale-105"
                    style={{
                      background: "rgba(239,68,68,0.5)",
                      border: "1px solid rgba(239,68,68,0.6)",
                    }}
                  >
                    Respond #{c.battleId}
                  </Link>
                ))}
              </div>
            </div>
          )}

          {/* Challenger: defender committed — oracle will auto-resolve within 2 min */}
          {toResolve.length > 0 && (
            <div
              className="flex items-center gap-3 px-4 py-2 rounded-xl shadow-lg pointer-events-auto"
              style={{
                background: "rgba(245,158,11,0.10)",
                border: "1px solid rgba(245,158,11,0.3)",
                backdropFilter: "blur(12px)",
              }}
            >
              <motion.span
                animate={{ rotate: 360 }}
                transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                style={{ display: "inline-block" }}
              >
                ⚙️
              </motion.span>
              <span className="text-sm font-card text-white/80">
                {toResolve.length === 1
                  ? "Defender responded — resolving automatically…"
                  : `${toResolve.length} battles resolving automatically…`}
              </span>
              <span className="text-xs font-ui text-white/30">~2 min</span>
            </div>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
