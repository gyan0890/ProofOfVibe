"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "framer-motion";
import { useAccount, useDisconnect } from "@starknet-react/core";
import { useState } from "react";
import { truncateAddress } from "@/lib/utils";
import { clearLocalCard } from "@/lib/storage";
import { usePendingChallenges } from "@/hooks/usePendingChallenges";
import { useMyCard } from "@/hooks/useMyCard";

export function Nav() {
  const pathname = usePathname();
  const { address, status } = useAccount();
  const { disconnect } = useDisconnect();
  const [showMenu, setShowMenu] = useState(false);
  const [copied, setCopied] = useState(false);
  const [navHandle, setNavHandle] = useState("");
  const [navHandleSaved, setNavHandleSaved] = useState(false);
  const isConnected = status === "connected" && !!address;

  // Always resolve tokenId from chain so notifications work even on a fresh session
  // (localStorage alone fails when the user hasn't visited /reveal yet)
  const { card: myCard } = useMyCard();
  const myTokenId = myCard?.tokenId ?? null;

  const { challenges, toResolve } = usePendingChallenges(myTokenId);
  // Total badge = battles I need to respond to + battles ready for me to resolve
  const totalActionable = challenges.length + toResolve.length;

  // Load X handle when wallet connects
  if (typeof window !== "undefined" && isConnected && address && !navHandle) {
    fetch(`/api/x-handle?address=${encodeURIComponent(address)}`)
      .then((r) => r.json())
      .then(({ handle }) => { if (handle && !navHandle) setNavHandle(handle); })
      .catch(() => {});
  }

  const links = [
    { href: "/leaderboard", label: "⚔️ Battle" },
    { href: "/season", label: "Season" },
    { href: "/how-it-works", label: "Guide" },
  ];

  return (
    <motion.header
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-5 py-3"
      style={{
        background: "rgba(8,8,16,0.75)",
        backdropFilter: "blur(12px)",
        borderBottom: "1px solid rgba(255,255,255,0.06)",
      }}
    >
      {/* Logo */}
      <Link href="/" className="font-card text-sm font-medium text-white/80 hover:text-white transition-colors tracking-wide">
        Proof of Vibe
      </Link>

      {/* Links + wallet */}
      <nav className="flex items-center gap-1">
        {links.map((link) => {
          const isActive = pathname === link.href;
          return (
            <Link
              key={link.href}
              href={link.href}
              className="px-3 py-1.5 rounded-lg text-xs font-card transition-all"
              style={{
                background: isActive ? "rgba(127,119,221,0.15)" : "transparent",
                color: isActive ? "rgba(255,255,255,0.9)" : "rgba(255,255,255,0.45)",
                border: isActive ? "1px solid rgba(127,119,221,0.3)" : "1px solid transparent",
              }}
            >
              {link.label}
            </Link>
          );
        })}

        {/* Wallet button */}
        {isConnected ? (
          <div className="relative ml-2">
            <button
              onClick={() => setShowMenu((v) => !v)}
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-card transition-all"
              style={{
                background: totalActionable > 0 ? "rgba(239,68,68,0.12)" : "rgba(34,197,94,0.1)",
                border: `1px solid ${totalActionable > 0 ? "rgba(239,68,68,0.35)" : "rgba(34,197,94,0.25)"}`,
                color: "rgba(255,255,255,0.85)",
              }}
            >
              <span className="w-1.5 h-1.5 rounded-full" style={{ background: totalActionable > 0 ? "#ef4444" : "#4ade80" }} />
              {truncateAddress(address)}
              {totalActionable > 0 && (
                <motion.span
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  className="flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[10px] font-bold"
                  style={{ background: "rgba(239,68,68,0.9)", color: "white" }}
                >
                  ⚔️ {totalActionable}
                </motion.span>
              )}
            </button>

            {showMenu && (
              <motion.div
                initial={{ opacity: 0, y: -4, scale: 0.97 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                className="absolute right-0 top-full mt-1 rounded-xl overflow-hidden shadow-xl z-50 min-w-[180px]"
                style={{ background: "#111118", border: "1px solid rgba(255,255,255,0.1)" }}
              >
                {/* Full address + copy */}
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(address ?? "");
                    setCopied(true);
                    setTimeout(() => setCopied(false), 2000);
                  }}
                  className="w-full flex items-center justify-between gap-2 px-4 py-2.5 text-xs font-card hover:bg-white/5 transition-colors group"
                >
                  <span className="font-mono text-white/40 truncate max-w-[120px]">
                    {address?.slice(0, 8)}…{address?.slice(-6)}
                  </span>
                  <span className={copied ? "text-green-400" : "text-white/30 group-hover:text-white/60"}>
                    {copied ? "✓ Copied" : "Copy"}
                  </span>
                </button>
                <div className="border-t border-white/8 mb-1" />

                <Link
                  href="/reveal"
                  onClick={() => setShowMenu(false)}
                  className="flex items-center gap-2 px-4 py-2.5 text-xs font-card text-white/70 hover:text-white hover:bg-white/5 transition-colors"
                >
                  🃏 My Card
                </Link>

                {/* Defender: battles I need to respond to */}
                {challenges.map((c) => (
                  <Link
                    key={`defend-${c.battleId}`}
                    href={`/battle/respond/${c.battleId}`}
                    onClick={() => setShowMenu(false)}
                    className="flex items-center justify-between gap-2 px-4 py-2.5 text-xs font-card hover:bg-red-500/5 transition-colors"
                    style={{ color: "#ef4444" }}
                  >
                    <span>⚔️ Battle #{c.battleId}</span>
                    <span className="text-[10px] text-red-400/60 shrink-0">respond →</span>
                  </Link>
                ))}

                {/* Challenger: defender committed — oracle auto-resolves within ~2 min */}
                {toResolve.map((b) => (
                  <div
                    key={`resolve-${b.battleId}`}
                    className="flex items-center justify-between gap-2 px-4 py-2.5 text-xs font-card"
                    style={{ color: "#f59e0b", opacity: 0.7 }}
                  >
                    <span>⚙️ Battle #{b.battleId}</span>
                    <span className="text-[10px] text-amber-400/60 shrink-0">resolving…</span>
                  </div>
                ))}

                <Link
                  href="/leaderboard"
                  onClick={() => setShowMenu(false)}
                  className="flex items-center gap-2 px-4 py-2.5 text-xs font-card text-white/70 hover:text-white hover:bg-white/5 transition-colors"
                >
                  ⚔️ Battle
                </Link>
                <div className="border-t border-white/8 my-1" />

                {/* X handle */}
                <div className="px-3 py-2">
                  <p className="text-[9px] text-white/25 font-ui tracking-wider uppercase mb-1.5">𝕏 Handle</p>
                  <div className="flex gap-1.5">
                    <input
                      type="text"
                      placeholder="@yourhandle"
                      value={navHandle}
                      onChange={(e) => { setNavHandle(e.target.value); setNavHandleSaved(false); }}
                      onClick={(e) => e.stopPropagation()}
                      className="flex-1 min-w-0 px-2 py-1.5 rounded-md text-[11px] font-ui text-white/70 bg-white/5 border border-white/10 focus:outline-none focus:border-white/20 placeholder-white/20"
                    />
                    <button
                      onClick={async (e) => {
                        e.stopPropagation();
                        const cleaned = navHandle.replace(/^@/, "").trim();
                        if (!address) return;
                        await fetch("/api/x-handle", {
                          method: "POST",
                          headers: { "Content-Type": "application/json" },
                          body: JSON.stringify({ address, handle: cleaned }),
                        }).catch(() => {});
                        const { updateLocalCard } = await import("@/lib/storage");
                        updateLocalCard({ xHandle: cleaned });
                        setNavHandleSaved(true);
                        setTimeout(() => setNavHandleSaved(false), 2000);
                      }}
                      className="shrink-0 px-2 py-1.5 rounded-md text-[11px] font-card text-white/60 hover:text-white transition-colors"
                      style={{ background: "rgba(29,161,242,0.1)", border: "1px solid rgba(29,161,242,0.2)" }}
                    >
                      {navHandleSaved ? "✓" : "Save"}
                    </button>
                  </div>
                </div>
                <div className="border-t border-white/8 my-1" />
                <button
                  onClick={() => { clearLocalCard(); disconnect(); setShowMenu(false); }}
                  className="w-full flex items-center gap-2 px-4 py-2.5 text-xs font-card text-red-400/70 hover:text-red-400 hover:bg-red-500/5 transition-colors"
                >
                  Disconnect
                </button>
              </motion.div>
            )}
          </div>
        ) : (
          <Link
            href="/onboard"
            className="ml-2 px-4 py-1.5 rounded-lg text-xs font-card font-medium text-[#080810] transition-all hover:scale-105"
            style={{ background: "linear-gradient(135deg, #a78bfa, #7F77DD)" }}
          >
            Play →
          </Link>
        )}
      </nav>
    </motion.header>
  );
}
