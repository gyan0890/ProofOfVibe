import { VibeType, VibeTypeIndex } from "./types";

export const VIBE_TYPES: VibeType[] = [
  {
    index: 0,
    name: "The Architect",
    primary: "#7F77DD",
    background: "#EEEDFE",
    traits: ["methodical", "long-horizon", "governance-native"],
    strongAgainst: 1,
    weakAgainst: 2,
  },
  {
    index: 1,
    name: "The Degen",
    primary: "#D85A30",
    background: "#FAECE7",
    traits: ["high-velocity", "risk-tolerant", "nocturnal"],
    strongAgainst: 5,
    weakAgainst: 0,
  },
  {
    index: 2,
    name: "The Ghost",
    primary: "#888780",
    background: "#F1EFE8",
    traits: ["minimal-footprint", "privacy-seeking", "rare-mover"],
    strongAgainst: 0,
    weakAgainst: 6,
  },
  {
    index: 3,
    name: "The Builder",
    primary: "#1D9E75",
    background: "#E1F5EE",
    traits: ["contract-deployer", "testnet-native", "ecosystem-OG"],
    strongAgainst: 2,
    weakAgainst: 4,
  },
  {
    index: 4,
    name: "The Whale Hunter",
    primary: "#185FA5",
    background: "#E6F1FB",
    traits: ["large-positions", "patient-accumulator", "LP-deep"],
    strongAgainst: 3,
    weakAgainst: 1,
  },
  {
    index: 5,
    name: "The Socialite",
    primary: "#D4537E",
    background: "#FBEAF0",
    traits: ["frequent-connector", "NFT-native", "community-anchor"],
    strongAgainst: 6,
    weakAgainst: 1,
  },
  {
    index: 6,
    name: "The Oracle",
    primary: "#BA7517",
    background: "#FAEEDA",
    traits: ["data-driven", "yield-optimizer", "multi-protocol"],
    strongAgainst: 2,
    weakAgainst: 5,
  },
];

export function getVibeType(index: VibeTypeIndex): VibeType {
  return VIBE_TYPES[index];
}

export function battleWinner(
  aIndex: VibeTypeIndex,
  bIndex: VibeTypeIndex,
  aScore: number,
  bScore: number
): "a" | "b" | "tie" {
  const a = VIBE_TYPES[aIndex];
  if (a.strongAgainst === bIndex) return "a";
  if (a.weakAgainst === bIndex) return "b";
  // tie-break by activity score
  if (aScore > bScore) return "a";
  if (bScore > aScore) return "b";
  return "tie";
}

export const QUIZ_VIBE_MAPPING: Record<string, number[]> = {
  // Q0: A=Architect, B=Socialite, C=Degen, D=Builder
  "0-0": [0],
  "0-1": [5],
  "0-2": [1],
  "0-3": [3],
  // Q1: A=Architect, B=Socialite, C=Ghost, D=Degen
  "1-0": [0],
  "1-1": [5],
  "1-2": [2],
  "1-3": [1],
  // Q2: A=Oracle, B=Socialite, C=Whale Hunter, D=Builder
  "2-0": [6],
  "2-1": [5],
  "2-2": [4],
  "2-3": [3],
  // Q3: A=Oracle, B=Socialite, C=Ghost, D=Builder
  "3-0": [6],
  "3-1": [5],
  "3-2": [2],
  "3-3": [3],
  // Q4: A=Oracle, B=Socialite, C=Ghost, D=Builder
  "4-0": [6],
  "4-1": [5],
  "4-2": [2],
  "4-3": [3],
};

export function computeVibeFromQuiz(answers: number[]): VibeTypeIndex {
  const scores = new Array(7).fill(0);
  answers.forEach((answer, qi) => {
    const key = `${qi}-${answer}`;
    const types = QUIZ_VIBE_MAPPING[key] ?? [];
    types.forEach((t) => scores[t]++);
  });
  const maxScore = Math.max(...scores);
  const candidates = scores
    .map((s, i) => ({ s, i }))
    .filter((x) => x.s === maxScore);
  const winner = candidates[Math.floor(Math.random() * candidates.length)];
  return winner.i as VibeTypeIndex;
}
