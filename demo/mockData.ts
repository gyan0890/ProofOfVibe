import { CardData, VibeTypeIndex } from "@/lib/types";

export const DEMO_CARDS: CardData[] = [
  {
    id: "demo-001",
    owner: "0x1a3f...9b2c",
    commitment: "0xabc123",
    revealedType: undefined,
    paletteRevealed: false,
    mintTimestamp: Date.now() - 3 * 24 * 60 * 60 * 1000,
    personaName: "Mystic Wanderer #4721",
    isAnchored: true,
    battleRecord: { wins: 3, losses: 1, total: 4 },
    traitReveal: {
      trait1Word: "methodical",
      barFillsAccurate: false,
      paletteRevealed: false,
      typeRevealed: false,
      lossCount: 1,
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
      trait1Word: "high-velocity",
      trait2Word: "risk-tolerant",
      barFillsAccurate: true,
      paletteRevealed: true,
      typeRevealed: true,
      lossCount: 5,
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
    paletteRevealed: false,
    mintTimestamp: Date.now() - 7 * 24 * 60 * 60 * 1000,
    personaName: "Neon Echo #9999",
    isAnchored: false,
    battleRecord: { wins: 6, losses: 0, total: 6 },
    traitReveal: {
      barFillsAccurate: false,
      paletteRevealed: false,
      typeRevealed: false,
      lossCount: 0,
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
      trait1Word: "contract-deployer",
      trait2Word: "testnet-native",
      barFillsAccurate: true,
      paletteRevealed: true,
      typeRevealed: true,
      lossCount: 3,
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
      trait1Word: "large-positions",
      barFillsAccurate: false,
      paletteRevealed: true,
      typeRevealed: false,
      lossCount: 2,
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

export const QUIZ_QUESTIONS = [
  {
    question: "It's 2am. You're most likely...",
    answers: [
      { label: "Deep in a research rabbit hole", icon: "🔭" },
      { label: "Still in the group chat", icon: "💬" },
      { label: "Placing a trade you'll explain later", icon: "📈" },
      { label: "Building something no one's asked for yet", icon: "🔨" },
    ],
  },
  {
    question: "Someone asks your opinion. You...",
    answers: [
      { label: "Share a 12-point framework", icon: "📊" },
      { label: "Send three memes and a voice note", icon: "🎙️" },
      { label: 'Say "depends" and mean it', icon: "🌀" },
      { label: "Already moved on to the next thing", icon: "⚡" },
    ],
  },
  {
    question: "Your ideal power move is...",
    answers: [
      { label: "Knowing something before anyone else does", icon: "👁️" },
      { label: "Being the connector in the room", icon: "🕸️" },
      { label: "Quietly accumulating while others talk", icon: "🐋" },
      { label: "Shipping while others plan", icon: "🚀" },
    ],
  },
  {
    question: "On a Saturday morning you're...",
    answers: [
      { label: "Checking dashboards", icon: "📡" },
      { label: "At a community event", icon: "🎪" },
      { label: "Nowhere to be found", icon: "👻" },
      { label: "Deploying something to testnet", icon: "⚙️" },
    ],
  },
  {
    question: "Your biggest flex is...",
    answers: [
      { label: "Being right early", icon: "🎯" },
      { label: "Your network", icon: "🌐" },
      { label: "No one knows what you're doing", icon: "🫥" },
      { label: "Your GitHub commit streak", icon: "💻" },
    ],
  },
];
