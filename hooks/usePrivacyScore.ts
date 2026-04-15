"use client";

import { useState, useCallback, useRef } from "react";
import { parseApiResponse, ApiScanResponse } from "@/lib/privacyScoring";
import { PrivacyProfile, VibeTypeIndex } from "@/lib/types";

export interface UsePrivacyScoreResult {
  scanning: boolean;
  profile: PrivacyProfile | null;
  vibeType: VibeTypeIndex | null;
  error: string | null;
  scan: (address: string) => Promise<void>;
  reset: () => void;
}

export function usePrivacyScore(): UsePrivacyScoreResult {
  const [scanning, setScanning] = useState(false);
  const [profile, setProfile] = useState<PrivacyProfile | null>(null);
  const [vibeType, setVibeType] = useState<VibeTypeIndex | null>(null);
  const [error, setError] = useState<string | null>(null);

  const abortRef = useRef<AbortController | null>(null);

  const reset = useCallback(() => {
    abortRef.current?.abort();
    setScanning(false);
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
          { signal: controller.signal }
        );

        if (!response.ok) {
          const text = await response.text().catch(() => "");
          throw new Error(
            text ? `Scan failed: ${text}` : `Scan failed (${response.status})`
          );
        }

        const data: ApiScanResponse = await response.json();
        const { profile: p, vibeType: v } = parseApiResponse(data);
        setProfile(p);
        setVibeType(v);
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

  return { scanning, profile, vibeType, error, scan, reset };
}
