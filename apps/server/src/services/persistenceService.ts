import { randomBytes, randomUUID, scryptSync, timingSafeEqual } from "node:crypto";
import {
  ALL_CARDS,
  CARD_INDEX,
  DEFAULT_DECK_RULES,
  buildFusionDiscoveryResolvedFromTemplateIds,
  buildMaterialSummary,
  expandDeckToList,
  resolveFusionFromOrderedMaterials,
  validateDeck
} from "@ruptura-arcana/game";
import type { Deck, DeckCardEntry, FusionDiscovery } from "@ruptura-arcana/shared";
import { Prisma, PrismaClient, ShopPurchaseSource } from "@prisma/client";
import { STARTER_BASE_GOLD, buildStarterData } from "../data/starter";
import { buildFmNpcCatalog, type FmNpcDefinition, type NpcRewardDrop, type UnlockRequirement } from "../pve/fmNpcCatalog";

type CollectionEntry = {
  cardId: string;
  count: number;
  name: string;
  kind: "MONSTER" | "SPELL" | "TRAP";
  atk: number;
  def: number;
  tags: string[];
  effectDescription?: string;
  imagePath?: string;
  password?: string;
  cost?: number;
  catalogNumber?: number;
};

type PlayerSummary = {
  id: string;
  publicId: string;
  username: string;
  gold: number;
  winsPve: number;
  winsPvp: number;
};

type DeckListSummary = {
  decks: Deck[];
  activeDeckId: string | null;
};

type PveNpcView = {
  id: string;
  name: string;
  tier: number;
  rewardGold: number;
  rewardCards: NpcRewardDrop[];
  unlockRequirement: UnlockRequirement;
  unlocked: boolean;
  defeated: boolean;
  portraitPath: string;
  portraitAltPath: string;
  fallbackPortraitPath: string;
  aceCardId?: string;
  aceCardName?: string;
};

type PveResultSummary = {
  rewardGold: number;
  rewardCards: Array<{ cardId: string; count: number }>;
};

type ShopOfferSegment = "INICIANTE" | "INTERMEDIARIO" | "AVANCADO";
type ShopCardRarity = "C" | "R" | "SR" | "UR";
type BoosterPackType = "BEGINNER" | "INTERMEDIATE" | "ADVANCED";

type ShopOfferView = {
  cardId: string;
  name: string;
  kind: "MONSTER" | "SPELL" | "TRAP";
  atk: number;
  def: number;
  tags: string[];
  effectDescription?: string;
  imagePath?: string;
  password?: string;
  cost?: number;
  catalogNumber?: number;
  price: number;
  score: number;
  affordable: boolean;
  owned: number;
  segment: ShopOfferSegment;
  rarity: ShopCardRarity;
};

type ShopPurchaseSummary = {
  player: PlayerSummary;
  purchased: {
    cardId: string;
    name: string;
    price: number;
    ownedAfter: number;
  };
};

type ShopMetaView = {
  rotationKey: string;
  nextRotationAt: number;
  rerollUsed: number;
  rerollLimit: number;
  rerollCost: number;
};

type ShopBoosterPackConfigView = {
  type: BoosterPackType;
  label: string;
  cost: number;
  cards: number;
};

type ShopConfigView = {
  reroll: {
    dailyLimit: number;
    baseCost: number;
    stepCost: number;
    maxCost: number;
  };
  boosters: ShopBoosterPackConfigView[];
};

type ShopListSummary = {
  offers: ShopOfferView[];
  meta: ShopMetaView;
};

type ShopRerollSummary = {
  player: PlayerSummary;
  shop: ShopListSummary;
};

type BoosterCardReward = {
  cardId: string;
  name: string;
  kind: "MONSTER" | "SPELL" | "TRAP";
  atk: number;
  def: number;
  tags: string[];
  effectDescription?: string;
  imagePath?: string;
  rarity: ShopCardRarity;
  segment: ShopOfferSegment;
};

type ShopBoosterSummary = {
  player: PlayerSummary;
  packType: BoosterPackType;
  packCost: number;
  cards: BoosterCardReward[];
};

type FusionDiscoveryInput = {
  key: string;
  materialsCount: number;
  materialTags: string[];
  materialCardIds?: string[];
  resultCardId: string;
  resultName: string;
};

type FusionDiscoveryView = FusionDiscovery;

type FusionTestSummary = {
  materials: Array<{ cardId: string; name: string }>;
  result: {
    cardId: string;
    name: string;
    failed: boolean;
    fallbackType?: "FALLBACK_WEAK" | "FALLBACK_LOCKED";
  };
  discovery: FusionDiscoveryView | null;
};

function toCardKind(kind: string): "MONSTER" | "SPELL" | "TRAP" {
  if (kind === "SPELL" || kind === "TRAP") return kind;
  return "MONSTER";
}

function safeDeckEntries(value: Prisma.JsonValue): DeckCardEntry[] {
  if (!Array.isArray(value)) return [];
  const rows: DeckCardEntry[] = [];
  for (const entry of value) {
    if (!entry || typeof entry !== "object") continue;
    const cardId = (entry as { cardId?: unknown }).cardId;
    const count = (entry as { count?: unknown }).count;
    if (typeof cardId !== "string" || typeof count !== "number") continue;
    if (!Number.isInteger(count) || count <= 0) continue;
    rows.push({ cardId, count });
  }
  return rows;
}

const VALID_CARD_IDS = new Set(ALL_CARDS.map((card) => card.id));

function normalizeMaterialCardIds(cardIds: string[] | undefined): string[] {
  if (!Array.isArray(cardIds)) return [];
  return cardIds
    .map((cardId) => String(cardId ?? "").trim())
    .filter((cardId) => VALID_CARD_IDS.has(cardId))
    .slice(0, 3);
}

function sanitizeDeckEntries(entries: DeckCardEntry[]): DeckCardEntry[] {
  const map = new Map<string, number>();
  for (const entry of entries) {
    if (!entry || typeof entry.cardId !== "string") continue;
    if (!VALID_CARD_IDS.has(entry.cardId)) continue;
    const count = Number(entry.count);
    if (!Number.isFinite(count) || count <= 0) continue;
    const normalizedCount = Math.max(1, Math.min(99, Math.floor(count)));
    map.set(entry.cardId, normalizedCount);
  }

  return Array.from(map.entries())
    .map(([cardId, count]) => ({ cardId, count }))
    .sort((a, b) => a.cardId.localeCompare(b.cardId));
}

function deckRecordToDeck(record: { id: string; name: string; cards: Prisma.JsonValue; updatedAt: Date }): Deck {
  return {
    id: record.id,
    name: record.name,
    cards: safeDeckEntries(record.cards),
    updatedAt: record.updatedAt.getTime()
  };
}

function asJson<T>(value: T): Prisma.InputJsonValue {
  return value as Prisma.InputJsonValue;
}

function parseUnlockRequirement(value: Prisma.JsonValue): UnlockRequirement {
  if (!value || typeof value !== "object") return { type: "NONE" };
  const type = (value as { type?: unknown }).type;
  if (type === "DEFEAT_NPC") {
    const npcId = (value as { npcId?: unknown }).npcId;
    if (typeof npcId === "string" && npcId.trim().length > 0) {
      return { type: "DEFEAT_NPC", npcId };
    }
  }
  if (type === "WINS_PVE") {
    const wins = (value as { wins?: unknown }).wins;
    if (typeof wins === "number" && Number.isFinite(wins) && wins >= 0) {
      return { type: "WINS_PVE", wins: Math.floor(wins) };
    }
  }
  return { type: "NONE" };
}

function parseRewardDrops(value: Prisma.JsonValue): NpcRewardDrop[] {
  if (!Array.isArray(value)) return [];
  const drops: NpcRewardDrop[] = [];
  for (const row of value) {
    if (!row || typeof row !== "object") continue;
    const cardId = (row as { cardId?: unknown }).cardId;
    const chance = (row as { chance?: unknown }).chance;
    const minCount = (row as { minCount?: unknown }).minCount;
    const maxCount = (row as { maxCount?: unknown }).maxCount;
    if (typeof cardId !== "string") continue;
    if (typeof chance !== "number") continue;
    drops.push({
      cardId,
      chance: Math.max(0, Math.min(1, chance)),
      minCount: typeof minCount === "number" && Number.isFinite(minCount) ? Math.max(1, Math.floor(minCount)) : 1,
      maxCount: typeof maxCount === "number" && Number.isFinite(maxCount) ? Math.max(1, Math.floor(maxCount)) : 1
    });
  }
  return drops;
}

function parseStringList(value: Prisma.JsonValue): string[] {
  if (!Array.isArray(value)) return [];
  return value.map((entry) => String(entry ?? "").trim()).filter(Boolean);
}

function normalizeAssetSlug(value: string): string {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

type ShopOfferInternal = {
  cardId: string;
  price: number;
  score: number;
  affordable: boolean;
  owned: number;
  segment: ShopOfferSegment;
  rarity: ShopCardRarity;
  rank: number;
};

type ShopCardWithMeta = {
  cardId: string;
  score: number;
  segment: ShopOfferSegment;
  rarity: ShopCardRarity;
};

type BoosterPackConfig = {
  type: BoosterPackType;
  source: ShopPurchaseSource;
  label: string;
  cost: number;
  cards: number;
  segments: Array<{ segment: ShopOfferSegment; weight: number }>;
};

const SHOP_REROLL_DAILY_LIMIT = 6;
const SHOP_REROLL_BASE_COST = 120;
const SHOP_REROLL_STEP_COST = 85;
const SHOP_REROLL_MAX_COST = 760;

const BOOSTER_PACKS: Record<BoosterPackType, BoosterPackConfig> = {
  BEGINNER: {
    type: "BEGINNER",
    source: ShopPurchaseSource.BOOSTER_BEGINNER,
    label: "Booster Iniciante",
    cost: 340,
    cards: 3,
    segments: [
      { segment: "INICIANTE", weight: 0.8 },
      { segment: "INTERMEDIARIO", weight: 0.18 },
      { segment: "AVANCADO", weight: 0.02 }
    ]
  },
  INTERMEDIATE: {
    type: "INTERMEDIATE",
    source: ShopPurchaseSource.BOOSTER_INTERMEDIATE,
    label: "Booster Intermediario",
    cost: 760,
    cards: 4,
    segments: [
      { segment: "INICIANTE", weight: 0.22 },
      { segment: "INTERMEDIARIO", weight: 0.6 },
      { segment: "AVANCADO", weight: 0.18 }
    ]
  },
  ADVANCED: {
    type: "ADVANCED",
    source: ShopPurchaseSource.BOOSTER_ADVANCED,
    label: "Booster Avancado",
    cost: 1420,
    cards: 5,
    segments: [
      { segment: "INICIANTE", weight: 0.08 },
      { segment: "INTERMEDIARIO", weight: 0.45 },
      { segment: "AVANCADO", weight: 0.47 }
    ]
  }
};

function hashString(value: string): number {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return Math.abs(hash >>> 0);
}

function pseudoRandom(seed: string): number {
  const hash = hashString(seed);
  return (hash % 10000) / 10000;
}

function scoreBandByWins(winsPve: number): { min: number; max: number; target: number } {
  if (winsPve < 8) return { min: 700, max: 1850, target: 1250 };
  if (winsPve < 20) return { min: 1000, max: 2350, target: 1650 };
  if (winsPve < 45) return { min: 1300, max: 2900, target: 2100 };
  return { min: 1550, max: 3500, target: 2550 };
}

function cardScore(cardId: string): number {
  const card = CARD_INDEX[cardId];
  if (!card) return 0;
  if (card.kind === "MONSTER") {
    const atk = card.atk ?? 0;
    const def = card.def ?? 0;
    return atk * 0.62 + def * 0.38;
  }

  const effectKey = card.effectKey ?? "";
  if (effectKey.includes("DESTROY_ALL")) return 2850;
  if (effectKey.includes("DESTROY")) return 2350;
  if (effectKey.includes("RAIGEKI")) return 3000;
  if (effectKey.includes("BOOST_ALL")) return 2050;
  if (effectKey.includes("EQUIP_CONTINUOUS")) return 1750;
  if (effectKey.includes("HEAL_")) return 1550;
  if (effectKey.includes("DAMAGE_")) return 1650;
  if (effectKey.includes("NEGATE_ATTACK")) return 1950;
  return 1450;
}

function offerSegment(score: number): ShopOfferSegment {
  if (score < 1600) return "INICIANTE";
  if (score < 2500) return "INTERMEDIARIO";
  return "AVANCADO";
}

function resolveCardRarity(cardId: string, score: number): ShopCardRarity {
  const card = CARD_INDEX[cardId];
  if (!card) return "C";
  const explicitRarity = (card as { rarity?: ShopCardRarity }).rarity;
  if (explicitRarity === "UR" || explicitRarity === "SR" || explicitRarity === "R" || explicitRarity === "C") {
    return explicitRarity;
  }

  const cost = card.cost ?? 0;
  const strongMonster = card.kind === "MONSTER" && ((card.atk ?? 0) >= 3000 || (card.def ?? 0) >= 3000);
  if (cost >= 999999 || score >= 3000 || strongMonster) return "UR";
  if (cost >= 50000 || score >= 2500) return "SR";
  if (cost >= 5000 || score >= 1850) return "R";
  return "C";
}

function rarityMultiplier(rarity: ShopCardRarity): number {
  if (rarity === "UR") return 1.7;
  if (rarity === "SR") return 1.42;
  if (rarity === "R") return 1.18;
  return 1;
}

function segmentMultiplier(segment: ShopOfferSegment): number {
  if (segment === "AVANCADO") return 1.34;
  if (segment === "INTERMEDIARIO") return 1.14;
  return 0.94;
}

function demandMultiplier(purchases: number): number {
  const normalized = Math.log1p(Math.max(0, purchases));
  return Math.min(1.38, 1 + normalized * 0.12);
}

function cardPrice(cardId: string, score: number, rarity: ShopCardRarity, segment: ShopOfferSegment, demandCount: number): number {
  const card = CARD_INDEX[cardId];
  if (!card) return 120;
  const baseRaw =
    card.kind === "MONSTER"
      ? Math.round((card.atk ?? 0) * 0.52 + (card.def ?? 0) * 0.34)
      : Math.round(score * 0.72);
  const price = baseRaw * rarityMultiplier(rarity) * segmentMultiplier(segment) * demandMultiplier(demandCount);
  return Math.max(120, Math.min(6800, Math.round(price / 5) * 5));
}

function buildShopRotationKey(now = Date.now()): string {
  return new Date(now).toISOString().slice(0, 10);
}

function buildNextRotationAt(now = Date.now()): number {
  const date = new Date(now);
  const utcNext = Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate() + 1, 0, 0, 0, 0);
  return utcNext;
}

function computeRerollCost(rerollUsed: number): number {
  return Math.min(SHOP_REROLL_MAX_COST, SHOP_REROLL_BASE_COST + rerollUsed * SHOP_REROLL_STEP_COST);
}

function buildShopMeta(rotationKey: string, rerollUsed: number): ShopMetaView {
  return {
    rotationKey,
    nextRotationAt: buildNextRotationAt(),
    rerollUsed,
    rerollLimit: SHOP_REROLL_DAILY_LIMIT,
    rerollCost: computeRerollCost(rerollUsed)
  };
}

function buildShopCardMeta(cardId: string): ShopCardWithMeta | null {
  const card = CARD_INDEX[cardId];
  if (!card) return null;
  const score = cardScore(cardId);
  const segment = offerSegment(score);
  const rarity = resolveCardRarity(cardId, score);
  return {
    cardId,
    score,
    segment,
    rarity
  };
}

const SHOP_SOURCE_CARDS_META: ShopCardWithMeta[] = ALL_CARDS
  .filter((card) => {
    if (!card.imagePath) return false;
    if (card.kind === "MONSTER") return true;
    return Boolean(card.effectDescription);
  })
  .map((card) => buildShopCardMeta(card.id))
  .filter((card): card is ShopCardWithMeta => Boolean(card));

function rarityWeightForPack(packType: BoosterPackType, rarity: ShopCardRarity): number {
  if (packType === "BEGINNER") {
    if (rarity === "UR") return 0.04;
    if (rarity === "SR") return 0.2;
    if (rarity === "R") return 0.58;
    return 1;
  }
  if (packType === "INTERMEDIATE") {
    if (rarity === "UR") return 0.16;
    if (rarity === "SR") return 0.62;
    if (rarity === "R") return 0.95;
    return 0.65;
  }
  if (rarity === "UR") return 0.5;
  if (rarity === "SR") return 1;
  if (rarity === "R") return 0.78;
  return 0.35;
}

function selectByWeight<T extends { weight: number }>(rows: T[]): T | null {
  const total = rows.reduce((sum, row) => sum + Math.max(0, row.weight), 0);
  if (total <= 0) return null;
  let cursor = Math.random() * total;
  for (const row of rows) {
    cursor -= Math.max(0, row.weight);
    if (cursor <= 0) return row;
  }
  return rows[rows.length - 1] ?? null;
}

function buildShopOffers(args: {
  playerId: string;
  winsPve: number;
  gold: number;
  ownedByCardId: Map<string, number>;
  demandByCardId: Map<string, number>;
  limit: number;
  rotationKey?: string;
  rerollNonce?: number;
  now?: number;
}): ShopOfferInternal[] {
  const { playerId, winsPve, gold, ownedByCardId, demandByCardId, limit, now, rotationKey, rerollNonce = 0 } = args;
  const safeLimit = clamp(Math.floor(limit) || 20, 1, 40);
  const resolvedRotationKey = rotationKey ?? buildShopRotationKey(now);
  const seed = `${playerId}:${resolvedRotationKey}:${rerollNonce}:${winsPve}:${Math.floor(gold / 100)}`;
  const { min, max, target } = scoreBandByWins(winsPve);

  const budgetBoost = gold >= 3500 ? 560 : gold >= 1800 ? 340 : gold >= 900 ? 180 : 0;
  const budgetCap = Math.max(420, Math.round(gold * 0.72) + 180);
  const adjustedMax = max + budgetBoost;
  const adjustedTarget = target + Math.round(budgetBoost * 0.42);

  const computed: ShopOfferInternal[] = SHOP_SOURCE_CARDS_META.map((meta) => {
    const demandCount = demandByCardId.get(meta.cardId) ?? 0;
    const price = cardPrice(meta.cardId, meta.score, meta.rarity, meta.segment, demandCount);
    const affordable = price <= gold;
    const distance = Math.abs(meta.score - adjustedTarget);
    const outOfBandPenalty = meta.score < min ? (min - meta.score) * 0.8 : meta.score > adjustedMax ? (meta.score - adjustedMax) * 1.05 : 0;
    const budgetPenalty = price <= budgetCap ? 0 : (price - budgetCap) * 0.35;
    const jitter = pseudoRandom(`${seed}:${meta.cardId}`) * 95;
    const owned = ownedByCardId.get(meta.cardId) ?? 0;
    const ownedPenalty = owned >= 3 ? 90 : 0;
    const rank = distance + outOfBandPenalty + budgetPenalty + ownedPenalty + jitter;

    return {
      cardId: meta.cardId,
      price,
      score: meta.score,
      affordable,
      owned,
      segment: meta.segment,
      rarity: meta.rarity,
      rank
    };
  });

  const monsters = computed.filter((offer) => CARD_INDEX[offer.cardId]?.kind === "MONSTER").sort((left, right) => left.rank - right.rank);
  const spellTraps = computed.filter((offer) => CARD_INDEX[offer.cardId]?.kind !== "MONSTER").sort((left, right) => left.rank - right.rank);

  const picked = new Map<string, ShopOfferInternal>();
  const spellTrapTarget = Math.min(6, safeLimit);

  for (const offer of spellTraps) {
    if (picked.size >= spellTrapTarget) break;
    picked.set(offer.cardId, offer);
  }

  for (const offer of monsters) {
    if (picked.size >= safeLimit) break;
    picked.set(offer.cardId, offer);
  }

  if (picked.size < safeLimit) {
    for (const offer of [...spellTraps, ...monsters]) {
      if (picked.size >= safeLimit) break;
      if (!picked.has(offer.cardId)) picked.set(offer.cardId, offer);
    }
  }

  return [...picked.values()].sort((left, right) => {
    if (left.affordable !== right.affordable) return left.affordable ? -1 : 1;
    if (left.segment !== right.segment) return left.segment.localeCompare(right.segment);
    if (left.rarity !== right.rarity) return left.rarity.localeCompare(right.rarity);
    return left.rank - right.rank;
  });
}

function resolveNpcAceCard(deckEntries: DeckCardEntry[]): { cardId: string; cardName: string; imagePath: string } | null {
  let bestCardId: string | null = null;
  let bestAtk = -1;
  let bestDef = -1;

  for (const entry of deckEntries) {
    const card = CARD_INDEX[entry.cardId];
    if (!card || card.kind !== "MONSTER") continue;
    const atk = card.atk ?? 0;
    const def = card.def ?? 0;
    if (atk > bestAtk || (atk === bestAtk && def > bestDef)) {
      bestCardId = entry.cardId;
      bestAtk = atk;
      bestDef = def;
    }
  }

  if (!bestCardId) return null;
  const bestCard = CARD_INDEX[bestCardId];
  return {
    cardId: bestCardId,
    cardName: bestCard?.name ?? bestCardId,
    imagePath: bestCard?.imagePath ?? "/images/cartas/Back-FMR-EN-VG.png"
  };
}

function rollDropCount(drop: NpcRewardDrop): number {
  if (drop.maxCount <= drop.minCount) return drop.minCount;
  const span = drop.maxCount - drop.minCount + 1;
  return drop.minCount + Math.floor(Math.random() * span);
}

const MIN_PVE_DISTINCT_DROPS_ON_WIN = 3;
const MIN_PVE_TOTAL_DROPS_ON_WIN = 3;
const SMALL_NPC_DROP_POOL_THRESHOLD = 6;
const SMALL_NPC_DROP_POOL_MIN_TARGET = 12;
const SMALL_NPC_DROP_POOL_MAX_TARGET = 24;
const LARGE_NPC_EXTRA_POOL_MIN = 4;
const LARGE_NPC_EXTRA_POOL_MAX = 10;
const RECENT_DROP_MEMORY = 8;

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function costWeightForTier(cost: number | undefined, tier: number): number {
  const normalizedCost = typeof cost === "number" && Number.isFinite(cost) ? cost : 0;

  if (normalizedCost >= 999999) return tier >= 8 ? 0.12 : tier >= 6 ? 0.08 : 0.03;
  if (normalizedCost >= 50000) return tier >= 7 ? 0.26 : tier >= 5 ? 0.18 : 0.08;
  if (normalizedCost >= 20000) return tier >= 5 ? 0.32 : tier >= 3 ? 0.24 : 0.12;
  if (normalizedCost >= 5000) return tier >= 4 ? 0.44 : 0.3;
  if (normalizedCost >= 1000) return tier >= 3 ? 0.58 : 0.42;
  return 0.78;
}

function normalizeDropChance(chance: number, min = 0.004, max = 0.22): number {
  return clamp(chance, min, max);
}

function buildTierRewardPools(npcs: FmNpcDefinition[]): Map<number, NpcRewardDrop[]> {
  const tierBuckets = new Map<number, Map<string, NpcRewardDrop>>();

  for (const npc of npcs) {
    const tierMap = tierBuckets.get(npc.tier) ?? new Map<string, NpcRewardDrop>();
    for (const drop of npc.rewardCards) {
      const prev = tierMap.get(drop.cardId);
      if (!prev || drop.chance > prev.chance) {
        tierMap.set(drop.cardId, {
          cardId: drop.cardId,
          chance: clamp(drop.chance, 0, 1),
          minCount: 1,
          maxCount: 1
        });
      }
    }
    tierBuckets.set(npc.tier, tierMap);
  }

  const result = new Map<number, NpcRewardDrop[]>();
  for (const [tier, bucket] of tierBuckets.entries()) {
    const rows = Array.from(bucket.values()).sort((left, right) => (right.chance - left.chance) || left.cardId.localeCompare(right.cardId));
    result.set(tier, rows);
  }

  return result;
}

function buildRewardPoolForNpc(options: {
  baseRewards: NpcRewardDrop[];
  npcTier: number;
  tierRewards: NpcRewardDrop[];
}): NpcRewardDrop[] {
  const { baseRewards, npcTier, tierRewards } = options;
  if (baseRewards.length === 0) return [];

  const dedup = new Map<string, NpcRewardDrop>();

  for (const reward of baseRewards) {
    dedup.set(reward.cardId, {
      cardId: reward.cardId,
      chance:
        baseRewards.length > SMALL_NPC_DROP_POOL_THRESHOLD
          ? normalizeDropChance(reward.chance, 0.003, 0.16)
          : normalizeDropChance(reward.chance * 0.72, 0.01, 0.22),
      minCount: reward.minCount,
      maxCount: reward.maxCount
    });
  }

  const targetPoolSize =
    baseRewards.length > SMALL_NPC_DROP_POOL_THRESHOLD
      ? baseRewards.length +
        clamp(Math.floor(baseRewards.length * 0.22), LARGE_NPC_EXTRA_POOL_MIN, LARGE_NPC_EXTRA_POOL_MAX)
      : clamp(baseRewards.length * 3, SMALL_NPC_DROP_POOL_MIN_TARGET, SMALL_NPC_DROP_POOL_MAX_TARGET);

  for (const reward of tierRewards) {
    if (dedup.size >= targetPoolSize) break;
    if (dedup.has(reward.cardId)) continue;

    const card = CARD_INDEX[reward.cardId];
    const scaledChance =
      baseRewards.length > SMALL_NPC_DROP_POOL_THRESHOLD
        ? reward.chance * 0.22 * costWeightForTier(card?.cost, npcTier)
        : reward.chance * 0.6 * costWeightForTier(card?.cost, npcTier);
    const chance = normalizeDropChance(scaledChance, 0.002, 0.06);

    dedup.set(reward.cardId, {
      cardId: reward.cardId,
      chance,
      minCount: 1,
      maxCount: 1
    });
  }

  return Array.from(dedup.values()).sort((left, right) => (right.chance - left.chance) || left.cardId.localeCompare(right.cardId));
}

function parseRewardedCards(value: Prisma.JsonValue): Array<{ cardId: string; count: number }> {
  if (!Array.isArray(value)) return [];
  const parsed: Array<{ cardId: string; count: number }> = [];

  for (const row of value) {
    if (!row || typeof row !== "object") continue;
    const cardId = (row as { cardId?: unknown }).cardId;
    const count = (row as { count?: unknown }).count;
    if (typeof cardId !== "string") continue;
    if (typeof count !== "number" || !Number.isFinite(count) || count <= 0) continue;
    parsed.push({ cardId, count: Math.floor(count) });
  }

  return parsed;
}

function buildRecentDropFrequency(rows: Prisma.JsonValue[]): Map<string, number> {
  const frequency = new Map<string, number>();
  for (const row of rows) {
    const cards = parseRewardedCards(row);
    for (const card of cards) {
      frequency.set(card.cardId, (frequency.get(card.cardId) ?? 0) + 1);
    }
  }
  return frequency;
}

function applyRecentDropDiversity(pool: NpcRewardDrop[], recentFrequency: Map<string, number>): NpcRewardDrop[] {
  if (pool.length === 0) return [];
  if (recentFrequency.size === 0) return pool;

  return pool.map((drop) => {
    const repeatedWins = recentFrequency.get(drop.cardId) ?? 0;
    const repeatPenalty = 1 / (1 + repeatedWins * 1.65);
    return {
      ...drop,
      chance: normalizeDropChance(drop.chance * repeatPenalty, 0.0015, 0.12)
    };
  });
}

function pickWeightedDrop(pool: NpcRewardDrop[], excludedCardIds?: Set<string>): NpcRewardDrop | null {
  const candidates = pool.filter((drop) => !excludedCardIds?.has(drop.cardId));
  if (candidates.length === 0) return null;

  const totalWeight = candidates.reduce((sum, drop) => sum + Math.sqrt(Math.max(0, drop.chance)), 0);
  if (totalWeight <= 0) {
    return candidates[Math.floor(Math.random() * candidates.length)] ?? null;
  }

  let cursor = Math.random() * totalWeight;
  for (const drop of candidates) {
    cursor -= Math.sqrt(Math.max(0, drop.chance));
    if (cursor <= 0) return drop;
  }

  return candidates[candidates.length - 1] ?? null;
}

function toRewardedCardsArray(rewardMap: Map<string, number>): Array<{ cardId: string; count: number }> {
  return Array.from(rewardMap.entries())
    .map(([cardId, count]) => ({ cardId, count }))
    .sort((left, right) => left.cardId.localeCompare(right.cardId));
}

function totalRewardedCopies(rewardMap: Map<string, number>): number {
  return Array.from(rewardMap.values()).reduce((sum, count) => sum + count, 0);
}

function resolvePlayerName(username?: string): string {
  const normalized = username?.trim();
  if (normalized && normalized.length >= 2) return normalized.slice(0, 24);
  return "Duelista";
}

function normalizeLogin(login: string): string {
  return login.trim().toLowerCase();
}

function hashPassword(password: string, salt = randomBytes(16).toString("hex")): { hash: string; salt: string } {
  const hash = scryptSync(password, salt, 64).toString("hex");
  return { hash, salt };
}

function verifyPassword(password: string, hashHex: string, salt: string): boolean {
  const candidate = scryptSync(password, salt, 64);
  const expected = Buffer.from(hashHex, "hex");
  if (candidate.length !== expected.length) return false;
  return timingSafeEqual(candidate, expected);
}

export class PersistenceService {
  private readonly fmNpcs: FmNpcDefinition[];
  private readonly missingNpcCards: string[];
  private readonly tierRewardPools: Map<number, NpcRewardDrop[]>;

  constructor(private readonly prisma: PrismaClient) {
    const fmBuild = buildFmNpcCatalog();
    this.fmNpcs = fmBuild.npcs;
    this.missingNpcCards = fmBuild.missingCards;
    this.tierRewardPools = buildTierRewardPools(this.fmNpcs);
  }

  getMissingNpcCards(): string[] {
    return [...this.missingNpcCards];
  }

  getShopConfig(): ShopConfigView {
    return {
      reroll: {
        dailyLimit: SHOP_REROLL_DAILY_LIMIT,
        baseCost: SHOP_REROLL_BASE_COST,
        stepCost: SHOP_REROLL_STEP_COST,
        maxCost: SHOP_REROLL_MAX_COST
      },
      boosters: (Object.values(BOOSTER_PACKS) as BoosterPackConfig[]).map((pack) => ({
        type: pack.type,
        label: pack.label,
        cost: pack.cost,
        cards: pack.cards
      }))
    };
  }

  async syncCatalogAndNpcSeed(): Promise<void> {
    for (const card of ALL_CARDS) {
      await this.prisma.card.upsert({
        where: { id: card.id },
        create: {
          id: card.id,
          name: card.name,
          atk: card.atk ?? 0,
          def: card.def ?? 0,
          kind: toCardKind(card.kind),
          tags: asJson(card.tags),
          rarity: resolveCardRarity(card.id, cardScore(card.id)),
          imagePath: card.imagePath,
          effectKey: card.effectKey,
          effectDesc: card.effectDescription,
          password: card.password,
          cost: card.cost,
          catalogNumber: card.catalogNumber
        },
        update: {
          name: card.name,
          atk: card.atk ?? 0,
          def: card.def ?? 0,
          kind: toCardKind(card.kind),
          tags: asJson(card.tags),
          rarity: resolveCardRarity(card.id, cardScore(card.id)),
          imagePath: card.imagePath,
          effectKey: card.effectKey,
          effectDesc: card.effectDescription,
          password: card.password,
          cost: card.cost,
          catalogNumber: card.catalogNumber
        }
      });
    }

    for (const npc of this.fmNpcs) {
      await this.prisma.npc.upsert({
        where: { id: npc.id },
        create: {
          id: npc.id,
          name: npc.name,
          tier: npc.tier,
          rewardGold: npc.rewardGold,
          rewardCards: asJson(npc.rewardCards),
          deck: asJson(npc.deck),
          unlockRequirement: asJson(npc.unlockRequirement)
        },
        update: {
          name: npc.name,
          tier: npc.tier,
          rewardGold: npc.rewardGold,
          rewardCards: asJson(npc.rewardCards),
          deck: asJson(npc.deck),
          unlockRequirement: asJson(npc.unlockRequirement)
        }
      });
    }
  }

  private toPlayerSummary(player: {
    id: string;
    publicId: string;
    username: string;
    gold: number;
    winsPve: number;
    winsPvp: number;
  }): PlayerSummary {
    return {
      id: player.id,
      publicId: player.publicId,
      username: player.username,
      gold: player.gold,
      winsPve: player.winsPve,
      winsPvp: player.winsPvp
    };
  }

  private async ensurePlayerShopState(
    tx: Prisma.TransactionClient,
    playerId: string,
    now = Date.now()
  ): Promise<{ rotationDay: string; rerollCount: number; rerollNonce: number }> {
    const currentDay = buildShopRotationKey(now);
    const existing = await tx.playerShopState.findUnique({
      where: { playerId }
    });

    if (!existing) {
      const created = await tx.playerShopState.create({
        data: {
          playerId,
          rotationDay: currentDay,
          rerollCount: 0,
          rerollNonce: 0
        }
      });
      return {
        rotationDay: created.rotationDay,
        rerollCount: created.rerollCount,
        rerollNonce: created.rerollNonce
      };
    }

    if (existing.rotationDay !== currentDay) {
      const reset = await tx.playerShopState.update({
        where: { id: existing.id },
        data: {
          rotationDay: currentDay,
          rerollCount: 0,
          rerollNonce: 0
        }
      });
      return {
        rotationDay: reset.rotationDay,
        rerollCount: reset.rerollCount,
        rerollNonce: reset.rerollNonce
      };
    }

    return {
      rotationDay: existing.rotationDay,
      rerollCount: existing.rerollCount,
      rerollNonce: existing.rerollNonce
    };
  }

  private async buildDemandMap(tx: Prisma.TransactionClient): Promise<Map<string, number>> {
    const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const grouped = await tx.shopTransaction.groupBy({
      by: ["cardId"],
      where: {
        createdAt: {
          gte: since
        }
      },
      _count: {
        _all: true
      }
    });

    return new Map(grouped.map((row) => [row.cardId, row._count._all]));
  }

  private mapOfferView(offer: ShopOfferInternal): ShopOfferView | null {
    const card = CARD_INDEX[offer.cardId];
    if (!card) return null;
    return {
      cardId: card.id,
      name: card.name,
      kind: toCardKind(card.kind),
      atk: card.atk ?? 0,
      def: card.def ?? 0,
      tags: [...card.tags],
      effectDescription: card.effectDescription,
      imagePath: card.imagePath,
      password: card.password,
      cost: card.cost,
      catalogNumber: card.catalogNumber,
      price: offer.price,
      score: offer.score,
      affordable: offer.affordable,
      owned: offer.owned,
      segment: offer.segment,
      rarity: offer.rarity
    };
  }

  private async buildShopListForPlayer(
    tx: Prisma.TransactionClient,
    player: {
      id: string;
      publicId: string;
      winsPve: number;
      gold: number;
      cards: Array<{ cardId: string; count: number }>;
    },
    limit = 20
  ): Promise<ShopListSummary> {
    const shopState = await this.ensurePlayerShopState(tx, player.id);
    const demandByCardId = await this.buildDemandMap(tx);
    const ownedByCardId = new Map(player.cards.map((entry) => [entry.cardId, entry.count]));

    const offers = buildShopOffers({
      playerId: player.publicId,
      winsPve: player.winsPve,
      gold: player.gold,
      ownedByCardId,
      demandByCardId,
      limit,
      rotationKey: shopState.rotationDay,
      rerollNonce: shopState.rerollNonce
    });

    return {
      offers: offers.map((offer) => this.mapOfferView(offer)).filter((offer): offer is ShopOfferView => Boolean(offer)),
      meta: buildShopMeta(shopState.rotationDay, shopState.rerollCount)
    };
  }

  private rollBoosterCards(args: {
    packType: BoosterPackType;
    count: number;
    ownedByCardId: Map<string, number>;
    demandByCardId: Map<string, number>;
  }): ShopCardWithMeta[] {
    const { packType, count, ownedByCardId, demandByCardId } = args;
    const config = BOOSTER_PACKS[packType];
    const selected = new Set<string>();
    const result: ShopCardWithMeta[] = [];

    for (let index = 0; index < count; index += 1) {
      const segmentChoice = selectByWeight(config.segments.map((row) => ({ ...row, weight: row.weight })));
      const targetSegment = segmentChoice?.segment ?? "INICIANTE";

      const candidates = SHOP_SOURCE_CARDS_META.filter((meta) => !selected.has(meta.cardId));
      const weightedCandidates = candidates.map((meta) => {
        const segmentWeight = meta.segment === targetSegment ? 1 : targetSegment === "INICIANTE" && meta.segment === "INTERMEDIARIO" ? 0.35 : 0.22;
        const rarityWeight = rarityWeightForPack(packType, meta.rarity);
        const demandPenalty = 1 / (1 + ((demandByCardId.get(meta.cardId) ?? 0) * 0.08));
        const ownedPenalty = (ownedByCardId.get(meta.cardId) ?? 0) >= 3 ? 0.52 : 1;
        const weight = Math.max(0.001, segmentWeight * rarityWeight * demandPenalty * ownedPenalty);
        return {
          meta,
          weight
        };
      });

      const picked = selectByWeight(weightedCandidates);
      if (!picked?.meta) break;
      selected.add(picked.meta.cardId);
      result.push(picked.meta);
    }

    return result;
  }

  private async createPlayerWithStarter(publicId: string, username?: string) {
    const starter = buildStarterData();
    const playerName = resolvePlayerName(username);

    return this.prisma.$transaction(async (tx) => {
      const player = await tx.player.create({
        data: {
          publicId,
          username: playerName,
          gold: STARTER_BASE_GOLD
        }
      });

      await tx.deck.create({
        data: {
          playerId: player.id,
          name: starter.deck.name,
          cards: asJson(starter.deck.cards),
          isActive: true
        }
      });

      if (starter.collection.length > 0) {
        await tx.playerCard.createMany({
          data: starter.collection.map((entry) => ({
            playerId: player.id,
            cardId: entry.cardId,
            count: entry.count
          })),
          skipDuplicates: true
        });
      }

      return player;
    });
  }

  async hello(input: { publicId?: string; username?: string }): Promise<{ player: PlayerSummary; publicId: string }> {
    const requestedPublicId = input.publicId?.trim() || randomUUID();
    const playerName = resolvePlayerName(input.username);

    const existing = await this.prisma.player.findUnique({
      where: { publicId: requestedPublicId }
    });

    if (existing) {
      const updated = await this.prisma.player.update({
        where: { publicId: requestedPublicId },
        data: {
          username: input.username ? playerName : undefined,
          lastSeenAt: new Date()
        }
      });
      return {
        player: this.toPlayerSummary(updated),
        publicId: updated.publicId
      };
    }

    const created = await this.createPlayerWithStarter(requestedPublicId, playerName);
    return {
      player: this.toPlayerSummary(created),
      publicId: created.publicId
    };
  }

  async registerAccount(input: { login: string; password: string; username?: string }): Promise<{ player: PlayerSummary; publicId: string }> {
    const login = normalizeLogin(input.login);
    if (!login || login.length < 3 || login.length > 32 || !/^[a-z0-9_.-]+$/i.test(login)) {
      throw new Error("Login invalido. Use 3-32 caracteres (letras, numeros, _, -, .).");
    }
    if (!input.password || input.password.length < 6 || input.password.length > 64) {
      throw new Error("Senha invalida. Use entre 6 e 64 caracteres.");
    }

    const existing = await this.prisma.authAccount.findUnique({
      where: { login }
    });
    if (existing) {
      throw new Error("Esse login ja esta em uso.");
    }

    const playerName = resolvePlayerName(input.username || login);
    const publicId = randomUUID();
    const starter = buildStarterData();
    const { hash, salt } = hashPassword(input.password);

    const player = await this.prisma.$transaction(async (tx) => {
      const createdPlayer = await tx.player.create({
        data: {
          publicId,
          username: playerName,
          gold: STARTER_BASE_GOLD
        }
      });

      await tx.authAccount.create({
        data: {
          login,
          passwordHash: hash,
          passwordSalt: salt,
          playerId: createdPlayer.id
        }
      });

      await tx.deck.create({
        data: {
          playerId: createdPlayer.id,
          name: starter.deck.name,
          cards: asJson(starter.deck.cards),
          isActive: true
        }
      });

      if (starter.collection.length > 0) {
        await tx.playerCard.createMany({
          data: starter.collection.map((entry) => ({
            playerId: createdPlayer.id,
            cardId: entry.cardId,
            count: entry.count
          })),
          skipDuplicates: true
        });
      }

      return createdPlayer;
    });

    return {
      player: this.toPlayerSummary(player),
      publicId: player.publicId
    };
  }

  async loginAccount(input: { login: string; password: string }): Promise<{ player: PlayerSummary; publicId: string }> {
    const login = normalizeLogin(input.login);
    if (!login || !input.password) {
      throw new Error("Login e senha sao obrigatorios.");
    }

    const account = await this.prisma.authAccount.findUnique({
      where: { login },
      include: {
        player: true
      }
    });
    if (!account || !verifyPassword(input.password, account.passwordHash, account.passwordSalt)) {
      throw new Error("Login ou senha invalidos.");
    }

    const updated = await this.prisma.player.update({
      where: { id: account.playerId },
      data: {
        lastSeenAt: new Date()
      }
    });

    return {
      player: this.toPlayerSummary(updated),
      publicId: updated.publicId
    };
  }

  async resetPlayerProgress(publicId: string): Promise<PlayerSummary> {
    const player = await this.prisma.player.findUnique({
      where: { publicId },
      select: { id: true, username: true }
    });
    if (!player) {
      throw new Error("Player nao encontrado.");
    }

    const starter = buildStarterData();

    const updatedPlayer = await this.prisma.$transaction(async (tx) => {
      await tx.fusionDiscovery.deleteMany({
        where: { playerId: player.id }
      });
      await tx.playerCard.deleteMany({
        where: { playerId: player.id }
      });
      await tx.deck.deleteMany({
        where: { playerId: player.id }
      });
      await tx.matchHistory.deleteMany({
        where: { playerId: player.id }
      });
      await tx.shopTransaction.deleteMany({
        where: { playerId: player.id }
      });
      await tx.playerShopState.deleteMany({
        where: { playerId: player.id }
      });

      await tx.deck.create({
        data: {
          playerId: player.id,
          name: starter.deck.name,
          cards: asJson(starter.deck.cards),
          isActive: true
        }
      });

      if (starter.collection.length > 0) {
        await tx.playerCard.createMany({
          data: starter.collection.map((entry) => ({
            playerId: player.id,
            cardId: entry.cardId,
            count: entry.count
          })),
          skipDuplicates: true
        });
      }

      return tx.player.update({
        where: { id: player.id },
        data: {
          gold: STARTER_BASE_GOLD,
          winsPve: 0,
          winsPvp: 0,
          lastSeenAt: new Date()
        }
      });
    });

    return this.toPlayerSummary(updatedPlayer);
  }

  async getPlayerByPublicId(publicId: string): Promise<PlayerSummary> {
    const player = await this.prisma.player.findUnique({
      where: { publicId }
    });
    if (!player) {
      throw new Error("Player nao encontrado.");
    }
    return this.toPlayerSummary(player);
  }

  async updateProfile(publicId: string, username: string): Promise<PlayerSummary> {
    const player = await this.prisma.player.update({
      where: { publicId },
      data: {
        username: resolvePlayerName(username),
        lastSeenAt: new Date()
      }
    });
    return this.toPlayerSummary(player);
  }

  private async resolvePlayerRecord(publicId: string) {
    const player = await this.prisma.player.findUnique({
      where: { publicId },
      include: {
        decks: true
      }
    });
    if (!player) {
      throw new Error("Player nao encontrado.");
    }
    return player;
  }

  private async resolvePlayerId(publicId: string): Promise<string> {
    const player = await this.prisma.player.findUnique({
      where: { publicId },
      select: { id: true }
    });
    if (!player) {
      throw new Error("Player nao encontrado.");
    }
    return player.id;
  }

  async listDecks(publicId: string): Promise<DeckListSummary> {
    const player = await this.resolvePlayerRecord(publicId);
    const decks = player.decks
      .map((deck) => deckRecordToDeck(deck))
      .sort((a, b) => b.updatedAt - a.updatedAt);
    const activeDeck = player.decks.find((deck) => deck.isActive) ?? null;
    return {
      decks,
      activeDeckId: activeDeck?.id ?? decks[0]?.id ?? null
    };
  }

  async saveDeck(publicId: string, deck: Deck): Promise<DeckListSummary> {
    const player = await this.resolvePlayerRecord(publicId);
    const existing = player.decks.find((item) => item.id === deck.id) ?? null;
    const hasActive = player.decks.some((item) => item.isActive);
    const normalizedName = deck.name.trim() || "Deck sem nome";
    const normalizedCards = sanitizeDeckEntries(deck.cards);

    await this.prisma.deck.upsert({
      where: { id: deck.id },
      create: {
        id: deck.id,
        playerId: player.id,
        name: normalizedName,
        cards: asJson(normalizedCards),
        isActive: existing?.isActive ?? !hasActive
      },
      update: {
        name: normalizedName,
        cards: asJson(normalizedCards)
      }
    });

    return this.listDecks(publicId);
  }

  async deleteDeck(publicId: string, deckId: string): Promise<DeckListSummary> {
    const player = await this.resolvePlayerRecord(publicId);
    const deck = player.decks.find((entry) => entry.id === deckId);
    if (!deck) {
      return this.listDecks(publicId);
    }

    await this.prisma.deck.delete({
      where: { id: deck.id }
    });

    const remaining = await this.prisma.deck.findMany({
      where: { playerId: player.id }
    });

    if (remaining.length === 0) {
      const starter = buildStarterData();
      await this.prisma.deck.create({
        data: {
          playerId: player.id,
          name: starter.deck.name,
          cards: asJson(starter.deck.cards),
          isActive: true
        }
      });
    } else if (deck.isActive) {
      const next = remaining.sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime())[0];
      await this.prisma.$transaction([
        this.prisma.deck.updateMany({
          where: { playerId: player.id },
          data: { isActive: false }
        }),
        this.prisma.deck.update({
          where: { id: next.id },
          data: { isActive: true }
        })
      ]);
    }

    return this.listDecks(publicId);
  }

  async setActiveDeck(publicId: string, deckId: string): Promise<DeckListSummary> {
    const player = await this.resolvePlayerRecord(publicId);
    if (!player.decks.some((deck) => deck.id === deckId)) {
      throw new Error("Deck nao encontrado.");
    }

    await this.prisma.$transaction([
      this.prisma.deck.updateMany({
        where: { playerId: player.id },
        data: { isActive: false }
      }),
      this.prisma.deck.update({
        where: { id: deckId },
        data: { isActive: true }
      })
    ]);

    return this.listDecks(publicId);
  }

  async getActiveDeckTemplateIds(publicId: string): Promise<string[]> {
    const player = await this.resolvePlayerRecord(publicId);
    const activeDeckRecord = player.decks.find((deck) => deck.isActive) ?? player.decks[0];
    if (!activeDeckRecord) {
      throw new Error("Nenhum deck ativo encontrado.");
    }
    const activeDeck = deckRecordToDeck(activeDeckRecord);
    const validation = validateDeck(activeDeck, DEFAULT_DECK_RULES);
    if (!validation.ok) {
      throw new Error(`Deck invalido: ${validation.errors.join(" | ")}`);
    }
    return expandDeckToList(activeDeck);
  }

  async getCollection(publicId: string): Promise<CollectionEntry[]> {
    const player = await this.prisma.player.findUnique({
      where: { publicId },
      include: {
        cards: {
          include: {
            card: true
          },
          orderBy: {
            card: {
              catalogNumber: "asc"
            }
          }
        }
      }
    });
    if (!player) throw new Error("Player nao encontrado.");

    return player.cards.map((entry) => ({
      cardId: entry.cardId,
      count: entry.count,
      name: entry.card.name,
      kind: toCardKind(entry.card.kind),
      atk: entry.card.atk,
      def: entry.card.def,
      tags: Array.isArray(entry.card.tags) ? entry.card.tags.map((tag) => String(tag)) : [],
      effectDescription: entry.card.effectDesc ?? undefined,
      imagePath: entry.card.imagePath ?? undefined,
      password: entry.card.password ?? undefined,
      cost: entry.card.cost ?? undefined,
      catalogNumber: entry.card.catalogNumber ?? undefined
    }));
  }

  async listShopOffers(publicId: string, limit = 20): Promise<ShopListSummary> {
    return this.prisma.$transaction(async (tx) => {
      const player = await tx.player.findUnique({
        where: { publicId },
        select: {
          id: true,
          publicId: true,
          winsPve: true,
          gold: true,
          cards: {
            select: {
              cardId: true,
              count: true
            }
          }
        }
      });
      if (!player) throw new Error("Player nao encontrado.");
      return this.buildShopListForPlayer(tx, player, limit);
    });
  }

  async purchaseShopCard(publicId: string, cardId: string): Promise<ShopPurchaseSummary> {
    const normalizedCardId = cardId.trim();
    if (!normalizedCardId) {
      throw new Error("cardId obrigatorio.");
    }
    if (!CARD_INDEX[normalizedCardId]) {
      throw new Error("Carta invalida para compra.");
    }

    return this.prisma.$transaction(async (tx) => {
      const player = await tx.player.findUnique({
        where: { publicId },
        select: {
          id: true,
          publicId: true,
          username: true,
          gold: true,
          winsPve: true,
          winsPvp: true,
          cards: {
            select: {
              cardId: true,
              count: true
            }
          }
        }
      });
      if (!player) {
        throw new Error("Player nao encontrado.");
      }

      const shopList = await this.buildShopListForPlayer(tx, player, 20);
      const selectedOffer = shopList.offers.find((offer) => offer.cardId === normalizedCardId);
      if (!selectedOffer) {
        throw new Error("Carta nao disponivel na rotacao atual da loja.");
      }
      if (player.gold < selectedOffer.price) {
        throw new Error("Gold insuficiente para esta compra.");
      }

      const updatedGold = player.gold - selectedOffer.price;

      const goldUpdate = await tx.player.updateMany({
        where: {
          id: player.id,
          gold: {
            gte: selectedOffer.price
          }
        },
        data: {
          gold: {
            decrement: selectedOffer.price
          },
          lastSeenAt: new Date()
        }
      });
      if (goldUpdate.count === 0) {
        throw new Error("Gold insuficiente para esta compra.");
      }

      await tx.shopTransaction.create({
        data: {
          playerId: player.id,
          cardId: normalizedCardId,
          source: ShopPurchaseSource.SINGLE,
          price: selectedOffer.price
        }
      });

      const updatedCard = await tx.playerCard.upsert({
        where: {
          playerId_cardId: {
            playerId: player.id,
            cardId: normalizedCardId
          }
        },
        create: {
          playerId: player.id,
          cardId: normalizedCardId,
          count: 1
        },
        update: {
          count: {
            increment: 1
          }
        },
        select: {
          count: true
        }
      });

      const card = CARD_INDEX[normalizedCardId];
      return {
        player: this.toPlayerSummary({
          id: player.id,
          publicId: player.publicId,
          username: player.username,
          gold: updatedGold,
          winsPve: player.winsPve,
          winsPvp: player.winsPvp
        }),
        purchased: {
          cardId: normalizedCardId,
          name: card?.name ?? normalizedCardId,
          price: selectedOffer.price,
          ownedAfter: updatedCard.count
        }
      } satisfies ShopPurchaseSummary;
    });
  }

  async rerollShopOffers(publicId: string, limit = 20): Promise<ShopRerollSummary> {
    return this.prisma.$transaction(async (tx) => {
      const player = await tx.player.findUnique({
        where: { publicId },
        select: {
          id: true,
          publicId: true,
          username: true,
          gold: true,
          winsPve: true,
          winsPvp: true,
          cards: {
            select: {
              cardId: true,
              count: true
            }
          }
        }
      });
      if (!player) throw new Error("Player nao encontrado.");

      const state = await this.ensurePlayerShopState(tx, player.id);
      if (state.rerollCount >= SHOP_REROLL_DAILY_LIMIT) {
        throw new Error("Limite diario de reroll atingido.");
      }

      const rerollCost = computeRerollCost(state.rerollCount);
      if (player.gold < rerollCost) {
        throw new Error("Gold insuficiente para atualizar ofertas.");
      }

      const goldUpdate = await tx.player.updateMany({
        where: {
          id: player.id,
          gold: {
            gte: rerollCost
          }
        },
        data: {
          gold: {
            decrement: rerollCost
          },
          lastSeenAt: new Date()
        }
      });
      if (goldUpdate.count === 0) {
        throw new Error("Gold insuficiente para atualizar ofertas.");
      }

      await tx.playerShopState.update({
        where: { playerId: player.id },
        data: {
          rerollCount: { increment: 1 },
          rerollNonce: { increment: 1 }
        }
      });

      const updatedPlayer = {
        ...player,
        gold: player.gold - rerollCost
      };
      const shop = await this.buildShopListForPlayer(tx, updatedPlayer, limit);

      return {
        player: this.toPlayerSummary(updatedPlayer),
        shop
      };
    });
  }

  async openShopBooster(publicId: string, packType: BoosterPackType): Promise<ShopBoosterSummary> {
    const config = BOOSTER_PACKS[packType];
    if (!config) throw new Error("Pacote invalido.");

    return this.prisma.$transaction(async (tx) => {
      const player = await tx.player.findUnique({
        where: { publicId },
        select: {
          id: true,
          publicId: true,
          username: true,
          gold: true,
          winsPve: true,
          winsPvp: true,
          cards: {
            select: {
              cardId: true,
              count: true
            }
          }
        }
      });
      if (!player) throw new Error("Player nao encontrado.");
      if (player.gold < config.cost) throw new Error("Gold insuficiente para abrir este pacote.");

      const demandByCardId = await this.buildDemandMap(tx);
      const ownedByCardId = new Map(player.cards.map((entry) => [entry.cardId, entry.count]));
      const rolled = this.rollBoosterCards({
        packType,
        count: config.cards,
        ownedByCardId,
        demandByCardId
      });
      if (rolled.length === 0) {
        throw new Error("Nao foi possivel gerar cartas para este pacote.");
      }

      const goldUpdate = await tx.player.updateMany({
        where: {
          id: player.id,
          gold: {
            gte: config.cost
          }
        },
        data: {
          gold: {
            decrement: config.cost
          },
          lastSeenAt: new Date()
        }
      });
      if (goldUpdate.count === 0) {
        throw new Error("Gold insuficiente para abrir este pacote.");
      }

      const perCardPrice = Math.max(1, Math.round(config.cost / rolled.length));
      const rewards: BoosterCardReward[] = [];

      for (const meta of rolled) {
        const card = CARD_INDEX[meta.cardId];
        if (!card) continue;

        await tx.playerCard.upsert({
          where: {
            playerId_cardId: {
              playerId: player.id,
              cardId: meta.cardId
            }
          },
          create: {
            playerId: player.id,
            cardId: meta.cardId,
            count: 1
          },
          update: {
            count: {
              increment: 1
            }
          }
        });

        await tx.shopTransaction.create({
          data: {
            playerId: player.id,
            cardId: meta.cardId,
            source: config.source,
            price: perCardPrice
          }
        });

        rewards.push({
          cardId: card.id,
          name: card.name,
          kind: toCardKind(card.kind),
          atk: card.atk ?? 0,
          def: card.def ?? 0,
          tags: [...card.tags],
          effectDescription: card.effectDescription,
          imagePath: card.imagePath,
          rarity: meta.rarity,
          segment: meta.segment
        });
      }

      return {
        player: this.toPlayerSummary({
          id: player.id,
          publicId: player.publicId,
          username: player.username,
          gold: player.gold - config.cost,
          winsPve: player.winsPve,
          winsPvp: player.winsPvp
        }),
        packType,
        packCost: config.cost,
        cards: rewards
      };
    });
  }

  private toFusionDiscoveryView(row: {
    key: string;
    materialsCount: number;
    materialTags: Prisma.JsonValue;
    materialCardIds: Prisma.JsonValue | null;
    resultCardId: string;
    resultName: string;
    discoveredAt: Date;
    times: number;
  }): FusionDiscoveryView {
    return {
      key: row.key,
      materialsCount: row.materialsCount === 3 ? 3 : 2,
      materialTags: parseStringList(row.materialTags),
      materialCardIds: parseStringList(row.materialCardIds),
      resultCardId: row.resultCardId,
      resultName: row.resultName,
      discoveredAt: row.discoveredAt.getTime(),
      times: row.times
    };
  }

  async listFusionDiscoveries(publicId: string): Promise<FusionDiscoveryView[]> {
    const playerId = await this.resolvePlayerId(publicId);
    const rows = await this.prisma.fusionDiscovery.findMany({
      where: { playerId },
      orderBy: [{ discoveredAt: "desc" }, { resultName: "asc" }]
    });

    return rows.map((row) => this.toFusionDiscoveryView(row));
  }

  private async registerFusionDiscoveryForPlayerId(playerId: string, input: FusionDiscoveryInput): Promise<void> {
    const normalizedKey = input.key.trim();
    if (!normalizedKey) return;

    const materialTags = Array.from(
      new Set(input.materialTags.map((tag) => String(tag ?? "").trim().toUpperCase()).filter(Boolean))
    ).sort((left, right) => left.localeCompare(right));
    const materialCardIds = normalizeMaterialCardIds(input.materialCardIds);

    await this.prisma.fusionDiscovery.upsert({
      where: {
        playerId_key: {
          playerId,
          key: normalizedKey
        }
      },
      create: {
        playerId,
        key: normalizedKey,
        materialsCount: input.materialsCount >= 3 ? 3 : 2,
        materialTags: asJson(materialTags),
        materialCardIds: asJson(materialCardIds),
        resultCardId: input.resultCardId,
        resultName: input.resultName,
        times: 1
      },
      update: {
        materialsCount: input.materialsCount >= 3 ? 3 : 2,
        materialTags: asJson(materialTags),
        materialCardIds: asJson(materialCardIds),
        resultCardId: input.resultCardId,
        resultName: input.resultName,
        times: { increment: 1 }
      }
    });
  }

  async registerFusionDiscovery(publicId: string, input: FusionDiscoveryInput): Promise<void> {
    const playerId = await this.resolvePlayerId(publicId);
    await this.registerFusionDiscoveryForPlayerId(playerId, input);
  }

  async syncFusionDiscoveries(publicId: string, inputs: FusionDiscoveryInput[]): Promise<FusionDiscoveryView[]> {
    const playerId = await this.resolvePlayerId(publicId);
    for (const input of inputs) {
      await this.registerFusionDiscoveryForPlayerId(playerId, input);
    }
    return this.listFusionDiscoveries(publicId);
  }

  async testFusion(publicId: string, materialCardIds: string[]): Promise<FusionTestSummary> {
    const normalizedMaterialCardIds = normalizeMaterialCardIds(materialCardIds);
    if (normalizedMaterialCardIds.length < 2 || normalizedMaterialCardIds.length > 3) {
      throw new Error("Selecione 2 ou 3 cartas para testar a fusao.");
    }

    const playerId = await this.resolvePlayerId(publicId);
    const uniqueCardIds = Array.from(new Set(normalizedMaterialCardIds));
    const ownedRows = await this.prisma.playerCard.findMany({
      where: {
        playerId,
        cardId: { in: uniqueCardIds }
      },
      select: {
        cardId: true,
        count: true
      }
    });

    const ownedByCardId = new Map<string, number>(ownedRows.map((row) => [row.cardId, row.count]));
    const usedByCardId = new Map<string, number>();
    for (const cardId of normalizedMaterialCardIds) {
      const used = (usedByCardId.get(cardId) ?? 0) + 1;
      usedByCardId.set(cardId, used);
      const owned = ownedByCardId.get(cardId) ?? 0;
      if (used > owned) {
        const cardName = CARD_INDEX[cardId]?.name ?? cardId;
        throw new Error(`Voce nao possui copias suficientes de ${cardName} para testar esta fusao.`);
      }
    }

    const materialEntries = normalizedMaterialCardIds.map((cardId, index) => ({
      cardId,
      name: CARD_INDEX[cardId]?.name ?? cardId,
      summary: buildMaterialSummary(`fusion-lab-${index + 1}-${cardId}`, cardId)
    }));

    const fusion = resolveFusionFromOrderedMaterials(
      materialEntries.map((entry) => entry.summary),
      Date.now()
    );
    const resultCardId = fusion.resultTemplateId;
    const resultName = CARD_INDEX[resultCardId]?.name ?? resultCardId;

    let discovery: FusionDiscoveryView | null = null;
    if (!fusion.failed) {
      const resolved = buildFusionDiscoveryResolvedFromTemplateIds(normalizedMaterialCardIds, resultCardId);
      if (resolved) {
        await this.registerFusionDiscoveryForPlayerId(playerId, {
          key: resolved.key,
          materialsCount: resolved.materialsCount,
          materialTags: resolved.materialTags,
          materialCardIds: normalizedMaterialCardIds,
          resultCardId: resolved.resultCardId,
          resultName: resolved.resultName
        });

        const stored = await this.prisma.fusionDiscovery.findUnique({
          where: {
            playerId_key: {
              playerId,
              key: resolved.key
            }
          }
        });
        if (stored) {
          discovery = this.toFusionDiscoveryView(stored);
        }
      }
    }

    return {
      materials: materialEntries.map(({ cardId, name }) => ({ cardId, name })),
      result: {
        cardId: resultCardId,
        name: resultName,
        failed: fusion.failed,
        fallbackType: fusion.fallbackType
      },
      discovery
    };
  }

  async listPveNpcs(publicId: string): Promise<PveNpcView[]> {
    const player = await this.prisma.player.findUnique({
      where: { publicId },
      select: {
        id: true,
        winsPve: true
      }
    });
    if (!player) throw new Error("Player nao encontrado.");

    const npcs = await this.prisma.npc.findMany({
      orderBy: [{ tier: "asc" }, { name: "asc" }]
    });

    const wins = await this.prisma.matchHistory.findMany({
      where: {
        playerId: player.id,
        mode: "PVE",
        result: "WIN",
        opponentNpcId: { not: null }
      },
      select: {
        opponentNpcId: true
      }
    });
    const defeatedNpcIds = new Set(wins.map((row) => row.opponentNpcId).filter((id): id is string => Boolean(id)));

    return npcs.map((npc) => {
      const unlockRequirement = parseUnlockRequirement(npc.unlockRequirement);
      const unlocked =
        unlockRequirement.type === "NONE"
          ? true
          : unlockRequirement.type === "DEFEAT_NPC"
            ? defeatedNpcIds.has(unlockRequirement.npcId)
            : player.winsPve >= unlockRequirement.wins;
      const deckEntries = safeDeckEntries(npc.deck);
      const aceCard = resolveNpcAceCard(deckEntries);

      return {
        id: npc.id,
        name: npc.name,
        tier: npc.tier,
        rewardGold: npc.rewardGold,
        rewardCards: parseRewardDrops(npc.rewardCards),
        unlockRequirement,
        unlocked,
        defeated: defeatedNpcIds.has(npc.id),
        portraitPath: `/images/npcs/${npc.id}.png`,
        portraitAltPath: `/images/npcs/${normalizeAssetSlug(npc.name)}.png`,
        fallbackPortraitPath: aceCard?.imagePath ?? "/images/cartas/Back-FMR-EN-VG.png",
        aceCardId: aceCard?.cardId,
        aceCardName: aceCard?.cardName
      };
    });
  }

  async getPveNpcForStart(publicId: string, npcId: string): Promise<{
    npc: {
      id: string;
      name: string;
      tier: number;
      rewardGold: number;
      rewardCards: NpcRewardDrop[];
      deckTemplateIds: string[];
      unlockRequirement: UnlockRequirement;
      unlocked: boolean;
    };
    player: PlayerSummary;
  }> {
    const [player, npcRows] = await Promise.all([this.getPlayerByPublicId(publicId), this.listPveNpcs(publicId)]);
    const target = npcRows.find((npc) => npc.id === npcId);
    if (!target) throw new Error("NPC nao encontrado.");
    if (!target.unlocked) throw new Error("NPC bloqueado para este jogador.");

    const npc = await this.prisma.npc.findUnique({
      where: { id: npcId }
    });
    if (!npc) throw new Error("NPC nao encontrado.");

    const deckTemplateIds = expandDeckToList({
      id: npc.id,
      name: npc.name,
      cards: safeDeckEntries(npc.deck),
      updatedAt: Date.now()
    });

    return {
      player,
      npc: {
        id: npc.id,
        name: npc.name,
        tier: npc.tier,
        rewardGold: npc.rewardGold,
        rewardCards: parseRewardDrops(npc.rewardCards),
        unlockRequirement: parseUnlockRequirement(npc.unlockRequirement),
        unlocked: target.unlocked,
        deckTemplateIds
      }
    };
  }

  async recordPveResult(input: { publicId: string; npcId: string; didWin: boolean }): Promise<PveResultSummary> {
    const player = await this.prisma.player.findUnique({
      where: { publicId: input.publicId }
    });
    if (!player) throw new Error("Player nao encontrado.");

    const npc = await this.prisma.npc.findUnique({
      where: { id: input.npcId }
    });
    if (!npc) throw new Error("NPC nao encontrado.");

    const baseRewards = parseRewardDrops(npc.rewardCards);
    const rewards = buildRewardPoolForNpc({
      baseRewards,
      npcTier: npc.tier,
      tierRewards: this.tierRewardPools.get(npc.tier) ?? []
    });
    const rewardedMap = new Map<string, number>();
    let rewardGold = 0;

    if (input.didWin) {
      rewardGold = npc.rewardGold;
      const recentWinRows = await this.prisma.matchHistory.findMany({
        where: {
          playerId: player.id,
          opponentNpcId: npc.id,
          mode: "PVE",
          result: "WIN",
          rewardClaimed: true
        },
        orderBy: {
          endedAt: "desc"
        },
        take: RECENT_DROP_MEMORY,
        select: {
          rewardCards: true
        }
      });

      const recentFrequency = buildRecentDropFrequency(recentWinRows.map((row) => row.rewardCards ?? []));
      const diversifiedRewards = applyRecentDropDiversity(rewards, recentFrequency);

      if (diversifiedRewards.length > 0) {
        const distinctTarget =
          diversifiedRewards.length >= 4 && Math.random() < 0.3
            ? MIN_PVE_DISTINCT_DROPS_ON_WIN + 1
            : MIN_PVE_DISTINCT_DROPS_ON_WIN;

        const alreadyUsed = new Set<string>();
        while (rewardedMap.size < Math.min(distinctTarget, diversifiedRewards.length)) {
          const guaranteed = pickWeightedDrop(diversifiedRewards, alreadyUsed);
          if (!guaranteed) break;
          rewardedMap.set(guaranteed.cardId, (rewardedMap.get(guaranteed.cardId) ?? 0) + rollDropCount(guaranteed));
          alreadyUsed.add(guaranteed.cardId);
        }

        while (totalRewardedCopies(rewardedMap) < MIN_PVE_TOTAL_DROPS_ON_WIN) {
          const bonusDrop = pickWeightedDrop(diversifiedRewards);
          if (!bonusDrop) break;
          rewardedMap.set(bonusDrop.cardId, (rewardedMap.get(bonusDrop.cardId) ?? 0) + 1);
        }
      }
    }

    const rewardedCards = toRewardedCardsArray(rewardedMap);

    await this.prisma.$transaction(async (tx) => {
      await tx.matchHistory.create({
        data: {
          mode: "PVE",
          playerId: player.id,
          opponentNpcId: npc.id,
          result: input.didWin ? "WIN" : "LOSS",
          rewardClaimed: input.didWin,
          rewardGold,
          rewardCards: asJson(rewardedCards),
          endedAt: new Date()
        }
      });

      if (!input.didWin) return;

      await tx.player.update({
        where: { id: player.id },
        data: {
          gold: { increment: rewardGold },
          winsPve: { increment: 1 },
          lastSeenAt: new Date()
        }
      });

      for (const reward of rewardedCards) {
        await tx.playerCard.upsert({
          where: {
            playerId_cardId: {
              playerId: player.id,
              cardId: reward.cardId
            }
          },
          create: {
            playerId: player.id,
            cardId: reward.cardId,
            count: reward.count
          },
          update: {
            count: {
              increment: reward.count
            }
          }
        });
      }
    });

    return {
      rewardGold,
      rewardCards: rewardedCards
    };
  }

  async recordPvpResult(input: {
    winnerPublicId: string;
    loserPublicId: string;
  }): Promise<void> {
    const [winner, loser] = await Promise.all([
      this.prisma.player.findUnique({ where: { publicId: input.winnerPublicId } }),
      this.prisma.player.findUnique({ where: { publicId: input.loserPublicId } })
    ]);
    if (!winner || !loser) return;

    await this.prisma.$transaction(async (tx) => {
      await tx.player.update({
        where: { id: winner.id },
        data: {
          winsPvp: { increment: 1 },
          lastSeenAt: new Date()
        }
      });
      await tx.player.update({
        where: { id: loser.id },
        data: {
          lastSeenAt: new Date()
        }
      });

      await tx.matchHistory.createMany({
        data: [
          {
            mode: "PVP",
            playerId: winner.id,
            opponentPlayerId: loser.id,
            result: "WIN",
            rewardClaimed: true,
            rewardGold: 0,
            endedAt: new Date()
          },
          {
            mode: "PVP",
            playerId: loser.id,
            opponentPlayerId: winner.id,
            result: "LOSS",
            rewardClaimed: true,
            rewardGold: 0,
            endedAt: new Date()
          }
        ]
      });
    });
  }
}

export type {
  BoosterPackType,
  CollectionEntry,
  DeckListSummary,
  PlayerSummary,
  PveNpcView,
  PveResultSummary,
  ShopBoosterSummary,
  ShopConfigView,
  ShopListSummary,
  ShopOfferView,
  ShopPurchaseSummary,
  ShopRerollSummary
};
