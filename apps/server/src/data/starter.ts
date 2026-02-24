import { ALL_CARDS, CARD_INDEX, compressTemplateIdsToDeck } from "@ruptura-arcana/game";
import type { Deck, DeckCardEntry } from "@ruptura-arcana/shared";

export interface StarterData {
  deck: Deck;
  collection: DeckCardEntry[];
}

const STARTER_DECK_SIZE = 40;
const STARTER_MONSTER_TARGET = 30;
const MAX_COPIES_PER_CARD = 3;
const STARTER_BASE_GOLD = 100;

const STARTER_MONSTER_PLAN: Array<{ name: string; copies: number }> = [
  { name: "Shadow Specter", copies: 2 },
  { name: "Skull Servant", copies: 2 },
  { name: "Kuriboh", copies: 2 },
  { name: "Dark Plant", copies: 2 },
  { name: "Griggle", copies: 2 },
  { name: "Bone Mouse", copies: 2 },
  { name: "Mushroom Man", copies: 2 },
  { name: "Saggi the Dark Clown", copies: 2 },
  { name: "Mystical Elf", copies: 2 },
  { name: "Rock Ogre Grotto #1", copies: 2 },
  { name: "Mountain Warrior", copies: 2 },
  { name: "Man Eater", copies: 2 },
  { name: "Larvas", copies: 2 },
  { name: "M-Warrior #1", copies: 2 },
  { name: "M-Warrior #2", copies: 2 }
];

const STARTER_SUPPORT_PLAN: Array<{ name: string; copies: number }> = [
  { name: "Sparks", copies: 2 },
  { name: "Red Medicine", copies: 2 },
  { name: "Hinotama", copies: 1 },
  { name: "Mooyan Curry", copies: 1 },
  { name: "Legendary Sword", copies: 1 },
  { name: "Book of Secret Arts", copies: 1 },
  { name: "Stop Defense", copies: 1 },
  { name: "House of Adhesive Tape", copies: 1 }
];

const STARTER_COLLECTION_BONUS: Array<{ name: string; copies: number }> = [
  { name: "Mushroom Man", copies: 1 },
  { name: "Dream Clown", copies: 1 },
  { name: "Mystical Sheep #2", copies: 1 },
  { name: "Twin Long Rods #1", copies: 1 },
  { name: "M-Warrior #1", copies: 1 },
  { name: "M-Warrior #2", copies: 1 }
];

function normalizeName(value: string): string {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "");
}

function resolveCardIdByName(name: string): string | null {
  const normalized = normalizeName(name);
  for (const card of ALL_CARDS) {
    if (normalizeName(card.name) === normalized) return card.id;
  }
  return null;
}

function addCardCopies(target: string[], countByCard: Map<string, number>, cardId: string, copies: number): void {
  if (!CARD_INDEX[cardId]) return;
  for (let index = 0; index < copies; index += 1) {
    const current = countByCard.get(cardId) ?? 0;
    if (current >= MAX_COPIES_PER_CARD) break;
    target.push(cardId);
    countByCard.set(cardId, current + 1);
  }
}

function buildLowPowerFallbackPool(): string[] {
  return ALL_CARDS.filter((card) => {
    if (card.kind !== "MONSTER") return false;
    const atk = card.atk ?? 0;
    const def = card.def ?? 0;
    const cost = card.cost ?? Number.MAX_SAFE_INTEGER;
    if (atk > 1000) return false;
    if (def > 2000) return false;
    if (cost > 120) return false;
    if (card.tags.includes("DRAGON")) return false;
    return true;
  })
    .sort((left, right) => {
      const atkDiff = (right.atk ?? 0) - (left.atk ?? 0);
      if (atkDiff !== 0) return atkDiff;
      const defDiff = (right.def ?? 0) - (left.def ?? 0);
      if (defDiff !== 0) return defDiff;
      return left.name.localeCompare(right.name);
    })
    .map((card) => card.id);
}

function buildStarterDeckTemplateIds(): string[] {
  const result: string[] = [];
  const countByCard = new Map<string, number>();

  for (const entry of STARTER_MONSTER_PLAN) {
    const cardId = resolveCardIdByName(entry.name);
    if (!cardId) continue;
    const card = CARD_INDEX[cardId];
    if (!card || card.kind !== "MONSTER") continue;
    addCardCopies(result, countByCard, cardId, entry.copies);
  }

  if (result.length < STARTER_MONSTER_TARGET) {
    for (const cardId of buildLowPowerFallbackPool()) {
      addCardCopies(result, countByCard, cardId, 1);
      if (result.length >= STARTER_MONSTER_TARGET) break;
    }
  }

  for (const entry of STARTER_SUPPORT_PLAN) {
    const cardId = resolveCardIdByName(entry.name);
    if (!cardId) continue;
    const card = CARD_INDEX[cardId];
    if (!card || card.kind === "MONSTER") continue;
    addCardCopies(result, countByCard, cardId, entry.copies);
  }

  if (result.length < STARTER_DECK_SIZE) {
    for (const cardId of buildLowPowerFallbackPool()) {
      addCardCopies(result, countByCard, cardId, 1);
      if (result.length >= STARTER_DECK_SIZE) break;
    }
  }

  return result.slice(0, STARTER_DECK_SIZE);
}

function buildStarterCollection(deckEntries: DeckCardEntry[]): DeckCardEntry[] {
  const countByCard = new Map<string, number>();
  for (const entry of deckEntries) {
    countByCard.set(entry.cardId, (countByCard.get(entry.cardId) ?? 0) + entry.count);
  }

  for (const bonus of STARTER_COLLECTION_BONUS) {
    const cardId = resolveCardIdByName(bonus.name);
    if (!cardId) continue;
    const current = countByCard.get(cardId) ?? 0;
    const next = Math.min(MAX_COPIES_PER_CARD, current + bonus.copies);
    countByCard.set(cardId, next);
  }

  return Array.from(countByCard.entries())
    .map(([cardId, count]) => ({ cardId, count }))
    .sort((left, right) => left.cardId.localeCompare(right.cardId));
}

export function buildStarterData(deckName = "Deck Inicial FM"): StarterData {
  const deckTemplateIds = buildStarterDeckTemplateIds();
  const deck = compressTemplateIdsToDeck(deckTemplateIds, {
    id: "starter-deck-template",
    name: deckName,
    updatedAt: Date.now()
  });

  const collection = buildStarterCollection(deck.cards);

  return {
    deck: {
      ...deck,
      name: deckName
    },
    collection
  };
}

export { STARTER_BASE_GOLD };
