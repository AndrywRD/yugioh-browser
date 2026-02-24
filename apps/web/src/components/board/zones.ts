export type ZoneId = "DECK_YOU" | "GRAVE_YOU" | "DECK_OPP" | "GRAVE_OPP";

export type ZoneDef = {
  id: ZoneId;
  left: number;
  top: number;
  w: number;
  h: number;
};

export const BOARD_ZONES: ZoneDef[] = [
  { id: "DECK_OPP", left: 7.2, top: 13.5, w: 8.2, h: 12.6 },
  { id: "GRAVE_OPP", left: 84.6, top: 13.5, w: 8.2, h: 12.6 },
  { id: "DECK_YOU", left: 7.2, top: 73.2, w: 8.2, h: 13.2 },
  { id: "GRAVE_YOU", left: 84.6, top: 73.2, w: 8.2, h: 13.2 }
];

