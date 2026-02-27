import type { EngineResult, GameAction, GameEvent, GameState, MonsterOnBoard, SpellTrapOnBoard } from "@ruptura-arcana/shared";
import { CARD_TEMPLATES } from "../data/cardTemplates";
import { isContinuousEquipEffectKey, resolveEquipBuffValue } from "../data/spellTrapCatalog";
import { declareAttack, resolveAttack, resolveTrapResponse } from "./combat";
import { buildFusionDiscoveryResolvedFromTemplateIds } from "./fusionDiscovery";
import { buildMaterialSummary, resolveFusionFromOrderedMaterials } from "./fusion";
import { cloneState, drawCard, getOpponent, getPlayer, setWinnerIfAny } from "./state";
import { validateAction } from "./validate";

function createFusionInstanceId(state: GameState, playerId: string): string {
  const count = Object.keys(state.instances).length + 1;
  return `${playerId}-f-${count}-${state.version}`;
}

function resetPlayerTurnFlags(player: ReturnType<typeof getPlayer>, turnNumber: number): void {
  player.usedSummonOrFuseThisTurn = false;
  for (const monster of player.monsterZone) {
    if (!monster) continue;
    monster.hasAttackedThisTurn = false;
    monster.positionChangedThisTurn = false;
    if (monster.cannotAttackThisTurn) {
      monster.cannotAttackThisTurn = false;
    }
    if (monster.lockedPositionUntilTurn && turnNumber >= monster.lockedPositionUntilTurn) {
      delete monster.lockedPositionUntilTurn;
    }
  }
  for (const card of player.spellTrapZone) {
    if (!card) continue;
    card.setThisTurn = false;
  }
}

function advanceTurn(state: GameState): GameEvent[] {
  const events: GameEvent[] = [];
  const nextPlayer = getOpponent(state, state.turn.playerId);
  state.pendingAttack = null;

  state.turn.playerId = nextPlayer.id;
  state.turn.turnNumber += 1;
  state.turn.phase = "MAIN";

  resetPlayerTurnFlags(nextPlayer, state.turn.turnNumber);
  events.push(...drawCard(state, nextPlayer.id));
  events.push({
    type: "TURN_CHANGED",
    playerId: nextPlayer.id,
    payload: {
      playerId: nextPlayer.id,
      turnNumber: state.turn.turnNumber
    }
  });
  setWinnerIfAny(state, events);
  return events;
}

function removeMaterialFromZones(state: GameState, player: ReturnType<typeof getPlayer>, instanceId: string): void {
  const handIndex = player.hand.findIndex((id) => id === instanceId);
  if (handIndex >= 0) {
    player.hand.splice(handIndex, 1);
    player.graveyard.push(instanceId);
    return;
  }

  const boardIndex = player.monsterZone.findIndex((monster) => monster?.instanceId === instanceId);
  if (boardIndex >= 0) {
    moveMonsterToGrave(state, player, boardIndex);
  }
}

function createBoardMonster(
  instanceId: string,
  templateId: string,
  ownerId: string,
  slot: number,
  position: "ATTACK" | "DEFENSE",
  face: "FACE_UP" | "FACE_DOWN"
): MonsterOnBoard {
  return {
    instanceId,
    templateId,
    ownerId,
    zone: "MONSTER",
    slot,
    face,
    position,
    atkModifier: 0,
    defModifier: 0,
    hasAttackedThisTurn: false,
    positionChangedThisTurn: false
  };
}

function createSpellTrapCard(instanceId: string, templateId: string, ownerId: string, slot: number, kind: "SPELL" | "TRAP"): SpellTrapOnBoard {
  return {
    instanceId,
    templateId,
    ownerId,
    zone: "SPELL_TRAP",
    slot,
    kind,
    face: "FACE_DOWN",
    setThisTurn: true,
    continuous: false
  };
}

function removeCardFromHand(player: ReturnType<typeof getPlayer>, instanceId: string): void {
  const handIndex = player.hand.findIndex((id) => id === instanceId);
  if (handIndex === -1) throw new Error("Card is not in hand");
  player.hand.splice(handIndex, 1);
}

function findFirstEmptySpellTrapSlot(player: ReturnType<typeof getPlayer>): number | null {
  for (let slot = 0; slot < player.spellTrapZone.length; slot += 1) {
    if (!player.spellTrapZone[slot]) return slot;
  }
  return null;
}

function isContinuousEquipTemplate(templateId: string): boolean {
  const template = CARD_TEMPLATES[templateId];
  if (!template || template.kind !== "SPELL") return false;
  return isContinuousEquipEffectKey(template.effectKey);
}

function removeEquipBuffFromTarget(player: ReturnType<typeof getPlayer>, card: SpellTrapOnBoard): void {
  if (!card.continuous || !card.equipTargetInstanceId) return;
  const target = player.monsterZone.find((monster) => monster?.instanceId === card.equipTargetInstanceId);
  if (!target) return;
  target.atkModifier -= card.equipAtkBoost ?? 0;
  target.defModifier -= card.equipDefBoost ?? 0;
}

function moveSpellTrapToGrave(_state: GameState, player: ReturnType<typeof getPlayer>, slot: number): string | null {
  const card = player.spellTrapZone[slot];
  if (!card) return null;
  removeEquipBuffFromTarget(player, card);
  player.spellTrapZone[slot] = null;
  player.graveyard.push(card.instanceId);
  return card.instanceId;
}

function destroyEquipsAttachedToMonster(_state: GameState, player: ReturnType<typeof getPlayer>, monsterInstanceId: string): void {
  for (let slot = 0; slot < player.spellTrapZone.length; slot += 1) {
    const card = player.spellTrapZone[slot];
    if (!card || !card.continuous) continue;
    if (card.equipTargetInstanceId !== monsterInstanceId) continue;
    moveSpellTrapToGrave(_state, player, slot);
  }
}

function moveMonsterToGrave(state: GameState, player: ReturnType<typeof getPlayer>, slot: number): string | null {
  const monster = player.monsterZone[slot];
  if (!monster) return null;
  player.monsterZone[slot] = null;
  player.graveyard.push(monster.instanceId);
  destroyEquipsAttachedToMonster(state, player, monster.instanceId);
  return monster.instanceId;
}

function getMonsterBattleStats(monster: MonsterOnBoard): { atk: number; def: number } {
  const template = CARD_TEMPLATES[monster.templateId];
  if (!template || template.kind !== "MONSTER") {
    return { atk: 0, def: 0 };
  }
  return {
    atk: (template.atk ?? 0) + (monster.atkModifier ?? 0),
    def: (template.def ?? 0) + (monster.defModifier ?? 0)
  };
}

function getHighestAtkMonsterSlot(player: ReturnType<typeof getPlayer>, predicate?: (monster: MonsterOnBoard) => boolean): number | null {
  let bestSlot: number | null = null;
  let bestAtk = Number.NEGATIVE_INFINITY;

  for (let slot = 0; slot < player.monsterZone.length; slot += 1) {
    const monster = player.monsterZone[slot];
    if (!monster) continue;
    if (predicate && !predicate(monster)) continue;
    const { atk } = getMonsterBattleStats(monster);
    if (atk > bestAtk) {
      bestAtk = atk;
      bestSlot = slot;
    }
  }
  return bestSlot;
}

function destroyMonstersByFilter(
  state: GameState,
  events: GameEvent[],
  sourcePlayerId: string,
  targetPlayers: Array<ReturnType<typeof getPlayer>>,
  predicate: (monster: MonsterOnBoard) => boolean,
  reason: string
): void {
  for (const targetPlayer of targetPlayers) {
    for (let slot = 0; slot < targetPlayer.monsterZone.length; slot += 1) {
      const monster = targetPlayer.monsterZone[slot];
      if (!monster || !predicate(monster)) continue;
      const destroyed = moveMonsterToGrave(state, targetPlayer, slot);
      if (!destroyed) continue;
      events.push({
        type: "BATTLE_RESOLVED",
        playerId: sourcePlayerId,
        payload: {
          mode: "EFFECT_DESTROY",
          reason,
          targetPlayerId: targetPlayer.id,
          slot,
          instanceId: destroyed
        }
      });
    }
  }
}

function applyEquipBuff(player: ReturnType<typeof getPlayer>, amount: number): void {
  const targetSlot = getHighestAtkMonsterSlot(player, (monster) => monster.face === "FACE_UP");
  if (targetSlot == null) return;
  const target = player.monsterZone[targetSlot];
  if (!target) return;
  target.atkModifier += amount;
  target.defModifier += amount;
}

function pushLpChangedEvent(events: GameEvent[], playerId: string, reason: string, delta: number, lp: number): void {
  events.push({
    type: "LP_CHANGED",
    playerId,
    payload: {
      reason,
      delta,
      lp
    }
  });
}

function applySpellTrapEffect(
  state: GameState,
  activatorId: string,
  templateId: string,
  events: GameEvent[],
  source: "HAND" | "SET"
): void {
  const template = CARD_TEMPLATES[templateId];
  if (!template) return;
  const player = getPlayer(state, activatorId);
  const opponent = getOpponent(state, activatorId);
  const effectKey = template.effectKey ?? "NO_EFFECT";

  const heal = (amount: number) => {
    player.lp += amount;
    pushLpChangedEvent(events, player.id, effectKey, amount, player.lp);
  };
  const damage = (amount: number) => {
    opponent.lp -= amount;
    pushLpChangedEvent(events, opponent.id, effectKey, -amount, opponent.lp);
  };

  const destroyOpponentSpellTraps = () => {
    for (let i = 0; i < opponent.spellTrapZone.length; i += 1) {
      const destroyed = moveSpellTrapToGrave(state, opponent, i);
      if (!destroyed) continue;
      events.push({
        type: "TRAP_ACTIVATED",
        playerId: activatorId,
        payload: {
          effectKey,
          targetPlayerId: opponent.id,
          slot: i,
          destroyedInstanceId: destroyed
        }
      });
    }
  };

  if (effectKey === "HEAL_200") heal(200);
  else if (effectKey === "HEAL_500") heal(500);
  else if (effectKey === "HEAL_1000") heal(1000);
  else if (effectKey === "HEAL_2000") heal(2000);
  else if (effectKey === "HEAL_5000") heal(5000);
  else if (effectKey === "DAMAGE_200") damage(200);
  else if (effectKey === "DAMAGE_500") damage(500);
  else if (effectKey === "DAMAGE_700") damage(700);
  else if (effectKey === "DAMAGE_800") damage(800);
  else if (effectKey === "DAMAGE_1000") damage(1000);
  else if (effectKey === "DESTROY_OPP_MONSTERS" || effectKey === "DESTROY_ALL_MONSTERS") {
    const targets = effectKey === "DESTROY_ALL_MONSTERS" ? [player, opponent] : [opponent];
    for (const targetPlayer of targets) {
      for (let i = 0; i < targetPlayer.monsterZone.length; i += 1) {
        const destroyed = moveMonsterToGrave(state, targetPlayer, i);
        if (destroyed) {
          events.push({
            type: "BATTLE_RESOLVED",
            playerId: activatorId,
            payload: { mode: "EFFECT_DESTROY", targetPlayerId: targetPlayer.id, slot: i, instanceId: destroyed, effectKey }
          });
        }
      }
    }
  } else if (effectKey === "DESTROY_OPP_SPELL_TRAPS") {
    destroyOpponentSpellTraps();
  } else if (effectKey === "EQUIP_BUFF_500") {
    const amount = resolveEquipBuffValue(template.name, template.cost);
    applyEquipBuff(player, amount);
  } else if (effectKey === "FORCE_OPP_ATTACK_POSITION") {
    for (const monster of opponent.monsterZone) {
      if (!monster) continue;
      if (monster.face === "FACE_DOWN") {
        monster.face = "FACE_UP";
      }
      monster.position = "ATTACK";
    }
  } else if (effectKey === "LOCK_OPP_ATTACKS_3_TURNS") {
    const lockUntil = state.turn.turnNumber + 3;
    opponent.cannotAttackUntilTurn = Math.max(opponent.cannotAttackUntilTurn ?? 0, lockUntil);
  } else if (effectKey === "REVEAL_OPP_FACE_DOWN_MONSTERS") {
    for (const monster of opponent.monsterZone) {
      if (!monster) continue;
      if (monster.face === "FACE_DOWN") monster.face = "FACE_UP";
    }
  } else if (effectKey === "DESTROY_OPP_FACE_DOWN_MONSTERS") {
    destroyMonstersByFilter(state, events, activatorId, [opponent], (monster) => monster.face === "FACE_DOWN", effectKey);
  } else if (effectKey === "DESTROY_ALL_WARRIOR_MONSTERS") {
    destroyMonstersByFilter(
      state,
      events,
      activatorId,
      [player, opponent],
      (monster) => CARD_TEMPLATES[monster.templateId]?.tags?.includes("WARRIOR") ?? false,
      effectKey
    );
  } else if (effectKey === "DESTROY_ALL_INSECT_MONSTERS") {
    destroyMonstersByFilter(
      state,
      events,
      activatorId,
      [player, opponent],
      (monster) => CARD_TEMPLATES[monster.templateId]?.tags?.includes("INSECT") ?? false,
      effectKey
    );
  } else if (effectKey === "DESTROY_ALL_MACHINE_MONSTERS") {
    destroyMonstersByFilter(
      state,
      events,
      activatorId,
      [player, opponent],
      (monster) => CARD_TEMPLATES[monster.templateId]?.tags?.includes("MECHANIC") ?? false,
      effectKey
    );
  } else if (effectKey === "DESTROY_ALL_AQUA_MONSTERS") {
    destroyMonstersByFilter(
      state,
      events,
      activatorId,
      [player, opponent],
      (monster) =>
        (CARD_TEMPLATES[monster.templateId]?.tags?.includes("AQUATIC") ?? false) ||
        (CARD_TEMPLATES[monster.templateId]?.tags?.includes("WATER") ?? false),
      effectKey
    );
  } else if (effectKey === "CRUSH_CARD_EFFECT") {
    destroyMonstersByFilter(state, events, activatorId, [opponent], (monster) => getMonsterBattleStats(monster).atk >= 1500, effectKey);
  } else if (effectKey === "REMOVE_ALL_MONSTER_MODIFIERS") {
    for (const boardPlayer of [player, opponent]) {
      for (const monster of boardPlayer.monsterZone) {
        if (!monster) continue;
        monster.atkModifier = 0;
        monster.defModifier = 0;
      }
    }
  } else if (effectKey === "LOCK_ALL_DRAGONS") {
    for (const boardPlayer of [player, opponent]) {
      for (const monster of boardPlayer.monsterZone) {
        if (!monster) continue;
        const template = CARD_TEMPLATES[monster.templateId];
        if (!template?.tags.includes("DRAGON")) continue;
        monster.cannotAttackThisTurn = true;
      }
    }
  } else if (effectKey === "DESTROY_ATTACKER") {
    const targetSlot = getHighestAtkMonsterSlot(opponent);
    if (targetSlot != null) {
      const destroyed = moveMonsterToGrave(state, opponent, targetSlot);
      if (destroyed) {
        events.push({
          type: "BATTLE_RESOLVED",
          playerId: activatorId,
          payload: {
            mode: "EFFECT_DESTROY",
            reason: effectKey,
            targetPlayerId: opponent.id,
            slot: targetSlot,
            instanceId: destroyed
          }
        });
      }
    }
  } else if (effectKey === "DESTROY_ATTACKER_UNDER_3000") {
    const targetSlot = getHighestAtkMonsterSlot(opponent, (monster) => getMonsterBattleStats(monster).atk < 3000);
    if (targetSlot != null) {
      const destroyed = moveMonsterToGrave(state, opponent, targetSlot);
      if (destroyed) {
        events.push({
          type: "BATTLE_RESOLVED",
          playerId: activatorId,
          payload: {
            mode: "EFFECT_DESTROY",
            reason: effectKey,
            targetPlayerId: opponent.id,
            slot: targetSlot,
            instanceId: destroyed
          }
        });
      }
    }
  } else if (effectKey === "DESTROY_ATTACKER_UNDER_500") {
    const targetSlot = getHighestAtkMonsterSlot(opponent, (monster) => getMonsterBattleStats(monster).atk <= 500);
    if (targetSlot != null) {
      const destroyed = moveMonsterToGrave(state, opponent, targetSlot);
      if (destroyed) {
        events.push({
          type: "BATTLE_RESOLVED",
          playerId: activatorId,
          payload: {
            mode: "EFFECT_DESTROY",
            reason: effectKey,
            targetPlayerId: opponent.id,
            slot: targetSlot,
            instanceId: destroyed
          }
        });
      }
    }
  } else if (effectKey === "LOCK_ATTACKER") {
    const targetSlot = getHighestAtkMonsterSlot(opponent);
    if (targetSlot != null) {
      const target = opponent.monsterZone[targetSlot];
      if (target) {
        target.cannotAttackThisTurn = true;
        target.lockedPositionUntilTurn = state.turn.turnNumber + 1;
      }
    }
  }

  events.push({
    type: template.kind === "TRAP" ? "TRAP_ACTIVATED" : "SPELL_ACTIVATED",
    playerId: activatorId,
    payload: {
      templateId,
      effectKey,
      source
    }
  });
}

function applySummonMonster(
  state: GameState,
  action: Extract<GameAction, { type: "SUMMON" | "SUMMON_MONSTER" }>,
  playerId: string
): GameEvent[] {
  const events: GameEvent[] = [];
  const player = getPlayer(state, playerId);
  const { handInstanceId, slot } = action.payload;
  const instance = state.instances[handInstanceId];
  if (!instance) throw new Error("Instance not found");

  removeCardFromHand(player, handInstanceId);
  const monster = createBoardMonster(handInstanceId, instance.templateId, playerId, slot, "ATTACK", "FACE_UP");
  player.monsterZone[slot] = monster;
  player.usedSummonOrFuseThisTurn = true;

  events.push({
    type: "MONSTER_SUMMONED",
    playerId,
    payload: {
      instanceId: handInstanceId,
      slot,
      position: "ATTACK"
    }
  });
  return events;
}

function applySetMonster(state: GameState, action: Extract<GameAction, { type: "SET_MONSTER" }>, playerId: string): GameEvent[] {
  const events: GameEvent[] = [];
  const player = getPlayer(state, playerId);
  const { handInstanceId, slot } = action.payload;
  const instance = state.instances[handInstanceId];
  if (!instance) throw new Error("Instance not found");

  removeCardFromHand(player, handInstanceId);
  const monster = createBoardMonster(handInstanceId, instance.templateId, playerId, slot, "DEFENSE", "FACE_DOWN");
  monster.positionChangedThisTurn = true;
  player.monsterZone[slot] = monster;
  player.usedSummonOrFuseThisTurn = true;

  events.push({
    type: "MONSTER_SET",
    playerId,
    payload: {
      instanceId: handInstanceId,
      slot,
      position: "DEFENSE",
      face: "FACE_DOWN"
    }
  });
  return events;
}

function applySetSpellTrap(state: GameState, action: Extract<GameAction, { type: "SET_SPELL_TRAP" }>, playerId: string): GameEvent[] {
  const events: GameEvent[] = [];
  const player = getPlayer(state, playerId);
  const { handInstanceId, slot } = action.payload;
  const instance = state.instances[handInstanceId];
  if (!instance) throw new Error("Instance not found");
  const template = CARD_TEMPLATES[instance.templateId];
  if (!template || template.kind === "MONSTER") throw new Error("Card is not SPELL/TRAP");

  removeCardFromHand(player, handInstanceId);
  player.spellTrapZone[slot] = createSpellTrapCard(handInstanceId, instance.templateId, playerId, slot, template.kind);

  events.push({
    type: "SPELL_TRAP_SET",
    playerId,
    payload: {
      instanceId: handInstanceId,
      slot,
      kind: template.kind
    }
  });
  return events;
}

function resolveEquipTargetMonster(
  player: ReturnType<typeof getPlayer>,
  targetMonsterSlot: number | undefined
): { slot: number; monster: MonsterOnBoard } {
  if (typeof targetMonsterSlot === "number") {
    const chosen = player.monsterZone[targetMonsterSlot];
    if (chosen && chosen.face === "FACE_UP") {
      return { slot: targetMonsterSlot, monster: chosen };
    }
  }

  const fallbackSlot = getHighestAtkMonsterSlot(player, (monster) => monster.face === "FACE_UP");
  if (fallbackSlot == null) {
    throw new Error("No valid monster target for equip");
  }
  const fallbackMonster = player.monsterZone[fallbackSlot];
  if (!fallbackMonster) throw new Error("No valid monster target for equip");
  return { slot: fallbackSlot, monster: fallbackMonster };
}

function activateContinuousEquipFromHand(
  state: GameState,
  playerId: string,
  handInstanceId: string,
  templateId: string,
  targetMonsterSlot: number | undefined,
  preferredSpellTrapSlot: number | undefined,
  events: GameEvent[]
): void {
  const player = getPlayer(state, playerId);
  const template = CARD_TEMPLATES[templateId];
  if (!template || template.kind !== "SPELL") throw new Error("Invalid equip template");

  const { slot: resolvedTargetSlot, monster: targetMonster } = resolveEquipTargetMonster(player, targetMonsterSlot);
  const freeSlot = typeof preferredSpellTrapSlot === "number" ? preferredSpellTrapSlot : findFirstEmptySpellTrapSlot(player);
  if (freeSlot == null || player.spellTrapZone[freeSlot]) {
    throw new Error("No free spell/trap slot for equip");
  }

  const amount = resolveEquipBuffValue(template.name, template.cost);
  const boardCard: SpellTrapOnBoard = {
    instanceId: handInstanceId,
    templateId,
    ownerId: playerId,
    zone: "SPELL_TRAP",
    slot: freeSlot,
    kind: "SPELL",
    face: "FACE_UP",
    setThisTurn: false,
    continuous: true,
    equipTargetInstanceId: targetMonster.instanceId,
    equipAtkBoost: amount,
    equipDefBoost: amount
  };

  removeCardFromHand(player, handInstanceId);
  player.spellTrapZone[freeSlot] = boardCard;
  targetMonster.atkModifier += amount;
  targetMonster.defModifier += amount;

  events.push({
    type: "SPELL_ACTIVATED",
    playerId,
    payload: {
      templateId,
      effectKey: template.effectKey ?? "EQUIP_CONTINUOUS",
      source: "HAND",
      slot: freeSlot,
      targetMonsterSlot: resolvedTargetSlot,
      continuous: true,
      atkBoost: amount,
      defBoost: amount
    }
  });
}

function activateContinuousEquipFromSet(
  state: GameState,
  playerId: string,
  slot: number,
  targetMonsterSlot: number | undefined,
  events: GameEvent[]
): void {
  const player = getPlayer(state, playerId);
  const setCard = player.spellTrapZone[slot];
  if (!setCard) throw new Error("No set card in slot");
  const template = CARD_TEMPLATES[setCard.templateId];
  if (!template || template.kind !== "SPELL") throw new Error("Invalid equip template");

  const { slot: resolvedTargetSlot, monster: targetMonster } = resolveEquipTargetMonster(player, targetMonsterSlot);
  const amount = resolveEquipBuffValue(template.name, template.cost);

  setCard.face = "FACE_UP";
  setCard.setThisTurn = false;
  setCard.continuous = true;
  setCard.equipTargetInstanceId = targetMonster.instanceId;
  setCard.equipAtkBoost = amount;
  setCard.equipDefBoost = amount;

  targetMonster.atkModifier += amount;
  targetMonster.defModifier += amount;

  events.push({
    type: "SPELL_ACTIVATED",
    playerId,
    payload: {
      templateId: setCard.templateId,
      effectKey: template.effectKey ?? "EQUIP_CONTINUOUS",
      source: "SET",
      slot,
      targetMonsterSlot: resolvedTargetSlot,
      continuous: true,
      atkBoost: amount,
      defBoost: amount
    }
  });
}

function applyActivateSpellFromHand(
  state: GameState,
  action: Extract<GameAction, { type: "ACTIVATE_SPELL_FROM_HAND" }>,
  playerId: string
): GameEvent[] {
  const events: GameEvent[] = [];
  const player = getPlayer(state, playerId);
  const { handInstanceId, targetMonsterSlot, targetSpellTrapSlot } = action.payload;
  const instance = state.instances[handInstanceId];
  if (!instance) throw new Error("Instance not found");
  const template = CARD_TEMPLATES[instance.templateId];
  if (!template || template.kind !== "SPELL") throw new Error("Only SPELL can be activated from hand");

  if (isContinuousEquipTemplate(instance.templateId)) {
    activateContinuousEquipFromHand(state, playerId, handInstanceId, instance.templateId, targetMonsterSlot, targetSpellTrapSlot, events);
    return events;
  }

  removeCardFromHand(player, handInstanceId);
  player.graveyard.push(handInstanceId);
  applySpellTrapEffect(state, playerId, instance.templateId, events, "HAND");
  return events;
}

function applyActivateSetCard(state: GameState, action: Extract<GameAction, { type: "ACTIVATE_SET_CARD" }>, playerId: string): GameEvent[] {
  const events: GameEvent[] = [];
  const player = getPlayer(state, playerId);
  const { slot, targetMonsterSlot } = action.payload;
  const setCard = player.spellTrapZone[slot];
  if (!setCard) throw new Error("No set card in slot");
  const template = CARD_TEMPLATES[setCard.templateId];
  if (!template || template.kind === "MONSTER") throw new Error("Invalid set card");

  if (isContinuousEquipTemplate(setCard.templateId)) {
    activateContinuousEquipFromSet(state, playerId, slot, targetMonsterSlot, events);
    return events;
  }

  moveSpellTrapToGrave(state, player, slot);
  applySpellTrapEffect(state, playerId, setCard.templateId, events, "SET");
  return events;
}

function applyFusion(state: GameState, action: Extract<GameAction, { type: "FUSE" }>, playerId: string): GameEvent[] {
  const events: GameEvent[] = [];
  const player = getPlayer(state, playerId);
  const { materials, order, resultSlot } = action.payload;

  const orderedSummaries = order.map((instanceId) => {
    const cardInstance = state.instances[instanceId];
    if (!cardInstance) throw new Error("Fusion material does not exist");
    return buildMaterialSummary(instanceId, cardInstance.templateId);
  });

  const fusion = resolveFusionFromOrderedMaterials(orderedSummaries, state.seed + state.turn.turnNumber);
  const materialTemplateIds = order
    .map((instanceId) => state.instances[instanceId]?.templateId)
    .filter((templateId): templateId is string => Boolean(templateId));
  const discovery = buildFusionDiscoveryResolvedFromTemplateIds(materialTemplateIds, fusion.resultTemplateId);

  for (const material of materials) {
    removeMaterialFromZones(state, player, material.instanceId);
  }

  const resultTemplate = CARD_TEMPLATES[fusion.resultTemplateId];
  if (!resultTemplate || resultTemplate.kind !== "MONSTER") {
    throw new Error("Fusion result template missing or invalid");
  }

  const resultInstanceId = createFusionInstanceId(state, playerId);
  state.instances[resultInstanceId] = {
    instanceId: resultInstanceId,
    ownerId: playerId,
    templateId: resultTemplate.id
  };

  const boardMonster = createBoardMonster(resultInstanceId, resultTemplate.id, playerId, resultSlot, "ATTACK", "FACE_UP");
  if (fusion.fallbackType === "FALLBACK_LOCKED") {
    boardMonster.position = "DEFENSE";
    boardMonster.cannotAttackThisTurn = true;
    boardMonster.lockedPositionUntilTurn = state.turn.turnNumber + 1;
  }
  player.monsterZone[resultSlot] = boardMonster;
  player.usedSummonOrFuseThisTurn = true;

  if (fusion.failed) {
    events.push({
      type: "FUSION_FAILED",
      playerId,
      payload: {
        materials: materials.map((material) => material.instanceId),
        materialTemplateIds,
        materialsCount: materialTemplateIds.length,
        materialTags: discovery?.materialTags ?? [],
        fallbackTemplateId: fusion.resultTemplateId,
        fallbackName: resultTemplate.name,
        resultSlot,
        chain: fusion.chain
      }
    });
  } else {
    events.push({
      type: "FUSION_RESOLVED",
      playerId,
      payload: {
        materials: materials.map((material) => material.instanceId),
        materialTemplateIds,
        materialsCount: discovery?.materialsCount ?? materialTemplateIds.length,
        materialTags: discovery?.materialTags ?? [],
        discoveryKey: discovery?.key,
        resultTemplateId: fusion.resultTemplateId,
        resultName: resultTemplate.name,
        resultSlot,
        chain: fusion.chain
      }
    });
  }

  return events;
}

function applyChangePosition(
  state: GameState,
  action: Extract<GameAction, { type: "CHANGE_POSITION" }>,
  playerId: string
): GameEvent[] {
  const player = getPlayer(state, playerId);
  const monster = player.monsterZone[action.payload.slot];
  if (!monster) throw new Error("No monster in slot");
  monster.position = action.payload.position;
  monster.positionChangedThisTurn = true;
  return [
    {
      type: "POSITION_CHANGED",
      playerId,
      payload: {
        slot: action.payload.slot,
        position: action.payload.position
      }
    }
  ];
}

function applyFlipSummon(state: GameState, action: Extract<GameAction, { type: "FLIP_SUMMON" }>, playerId: string): GameEvent[] {
  const player = getPlayer(state, playerId);
  const monster = player.monsterZone[action.payload.slot];
  if (!monster) {
    throw new Error("No monster in slot");
  }

  monster.face = "FACE_UP";
  monster.position = "ATTACK";
  monster.positionChangedThisTurn = true;

  return [
    {
      type: "MONSTER_FLIP_SUMMONED",
      playerId,
      payload: {
        slot: action.payload.slot,
        instanceId: monster.instanceId,
        templateId: monster.templateId
      }
    }
  ];
}

export function applyAction(state: GameState, action: GameAction, playerId: string): EngineResult {
  const nextState = cloneState(state);
  const validation = validateAction(nextState, action, playerId);
  if (!validation.ok) {
    throw new Error(validation.error ?? "Invalid action");
  }

  let events: GameEvent[] = [];

  if (action.type === "SUMMON" || action.type === "SUMMON_MONSTER") {
    events = applySummonMonster(nextState, action, playerId);
  } else if (action.type === "SET_MONSTER") {
    events = applySetMonster(nextState, action, playerId);
  } else if (action.type === "SET_SPELL_TRAP") {
    events = applySetSpellTrap(nextState, action, playerId);
  } else if (action.type === "ACTIVATE_SPELL_FROM_HAND") {
    events = applyActivateSpellFromHand(nextState, action, playerId);
  } else if (action.type === "ACTIVATE_SET_CARD") {
    events = applyActivateSetCard(nextState, action, playerId);
  } else if (action.type === "FUSE") {
    events = applyFusion(nextState, action, playerId);
  } else if (action.type === "CHANGE_POSITION") {
    events = applyChangePosition(nextState, action, playerId);
  } else if (action.type === "FLIP_SUMMON") {
    events = applyFlipSummon(nextState, action, playerId);
  } else if (action.type === "ATTACK" || action.type === "ATTACK_DECLARE") {
    if (nextState.turn.phase === "MAIN") {
      nextState.turn.phase = "BATTLE";
    }
    if (action.type === "ATTACK") {
      events = resolveAttack(nextState, playerId, action.payload);
    } else {
      events = declareAttack(nextState, playerId, action.payload);
      const pending = nextState.pendingAttack;
      if (pending && !pending.defenderMayRespond) {
        events.push(...resolveTrapResponse(nextState, pending.defenderPlayerId, { decision: "PASS" }));
      }
    }
  } else if (action.type === "TRAP_RESPONSE") {
    events = resolveTrapResponse(nextState, playerId, action.payload);
  } else if (action.type === "END_TURN") {
    nextState.turn.phase = "END";
    events = advanceTurn(nextState);
  }

  setWinnerIfAny(nextState, events);
  nextState.version += 1;
  return {
    nextState,
    events
  };
}

export function validateAndApplyAction(state: GameState, action: GameAction, playerId: string): EngineResult {
  const validation = validateAction(state, action, playerId);
  if (!validation.ok) {
    throw new Error(validation.error ?? "Invalid action");
  }
  return applyAction(state, action, playerId);
}
