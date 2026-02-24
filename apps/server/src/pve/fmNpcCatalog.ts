import { ALL_CARDS, BASE_DECK_TEMPLATE_IDS, CARD_INDEX, compressTemplateIdsToDeck, expandDeckToList } from "@ruptura-arcana/game";
import type { DeckCardEntry } from "@ruptura-arcana/shared";
import { FM_NPC_SOURCE } from "./fmNpcSource.generated";

export interface NpcRewardDrop {
  cardId: string;
  chance: number;
  minCount: number;
  maxCount: number;
}

export type UnlockRequirement =
  | { type: "NONE" }
  | { type: "DEFEAT_NPC"; npcId: string }
  | { type: "WINS_PVE"; wins: number };

export interface FmNpcDefinition {
  id: string;
  name: string;
  tier: number;
  rewardGold: number;
  rewardCards: NpcRewardDrop[];
  deck: DeckCardEntry[];
  unlockRequirement: UnlockRequirement;
}

interface BuildResult {
  npcs: FmNpcDefinition[];
  missingCards: string[];
}

const cardIdByCatalogNumber = new Map<number, string>();
for (const card of ALL_CARDS) {
  if (typeof card.catalogNumber === "number" && Number.isFinite(card.catalogNumber) && !cardIdByCatalogNumber.has(card.catalogNumber)) {
    cardIdByCatalogNumber.set(card.catalogNumber, card.id);
  }
}

function buildFallbackPool(tier: number): string[] {
  const maxAtk = tier <= 1 ? 1700 : tier === 2 ? 2100 : tier === 3 ? 2500 : 5000;
  const minAtk = tier >= 4 ? 1500 : 0;

  const pool = ALL_CARDS.filter((card) => card.kind === "MONSTER" && (card.atk ?? 0) >= minAtk && (card.atk ?? 0) <= maxAtk).map((card) => card.id);
  if (pool.length > 0) return pool;

  return BASE_DECK_TEMPLATE_IDS.filter((cardId) => CARD_INDEX[cardId]?.kind === "MONSTER");
}

function buildDeckFromCardNumbers(cardNumbers: number[], tier: number, missingCards: Set<string>): DeckCardEntry[] {
  const fallbackPool = buildFallbackPool(tier);
  const picks: string[] = [];

  const pushCard = (cardId: string) => {
    picks.push(cardId);
    return true;
  };

  for (const cardNumber of cardNumbers) {
    const cardId = cardIdByCatalogNumber.get(cardNumber);
    if (!cardId) {
      missingCards.add(`FM_CARD_${String(cardNumber).padStart(3, "0")}`);
      continue;
    }
    pushCard(cardId);
  }

  let fallbackIndex = 0;
  while (picks.length < 40 && fallbackPool.length > 0) {
    const cardId = fallbackPool[fallbackIndex % fallbackPool.length];
    fallbackIndex += 1;
    pushCard(cardId);
    if (fallbackIndex > fallbackPool.length * 20) break;
  }

  if (picks.length < 40) {
    const starterPool = BASE_DECK_TEMPLATE_IDS.filter((cardId) => CARD_INDEX[cardId]?.kind === "MONSTER");
    let starterIndex = 0;
    while (picks.length < 40 && starterPool.length > 0) {
      const cardId = starterPool[starterIndex % starterPool.length];
      starterIndex += 1;
      pushCard(cardId);
      if (starterIndex > starterPool.length * 20) break;
    }
  }

  return compressTemplateIdsToDeck(picks.slice(0, 40), {
    id: `NPC-${tier}`,
    name: "NPC Deck"
  }).cards;
}

function buildDropsFromCardNumbers(
  rawDrops: Array<{ cardNumber: number; chance: number }>,
  missingCards: Set<string>
): NpcRewardDrop[] {
  const byCard = new Map<string, NpcRewardDrop>();

  for (const drop of rawDrops) {
    const cardId = cardIdByCatalogNumber.get(drop.cardNumber);
    if (!cardId) {
      missingCards.add(`FM_CARD_${String(drop.cardNumber).padStart(3, "0")}`);
      continue;
    }

    const normalizedChance = Math.max(0, Math.min(1, drop.chance));
    const prev = byCard.get(cardId);

    if (!prev || normalizedChance > prev.chance) {
      byCard.set(cardId, {
        cardId,
        chance: normalizedChance,
        minCount: 1,
        maxCount: 1
      });
    }
  }

  return Array.from(byCard.values()).sort((a, b) => (b.chance - a.chance) || a.cardId.localeCompare(b.cardId));
}

export function buildFmNpcCatalog(): BuildResult {
  const missingCards = new Set<string>();

  const npcs: FmNpcDefinition[] = FM_NPC_SOURCE.map((sourceNpc) => ({
    id: sourceNpc.id,
    name: sourceNpc.name,
    tier: sourceNpc.tier,
    rewardGold: sourceNpc.rewardGold,
    unlockRequirement: sourceNpc.unlockRequirement,
    deck: buildDeckFromCardNumbers(sourceNpc.deckCardNumbers, sourceNpc.tier, missingCards),
    rewardCards: buildDropsFromCardNumbers(sourceNpc.rewardDropCards, missingCards)
  }));

  return {
    npcs,
    missingCards: Array.from(missingCards).sort((a, b) => a.localeCompare(b))
  };
}

export const FM_NPC_CATALOG: FmNpcDefinition[] = buildFmNpcCatalog().npcs;

export function expandNpcDeck(deck: DeckCardEntry[]): string[] {
  return expandDeckToList({
    id: "npc",
    name: "NPC",
    cards: deck,
    updatedAt: Date.now()
  });
}
