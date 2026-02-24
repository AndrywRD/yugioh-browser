"use client";

import { BASE_DECK_TEMPLATE_IDS, CARD_INDEX, compressTemplateIdsToDeck, validateDeck } from "@ruptura-arcana/game";
import type { Deck, DeckValidation } from "@ruptura-arcana/shared";

export const DECKS_STORAGE_KEY = "ruptura_decks_v1";
export const ACTIVE_DECK_STORAGE_KEY = "ruptura_active_deck_id_v1";

export interface DeckCollection {
  decks: Deck[];
  activeDeckId: string | null;
}

function generateDeckId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `deck-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

function cloneDeck(deck: Deck): Deck {
  return {
    ...deck,
    cards: deck.cards.map((entry) => ({ ...entry }))
  };
}

function sanitizeDeck(deck: Deck): Deck {
  const counter = new Map<string, number>();

  for (const entry of deck.cards) {
    if (!entry?.cardId || !CARD_INDEX[entry.cardId]) continue;
    const rawCount = Number(entry.count);
    if (!Number.isFinite(rawCount)) continue;
    const normalizedCount = Math.max(1, Math.floor(rawCount));
    counter.set(entry.cardId, (counter.get(entry.cardId) ?? 0) + normalizedCount);
  }

  return {
    ...deck,
    name: deck.name?.trim() || "Deck sem nome",
    cards: Array.from(counter.entries())
      .map(([cardId, count]) => ({ cardId, count }))
      .sort((a, b) => a.cardId.localeCompare(b.cardId)),
    updatedAt: Number.isFinite(deck.updatedAt) ? deck.updatedAt : Date.now()
  };
}

export function deckCardTotal(deck: Deck): number {
  return deck.cards.reduce((sum, entry) => sum + entry.count, 0);
}

export function createDeck(name = "Novo Deck", templateIds: string[] = BASE_DECK_TEMPLATE_IDS.slice(0, 40)): Deck {
  return compressTemplateIdsToDeck(templateIds, {
    id: generateDeckId(),
    name,
    updatedAt: Date.now()
  });
}

export function createEmptyDeck(name = "Novo Deck"): Deck {
  return {
    id: generateDeckId(),
    name,
    cards: [],
    updatedAt: Date.now()
  };
}

export function validateDeckForUi(deck: Deck): DeckValidation {
  return validateDeck(deck);
}

export function getDeckById(collection: DeckCollection, deckId: string | null): Deck | null {
  if (!deckId) return null;
  return collection.decks.find((deck) => deck.id === deckId) ?? null;
}

export function ensureDeckCollection(value: DeckCollection | null | undefined): DeckCollection {
  if (value && value.decks.length > 0) {
    const decks = value.decks.map((deck) => sanitizeDeck(cloneDeck(deck)));
    const activeExists = value.activeDeckId && decks.some((deck) => deck.id === value.activeDeckId);
    return {
      decks,
      activeDeckId: activeExists ? value.activeDeckId : decks[0].id
    };
  }

  const starter = createDeck("Deck Inicial");
  return {
    decks: [starter],
    activeDeckId: starter.id
  };
}

export function loadDeckCollection(): DeckCollection {
  if (typeof window === "undefined") {
    return ensureDeckCollection(null);
  }

  try {
    const rawDecks = window.localStorage.getItem(DECKS_STORAGE_KEY);
    const rawActiveDeckId = window.localStorage.getItem(ACTIVE_DECK_STORAGE_KEY);
    const decks = rawDecks ? (JSON.parse(rawDecks) as Deck[]) : [];
    return ensureDeckCollection({
      decks,
      activeDeckId: rawActiveDeckId
    });
  } catch {
    return ensureDeckCollection(null);
  }
}

export function saveDeckCollection(collection: DeckCollection): void {
  if (typeof window === "undefined") return;
  const normalized = ensureDeckCollection(collection);
  window.localStorage.setItem(DECKS_STORAGE_KEY, JSON.stringify(normalized.decks));
  if (normalized.activeDeckId) {
    window.localStorage.setItem(ACTIVE_DECK_STORAGE_KEY, normalized.activeDeckId);
  }
}

export function mergeDeckCollections(local: DeckCollection, remote: DeckCollection): DeckCollection {
  const byId = new Map<string, Deck>();
  for (const deck of local.decks) {
    byId.set(deck.id, cloneDeck(deck));
  }
  for (const deck of remote.decks) {
    const current = byId.get(deck.id);
    if (!current || deck.updatedAt >= current.updatedAt) {
      byId.set(deck.id, cloneDeck(deck));
    }
  }

  const mergedDecks = Array.from(byId.values()).sort((a, b) => b.updatedAt - a.updatedAt);
  const desiredActiveDeckId =
    remote.activeDeckId && mergedDecks.some((deck) => deck.id === remote.activeDeckId)
      ? remote.activeDeckId
      : local.activeDeckId && mergedDecks.some((deck) => deck.id === local.activeDeckId)
        ? local.activeDeckId
        : mergedDecks[0]?.id ?? null;

  return ensureDeckCollection({
    decks: mergedDecks,
    activeDeckId: desiredActiveDeckId
  });
}

export function upsertDeck(collection: DeckCollection, nextDeck: Deck): DeckCollection {
  const normalizedDeck: Deck = {
    ...cloneDeck(nextDeck),
    updatedAt: Date.now()
  };
  const index = collection.decks.findIndex((deck) => deck.id === normalizedDeck.id);
  const decks = [...collection.decks];
  if (index >= 0) {
    decks[index] = normalizedDeck;
  } else {
    decks.unshift(normalizedDeck);
  }

  return ensureDeckCollection({
    decks,
    activeDeckId: collection.activeDeckId ?? normalizedDeck.id
  });
}

export function removeDeck(collection: DeckCollection, deckId: string): DeckCollection {
  const decks = collection.decks.filter((deck) => deck.id !== deckId);
  const activeDeckId = collection.activeDeckId === deckId ? decks[0]?.id ?? null : collection.activeDeckId;
  return ensureDeckCollection({
    decks,
    activeDeckId
  });
}

export function duplicateDeck(deck: Deck): Deck {
  return {
    ...cloneDeck(deck),
    id: generateDeckId(),
    name: `${deck.name} (Copia)`,
    updatedAt: Date.now()
  };
}

export function renameDeck(deck: Deck, name: string): Deck {
  return {
    ...cloneDeck(deck),
    name: name.trim() || deck.name,
    updatedAt: Date.now()
  };
}

export function setDeckActive(collection: DeckCollection, deckId: string): DeckCollection {
  if (!collection.decks.some((deck) => deck.id === deckId)) {
    return ensureDeckCollection(collection);
  }
  return ensureDeckCollection({
    decks: collection.decks.map(cloneDeck),
    activeDeckId: deckId
  });
}

export function addCardToDeck(deck: Deck, cardId: string): Deck {
  if (!CARD_INDEX[cardId]) return deck;
  const entries = [...deck.cards];
  const index = entries.findIndex((entry) => entry.cardId === cardId);
  if (index >= 0) {
    entries[index] = {
      ...entries[index],
      count: Math.min(99, entries[index].count + 1)
    };
  } else {
    entries.push({ cardId, count: 1 });
  }
  return {
    ...deck,
    cards: entries.sort((a, b) => a.cardId.localeCompare(b.cardId)),
    updatedAt: Date.now()
  };
}

export function removeCardFromDeck(deck: Deck, cardId: string): Deck {
  const entries = [...deck.cards];
  const index = entries.findIndex((entry) => entry.cardId === cardId);
  if (index < 0) return deck;

  const nextCount = entries[index].count - 1;
  if (nextCount <= 0) {
    entries.splice(index, 1);
  } else {
    entries[index] = { ...entries[index], count: nextCount };
  }

  return {
    ...deck,
    cards: entries,
    updatedAt: Date.now()
  };
}

export function exportDeckAsJson(deck: Deck): string {
  return JSON.stringify(
    {
      name: deck.name,
      cards: deck.cards
    },
    null,
    2
  );
}

export function importDeckFromJson(raw: string): Deck {
  const parsed = JSON.parse(raw) as unknown;
  if (!parsed || typeof parsed !== "object") {
    throw new Error("JSON invalido");
  }

  if (Array.isArray(parsed)) {
    if (!parsed.every((item) => typeof item === "string")) {
      throw new Error("Lista de IDs invalida");
    }
    return compressTemplateIdsToDeck(parsed, {
      id: generateDeckId(),
      name: "Deck Importado",
      updatedAt: Date.now()
    });
  }

  const maybeDeck = parsed as { name?: unknown; cards?: unknown };
  if (!Array.isArray(maybeDeck.cards)) {
    throw new Error("Formato de deck invalido");
  }

  const entries = maybeDeck.cards
    .map((entry) => {
      if (!entry || typeof entry !== "object") return null;
      const cardId = (entry as { cardId?: unknown }).cardId;
      const count = (entry as { count?: unknown }).count;
      if (typeof cardId !== "string" || typeof count !== "number" || !Number.isInteger(count) || count <= 0) return null;
      return { cardId, count };
    })
    .filter((entry): entry is { cardId: string; count: number } => Boolean(entry));

  return {
    id: generateDeckId(),
    name: typeof maybeDeck.name === "string" ? maybeDeck.name : "Deck Importado",
    cards: entries,
    updatedAt: Date.now()
  };
}
