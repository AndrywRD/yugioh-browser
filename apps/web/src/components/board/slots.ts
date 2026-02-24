export type BoardSlotSide = "PLAYER" | "ENEMY";
export type BoardSlotZone = "MONSTER" | "SPELL_TRAP";

export type SlotDef = {
  index: number;
  left: number;
  top: number;
  w: number;
  h: number;
};

export const PLAYER_MONSTER_SLOTS: SlotDef[] = [
  { index: 0, left: 23.2, top: 53.6, w: 10.1, h: 17.8 },
  { index: 1, left: 34.1, top: 53.6, w: 10.1, h: 17.8 },
  { index: 2, left: 45.0, top: 53.6, w: 10.1, h: 17.8 },
  { index: 3, left: 55.9, top: 53.6, w: 10.1, h: 17.8 },
  { index: 4, left: 66.8, top: 53.6, w: 10.1, h: 17.8 }
];

export const PLAYER_SPELL_TRAP_SLOTS: SlotDef[] = [
  { index: 0, left: 24.3, top: 72.6, w: 8.8, h: 13.6 },
  { index: 1, left: 35.0, top: 72.6, w: 8.8, h: 13.6 },
  { index: 2, left: 45.7, top: 72.6, w: 8.8, h: 13.6 },
  { index: 3, left: 56.4, top: 72.6, w: 8.8, h: 13.6 },
  { index: 4, left: 67.1, top: 72.6, w: 8.8, h: 13.6 }
];

export const ENEMY_MONSTER_SLOTS: SlotDef[] = [
  { index: 0, left: 24.0, top: 22.0, w: 9.2, h: 15.6 },
  { index: 1, left: 34.7, top: 22.0, w: 9.2, h: 15.6 },
  { index: 2, left: 45.4, top: 22.0, w: 9.2, h: 15.6 },
  { index: 3, left: 56.1, top: 22.0, w: 9.2, h: 15.6 },
  { index: 4, left: 66.8, top: 22.0, w: 9.2, h: 15.6 }
];

export const ENEMY_SPELL_TRAP_SLOTS: SlotDef[] = [
  { index: 0, left: 24.7, top: 8.2, w: 8.2, h: 11.8 },
  { index: 1, left: 35.2, top: 8.2, w: 8.2, h: 11.8 },
  { index: 2, left: 45.7, top: 8.2, w: 8.2, h: 11.8 },
  { index: 3, left: 56.2, top: 8.2, w: 8.2, h: 11.8 },
  { index: 4, left: 66.7, top: 8.2, w: 8.2, h: 11.8 }
];

export const PLAYER_SLOTS = PLAYER_MONSTER_SLOTS;
export const ENEMY_SLOTS = ENEMY_MONSTER_SLOTS;
