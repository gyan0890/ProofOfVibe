"use client";

import { useState, useCallback, useRef } from "react";
import { parseApiResponse, ApiScanResponse } from "@/lib/privacyScoring";
import { PrivacyProfile, VibeTypeIndex } from "@/lib/types";

export interface UsePrivacyScoreResult {
  scanning: boolean;
  profile: PrivacyProfile | null;
  vibeType: VibeTypeIndex | null;
  error: string | null;
  unsupportedChain: boolean;
  scan: (address: string) => Promise<void>;
  reset: () => void;
}

export function usePrivacyScore(): UsePrivacyScoreResult {
  const [scanning, setScanning] = useState(false);
  const [profile, setProfile] = useState<PrivacyProfile | null>(null);
  const [vibeType, setVibeType] = useState<VibeTypeIndex | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [unsupportedChain, setUnsupportedChain] = useState(false);

  const abortRef = useRef<AbortController | null>(null);

  const reset = useCallback(() => {
    abortRef.current?.abort();
    setScanning(false);
    setProfile(null);
    setVibeType(null);
    setError(null);
    setUnsupportedChain(false);
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

        // 422 = upstream returned {"error": "..."} — unsupported chain format
        if (response.status === 422) {
          const body = await response.json().catch(() => ({}));
          const msg: string = body?.error ?? "Address format not supported";
          if (msg.toLowerCase().includes("could not detect chain type")) {
            setUnsupportedChain(true);
          } else {
            setError(msg);
          }
          return;
        }

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

  return { scanning, profile, vibeType, error, unsupportedChain, scan, reset };
}
