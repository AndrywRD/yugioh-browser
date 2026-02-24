import type { FusionRecipe } from "@ruptura-arcana/shared";

export const FUSION_RECIPES: FusionRecipe[] = [
  {
    id: "fuse_dragon_fire",
    requiresAll: ["DRAGON", "FIRE"],
    priority: 100,
    resultMonsterTemplateId: "fm_082_red_eyes_b_dragon"
  },
  {
    id: "fuse_undead_arcane",
    requiresAll: ["UNDEAD", "ARCANE"],
    priority: 90,
    resultMonsterTemplateId: "fm_099_pumpking_the_king_of_ghosts"
  },
  {
    id: "fuse_beast_wind",
    requiresAll: ["BEAST", "WIND"],
    requiresAny: ["STORM", "ARCANE"],
    priority: 95,
    resultMonsterTemplateId: "fm_467_crimson_sunbird"
  },
  {
    id: "fuse_dragon_holy",
    requiresAll: ["DRAGON", "LIGHT", "HOLY"],
    priority: 120,
    resultMonsterTemplateId: "fm_380_blue_eyes_ultimate_dragon"
  },
  {
    id: "fuse_golem_dark_metal",
    requiresAll: ["GOLEM", "DARK", "CURSED"],
    requiresCount: [{ tag: "METAL", count: 1 }],
    priority: 110,
    resultMonsterTemplateId: "fm_392_metalzoa"
  },
  {
    id: "fuse_aquatic_power",
    requiresAll: ["AQUATIC", "WATER"],
    minAtkSum: 2500,
    priority: 85,
    resultMonsterTemplateId: "fm_442_aqua_dragon"
  }
];
