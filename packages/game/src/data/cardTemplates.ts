import type { CardTemplate, Tag } from "@ruptura-arcana/shared";
import { FM_BASE_DECK_TEMPLATE_IDS, FM_CARDS } from "./fmCards.generated";
import {
  isContinuousEquipEffectKey,
  isUsableEffectKey,
  resolveCardKindByName,
  resolveEffectDescriptionByKey,
  resolveEffectKeyByName,
  resolveEquipEffectDescription
} from "./spellTrapCatalog";

const MONSTER_FALLBACK_TAG: Tag = "ANCIENT";
const ARCANE_FALLBACK_TAG: Tag = "ARCANE";

function inferTagsFromName(name: string, hasStats: boolean): Tag[] {
  const upperName = name.toUpperCase();
  const tags = new Set<Tag>();

  const hasAny = (...parts: string[]) => parts.some((part) => upperName.includes(part));

  if (hasAny("DRAGON", "WYVERN", "DRAKE")) tags.add("DRAGON");
  if (hasAny("WARRIOR", "KNIGHT", "SWORD", "NINJA", "GUARDIAN", "SOLDIER")) tags.add("WARRIOR");
  if (hasAny("WIZARD", "MAGIC", "MAGE", "WITCH", "SORCERER")) {
    tags.add("SPELLCASTER");
    tags.add("ARCANE");
  }
  if (hasAny("ZOMBIE", "SKULL", "GHOST", "UNDEAD", "LICH", "FIEND", "DEMON", "DEVIL")) {
    tags.add("UNDEAD");
    tags.add("DARK");
  }
  if (hasAny("GOLEM", "ROCK", "STONE", "STATUE")) {
    tags.add("GOLEM");
    tags.add("EARTH");
  }
  if (hasAny("AQUA", "WATER", "SEA", "OCEAN", "FISH", "SHARK", "KRAKEN", "WHALE", "TURTLE", "PENGUIN", "HYDRA")) {
    tags.add("WATER");
    tags.add("AQUATIC");
  }
  if (hasAny("FIRE", "FLAME", "INFERNO", "LAVA", "BURN")) tags.add("FIRE");
  if (hasAny("BIRD", "HAWK", "EAGLE", "WING", "SPARROW", "HARPIE")) {
    tags.add("AVIAN");
    tags.add("WIND");
  }
  if (hasAny("INSECT", "BUG", "MOTH", "SPIDER", "SCORPION", "BEETLE", "COCKROACH")) tags.add("INSECT");
  if (hasAny("PLANT", "FLOWER", "TREE", "MUSHROOM", "SEED", "VINE")) {
    tags.add("PLANT");
    tags.add("EARTH");
  }
  if (hasAny("MACHINE", "MECH", "CYBER", "METAL", "ROBO")) {
    tags.add("MECHANIC");
    tags.add("METAL");
  }
  if (hasAny("BEAST", "WOLF", "LION", "TIGER", "PANDA", "DOG", "FOX", "MAMMOTH")) tags.add("BEAST");
  if (hasAny("SNAKE", "SERPENT", "LIZARD", "REPTILE")) tags.add("REPTILE");
  if (hasAny("ANGEL", "FAIRY", "HOLY", "SAINT")) {
    tags.add("ANGEL");
    tags.add("LIGHT");
  }
  if (hasAny("DARK", "SHADOW", "ABYSS", "NIGHT", "BLACK")) tags.add("DARK");
  if (hasAny("THUNDER", "STORM", "LIGHTNING", "ELECTRIC")) tags.add("STORM");
  if (hasAny("CRYSTAL", "GEM", "DIAMOND")) tags.add("CRYSTAL");

  if (tags.size === 0) {
    tags.add(hasStats ? MONSTER_FALLBACK_TAG : ARCANE_FALLBACK_TAG);
  }

  if (!tags.has("LIGHT") && !tags.has("DARK") && !tags.has("FIRE") && !tags.has("WATER") && !tags.has("EARTH") && !tags.has("WIND")) {
    tags.add("EARTH");
  }

  return Array.from(tags).slice(0, 4);
}

const FM_CARD_TEMPLATES: Record<string, CardTemplate> = Object.fromEntries(
  FM_CARDS.map((card) => [
    card.templateId,
    (() => {
      const effectKey = resolveEffectKeyByName(card.name, card.hasStats);
      const effectDescription = isContinuousEquipEffectKey(effectKey)
        ? resolveEquipEffectDescription(card.name, card.cost)
        : resolveEffectDescriptionByKey(effectKey);
      return {
      id: card.templateId,
      name: card.name,
      kind: resolveCardKindByName(card.name, card.hasStats),
      type: card.hasStats ? ("MONSTER" as const) : undefined,
      atk: card.hasStats ? card.atk : 0,
      def: card.hasStats ? card.def : 0,
      tags: inferTagsFromName(card.name, card.hasStats),
      effectKey,
      effectDescription,
      imagePath: card.imagePath,
      password: card.password,
      cost: card.cost,
      catalogNumber: card.number
    };
    })()
  ])
);

export const CARD_TEMPLATES: Record<string, CardTemplate> = {
  ...FM_CARD_TEMPLATES
};

function isPlayableCard(card: CardTemplate): boolean {
  if (!card.imagePath) return false;
  if (card.kind === "MONSTER") return true;
  return isUsableEffectKey(card.effectKey);
}

export const ALL_CARDS: CardTemplate[] = Object.values(CARD_TEMPLATES)
  .filter((card) => isPlayableCard(card))
  .sort((a, b) => {
    const numberA = a.catalogNumber ?? Number.MAX_SAFE_INTEGER;
    const numberB = b.catalogNumber ?? Number.MAX_SAFE_INTEGER;
    if (numberA !== numberB) return numberA - numberB;
    return a.name.localeCompare(b.name);
  });

export const CARD_INDEX: Record<string, CardTemplate> = Object.fromEntries(ALL_CARDS.map((card) => [card.id, card]));

const playableMonsterIds = ALL_CARDS.filter((card) => card.kind === "MONSTER").map((card) => card.id);

export const BASE_DECK_TEMPLATE_IDS = (
  FM_BASE_DECK_TEMPLATE_IDS.length
    ? FM_BASE_DECK_TEMPLATE_IDS.filter((id) => CARD_INDEX[id] && CARD_INDEX[id].kind === "MONSTER")
    : playableMonsterIds
).slice(0, 40);
