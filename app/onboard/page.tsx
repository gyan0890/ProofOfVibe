"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAccount } from "@starknet-react/core";
import { ConnectModal } from "@/components/ConnectModal";

export default function OnboardPage() {
  const router = useRouter();
  const { address, status } = useAccount();
  const [showConnectModal, setShowConnectModal] = useState(false);

  // Once wallet connects, go straight to reveal — useMyCard will fetch card from chain
  useEffect(() => {
    if (status === "connected" && address) {
      router.push("/reveal");
    }
  }, [status, address]);

  return (
    <div className="min-h-screen bg-[#080810] flex flex-col items-center justify-center px-6 pt-16">
      <ConnectModal open={showConnectModal} onClose={() => setShowConnectModal(false)} />

      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md"
      >
        <Link href="/" className="block mb-8 text-white/30 hover:text-white/60 transition-colors text-sm font-ui">
          ← Back
        </Link>

        <h1 className="font-card text-3xl font-medium text-white mb-2">
          Find your vibe.
        </h1>
        <p className="text-white/40 font-ui text-sm mb-10">
          Choose your path into the season.
        </p>

        <div className="flex flex-col gap-4">
          {/* Retrieve existing card */}
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => setShowConnectModal(true)}
            className="min-touch w-full p-5 rounded-2xl text-left flex items-start gap-4 transition-all"
            style={{
              background: "rgba(127,119,221,0.08)",
              border: "1px solid rgba(127,119,221,0.25)",
            }}
          >
            <span className="text-3xl mt-0.5">🔗</span>
            <div className="flex-1">
              <p className="font-card font-medium text-white mb-1">
                Connect wallet
              </p>
              <p className="text-white/40 text-sm font-ui">
                Already minted? Connect to retrieve your card and jump back into battle.
              </p>
              <p className="text-violet-400 text-xs font-ui mt-2">
                Argent X · Braavos · Cartridge Controller
              </p>
            </div>
          </motion.button>

          {/* New card via quiz */}
          <Link href="/quiz">
            <motion.div
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="min-touch w-full p-5 rounded-2xl text-left flex items-start gap-4 cursor-pointer transition-all"
              style={{
                background: "rgba(212,83,126,0.06)",
                border: "1px solid rgba(212,83,126,0.2)",
              }}
            >
              <span className="text-3xl mt-0.5">✨</span>
              <div className="flex-1">
                <p className="font-card font-medium text-white mb-1">
                  Mint a new card
                </p>
                <p className="text-white/40 text-sm font-ui">
                  Answer 5 questions. Get your Vibe Type. Seal it onchain and battle to stay hidden.
                </p>
                <p className="text-pink-400 text-xs font-ui mt-2">
                  No crypto needed to start · Upgrade to onchain anytime
                </p>
              </div>
            </motion.div>
          </Link>

          <p className="text-center text-xs text-white/20 font-ui mt-2">
            No seed phrases. No downloads required for Cartridge.
          </p>
        </div>
      </motion.div>
    </div>
  );
}
