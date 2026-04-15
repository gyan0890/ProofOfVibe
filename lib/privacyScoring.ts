/**
 * Privacy scoring — parses the /api/scan/<address>/export JSON response
 * and maps it to a PrivacyProfile + VibeType.
 *
 * The API already computes the 4 pillar scores (0-100) with proper
 * weighting and evidence signals, so we use those directly rather than
 * recomputing them ourselves.
 */

import { VibeTypeIndex } from "./types";
import { PrivacyProfile } from "./types";

// ── API response shapes ────────────────────────────────────────────────────

export interface ApiEvidenceItem {
  signal: string;
  points: number;
  description: string;
  details?: Record<string, unknown>;
}

export interface ApiPillar {
  pillar: "identity" | "geographic" | "financial" | "behavioral";
  score: number;
  weight: number;
  confidence: "high" | "medium" | "low";
  evidence: ApiEvidenceItem[];
  summary: string;
}

export interface ApiScore {
  total: number;
  severity: "minimal" | "low" | "moderate" | "exposed" | "critical";
  pillars: ApiPillar[];
}

export interface ApiScanResponse {
  address: string;
  exportedAt: string;
  chainType: string;
  scan: {
    start: {
      address: string;
      ensName?: string;
      chains: number[];
      timestamp: number;
    };
    complete: {
      totalChains: number;
      activeChains: number;
      totalTransactions: number;
      scanDuration: number;
    };
  };
  score: ApiScore;
  // We don't parse chainData/labels/defiPositions — scores come from the API
}

// ── Map API scores → VibeType ──────────────────────────────────────────────

export function computeVibeFromApiScores(
  identity: number,
  geographic: number,
  financial: number,
  behavioral: number
): VibeTypeIndex {
  const overall = (identity + geographic + financial + behavioral) / 4;
  const s = new Array(7).fill(0);

  // 2 – Ghost: minimal footprint across the board
  if (overall < 20) s[2] += 40;
  if (identity < 15) s[2] += 20;
  if (geographic < 15) s[2] += 20;

  // 0 – Architect: methodical, patient, moderate exposure
  if (identity < 40 && behavioral < 40 && overall > 15) s[0] += 30;
  if (financial > 30 && behavioral < 40) s[0] += 15;

  // 1 – Degen: high geographic (CEX) + high behavioral velocity
  if (geographic > 60) s[1] += 30;
  if (behavioral > 60 && geographic > 40) s[1] += 25;

  // 3 – Builder: moderate behavioral, low geographic
  if (behavioral > 40 && behavioral < 70 && geographic < 35) s[3] += 35;
  if (geographic < 25 && behavioral > 30) s[3] += 15;

  // 4 – Whale Hunter: high financial, patient (low behavioral)
  if (financial > 60) s[4] += 35;
  if (financial > 40 && behavioral < 40) s[4] += 20;

  // 5 – Socialite: high identity (public), high behavioral
  if (identity > 60) s[5] += 35;
  if (identity > 40 && behavioral > 50) s[5] += 20;

  // 6 – Oracle: high behavioral, multi-protocol
  if (behavioral > 55 && geographic < 50) s[6] += 30;
  if (financial > 35 && behavioral > 55) s[6] += 20;

  const max = Math.max(...s);
  if (max === 0) return 2;

  const candidates = s.map((v, i) => ({ v, i })).filter((x) => x.v === max);
  return candidates[Math.floor(Math.random() * candidates.length)].i as VibeTypeIndex;
}

// ── Main parser ────────────────────────────────────────────────────────────

export function parseApiResponse(data: ApiScanResponse): {
  profile: PrivacyProfile;
  vibeType: VibeTypeIndex;
} {
  const pillars = data.score?.pillars ?? [];

  function pillar(name: ApiPillar["pillar"]): ApiPillar | undefined {
    return pillars.find((p) => p.pillar === name);
  }

  const identity = pillar("identity")?.score ?? 0;
  const geographic = pillar("geographic")?.score ?? 0;
  const financial = pillar("financial")?.score ?? 0;
  const behavioral = pillar("behavioral")?.score ?? 0;

  // Use the API's own summary strings as the revealed trait labels
  const identityLabel =
    pillar("identity")?.summary ?? "Identity unknown";
  const geographicLabel =
    pillar("geographic")?.summary ?? "Location undetected";
  const financialLabel =
    pillar("financial")?.summary ?? "Financial profile unknown";
  const behavioralLabel =
    pillar("behavioral")?.summary ?? "Behavioral pattern unknown";

  const profile: PrivacyProfile = {
    identityLeakage: identity,
    geographicSignal: geographic,
    financialProfile: financial,
    behavioralFingerprint: behavioral,
    identityLabel,
    geographicLabel,
    financialLabel,
    behavioralLabel,
    ensName: data.scan?.start?.ensName,
    scannedAddress: data.scan?.start?.address ?? data.address,
    scanTimestamp: Date.now(),
    totalTransactions: data.scan?.complete?.totalTransactions ?? 0,
  };

  const vibeType = computeVibeFromApiScores(
    identity,
    geographic,
    financial,
    behavioral
  );

  return { profile, vibeType };
}

// ── Chain name helper (kept for UI labels) ─────────────────────────────────

export const CHAIN_NAMES: Record<number, string> = {
  1: "Ethereum",
  42161: "Arbitrum",
  8453: "Base",
  10: "Optimism",
  137: "Polygon",
  56: "BSC",
};

export function chainName(id: number): string {
  return CHAIN_NAMES[id] ?? `Chain ${id}`;
}

// ── Legacy accumulator exports (kept so quizScoring.ts still compiles) ─────
// These are no longer used by the scan path but quizScoring imports the file.

export type { PrivacyProfile };
