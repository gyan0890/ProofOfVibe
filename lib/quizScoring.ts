/**
 * Quiz-based privacy scoring.
 *
 * Converts the answer choices from QUIZ_QUESTIONS into the same 4-dimension
 * PrivacyProfile used by the wallet scanner, so both paths produce a uniform card.
 */

import { PrivacyProfile } from "./types";
import { VibeTypeIndex } from "./types";
import { QuizQuestion, QuizAnswerScores } from "@/demo/mockData";

// ── Max possible score per dimension (sum of the highest answer score across all 5 questions)
// These are derived from the QUIZ_QUESTIONS answer scores and are used to normalise to 0–100.
export const QUIZ_DIMENSION_MAXES: QuizAnswerScores = {
  identity: 90 + 35 + 45 + 30 + 70,   // = 270
  geographic: 30 + 85 + 20 + 35 + 25, // = 195
  financial: 20 + 25 + 85 + 55 + 30,  // = 215
  behavioral: 40 + 70 + 45 + 85 + 60, // = 300
};

// ── Score → human-readable label ──────────────────────────────────────────

function identityLabel(score: number): string {
  if (score >= 70) return "Public identity · ENS / social linked";
  if (score >= 45) return "Semi-public · selective disclosure";
  if (score >= 20) return "Pseudonymous · protocol-only exposure";
  return "Anonymous · no identity markers";
}

function geographicLabel(score: number): string {
  if (score >= 65) return "KYC exchange user · region traceable";
  if (score >= 35) return "Mixed CEX / DEX · partial signal";
  if (score >= 15) return "DEX-only · minimal geo signal";
  return "No geographic footprint";
}

function financialLabel(score: number): string {
  if (score >= 65) return "Visible bag · balance trackable";
  if (score >= 40) return "Moderate exposure · active wallet";
  if (score >= 15) return "Distributed · hard to size";
  return "Cold storage · minimal visibility";
}

function behavioralLabel(score: number): string {
  if (score >= 70) return "High-frequency · multi-protocol";
  if (score >= 45) return "DeFi native · traceable patterns";
  if (score >= 25) return "Builder patterns · deployer";
  return "Minimal footprint · rare mover";
}

// ── Scores → VibeType ──────────────────────────────────────────────────────

function computeVibeFromScores(
  identity: number,
  geographic: number,
  financial: number,
  behavioral: number
): VibeTypeIndex {
  const overall = (identity + geographic + financial + behavioral) / 4;
  const s = new Array(7).fill(0);

  // 2 – Ghost: minimal footprint, privacy-seeking
  if (overall < 20) s[2] += 40;
  if (identity < 15) s[2] += 20;
  if (geographic < 10) s[2] += 20;

  // 0 – Architect: methodical, patient
  if (identity < 40 && behavioral < 40 && overall > 15) s[0] += 30;
  if (financial > 30 && behavioral < 40) s[0] += 15;

  // 1 – Degen: high-velocity, CEX-heavy
  if (geographic > 60) s[1] += 30;
  if (behavioral > 60 && geographic > 40) s[1] += 25;

  // 3 – Builder: deploys contracts, low geo exposure
  if (behavioral > 40 && behavioral < 70 && identity < 30) s[3] += 35;
  if (geographic < 20 && behavioral > 30) s[3] += 15;

  // 4 – Whale Hunter: large financial exposure, patient
  if (financial > 60) s[4] += 35;
  if (financial > 40 && behavioral < 40) s[4] += 20;

  // 5 – Socialite: public identity, community
  if (identity > 60) s[5] += 35;
  if (identity > 40 && behavioral > 50) s[5] += 20;

  // 6 – Oracle: multi-protocol, data-driven
  if (behavioral > 55 && geographic < 50) s[6] += 30;
  if (financial > 35 && behavioral > 55) s[6] += 20;

  const max = Math.max(...s);
  if (max === 0) return 2; // Default → Ghost

  const candidates = s.map((v, i) => ({ v, i })).filter((x) => x.v === max);
  return candidates[Math.floor(Math.random() * candidates.length)].i as VibeTypeIndex;
}

// ── Main export ────────────────────────────────────────────────────────────

export function computePrivacyFromQuiz(
  questions: QuizQuestion[],
  answers: number[]
): { profile: PrivacyProfile; vibeType: VibeTypeIndex } {
  // Sum raw score contributions from each answer
  const totals: QuizAnswerScores = { identity: 0, geographic: 0, financial: 0, behavioral: 0 };
  answers.forEach((answerIdx, qi) => {
    const answer = questions[qi]?.answers[answerIdx];
    if (!answer) return;
    totals.identity += answer.scores.identity;
    totals.geographic += answer.scores.geographic;
    totals.financial += answer.scores.financial;
    totals.behavioral += answer.scores.behavioral;
  });

  // Normalise to 0–100
  const norm = (val: number, max: number) =>
    Math.min(Math.round((val / max) * 100), 100);

  const identity = norm(totals.identity, QUIZ_DIMENSION_MAXES.identity);
  const geographic = norm(totals.geographic, QUIZ_DIMENSION_MAXES.geographic);
  const financial = norm(totals.financial, QUIZ_DIMENSION_MAXES.financial);
  const behavioral = norm(totals.behavioral, QUIZ_DIMENSION_MAXES.behavioral);

  const profile: PrivacyProfile = {
    identityLeakage: identity,
    geographicSignal: geographic,
    financialProfile: financial,
    behavioralFingerprint: behavioral,
    identityLabel: identityLabel(identity),
    geographicLabel: geographicLabel(geographic),
    financialLabel: financialLabel(financial),
    behavioralLabel: behavioralLabel(behavioral),
    scannedAddress: "quiz",
    scanTimestamp: Date.now(),
    totalTransactions: 0,
  };

  const vibeType = computeVibeFromScores(identity, geographic, financial, behavioral);

  return { profile, vibeType };
}
