import { BOARD_SIZE } from "@ruptura-arcana/shared";
import type { GameAction, GameState } from "@ruptura-arcana/shared";
import { CARD_TEMPLATES } from "../data/cardTemplates";
import { isContinuousEquipEffectKey } from "../data/spellTrapCatalog";
import { getOpponent, getPlayer } from "./state";

export interface ValidationResult {
  ok: boolean;
  error?: string;
}

function isValidSlot(slot: number): boolean {
  return Number.isInteger(slot) && slot >= 0 && slot < BOARD_SIZE;
}

function getTemplateByInstanceId(state: GameState, instanceId: string) {
  const instance = state.instances[instanceId];
  if (!instance) return null;
  return CARD_TEMPLATES[instance.templateId] ?? null;
}

export function validateAction(state: GameState, action: GameAction, playerId: string): ValidationResult {
  if (state.status !== "RUNNING") {
    return { ok: false, error: "Game is not running" };
  }

  const isTrapResponseAction = action.type === "TRAP_RESPONSE";
  const isResponseAction = isTrapResponseAction;

  if (state.pendingAttack?.window === "TRAP_RESPONSE") {
    if (!isTrapResponseAction) {
      return { ok: false, error: "Aguardando resposta de armadilha do defensor" };
    }
    if (playerId !== state.pendingAttack.defenderPlayerId) {
      return { ok: false, error: "Somente o defensor pode responder ao ataque" };
    }
  } else if (isResponseAction) {
    return { ok: false, error: "Nenhuma resposta pendente" };
  }

  if (!isResponseAction && action.type !== "ACTIVATE_SET_CARD" && state.turn.playerId !== playerId) {
    return { ok: false, error: "It is not your turn" };
  }

  const player = getPlayer(state, playerId);
  const opponent = getOpponent(state, playerId);

  if (action.type === "SUMMON" || action.type === "SUMMON_MONSTER") {
    const { handInstanceId, slot } = action.payload;
    if (state.turn.phase !== "MAIN") return { ok: false, error: "Summon is only allowed in MAIN phase" };
    if (player.usedSummonOrFuseThisTurn) return { ok: false, error: "You already summoned or fused this turn" };
    if (!isValidSlot(slot)) return { ok: false, error: "Invalid board slot" };
    if (player.monsterZone[slot]) return { ok: false, error: "Target slot is occupied" };
    if (!player.hand.includes(handInstanceId)) return { ok: false, error: "Card is not in your hand" };

    const template = getTemplateByInstanceId(state, handInstanceId);
    if (!template || template.kind !== "MONSTER") return { ok: false, error: "Only MONSTER can be summoned" };
    return { ok: true };
  }

  if (action.type === "SET_MONSTER") {
    const { handInstanceId, slot } = action.payload;
    if (state.turn.phase !== "MAIN") return { ok: false, error: "Set is only allowed in MAIN phase" };
    if (player.usedSummonOrFuseThisTurn) return { ok: false, error: "You already summoned or fused this turn" };
    if (!isValidSlot(slot)) return { ok: false, error: "Invalid board slot" };
    if (player.monsterZone[slot]) return { ok: false, error: "Target slot is occupied" };
    if (!player.hand.includes(handInstanceId)) return { ok: false, error: "Card is not in your hand" };

    const template = getTemplateByInstanceId(state, handInstanceId);
    if (!template || template.kind !== "MONSTER") return { ok: false, error: "Only MONSTER can be set in monster zone" };
    return { ok: true };
  }

  if (action.type === "SET_SPELL_TRAP") {
    const { handInstanceId, slot } = action.payload;
    if (state.turn.phase !== "MAIN") return { ok: false, error: "Set is only allowed in MAIN phase" };
    if (!isValidSlot(slot)) return { ok: false, error: "Invalid board slot" };
    if (player.spellTrapZone[slot]) return { ok: false, error: "Target slot is occupied" };
    if (!player.hand.includes(handInstanceId)) return { ok: false, error: "Card is not in your hand" };

    const template = getTemplateByInstanceId(state, handInstanceId);
    if (!template || template.kind === "MONSTER") return { ok: false, error: "Only SPELL/TRAP can be set in this zone" };
    return { ok: true };
  }

  if (action.type === "ACTIVATE_SPELL_FROM_HAND") {
    const { handInstanceId, targetMonsterSlot, targetSpellTrapSlot } = action.payload;
    if (state.turn.phase !== "MAIN") return { ok: false, error: "Spell activation is only allowed in MAIN phase" };
    if (!player.hand.includes(handInstanceId)) return { ok: false, error: "Card is not in your hand" };
    const template = getTemplateByInstanceId(state, handInstanceId);
    if (!template || template.kind !== "SPELL") return { ok: false, error: "Only SPELL can be activated from hand" };

    if (isContinuousEquipEffectKey(template.effectKey)) {
      const hasTarget =
        typeof targetMonsterSlot === "number" &&
        isValidSlot(targetMonsterSlot) &&
        Boolean(player.monsterZone[targetMonsterSlot]) &&
        player.monsterZone[targetMonsterSlot]?.face === "FACE_UP";
      if (!hasTarget) return { ok: false, error: "Equip exige alvo valido em monstro face-up" };

      if (typeof targetSpellTrapSlot === "number") {
        if (!isValidSlot(targetSpellTrapSlot)) return { ok: false, error: "Slot de Spell/Trap invalido" };
        if (player.spellTrapZone[targetSpellTrapSlot]) return { ok: false, error: "Slot de Spell/Trap ocupado" };
      } else if (!player.spellTrapZone.some((slotCard) => slotCard === null)) {
        return { ok: false, error: "Sem slot livre de Spell/Trap para equipar" };
      }
    }
    return { ok: true };
  }

  if (action.type === "ACTIVATE_SET_CARD") {
    const { slot, targetMonsterSlot } = action.payload;
    if (!isValidSlot(slot)) return { ok: false, error: "Invalid board slot" };
    const setCard = player.spellTrapZone[slot];
    if (!setCard) return { ok: false, error: "No set card in selected slot" };
    if (setCard.face !== "FACE_DOWN") return { ok: false, error: "Somente cartas setadas podem ser ativadas" };
    const template = CARD_TEMPLATES[setCard.templateId];
    if (!template || template.kind === "MONSTER") return { ok: false, error: "Only SPELL/TRAP set cards can be activated" };

    if (template.kind === "SPELL") {
      if (state.turn.playerId !== playerId || state.turn.phase !== "MAIN") {
        return { ok: false, error: "Set SPELL can only be activated in your MAIN phase" };
      }
    } else if (state.turn.playerId === playerId) {
      return { ok: false, error: "TRAP can only be activated on opponent turn in this MVP" };
    }

    if (template.kind === "SPELL" && isContinuousEquipEffectKey(template.effectKey)) {
      const hasTarget =
        typeof targetMonsterSlot === "number" &&
        isValidSlot(targetMonsterSlot) &&
        Boolean(player.monsterZone[targetMonsterSlot]) &&
        player.monsterZone[targetMonsterSlot]?.face === "FACE_UP";
      if (!hasTarget) return { ok: false, error: "Equip exige alvo valido em monstro face-up" };
    }

    return { ok: true };
  }

  if (action.type === "FUSE") {
    const { materials, order, resultSlot } = action.payload;
    if (state.turn.phase !== "MAIN") return { ok: false, error: "Fusion is only allowed in MAIN phase" };
    if (player.usedSummonOrFuseThisTurn) return { ok: false, error: "You already summoned or fused this turn" };
    if (materials.length < 2 || materials.length > 3) return { ok: false, error: "Fusion requires 2 or 3 materials" };
    if (!isValidSlot(resultSlot)) return { ok: false, error: "Invalid result slot" };

    const uniqueMaterials = new Set(materials.map((material) => material.instanceId));
    if (uniqueMaterials.size !== materials.length) {
      return { ok: false, error: "Duplicate materials are not allowed" };
    }

    if (order.length !== materials.length) return { ok: false, error: "Invalid fusion order length" };
    const orderSet = new Set(order);
    if (orderSet.size !== order.length) return { ok: false, error: "Order contains duplicates" };
    for (const instanceId of order) {
      if (!uniqueMaterials.has(instanceId)) return { ok: false, error: "Order contains invalid material" };
    }

    const fieldSlots: number[] = [];
    for (const material of materials) {
      const instance = state.instances[material.instanceId];
      if (!instance) return { ok: false, error: "Material does not exist" };
      if (instance.ownerId !== playerId) return { ok: false, error: "Material does not belong to player" };
      const template = CARD_TEMPLATES[instance.templateId];
      if (!template || template.kind !== "MONSTER") return { ok: false, error: "Only monster materials are allowed" };

      if (material.source === "HAND") {
        if (!player.hand.includes(material.instanceId)) return { ok: false, error: "Hand material missing" };
        continue;
      }

      if (!isValidSlot(material.slot ?? -1)) return { ok: false, error: "Field material slot is invalid" };
      const slot = material.slot as number;
      const monster = player.monsterZone[slot];
      if (!monster || monster.instanceId !== material.instanceId) {
        return { ok: false, error: "Field material does not match board slot" };
      }
      fieldSlots.push(slot);
    }

    if (fieldSlots.length === 0 && player.monsterZone[resultSlot]) {
      return { ok: false, error: "Result slot must be empty when fusing from hand only" };
    }

    if (fieldSlots.length > 0 && !fieldSlots.includes(resultSlot)) {
      return { ok: false, error: "Result slot must be one of the field material slots" };
    }

    return { ok: true };
  }

  if (action.type === "CHANGE_POSITION") {
    const { slot, position } = action.payload;
    if (state.turn.phase !== "MAIN") return { ok: false, error: "Position change is only allowed in MAIN phase" };
    if (!isValidSlot(slot)) return { ok: false, error: "Invalid slot" };
    const monster = player.monsterZone[slot];
    if (!monster) return { ok: false, error: "No monster in selected slot" };
    if (monster.face === "FACE_DOWN") return { ok: false, error: "Face-down monsters must use FLIP_SUMMON" };
    if (monster.position === position) return { ok: false, error: "Monster is already in that position" };
    if (monster.positionChangedThisTurn) return { ok: false, error: "Monster already changed position this turn" };
    if (monster.lockedPositionUntilTurn && state.turn.turnNumber < monster.lockedPositionUntilTurn) {
      return { ok: false, error: "Monster position is locked this turn" };
    }
    return { ok: true };
  }

  if (action.type === "FLIP_SUMMON") {
    const { slot } = action.payload;
    if (state.turn.phase !== "MAIN") return { ok: false, error: "Flip summon is only allowed in MAIN phase" };
    if (!isValidSlot(slot)) return { ok: false, error: "Invalid slot" };
    const monster = player.monsterZone[slot];
    if (!monster) return { ok: false, error: "No monster in selected slot" };
    if (monster.face !== "FACE_DOWN" || monster.position !== "DEFENSE") {
      return { ok: false, error: "Only set DEF monsters can be flip summoned" };
    }
    if (monster.positionChangedThisTurn) return { ok: false, error: "Monster already changed position this turn" };
    if (monster.lockedPositionUntilTurn && state.turn.turnNumber < monster.lockedPositionUntilTurn) {
      return { ok: false, error: "Monster position is locked this turn" };
    }
    return { ok: true };
  }

  if (action.type === "ATTACK" || action.type === "ATTACK_DECLARE") {
    const { attackerSlot, target } = action.payload;
    if (state.turn.turnNumber === 1) {
      return { ok: false, error: "Nao e possivel atacar no primeiro turno" };
    }
    if (state.turn.phase !== "MAIN" && state.turn.phase !== "BATTLE") {
      return { ok: false, error: "Attack is only allowed in MAIN/BATTLE phase" };
    }
    if (!isValidSlot(attackerSlot)) return { ok: false, error: "Invalid attacker slot" };

    const attacker = player.monsterZone[attackerSlot];
    if (!attacker) return { ok: false, error: "No attacker monster in slot" };
    if (player.cannotAttackUntilTurn && state.turn.turnNumber <= player.cannotAttackUntilTurn) {
      return { ok: false, error: "Ataques estao bloqueados por efeito de carta" };
    }
    if (attacker.face !== "FACE_UP") return { ok: false, error: "Face-down monster cannot attack" };
    if (attacker.position !== "ATTACK") return { ok: false, error: "Only ATTACK position monsters can attack" };
    if (attacker.hasAttackedThisTurn) return { ok: false, error: "Monster already attacked this turn" };
    if (attacker.cannotAttackThisTurn) return { ok: false, error: "Monster cannot attack this turn" };

    const opponentHasMonster = opponent.monsterZone.some(Boolean);
    if (!target || target === "DIRECT") {
      if (opponentHasMonster) return { ok: false, error: "Direct attack is only allowed when opponent has no monsters" };
      return { ok: true };
    }

    if (!isValidSlot(target.slot)) return { ok: false, error: "Invalid target slot" };
    if (!opponent.monsterZone[target.slot]) return { ok: false, error: "No target monster in selected slot" };
    return { ok: true };
  }

  if (action.type === "TRAP_RESPONSE") {
    const pending = state.pendingAttack;
    if (!pending || pending.window !== "TRAP_RESPONSE") {
      return { ok: false, error: "Nenhuma resposta de armadilha pendente" };
    }

    if (action.payload.decision === "PASS") return { ok: true };

    const slot = action.payload.trapSlot;
    if (!isValidSlot(slot ?? -1)) return { ok: false, error: "Slot de armadilha invalido" };
    const card = player.spellTrapZone[slot as number];
    if (!card) return { ok: false, error: "Nenhuma armadilha no slot selecionado" };
    if (card.kind !== "TRAP") return { ok: false, error: "Apenas TRAP pode ser usada em resposta ao ataque" };
    if (card.face !== "FACE_DOWN") return { ok: false, error: "A armadilha precisa estar setada" };
    if (card.setThisTurn) return { ok: false, error: "Nao pode ativar armadilha no mesmo turno em que foi setada" };
    return { ok: true };
  }

  if (action.type === "END_TURN") {
    return { ok: true };
  }

  return { ok: false, error: "Unsupported action type" };
}
