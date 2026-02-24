import { describe, expect, it } from "vitest";
import type { Deck } from "@ruptura-arcana/shared";
import { compressTemplateIdsToDeck, expandDeckToList, validateDeck } from "../src/deck/index";

function makeDeck(templateId: string, total = 40): Deck {
  return compressTemplateIdsToDeck(Array.from({ length: total }, () => templateId), {
    id: "deck-test",
    name: "Deck Test",
    updatedAt: Date.now()
  });
}

describe("deck helpers", () => {
  it("expands compact deck counts to list", () => {
    const deck: Deck = {
      id: "d1",
      name: "Teste",
      updatedAt: Date.now(),
      cards: [
        { cardId: "fm_001_blue_eyes_white_dragon", count: 2 },
        { cardId: "fm_002_mystical_elf", count: 1 }
      ]
    };

    const expanded = expandDeckToList(deck);
    expect(expanded).toEqual([
      "fm_001_blue_eyes_white_dragon",
      "fm_001_blue_eyes_white_dragon",
      "fm_002_mystical_elf"
    ]);
  });

  it("fails validation when deck size is not 40", () => {
    const deck = makeDeck("fm_001_blue_eyes_white_dragon", 39);
    const validation = validateDeck(deck);
    expect(validation.ok).toBe(false);
    expect(validation.errors.some((error) => error.includes("40"))).toBe(true);
  });

  it("fails validation when card copies exceed rule", () => {
    const deck = makeDeck("fm_001_blue_eyes_white_dragon", 40);
    const validation = validateDeck(deck);
    expect(validation.ok).toBe(false);
    expect(validation.errors.some((error) => error.includes("copias"))).toBe(true);
  });
});
