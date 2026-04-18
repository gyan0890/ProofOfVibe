import { SEASON_START, SEASON_DURATION_DAYS } from "./constants";

export function truncateAddress(addr: string): string {
  if (!addr || addr.length < 10) return addr;
  return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
}

export function currentSeasonDay(): number {
  const now = Date.now();
  const elapsed = now - SEASON_START;
  const day = Math.floor(elapsed / (24 * 60 * 60 * 1000)) + 1;
  return Math.min(Math.max(day, 1), SEASON_DURATION_DAYS);
}

export function seasonTimeRemaining(): { days: number; hours: number; minutes: number; seconds: number } {
  const end = SEASON_START + SEASON_DURATION_DAYS * 24 * 60 * 60 * 1000;
  const remaining = Math.max(0, end - Date.now());
  const days = Math.floor(remaining / (24 * 60 * 60 * 1000));
  const hours = Math.floor((remaining % (24 * 60 * 60 * 1000)) / (60 * 60 * 1000));
  const minutes = Math.floor((remaining % (60 * 60 * 1000)) / 60000);
  const seconds = Math.floor((remaining % 60000) / 1000);
  return { days, hours, minutes, seconds };
}

export function generatePersonaName(): string {
  const adjectives = [
    "Mystic", "Shadow", "Cosmic", "Veiled", "Silent", "Neon", "Phantom",
    "Ancient", "Drifting", "Primal", "Obsidian", "Forgotten",
  ];
  const nouns = [
    "Wanderer", "Seeker", "Cipher", "Echo", "Specter", "Rune",
    "Signal", "Vessel", "Current", "Thread", "Glyph",
  ];
  const adj = adjectives[Math.floor(Math.random() * adjectives.length)];
  const noun = nouns[Math.floor(Math.random() * nouns.length)];
  const num = Math.floor(Math.random() * 900000) + 100000;
  return `${adj} ${noun} #${num}`;
}

export function generateSalt(): string {
  // 31 bytes = 248 bits, guaranteed below Stark curve prime (~252 bits)
  const array = new Uint8Array(31);
  crypto.getRandomValues(array);
  return Array.from(array)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export function revealPercent(lossCount: number): number {
  if (lossCount === 0) return 0;
  if (lossCount < 2) return 12;
  if (lossCount < 3) return 25;
  if (lossCount < 5) return 40;
  if (lossCount < 8) return 65;
  return 100;
}

export function formatCountdown(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000);
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  return `${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
}
