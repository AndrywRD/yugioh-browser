import type {
  AttackDeclarePayload,
  AttackPayload,
  GameEvent,
  GameState,
  MonsterOnBoard,
  TrapResponsePayload
} from "@ruptura-arcana/shared";
import { CARD_TEMPLATES } from "../data/cardTemplates";
import { getOpponent, getPlayer } from "./state";

function removeEquipBuffFromTarget(player: ReturnType<typeof getPlayer>, slot: number): string | null {
  const spellTrap = player.spellTrapZone[slot];
  if (!spellTrap) return null;

  const targetId = spellTrap.equipTargetInstanceId;
  if (targetId && spellTrap.continuous) {
    const target = player.monsterZone.find((monster) => monster?.instanceId === targetId);
    if (target) {
      target.atkModifier -= spellTrap.equipAtkBoost ?? 0;
      target.defModifier -= spellTrap.equipDefBoost ?? 0;
    }
  }

  player.spellTrapZone[slot] = null;
  player.graveyard.push(spellTrap.instanceId);
  return spellTrap.instanceId;
}

function destroyAttachedEquips(player: ReturnType<typeof getPlayer>, monsterInstanceId: string): void {
  for (let slot = 0; slot < player.spellTrapZone.length; slot += 1) {
    const spellTrap = player.spellTrapZone[slot];
    if (!spellTrap) continue;
    if (!spellTrap.continuous) continue;
    if (spellTrap.equipTargetInstanceId !== monsterInstanceId) continue;
    removeEquipBuffFromTarget(player, slot);
  }
}

function moveMonsterToGraveyard(player: ReturnType<typeof getPlayer>, slot: number): MonsterOnBoard {
  const monster = player.monsterZone[slot];
  if (!monster) {
    throw new Error("Monster not found in slot");
  }
  player.monsterZone[slot] = null;
  player.graveyard.push(monster.instanceId);
  destroyAttachedEquips(player, monster.instanceId);
  return monster;
}

function applyLpDamage(player: ReturnType<typeof getPlayer>, amount: number, events: GameEvent[], reason: string): void {
  if (amount <= 0) return;
  player.lp -= amount;
  events.push({
    type: "LP_CHANGED",
    playerId: player.id,
    payload: {
      reason,
      delta: -amount,
      lp: player.lp
    }
  });
}

function getBattleStats(monster: MonsterOnBoard): { atk: number; def: number } {
  const template = CARD_TEMPLATES[monster.templateId];
  if (!template || template.kind !== "MONSTER") return { atk: 0, def: 0 };
  return {
    atk: (template.atk ?? 0) + (monster.atkModifier ?? 0),
    def: (template.def ?? 0) + (monster.defModifier ?? 0)
  };
}

function resolvePendingBattle(state: GameState, events: GameEvent[]): void {
  const pending = state.pendingAttack;
  if (!pending) return;

  const attackerPlayer = getPlayer(state, pending.attackerPlayerId);
  const defenderPlayer = getPlayer(state, pending.defenderPlayerId);
  const attacker = attackerPlayer.monsterZone[pending.attackerSlot];
  if (!attacker) {
    state.pendingAttack = null;
    events.push({
      type: "ATTACK_NEGATED",
      playerId: pending.attackerPlayerId,
      payload: {
        reason: "ATTACKER_NOT_FOUND",
        attackerSlot: pending.attackerSlot
      }
    });
    return;
  }

  const attackerStats = getBattleStats(attacker);
  const attackerAtk = attackerStats.atk;

  if (pending.target === "DIRECT") {
    attacker.hasAttackedThisTurn = true;
    applyLpDamage(defenderPlayer, attackerAtk, events, "DIRECT_ATTACK");
    events.push({
      type: "BATTLE_RESOLVED",
      playerId: pending.attackerPlayerId,
      payload: {
        mode: "DIRECT",
        damage: attackerAtk
      }
    });
    state.pendingAttack = null;
    return;
  }

  const defenderSlot = pending.target.slot;
  const defender = defenderPlayer.monsterZone[defenderSlot];
  if (!defender) {
    attacker.hasAttackedThisTurn = true;
    state.pendingAttack = null;
    events.push({
      type: "ATTACK_NEGATED",
      playerId: pending.attackerPlayerId,
      payload: {
        reason: "TARGET_MISSING",
        attackerSlot: pending.attackerSlot,
        defenderSlot
      }
    });
    return;
  }

  const defenderTemplate = CARD_TEMPLATES[defender.templateId];
  if (!defenderTemplate || defenderTemplate.kind !== "MONSTER") {
    throw new Error("Defender template not found");
  }

  const defenderStats = getBattleStats(defender);
  const defenderFaceBefore = defender.face;
  const defenderWasFaceDown = defender.face === "FACE_DOWN";
  if (defenderWasFaceDown) {
    defender.face = "FACE_UP";
    events.push({
      type: "MONSTER_REVEALED",
      playerId: defenderPlayer.id,
      payload: {
        ownerPlayerId: defenderPlayer.id,
        slot: defenderSlot,
        instanceId: defender.instanceId,
        templateId: defender.templateId,
        name: defenderTemplate.name
      }
    });
  }

  const destroyed: Array<{ playerId: string; slot: number; instanceId: string }> = [];

  if (defender.position === "ATTACK") {
    if (attackerAtk > defenderStats.atk) {
      moveMonsterToGraveyard(defenderPlayer, defenderSlot);
      destroyed.push({ playerId: defenderPlayer.id, slot: defenderSlot, instanceId: defender.instanceId });
      applyLpDamage(defenderPlayer, attackerAtk - defenderStats.atk, events, "BATTLE_ATTACK");
    } else if (attackerAtk < defenderStats.atk) {
      moveMonsterToGraveyard(attackerPlayer, pending.attackerSlot);
      destroyed.push({ playerId: attackerPlayer.id, slot: pending.attackerSlot, instanceId: attacker.instanceId });
      applyLpDamage(attackerPlayer, defenderStats.atk - attackerAtk, events, "BATTLE_ATTACK");
    } else {
      moveMonsterToGraveyard(defenderPlayer, defenderSlot);
      moveMonsterToGraveyard(attackerPlayer, pending.attackerSlot);
      destroyed.push({ playerId: defenderPlayer.id, slot: defenderSlot, instanceId: defender.instanceId });
      destroyed.push({ playerId: attackerPlayer.id, slot: pending.attackerSlot, instanceId: attacker.instanceId });
    }
  } else {
    if (attackerAtk > defenderStats.def) {
      moveMonsterToGraveyard(defenderPlayer, defenderSlot);
      destroyed.push({ playerId: defenderPlayer.id, slot: defenderSlot, instanceId: defender.instanceId });
    } else if (attackerAtk < defenderStats.def) {
      applyLpDamage(attackerPlayer, defenderStats.def - attackerAtk, events, "BATTLE_DEFENSE");
    }
  }

  const attackerAfterBattle = attackerPlayer.monsterZone[pending.attackerSlot];
  if (attackerAfterBattle) {
    attackerAfterBattle.hasAttackedThisTurn = true;
  }

  events.push({
    type: "BATTLE_RESOLVED",
    playerId: pending.attackerPlayerId,
    payload: {
      attackerSlot: pending.attackerSlot,
      defenderSlot,
      defenderFaceBefore,
      defenderPosition: defender.position,
      attackerAtk,
      defenderAtk: defenderStats.atk,
      defenderDef: defenderStats.def,
      destroyed
    }
  });

  state.pendingAttack = null;
}

function resolveTrapResponseEffect(state: GameState, trapSlot: number, events: GameEvent[]): { cancelAttack: boolean } {
  const pending = state.pendingAttack;
  if (!pending) return { cancelAttack: false };

  const defender = getPlayer(state, pending.defenderPlayerId);
  const attackerPlayer = getPlayer(state, pending.attackerPlayerId);
  const trap = defender.spellTrapZone[trapSlot];
  if (!trap) throw new Error("Trap not found in slot");

  removeEquipBuffFromTarget(defender, trapSlot);

  const trapTemplate = CARD_TEMPLATES[trap.templateId];
  const effectKey = trapTemplate?.effectKey ?? "NO_EFFECT";
  let cancelAttack = false;

  const attackerMonster = attackerPlayer.monsterZone[pending.attackerSlot];
  const attackerStats = attackerMonster ? getBattleStats(attackerMonster) : { atk: 0, def: 0 };

  if (attackerMonster && effectKey === "DESTROY_ATTACKER") {
    moveMonsterToGraveyard(attackerPlayer, pending.attackerSlot);
    events.push({
      type: "BATTLE_RESOLVED",
      playerId: defender.id,
      payload: {
        mode: "EFFECT_DESTROY",
        reason: effectKey,
        targetPlayerId: attackerPlayer.id,
        slot: pending.attackerSlot,
        instanceId: attackerMonster.instanceId
      }
    });
    cancelAttack = true;
  } else if (attackerMonster && effectKey === "DESTROY_ATTACKER_UNDER_3000" && attackerStats.atk < 3000) {
    moveMonsterToGraveyard(attackerPlayer, pending.attackerSlot);
    events.push({
      type: "BATTLE_RESOLVED",
      playerId: defender.id,
      payload: {
        mode: "EFFECT_DESTROY",
        reason: effectKey,
        targetPlayerId: attackerPlayer.id,
        slot: pending.attackerSlot,
        instanceId: attackerMonster.instanceId
      }
    });
    cancelAttack = true;
  } else if (attackerMonster && effectKey === "DESTROY_ATTACKER_UNDER_500" && attackerStats.atk <= 500) {
    moveMonsterToGraveyard(attackerPlayer, pending.attackerSlot);
    events.push({
      type: "BATTLE_RESOLVED",
      playerId: defender.id,
      payload: {
        mode: "EFFECT_DESTROY",
        reason: effectKey,
        targetPlayerId: attackerPlayer.id,
        slot: pending.attackerSlot,
        instanceId: attackerMonster.instanceId
      }
    });
    cancelAttack = true;
  } else if (attackerMonster && effectKey === "LOCK_ATTACKER") {
    attackerMonster.cannotAttackThisTurn = true;
    attackerMonster.lockedPositionUntilTurn = Math.max(attackerMonster.lockedPositionUntilTurn ?? 0, state.turn.turnNumber + 1);
    cancelAttack = true;
  } else if (effectKey === "NEGATE_ATTACK") {
    cancelAttack = true;
  }

  events.push({
    type: "TRAP_ACTIVATED",
    playerId: defender.id,
    payload: {
      templateId: trap.templateId,
      effectKey,
      source: "SET",
      slot: trapSlot
    }
  });

  return { cancelAttack };
}

export function declareAttack(state: GameState, playerId: string, payload: AttackDeclarePayload): GameEvent[] {
  const events: GameEvent[] = [];
  const target = payload.target ?? "DIRECT";
  const defender = getOpponent(state, playerId);
  const availableTrapSlots = defender.spellTrapZone.flatMap((card, slot) => {
    if (!card) return [];
    if (card.kind !== "TRAP") return [];
    if (card.face !== "FACE_DOWN") return [];
    if (card.setThisTurn) return [];
    return [slot];
  });
  const defenderMayRespond = availableTrapSlots.length > 0;

  state.pendingAttack = {
    attackerPlayerId: playerId,
    defenderPlayerId: defender.id,
    attackerSlot: payload.attackerSlot,
    target,
    defenderMayRespond,
    window: "TRAP_RESPONSE"
  };

  events.push({
    type: "ATTACK_DECLARED",
    playerId,
    payload: {
      attackerSlot: payload.attackerSlot,
      target
    }
  });

  if (defenderMayRespond) {
    events.push({
      type: "ATTACK_WAITING_RESPONSE",
      playerId: defender.id,
      payload: {
        window: "TRAP_RESPONSE",
        attackerSlot: payload.attackerSlot,
        target
      }
    });
  }

  return events;
}

export function resolveTrapResponse(state: GameState, playerId: string, payload: TrapResponsePayload): GameEvent[] {
  const events: GameEvent[] = [];
  const pending = state.pendingAttack;
  if (!pending || pending.window !== "TRAP_RESPONSE") {
    throw new Error("No trap response window available");
  }
  if (pending.defenderPlayerId !== playerId) {
    throw new Error("Only defender can respond");
  }

  let cancelAttack = false;
  if (payload.decision === "ACTIVATE") {
    const trapSlot = payload.trapSlot;
    if (typeof trapSlot !== "number") {
      throw new Error("Trap slot is required");
    }
    const response = resolveTrapResponseEffect(state, trapSlot, events);
    cancelAttack = response.cancelAttack;
  }

  if (cancelAttack) {
    const attackerPlayer = getPlayer(state, pending.attackerPlayerId);
    const attackerMonster = attackerPlayer.monsterZone[pending.attackerSlot];
    if (attackerMonster) {
      attackerMonster.hasAttackedThisTurn = true;
    }
    state.pendingAttack = null;
    events.push({
      type: "ATTACK_NEGATED",
      playerId: playerId,
      payload: {
        attackerSlot: pending.attackerSlot,
        reason: payload.decision === "ACTIVATE" ? "TRAP_EFFECT" : "CANCELLED"
      }
    });
    return events;
  }

  resolvePendingBattle(state, events);
  return events;
}

export function resolveAttack(state: GameState, playerId: string, payload: AttackPayload): GameEvent[] {
  const events = declareAttack(state, playerId, payload);
  const pending = state.pendingAttack;
  if (pending) {
    events.push(...resolveTrapResponse(state, pending.defenderPlayerId, { decision: "PASS" }));
  }
  return events;
}
