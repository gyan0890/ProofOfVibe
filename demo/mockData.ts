import { CardData, VibeTypeIndex } from "@/lib/types";

export const DEMO_CARDS: CardData[] = [
  {
    id: "demo-001",
    owner: "0x1a3f...9b2c",
    commitment: "0xabc123",
    revealedType: undefined,
    paletteRevealed: true,
    mintTimestamp: Date.now() - 3 * 24 * 60 * 60 * 1000,
    personaName: "Mystic Wanderer #4721",
    isAnchored: true,
    battleRecord: { wins: 3, losses: 1, total: 4 },
    traitReveal: {
      // 1 loss: identity dimension revealed
      trait1Word: "Semi-public · selective disclosure",
      barFillsAccurate: false,
      paletteRevealed: true,
      typeRevealed: false,
      lossCount: 1,
    },
    privacyProfile: {
      identityLeakage: 42,
      geographicSignal: 28,
      financialProfile: 55,
      behavioralFingerprint: 61,
      identityLabel: "Semi-public · selective disclosure",
      geographicLabel: "Mixed CEX / DEX · partial signal",
      financialLabel: "Moderate exposure · active wallet",
      behavioralLabel: "DeFi native · traceable patterns",
      scannedAddress: "quiz",
      scanTimestamp: Date.now() - 3 * 24 * 60 * 60 * 1000,
      totalTransactions: 0,
    },
    recentBattles: [
      { battleId: "b1", opponentId: "demo-002", opponentPersona: "Shadow Cipher #1337", won: true, timestamp: Date.now() - 3600000 },
      { battleId: "b2", opponentId: "demo-003", opponentPersona: "Neon Echo #9999", won: true, timestamp: Date.now() - 7200000 },
      { battleId: "b3", opponentId: "demo-004", opponentPersona: "Cosmic Rune #2048", won: false, timestamp: Date.now() - 86400000 },
      { battleId: "b4", opponentId: "demo-005", opponentPersona: "Phantom Signal #3333", won: true, timestamp: Date.now() - 172800000 },
    ],
  },
  {
    id: "demo-002",
    owner: "0x2b5e...4d1f",
    commitment: "0xdef456",
    revealedType: 1 as VibeTypeIndex,
    paletteRevealed: true,
    mintTimestamp: Date.now() - 5 * 24 * 60 * 60 * 1000,
    personaName: "Shadow Cipher #1337",
    isAnchored: true,
    battleRecord: { wins: 2, losses: 5, total: 7 },
    traitReveal: {
      // 5 losses: identity + geographic revealed, fills accurate
      trait1Word: "KYC exchange user · region traceable",
      trait2Word: "Global (Asia-origin)",
      barFillsAccurate: true,
      paletteRevealed: true,
      typeRevealed: true,
      lossCount: 5,
    },
    privacyProfile: {
      identityLeakage: 78,
      geographicSignal: 85,
      financialProfile: 48,
      behavioralFingerprint: 72,
      identityLabel: "KYC exchange user · region traceable",
      geographicLabel: "Global (Asia-origin)",
      financialLabel: "Moderate exposure · active wallet",
      behavioralLabel: "High-frequency · multi-protocol",
      scannedAddress: "0x2b5e...4d1f",
      scanTimestamp: Date.now() - 5 * 24 * 60 * 60 * 1000,
      totalTransactions: 189,
    },
    recentBattles: [
      { battleId: "b5", opponentId: "demo-001", opponentPersona: "Mystic Wanderer #4721", won: false, timestamp: Date.now() - 3600000 },
      { battleId: "b6", opponentId: "demo-006", opponentPersona: "Obsidian Thread #7777", won: false, timestamp: Date.now() - 7200000 },
    ],
  },
  {
    id: "demo-003",
    owner: "0x3c7a...8e3d",
    commitment: "0xghi789",
    revealedType: undefined,
    paletteRevealed: true,
    mintTimestamp: Date.now() - 7 * 24 * 60 * 60 * 1000,
    personaName: "Neon Echo #9999",
    isAnchored: false,
    battleRecord: { wins: 6, losses: 0, total: 6 },
    traitReveal: {
      // 0 losses: only identity dimension label shown (publicly visible), score hidden
      trait1Word: "Anonymous · no identity markers",
      barFillsAccurate: false,
      paletteRevealed: true,
      typeRevealed: false,
      lossCount: 0,
    },
    privacyProfile: {
      identityLeakage: 8,
      geographicSignal: 6,
      financialProfile: 12,
      behavioralFingerprint: 18,
      identityLabel: "Anonymous · no identity markers",
      geographicLabel: "No geographic footprint",
      financialLabel: "Cold storage · minimal visibility",
      behavioralLabel: "Minimal footprint · rare mover",
      scannedAddress: "quiz",
      scanTimestamp: Date.now() - 7 * 24 * 60 * 60 * 1000,
      totalTransactions: 0,
    },
    recentBattles: [],
  },
  {
    id: "demo-004",
    owner: "0x4d9b...2f6e",
    commitment: "0xjkl012",
    revealedType: 3 as VibeTypeIndex,
    paletteRevealed: true,
    mintTimestamp: Date.now() - 2 * 24 * 60 * 60 * 1000,
    personaName: "Cosmic Rune #2048",
    isAnchored: true,
    battleRecord: { wins: 4, losses: 3, total: 7 },
    traitReveal: {
      // 3 losses: identity + geographic revealed
      trait1Word: "Pseudonymous · protocol-only exposure",
      trait2Word: "DEX-only · minimal geo signal",
      barFillsAccurate: true,
      paletteRevealed: true,
      typeRevealed: true,
      lossCount: 3,
    },
    privacyProfile: {
      identityLeakage: 18,
      geographicSignal: 14,
      financialProfile: 22,
      behavioralFingerprint: 53,
      identityLabel: "Pseudonymous · protocol-only exposure",
      geographicLabel: "DEX-only · minimal geo signal",
      financialLabel: "Distributed · hard to size",
      behavioralLabel: "Builder patterns · deployer",
      scannedAddress: "quiz",
      scanTimestamp: Date.now() - 2 * 24 * 60 * 60 * 1000,
      totalTransactions: 0,
    },
    recentBattles: [
      { battleId: "b7", opponentId: "demo-001", opponentPersona: "Mystic Wanderer #4721", won: true, timestamp: Date.now() - 86400000 },
    ],
  },
  {
    id: "demo-005",
    owner: "0x5e0c...1a7b",
    commitment: "0xmno345",
    revealedType: undefined,
    paletteRevealed: true,
    mintTimestamp: Date.now() - 8 * 24 * 60 * 60 * 1000,
    personaName: "Phantom Signal #3333",
    isAnchored: true,
    battleRecord: { wins: 5, losses: 2, total: 7 },
    traitReveal: {
      // 2 losses: identity revealed
      trait1Word: "Pseudonymous · protocol-only exposure",
      barFillsAccurate: false,
      paletteRevealed: true,
      typeRevealed: false,
      lossCount: 2,
    },
    privacyProfile: {
      identityLeakage: 22,
      geographicSignal: 10,
      financialProfile: 82,
      behavioralFingerprint: 30,
      identityLabel: "Pseudonymous · protocol-only exposure",
      geographicLabel: "No geographic footprint",
      financialLabel: "Visible bag · balance trackable",
      behavioralLabel: "Distributed · hard to size",
      scannedAddress: "0x5e0c...1a7b",
      scanTimestamp: Date.now() - 8 * 24 * 60 * 60 * 1000,
      totalTransactions: 47,
    },
    recentBattles: [
      { battleId: "b8", opponentId: "demo-003", opponentPersona: "Neon Echo #9999", won: false, timestamp: Date.now() - 172800000 },
    ],
  },
];

// Generate 20 mock cards for leaderboard
export const LEADERBOARD_MOCK_CARDS: CardData[] = [
  ...DEMO_CARDS,
  ...Array.from({ length: 15 }, (_, i) => ({
    id: `demo-${String(i + 6).padStart(3, "0")}`,
    owner: `0x${Math.random().toString(16).slice(2, 6)}...${Math.random().toString(16).slice(2, 6)}`,
    commitment: `0x${Math.random().toString(16).slice(2)}`,
    revealedType: Math.random() > 0.5 ? (Math.floor(Math.random() * 7) as VibeTypeIndex) : undefined,
    paletteRevealed: Math.random() > 0.6,
    mintTimestamp: Date.now() - Math.floor(Math.random() * 10) * 24 * 60 * 60 * 1000,
    personaName: [
      "Ancient Vessel", "Forgotten Glyph", "Silent Current", "Primal Echo",
      "Obsidian Specter", "Drifting Rune", "Veiled Signal", "Shadow Thread",
      "Cosmic Cipher", "Mystic Wanderer", "Neon Specter", "Phantom Rune",
      "Ancient Echo", "Forgotten Current", "Silent Vessel",
    ][i] + ` #${1000 + i * 137}`,
    isAnchored: Math.random() > 0.3,
    battleRecord: {
      wins: Math.floor(Math.random() * 10),
      losses: Math.floor(Math.random() * 8),
      total: Math.floor(Math.random() * 15),
    },
    traitReveal: {
      lossCount: Math.floor(Math.random() * 8),
      barFillsAccurate: Math.random() > 0.6,
      paletteRevealed: Math.random() > 0.5,
      typeRevealed: Math.random() > 0.7,
    },
    recentBattles: [],
  })) as CardData[],
];

export const DEMO_SEASON_DAY = 7;
export const DEMO_SEASON_TOTAL = 14;

/**
 * Quiz questions — each answer carries score deltas for the 4 privacy dimensions.
 * Scores are summed across all 5 questions then normalised to 0–100.
 *
 * Dimensions:
 *   identity   — how exposed your real-world identity is
 *   geographic — how traceable your geographic region is
 *   financial  — how visible your wealth / transaction volume is
 *   behavioral — how traceable your on-chain activity patterns are
 */
export interface QuizAnswerScores {
  identity: number;
  geographic: number;
  financial: number;
  behavioral: number;
}

export interface QuizAnswer {
  label: string;
  icon: string;
  scores: QuizAnswerScores;
}

export interface QuizQuestion {
  question: string;
  answers: QuizAnswer[];
}

export const QUIZ_QUESTIONS: QuizQuestion[] = [
  {
    question: "Who knows which wallet is yours?",
    answers: [
      {
        label: "Everyone — I have an ENS name and share my address openly",
        icon: "📛",
        scores: { identity: 90, geographic: 30, financial: 20, behavioral: 40 },
      },
      {
        label: "A few people I've shared it with selectively",
        icon: "👥",
        scores: { identity: 50, geographic: 15, financial: 10, behavioral: 25 },
      },
      {
        label: "Only the protocols I interact with — no name attached",
        icon: "🔌",
        scores: { identity: 15, geographic: 5, financial: 5, behavioral: 50 },
      },
      {
        label: "Nobody. Fresh wallet, no ties to any identity",
        icon: "👻",
        scores: { identity: 5, geographic: 0, financial: 5, behavioral: 5 },
      },
    ],
  },
  {
    question: "How do you on-ramp and off-ramp?",
    answers: [
      {
        label: "KYC exchange — Binance, Coinbase, Kraken",
        icon: "🏦",
        scores: { identity: 35, geographic: 85, financial: 25, behavioral: 40 },
      },
      {
        label: "Mix of CEX deposits and peer-to-peer",
        icon: "🔄",
        scores: { identity: 15, geographic: 45, financial: 20, behavioral: 50 },
      },
      {
        label: "DEXs only — never submitted KYC to anything",
        icon: "🌊",
        scores: { identity: 5, geographic: 15, financial: 10, behavioral: 65 },
      },
      {
        label: "I get paid in crypto directly or mine it",
        icon: "⛏️",
        scores: { identity: 0, geographic: 5, financial: 15, behavioral: 70 },
      },
    ],
  },
  {
    question: "How exposed is your bag?",
    answers: [
      {
        label: "One wallet, full public history, visible balance",
        icon: "📖",
        scores: { identity: 45, geographic: 20, financial: 85, behavioral: 45 },
      },
      {
        label: "One active wallet with a moderate stack",
        icon: "💼",
        scores: { identity: 20, geographic: 10, financial: 55, behavioral: 55 },
      },
      {
        label: "Intentionally split across multiple wallets",
        icon: "🗂️",
        scores: { identity: 10, geographic: 5, financial: 25, behavioral: 40 },
      },
      {
        label: "Mostly cold storage — it barely moves",
        icon: "🧊",
        scores: { identity: 5, geographic: 5, financial: 10, behavioral: 10 },
      },
    ],
  },
  {
    question: "What's your on-chain activity pattern?",
    answers: [
      {
        label: "Everywhere — DeFi, NFTs, bridges, multiple chains daily",
        icon: "⚡",
        scores: { identity: 30, geographic: 35, financial: 55, behavioral: 85 },
      },
      {
        label: "DeFi native — yield farming, LPs, protocol hopping",
        icon: "🌐",
        scores: { identity: 15, geographic: 20, financial: 40, behavioral: 65 },
      },
      {
        label: "I build and deploy contracts, mostly testnet",
        icon: "🔨",
        scores: { identity: 10, geographic: 10, financial: 15, behavioral: 50 },
      },
      {
        label: "Simple transfers, rarely interact with contracts",
        icon: "🪨",
        scores: { identity: 5, geographic: 5, financial: 10, behavioral: 15 },
      },
    ],
  },
  {
    question: "Your biggest on-chain flex is...",
    answers: [
      {
        label: "My ENS name and everything I've touched publicly",
        icon: "🌟",
        scores: { identity: 70, geographic: 25, financial: 30, behavioral: 60 },
      },
      {
        label: "The size of my bag — let the numbers speak",
        icon: "🐋",
        scores: { identity: 20, geographic: 15, financial: 70, behavioral: 25 },
      },
      {
        label: "That nobody knows what I'm doing",
        icon: "🫥",
        scores: { identity: 5, geographic: 5, financial: 5, behavioral: 5 },
      },
      {
        label: "The contracts and protocols I've shipped",
        icon: "🚀",
        scores: { identity: 15, geographic: 10, financial: 20, behavioral: 60 },
      },
    ],
  },
];
