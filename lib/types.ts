export type VibeTypeIndex = 0 | 1 | 2 | 3 | 4 | 5 | 6;

export interface VibeType {
  index: VibeTypeIndex;
  name: string;
  primary: string;
  background: string;
  traits: [string, string, string];
  strongAgainst: VibeTypeIndex;
  weakAgainst: VibeTypeIndex;
}

export interface CardData {
  id: string;
  owner: string;
  commitment: string;
  ipfsCid?: string;
  revealedType?: VibeTypeIndex;
  paletteRevealed: boolean;
  mintTimestamp: number;
  personaName: string;
  isAnchored: boolean;
  battleRecord: { wins: number; losses: number; total: number };
  traitReveal: TraitRevealState;
  recentBattles: BattleResult[];
  /** Present when card was created from a wallet privacy scan */
  privacyProfile?: PrivacyProfile;
  /** Starknet transaction hash from the mint, stored so Voyager link works after refresh */
  mintTxHash?: string;
}

export interface TraitRevealState {
  trait1Word?: string;
  trait2Word?: string;
  barFillsAccurate: boolean;
  paletteRevealed: boolean;
  typeRevealed: boolean;
  lossCount: number;
}

export interface BattleResult {
  battleId: string;
  opponentId: string;
  opponentPersona: string;
  won: boolean;
  timestamp: number;
}

export interface BattleData {
  id: string;
  challengerToken: string;
  defenderToken: string;
  challengerCommitment: string;
  defenderCommitment?: string;
  status: "Pending" | "DefenderCommitted" | "Resolved" | "Expired";
  winner?: string;
  initiatedAt: number;
}

export interface QuizAnswer {
  questionIndex: number;
  answerIndex: number;
}

export type RevealSource = "owner" | "battle" | "season_end";

/**
 * Privacy profile computed from Exposed.wtf wallet scan.
 * Stored locally alongside the card; dimensions revealed progressively through battles.
 */
export interface PrivacyProfile {
  /** 0–100: higher = more identity info publicly linked */
  identityLeakage: number;
  /** 0–100: higher = geographic origin more determinable */
  geographicSignal: number;
  /** 0–100: higher = financial picture more visible */
  financialProfile: number;
  /** 0–100: higher = on-chain behaviour more traceable */
  behavioralFingerprint: number;

  /** Short label revealed after 1st battle loss */
  identityLabel: string;
  /** Short label revealed after 2nd battle loss */
  geographicLabel: string;
  /** Short label revealed after 3rd battle loss */
  financialLabel: string;
  /** Short label revealed after 5th battle loss */
  behavioralLabel: string;

  ensName?: string;
  scannedAddress: string;
  scanTimestamp: number;
  totalTransactions: number;
}
