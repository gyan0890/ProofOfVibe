"use client";

import { useState, useCallback, useRef } from "react";
import {
  ScanAccumulator,
  PrivacyProfile,
  processScanEvent,
  computePrivacyProfile,
  computeVibeFromPrivacy,
  chainName,
  EMPTY_ACCUMULATOR,
} from "@/lib/privacyScoring";
import { VibeTypeIndex } from "@/lib/types";

export interface ChainScanStatus {
  chainId: number;
  name: string;
  status: "pending" | "scanning" | "done" | "no_activity";
  progress: number; // 0–1
}

export interface UsePrivacyScoreResult {
  scanning: boolean;
  chainStatuses: ChainScanStatus[];
  profile: PrivacyProfile | null;
  vibeType: VibeTypeIndex | null;
  error: string | null;
  scan: (address: string) => Promise<void>;
  reset: () => void;
}

export function usePrivacyScore(): UsePrivacyScoreResult {
  const [scanning, setScanning] = useState(false);
  const [chainStatuses, setChainStatuses] = useState<ChainScanStatus[]>([]);
  const [profile, setProfile] = useState<PrivacyProfile | null>(null);
  const [vibeType, setVibeType] = useState<VibeTypeIndex | null>(null);
  const [error, setError] = useState<string | null>(null);

  const accRef = useRef<ScanAccumulator>({ ...EMPTY_ACCUMULATOR });
  const abortRef = useRef<AbortController | null>(null);

  const reset = useCallback(() => {
    abortRef.current?.abort();
    accRef.current = { ...EMPTY_ACCUMULATOR };
    setScanning(false);
    setChainStatuses([]);
    setProfile(null);
    setVibeType(null);
    setError(null);
  }, []);

  const scan = useCallback(
    async (address: string) => {
      reset();
      setScanning(true);

      const controller = new AbortController();
      abortRef.current = controller;

      try {
        const response = await fetch(
          `/api/privacy?address=${encodeURIComponent(address)}`,
          {
            signal: controller.signal,
            headers: { Accept: "text/event-stream" },
          }
        );

        if (!response.ok) {
          throw new Error(`Scan failed (${response.status})`);
        }

        const reader = response.body?.getReader();
        if (!reader) throw new Error("No response stream");

        const decoder = new TextDecoder();
        let buffer = "";
        let currentEvent = "";

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });

          // Split on newline — SSE lines are separated by \n
          const lines = buffer.split("\n");
          buffer = lines.pop() ?? ""; // Keep any incomplete trailing line

          for (const line of lines) {
            if (line.startsWith("event: ")) {
              currentEvent = line.slice(7).trim();
            } else if (line.startsWith("data: ")) {
              let data: unknown;
              try {
                data = JSON.parse(line.slice(6));
              } catch {
                continue; // Skip malformed JSON
              }

              // ── Chain status UI updates ──────────────────────────
              if (currentEvent === "chain:status") {
                const d = data as {
                  chainId: number;
                  status: string;
                  progress: number;
                };
                setChainStatuses((prev) => {
                  const existing = prev.find((c) => c.chainId === d.chainId);
                  const mapped =
                    d.status === "no_activity"
                      ? ("no_activity" as const)
                      : d.status === "scanning"
                      ? ("scanning" as const)
                      : ("pending" as const);
                  if (existing) {
                    return prev.map((c) =>
                      c.chainId === d.chainId
                        ? { ...c, status: mapped, progress: d.progress ?? 0 }
                        : c
                    );
                  }
                  return [
                    ...prev,
                    {
                      chainId: d.chainId,
                      name: chainName(d.chainId),
                      status: mapped,
                      progress: d.progress ?? 0,
                    },
                  ];
                });
              }

              // Mark chain done when its data arrives
              if (currentEvent === "chain:data") {
                const d = data as { chainId: number };
                setChainStatuses((prev) =>
                  prev.map((c) =>
                    c.chainId === d.chainId
                      ? { ...c, status: "done", progress: 1 }
                      : c
                  )
                );
              }

              // ── Accumulate ───────────────────────────────────────
              accRef.current = processScanEvent(
                accRef.current,
                currentEvent,
                data
              );

              // ── Compute scores on scan:complete ──────────────────
              if (currentEvent === "scan:complete") {
                const acc = accRef.current;
                const computedProfile = computePrivacyProfile(acc);
                const computedType = computeVibeFromPrivacy(
                  acc,
                  computedProfile
                );
                setProfile(computedProfile);
                setVibeType(computedType);
                // Mark all chains as done in case any were still "scanning"
                setChainStatuses((prev) =>
                  prev.map((c) =>
                    c.status === "scanning" ? { ...c, status: "done", progress: 1 } : c
                  )
                );
              }

              currentEvent = "";
            }
          }
        }
      } catch (err: unknown) {
        if (err instanceof Error && err.name !== "AbortError") {
          setError(err.message ?? "Scan failed");
        }
      } finally {
        setScanning(false);
      }
    },
    [reset]
  );

  return { scanning, chainStatuses, profile, vibeType, error, scan, reset };
}
