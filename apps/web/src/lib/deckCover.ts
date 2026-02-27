"use client";

export const DECK_COVER_STORAGE_PREFIX = "ruptura_deck_cover_";

export function deckCoverStorageKey(deckId: string): string {
  return `${DECK_COVER_STORAGE_PREFIX}${deckId}`;
}

export function getDeckCoverCardId(deckId: string): string | null {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(deckCoverStorageKey(deckId));
}

export function setDeckCoverCardId(deckId: string, cardId: string): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(deckCoverStorageKey(deckId), cardId);
}
