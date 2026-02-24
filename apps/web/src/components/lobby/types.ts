import type { Deck } from "@ruptura-arcana/shared";
import type { PlayerProfile, PveNpc } from "../../lib/api";

export type LobbySection = "CAMPAIGN" | "ONLINE" | "COLLECTION" | "PROFILE";

export interface LobbyProfileSummary {
  player: PlayerProfile;
  activeDeck: Deck | null;
  activeDeckTotal: number;
  collectionCount: number;
  fusionCount: number;
}

export function getUnlockRequirementLabel(npc: PveNpc): string {
  if (npc.unlockRequirement.type === "NONE") return "Disponivel";
  if (npc.unlockRequirement.type === "WINS_PVE") return `Venca ${npc.unlockRequirement.wins} duelos PVE`;
  return `Derrote ${npc.unlockRequirement.npcId}`;
}
