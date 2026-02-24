import { randomUUID } from "node:crypto";
import cors from "@fastify/cors";
import Fastify from "fastify";
import { BASE_DECK_TEMPLATE_IDS, applyAction, buildSnapshotForPlayer, createInitialState, validateAction, validateDeck } from "@ruptura-arcana/game";
import {
  authLoginSchema,
  authHelloSchema,
  authRegisterSchema,
  deckDeleteSchema,
  deckSaveSchema,
  deckSetActiveSchema,
  gameActionPayloadSchemas,
  gameActionSchema,
  roomCreateSchema,
  roomJoinSchema,
  roomReadySchema,
  roomSoloSchema
} from "@ruptura-arcana/shared";
import type {
  Deck,
  DeckDeletePayload,
  DeckErrorPayload,
  DeckListPayload,
  DeckSavePayload,
  DeckSetActivePayload,
  GameAction,
  GameEvent,
  GameEventsPayload,
  GamePromptPayload,
  GameSnapshotPayload,
  RoomErrorPayload,
  RoomState
} from "@ruptura-arcana/shared";
import { Server } from "socket.io";
import { buildBotTurnAction, buildReactiveBotAction } from "./ai/botBrain";
import { prisma } from "./db/prisma";
import { type RuntimeRoom, RoomManager } from "./rooms/roomManager";
import { PersistenceService } from "./services/persistenceService";

const PORT = Number(process.env.PORT ?? 3333);
const WEB_ORIGIN = process.env.WEB_ORIGIN ?? "http://localhost:3000";
const ALLOWED_ORIGINS = WEB_ORIGIN.split(",").map((origin) => origin.trim()).filter(Boolean);
const PLAYER_HEADER = "x-player-public-id";

const app = Fastify({
  logger: true
});

const io = new Server(app.server, {
  cors: {
    origin: ALLOWED_ORIGINS,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE"]
  }
});

const roomManager = new RoomManager();
const persistence = new PersistenceService(prisma);
const socketToPlayer = new Map<string, string>();
const actionRateWindow = new Map<string, number[]>();
const botTurnTimers = new Map<string, NodeJS.Timeout>();
const botReactionTimers = new Map<string, NodeJS.Timeout>();

function getHeaderValue(value: string | string[] | undefined): string | null {
  if (Array.isArray(value)) return value[0]?.trim() || null;
  if (typeof value !== "string") return null;
  const normalized = value.trim();
  return normalized.length > 0 ? normalized : null;
}

function getPublicIdFromRequest(request: { headers: Record<string, string | string[] | undefined> }): string | null {
  return getHeaderValue(request.headers[PLAYER_HEADER] as string | string[] | undefined);
}

function emitRoomState(room: RuntimeRoom): void {
  const roomState: RoomState = roomManager.toRoomState(room);
  io.to(room.code).emit("room:state", roomState);
}

function emitRoomError(socketId: string, message: string): void {
  const payload: RoomErrorPayload = { message };
  io.to(socketId).emit("room:error", payload);
}

function emitDeckError(socketId: string, message: string): void {
  const payload: DeckErrorPayload = { message };
  io.to(socketId).emit("deck:error", payload);
}

async function emitDeckState(socketId: string, playerPublicId: string): Promise<void> {
  try {
    const state = await persistence.listDecks(playerPublicId);
    const payload: DeckListPayload = {
      decks: state.decks,
      activeDeckId: state.activeDeckId
    };
    io.to(socketId).emit("deck:list", payload);
  } catch (error) {
    emitDeckError(socketId, error instanceof Error ? error.message : "Falha ao carregar decks.");
  }
}

async function resolvePlayerDeckTemplateIds(playerPublicId: string): Promise<string[]> {
  return persistence.getActiveDeckTemplateIds(playerPublicId);
}

function emitSnapshots(room: RuntimeRoom): void {
  if (!room.gameState) return;
  for (const player of room.players) {
    if (!player.online || player.type !== "HUMAN" || !player.socketId) continue;
    const snapshot: GameSnapshotPayload = {
      version: room.gameState.version,
      state: buildSnapshotForPlayer(room.gameState, player.playerId)
    };
    io.to(player.socketId).emit("game:snapshot", snapshot);
  }
}

function emitPendingPrompt(room: RuntimeRoom): void {
  const pending = room.gameState?.pendingAttack;
  if (!pending || !pending.window) return;

  const defenderRuntime = room.players.find(
    (player) => player.playerId === pending.defenderPlayerId && player.type === "HUMAN" && Boolean(player.socketId)
  );
  if (!defenderRuntime?.socketId || !room.gameState) return;

  const defenderState = room.gameState.players.find((player) => player.id === pending.defenderPlayerId);
  if (!defenderState) return;

  const availableTrapSlots = defenderState.spellTrapZone.flatMap((card, slot) => {
    if (!card) return [];
    if (card.kind !== "TRAP") return [];
    if (card.face !== "FACE_DOWN") return [];
    if (card.setThisTurn) return [];
    return [slot];
  });

  const payload: GamePromptPayload = {
    roomCode: room.code,
    promptType: "TRAP_RESPONSE_REQUIRED",
    data: {
      attackerSlot: pending.attackerSlot,
      target: pending.target,
      availableTrapSlots,
      defenderMayRespond: pending.defenderMayRespond
    }
  };

  io.to(defenderRuntime.socketId).emit("game:prompt", payload);
}

function clearBotTimer(roomCode: string): void {
  const timer = botTurnTimers.get(roomCode);
  if (timer) {
    clearTimeout(timer);
    botTurnTimers.delete(roomCode);
  }
}

function clearBotReactionTimer(roomCode: string): void {
  const timer = botReactionTimers.get(roomCode);
  if (timer) {
    clearTimeout(timer);
    botReactionTimers.delete(roomCode);
  }
}

function randomBotDelayMs(): number {
  return 300 + Math.floor(Math.random() * 501);
}

async function finalizeFinishedMatch(room: RuntimeRoom): Promise<void> {
  if (!room.gameState || room.gameState.status !== "FINISHED") return;
  if (room.matchRecorded) return;

  room.matchRecorded = true;
  const winnerId = room.gameState.winnerId;
  if (!winnerId) return;

  const humanPlayers = room.players.filter((player) => player.type === "HUMAN");
  if (room.mode === "PVE" && room.pveConfig && humanPlayers.length > 0) {
    const human = humanPlayers[0];
    const didWin = winnerId === human.playerId;
    try {
      const reward = await persistence.recordPveResult({
        publicId: human.playerId,
        npcId: room.pveConfig.npcId,
        didWin
      });
      if (human.socketId) {
        io.to(human.socketId).emit("pve:result", {
          npcId: room.pveConfig.npcId,
          didWin,
          rewardGold: reward.rewardGold,
          rewardCards: reward.rewardCards
        });
      }
    } catch (error) {
      app.log.error({ error, roomCode: room.code }, "pve_result_record_failed");
    }
    return;
  }

  if (room.mode === "PVP" && humanPlayers.length >= 2) {
    const loser = humanPlayers.find((player) => player.playerId !== winnerId);
    const winner = humanPlayers.find((player) => player.playerId === winnerId);
    if (!winner || !loser) return;
    try {
      await persistence.recordPvpResult({
        winnerPublicId: winner.playerId,
        loserPublicId: loser.playerId
      });
    } catch (error) {
      app.log.error({ error, roomCode: room.code }, "pvp_result_record_failed");
    }
  }
}

async function applyAndBroadcastAction(room: RuntimeRoom, actorPlayerId: string, action: GameAction): Promise<{ ok: true } | { ok: false; error: string }> {
  if (!room.gameState) {
    return { ok: false, error: "No running game found" };
  }

  const validation = validateAction(room.gameState, action, actorPlayerId);
  if (!validation.ok) {
    return { ok: false, error: validation.error ?? "Invalid action" };
  }

  const { nextState, events } = applyAction(room.gameState, action, actorPlayerId);
  roomManager.setGameState(room.code, nextState);
  const eventsPayload: GameEventsPayload = {
    version: nextState.version,
    events
  };
  io.to(room.code).emit("game:events", eventsPayload);
  emitSnapshots(room);
  emitRoomState(room);
  emitPendingPrompt(room);
  await persistFusionDiscoveries(room, events);

  if (nextState.status === "FINISHED") {
    await finalizeFinishedMatch(room);
  }
  return { ok: true };
}

async function persistFusionDiscoveries(room: RuntimeRoom, events: GameEvent[]): Promise<void> {
  if (!events.length) return;

  for (const event of events) {
    if (event.type !== "FUSION_RESOLVED") continue;
    if (!event.playerId) continue;
    const runtimePlayer = room.players.find((player) => player.playerId === event.playerId);
    if (!runtimePlayer || runtimePlayer.type !== "HUMAN") continue;

    const payload = (event.payload ?? {}) as {
      discoveryKey?: unknown;
      materialsCount?: unknown;
      materialTags?: unknown;
      materialTemplateIds?: unknown;
      resultTemplateId?: unknown;
      resultName?: unknown;
    };
    if (typeof payload.discoveryKey !== "string" || payload.discoveryKey.trim().length === 0) continue;
    if (typeof payload.resultTemplateId !== "string" || payload.resultTemplateId.trim().length === 0) continue;
    if (typeof payload.resultName !== "string" || payload.resultName.trim().length === 0) continue;

    const materialTags = Array.isArray(payload.materialTags) ? payload.materialTags.map((tag) => String(tag ?? "").trim()).filter(Boolean) : [];
    const materialCardIds = Array.isArray(payload.materialTemplateIds)
      ? payload.materialTemplateIds.map((cardId) => String(cardId ?? "").trim()).filter(Boolean)
      : [];
    const materialsCount = typeof payload.materialsCount === "number" && Number.isFinite(payload.materialsCount) ? payload.materialsCount : 2;

    try {
      await persistence.registerFusionDiscovery(event.playerId, {
        key: payload.discoveryKey,
        materialsCount,
        materialTags,
        materialCardIds,
        resultCardId: payload.resultTemplateId,
        resultName: payload.resultName
      });
    } catch (error) {
      app.log.warn({ error, roomCode: room.code, playerId: event.playerId }, "fusion_discovery_save_failed");
    }
  }
}

function scheduleBotTurn(roomCode: string): void {
  clearBotTimer(roomCode);
  clearBotReactionTimer(roomCode);
  const room = roomManager.getRoomByCode(roomCode);
  if (!room || !room.gameState || room.gameState.status !== "RUNNING") return;

  const botPlayer = room.players.find((player) => player.type === "BOT");
  if (!botPlayer) return;
  if (room.gameState.pendingAttack?.window) {
    if (room.gameState.pendingAttack.defenderPlayerId === botPlayer.playerId) {
      scheduleBotReaction(roomCode);
    }
    return;
  }
  if (room.gameState.turn.playerId !== botPlayer.playerId) return;

  const timer = setTimeout(() => {
    botTurnTimers.delete(roomCode);
    void runBotTurn(roomCode);
  }, randomBotDelayMs());
  botTurnTimers.set(roomCode, timer);
}

function scheduleBotReaction(roomCode: string): void {
  clearBotReactionTimer(roomCode);
  const room = roomManager.getRoomByCode(roomCode);
  if (!room || !room.gameState || room.gameState.status !== "RUNNING") return;

  const botPlayer = room.players.find((player) => player.type === "BOT");
  if (!botPlayer) return;
  if (room.gameState.turn.playerId === botPlayer.playerId) return;

  const timer = setTimeout(() => {
    botReactionTimers.delete(roomCode);
    void runBotReaction(roomCode);
  }, randomBotDelayMs());
  botReactionTimers.set(roomCode, timer);
}

async function runBotTurn(roomCode: string): Promise<void> {
  const room = roomManager.getRoomByCode(roomCode);
  if (!room || !room.gameState || room.gameState.status !== "RUNNING") return;

  const botRuntime = room.players.find((player) => player.type === "BOT");
  if (!botRuntime) return;
  const botPlayerId = botRuntime.playerId;
  if (room.gameState.pendingAttack?.window) return;
  if (room.gameState.turn.playerId !== botPlayerId) return;

  const makeActionId = (suffix: string) => `bot-${room.code}-${Date.now()}-${suffix}`;
  const tier = room.pveConfig?.tier ?? 0;
  const plannedAction =
    buildBotTurnAction({
      state: room.gameState,
      botPlayerId,
      tier,
      makeActionId
    }) ??
    ({
      actionId: makeActionId("end"),
      type: "END_TURN",
      payload: {}
    } satisfies GameAction);

  const plannedResult = await applyAndBroadcastAction(room, botPlayerId, plannedAction);
  if (!plannedResult.ok && plannedAction.type !== "END_TURN") {
    const fallbackEndTurn: GameAction = {
      actionId: makeActionId("forced-end"),
      type: "END_TURN",
      payload: {}
    };
    const fallbackResult = await applyAndBroadcastAction(room, botPlayerId, fallbackEndTurn);
    if (fallbackResult.ok) {
      scheduleBotTurn(room.code);
    }
    return;
  }

  if (plannedResult.ok) {
    scheduleBotTurn(room.code);
  }
}

async function runBotReaction(roomCode: string): Promise<void> {
  const room = roomManager.getRoomByCode(roomCode);
  if (!room || !room.gameState || room.gameState.status !== "RUNNING") return;

  const botRuntime = room.players.find((player) => player.type === "BOT");
  if (!botRuntime) return;
  const botPlayerId = botRuntime.playerId;
  if (room.gameState.turn.playerId === botPlayerId) return;

  const makeActionId = (suffix: string) => `bot-react-${room.code}-${Date.now()}-${suffix}`;
  const tier = room.pveConfig?.tier ?? 0;
  const reaction = buildReactiveBotAction({
    state: room.gameState,
    botPlayerId,
    tier,
    makeActionId
  });
  if (!reaction) return;

  const result = await applyAndBroadcastAction(room, botPlayerId, reaction);
  if (result.ok) {
    scheduleBotTurn(room.code);
  }
}

function ensureActionRateLimit(socketId: string): boolean {
  const now = Date.now();
  const windowStart = now - 2000;
  const history = (actionRateWindow.get(socketId) ?? []).filter((timestamp) => timestamp >= windowStart);
  if (history.length > 20) {
    actionRateWindow.set(socketId, history);
    return false;
  }
  history.push(now);
  actionRateWindow.set(socketId, history);
  return true;
}

async function startMatch(room: RuntimeRoom): Promise<void> {
  if (room.players.length !== 2) {
    throw new Error("Room needs two players");
  }
  if (room.gameState?.status === "RUNNING") {
    throw new Error("Game already running");
  }

  const playersWithDeck = [] as Array<{ id: string; username: string; deckTemplateIds: string[] }>;
  for (const player of room.players) {
    if (player.type === "BOT") {
      const botDeck = room.mode === "PVE" && room.pveConfig ? room.pveConfig.botDeckTemplateIds : BASE_DECK_TEMPLATE_IDS.slice(0, 40);
      playersWithDeck.push({
        id: player.playerId,
        username: player.username,
        deckTemplateIds: botDeck
      });
      continue;
    }

    playersWithDeck.push({
      id: player.playerId,
      username: player.username,
      deckTemplateIds: await resolvePlayerDeckTemplateIds(player.playerId)
    });
  }

  const initial = createInitialState(playersWithDeck as [typeof playersWithDeck[0], typeof playersWithDeck[1]], Date.now());
  roomManager.setGameState(room.code, initial);
  emitRoomState(room);
  emitSnapshots(room);
  scheduleBotTurn(room.code);
}

await app.register(cors, {
  origin: ALLOWED_ORIGINS,
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"]
});

app.get("/health", async () => {
  return {
    ok: true,
    service: "ruptura-arcana-server"
  };
});

app.post("/api/auth/register", async (request, reply) => {
  const parsed = authRegisterSchema.safeParse(request.body ?? {});
  if (!parsed.success) {
    return reply.status(400).send({ message: parsed.error.issues.map((issue) => issue.message).join(", ") });
  }

  try {
    const result = await persistence.registerAccount(parsed.data);
    return reply.send(result);
  } catch (error) {
    return reply.status(400).send({ message: error instanceof Error ? error.message : "Falha ao criar conta." });
  }
});

app.post("/api/auth/login", async (request, reply) => {
  const parsed = authLoginSchema.safeParse(request.body ?? {});
  if (!parsed.success) {
    return reply.status(400).send({ message: parsed.error.issues.map((issue) => issue.message).join(", ") });
  }

  try {
    const result = await persistence.loginAccount(parsed.data);
    return reply.send(result);
  } catch (error) {
    return reply.status(400).send({ message: error instanceof Error ? error.message : "Falha ao autenticar." });
  }
});

app.post("/api/player/hello", async (request, reply) => {
  const body = (request.body ?? {}) as { publicId?: string; username?: string };
  try {
    const result = await persistence.hello({
      publicId: body.publicId,
      username: body.username
    });
    return reply.send(result);
  } catch (error) {
    return reply.status(400).send({ message: error instanceof Error ? error.message : "Falha ao iniciar sessao." });
  }
});

app.get("/api/player/profile", async (request, reply) => {
  const publicId = getPublicIdFromRequest(request);
  if (!publicId) {
    return reply.status(401).send({ message: `Header '${PLAYER_HEADER}' obrigatorio.` });
  }
  try {
    const profile = await persistence.getPlayerByPublicId(publicId);
    return reply.send({ player: profile });
  } catch (error) {
    return reply.status(404).send({ message: error instanceof Error ? error.message : "Player nao encontrado." });
  }
});

app.patch("/api/player/profile", async (request, reply) => {
  const publicId = getPublicIdFromRequest(request);
  if (!publicId) {
    return reply.status(401).send({ message: `Header '${PLAYER_HEADER}' obrigatorio.` });
  }
  const body = (request.body ?? {}) as { username?: string };
  if (!body.username || typeof body.username !== "string") {
    return reply.status(400).send({ message: "Campo username obrigatorio." });
  }
  try {
    const player = await persistence.updateProfile(publicId, body.username);
    return reply.send({ player });
  } catch (error) {
    return reply.status(400).send({ message: error instanceof Error ? error.message : "Falha ao atualizar perfil." });
  }
});

app.post("/api/player/reset", async (request, reply) => {
  const publicId = getPublicIdFromRequest(request);
  if (!publicId) {
    return reply.status(401).send({ message: `Header '${PLAYER_HEADER}' obrigatorio.` });
  }

  try {
    const player = await persistence.resetPlayerProgress(publicId);
    const decks = await persistence.listDecks(publicId);
    return reply.send({ player, decks });
  } catch (error) {
    return reply.status(400).send({ message: error instanceof Error ? error.message : "Falha ao resetar progresso." });
  }
});

app.get("/api/decks", async (request, reply) => {
  const publicId = getPublicIdFromRequest(request);
  if (!publicId) {
    return reply.status(401).send({ message: `Header '${PLAYER_HEADER}' obrigatorio.` });
  }
  try {
    const decks = await persistence.listDecks(publicId);
    return reply.send(decks);
  } catch (error) {
    return reply.status(400).send({ message: error instanceof Error ? error.message : "Falha ao buscar decks." });
  }
});

app.post("/api/decks", async (request, reply) => {
  const publicId = getPublicIdFromRequest(request);
  if (!publicId) {
    return reply.status(401).send({ message: `Header '${PLAYER_HEADER}' obrigatorio.` });
  }
  const body = (request.body ?? {}) as { deck?: Deck };
  if (!body.deck) {
    return reply.status(400).send({ message: "Campo deck obrigatorio." });
  }
  try {
    const decks = await persistence.saveDeck(publicId, body.deck);
    return reply.send(decks);
  } catch (error) {
    return reply.status(400).send({ message: error instanceof Error ? error.message : "Falha ao salvar deck." });
  }
});

app.put("/api/decks/:id", async (request, reply) => {
  const publicId = getPublicIdFromRequest(request);
  if (!publicId) {
    return reply.status(401).send({ message: `Header '${PLAYER_HEADER}' obrigatorio.` });
  }
  const params = request.params as { id: string };
  const body = (request.body ?? {}) as { deck?: Deck };
  if (!body.deck) {
    return reply.status(400).send({ message: "Campo deck obrigatorio." });
  }
  if (body.deck.id !== params.id) {
    return reply.status(400).send({ message: "ID do path e do body precisam ser iguais." });
  }
  try {
    const decks = await persistence.saveDeck(publicId, body.deck);
    return reply.send(decks);
  } catch (error) {
    return reply.status(400).send({ message: error instanceof Error ? error.message : "Falha ao atualizar deck." });
  }
});

app.delete("/api/decks/:id", async (request, reply) => {
  const publicId = getPublicIdFromRequest(request);
  if (!publicId) {
    return reply.status(401).send({ message: `Header '${PLAYER_HEADER}' obrigatorio.` });
  }
  const params = request.params as { id: string };
  try {
    const decks = await persistence.deleteDeck(publicId, params.id);
    return reply.send(decks);
  } catch (error) {
    return reply.status(400).send({ message: error instanceof Error ? error.message : "Falha ao remover deck." });
  }
});

app.post("/api/decks/:id/active", async (request, reply) => {
  const publicId = getPublicIdFromRequest(request);
  if (!publicId) {
    return reply.status(401).send({ message: `Header '${PLAYER_HEADER}' obrigatorio.` });
  }
  const params = request.params as { id: string };
  try {
    const decks = await persistence.setActiveDeck(publicId, params.id);
    return reply.send(decks);
  } catch (error) {
    return reply.status(400).send({ message: error instanceof Error ? error.message : "Falha ao ativar deck." });
  }
});

app.get("/api/collection", async (request, reply) => {
  const publicId = getPublicIdFromRequest(request);
  if (!publicId) {
    return reply.status(401).send({ message: `Header '${PLAYER_HEADER}' obrigatorio.` });
  }
  try {
    const collection = await persistence.getCollection(publicId);
    return reply.send({ collection });
  } catch (error) {
    return reply.status(400).send({ message: error instanceof Error ? error.message : "Falha ao buscar colecao." });
  }
});

app.get("/api/shop/offers", async (request, reply) => {
  const publicId = getPublicIdFromRequest(request);
  if (!publicId) {
    return reply.status(401).send({ message: `Header '${PLAYER_HEADER}' obrigatorio.` });
  }

  const query = (request.query ?? {}) as { limit?: string | number };
  const rawLimit = typeof query.limit === "string" ? Number(query.limit) : query.limit;
  const limit = typeof rawLimit === "number" && Number.isFinite(rawLimit) ? rawLimit : 20;

  try {
    const shop = await persistence.listShopOffers(publicId, limit);
    return reply.send(shop);
  } catch (error) {
    return reply.status(400).send({ message: error instanceof Error ? error.message : "Falha ao buscar ofertas da loja." });
  }
});

app.get("/api/shop/config", async (_request, reply) => {
  try {
    const config = persistence.getShopConfig();
    return reply.send({ config });
  } catch (error) {
    return reply.status(400).send({ message: error instanceof Error ? error.message : "Falha ao buscar configuracao da loja." });
  }
});

app.post("/api/shop/reroll", async (request, reply) => {
  const publicId = getPublicIdFromRequest(request);
  if (!publicId) {
    return reply.status(401).send({ message: `Header '${PLAYER_HEADER}' obrigatorio.` });
  }

  const body = (request.body ?? {}) as { limit?: number };
  const rawLimit = typeof body.limit === "number" && Number.isFinite(body.limit) ? body.limit : 20;

  try {
    const result = await persistence.rerollShopOffers(publicId, rawLimit);
    return reply.send(result);
  } catch (error) {
    return reply.status(400).send({ message: error instanceof Error ? error.message : "Falha ao atualizar ofertas da loja." });
  }
});

app.post("/api/shop/purchase", async (request, reply) => {
  const publicId = getPublicIdFromRequest(request);
  if (!publicId) {
    return reply.status(401).send({ message: `Header '${PLAYER_HEADER}' obrigatorio.` });
  }

  const body = (request.body ?? {}) as { cardId?: string };
  if (!body.cardId || typeof body.cardId !== "string") {
    return reply.status(400).send({ message: "cardId obrigatorio." });
  }

  try {
    const result = await persistence.purchaseShopCard(publicId, body.cardId);
    return reply.send(result);
  } catch (error) {
    return reply.status(400).send({ message: error instanceof Error ? error.message : "Falha ao comprar carta." });
  }
});

app.post("/api/shop/booster/open", async (request, reply) => {
  const publicId = getPublicIdFromRequest(request);
  if (!publicId) {
    return reply.status(401).send({ message: `Header '${PLAYER_HEADER}' obrigatorio.` });
  }

  const body = (request.body ?? {}) as { packType?: string };
  const packType = String(body.packType ?? "").toUpperCase();
  if (packType !== "BEGINNER" && packType !== "INTERMEDIATE" && packType !== "ADVANCED") {
    return reply.status(400).send({ message: "packType invalido. Use BEGINNER, INTERMEDIATE ou ADVANCED." });
  }

  try {
    const result = await persistence.openShopBooster(publicId, packType);
    return reply.send(result);
  } catch (error) {
    return reply.status(400).send({ message: error instanceof Error ? error.message : "Falha ao abrir pacote da loja." });
  }
});

app.get("/api/fusions/log", async (request, reply) => {
  const publicId = getPublicIdFromRequest(request);
  if (!publicId) {
    return reply.status(401).send({ message: `Header '${PLAYER_HEADER}' obrigatorio.` });
  }
  try {
    const discoveries = await persistence.listFusionDiscoveries(publicId);
    return reply.send({ discoveries });
  } catch (error) {
    return reply.status(400).send({ message: error instanceof Error ? error.message : "Falha ao buscar fusion log." });
  }
});

app.post("/api/fusions/sync", async (request, reply) => {
  const publicId = getPublicIdFromRequest(request);
  if (!publicId) {
    return reply.status(401).send({ message: `Header '${PLAYER_HEADER}' obrigatorio.` });
  }

  const body = (request.body ?? {}) as {
    discoveries?: Array<{
      key?: unknown;
      materialsCount?: unknown;
      materialTags?: unknown;
      materialCardIds?: unknown;
      resultCardId?: unknown;
      resultName?: unknown;
    }>;
  };
  const rawRows = Array.isArray(body.discoveries) ? body.discoveries : [];
  const rows = rawRows
    .map((row) => ({
      key: typeof row.key === "string" ? row.key.trim() : "",
      materialsCount: typeof row.materialsCount === "number" ? row.materialsCount : 2,
      materialTags: Array.isArray(row.materialTags) ? row.materialTags.map((tag) => String(tag ?? "").trim()).filter(Boolean) : [],
      materialCardIds: Array.isArray(row.materialCardIds)
        ? row.materialCardIds.map((cardId) => String(cardId ?? "").trim()).filter(Boolean)
        : [],
      resultCardId: typeof row.resultCardId === "string" ? row.resultCardId.trim() : "",
      resultName: typeof row.resultName === "string" ? row.resultName.trim() : ""
    }))
    .filter((row) => row.key && row.resultCardId && row.resultName);

  try {
    const discoveries = await persistence.syncFusionDiscoveries(publicId, rows);
    return reply.send({ discoveries });
  } catch (error) {
    return reply.status(400).send({ message: error instanceof Error ? error.message : "Falha ao sincronizar fusion log." });
  }
});

app.post("/api/fusions/test", async (request, reply) => {
  const publicId = getPublicIdFromRequest(request);
  if (!publicId) {
    return reply.status(401).send({ message: `Header '${PLAYER_HEADER}' obrigatorio.` });
  }

  const body = (request.body ?? {}) as {
    materials?: unknown;
  };
  const materials = Array.isArray(body.materials) ? body.materials.map((cardId) => String(cardId ?? "").trim()).filter(Boolean) : [];

  try {
    const result = await persistence.testFusion(publicId, materials);
    return reply.send(result);
  } catch (error) {
    return reply.status(400).send({ message: error instanceof Error ? error.message : "Falha ao testar fusao." });
  }
});

app.get("/api/pve/npcs", async (request, reply) => {
  const publicId = getPublicIdFromRequest(request);
  if (!publicId) {
    return reply.status(401).send({ message: `Header '${PLAYER_HEADER}' obrigatorio.` });
  }
  try {
    const npcs = await persistence.listPveNpcs(publicId);
    return reply.send({ npcs });
  } catch (error) {
    return reply.status(400).send({ message: error instanceof Error ? error.message : "Falha ao buscar NPCs." });
  }
});

app.post("/api/pve/start", async (request, reply) => {
  const publicId = getPublicIdFromRequest(request);
  if (!publicId) {
    return reply.status(401).send({ message: `Header '${PLAYER_HEADER}' obrigatorio.` });
  }
  const body = (request.body ?? {}) as { npcId?: string };
  if (!body.npcId) {
    return reply.status(400).send({ message: "npcId obrigatorio." });
  }

  try {
    const existingRoom = roomManager.getRoomByPlayer(publicId);
    if (existingRoom) {
      const left = roomManager.leaveRoom(publicId);
      clearBotTimer(existingRoom.code);
      clearBotReactionTimer(existingRoom.code);
      if (left) emitRoomState(left);
    }

    const { npc, player } = await persistence.getPveNpcForStart(publicId, body.npcId);
    const botPlayerId = `NPC-${npc.id}-${randomUUID().slice(0, 8)}`;
    const room = roomManager.createSoloRoom({
      playerId: publicId,
      username: player.username,
      socketId: null,
      botPlayerId,
      botUsername: npc.name,
      mode: "PVE",
      pveConfig: {
        npcId: npc.id,
        npcName: npc.name,
        tier: npc.tier,
        rewardGold: npc.rewardGold,
        rewardCards: npc.rewardCards,
        botDeckTemplateIds: npc.deckTemplateIds
      }
    });
    await startMatch(room);

    return reply.send({
      roomCode: room.code,
      npc: {
        id: npc.id,
        name: npc.name,
        tier: npc.tier
      }
    });
  } catch (error) {
    return reply.status(400).send({ message: error instanceof Error ? error.message : "Falha ao iniciar duelo PVE." });
  }
});

io.on("connection", (socket) => {
  app.log.info({ socketId: socket.id }, "socket_connected");

  socket.on("auth:hello", async (rawPayload) => {
    const parsed = authHelloSchema.safeParse(rawPayload ?? {});
    if (!parsed.success) {
      emitRoomError(socket.id, "Invalid auth payload");
      return;
    }
    if (!parsed.data.storedPlayerId) {
      emitRoomError(socket.id, "Login necessario. Entre com sua conta no lobby.");
      return;
    }

    try {
      const profile = await persistence.getPlayerByPublicId(parsed.data.storedPlayerId);
      const playerId = profile.publicId;
      socketToPlayer.set(socket.id, playerId);
      socket.data.playerId = playerId;

      const room = roomManager.setPlayerOnlineStatus(playerId, socket.id, true);
      if (room) {
        socket.join(room.code);
        emitRoomState(room);
        emitSnapshots(room);
      }

      socket.emit("auth:session", {
        playerId
      });
      await emitDeckState(socket.id, playerId);
    } catch (error) {
      emitRoomError(socket.id, error instanceof Error ? error.message : "Falha ao iniciar sessao.");
    }
  });

  socket.on("deck:list", async () => {
    const playerId = socket.data.playerId as string | undefined;
    if (!playerId) {
      emitDeckError(socket.id, "Auth session is required");
      return;
    }
    await emitDeckState(socket.id, playerId);
  });

  socket.on("deck:save", async (rawPayload) => {
    const playerId = socket.data.playerId as string | undefined;
    if (!playerId) {
      emitDeckError(socket.id, "Auth session is required");
      return;
    }

    const parsed = deckSaveSchema.safeParse(rawPayload);
    if (!parsed.success) {
      emitDeckError(socket.id, "Invalid deck:save payload");
      return;
    }

    const payload: DeckSavePayload = parsed.data;
    const validation = validateDeck(payload.deck);
    if (!validation.ok) {
      emitDeckError(socket.id, validation.errors.join(" | "));
      return;
    }

    try {
      await persistence.saveDeck(playerId, payload.deck);
      await emitDeckState(socket.id, playerId);
    } catch (error) {
      emitDeckError(socket.id, error instanceof Error ? error.message : "Falha ao salvar deck.");
    }
  });

  socket.on("deck:delete", async (rawPayload) => {
    const playerId = socket.data.playerId as string | undefined;
    if (!playerId) {
      emitDeckError(socket.id, "Auth session is required");
      return;
    }

    const parsed = deckDeleteSchema.safeParse(rawPayload);
    if (!parsed.success) {
      emitDeckError(socket.id, "Invalid deck:delete payload");
      return;
    }

    const payload: DeckDeletePayload = parsed.data;
    try {
      await persistence.deleteDeck(playerId, payload.deckId);
      await emitDeckState(socket.id, playerId);
    } catch (error) {
      emitDeckError(socket.id, error instanceof Error ? error.message : "Falha ao remover deck.");
    }
  });

  socket.on("deck:setActive", async (rawPayload) => {
    const playerId = socket.data.playerId as string | undefined;
    if (!playerId) {
      emitDeckError(socket.id, "Auth session is required");
      return;
    }

    const parsed = deckSetActiveSchema.safeParse(rawPayload);
    if (!parsed.success) {
      emitDeckError(socket.id, "Invalid deck:setActive payload");
      return;
    }

    const payload: DeckSetActivePayload = parsed.data;
    try {
      await persistence.setActiveDeck(playerId, payload.deckId);
      await emitDeckState(socket.id, playerId);
    } catch (error) {
      emitDeckError(socket.id, error instanceof Error ? error.message : "Unable to set active deck");
    }
  });

  socket.on("room:create", (rawPayload) => {
    const playerId = socket.data.playerId as string | undefined;
    if (!playerId) {
      emitRoomError(socket.id, "Auth session is required");
      return;
    }

    const parsed = roomCreateSchema.safeParse(rawPayload);
    if (!parsed.success) {
      emitRoomError(socket.id, "Invalid room:create payload");
      return;
    }

    try {
      const room = roomManager.createRoom({
        socketId: socket.id,
        playerId,
        username: parsed.data.username
      });
      socket.join(room.code);
      emitRoomState(room);
      app.log.info({ roomCode: room.code, playerId }, "room_created");
    } catch (error) {
      emitRoomError(socket.id, error instanceof Error ? error.message : "Unable to create room");
    }
  });

  socket.on("room:solo", async (rawPayload) => {
    const playerId = socket.data.playerId as string | undefined;
    if (!playerId) {
      emitRoomError(socket.id, "Auth session is required");
      return;
    }

    const parsed = roomSoloSchema.safeParse(rawPayload);
    if (!parsed.success) {
      emitRoomError(socket.id, "Invalid room:solo payload");
      return;
    }

    try {
      const room = roomManager.createSoloRoom({
        socketId: socket.id,
        playerId,
        username: parsed.data.username,
        mode: "PVE"
      });
      socket.join(room.code);
      await startMatch(room);
      app.log.info({ roomCode: room.code, playerId }, "room_solo_created");
    } catch (error) {
      emitRoomError(socket.id, error instanceof Error ? error.message : "Unable to start solo room");
    }
  });

  socket.on("room:join", async (rawPayload) => {
    const playerId = socket.data.playerId as string | undefined;
    if (!playerId) {
      emitRoomError(socket.id, "Auth session is required");
      return;
    }

    const parsed = roomJoinSchema.safeParse(rawPayload);
    if (!parsed.success) {
      emitRoomError(socket.id, "Invalid room:join payload");
      return;
    }

    try {
      const room = roomManager.joinRoom({
        code: parsed.data.roomCode.toUpperCase(),
        socketId: socket.id,
        playerId,
        username: parsed.data.username
      });
      socket.join(room.code);
      emitRoomState(room);
      emitSnapshots(room);
      app.log.info({ roomCode: room.code, playerId }, "room_joined");
    } catch (error) {
      emitRoomError(socket.id, error instanceof Error ? error.message : "Unable to join room");
    }
  });

  socket.on("room:leave", () => {
    const playerId = socket.data.playerId as string | undefined;
    if (!playerId) return;

    const currentRoom = roomManager.getRoomByPlayer(playerId);
    const room = roomManager.leaveRoom(playerId);
    if (currentRoom) {
      socket.leave(currentRoom.code);
      if (!room || room.code !== currentRoom.code) {
        clearBotTimer(currentRoom.code);
        clearBotReactionTimer(currentRoom.code);
      }
    }
    if (room) emitRoomState(room);
    app.log.info({ playerId }, "room_left");
  });

  socket.on("room:ready", async (rawPayload) => {
    const playerId = socket.data.playerId as string | undefined;
    if (!playerId) {
      emitRoomError(socket.id, "Auth session is required");
      return;
    }

    const parsed = roomReadySchema.safeParse(rawPayload);
    if (!parsed.success) {
      emitRoomError(socket.id, "Invalid room:ready payload");
      return;
    }

    try {
      if (parsed.data.ready) {
        await resolvePlayerDeckTemplateIds(playerId);
      }
      const room = roomManager.setReady(playerId, parsed.data.ready);
      emitRoomState(room);
      if (roomManager.shouldAutoStart(room)) {
        await startMatch(room);
      }
    } catch (error) {
      emitRoomError(socket.id, error instanceof Error ? error.message : "Unable to set ready state");
    }
  });

  socket.on("room:start", async () => {
    const playerId = socket.data.playerId as string | undefined;
    if (!playerId) {
      emitRoomError(socket.id, "Auth session is required");
      return;
    }

    const room = roomManager.getRoomByPlayer(playerId);
    if (!room) {
      emitRoomError(socket.id, "You are not in a room");
      return;
    }
    if (room.hostId !== playerId) {
      emitRoomError(socket.id, "Only host can start the match");
      return;
    }
    if (room.players.length !== 2) {
      emitRoomError(socket.id, "Room must have exactly 2 players");
      return;
    }

    try {
      await startMatch(room);
    } catch (error) {
      emitRoomError(socket.id, error instanceof Error ? error.message : "Unable to start match");
    }
  });

  socket.on("game:action", async (rawPayload) => {
    const playerId = socket.data.playerId as string | undefined;
    if (!playerId) {
      socket.emit("game:error", { message: "Auth session is required" });
      return;
    }
    if (!ensureActionRateLimit(socket.id)) {
      socket.emit("game:error", { message: "Too many actions. Slow down." });
      return;
    }

    const parsed = gameActionSchema.safeParse(rawPayload);
    if (!parsed.success) {
      socket.emit("game:error", { message: "Invalid game action payload" });
      return;
    }

    const payloadSchema = gameActionPayloadSchemas[parsed.data.type];
    const payloadResult = payloadSchema.safeParse(parsed.data.payload);
    if (!payloadResult.success) {
      socket.emit("game:error", {
        actionId: parsed.data.actionId,
        message: payloadResult.error.issues.map((issue) => issue.message).join(", ")
      });
      return;
    }

    const room = roomManager.getRoomByPlayer(playerId);
    if (!room || !room.gameState) {
      socket.emit("game:error", {
        actionId: parsed.data.actionId,
        message: "No running game found"
      });
      return;
    }

    try {
      const action: GameAction = {
        actionId: parsed.data.actionId,
        type: parsed.data.type,
        payload: payloadResult.data as GameAction["payload"]
      } as GameAction;
      const result = await applyAndBroadcastAction(room, playerId, action);
      if (!result.ok) {
        socket.emit("game:error", {
          actionId: parsed.data.actionId,
          message: result.error
        });
        return;
      }
      scheduleBotTurn(room.code);
      scheduleBotReaction(room.code);
    } catch (error) {
      socket.emit("game:error", {
        actionId: parsed.data.actionId,
        message: error instanceof Error ? error.message : "Action failed"
      });
    }
  });

  socket.on("disconnect", () => {
    const playerId = socketToPlayer.get(socket.id);
    if (!playerId) return;

    socketToPlayer.delete(socket.id);
    actionRateWindow.delete(socket.id);
    const room = roomManager.setPlayerOnlineStatus(playerId, null, false);
    if (room) {
      emitRoomState(room);
      scheduleBotTurn(room.code);
    }
    app.log.info({ socketId: socket.id, playerId }, "socket_disconnected");
  });
});

setInterval(() => {
  const removed = roomManager.cleanup();
  if (removed.length) {
    removed.forEach((roomCode) => {
      clearBotTimer(roomCode);
      clearBotReactionTimer(roomCode);
    });
    app.log.info({ roomCodes: removed }, "rooms_cleaned");
  }
}, 60_000);

try {
  await persistence.syncCatalogAndNpcSeed();
  const missing = persistence.getMissingNpcCards();
  if (missing.length > 0) {
    app.log.warn({ missingCount: missing.length, cards: missing }, "fm_npc_cards_missing");
  }
} catch (error) {
  app.log.error({ error }, "startup_seed_failed");
}

app
  .listen({
    host: "0.0.0.0",
    port: PORT
  })
  .then(() => {
    app.log.info({ port: PORT, webOrigin: ALLOWED_ORIGINS }, "server_started");
  })
  .catch((error) => {
    app.log.error(error, "server_start_failed");
    process.exit(1);
  });
