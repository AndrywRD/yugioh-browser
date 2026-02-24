import {
  CARD_TEMPLATES,
  buildMaterialSummary,
  createAction,
  resolveFusionFromOrderedMaterials,
  validateAction
} from "@ruptura-arcana/game";
import type {
  CardTemplate,
  GameAction,
  GameState,
  MonsterOnBoard,
  PlayerState,
  SpellTrapOnBoard
} from "@ruptura-arcana/shared";

interface BotDecisionInput {
  state: GameState;
  botPlayerId: string;
  tier: number;
  makeActionId: (suffix: string) => string;
}

interface CandidateAction {
  action: GameAction;
  score: number;
}

interface BoardMetrics {
  botLp: number;
  opponentLp: number;
  botMonsterCount: number;
  opponentMonsterCount: number;
  opponentFaceDownMonsters: number;
  opponentDefenseMonsters: number;
  opponentSpellTrapCount: number;
  highestOpponentAtk: number;
  opponentMonstersAtk1500OrMore: number;
  modifiedMonsterCount: number;
  dragonCount: number;
}

const SLOT_PRIORITY = [2, 1, 3, 0, 4];

function getPlayers(state: GameState, botPlayerId: string): { bot: PlayerState; opponent: PlayerState } | null {
  const bot = state.players.find((player) => player.id === botPlayerId);
  const opponent = state.players.find((player) => player.id !== botPlayerId);
  if (!bot || !opponent) return null;
  return { bot, opponent };
}

function getTemplateByInstanceId(state: GameState, instanceId: string): CardTemplate | null {
  const instance = state.instances[instanceId];
  if (!instance) return null;
  return CARD_TEMPLATES[instance.templateId] ?? null;
}

function getMonsterStats(monster: MonsterOnBoard): { atk: number; def: number } {
  const template = CARD_TEMPLATES[monster.templateId];
  if (!template || template.kind !== "MONSTER") return { atk: 0, def: 0 };
  return {
    atk: (template.atk ?? 0) + (monster.atkModifier ?? 0),
    def: (template.def ?? 0) + (monster.defModifier ?? 0)
  };
}

function getPreferredFreeSlot(slots: Array<unknown | null>): number | null {
  for (const slot of SLOT_PRIORITY) {
    if (slots[slot] === null) return slot;
  }
  return null;
}

function getPreferredEquipTargetSlot(player: PlayerState): number | null {
  let bestSlot: number | null = null;
  let bestScore = Number.NEGATIVE_INFINITY;
  for (let slot = 0; slot < player.monsterZone.length; slot += 1) {
    const monster = player.monsterZone[slot];
    if (!monster) continue;
    if (monster.face !== "FACE_UP") continue;
    const stats = getMonsterStats(monster);
    const score = stats.atk * 1.2 + stats.def;
    if (score > bestScore) {
      bestScore = score;
      bestSlot = slot;
    }
  }
  return bestSlot;
}

function getStrongestAttack(player: PlayerState): number {
  let strongest = 0;
  for (const monster of player.monsterZone) {
    if (!monster) continue;
    strongest = Math.max(strongest, getMonsterStats(monster).atk);
  }
  return strongest;
}

function estimateFaceDownDefense(tier: number): number {
  return Math.min(2600, 1200 + tier * 140);
}

function buildBoardMetrics(bot: PlayerState, opponent: PlayerState): BoardMetrics {
  let opponentFaceDownMonsters = 0;
  let opponentDefenseMonsters = 0;
  let opponentSpellTrapCount = 0;
  let highestOpponentAtk = 0;
  let opponentMonstersAtk1500OrMore = 0;
  let modifiedMonsterCount = 0;
  let dragonCount = 0;

  for (const card of opponent.spellTrapZone) {
    if (card) opponentSpellTrapCount += 1;
  }

  for (const boardMonster of [...bot.monsterZone, ...opponent.monsterZone]) {
    if (!boardMonster) continue;
    if ((boardMonster.atkModifier ?? 0) !== 0 || (boardMonster.defModifier ?? 0) !== 0) {
      modifiedMonsterCount += 1;
    }
    const template = CARD_TEMPLATES[boardMonster.templateId];
    if (template?.tags.includes("DRAGON")) {
      dragonCount += 1;
    }
  }

  for (const monster of opponent.monsterZone) {
    if (!monster) continue;
    if (monster.face === "FACE_DOWN") opponentFaceDownMonsters += 1;
    if (monster.position === "DEFENSE") opponentDefenseMonsters += 1;

    const { atk } = getMonsterStats(monster);
    highestOpponentAtk = Math.max(highestOpponentAtk, atk);
    if (atk >= 1500) opponentMonstersAtk1500OrMore += 1;
  }

  return {
    botLp: bot.lp,
    opponentLp: opponent.lp,
    botMonsterCount: bot.monsterZone.filter(Boolean).length,
    opponentMonsterCount: opponent.monsterZone.filter(Boolean).length,
    opponentFaceDownMonsters,
    opponentDefenseMonsters,
    opponentSpellTrapCount,
    highestOpponentAtk,
    opponentMonstersAtk1500OrMore,
    modifiedMonsterCount,
    dragonCount
  };
}

function scoreEffectKey(effectKey: string | undefined, metrics: BoardMetrics): number {
  if (!effectKey || effectKey === "NO_EFFECT" || effectKey.includes("PLACEHOLDER")) return -120;

  const healValue = (value: number) => {
    if (metrics.botLp <= 2000) return 250 + value / 2;
    if (metrics.botLp <= 4000) return 120 + value / 3;
    return 40 + value / 10;
  };

  const damageValue = (value: number) => {
    if (metrics.opponentLp <= value) return 8_000 + value;
    return 80 + value / 2;
  };

  switch (effectKey) {
    case "HEAL_200":
      return healValue(200);
    case "HEAL_500":
      return healValue(500);
    case "HEAL_1000":
      return healValue(1000);
    case "HEAL_2000":
      return healValue(2000);
    case "HEAL_5000":
      return healValue(5000);
    case "DAMAGE_200":
      return damageValue(200);
    case "DAMAGE_500":
      return damageValue(500);
    case "DAMAGE_700":
      return damageValue(700);
    case "DAMAGE_800":
      return damageValue(800);
    case "DAMAGE_1000":
      return damageValue(1000);
    case "DESTROY_OPP_MONSTERS":
      return metrics.opponentMonsterCount * 900;
    case "DESTROY_ALL_MONSTERS":
      return (metrics.opponentMonsterCount - metrics.botMonsterCount) * 850;
    case "DESTROY_OPP_SPELL_TRAPS":
      return metrics.opponentSpellTrapCount * 500;
    case "EQUIP_CONTINUOUS":
    case "EQUIP_BUFF_500":
      return metrics.botMonsterCount > 0 ? 600 : 80;
    case "FORCE_OPP_ATTACK_POSITION":
      return metrics.opponentDefenseMonsters * 300;
    case "LOCK_OPP_ATTACKS_3_TURNS":
      return Math.max(0, metrics.highestOpponentAtk - 800) + metrics.opponentMonsterCount * 160;
    case "REVEAL_OPP_FACE_DOWN_MONSTERS":
      return metrics.opponentFaceDownMonsters * 220;
    case "DESTROY_OPP_FACE_DOWN_MONSTERS":
      return metrics.opponentFaceDownMonsters * 780;
    case "DESTROY_ALL_WARRIOR_MONSTERS":
    case "DESTROY_ALL_INSECT_MONSTERS":
    case "DESTROY_ALL_MACHINE_MONSTERS":
    case "DESTROY_ALL_AQUA_MONSTERS":
      return metrics.opponentMonsterCount * 320 - metrics.botMonsterCount * 200;
    case "CRUSH_CARD_EFFECT":
      return metrics.opponentMonstersAtk1500OrMore * 700;
    case "REMOVE_ALL_MONSTER_MODIFIERS":
      return metrics.modifiedMonsterCount * 240;
    case "LOCK_ALL_DRAGONS":
      return metrics.dragonCount * 350;
    case "DESTROY_ATTACKER":
      return metrics.opponentMonsterCount > 0 ? 560 + metrics.highestOpponentAtk / 2 : 100;
    case "DESTROY_ATTACKER_UNDER_3000":
      return metrics.opponentMonsterCount > 0 ? 480 + metrics.highestOpponentAtk / 3 : 80;
    case "DESTROY_ATTACKER_UNDER_500":
      return metrics.highestOpponentAtk <= 500 ? 420 : 40;
    case "LOCK_ATTACKER":
      return metrics.opponentMonsterCount > 0 ? 420 + metrics.highestOpponentAtk / 4 : 60;
    default:
      return 90;
  }
}

function scoreAttack(attacker: MonsterOnBoard, defender: MonsterOnBoard | null, tier: number, opponentLp: number): number {
  const attackerStats = getMonsterStats(attacker);
  const attackerAtk = attackerStats.atk;

  if (!defender) {
    if (attackerAtk >= opponentLp) return 10_000 + attackerAtk;
    return 1_600 + attackerAtk;
  }

  const defenderStats = getMonsterStats(defender);
  if (defender.position === "ATTACK") {
    const diff = attackerAtk - defenderStats.atk;
    if (diff > 0) {
      const lethalBonus = diff >= opponentLp ? 5_000 : 0;
      return 1_700 + diff + lethalBonus;
    }
    if (diff === 0) return 360;
    return -1_800 + diff;
  }

  const assumedDef = defender.face === "FACE_DOWN" ? estimateFaceDownDefense(tier) : defenderStats.def;
  const diff = attackerAtk - assumedDef;
  const hiddenPenalty = defender.face === "FACE_DOWN" ? (tier <= 2 ? 280 : 120) : 0;

  if (diff > 0) return 1_200 + diff - hiddenPenalty;
  return -520 + Math.floor(diff * 0.65) - hiddenPenalty;
}

function buildFusionCandidate(input: BotDecisionInput, bot: PlayerState, addCandidate: (candidate: CandidateAction) => void): void {
  if (input.tier < 2 || bot.usedSummonOrFuseThisTurn) return;

  const freeSlot = getPreferredFreeSlot(bot.monsterZone);
  if (freeSlot == null) return;

  const handMonsters = bot.hand
    .map((instanceId) => ({ instanceId, template: getTemplateByInstanceId(input.state, instanceId) }))
    .filter((item): item is { instanceId: string; template: CardTemplate } => Boolean(item.template && item.template.kind === "MONSTER"))
    .sort((a, b) => ((b.template.atk ?? 0) + (b.template.def ?? 0)) - ((a.template.atk ?? 0) + (a.template.def ?? 0)))
    .slice(0, 6);

  if (handMonsters.length < 2) return;

  for (let i = 0; i < handMonsters.length; i += 1) {
    for (let j = i + 1; j < handMonsters.length; j += 1) {
      const left = handMonsters[i];
      const right = handMonsters[j];
      const materials = [
        buildMaterialSummary(left.instanceId, left.template.id),
        buildMaterialSummary(right.instanceId, right.template.id)
      ];
      const fusion = resolveFusionFromOrderedMaterials(materials, input.state.seed + input.state.turn.turnNumber + i + j);
      const resultTemplate = CARD_TEMPLATES[fusion.resultTemplateId];
      if (!resultTemplate || resultTemplate.kind !== "MONSTER") continue;

      const resultPower = (resultTemplate.atk ?? 0) + (resultTemplate.def ?? 0) * 0.35;
      const fallbackPenalty = fusion.failed ? 1_200 : 0;
      const score = Math.floor(1_100 + resultPower - fallbackPenalty);
      const action = createAction(input.makeActionId("fuse"), "FUSE", {
        materials: [
          { source: "HAND", instanceId: left.instanceId },
          { source: "HAND", instanceId: right.instanceId }
        ],
        order: [left.instanceId, right.instanceId],
        resultSlot: freeSlot
      });

      if (validateAction(input.state, action, input.botPlayerId).ok) {
        addCandidate({ action, score });
      }
    }
  }
}

function addSummonAndSetCandidates(input: BotDecisionInput, bot: PlayerState, opponent: PlayerState, addCandidate: (candidate: CandidateAction) => void): void {
  if (bot.usedSummonOrFuseThisTurn) return;
  const freeMonsterSlot = getPreferredFreeSlot(bot.monsterZone);
  if (freeMonsterSlot == null) return;

  const opponentStrongestAtk = getStrongestAttack(opponent);
  const monsterChoices = bot.hand
    .map((instanceId) => ({ instanceId, template: getTemplateByInstanceId(input.state, instanceId) }))
    .filter((item): item is { instanceId: string; template: CardTemplate } => Boolean(item.template && item.template.kind === "MONSTER"))
    .sort((a, b) => (b.template.atk ?? 0) - (a.template.atk ?? 0))
    .slice(0, 8);

  for (const item of monsterChoices) {
    const atk = item.template.atk ?? 0;
    const def = item.template.def ?? 0;

    let summonScore = 500 + atk;
    if (bot.monsterZone.every((slot) => slot === null)) summonScore += 180;
    if (atk < opponentStrongestAtk && def > atk) summonScore -= 220;
    summonScore += input.tier * 35;

    const summonAction = createAction(input.makeActionId("summon"), "SUMMON_MONSTER", {
      handInstanceId: item.instanceId,
      slot: freeMonsterSlot,
      position: "ATTACK"
    });
    if (validateAction(input.state, summonAction, input.botPlayerId).ok) {
      addCandidate({ action: summonAction, score: summonScore });
    }

    let setScore = 380 + def;
    if (opponentStrongestAtk > atk) setScore += 220;
    if (input.tier >= 4) setScore -= 120;
    if (input.state.turn.turnNumber === 1) setScore += 120;

    const setAction = createAction(input.makeActionId("set-monster"), "SET_MONSTER", {
      handInstanceId: item.instanceId,
      slot: freeMonsterSlot
    });
    if (validateAction(input.state, setAction, input.botPlayerId).ok) {
      addCandidate({ action: setAction, score: setScore });
    }
  }
}

function addSpellTrapCandidates(input: BotDecisionInput, bot: PlayerState, opponent: PlayerState, addCandidate: (candidate: CandidateAction) => void): void {
  const metrics = buildBoardMetrics(bot, opponent);
  const equipTargetSlot = getPreferredEquipTargetSlot(bot);

  for (const handInstanceId of bot.hand) {
    const template = getTemplateByInstanceId(input.state, handInstanceId);
    if (!template || template.kind === "MONSTER") continue;

    if (template.kind === "SPELL") {
      const activatePayload =
        (template.effectKey === "EQUIP_CONTINUOUS" || template.effectKey === "EQUIP_BUFF_500") && typeof equipTargetSlot === "number"
          ? { handInstanceId, targetMonsterSlot: equipTargetSlot }
          : { handInstanceId };
      const activateAction = createAction(input.makeActionId("spell-now"), "ACTIVATE_SPELL_FROM_HAND", activatePayload);
      if (validateAction(input.state, activateAction, input.botPlayerId).ok) {
        const effectScore = scoreEffectKey(template.effectKey, metrics);
        addCandidate({ action: activateAction, score: effectScore + 220 });
      }
    }

    const freeSpellSlot = getPreferredFreeSlot(bot.spellTrapZone);
    if (freeSpellSlot != null) {
      const setAction = createAction(input.makeActionId("set-spelltrap"), "SET_SPELL_TRAP", {
        handInstanceId,
        slot: freeSpellSlot
      });
      if (validateAction(input.state, setAction, input.botPlayerId).ok) {
        const setBase = template.kind === "TRAP" ? 340 : 180;
        const score = setBase + Math.floor(scoreEffectKey(template.effectKey, metrics) * 0.35);
        addCandidate({ action: setAction, score });
      }
    }
  }

  for (let slot = 0; slot < bot.spellTrapZone.length; slot += 1) {
    const fieldCard = bot.spellTrapZone[slot];
    if (!fieldCard) continue;
    const fieldTemplate = CARD_TEMPLATES[fieldCard.templateId];
    const activateSetPayload =
      (fieldTemplate?.effectKey === "EQUIP_CONTINUOUS" || fieldTemplate?.effectKey === "EQUIP_BUFF_500") && typeof equipTargetSlot === "number"
        ? { slot, targetMonsterSlot: equipTargetSlot }
        : { slot };
    const activateSetAction = createAction(input.makeActionId("activate-set"), "ACTIVATE_SET_CARD", activateSetPayload);
    if (!validateAction(input.state, activateSetAction, input.botPlayerId).ok) continue;
    const score = scoreEffectKey(fieldTemplate?.effectKey, metrics) + 260;
    addCandidate({ action: activateSetAction, score });
  }
}

function addAttackCandidates(input: BotDecisionInput, bot: PlayerState, opponent: PlayerState, addCandidate: (candidate: CandidateAction) => void): void {
  const defenders = opponent.monsterZone;
  const hasDefenders = defenders.some((monster) => monster !== null);

  for (let slot = 0; slot < bot.monsterZone.length; slot += 1) {
    const attacker = bot.monsterZone[slot];
    if (!attacker) continue;
    if (attacker.position !== "ATTACK" || attacker.face !== "FACE_UP") continue;
    if (attacker.hasAttackedThisTurn || attacker.cannotAttackThisTurn) continue;

    if (!hasDefenders) {
      const directAction = createAction(input.makeActionId("attack-direct"), "ATTACK_DECLARE", {
        attackerSlot: slot,
        target: "DIRECT"
      });
      if (validateAction(input.state, directAction, input.botPlayerId).ok) {
        addCandidate({
          action: directAction,
          score: scoreAttack(attacker, null, input.tier, opponent.lp)
        });
      }
      continue;
    }

    for (let defenderSlot = 0; defenderSlot < defenders.length; defenderSlot += 1) {
      const defender = defenders[defenderSlot];
      if (!defender) continue;
      const attackAction = createAction(input.makeActionId("attack"), "ATTACK_DECLARE", {
        attackerSlot: slot,
        target: { slot: defenderSlot }
      });
      if (!validateAction(input.state, attackAction, input.botPlayerId).ok) continue;
      addCandidate({
        action: attackAction,
        score: scoreAttack(attacker, defender, input.tier, opponent.lp)
      });
    }
  }
}

function addPositionCandidates(input: BotDecisionInput, bot: PlayerState, opponent: PlayerState, addCandidate: (candidate: CandidateAction) => void): void {
  const strongestOpponentAtk = getStrongestAttack(opponent);
  for (let slot = 0; slot < bot.monsterZone.length; slot += 1) {
    const monster = bot.monsterZone[slot];
    if (!monster || monster.face !== "FACE_UP") continue;
    const stats = getMonsterStats(monster);

    if (monster.position === "ATTACK" && monster.hasAttackedThisTurn && stats.def > stats.atk + 120 && strongestOpponentAtk > stats.atk) {
      const defenseAction = createAction(input.makeActionId("pos-def"), "CHANGE_POSITION", {
        slot,
        position: "DEFENSE"
      });
      if (validateAction(input.state, defenseAction, input.botPlayerId).ok) {
        addCandidate({ action: defenseAction, score: 620 + stats.def / 3 });
      }
    }

    if (monster.position === "DEFENSE" && !monster.hasAttackedThisTurn && stats.atk > strongestOpponentAtk + 160) {
      const attackAction = createAction(input.makeActionId("pos-atk"), "CHANGE_POSITION", {
        slot,
        position: "ATTACK"
      });
      if (validateAction(input.state, attackAction, input.botPlayerId).ok) {
        addCandidate({ action: attackAction, score: 560 + stats.atk / 3 });
      }
    }
  }
}

export function buildBotTurnAction(input: BotDecisionInput): GameAction | null {
  const pair = getPlayers(input.state, input.botPlayerId);
  if (!pair) return null;
  const { bot, opponent } = pair;
  const candidates: CandidateAction[] = [];
  const addCandidate = (candidate: CandidateAction) => candidates.push(candidate);

  addAttackCandidates(input, bot, opponent, addCandidate);

  if (input.state.turn.phase === "MAIN") {
    addSpellTrapCandidates(input, bot, opponent, addCandidate);
    buildFusionCandidate(input, bot, addCandidate);
    addSummonAndSetCandidates(input, bot, opponent, addCandidate);
    addPositionCandidates(input, bot, opponent, addCandidate);
  }

  candidates.sort((left, right) => right.score - left.score);
  const best = candidates[0];
  if (!best) return null;
  if (best.score < -500) return null;
  return best.action;
}

export function buildReactiveBotAction(input: BotDecisionInput): GameAction | null {
  const pair = getPlayers(input.state, input.botPlayerId);
  if (!pair) return null;

  const { bot, opponent } = pair;
  const pending = input.state.pendingAttack;

  if (pending?.window === "TRAP_RESPONSE" && pending.defenderPlayerId === input.botPlayerId) {
    const metrics = buildBoardMetrics(bot, opponent);
    const trapCandidates: CandidateAction[] = [];

    for (let slot = 0; slot < bot.spellTrapZone.length; slot += 1) {
      const setCard: SpellTrapOnBoard | null = bot.spellTrapZone[slot];
      if (!setCard || setCard.kind !== "TRAP") continue;
      if (setCard.face !== "FACE_DOWN" || setCard.setThisTurn) continue;

      const action = createAction(input.makeActionId("trap-response"), "TRAP_RESPONSE", {
        decision: "ACTIVATE",
        trapSlot: slot
      });
      if (!validateAction(input.state, action, input.botPlayerId).ok) continue;
      const template = CARD_TEMPLATES[setCard.templateId];
      const score = scoreEffectKey(template?.effectKey, metrics) + 320;
      trapCandidates.push({ action, score });
    }

    trapCandidates.sort((left, right) => right.score - left.score);
    const threshold = Math.max(120, 260 - input.tier * 20);
    const bestTrap = trapCandidates[0];
    if (bestTrap && bestTrap.score >= threshold) {
      return bestTrap.action;
    }

    return createAction(input.makeActionId("trap-pass"), "TRAP_RESPONSE", { decision: "PASS" });
  }

  if (input.state.turn.playerId === input.botPlayerId) return null;

  const metrics = buildBoardMetrics(bot, opponent);
  const candidates: CandidateAction[] = [];

  for (let slot = 0; slot < bot.spellTrapZone.length; slot += 1) {
    const setCard: SpellTrapOnBoard | null = bot.spellTrapZone[slot];
    if (!setCard || setCard.kind !== "TRAP") continue;
    const action = createAction(input.makeActionId("react-trap"), "ACTIVATE_SET_CARD", { slot });
    if (!validateAction(input.state, action, input.botPlayerId).ok) continue;
    const template = CARD_TEMPLATES[setCard.templateId];
    const score = scoreEffectKey(template?.effectKey, metrics) + 280;
    candidates.push({ action, score });
  }

  candidates.sort((left, right) => right.score - left.score);
  const threshold = Math.max(140, 280 - input.tier * 20);
  const best = candidates[0];
  if (!best || best.score < threshold) return null;
  return best.action;
}
