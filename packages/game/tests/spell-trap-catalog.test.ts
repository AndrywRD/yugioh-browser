import { describe, expect, it } from "vitest";
import { FM_CARDS } from "../src/data/fmCards.generated";
import { ALL_CARDS, CARD_INDEX, CARD_TEMPLATES } from "../src/data/cardTemplates";
import { isUsableEffectKey, resolveCardKindByName, resolveEffectKeyByName } from "../src/data/spellTrapCatalog";

describe("spell/trap catalog integration", () => {
  it("classifies known trap and spell cards by name", () => {
    expect(resolveCardKindByName("Widespread Ruin", false)).toBe("TRAP");
    expect(resolveCardKindByName("Dark Hole", false)).toBe("SPELL");
    expect(resolveCardKindByName("Blue Eyes White Dragon", true)).toBe("MONSTER");
  });

  it("maps known spell/trap names to effect keys", () => {
    expect(resolveEffectKeyByName("Dark Hole", false)).toBe("DESTROY_ALL_MONSTERS");
    expect(resolveEffectKeyByName("Swords of Revealing Light", false)).toBe("LOCK_OPP_ATTACKS_3_TURNS");
    expect(resolveEffectKeyByName("Widespread Ruin", false)).toBe("DESTROY_ATTACKER");
    expect(resolveEffectKeyByName("Fake Trap", false)).toBe("NO_EFFECT");
  });

  it("assigns kind and effect key for every non-monster card in FM catalog", () => {
    const nonMonsterCards = FM_CARDS.filter((card) => !card.hasStats);
    expect(nonMonsterCards.length).toBeGreaterThan(0);

    for (const card of nonMonsterCards) {
      const template = CARD_TEMPLATES[card.templateId];
      expect(template).toBeDefined();
      expect(template.kind === "SPELL" || template.kind === "TRAP").toBe(true);
      expect(typeof template.effectKey).toBe("string");
      expect((template.effectKey ?? "").length).toBeGreaterThan(0);
    }
  });

  it("keeps only playable cards in ALL_CARDS/CARD_INDEX", () => {
    expect(ALL_CARDS.length).toBeGreaterThan(0);

    for (const card of ALL_CARDS) {
      expect(Boolean(card.imagePath)).toBe(true);
      if (card.kind === "MONSTER") continue;
      expect(isUsableEffectKey(card.effectKey)).toBe(true);
      expect(Boolean(card.effectDescription)).toBe(true);
    }

    expect(Object.keys(CARD_INDEX).length).toBe(ALL_CARDS.length);
  });
});
