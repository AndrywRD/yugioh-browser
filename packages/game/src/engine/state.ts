import { BOARD_SIZE, DECK_SIZE, FATIGUE_DAMAGE, INITIAL_HAND_SIZE, INITIAL_LP } from "@ruptura-arcana/shared";
import type { CardClientView, CardInstance, GameEvent, GameState, PlayerState } from "@ruptura-arcana/shared";
import { BASE_DECK_TEMPLATE_IDS, CARD_TEMPLATES } from "../data/cardTemplates";
import { deterministicHash, shuffleWithSeed } from "./rng";

interface InitPlayerInput {
  id: string;
  username: string;
  deckTemplateIds?: string[];
}

function createPlayerState(
  player: InitPlayerInput,
  index: number,
  seed: number,
  allInstances: Record<string, CardInstance>
): PlayerState {
  const deck = buildPlayerDeck(
    player.id,
    allInstances,
    deterministicHash(`${seed}-${player.id}-${index}`),
    player.deckTemplateIds
  );
  return {
    id: player.id,
    username: player.username,
    lp: INITIAL_LP,
    deck,
    hand: [],
    graveyard: [],
    monsterZone: Array.from({ length: BOARD_SIZE }, () => null),
    spellTrapZone: Array.from({ length: BOARD_SIZE }, () => null),
    usedSummonOrFuseThisTurn: false
  };
}

function buildDeckTemplateIds(customTemplateIds?: string[]): string[] {
  const source = customTemplateIds?.filter((templateId) => CARD_TEMPLATES[templateId]) ?? [];
  if (source.length > 0) {
    if (source.length === DECK_SIZE) return [...source];

    const normalized: string[] = [];
    while (normalized.length < DECK_SIZE) {
      for (const templateId of source) {
        if (normalized.length >= DECK_SIZE) break;
        normalized.push(templateId);
      }
    }
    return normalized;
  }

  const ids: string[] = [];
  while (ids.length < DECK_SIZE) {
    for (const templateId of BASE_DECK_TEMPLATE_IDS) {
      if (ids.length >= DECK_SIZE) break;
      ids.push(templateId);
    }
  }
  return ids;
}

function buildPlayerDeck(
  playerId: string,
  allInstances: Record<string, CardInstance>,
  seed: number,
  customTemplateIds?: string[]
): string[] {
  const templateIds = buildDeckTemplateIds(customTemplateIds);
  const rawDeck: string[] = [];

  templateIds.forEach((templateId, index) => {
    const instanceId = `${playerId}-${index + 1}`;
    allInstances[instanceId] = {
      instanceId,
      ownerId: playerId,
      templateId
    };
    rawDeck.push(instanceId);
  });

  return shuffleWithSeed(rawDeck, seed);
}

export function createInitialState(players: [InitPlayerInput, InitPlayerInput], seed = Date.now()): GameState {
  const instances: Record<string, CardInstance> = {};
  const first = createPlayerState(players[0], 0, seed, instances);
  const second = createPlayerState(players[1], 1, seed, instances);
  const statePlayers: [PlayerState, PlayerState] = [first, second];

  const state: GameState = {
    version: 1,
    status: "RUNNING",
    seed,
    firstPlayerId: statePlayers[0].id,
    config: {
      faceDownSurvivorMode: "REVEALED"
    },
    turn: {
      playerId: statePlayers[0].id,
      phase: "MAIN",
      turnNumber: 1
    },
    pendingAttack: null,
    players: statePlayers,
    instances
  };

  for (const player of state.players) {
    for (let i = 0; i < INITIAL_HAND_SIZE; i += 1) {
      drawCard(state, player.id);
    }
  }

  return state;
}

export function cloneState(state: GameState): GameState {
  return {
    ...state,
    config: { ...state.config },
    turn: { ...state.turn },
    pendingAttack: state.pendingAttack ? { ...state.pendingAttack } : null,
    players: state.players.map((player) => ({
      ...player,
      deck: [...player.deck],
      hand: [...player.hand],
      graveyard: [...player.graveyard],
      monsterZone: player.monsterZone.map((slot) => (slot ? { ...slot } : null)),
      spellTrapZone: player.spellTrapZone.map((slot) => (slot ? { ...slot } : null))
    })) as [PlayerState, PlayerState],
    instances: { ...state.instances }
  };
}

export function getPlayerIndex(state: GameState, playerId: string): number {
  const index = state.players.findIndex((player) => player.id === playerId);
  if (index === -1) {
    throw new Error("Player not found");
  }
  return index;
}

export function getPlayer(state: GameState, playerId: string): PlayerState {
  return state.players[getPlayerIndex(state, playerId)];
}

export function getOpponent(state: GameState, playerId: string): PlayerState {
  const index = getPlayerIndex(state, playerId);
  return state.players[index === 0 ? 1 : 0];
}

export function getTemplate(instanceId: string, state: GameState) {
  const instance = state.instances[instanceId];
  if (!instance) {
    throw new Error("Card instance not found");
  }
  const template = CARD_TEMPLATES[instance.templateId];
  if (!template) {
    throw new Error(`Card template '${instance.templateId}' not found`);
  }
  return template;
}

export function buildCardClientView(instanceId: string, state: GameState): CardClientView {
  const template = getTemplate(instanceId, state);
  const instance = state.instances[instanceId];
  return {
    instanceId: instance.instanceId,
    templateId: instance.templateId,
    name: template.name,
    kind: template.kind,
    atk: template.atk ?? 0,
    def: template.def ?? 0,
    tags: template.tags,
    effectKey: template.effectKey,
    effectDescription: template.effectDescription,
    imagePath: template.imagePath,
    password: template.password,
    cost: template.cost,
    catalogNumber: template.catalogNumber
  };
}

export function drawCard(state: GameState, playerId: string): GameEvent[] {
  const player = getPlayer(state, playerId);
  const events: GameEvent[] = [];
  const next = player.deck.shift();

  if (!next) {
    player.lp -= FATIGUE_DAMAGE;
    events.push({
      type: "LP_CHANGED",
      playerId,
      payload: {
        reason: "FATIGUE",
        delta: -FATIGUE_DAMAGE,
        lp: player.lp
      }
    });
    return events;
  }

  player.hand.push(next);
  events.push({
    type: "CARD_DRAWN",
    playerId,
    payload: {
      instanceId: next
    }
  });
  return events;
}

export function getMonsterTemplateByBoardSlot(state: GameState, playerId: string, slot: number) {
  const player = getPlayer(state, playerId);
  const monster = player.monsterZone[slot];
  if (!monster) {
    return null;
  }
  const template = CARD_TEMPLATES[monster.templateId] ?? null;
  if (!template || template.kind !== "MONSTER") return null;
  return template;
}

export function checkWinner(state: GameState): string | undefined {
  const loser = state.players.find((player) => player.lp <= 0);
  if (!loser) return undefined;
  return state.players.find((player) => player.id !== loser.id)?.id;
}

export function setWinnerIfAny(state: GameState, events: GameEvent[]): void {
  const winnerId = checkWinner(state);
  if (!winnerId) return;
  state.status = "FINISHED";
  state.winnerId = winnerId;
  events.push({
    type: "GAME_FINISHED",
    payload: {
      winnerId
    }
  });
}
