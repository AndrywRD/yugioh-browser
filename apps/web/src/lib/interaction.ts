import type { CardKind, FuseMaterial, GameStateForClient, MonsterClientView, Position } from "@ruptura-arcana/shared";

export type BoardSide = "PLAYER" | "ENEMY";
export type BoardZone = "MONSTER" | "SPELL_TRAP";

export interface SlotMarker {
  side: BoardSide;
  zone: BoardZone;
  slotIndex: number;
}

export type CardMenuSource =
  | { kind: "HAND"; instanceId: string; handIndex: number; cardKind: CardKind }
  | { kind: "FIELD"; zone: BoardZone; slotIndex: number };

export type InteractionState =
  | { kind: "idle" }
  | { kind: "cardMenuOpen"; source: CardMenuSource }
  | { kind: "summon_selectSlot"; handInstanceId: string }
  | { kind: "setMonster_selectSlot"; handInstanceId: string }
  | { kind: "setSpellTrap_selectSlot"; handInstanceId: string }
  | { kind: "equipFromHand_selectTarget"; handInstanceId: string }
  | { kind: "equipSet_selectTarget"; slotIndex: number }
  | { kind: "fusion_selectMaterials"; materials: FuseMaterial[] }
  | { kind: "fusion_chooseResultSlot"; materials: FuseMaterial[] }
  | { kind: "attack_chooseTarget"; attackerSlot: number }
  | { kind: "position_choose"; slotIndex: number };

export function idleInteraction(): InteractionState {
  return { kind: "idle" };
}

export function isFlowState(state: InteractionState): boolean {
  return state.kind !== "idle" && state.kind !== "cardMenuOpen";
}

export function isYourTurn(snapshot: GameStateForClient): boolean {
  return snapshot.status === "RUNNING" && snapshot.turn.playerId === snapshot.you.id;
}

export function canUseSummonOrFusion(snapshot: GameStateForClient): boolean {
  return isYourTurn(snapshot) && snapshot.turn.phase === "MAIN" && !snapshot.you.usedSummonOrFuseThisTurn;
}

export function getEmptyOwnSlots(snapshot: GameStateForClient): number[] {
  return snapshot.you.monsterZone.flatMap((slot, index) => (slot ? [] : [index]));
}

export function getEmptyOwnSpellTrapSlots(snapshot: GameStateForClient): number[] {
  return snapshot.you.spellTrapZone.flatMap((slot, index) => (slot ? [] : [index]));
}

export function getSelectableEnemySlots(snapshot: GameStateForClient): number[] {
  return snapshot.opponent.monsterZone.flatMap((slot, index) => (slot ? [index] : []));
}

export function canDirectAttack(snapshot: GameStateForClient): boolean {
  return getSelectableEnemySlots(snapshot).length === 0;
}

export function canMonsterAttack(snapshot: GameStateForClient, monster: MonsterClientView | null | undefined): boolean {
  if (!monster) return false;
  if (!isYourTurn(snapshot)) return false;
  if (monster.face !== "FACE_UP") return false;
  if (monster.position !== "ATTACK") return false;
  if (monster.hasAttackedThisTurn) return false;
  if (monster.cannotAttackThisTurn) return false;
  if (snapshot.turn.turnNumber === 1) return false;
  return snapshot.turn.phase === "MAIN" || snapshot.turn.phase === "BATTLE";
}

export function canChangeMonsterPosition(snapshot: GameStateForClient, monster: MonsterClientView | null | undefined): boolean {
  if (!monster) return false;
  if (!isYourTurn(snapshot)) return false;
  if (snapshot.turn.phase !== "MAIN") return false;
  if (monster.face === "FACE_DOWN") return false;
  if (monster.positionChangedThisTurn) return false;
  if (monster.lockedPositionUntilTurn && snapshot.turn.turnNumber < monster.lockedPositionUntilTurn) return false;
  return true;
}

export function canFlipSummon(snapshot: GameStateForClient, monster: MonsterClientView | null | undefined): boolean {
  if (!monster) return false;
  if (!isYourTurn(snapshot)) return false;
  if (snapshot.turn.phase !== "MAIN") return false;
  if (monster.face !== "FACE_DOWN") return false;
  if (monster.position !== "DEFENSE") return false;
  if (monster.positionChangedThisTurn) return false;
  if (monster.lockedPositionUntilTurn && snapshot.turn.turnNumber < monster.lockedPositionUntilTurn) return false;
  return true;
}

export function getOtherPosition(position: Position): Position {
  return position === "ATTACK" ? "DEFENSE" : "ATTACK";
}

export function toggleFusionMaterial(materials: FuseMaterial[], material: FuseMaterial): FuseMaterial[] {
  const existingIndex = materials.findIndex((item) => item.instanceId === material.instanceId);
  if (existingIndex >= 0) {
    return materials.filter((item) => item.instanceId !== material.instanceId);
  }
  if (materials.length >= 3) return materials;
  return [...materials, material];
}

export function getFusionResultAllowedSlots(snapshot: GameStateForClient, materials: FuseMaterial[]): number[] {
  const fieldSlots = materials
    .filter((item) => item.source === "FIELD" && typeof item.slot === "number")
    .map((item) => item.slot as number);

  if (fieldSlots.length > 0) {
    return Array.from(new Set(fieldSlots));
  }

  return getEmptyOwnSlots(snapshot);
}

export function buildHint(state: InteractionState, snapshot: GameStateForClient): string {
  const yourTurn = isYourTurn(snapshot);
  if (!yourTurn && state.kind !== "idle") return "Vez do oponente. Aguarde.";

  if (state.kind === "idle") {
    return "Clique em uma carta (mao/campo) para abrir acoes.";
  }
  if (state.kind === "cardMenuOpen") {
    return "Escolha uma acao no menu contextual.";
  }
  if (state.kind === "summon_selectSlot") {
    return "Selecione um slot vazio na linha de monstros para invocar.";
  }
  if (state.kind === "setMonster_selectSlot") {
    return "Selecione um slot vazio na linha de monstros para setar em DEF face-down.";
  }
  if (state.kind === "setSpellTrap_selectSlot") {
    return "Selecione um slot vazio na linha de spell/trap para setar a carta.";
  }
  if (state.kind === "equipFromHand_selectTarget") {
    return "Selecione um monstro aliado face-up para equipar.";
  }
  if (state.kind === "equipSet_selectTarget") {
    return "Selecione um monstro aliado face-up para ativar o equip setado.";
  }
  if (state.kind === "fusion_selectMaterials") {
    if (state.materials.length < 2) return `Selecione o ${state.materials.length + 1} material da fusao.`;
    return "Selecione mais um material (opcional) ou clique em Concluir Fusao.";
  }
  if (state.kind === "fusion_chooseResultSlot") {
    return "Escolha o slot onde o resultado da fusao sera colocado.";
  }
  if (state.kind === "attack_chooseTarget") {
    return "Selecione o alvo do ataque no campo inimigo ou Ataque Direto se permitido.";
  }
  if (state.kind === "position_choose") {
    return "Escolha a nova posicao do monstro selecionado.";
  }

  return "Selecione uma acao.";
}
