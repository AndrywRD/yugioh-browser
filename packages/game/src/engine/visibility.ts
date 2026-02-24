import type {
  ClientPendingPrompt,
  GameState,
  GameStateForClient,
  MonsterClientView,
  MonsterOnBoard,
  PlayerClientView,
  SpellTrapClientView,
  SpellTrapOnBoard
} from "@ruptura-arcana/shared";
import { CARD_TEMPLATES } from "../data/cardTemplates";
import { buildCardClientView, getOpponent, getPlayer } from "./state";

const FACE_DOWN_BACK_IMAGE = "/images/cartas/Back-FMR-EN-VG.png";
const HIDDEN_CARD_NAME = "Carta Virada";

function toMonsterClientView(templateId: string, stateMonster: MonsterOnBoard, canReveal: boolean): MonsterClientView {
  const template = CARD_TEMPLATES[templateId];
  if (!template || template.kind !== "MONSTER") {
    throw new Error("Monster template not found");
  }

  const hidden = stateMonster.face === "FACE_DOWN" && !canReveal;
  return {
    instanceId: stateMonster.instanceId,
    templateId: hidden ? "hidden_monster" : stateMonster.templateId,
    ownerId: stateMonster.ownerId,
    zone: "MONSTER",
    slot: stateMonster.slot,
    name: hidden ? HIDDEN_CARD_NAME : template.name,
    kind: "MONSTER",
    atk: hidden ? 0 : (template.atk ?? 0) + (stateMonster.atkModifier ?? 0),
    def: hidden ? 0 : (template.def ?? 0) + (stateMonster.defModifier ?? 0),
    tags: hidden ? [] : template.tags,
    effectDescription: hidden ? undefined : template.effectDescription,
    imagePath: hidden ? FACE_DOWN_BACK_IMAGE : template.imagePath,
    password: hidden ? undefined : template.password,
    cost: hidden ? undefined : template.cost,
    catalogNumber: hidden ? undefined : template.catalogNumber,
    face: stateMonster.face,
    position: stateMonster.position,
    atkModifier: stateMonster.atkModifier ?? 0,
    defModifier: stateMonster.defModifier ?? 0,
    hasAttackedThisTurn: stateMonster.hasAttackedThisTurn,
    positionChangedThisTurn: stateMonster.positionChangedThisTurn,
    lockedPositionUntilTurn: stateMonster.lockedPositionUntilTurn,
    cannotAttackThisTurn: stateMonster.cannotAttackThisTurn
  };
}

function toSpellTrapClientView(templateId: string, stateCard: SpellTrapOnBoard, canReveal: boolean): SpellTrapClientView {
  const template = CARD_TEMPLATES[templateId];
  if (!template || template.kind === "MONSTER") {
    throw new Error("Spell/Trap template not found");
  }

  const hidden = stateCard.face === "FACE_DOWN" && !canReveal;
  const kind: "SPELL" | "TRAP" = template.kind === "TRAP" ? "TRAP" : "SPELL";
  return {
    instanceId: stateCard.instanceId,
    templateId: hidden ? "hidden_spell_trap" : stateCard.templateId,
    ownerId: stateCard.ownerId,
    zone: "SPELL_TRAP",
    slot: stateCard.slot,
    kind,
    face: stateCard.face,
    setThisTurn: stateCard.setThisTurn,
    continuous: hidden ? undefined : stateCard.continuous,
    equipTargetInstanceId: hidden ? undefined : stateCard.equipTargetInstanceId,
    equipAtkBoost: hidden ? undefined : stateCard.equipAtkBoost,
    equipDefBoost: hidden ? undefined : stateCard.equipDefBoost,
    name: hidden ? HIDDEN_CARD_NAME : template.name,
    atk: hidden ? 0 : template.atk ?? 0,
    def: hidden ? 0 : template.def ?? 0,
    tags: hidden ? [] : template.tags,
    effectKey: hidden ? undefined : template.effectKey,
    effectDescription: hidden ? undefined : template.effectDescription,
    imagePath: hidden ? FACE_DOWN_BACK_IMAGE : template.imagePath,
    password: hidden ? undefined : template.password,
    cost: hidden ? undefined : template.cost,
    catalogNumber: hidden ? undefined : template.catalogNumber
  };
}

function toPlayerClientView(state: GameState, playerId: string, viewerPlayerId: string, includeHand: boolean): PlayerClientView {
  const player = getPlayer(state, playerId);
  const isOwnerView = playerId === viewerPlayerId;

  return {
    id: player.id,
    username: player.username,
    lp: player.lp,
    deckCount: player.deck.length,
    handCount: player.hand.length,
    hand: includeHand ? player.hand.map((instanceId) => buildCardClientView(instanceId, state)) : undefined,
    graveyard: player.graveyard.map((instanceId) => buildCardClientView(instanceId, state)),
    monsterZone: player.monsterZone.map((monster) => {
      if (!monster) return null;
      return toMonsterClientView(monster.templateId, monster, isOwnerView);
    }),
    spellTrapZone: player.spellTrapZone.map((card) => {
      if (!card) return null;
      return toSpellTrapClientView(card.templateId, card, isOwnerView);
    }),
    usedSummonOrFuseThisTurn: player.usedSummonOrFuseThisTurn
  };
}

function buildPendingPromptForViewer(state: GameState, viewerPlayerId: string): ClientPendingPrompt | null {
  const pending = state.pendingAttack;
  if (!pending || !pending.window) return null;
  if (pending.defenderPlayerId !== viewerPlayerId) return null;

  const defender = getPlayer(state, viewerPlayerId);
  const availableTrapSlots = defender.spellTrapZone.flatMap((card, slot) => {
    if (!card) return [];
    if (card.kind !== "TRAP") return [];
    if (card.face !== "FACE_DOWN") return [];
    if (card.setThisTurn) return [];
    return [slot];
  });

  return {
    type: "TRAP_RESPONSE_REQUIRED",
    attackerSlot: pending.attackerSlot,
    target: pending.target,
    availableTrapSlots
  };
}

export function buildSnapshotForPlayer(state: GameState, viewerPlayerId: string): GameStateForClient {
  const you = toPlayerClientView(state, viewerPlayerId, viewerPlayerId, true);
  const opponent = toPlayerClientView(state, getOpponent(state, viewerPlayerId).id, viewerPlayerId, false);

  return {
    version: state.version,
    status: state.status,
    turn: { ...state.turn },
    you,
    opponent,
    pendingPrompt: buildPendingPromptForViewer(state, viewerPlayerId),
    winnerId: state.winnerId
  };
}
