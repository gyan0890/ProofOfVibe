import { CardData } from "./types";

const CARD_KEY = "pov_card";

export function saveCardLocally(card: CardData): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(CARD_KEY, JSON.stringify(card));
}

export function loadLocalCard(): CardData | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(CARD_KEY);
    return raw ? (JSON.parse(raw) as CardData) : null;
  } catch {
    return null;
  }
}

export function clearLocalCard(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(CARD_KEY);
}

export function updateLocalCard(patch: Partial<CardData>): void {
  const card = loadLocalCard();
  if (!card) return;
  saveCardLocally({ ...card, ...patch });
}
