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
    if (!raw) return null;
    const card = JSON.parse(raw) as CardData;

    // Migration: strip trait words from cards with no losses — they were
    // incorrectly pre-populated before the "seal at mint" fix (2026-04-20).
    const losses = card.traitReveal?.lossCount ?? card.battleRecord?.losses ?? 0;
    if (losses === 0 && (card.traitReveal?.trait1Word || card.traitReveal?.trait2Word || card.traitReveal?.trait3Word)) {
      card.traitReveal = {
        ...card.traitReveal,
        trait1Word: undefined,
        trait2Word: undefined,
        trait3Word: undefined,
      };
      localStorage.setItem(CARD_KEY, JSON.stringify(card));
    }

    return card;
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
