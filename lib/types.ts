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
