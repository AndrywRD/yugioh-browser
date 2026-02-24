import { BASE_DECK_TEMPLATE_IDS, compressTemplateIdsToDeck } from "@ruptura-arcana/game";
import type { Deck } from "@ruptura-arcana/shared";

export interface PlayerDeckState {
  decks: Deck[];
  activeDeckId: string | null;
}

function cloneDeck(deck: Deck): Deck {
  return {
    ...deck,
    cards: deck.cards.map((entry) => ({ ...entry }))
  };
}

function createDefaultDeck(playerId: string): Deck {
  return compressTemplateIdsToDeck(BASE_DECK_TEMPLATE_IDS.slice(0, 40), {
    id: `default-${playerId.slice(0, 8)}`,
    name: "Deck Inicial",
    updatedAt: Date.now()
  });
}

export class InMemoryDeckStore {
  private state = new Map<string, PlayerDeckState>();

  ensurePlayer(playerId: string): PlayerDeckState {
    const existing = this.state.get(playerId);
    if (existing) return existing;

    const starterDeck = createDefaultDeck(playerId);
    const created: PlayerDeckState = {
      decks: [starterDeck],
      activeDeckId: starterDeck.id
    };
    this.state.set(playerId, created);
    return created;
  }

  list(playerId: string): PlayerDeckState {
    const value = this.ensurePlayer(playerId);
    return {
      activeDeckId: value.activeDeckId,
      decks: value.decks.map(cloneDeck)
    };
  }

  save(playerId: string, deck: Deck): PlayerDeckState {
    const value = this.ensurePlayer(playerId);
    const normalized: Deck = {
      ...cloneDeck(deck),
      updatedAt: Date.now()
    };
    const index = value.decks.findIndex((item) => item.id === normalized.id);
    if (index >= 0) {
      value.decks[index] = normalized;
    } else {
      value.decks.unshift(normalized);
    }
    if (!value.activeDeckId) {
      value.activeDeckId = normalized.id;
    }
    return this.list(playerId);
  }

  delete(playerId: string, deckId: string): PlayerDeckState {
    const value = this.ensurePlayer(playerId);
    value.decks = value.decks.filter((deck) => deck.id !== deckId);
    if (value.decks.length === 0) {
      const starterDeck = createDefaultDeck(playerId);
      value.decks = [starterDeck];
      value.activeDeckId = starterDeck.id;
    } else if (value.activeDeckId === deckId) {
      value.activeDeckId = value.decks[0].id;
    }
    return this.list(playerId);
  }

  setActive(playerId: string, deckId: string): PlayerDeckState {
    const value = this.ensurePlayer(playerId);
    if (!value.decks.some((deck) => deck.id === deckId)) {
      throw new Error("Deck not found");
    }
    value.activeDeckId = deckId;
    return this.list(playerId);
  }

  getActiveDeck(playerId: string): Deck | null {
    const value = this.ensurePlayer(playerId);
    if (!value.activeDeckId) return null;
    const found = value.decks.find((deck) => deck.id === value.activeDeckId);
    return found ? cloneDeck(found) : null;
  }
}
