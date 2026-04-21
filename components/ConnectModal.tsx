"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useConnect } from "@starknet-react/core";
import { useState } from "react";

interface ConnectModalProps {
  open: boolean;
  onClose: () => void;
}

const CONNECTOR_META: Record<string, {
  icon: string;
  label: string;
  sublabel: string;
  featured?: boolean;
  installUrl?: string;
  installLabel?: string;
}> = {
  controller: {
    icon: "🎮",
    label: "Cartridge Controller",
    sublabel: "No wallet needed · Passkey login",
    featured: true,
    // Cartridge is always available (no extension needed)
  },
  argentX: {
    icon: "🟠",
    label: "Argent X",
    sublabel: "Browser extension",
    installUrl: "https://www.argent.xyz/argent-x/",
    installLabel: "Install Argent X →",
  },
  braavos: {
    icon: "🟡",
    label: "Braavos",
    sublabel: "Browser extension",
    installUrl: "https://braavos.app/download-braavos-wallet/",
    installLabel: "Install Braavos →",
  },
};

export function ConnectModal({ open, onClose }: ConnectModalProps) {
  const { connect, connectors } = useConnect();
  const [connecting, setConnecting] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notInstalled, setNotInstalled] = useState<string | null>(null);

  async function handleConnect(connectorId: string) {
    const connector = connectors.find((c) => c.id === connectorId);
    if (!connector) return;

    // Check if the extension wallet is actually installed
    if (connectorId !== "controller" && !connector.available()) {
      setNotInstalled(connectorId);
      return;
    }

    setNotInstalled(null);
    setConnecting(connectorId);
    setError(null);
    try {
      await connect({ connector });
      onClose();
    } catch (e: any) {
      // Cartridge may throw a WASM init error but still open the popup —
      // only surface the error if it's not WASM-related
      if (e?.message && !e.message.includes("WebAssembly") && !e.message.includes("wasm")) {
        setError(e.message);
      }
    } finally {
      setConnecting(null);
    }
  }

  // Order: Cartridge first, then others
  const ordered = [
    ...connectors.filter((c) => c.id === "controller"),
    ...connectors.filter((c) => c.id !== "controller"),
  ];

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm"
            onClick={onClose}
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-50 flex items-center justify-center px-6 pointer-events-none"
          >
            <div
              className="w-full max-w-sm p-6 rounded-2xl pointer-events-auto"
              style={{ background: "#0d0d1a", border: "1px solid rgba(255,255,255,0.1)" }}
            >
              <div className="flex items-center justify-between mb-2">
                <h2 className="font-card text-lg font-medium text-white">Connect wallet</h2>
                <button
                  onClick={onClose}
                  className="text-white/40 hover:text-white transition-colors text-xl w-8 h-8 flex items-center justify-center"
                >
                  ×
                </button>
              </div>
              <p className="text-white/40 text-sm font-ui mb-5">
                Seal your Vibe Card onchain to battle.
              </p>

              <div className="flex flex-col gap-3">
                {ordered.map((connector) => {
                  const meta = CONNECTOR_META[connector.id] ?? {
                    icon: "🔗",
                    label: connector.name,
                    sublabel: "Starknet wallet",
                  };
                  const isLoading = connecting === connector.id;
                  const isUnavailable = connector.id !== "controller" && !connector.available();
                  const isShowingInstall = notInstalled === connector.id;

                  return (
                    <div key={connector.id} className="flex flex-col gap-1.5">
                      <motion.button
                        whileHover={{ scale: isUnavailable ? 1 : 1.02 }}
                        whileTap={{ scale: isUnavailable ? 1 : 0.98 }}
                        onClick={() => handleConnect(connector.id)}
                        disabled={!!connecting}
                        className="min-touch flex items-center gap-4 p-4 rounded-xl text-left w-full disabled:opacity-50 transition-all"
                        style={{
                          background: meta.featured
                            ? "rgba(127,119,221,0.1)"
                            : isUnavailable
                            ? "rgba(255,255,255,0.02)"
                            : "rgba(255,255,255,0.04)",
                          border: `1px solid ${
                            isShowingInstall
                              ? "rgba(251,191,36,0.4)"
                              : meta.featured
                              ? "rgba(127,119,221,0.3)"
                              : isUnavailable
                              ? "rgba(255,255,255,0.05)"
                              : "rgba(255,255,255,0.08)"
                          }`,
                          opacity: isUnavailable && !isShowingInstall ? 0.6 : 1,
                        }}
                      >
                        <div
                          className="w-10 h-10 rounded-xl flex items-center justify-center text-lg shrink-0"
                          style={{ background: meta.featured ? "rgba(127,119,221,0.15)" : "rgba(255,255,255,0.05)" }}
                        >
                          {isLoading ? (
                            <motion.span
                              animate={{ rotate: 360 }}
                              transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                              className="text-sm"
                            >
                              ⟳
                            </motion.span>
                          ) : (
                            meta.icon
                          )}
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <p className="font-card font-medium text-white text-sm">{meta.label}</p>
                            {meta.featured && (
                              <span
                                className="text-[9px] font-card px-1.5 py-0.5 rounded-full tracking-wider"
                                style={{ background: "rgba(127,119,221,0.2)", color: "#a78bfa" }}
                              >
                                NEW TO CRYPTO
                              </span>
                            )}
                            {isUnavailable && !isShowingInstall && (
                              <span
                                className="text-[9px] font-card px-1.5 py-0.5 rounded-full tracking-wider"
                                style={{ background: "rgba(255,255,255,0.06)", color: "rgba(255,255,255,0.3)" }}
                              >
                                NOT INSTALLED
                              </span>
                            )}
                          </div>
                          <p className="text-white/30 text-xs font-ui mt-0.5">{meta.sublabel}</p>
                        </div>
                      </motion.button>

                      {/* Install prompt — shown inline when user taps an uninstalled wallet */}
                      <AnimatePresence>
                        {isShowingInstall && meta.installUrl && (
                          <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: "auto" }}
                            exit={{ opacity: 0, height: 0 }}
                            transition={{ duration: 0.2 }}
                            className="overflow-hidden"
                          >
                            <div
                              className="flex items-center justify-between px-4 py-3 rounded-xl"
                              style={{ background: "rgba(251,191,36,0.06)", border: "1px solid rgba(251,191,36,0.2)" }}
                            >
                              <p className="text-xs font-ui text-amber-300/80">
                                {meta.label} isn&apos;t installed in this browser.
                              </p>
                              <a
                                href={meta.installUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="ml-3 text-xs font-card text-amber-300 hover:text-amber-200 transition-colors shrink-0 underline underline-offset-2"
                              >
                                {meta.installLabel}
                              </a>
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  );
                })}
              </div>

              {error && (
                <p className="mt-4 text-red-400 text-xs font-ui text-center">{error}</p>
              )}

              <p className="mt-5 text-center text-xs text-white/20 font-ui">
                No seed phrases. No downloads required for Cartridge.
              </p>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
