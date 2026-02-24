import type { CardKind } from "@ruptura-arcana/shared";

const TRAP_CARD_NAMES = new Set<string>([
  "Spellbinding Circle",
  "Shadow Spell",
  "House of Adhesive Tape",
  "Eatgaboon",
  "Bear Trap",
  "Invisible Wire",
  "Acid Trap Hole",
  "Widespread Ruin",
  "Goblin Fan",
  "Bad Reaction to Simochi",
  "Reverse Trap",
  "Fake Trap"
]);

const DAMAGE_EFFECT_BY_NAME = new Map<string, string>([
  ["Sparks", "DAMAGE_200"],
  ["Hinotama", "DAMAGE_500"],
  ["Final Flame", "DAMAGE_700"],
  ["Ookazi", "DAMAGE_800"],
  ["Tremendose Fire", "DAMAGE_1000"]
]);

const HEAL_EFFECT_BY_NAME = new Map<string, string>([
  ["Mooyan Curry", "HEAL_200"],
  ["Red Medicine", "HEAL_500"],
  ["Goblin's Secret Remedy", "HEAL_1000"],
  ["Soul of the Pure", "HEAL_2000"],
  ["Dian Keto the Cure Master", "HEAL_5000"]
]);

const FIELD_EFFECT_BY_NAME = new Map<string, string>([
  ["Forest", "SET_FIELD_FOREST"],
  ["Wasteland", "SET_FIELD_WASTELAND"],
  ["Mountain", "SET_FIELD_MOUNTAIN"],
  ["Sogen", "SET_FIELD_SOGEN"],
  ["Umi", "SET_FIELD_UMI"],
  ["Yami", "SET_FIELD_YAMI"]
]);

const EQUIP_CARD_NAMES = new Set<string>([
  "Legendary Sword",
  "Sword of Dark Destruction",
  "Dark Energy",
  "Axe of Dispair",
  "Laser Cannon Armor",
  "Insect Armor With A Laser Cannon",
  "Elf's Light",
  "Beast Fangs",
  "Steel Shell",
  "Vile Germs",
  "Black Pendant",
  "Silver Bow and Arrow",
  "Horn of Light",
  "Horn of the Unicorn",
  "Dragon Treasure",
  "Electro-Whip",
  "Cyber Shield",
  "Mystical Moon",
  "Malevolent Nuzzeler",
  "Violet Crystal",
  "Book of Secret Arts",
  "Invigoration",
  "Machine Conversion Factory",
  "Raise Body Heat",
  "Follow Wind",
  "Power of Kaishin",
  "Kunai with Chain",
  "Salamandra",
  "Megamorph",
  "Metalmorph",
  "Winged Trumpeter",
  "Bright Castle"
]);

const EQUIP_BUFF_OVERRIDES: Record<string, number> = {
  "Machine Conversion Factory": 500,
  Salamandra: 500,
  Megamorph: 500,
  Metalmorph: 500,
  "Bright Castle": 500,
  "Horn of the Unicorn": 420,
  "Black Pendant": 420,
  "Malevolent Nuzzeler": 420
};

const RITUAL_CARD_NAMES = new Set<string>([
  "Curse of the Millennium Shield",
  "Yamadron Ritual",
  "Gate Guardian Ritual",
  "Black Luster Ritual",
  "Zera Ritual",
  "War-Lion Ritual",
  "Beastry Mirror Ritual",
  "Ultimate Dragon",
  "Commencement Dance",
  "Hamburger Recipe",
  "Revival of Sengenjin",
  "Novox's Prayer",
  "Curse of Tri-Horned Dragon",
  "Revival of Serpent Night Dragon",
  "Turtle Oath",
  "Contruct of Mask",
  "Resurrection of Chakra",
  "Puppet Ritual",
  "Javelin Beetle Pact",
  "Garma Sword Oath",
  "Cosmo Queen's Prayer",
  "Revival of Skeleton Rider",
  "Fortress Whale's Oath",
  "Dark Magic Ritual"
]);

const NAME_TO_EFFECT_KEY = new Map<string, string>([
  ["Dark Hole", "DESTROY_ALL_MONSTERS"],
  ["Raigeki", "DESTROY_OPP_MONSTERS"],
  ["Harpie's Feather Duster", "DESTROY_OPP_SPELL_TRAPS"],
  ["Stop Defense", "FORCE_OPP_ATTACK_POSITION"],
  ["Swords of Revealing Light", "LOCK_OPP_ATTACKS_3_TURNS"],
  ["Dark Piercing Light", "REVEAL_OPP_FACE_DOWN_MONSTERS"],
  ["Dragon Capture Jar", "LOCK_ALL_DRAGONS"],
  ["Warrior Elimination", "DESTROY_ALL_WARRIOR_MONSTERS"],
  ["Crush Card", "CRUSH_CARD_EFFECT"],
  ["Eradicading Aerosol", "DESTROY_ALL_INSECT_MONSTERS"],
  ["Breath of Light", "DESTROY_OPP_FACE_DOWN_MONSTERS"],
  ["Eternal Drought", "DESTROY_ALL_AQUA_MONSTERS"],
  ["Stain Storm", "DESTROY_ALL_MACHINE_MONSTERS"],
  ["Cursebraker", "REMOVE_ALL_MONSTER_MODIFIERS"],
  ["Widespread Ruin", "DESTROY_ATTACKER"],
  ["Acid Trap Hole", "DESTROY_ATTACKER_UNDER_3000"],
  ["House of Adhesive Tape", "DESTROY_ATTACKER_UNDER_500"],
  ["Eatgaboon", "DESTROY_ATTACKER"],
  ["Bear Trap", "DESTROY_ATTACKER"],
  ["Invisible Wire", "DESTROY_ATTACKER"],
  ["Spellbinding Circle", "LOCK_ATTACKER"],
  ["Shadow Spell", "LOCK_ATTACKER"]
]);

for (const [name, effectKey] of DAMAGE_EFFECT_BY_NAME) {
  NAME_TO_EFFECT_KEY.set(name, effectKey);
}

for (const [name, effectKey] of HEAL_EFFECT_BY_NAME) {
  NAME_TO_EFFECT_KEY.set(name, effectKey);
}

for (const [name, effectKey] of FIELD_EFFECT_BY_NAME) {
  NAME_TO_EFFECT_KEY.set(name, effectKey);
}

for (const name of EQUIP_CARD_NAMES) {
  if (!NAME_TO_EFFECT_KEY.has(name)) {
    NAME_TO_EFFECT_KEY.set(name, "EQUIP_CONTINUOUS");
  }
}

for (const name of RITUAL_CARD_NAMES) {
  if (!NAME_TO_EFFECT_KEY.has(name)) {
    NAME_TO_EFFECT_KEY.set(name, "RITUAL_SUMMON_PLACEHOLDER");
  }
}

const EFFECT_DESCRIPTION_BY_KEY: Record<string, string> = {
  DAMAGE_200: "Causa 200 de dano ao LP do oponente.",
  DAMAGE_500: "Causa 500 de dano ao LP do oponente.",
  DAMAGE_700: "Causa 700 de dano ao LP do oponente.",
  DAMAGE_800: "Causa 800 de dano ao LP do oponente.",
  DAMAGE_1000: "Causa 1000 de dano ao LP do oponente.",
  HEAL_200: "Recupera 200 LP.",
  HEAL_500: "Recupera 500 LP.",
  HEAL_1000: "Recupera 1000 LP.",
  HEAL_2000: "Recupera 2000 LP.",
  HEAL_5000: "Recupera 5000 LP.",
  DESTROY_ALL_MONSTERS: "Destroi todos os monstros no campo.",
  DESTROY_OPP_MONSTERS: "Destroi todos os monstros do oponente.",
  DESTROY_OPP_SPELL_TRAPS: "Destroi todas as Spell/Trap do oponente.",
  FORCE_OPP_ATTACK_POSITION: "Muda os monstros do oponente para posicao de ataque.",
  LOCK_OPP_ATTACKS_3_TURNS: "Impede ataques do oponente por 3 turnos.",
  REVEAL_OPP_FACE_DOWN_MONSTERS: "Revela os monstros virados para baixo do oponente.",
  LOCK_ALL_DRAGONS: "Monstros Dragon nao podem atacar neste turno.",
  DESTROY_ALL_WARRIOR_MONSTERS: "Destroi todos os monstros Warrior no campo.",
  DESTROY_ALL_INSECT_MONSTERS: "Destroi todos os monstros Insect no campo.",
  DESTROY_OPP_FACE_DOWN_MONSTERS: "Destroi os monstros virados para baixo do oponente.",
  DESTROY_ALL_AQUA_MONSTERS: "Destroi monstros aquaticos no campo.",
  DESTROY_ALL_MACHINE_MONSTERS: "Destroi monstros Machine no campo.",
  REMOVE_ALL_MONSTER_MODIFIERS: "Remove todos os bonus e penalidades de ATK/DEF.",
  EQUIP_CONTINUOUS: "Equipamento continuo: aumenta ATK/DEF enquanto permanecer no campo.",
  EQUIP_BUFF_500: "Equipe: concede +500 ATK/+500 DEF ao seu monstro mais forte.",
  DESTROY_ATTACKER: "Armadilha: destroi o monstro atacante.",
  DESTROY_ATTACKER_UNDER_3000: "Armadilha: destroi o atacante se ATK for menor que 3000.",
  DESTROY_ATTACKER_UNDER_500: "Armadilha: destroi o atacante se ATK for 500 ou menos.",
  LOCK_ATTACKER: "Armadilha: bloqueia o atacante por 1 turno.",
  CRUSH_CARD_EFFECT: "Destroi monstros do oponente com ATK igual ou superior a 1500."
};

export const USABLE_EFFECT_KEYS = new Set<string>(Object.keys(EFFECT_DESCRIPTION_BY_KEY));

export function resolveCardKindByName(name: string, hasStats: boolean): CardKind {
  if (hasStats) return "MONSTER";
  return TRAP_CARD_NAMES.has(name) ? "TRAP" : "SPELL";
}

export function resolveEffectKeyByName(name: string, hasStats: boolean): string | undefined {
  if (hasStats) return undefined;
  return NAME_TO_EFFECT_KEY.get(name) ?? "NO_EFFECT";
}

export function resolveEffectDescriptionByKey(effectKey?: string): string | undefined {
  if (!effectKey) return undefined;
  return EFFECT_DESCRIPTION_BY_KEY[effectKey];
}

export function isUsableEffectKey(effectKey?: string): boolean {
  if (!effectKey) return false;
  return USABLE_EFFECT_KEYS.has(effectKey);
}

export function isTrapCardName(name: string): boolean {
  return TRAP_CARD_NAMES.has(name);
}

export function isEquipCardName(name: string): boolean {
  return EQUIP_CARD_NAMES.has(name);
}

export function isContinuousEquipEffectKey(effectKey?: string): boolean {
  return effectKey === "EQUIP_CONTINUOUS" || effectKey === "EQUIP_BUFF_500";
}

export function resolveEquipBuffValue(name: string, cost?: number): number {
  const override = EQUIP_BUFF_OVERRIDES[name];
  if (typeof override === "number") return override;

  const normalizedCost = Number.isFinite(cost) ? Math.max(0, Number(cost)) : 0;
  if (normalizedCost >= 999999) return 500;
  if (normalizedCost >= 20000) return 500;
  if (normalizedCost >= 5000) return 450;
  if (normalizedCost >= 1000) return 400;
  if (normalizedCost >= 800) return 350;
  if (normalizedCost >= 260) return 300;
  if (normalizedCost >= 120) return 250;
  return 200;
}

export function resolveEquipEffectDescription(name: string, cost?: number): string {
  const amount = resolveEquipBuffValue(name, cost);
  return `Equipamento continuo: concede +${amount} ATK/+${amount} DEF ao monstro escolhido enquanto esta carta permanecer ativa no campo.`;
}
