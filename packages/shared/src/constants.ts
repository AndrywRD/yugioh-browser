export const BOARD_SIZE = 5;
export const INITIAL_LP = 8000;
export const INITIAL_HAND_SIZE = 5;
export const DECK_SIZE = 40;
export const MAX_COPIES_PER_CARD = 3;
export const MIN_MONSTERS_IN_DECK = 20;
export const FATIGUE_DAMAGE = 500;

export const PHASES = ["DRAW", "MAIN", "BATTLE", "END"] as const;
export const GAME_STATUS = ["LOBBY", "RUNNING", "FINISHED"] as const;
export const POSITIONS = ["ATTACK", "DEFENSE"] as const;
export const CARD_KINDS = ["MONSTER", "SPELL", "TRAP"] as const;
export const CARD_FACES = ["FACE_UP", "FACE_DOWN"] as const;
export const FIELD_ZONES = ["MONSTER", "SPELL_TRAP"] as const;
export const ACTION_TYPES = [
  "SUMMON",
  "FUSE",
  "CHANGE_POSITION",
  "ATTACK",
  "ATTACK_DECLARE",
  "TRAP_RESPONSE",
  "FLIP_SUMMON",
  "END_TURN",
  "SUMMON_MONSTER",
  "SET_MONSTER",
  "SET_SPELL_TRAP",
  "ACTIVATE_SPELL_FROM_HAND",
  "ACTIVATE_SET_CARD"
] as const;

export const TAGS = [
  "DRAGON",
  "BEAST",
  "WARRIOR",
  "SPELLCASTER",
  "UNDEAD",
  "GOLEM",
  "AQUATIC",
  "AVIAN",
  "INSECT",
  "DEMON",
  "ANGEL",
  "PLANT",
  "REPTILE",
  "FIRE",
  "WATER",
  "EARTH",
  "WIND",
  "LIGHT",
  "DARK",
  "ARCANE",
  "METAL",
  "SLIME",
  "CURSED",
  "HOLY",
  "SHADOW",
  "STORM",
  "CRYSTAL",
  "ANCIENT",
  "WILD",
  "MECHANIC"
] as const;
