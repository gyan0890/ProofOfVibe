"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "framer-motion";
import { useAccount, useDisconnect } from "@starknet-react/core";
import { useState } from "react";
import { truncateAddress } from "@/lib/utils";
import { clearLocalCard } from "@/lib/storage";

export function Nav() {
  const pathname = usePathname();
  const { address, status } = useAccount();
  const { disconnect } = useDisconnect();
  const [showMenu, setShowMenu] = useState(false);
  const [copied, setCopied] = useState(false);
  const isConnected = status === "connected" && !!address;

  const links = [
    { href: "/leaderboard", label: "⚔️ Leaderboard" },
    { href: "/season", label: "Season" },
    { href: "/demo", label: "Demo" },
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

        {/* Wallet / Play button */}
        {isConnected ? (
          <div className="relative ml-2">
            <button
              onClick={() => setShowMenu((v) => !v)}
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-card transition-all"
              style={{
                background: "rgba(34,197,94,0.1)",
                border: "1px solid rgba(34,197,94,0.25)",
                color: "rgba(255,255,255,0.85)",
              }}
            >
              <span className="w-1.5 h-1.5 rounded-full bg-green-400" />
              {truncateAddress(address)}
            </button>

            {showMenu && (
              <motion.div
                initial={{ opacity: 0, y: -4, scale: 0.97 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                className="absolute right-0 top-full mt-1 rounded-xl overflow-hidden shadow-xl z-50 min-w-[160px]"
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
                <Link
                  href="/leaderboard"
                  onClick={() => setShowMenu(false)}
                  className="flex items-center gap-2 px-4 py-2.5 text-xs font-card text-white/70 hover:text-white hover:bg-white/5 transition-colors"
                >
                  ⚔️ Battle
                </Link>
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
