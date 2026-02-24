export type ProgressEventKey = "PVE_WIN" | "PVE_PLAY" | "PVP_WIN" | "PVP_PLAY" | "DUEL_PLAY" | "SHOP_BUY" | "FUSION_DISCOVERY";

export type DailyMissionCategory = "PVE" | "PVP" | "SHOP" | "FUSION" | "GENERAL";

export interface DailyMissionDefinition {
  key: string;
  title: string;
  description: string;
  category: DailyMissionCategory;
  eventKey: ProgressEventKey;
  target: number;
  rewardGold: number;
  rewardXp: number;
}

export type AchievementRequirement =
  | { type: "WINS_PVE"; target: number }
  | { type: "WINS_PVP"; target: number }
  | { type: "FUSIONS_DISCOVERED"; target: number }
  | { type: "COLLECTION_UNIQUE"; target: number }
  | { type: "PLAYER_LEVEL"; target: number }
  | { type: "TOTAL_GOLD"; target: number }
  | { type: "MATCHES_TOTAL"; target: number };

export interface AchievementDefinition {
  key: string;
  title: string;
  description: string;
  requirement: AchievementRequirement;
  rewardGold: number;
  rewardXp: number;
  rewardDeckSlots?: number;
  rewardTitle?: string;
  score: number;
}

export interface PlayerProgressMetrics {
  winsPve: number;
  winsPvp: number;
  level: number;
  gold: number;
  uniqueCards: number;
  fusionsDiscovered: number;
  totalMatches: number;
}

export interface LevelProgressView {
  level: number;
  xp: number;
  lifetimeXp: number;
  xpInLevel: number;
  xpToNextLevel: number;
  totalToCurrentLevel: number;
  totalToNextLevel: number;
}

export const BASE_DECK_SLOT_LIMIT = 12;
export const MAX_LEVEL = 80;

const BASE_LEVEL_XP = 110;
const LINEAR_LEVEL_XP = 28;
const POWER_LEVEL_XP = 7.5;

export const DAILY_MISSION_SLOT_COUNT = 3;

export const DAILY_MISSION_CATALOG: DailyMissionDefinition[] = [
  {
    key: "PVE_WIN_2",
    title: "Treino de Campanha",
    description: "Venca 2 duelos PVE.",
    category: "PVE",
    eventKey: "PVE_WIN",
    target: 2,
    rewardGold: 75,
    rewardXp: 110
  },
  {
    key: "PVE_WIN_4",
    title: "Limpeza de Arena",
    description: "Venca 4 duelos PVE.",
    category: "PVE",
    eventKey: "PVE_WIN",
    target: 4,
    rewardGold: 150,
    rewardXp: 220
  },
  {
    key: "PVP_PLAY_2",
    title: "Sangue Frio",
    description: "Jogue 2 duelos PVP.",
    category: "PVP",
    eventKey: "PVP_PLAY",
    target: 2,
    rewardGold: 120,
    rewardXp: 180
  },
  {
    key: "PVP_WIN_1",
    title: "Duelista de Elite",
    description: "Venca 1 duelo PVP.",
    category: "PVP",
    eventKey: "PVP_WIN",
    target: 1,
    rewardGold: 160,
    rewardXp: 210
  },
  {
    key: "SHOP_BUY_3",
    title: "Mercador Arcano",
    description: "Compre 3 cartas na loja.",
    category: "SHOP",
    eventKey: "SHOP_BUY",
    target: 3,
    rewardGold: 90,
    rewardXp: 135
  },
  {
    key: "FUSION_DISCOVER_2",
    title: "Alquimista Arcano",
    description: "Descubra 2 novas fusoes.",
    category: "FUSION",
    eventKey: "FUSION_DISCOVERY",
    target: 2,
    rewardGold: 130,
    rewardXp: 190
  },
  {
    key: "DUEL_PLAY_5",
    title: "Ritmo de Duelo",
    description: "Jogue 5 duelos no total.",
    category: "GENERAL",
    eventKey: "DUEL_PLAY",
    target: 5,
    rewardGold: 120,
    rewardXp: 170
  }
];

export const ACHIEVEMENT_CATALOG: AchievementDefinition[] = [
  {
    key: "PVE_FIRST_WIN",
    title: "Primeira Vitoria",
    description: "Vença seu primeiro duelo PVE.",
    requirement: { type: "WINS_PVE", target: 1 },
    rewardGold: 120,
    rewardXp: 160,
    score: 20
  },
  {
    key: "PVE_VETERAN_15",
    title: "Veterano da Campanha",
    description: "Acumule 15 vitórias PVE.",
    requirement: { type: "WINS_PVE", target: 15 },
    rewardGold: 280,
    rewardXp: 420,
    rewardDeckSlots: 1,
    score: 50
  },
  {
    key: "PVE_MASTER_45",
    title: "Mestre Arcano",
    description: "Acumule 45 vitórias PVE.",
    requirement: { type: "WINS_PVE", target: 45 },
    rewardGold: 480,
    rewardXp: 780,
    rewardDeckSlots: 1,
    rewardTitle: "Mestre Arcano",
    score: 95
  },
  {
    key: "PVP_FIRST_WIN",
    title: "Lamina Veloz",
    description: "Vença seu primeiro duelo PVP.",
    requirement: { type: "WINS_PVP", target: 1 },
    rewardGold: 180,
    rewardXp: 220,
    score: 30
  },
  {
    key: "PVP_STREAKER_10",
    title: "Executor do Coliseu",
    description: "Acumule 10 vitórias PVP.",
    requirement: { type: "WINS_PVP", target: 10 },
    rewardGold: 420,
    rewardXp: 520,
    rewardTitle: "Executor do Coliseu",
    score: 80
  },
  {
    key: "COLLECTION_120",
    title: "Arquivista das Cartas",
    description: "Possua 120 cartas unicas.",
    requirement: { type: "COLLECTION_UNIQUE", target: 120 },
    rewardGold: 360,
    rewardXp: 500,
    rewardDeckSlots: 1,
    score: 70
  },
  {
    key: "FUSION_20",
    title: "Inventor de Fusoes",
    description: "Descubra 20 fusões.",
    requirement: { type: "FUSIONS_DISCOVERED", target: 20 },
    rewardGold: 320,
    rewardXp: 480,
    score: 65
  },
  {
    key: "LEVEL_15",
    title: "Duelista Experiente",
    description: "Alcance o nível 15.",
    requirement: { type: "PLAYER_LEVEL", target: 15 },
    rewardGold: 260,
    rewardXp: 360,
    score: 55
  },
  {
    key: "MATCHES_100",
    title: "Lenda da Arena",
    description: "Complete 100 duelos.",
    requirement: { type: "MATCHES_TOTAL", target: 100 },
    rewardGold: 700,
    rewardXp: 950,
    rewardTitle: "Lenda da Arena",
    score: 125
  }
];

export function xpRequiredForNextLevel(level: number): number {
  const safeLevel = Math.max(1, Math.floor(level));
  const n = safeLevel - 1;
  return Math.max(90, Math.floor(BASE_LEVEL_XP + n * LINEAR_LEVEL_XP + Math.pow(n, 1.35) * POWER_LEVEL_XP));
}

export function xpToReachLevel(level: number): number {
  const safeLevel = Math.max(1, Math.min(MAX_LEVEL, Math.floor(level)));
  let total = 0;
  for (let index = 1; index < safeLevel; index += 1) {
    total += xpRequiredForNextLevel(index);
  }
  return total;
}

export function levelFromXp(xp: number): number {
  const safeXp = Math.max(0, Math.floor(xp));
  let level = 1;
  let spent = 0;
  while (level < MAX_LEVEL) {
    const step = xpRequiredForNextLevel(level);
    if (safeXp < spent + step) break;
    spent += step;
    level += 1;
  }
  return level;
}

export function buildLevelProgress(xp: number, lifetimeXp: number): LevelProgressView {
  const safeXp = Math.max(0, Math.floor(xp));
  const level = levelFromXp(safeXp);
  const totalToCurrentLevel = xpToReachLevel(level);
  const totalToNextLevel = level >= MAX_LEVEL ? totalToCurrentLevel : xpToReachLevel(level + 1);
  const xpInLevel = safeXp - totalToCurrentLevel;
  const xpToNextLevel = level >= MAX_LEVEL ? 0 : Math.max(0, totalToNextLevel - safeXp);

  return {
    level,
    xp: safeXp,
    lifetimeXp: Math.max(safeXp, Math.floor(lifetimeXp)),
    xpInLevel,
    xpToNextLevel,
    totalToCurrentLevel,
    totalToNextLevel
  };
}

export function xpRewardForPveWin(tier: number): number {
  const safeTier = Math.max(0, Math.floor(tier));
  return 120 + safeTier * 26;
}

export function xpRewardForPveLoss(tier: number): number {
  const safeTier = Math.max(0, Math.floor(tier));
  return 35 + safeTier * 9;
}

export function xpRewardForPvpWin(): number {
  return 210;
}

export function xpRewardForPvpLoss(): number {
  return 90;
}

function hashString(value: string): number {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

export function buildDailyMissionSet(playerId: string, missionDate: string): DailyMissionDefinition[] {
  const pool = [...DAILY_MISSION_CATALOG];
  const selected: DailyMissionDefinition[] = [];
  let salt = hashString(`${playerId}:${missionDate}`);

  while (selected.length < Math.min(DAILY_MISSION_SLOT_COUNT, pool.length)) {
    salt = Math.imul(salt ^ 0x9e3779b9, 2654435761) >>> 0;
    const index = salt % pool.length;
    const [picked] = pool.splice(index, 1);
    if (!picked) continue;
    selected.push(picked);
  }

  return selected;
}

export function resolveAchievementProgress(requirement: AchievementRequirement, metrics: PlayerProgressMetrics): number {
  switch (requirement.type) {
    case "WINS_PVE":
      return metrics.winsPve;
    case "WINS_PVP":
      return metrics.winsPvp;
    case "FUSIONS_DISCOVERED":
      return metrics.fusionsDiscovered;
    case "COLLECTION_UNIQUE":
      return metrics.uniqueCards;
    case "PLAYER_LEVEL":
      return metrics.level;
    case "TOTAL_GOLD":
      return metrics.gold;
    case "MATCHES_TOTAL":
      return metrics.totalMatches;
    default:
      return 0;
  }
}

