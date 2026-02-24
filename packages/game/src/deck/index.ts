import { DECK_SIZE, MAX_COPIES_PER_CARD, MIN_MONSTERS_IN_DECK } from "@ruptura-arcana/shared";
import type { CardTemplate, Deck, DeckRules, DeckValidation } from "@ruptura-arcana/shared";
import { CARD_INDEX } from "../data/cardTemplates";

export const DEFAULT_DECK_RULES: DeckRules = {
  size: DECK_SIZE,
  maxCopies: MAX_COPIES_PER_CARD,
  minMonsters: MIN_MONSTERS_IN_DECK
};

function randomDeckId(): string {
  return `deck-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

function normalizeCardList(cards: Deck["cards"]): Deck["cards"] {
  const counter = new Map<string, number>();
  for (const entry of cards) {
    if (!entry.cardId?.trim()) continue;
    const current = counter.get(entry.cardId) ?? 0;
    counter.set(entry.cardId, current + entry.count);
  }

  return Array.from(counter.entries())
    .map(([cardId, count]) => ({ cardId, count }))
    .filter((entry) => entry.count > 0)
    .sort((a, b) => a.cardId.localeCompare(b.cardId));
}

export function normalizeDeckInput(
  listOfIds: string[],
  options?: { id?: string; name?: string; updatedAt?: number }
): Deck {
  const cards = normalizeCardList(listOfIds.map((cardId) => ({ cardId, count: 1 })));
  return {
    id: options?.id ?? randomDeckId(),
    name: options?.name ?? "Novo Deck",
    cards,
    updatedAt: options?.updatedAt ?? Date.now()
  };
}

export function compressTemplateIdsToDeck(
  templateIds: string[],
  options?: { id?: string; name?: string; updatedAt?: number }
): Deck {
  return normalizeDeckInput(templateIds, options);
}

export function expandDeckToList(deck: Deck): string[] {
  const expanded: string[] = [];
  for (const entry of deck.cards) {
    for (let i = 0; i < entry.count; i += 1) {
      expanded.push(entry.cardId);
    }
  }
  return expanded;
}

function isMonster(template: CardTemplate | undefined): boolean {
  if (!template) return false;
  return template.kind === "MONSTER";
}

export function validateDeck(
  deck: Deck,
  rules: DeckRules = DEFAULT_DECK_RULES,
  cardIndex: Record<string, CardTemplate> = CARD_INDEX
): DeckValidation {
  const errors: string[] = [];
  const warnings: string[] = [];
  const countByCard = new Map<string, number>();
  let total = 0;

  if (!deck.name?.trim()) {
    errors.push("Nome do deck eh obrigatorio.");
  }

  for (const entry of deck.cards) {
    if (!entry.cardId?.trim()) {
      errors.push("Carta sem cardId no deck.");
      continue;
    }
    if (!Number.isInteger(entry.count) || entry.count <= 0) {
      errors.push(`Quantidade invalida para ${entry.cardId}.`);
      continue;
    }

    const current = countByCard.get(entry.cardId) ?? 0;
    if (current > 0) {
      warnings.push(`Carta ${entry.cardId} apareceu em linhas repetidas e foi agregada para validacao.`);
    }
    countByCard.set(entry.cardId, current + entry.count);
  }

  let monsterCount = 0;
  for (const [cardId, count] of countByCard.entries()) {
    total += count;
    const template = cardIndex[cardId];
    if (!template) {
      errors.push(`Carta desconhecida no deck: ${cardId}`);
      continue;
    }
    if (count > rules.maxCopies) {
      errors.push(`Carta ${template.name} excede limite de copias (${count}/${rules.maxCopies}).`);
    }
    if (isMonster(template)) {
      monsterCount += count;
    }
  }

  if (total !== rules.size) {
    errors.push(`Deck deve ter exatamente ${rules.size} cartas (atual: ${total}).`);
  }

  if (typeof rules.minMonsters === "number" && monsterCount < rules.minMonsters) {
    errors.push(`Deck deve ter ao menos ${rules.minMonsters} monstros (atual: ${monsterCount}).`);
  }

  return {
    ok: errors.length === 0,
    errors,
    warnings,
    total
  };
}
