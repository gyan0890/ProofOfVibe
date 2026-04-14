/**
 * Privacy scoring — computes 4 dimensions and a VibeType from Exposed.wtf SSE data.
 *
 * SSE event types consumed:
 *   scan:start   → address, ensName?, chains[]
 *   chain:data   → chainId, balanceUsd, txCount, transactions[]
 *   labels       → matches: Record<addr, EntityLabel>
 *   defi:positions → positions: DefiPosition[]
 *   linked:wallets → wallets: LinkedWallet[]
 *   scan:complete  → activeChains, totalTransactions
 */

import { VibeTypeIndex } from "./types";

// ── Raw SSE shapes ─────────────────────────────────────────────────────────

export interface ScanTransaction {
  blockNumber: string;
  timeStamp: string;
  hash: string;
  from: string;
  to: string;
  value: string;
  input: string;
  methodId: string;
  functionName: string;
  contractAddress: string;
  gasPrice?: string;
  isError?: string;
}

export interface EntityLabel {
  entityName: string;
  entityType: string; // "exchange_cex" | "exchange_dex" | "defi_protocol" | "nft_marketplace" | …
  isKyc: boolean;
  region?: string;
}

export interface LinkedWallet {
  address: string;
  relationship: string; // "funded_by" | "major_outflow"
  totalSentUsd: number;
  currentBalanceUsd: number;
  chainType: string;
}

export interface DefiPosition {
  protocol?: string;
  valueUsd?: number;
}

// ── Accumulator (built up as SSE events stream in) ─────────────────────────

export interface ScanAccumulator {
  address: string;
  ensName?: string;
  chains: number[];
  totalBalanceUsd: number;
  totalTransactions: number;
  transactions: ScanTransaction[];
  labels: Record<string, EntityLabel>;
  linkedWallets: LinkedWallet[];
  defiPositions: DefiPosition[];
  activeChains: number;
  scanComplete: boolean;
}

export const EMPTY_ACCUMULATOR: ScanAccumulator = {
  address: "",
  ensName: undefined,
  chains: [],
  totalBalanceUsd: 0,
  totalTransactions: 0,
  transactions: [],
  labels: {},
  linkedWallets: [],
  defiPositions: [],
  activeChains: 0,
  scanComplete: false,
};

// ── Output ─────────────────────────────────────────────────────────────────

export interface PrivacyProfile {
  /** 0–100: higher = more identity information publicly linked */
  identityLeakage: number;
  /** 0–100: higher = geographic origin more determinable */
  geographicSignal: number;
  /** 0–100: higher = financial picture more visible */
  financialProfile: number;
  /** 0–100: higher = on-chain behaviour more traceable */
  behavioralFingerprint: number;

  /** Short label revealed after 1st battle loss */
  identityLabel: string;
  /** Short label revealed after 2nd loss */
  geographicLabel: string;
  /** Short label revealed after 3rd loss */
  financialLabel: string;
  /** Short label revealed after 5th loss */
  behavioralLabel: string;

  ensName?: string;
  scannedAddress: string;
  scanTimestamp: number;
  totalTransactions: number;
}

// ── Event processor ────────────────────────────────────────────────────────

export function processScanEvent(
  acc: ScanAccumulator,
  eventType: string,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  data: any
): ScanAccumulator {
  switch (eventType) {
    case "scan:start":
      return {
        ...acc,
        address: data.address ?? acc.address,
        ensName: data.ensName ?? acc.ensName,
        chains: data.chains ?? acc.chains,
      };

    case "chain:data":
      return {
        ...acc,
        totalBalanceUsd: acc.totalBalanceUsd + (data.balanceUsd ?? 0),
        totalTransactions: acc.totalTransactions + (data.txCount ?? 0),
        transactions: [...acc.transactions, ...(data.transactions ?? [])],
      };

    case "labels":
      return {
        ...acc,
        labels: { ...acc.labels, ...(data.matches ?? {}) },
      };

    case "linked:wallets":
      return { ...acc, linkedWallets: data.wallets ?? [] };

    case "defi:positions":
      return { ...acc, defiPositions: data.positions ?? [] };

    case "scan:complete":
      return {
        ...acc,
        activeChains: data.activeChains ?? acc.activeChains,
        // API summary count is authoritative
        totalTransactions: data.totalTransactions ?? acc.totalTransactions,
        scanComplete: true,
      };

    default:
      return acc;
  }
}

// ── Score computation ──────────────────────────────────────────────────────

export function computePrivacyProfile(acc: ScanAccumulator): PrivacyProfile {
  const {
    address,
    ensName,
    labels,
    transactions,
    linkedWallets,
    defiPositions,
    totalBalanceUsd,
    totalTransactions,
    activeChains,
  } = acc;

  const labelValues = Object.values(labels);
  const cexLabels = labelValues.filter((l) => l.entityType === "exchange_cex");
  const dexLabels = labelValues.filter((l) => l.entityType === "exchange_dex");
  const kycCex = cexLabels.filter((l) => l.isKyc);
  const regionSet = new Set(labelValues.filter((l) => l.region).map((l) => l.region!));
  const regions = Array.from(regionSet);

  const txAddresses = transactions
    .map((tx) => tx.to?.toLowerCase())
    .filter(Boolean) as string[];

  function txCountTo(type: string) {
    return txAddresses.filter((a) => labels[a]?.entityType === type).length;
  }

  const cexTxCount = txCountTo("exchange_cex");

  // ── Identity Leakage ──────────────────────────────────────────────
  let identityScore = 0;
  if (ensName) identityScore += 40; // ENS directly names you
  identityScore += Math.min(kycCex.length * 20, 40); // Each KYC CEX: +20 (cap 40)
  identityScore += Math.min(linkedWallets.length * 8, 15); // Linked wallets
  identityScore += Math.min(cexTxCount, 5); // Minor: raw interaction count
  identityScore = Math.min(identityScore, 100);

  let identityLabel = "No clear identity markers";
  if (ensName && kycCex.length > 0) {
    identityLabel = `${ensName} · ${kycCex.length} KYC exchange${kycCex.length > 1 ? "s" : ""}`;
  } else if (ensName) {
    identityLabel = `ENS: ${ensName}`;
  } else if (kycCex.length > 0) {
    identityLabel = `${kycCex.map((l) => l.entityName).join(", ")} (KYC)`;
  } else if (cexLabels.length > 0) {
    identityLabel = `${cexLabels.map((l) => l.entityName).join(", ")} user`;
  }

  // ── Geographic Signal ─────────────────────────────────────────────
  let geographicScore = 0;
  if (regions.length > 0) geographicScore += 50;
  if (regions.length >= 2) geographicScore += 20;
  if (kycCex.some((l) => l.region)) geographicScore += 20;
  geographicScore = Math.min(geographicScore, 100);

  let geographicLabel = "Location undetected";
  if (regions.length > 0) {
    geographicLabel = regions[0];
    if (regions.length > 1) geographicLabel += ` +${regions.length - 1} signal${regions.length > 2 ? "s" : ""}`;
  }

  // ── Financial Profile ─────────────────────────────────────────────
  let financialScore = 0;
  if (totalBalanceUsd > 50) financialScore += 10;
  if (totalBalanceUsd > 500) financialScore += 15;
  if (totalBalanceUsd > 5_000) financialScore += 20;
  if (totalBalanceUsd > 50_000) financialScore += 25;
  if (totalBalanceUsd > 500_000) financialScore += 20;
  if (totalTransactions > 20) financialScore += 5;
  if (totalTransactions > 100) financialScore += 5;
  if (totalTransactions > 500) financialScore += 5;
  if (defiPositions.length > 0) financialScore += 10;
  if (defiPositions.length > 3) financialScore += 10;
  financialScore = Math.min(financialScore, 100);

  let financialLabel = `$${
    totalBalanceUsd < 1
      ? totalBalanceUsd.toFixed(4)
      : totalBalanceUsd.toFixed(0)
  } on-chain · ${totalTransactions} txs`;
  if (defiPositions.length > 0)
    financialLabel += ` · ${defiPositions.length} DeFi position${defiPositions.length > 1 ? "s" : ""}`;

  // ── Behavioral Fingerprint ────────────────────────────────────────
  const uniqueAddresses = new Set(txAddresses).size;
  const contractDeployments = transactions.filter(
    (tx) => tx.contractAddress && tx.contractAddress !== ""
  ).length;

  let behavioralScore = 0;
  behavioralScore += Math.min(uniqueAddresses * 0.4, 20);
  behavioralScore += Math.min(dexLabels.length * 10, 30);
  if (activeChains >= 2) behavioralScore += 15;
  if (activeChains >= 4) behavioralScore += 15;
  if (contractDeployments > 0) behavioralScore += 10;
  if (cexTxCount > 5) behavioralScore += 10;
  behavioralScore = Math.min(behavioralScore, 100);

  const behaviorParts: string[] = [];
  if (dexLabels.length > 0)
    behaviorParts.push(dexLabels.map((l) => l.entityName).join(", "));
  if (cexTxCount > 0) behaviorParts.push("CEX user");
  if (contractDeployments > 0) behaviorParts.push("deployer");
  if (activeChains >= 2) behaviorParts.push(`${activeChains} chains`);
  const behavioralLabel =
    behaviorParts.length > 0
      ? behaviorParts.join(" · ")
      : `${uniqueAddresses} unique addresses`;

  return {
    identityLeakage: identityScore,
    geographicSignal: geographicScore,
    financialProfile: financialScore,
    behavioralFingerprint: behavioralScore,
    identityLabel,
    geographicLabel,
    financialLabel,
    behavioralLabel,
    ensName,
    scannedAddress: address,
    scanTimestamp: Date.now(),
    totalTransactions,
  };
}

// ── VibeType from scan signals ─────────────────────────────────────────────

export function computeVibeFromPrivacy(
  acc: ScanAccumulator,
  _profile: PrivacyProfile
): VibeTypeIndex {
  const {
    transactions,
    labels,
    defiPositions,
    activeChains,
    totalTransactions,
    totalBalanceUsd,
    ensName,
  } = acc;

  if (totalTransactions === 0) return 2; // No data → Ghost

  const labelValues = Object.values(labels);
  const txAddresses = transactions
    .map((tx) => tx.to?.toLowerCase())
    .filter(Boolean) as string[];

  const cexCount = labelValues.filter(
    (l) => l.entityType === "exchange_cex"
  ).length;
  const dexCount = labelValues.filter(
    (l) => l.entityType === "exchange_dex"
  ).length;
  const nftCount = labelValues.filter((l) =>
    l.entityType?.includes("nft")
  ).length;

  const cexTxCount = txAddresses.filter(
    (a) => labels[a]?.entityType === "exchange_cex"
  ).length;

  const uniqueAddresses = new Set(txAddresses).size;
  const contractDeployments = transactions.filter(
    (tx) => tx.contractAddress && tx.contractAddress !== ""
  ).length;

  const timestamps = transactions
    .map((tx) => parseInt(tx.timeStamp || "0"))
    .filter((t) => t > 0);
  const oldestTs =
    timestamps.length > 0 ? Math.min(...timestamps) : Date.now() / 1000;
  const accountAgeDays = (Date.now() / 1000 - oldestTs) / 86400;
  const txPerDay = totalTransactions / Math.max(accountAgeDays, 1);

  const scores = new Array(7).fill(0);

  // 0 – Architect: methodical, long-horizon, governance-native
  if (accountAgeDays > 365) scores[0] += 20;
  if (accountAgeDays > 730) scores[0] += 20;
  if (txPerDay < 0.3 && totalTransactions > 10) scores[0] += 25;
  if (txPerDay < 1 && totalTransactions > 50) scores[0] += 10;

  // 1 – Degen: high-velocity, risk-tolerant
  if (totalTransactions > 100) scores[1] += 20;
  if (txPerDay > 1) scores[1] += 20;
  if (txPerDay > 3) scores[1] += 20;
  if (cexTxCount > 10) scores[1] += 15;

  // 2 – Ghost: minimal-footprint, privacy-seeking
  if (totalTransactions < 30) scores[2] += 30;
  if (!ensName) scores[2] += 20;
  if (cexCount === 0) scores[2] += 20;
  if (activeChains <= 1) scores[2] += 10;
  if (_profile.identityLeakage < 20) scores[2] += 15;

  // 3 – Builder: contract-deployer, testnet-native
  if (contractDeployments > 0) scores[3] += 40;
  if (contractDeployments > 3) scores[3] += 20;
  if (accountAgeDays > 500 && dexCount >= 2) scores[3] += 10;

  // 4 – Whale Hunter: large-positions, patient-accumulator
  if (totalBalanceUsd > 10_000) scores[4] += 30;
  if (totalBalanceUsd > 50_000) scores[4] += 30;
  if (defiPositions.length >= 2) scores[4] += 20;
  if (totalBalanceUsd > 1_000 && txPerDay < 0.5) scores[4] += 15;

  // 5 – Socialite: frequent-connector, NFT-native
  if (nftCount > 0) scores[5] += 30;
  if (nftCount >= 3) scores[5] += 20;
  if (uniqueAddresses > 30) scores[5] += 15;
  if (uniqueAddresses > 100) scores[5] += 15;

  // 6 – Oracle: data-driven, yield-optimizer, multi-protocol
  if (dexCount >= 2) scores[6] += 20;
  if (dexCount >= 4) scores[6] += 20;
  if (activeChains >= 3) scores[6] += 20;
  if (defiPositions.length >= 1) scores[6] += 10;
  if (defiPositions.length >= 3) scores[6] += 10;
  if (dexCount >= 2 && activeChains >= 2) scores[6] += 15;

  const max = Math.max(...scores);
  if (max === 0) return 2; // Default Ghost

  const candidates = scores
    .map((s, i) => ({ s, i }))
    .filter((x) => x.s === max);
  return candidates[Math.floor(Math.random() * candidates.length)]
    .i as VibeTypeIndex;
}

// ── Chain name helper ──────────────────────────────────────────────────────

export const CHAIN_NAMES: Record<number, string> = {
  1: "Ethereum",
  42161: "Arbitrum",
  8453: "Base",
  10: "Optimism",
  137: "Polygon",
  56: "BSC",
  900: "Starknet",
};

export function chainName(chainId: number): string {
  return CHAIN_NAMES[chainId] ?? `Chain ${chainId}`;
}
