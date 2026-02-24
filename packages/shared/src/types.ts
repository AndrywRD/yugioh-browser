import type { ACTION_TYPES, CARD_FACES, CARD_KINDS, FIELD_ZONES, GAME_STATUS, PHASES, POSITIONS, TAGS } from "./constants";

export type Tag = (typeof TAGS)[number];
export type Phase = (typeof PHASES)[number];
export type Position = (typeof POSITIONS)[number];
export type GameStatus = (typeof GAME_STATUS)[number];
export type ActionType = (typeof ACTION_TYPES)[number];
export type CardKind = (typeof CARD_KINDS)[number];
export type CardFace = (typeof CARD_FACES)[number];
export type FieldZone = (typeof FIELD_ZONES)[number];
export type PendingAttackWindow = "TRAP_RESPONSE";
export type FaceDownSurvivorMode = "REVEALED";

export type ZoneSource = "HAND" | "FIELD";
export type RoomStatus = "LOBBY" | "RUNNING" | "FINISHED";
export type RoomPlayerType = "HUMAN" | "BOT";

export interface CardTemplate {
  id: string;
  name: string;
  kind: CardKind;
  type?: "MONSTER";
  atk?: number;
  def?: number;
  tags: Tag[];
  spellSpeed?: 1 | 2;
  effectKey?: string;
  effectDescription?: string;
  imagePath?: string;
  password?: string;
  cost?: number;
  catalogNumber?: number;
}

export interface DeckCardEntry {
  cardId: string;
  count: number;
}

export interface Deck {
  id: string;
  name: string;
  cards: DeckCardEntry[];
  updatedAt: number;
}

export interface DeckRules {
  size: number;
  maxCopies: number;
  minMonsters?: number;
}

export interface DeckValidation {
  ok: boolean;
  errors: string[];
  warnings: string[];
  total: number;
}

export interface FusionDiscovery {
  key: string;
  materialsCount: 2 | 3;
  materialTags: string[];
  materialCardIds: string[];
  resultCardId: string;
  resultName: string;
  discoveredAt: number;
  times: number;
}

export interface FusionRecipe {
  id: string;
  requiresAll: Tag[];
  requiresCount?: Array<{ tag: Tag; count: number }>;
  requiresAny?: Tag[];
  minAtkSum?: number;
  minDefSum?: number;
  priority: number;
  resultMonsterTemplateId: string;
}

export interface CardInstance {
  instanceId: string;
  templateId: string;
  ownerId: string;
}

export interface MonsterOnBoard {
  instanceId: string;
  templateId: string;
  ownerId: string;
  zone: "MONSTER";
  slot: number;
  face: CardFace;
  position: Position;
  atkModifier: number;
  defModifier: number;
  hasAttackedThisTurn: boolean;
  positionChangedThisTurn: boolean;
  lockedPositionUntilTurn?: number;
  cannotAttackThisTurn?: boolean;
}

export interface SpellTrapOnBoard {
  instanceId: string;
  templateId: string;
  ownerId: string;
  zone: "SPELL_TRAP";
  slot: number;
  face: CardFace;
  kind: "SPELL" | "TRAP";
  setThisTurn: boolean;
  continuous?: boolean;
  equipTargetInstanceId?: string;
  equipAtkBoost?: number;
  equipDefBoost?: number;
}

export type FieldCard = MonsterOnBoard | SpellTrapOnBoard;

export interface PlayerState {
  id: string;
  username: string;
  lp: number;
  deck: string[];
  hand: string[];
  graveyard: string[];
  monsterZone: Array<MonsterOnBoard | null>;
  spellTrapZone: Array<SpellTrapOnBoard | null>;
  usedSummonOrFuseThisTurn: boolean;
  cannotAttackUntilTurn?: number;
}

export interface TurnState {
  playerId: string;
  phase: Phase;
  turnNumber: number;
}

export interface PendingAttack {
  attackerPlayerId: string;
  defenderPlayerId: string;
  attackerSlot: number;
  target: { slot: number } | "DIRECT";
  defenderMayRespond: boolean;
  window: PendingAttackWindow | null;
}

export interface MatchConfig {
  faceDownSurvivorMode: FaceDownSurvivorMode;
}

export interface GameState {
  version: number;
  status: GameStatus;
  seed: number;
  firstPlayerId: string;
  config: MatchConfig;
  turn: TurnState;
  pendingAttack: PendingAttack | null;
  players: [PlayerState, PlayerState];
  instances: Record<string, CardInstance>;
  winnerId?: string;
}

export interface FuseMaterial {
  source: ZoneSource;
  instanceId: string;
  slot?: number;
}

export interface SummonPayload {
  handInstanceId: string;
  slot: number;
  position: Position;
}

export interface SummonMonsterPayload {
  handInstanceId: string;
  slot: number;
  position?: "ATTACK";
}

export interface SetMonsterPayload {
  handInstanceId: string;
  slot: number;
}

export interface SetSpellTrapPayload {
  handInstanceId: string;
  slot: number;
}

export interface ActivateSpellFromHandPayload {
  handInstanceId: string;
  targetMonsterSlot?: number;
  targetSpellTrapSlot?: number;
}

export interface ActivateSetCardPayload {
  slot: number;
  targetMonsterSlot?: number;
}

export interface FusePayload {
  materials: FuseMaterial[];
  order: string[];
  resultSlot: number;
}

export interface ChangePositionPayload {
  slot: number;
  position: Position;
}

export interface AttackPayload {
  attackerSlot: number;
  target?: { slot: number } | "DIRECT";
}

export interface AttackDeclarePayload {
  attackerSlot: number;
  target?: { slot: number } | "DIRECT";
}

export interface FlipSummonPayload {
  slot: number;
}

export interface TrapResponsePayload {
  decision: "ACTIVATE" | "PASS";
  trapSlot?: number;
}

export type ActionPayloadByType = {
  SUMMON: SummonPayload;
  SUMMON_MONSTER: SummonMonsterPayload;
  SET_MONSTER: SetMonsterPayload;
  SET_SPELL_TRAP: SetSpellTrapPayload;
  ACTIVATE_SPELL_FROM_HAND: ActivateSpellFromHandPayload;
  ACTIVATE_SET_CARD: ActivateSetCardPayload;
  FUSE: FusePayload;
  CHANGE_POSITION: ChangePositionPayload;
  ATTACK: AttackPayload;
  ATTACK_DECLARE: AttackDeclarePayload;
  FLIP_SUMMON: FlipSummonPayload;
  TRAP_RESPONSE: TrapResponsePayload;
  END_TURN: Record<string, never>;
};

export type GameAction = {
  [K in ActionType]: {
    actionId: string;
    type: K;
    payload: ActionPayloadByType[K];
  };
}[ActionType];

export interface GameEvent<T = Record<string, unknown>> {
  type:
    | "CARD_DRAWN"
    | "MONSTER_SUMMONED"
    | "MONSTER_FLIP_SUMMONED"
    | "MONSTER_SET"
    | "MONSTER_REHIDDEN"
    | "MONSTER_REVEALED"
    | "SPELL_TRAP_SET"
    | "SPELL_ACTIVATED"
    | "TRAP_ACTIVATED"
    | "FUSION_RESOLVED"
    | "FUSION_FAILED"
    | "POSITION_CHANGED"
    | "ATTACK_DECLARED"
    | "ATTACK_WAITING_RESPONSE"
    | "ATTACK_NEGATED"
    | "BATTLE_RESOLVED"
    | "LP_CHANGED"
    | "TURN_CHANGED"
    | "GAME_FINISHED";
  playerId?: string;
  payload?: T;
}

export interface EngineResult {
  nextState: GameState;
  events: GameEvent[];
}

export interface RoomPlayer {
  socketId?: string;
  playerId: string;
  username: string;
  ready: boolean;
  type: RoomPlayerType;
}

export interface RoomState {
  roomCode: string;
  status: RoomStatus;
  hostId: string;
  players: Array<{
    playerId: string;
    username: string;
    ready: boolean;
    online: boolean;
    type: RoomPlayerType;
  }>;
}

export interface CardClientView {
  instanceId: string;
  templateId: string;
  name: string;
  kind: CardKind;
  atk: number;
  def: number;
  tags: Tag[];
  effectKey?: string;
  effectDescription?: string;
  imagePath?: string;
  password?: string;
  cost?: number;
  catalogNumber?: number;
}

export interface MonsterClientView {
  instanceId: string;
  templateId: string;
  ownerId: string;
  zone: "MONSTER";
  slot: number;
  name: string;
  kind: "MONSTER";
  atk: number;
  def: number;
  tags: Tag[];
  effectDescription?: string;
  imagePath?: string;
  password?: string;
  cost?: number;
  catalogNumber?: number;
  face: CardFace;
  position: Position;
  atkModifier: number;
  defModifier: number;
  hasAttackedThisTurn: boolean;
  positionChangedThisTurn: boolean;
  lockedPositionUntilTurn?: number;
  cannotAttackThisTurn?: boolean;
}

export interface SpellTrapClientView {
  instanceId: string;
  templateId: string;
  ownerId: string;
  zone: "SPELL_TRAP";
  slot: number;
  kind: "SPELL" | "TRAP";
  face: CardFace;
  setThisTurn: boolean;
  continuous?: boolean;
  equipTargetInstanceId?: string;
  equipAtkBoost?: number;
  equipDefBoost?: number;
  name: string;
  atk: number;
  def: number;
  tags: Tag[];
  effectKey?: string;
  effectDescription?: string;
  imagePath?: string;
  password?: string;
  cost?: number;
  catalogNumber?: number;
}

export interface PlayerClientView {
  id: string;
  username: string;
  lp: number;
  deckCount: number;
  handCount: number;
  hand?: CardClientView[];
  graveyard: CardClientView[];
  monsterZone: Array<MonsterClientView | null>;
  spellTrapZone: Array<SpellTrapClientView | null>;
  usedSummonOrFuseThisTurn: boolean;
}

export interface GameStateForClient {
  version: number;
  status: GameStatus;
  turn: TurnState;
  you: PlayerClientView;
  opponent: PlayerClientView;
  pendingPrompt: ClientPendingPrompt | null;
  winnerId?: string;
}

export interface AuthHelloPayload {
  storedPlayerId?: string;
}

export interface AuthRegisterPayload {
  login: string;
  password: string;
  username?: string;
}

export interface AuthLoginPayload {
  login: string;
  password: string;
}

export interface AuthSessionPayload {
  playerId: string;
}

export interface RoomCreatePayload {
  username: string;
}

export interface RoomSoloPayload {
  username: string;
}

export interface RoomJoinPayload {
  roomCode: string;
  username: string;
}

export interface RoomReadyPayload {
  ready: boolean;
}

export interface DeckListPayload {
  decks: Deck[];
  activeDeckId: string | null;
}

export interface DeckSavePayload {
  deck: Deck;
}

export interface DeckDeletePayload {
  deckId: string;
}

export interface DeckSetActivePayload {
  deckId: string;
}

export interface RoomErrorPayload {
  message: string;
}

export interface DeckErrorPayload {
  message: string;
}

export interface GameActionPayload {
  actionId: string;
  type: ActionType;
  payload: unknown;
}

export interface GameErrorPayload {
  actionId?: string;
  message: string;
}

export interface GameEventsPayload {
  version: number;
  events: GameEvent[];
}

export interface GameSnapshotPayload {
  version: number;
  state: GameStateForClient;
}

export interface GamePromptPayload {
  roomCode: string;
  promptType: "TRAP_RESPONSE_REQUIRED";
  data: {
    attackerSlot?: number;
    target?: "DIRECT" | { slot: number };
    availableTrapSlots?: number[];
    defenderMayRespond?: boolean;
  };
}

export interface ClientPendingPrompt {
  type: "TRAP_RESPONSE_REQUIRED";
  attackerSlot?: number;
  target?: "DIRECT" | { slot: number };
  availableTrapSlots?: number[];
}
