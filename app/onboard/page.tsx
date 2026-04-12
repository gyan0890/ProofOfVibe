"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useConnect, useAccount } from "@starknet-react/core";

export default function OnboardPage() {
  const router = useRouter();
  const { connect, connectors } = useConnect();
  const { address } = useAccount();
  const [path, setPath] = useState<"wallet" | "new" | null>(null);
  const [analyzing, setAnalyzing] = useState(false);

  async function handleWalletConnect() {
    try {
      const cartridgeConnector = connectors.find((c) => c.id === "cartridge");
      if (cartridgeConnector) {
        await connect({ connector: cartridgeConnector });
      }
      setAnalyzing(true);
      // Simulate analysis
      setTimeout(() => {
        router.push("/reveal");
      }, 3500);
    } catch {
      setAnalyzing(false);
    }
  }

  return (
    <div className="min-h-screen bg-[#080810] flex flex-col items-center justify-center px-6">
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

        <AnimatePresence mode="wait">
          {analyzing ? (
            <motion.div
              key="analyzing"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex flex-col items-center gap-6 py-12 text-center"
            >
              <div className="relative w-20 h-20">
                <motion.div
                  className="absolute inset-0 rounded-full border-2 border-violet-500/30"
                  animate={{ rotate: 360 }}
                  transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
                />
                <motion.div
                  className="absolute inset-3 rounded-full border border-violet-400/50"
                  animate={{ rotate: -360 }}
                  transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                />
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-violet-300 text-xl">⟳</span>
                </div>
              </div>
              <div>
                <p className="font-card text-lg text-white mb-1">
                  Analyzing your onchain history...
                </p>
                <p className="text-white/40 text-sm font-ui">
                  Reading 50 transactions · scoring 5 dimensions
                </p>
              </div>
              <div className="w-full bg-white/5 rounded-full h-1 overflow-hidden">
                <motion.div
                  className="h-full rounded-full"
                  style={{ background: "linear-gradient(90deg, #7F77DD, #D4537E)" }}
                  initial={{ width: "0%" }}
                  animate={{ width: "100%" }}
                  transition={{ duration: 3, ease: "easeInOut" }}
                />
              </div>
              <div className="text-xs text-white/30 font-ui space-y-1">
                {["Tx frequency", "Position sizing", "Contract diversity", "Time patterns", "Protocol mix"].map((dim, i) => (
                  <motion.p
                    key={dim}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: i * 0.5 }}
                  >
                    ✓ {dim}
                  </motion.p>
                ))}
              </div>
            </motion.div>
          ) : (
            <motion.div key="paths" className="flex flex-col gap-4">
              {/* Wallet path */}
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => { setPath("wallet"); handleWalletConnect(); }}
                className="min-touch w-full p-5 rounded-2xl text-left flex items-start gap-4 transition-all"
                style={{
                  background: path === "wallet" ? "rgba(127,119,221,0.12)" : "rgba(255,255,255,0.04)",
                  border: `1px solid ${path === "wallet" ? "rgba(127,119,221,0.4)" : "rgba(255,255,255,0.08)"}`,
                }}
              >
                <span className="text-3xl mt-0.5">🔗</span>
                <div className="flex-1">
                  <p className="font-card font-medium text-white mb-1">
                    I have a Starknet wallet
                  </p>
                  <p className="text-white/40 text-sm font-ui">
                    Connect via passkey. We&apos;ll analyze your onchain history to determine your Vibe Type.
                  </p>
                  <p className="text-violet-400 text-xs font-ui mt-2">
                    No wallet install required · Powered by Cartridge Controller
                  </p>
                </div>
              </motion.button>

              {/* New user path */}
              <Link href="/quiz">
                <motion.div
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => setPath("new")}
                  className="min-touch w-full p-5 rounded-2xl text-left flex items-start gap-4 cursor-pointer transition-all"
                  style={{
                    background: path === "new" ? "rgba(212,83,126,0.08)" : "rgba(255,255,255,0.03)",
                    border: `1px solid ${path === "new" ? "rgba(212,83,126,0.3)" : "rgba(255,255,255,0.06)"}`,
                  }}
                >
                  <span className="text-3xl mt-0.5">✨</span>
                  <div className="flex-1">
                    <p className="font-card font-medium text-white mb-1">
                      I&apos;m brand new
                    </p>
                    <p className="text-white/40 text-sm font-ui">
                      Answer 5 questions. Get your Vibe Card. Battle to stay hidden.
                    </p>
                    <p className="text-pink-400 text-xs font-ui mt-2">
                      No crypto needed · Upgrade to onchain anytime
                    </p>
                  </div>
                </motion.div>
              </Link>

              <p className="text-center text-xs text-white/20 font-ui mt-2">
                No seed phrases. No downloads. Just vibes.
              </p>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
}
