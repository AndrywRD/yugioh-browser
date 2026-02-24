import type { GameState, RoomPlayer, RoomState } from "@ruptura-arcana/shared";

export interface RuntimeRoomPlayer extends RoomPlayer {
  online: boolean;
}

export interface RuntimePveConfig {
  npcId: string;
  npcName: string;
  tier: number;
  rewardGold: number;
  rewardCards: Array<{ cardId: string; chance: number; minCount: number; maxCount: number }>;
  botDeckTemplateIds: string[];
}

export interface RuntimeRoom {
  code: string;
  hostId: string;
  mode: "PVP" | "PVE";
  players: RuntimeRoomPlayer[];
  gameState?: GameState;
  pveConfig?: RuntimePveConfig;
  matchRecorded?: boolean;
  createdAt: number;
  lastActivity: number;
}

function randomCode(size = 5): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let value = "";
  for (let i = 0; i < size; i += 1) {
    value += chars[Math.floor(Math.random() * chars.length)];
  }
  return value;
}

export class RoomManager {
  private rooms = new Map<string, RuntimeRoom>();
  private playerToRoom = new Map<string, string>();

  createRoom(host: { socketId: string; playerId: string; username: string }): RuntimeRoom {
    if (this.playerToRoom.has(host.playerId)) {
      throw new Error("Player already in a room");
    }

    let code = randomCode();
    while (this.rooms.has(code)) {
      code = randomCode();
    }

    const room: RuntimeRoom = {
      code,
      hostId: host.playerId,
      mode: "PVP",
      players: [
        {
          socketId: host.socketId,
          playerId: host.playerId,
          username: host.username,
          ready: false,
          type: "HUMAN",
          online: true
        }
      ],
      matchRecorded: false,
      createdAt: Date.now(),
      lastActivity: Date.now()
    };

    this.rooms.set(code, room);
    this.playerToRoom.set(host.playerId, code);
    return room;
  }

  createSoloRoom(input: {
    socketId?: string | null;
    playerId: string;
    username: string;
    botPlayerId?: string;
    botUsername?: string;
    mode?: "PVP" | "PVE";
    pveConfig?: RuntimePveConfig;
  }): RuntimeRoom {
    if (this.playerToRoom.has(input.playerId)) {
      throw new Error("Player already in a room");
    }

    let code = randomCode();
    while (this.rooms.has(code)) {
      code = randomCode();
    }

    const botId = input.botPlayerId ?? `BOT-${code}`;
    const room: RuntimeRoom = {
      code,
      hostId: input.playerId,
      mode: input.mode ?? "PVE",
      pveConfig: input.pveConfig,
      players: [
        {
          socketId: input.socketId ?? undefined,
          playerId: input.playerId,
          username: input.username,
          ready: true,
          type: "HUMAN",
          online: Boolean(input.socketId)
        },
        {
          playerId: botId,
          username: input.botUsername ?? "Arcana BOT",
          ready: true,
          type: "BOT",
          online: true
        }
      ],
      matchRecorded: false,
      createdAt: Date.now(),
      lastActivity: Date.now()
    };

    this.rooms.set(code, room);
    this.playerToRoom.set(input.playerId, code);
    this.playerToRoom.set(botId, code);
    return room;
  }

  joinRoom(input: { code: string; socketId: string; playerId: string; username: string }): RuntimeRoom {
    const room = this.rooms.get(input.code);
    if (!room) throw new Error("Room not found");

    const existing = room.players.find((player) => player.playerId === input.playerId);
    if (existing) {
      existing.socketId = input.socketId;
      existing.online = true;
      existing.username = input.username;
      room.lastActivity = Date.now();
      this.playerToRoom.set(input.playerId, room.code);
      return room;
    }

    if (room.players.length >= 2) throw new Error("Room is full");
    if (this.playerToRoom.has(input.playerId)) throw new Error("Player already in another room");

    room.players.push({
      socketId: input.socketId,
      playerId: input.playerId,
      username: input.username,
      ready: false,
      type: "HUMAN",
      online: true
    });
    room.lastActivity = Date.now();
    this.playerToRoom.set(input.playerId, room.code);
    return room;
  }

  getRoomByCode(code: string): RuntimeRoom | undefined {
    return this.rooms.get(code);
  }

  getRoomByPlayer(playerId: string): RuntimeRoom | undefined {
    const code = this.playerToRoom.get(playerId);
    if (!code) return undefined;
    return this.rooms.get(code);
  }

  setPlayerOnlineStatus(playerId: string, socketId: string | null, online: boolean): RuntimeRoom | undefined {
    const room = this.getRoomByPlayer(playerId);
    if (!room) return undefined;
    const player = room.players.find((item) => item.playerId === playerId);
    if (!player) return undefined;

    if (player.type === "BOT") {
      return room;
    }
    player.online = online;
    if (socketId) {
      player.socketId = socketId;
    }
    room.lastActivity = Date.now();
    return room;
  }

  setReady(playerId: string, ready: boolean): RuntimeRoom {
    const room = this.getRoomByPlayer(playerId);
    if (!room) throw new Error("Room not found for player");

    const player = room.players.find((item) => item.playerId === playerId);
    if (!player) throw new Error("Player not found in room");
    player.ready = ready;
    room.lastActivity = Date.now();
    return room;
  }

  leaveRoom(playerId: string): RuntimeRoom | undefined {
    const room = this.getRoomByPlayer(playerId);
    if (!room) return undefined;

    const leaving = room.players.find((player) => player.playerId === playerId);
    room.players = room.players.filter((player) => player.playerId !== playerId);
    this.playerToRoom.delete(playerId);
    room.lastActivity = Date.now();

    const hasHuman = room.players.some((player) => player.type === "HUMAN");
    if (room.players.length === 0 || !hasHuman) {
      for (const player of room.players) {
        this.playerToRoom.delete(player.playerId);
      }
      this.rooms.delete(room.code);
      return undefined;
    }

    if (room.hostId === playerId || leaving?.type === "BOT") {
      room.hostId = room.players.find((player) => player.type === "HUMAN")?.playerId ?? room.players[0].playerId;
    }
    return room;
  }

  setGameState(roomCode: string, state: GameState): RuntimeRoom {
    const room = this.rooms.get(roomCode);
    if (!room) throw new Error("Room not found");
    room.gameState = state;
    if (state.status === "RUNNING") {
      room.matchRecorded = false;
    }
    room.lastActivity = Date.now();
    return room;
  }

  toRoomState(room: RuntimeRoom): RoomState {
    return {
      roomCode: room.code,
      status: room.gameState ? (room.gameState.status === "RUNNING" ? "RUNNING" : "FINISHED") : "LOBBY",
      hostId: room.hostId,
      players: room.players.map((player) => ({
        playerId: player.playerId,
        username: player.username,
        ready: player.ready,
        online: player.online,
        type: player.type
      }))
    };
  }

  shouldAutoStart(room: RuntimeRoom): boolean {
    return room.players.length === 2 && room.players.every((player) => player.ready) && !room.gameState;
  }

  cleanup(): string[] {
    const now = Date.now();
    const removed: string[] = [];

    for (const room of this.rooms.values()) {
      const isEmpty = room.players.length === 0;
      const humanPlayers = room.players.filter((player) => player.type === "HUMAN");
      const allOffline = humanPlayers.length > 0 && humanPlayers.every((player) => !player.online);
      const inactiveMs = now - room.lastActivity;
      const remove = isEmpty || (allOffline && inactiveMs > 10 * 60_000) || inactiveMs > 60 * 60_000;
      if (!remove) continue;

      for (const player of room.players) {
        this.playerToRoom.delete(player.playerId);
      }
      this.rooms.delete(room.code);
      removed.push(room.code);
    }
    return removed;
  }
}
