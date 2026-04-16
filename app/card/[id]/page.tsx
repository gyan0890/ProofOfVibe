"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import { useProvider, useAccount } from "@starknet-react/core";
import { Contract, shortString } from "starknet";
import { VibeCard } from "@/components/VibeCard";
import { CardData, VibeTypeIndex } from "@/lib/types";
import { VIBE_TYPES } from "@/lib/vibeTypes";
import { CONTRACT_ADDRESSES } from "@/lib/constants";
import { loadLocalCard } from "@/lib/storage";
import { useBattle, OnchainBattle } from "@/hooks/useBattle";

const VIBECARD_READ_ABI = [
  {
    type: "struct",
    name: "vibe_card::CardData",
    members: [
      { name: "owner", type: "core::starknet::contract_address::ContractAddress" },
      { name: "commitment", type: "core::felt252" },
      { name: "ipfs_cid", type: "core::felt252" },
      { name: "revealed_type", type: "core::integer::u8" },
      { name: "palette_revealed", type: "core::bool" },
      { name: "mint_timestamp", type: "core::integer::u64" },
      { name: "persona_name", type: "core::felt252" },
    ],
  },
  {
    type: "struct",
    name: "vibe_card::TraitRevealState",
    members: [
      { name: "trait_1_word", type: "core::felt252" },
      { name: "trait_2_word", type: "core::felt252" },
      { name: "bar_fills_accurate", type: "core::bool" },
      { name: "palette_revealed", type: "core::bool" },
      { name: "type_revealed", type: "core::bool" },
    ],
  },
  {
    type: "function",
    name: "get_card",
    inputs: [{ name: "token_id", type: "core::integer::u256" }],
    outputs: [{ type: "vibe_card::CardData" }],
    state_mutability: "view",
  },
  {
    type: "function",
    name: "get_trait_state",
    inputs: [{ name: "token_id", type: "core::integer::u256" }],
    outputs: [{ type: "vibe_card::TraitRevealState" }],
    state_mutability: "view",
  },
  {
    type: "function",
    name: "get_battle_losses",
    inputs: [{ name: "token_id", type: "core::integer::u256" }],
    outputs: [{ type: "core::integer::u8" }],
    state_mutability: "view",
  },
] as const;

/** Extract a token ID from card IDs of form "${address}-${tokenId}" */
function parseTokenId(id: string): number | null {
  if (id.startsWith("session-")) return null;
  const parts = id.split("-");
  if (parts.length < 2) return null;
  const last = Number(parts[parts.length - 1]);
  // Valid onchain token IDs are small positive integers
  if (Number.isInteger(last) && last > 0 && last < 1_000_000) return last;
  return null;
}

export default function CardPage({ params }: { params: { id: string } }) {
  const [card, setCard] = useState<CardData | null>(null);
  const [loading, setLoading] = useState(true);
  const { provider } = useProvider();
  const { address } = useAccount();
  const [guessDistribution] = useState(() =>
    VIBE_TYPES.map((t) => ({ type: t, count: Math.floor(Math.random() * 30) }))
  );
  const { getBattle } = useBattle();
  const [pendingBattles, setPendingBattles] = useState<Array<{ battleId: number; battle: OnchainBattle }>>([]);

  useEffect(() => {
    async function loadCard() {
      setLoading(true);

      // 1. Check localStorage (user's own card)
      const local = loadLocalCard();
      if (local && local.id === params.id) { setCard(local); setLoading(false); return; }

      // 3. Try fetching from chain by token ID
      const tokenId = parseTokenId(params.id);
      if (tokenId !== null && provider) {
        try {
          const contract = new Contract({
            abi: VIBECARD_READ_ABI as any,
            address: CONTRACT_ADDRESSES.vibeCard,
            providerOrAccount: provider,
          });

          const [raw, traitRaw, lossesRaw] = await Promise.all([
            contract.get_card({ low: tokenId, high: 0 }),
            contract.get_trait_state({ low: tokenId, high: 0 }),
            contract.get_battle_losses({ low: tokenId, high: 0 }),
          ]);

          const owner: string = raw.owner?.toString() ?? "0x0";
          const revealed = Number(raw.revealed_type);
          const losses = Number(lossesRaw);

          const personaName = (() => {
            try { return shortString.decodeShortString(raw.persona_name?.toString() ?? "0x0"); }
            catch { return `Vibe #${tokenId}`; }
          })();

          const onchainCard: CardData = {
            id: params.id,
            owner,
            commitment: raw.commitment?.toString() ?? "0x0",
            revealedType: revealed !== 255 ? (revealed as VibeTypeIndex) : undefined,
            paletteRevealed: Boolean(raw.palette_revealed),
            mintTimestamp: Number(raw.mint_timestamp) * 1000,
            personaName,
            isAnchored: true,
            battleRecord: { wins: 0, losses, total: losses },
            traitReveal: {
              barFillsAccurate: Boolean(traitRaw.bar_fills_accurate),
              paletteRevealed: Boolean(traitRaw.palette_revealed),
              typeRevealed: Boolean(traitRaw.type_revealed),
              lossCount: losses,
            },
            recentBattles: [],
          };
          setCard(onchainCard);
          setLoading(false);
          return;
        } catch (e) {
          console.error("CardPage: chain fetch failed for token", tokenId, e);
        }
      }

      // 4. Not found
      setCard(null);
      setLoading(false);
    }

    loadCard();
  }, [params.id, provider]);

  // Scan battle IDs 1-20 for pending challenges targeting this card
  useEffect(() => {
    const tokenId = parseTokenId(params.id);
    if (tokenId === null) return;

    async function scanPendingBattles() {
      const ids = Array.from({ length: 20 }, (_, i) => i + 1);
      const results = await Promise.all(ids.map((id) => getBattle(id)));
      const pending = results
        .map((b, i) => ({ battleId: i + 1, battle: b }))
        .filter(
          (entry): entry is { battleId: number; battle: OnchainBattle } =>
            entry.battle !== null &&
            entry.battle.defenderToken === tokenId &&
            entry.battle.status === 0
        );
      setPendingBattles(pending);
    }

    scanPendingBattles();
  }, [params.id, getBattle]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#080810] flex items-center justify-center">
        <motion.div
          className="w-8 h-8 rounded-full bg-violet-500/30"
          animate={{ scale: [1, 1.4, 1], opacity: [0.4, 1, 0.4] }}
          transition={{ duration: 1, repeat: Infinity }}
        />
      </div>
    );
  }

  if (!card) {
    return (
      <div className="min-h-screen bg-[#080810] flex flex-col items-center justify-center gap-4">
        <p className="font-card text-white/60 text-lg">Card not found</p>
        <Link href="/leaderboard" className="text-xs font-ui text-violet-400 hover:text-violet-300 transition-colors">
          ← Back to Battle Arena
        </Link>
      </div>
    );
  }

  const totalGuesses = guessDistribution.reduce((s, g) => s + g.count, 0) || 1;
  const primaryColor = card.traitReveal.paletteRevealed && card.revealedType !== undefined
    ? VIBE_TYPES[card.revealedType].primary
    : "#888780";

  return (
    <div
      className="min-h-screen flex flex-col"
      style={{
        background: `radial-gradient(ellipse at top, ${primaryColor}0F 0%, #080810 60%)`,
        backgroundColor: "#080810",
      }}
    >
      <div className="max-w-5xl mx-auto w-full px-6 py-12">
        <Link href="/leaderboard" className="text-white/30 hover:text-white/60 transition-colors text-sm font-ui mb-8 inline-block">
          ← Back
        </Link>

        <div className="flex flex-col lg:flex-row gap-10 items-start">
          {/* Card */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="lg:sticky lg:top-8"
          >
            <VibeCard card={card} interactive={true} size="md" />
          </motion.div>

          {/* Right panel */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="flex-1 flex flex-col gap-6"
          >
            {/* Header */}
            <div>
              <h1 className="font-card text-2xl font-medium text-white mb-1">
                {card.personaName}
              </h1>
              <p className="text-white/40 text-sm font-ui truncate">
                {card.isAnchored ? card.owner : "Unanchored card"}
              </p>
            </div>

            {/* Onchain badge */}
            {card.isAnchored && (
              <div className="flex flex-col gap-1">
                <div className="flex items-center gap-2 text-xs font-ui" style={{ color: "#22c55e" }}>
                  <span className="w-1.5 h-1.5 rounded-full bg-green-500" />
                  Sealed onchain · Sepolia
                </div>
                {card.mintTxHash && (
                  <a
                    href={`https://sepolia.voyager.online/tx/${card.mintTxHash}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs font-ui text-white/30 hover:text-white/60 transition-colors ml-3.5"
                  >
                    View mint tx on Voyager ↗
                  </a>
                )}
              </div>
            )}

            {/* Status */}
            {card.traitReveal.typeRevealed && card.revealedType !== undefined ? (
              <div
                className="px-4 py-3 rounded-xl"
                style={{ background: `${VIBE_TYPES[card.revealedType].primary}15`, border: `1px solid ${VIBE_TYPES[card.revealedType].primary}33` }}
              >
                <p className="text-xs text-white/40 font-ui mb-1">Revealed</p>
                <p className="font-card font-medium" style={{ color: VIBE_TYPES[card.revealedType].primary }}>
                  {VIBE_TYPES[card.revealedType].name}
                </p>
              </div>
            ) : (
              <div className="px-4 py-3 rounded-xl bg-white/3 border border-white/6">
                <p className="text-xs text-white/40 font-ui mb-1">Status</p>
                <p className="font-card font-medium text-white/60">🔒 Hidden · {card.traitReveal.lossCount} losses so far</p>
              </div>
            )}

            {/* Community Read */}
            <div
              className="p-5 rounded-2xl"
              style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)" }}
            >
              <h3 className="font-card font-medium text-white/80 mb-4 text-sm">Community Read</h3>
              <div className="flex flex-col gap-2">
                {guessDistribution.map(({ type, count }) => {
                  const pct = Math.round((count / totalGuesses) * 100);
                  return (
                    <div key={type.index} className="flex items-center gap-3">
                      <div className="w-3 h-3 rounded-full shrink-0" style={{ background: type.primary }} />
                      <div className="flex-1 h-1.5 rounded-full bg-white/5 overflow-hidden">
                        <motion.div
                          className="h-full rounded-full"
                          style={{ background: type.primary }}
                          initial={{ width: 0 }}
                          animate={{ width: `${pct}%` }}
                          transition={{ duration: 0.8, delay: 0.2 + type.index * 0.05 }}
                        />
                      </div>
                      <span className="text-xs text-white/30 font-ui w-8 text-right">{pct}%</span>
                    </div>
                  );
                })}
              </div>
              <p className="text-xs text-white/20 font-ui mt-3">{totalGuesses} reads (estimated)</p>
            </div>

            {/* Pending Challenges */}
            {(() => {
              const localCard = loadLocalCard();
              const isOwnCard =
                (address && card.owner &&
                  card.owner.toLowerCase() === address.toLowerCase()) ||
                (localCard && localCard.id === params.id);

              if (!isOwnCard || pendingBattles.length === 0) return null;

              return (
                <div
                  className="p-5 rounded-2xl"
                  style={{ background: "rgba(239,68,68,0.05)", border: "1px solid rgba(239,68,68,0.18)" }}
                >
                  <h3 className="font-card font-medium mb-3 text-sm" style={{ color: "#ef4444" }}>
                    Pending Challenges ({pendingBattles.length})
                  </h3>
                  <div className="flex flex-col gap-3">
                    {pendingBattles.map(({ battleId }) => (
                      <div key={battleId} className="flex items-center justify-between gap-3">
                        <span className="text-sm text-white/60 font-ui">Battle #{battleId}</span>
                        <button
                          onClick={() => alert(`battle #${battleId} — submit defense coming soon`)}
                          className="min-touch px-4 py-1.5 rounded-lg font-card text-xs text-white transition-all hover:scale-105"
                          style={{ background: "rgba(239,68,68,0.15)", border: "1px solid rgba(239,68,68,0.3)" }}
                        >
                          Respond
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })()}

            {/* Battle CTA — show only when this is NOT the current user's own card */}
            {(() => {
              const localCard = loadLocalCard();
              const isOwnCard =
                (address && card.owner &&
                  card.owner.toLowerCase() === address.toLowerCase()) ||
                (localCard && localCard.id === params.id);

              if (isOwnCard) {
                return (
                  <div className="flex flex-col gap-2">
                    <Link
                      href="/leaderboard"
                      className="min-touch flex items-center justify-center gap-2 px-6 py-3 rounded-xl font-card text-sm text-white transition-all hover:scale-105"
                      style={{
                        background: "rgba(127,119,221,0.12)",
                        border: "1px solid rgba(127,119,221,0.28)",
                      }}
                    >
                      ⚔️ Find an opponent to battle
                    </Link>
                    <Link
                      href="/reveal"
                      className="min-touch flex items-center justify-center gap-2 px-6 py-3 rounded-xl font-card text-sm text-white/50 transition-all hover:text-white"
                    >
                      ← Back to my card
                    </Link>
                  </div>
                );
              }

              return (
                <Link
                  href={`/battle/${params.id}`}
                  className="min-touch flex items-center justify-center gap-2 px-6 py-3 rounded-xl font-card text-sm text-white transition-all hover:scale-105"
                  style={{
                    background: "rgba(239,68,68,0.12)",
                    border: "1px solid rgba(239,68,68,0.25)",
                  }}
                >
                  ⚔️ Battle this card
                </Link>
              );
            })()}

            {/* Recent battles */}
            {card.recentBattles.length > 0 && (
              <div>
                <h3 className="font-card font-medium text-white/60 mb-3 text-sm">Recent Battles</h3>
                <div className="flex flex-col gap-2">
                  {card.recentBattles.slice(0, 5).map((b) => (
                    <div
                      key={b.battleId}
                      className="flex items-center gap-3 px-3 py-2 rounded-lg"
                      style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.05)" }}
                    >
                      <span
                        className="text-xs font-bold px-2 py-0.5 rounded"
                        style={{
                          background: b.won ? "rgba(34,197,94,0.1)" : "rgba(239,68,68,0.1)",
                          color: b.won ? "#22c55e" : "#ef4444",
                        }}
                      >
                        {b.won ? "W" : "L"}
                      </span>
                      <span className="text-xs text-white/50 font-ui flex-1">{b.opponentPersona}</span>
                      <span className="text-xs text-white/20 font-ui">
                        {new Date(b.timestamp).toLocaleDateString()}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </motion.div>
        </div>
      </div>
    </div>
  );
}
