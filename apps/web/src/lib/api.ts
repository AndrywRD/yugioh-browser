"use client";

import type { Deck } from "@ruptura-arcana/shared";

export const PUBLIC_ID_STORAGE_KEY = "ruptura_arcana_player_id";

const SERVER_URL = process.env.NEXT_PUBLIC_SERVER_URL ?? "http://localhost:3333";
const REQUEST_TIMEOUT_MS = Number(process.env.NEXT_PUBLIC_API_TIMEOUT_MS ?? 20000);

function buildUrl(path: string): string {
  return `${SERVER_URL}${path}`;
}

async function fetchWithNetworkHint(path: string, init?: RequestInit): Promise<Response> {
  const controller = new AbortController();
  const timeout = globalThis.setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    return await fetch(buildUrl(path), {
      ...init,
      signal: init?.signal ?? controller.signal
    });
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") {
      throw new Error(
        "Tempo limite de conexao excedido. O backend pode estar acordando do idle. Aguarde alguns segundos e tente novamente."
      );
    }
    if (error instanceof TypeError) {
      throw new Error(
        "Falha de conexao com o servidor. Verifique NEXT_PUBLIC_SERVER_URL no frontend e WEB_ORIGIN no backend."
      );
    }
    throw error;
  } finally {
    globalThis.clearTimeout(timeout);
  }
}

async function parseJsonResponse<T>(response: Response): Promise<T> {
  const payload = (await response.json().catch(() => ({}))) as { message?: string };
  if (!response.ok) {
    throw new Error(payload.message ?? `Erro HTTP ${response.status}`);
  }
  return payload as T;
}

function withPlayerHeader(publicId: string): HeadersInit {
  return {
    "x-player-public-id": publicId
  };
}

export interface PlayerProfile {
  id: string;
  publicId: string;
  username: string;
  gold: number;
  xp: number;
  level: number;
  lifetimeXp: number;
  achievementPoints: number;
  deckSlotLimit: number;
  activeTitle: string | null;
  winsPve: number;
  winsPvp: number;
}

export interface LevelProgress {
  level: number;
  xp: number;
  lifetimeXp: number;
  xpInLevel: number;
  xpToNextLevel: number;
  totalToCurrentLevel: number;
  totalToNextLevel: number;
}

export interface PlayerAchievement {
  key: string;
  title: string;
  description: string;
  rewardGold: number;
  rewardXp: number;
  rewardDeckSlots: number;
  rewardTitle: string | null;
  progressSnapshot: number;
  unlockedAt: number;
}

export interface ProgressionResponse {
  player: PlayerProfile;
  levelProgress: LevelProgress;
  achievements: PlayerAchievement[];
  availableAchievements: number;
}

export interface AchievementDashboardEntry {
  key: string;
  title: string;
  description: string;
  progress: number;
  target: number;
  completed: boolean;
  unlocked: boolean;
  unlockedAt: number | null;
  rewardGold: number;
  rewardXp: number;
  rewardDeckSlots: number;
  rewardTitle: string | null;
}

export interface PlayerTitleEntry {
  name: string;
  equipped: boolean;
}

export interface AchievementDashboardResponse {
  player: PlayerProfile;
  achievements: AchievementDashboardEntry[];
  titles: PlayerTitleEntry[];
}

export interface PvpLobbyPlayer {
  playerId: string;
  username: string;
  inRoom: boolean;
  roomCode: string | null;
}

export interface PvpLobbyRoom {
  roomCode: string;
  hostUsername: string;
  players: Array<{ playerId: string; username: string; online: boolean }>;
  playerCount: number;
  status: "LOBBY" | "RUNNING" | "FINISHED";
}

export interface PvpLobbySnapshot {
  onlinePlayers: PvpLobbyPlayer[];
  openRooms: PvpLobbyRoom[];
}

export function getStoredPublicId(): string | null {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(PUBLIC_ID_STORAGE_KEY);
}

export function setStoredPublicId(publicId: string): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(PUBLIC_ID_STORAGE_KEY, publicId);
}

export function clearStoredPublicId(): void {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(PUBLIC_ID_STORAGE_KEY);
}

export interface DeckListResponse {
  decks: Deck[];
  activeDeckId: string | null;
}

export interface CollectionEntry {
  cardId: string;
  count: number;
  name: string;
  kind: "MONSTER" | "SPELL" | "TRAP";
  atk: number;
  def: number;
  tags: string[];
  effectDescription?: string;
  imagePath?: string;
  password?: string;
  cost?: number;
  catalogNumber?: number;
}

export type ShopOfferSegment = "INICIANTE" | "INTERMEDIARIO" | "AVANCADO";
export type ShopCardRarity = "C" | "R" | "SR" | "UR";
export type BoosterPackType = "BEGINNER" | "INTERMEDIATE" | "ADVANCED";

export interface ShopOffer {
  cardId: string;
  name: string;
  kind: "MONSTER" | "SPELL" | "TRAP";
  atk: number;
  def: number;
  tags: string[];
  effectDescription?: string;
  imagePath?: string;
  password?: string;
  cost?: number;
  catalogNumber?: number;
  price: number;
  score: number;
  affordable: boolean;
  owned: number;
  segment: ShopOfferSegment;
  rarity: ShopCardRarity;
}

export interface ShopMeta {
  rotationKey: string;
  nextRotationAt: number;
  rerollUsed: number;
  rerollLimit: number;
  rerollCost: number;
}

export interface ShopBoosterPackConfig {
  type: BoosterPackType;
  label: string;
  cost: number;
  cards: number;
}

export interface ShopConfig {
  reroll: {
    dailyLimit: number;
    baseCost: number;
    stepCost: number;
    maxCost: number;
  };
  boosters: ShopBoosterPackConfig[];
}

export interface ShopListResponse {
  offers: ShopOffer[];
  meta: ShopMeta;
}

export interface ShopPurchaseResult {
  player: PlayerProfile;
  purchased: {
    cardId: string;
    name: string;
    price: number;
    ownedAfter: number;
  };
}

export interface ShopRerollResult {
  player: PlayerProfile;
  shop: ShopListResponse;
}

export interface BoosterRewardCard {
  cardId: string;
  name: string;
  kind: "MONSTER" | "SPELL" | "TRAP";
  atk: number;
  def: number;
  tags: string[];
  effectDescription?: string;
  imagePath?: string;
  rarity: ShopCardRarity;
  segment: ShopOfferSegment;
}

export interface ShopBoosterResult {
  player: PlayerProfile;
  packType: BoosterPackType;
  packCost: number;
  cards: BoosterRewardCard[];
}

export interface PveNpc {
  id: string;
  name: string;
  tier: number;
  rewardGold: number;
  rewardCards: Array<{ cardId: string; chance: number; minCount: number; maxCount: number }>;
  unlockRequirement:
    | { type: "NONE" }
    | { type: "DEFEAT_NPC"; npcId: string }
    | { type: "WINS_PVE"; wins: number };
  unlocked: boolean;
  defeated: boolean;
  portraitPath: string;
  portraitAltPath: string;
  fallbackPortraitPath: string;
  aceCardId?: string;
  aceCardName?: string;
}

export interface PveDropProgress {
  npcId: string;
  npcName: string;
  tier: number;
  totalPossible: number;
  obtainedCount: number;
  missingCount: number;
  obtainedCardIds: string[];
  missingCardIds: string[];
}

export interface FusionDiscoveryEntry {
  key: string;
  materialsCount: 2 | 3;
  materialTags: string[];
  materialCardIds: string[];
  resultCardId: string;
  resultName: string;
  discoveredAt: number;
  times: number;
}

export interface FusionTestResult {
  materials: Array<{ cardId: string; name: string }>;
  result: {
    cardId: string;
    name: string;
    failed: boolean;
    fallbackType?: "FALLBACK_WEAK" | "FALLBACK_LOCKED";
  };
  discovery: FusionDiscoveryEntry | null;
}

export type SocialPresence = "ONLINE" | "OFFLINE" | "IN_DUEL";

export interface SocialUser {
  publicId: string;
  username: string;
  presence: SocialPresence;
  winsPvp: number;
  level: number;
}

export interface SocialSnapshot {
  users: SocialUser[];
  friends: SocialUser[];
  incomingRequests: SocialUser[];
  outgoingRequests: SocialUser[];
  unreadByFriend: Record<string, number>;
  badgeCount: number;
}

export interface SocialMessage {
  id: string;
  fromPublicId: string;
  toPublicId: string;
  text: string;
  createdAt: number;
  read: boolean;
}

export interface SocialRankingEntry {
  position: number;
  publicId: string;
  username: string;
  winsPvp: number;
  level: number;
  online: boolean;
  isCurrentUser: boolean;
}

export interface SocialRankingResponse {
  global: SocialRankingEntry[];
  friends: SocialRankingEntry[];
}

export async function registerAccount(input: { login: string; password: string; username?: string }): Promise<{ player: PlayerProfile; publicId: string }> {
  const response = await fetchWithNetworkHint("/api/auth/register", {
    method: "POST",
    headers: {
      "content-type": "application/json"
    },
    body: JSON.stringify(input)
  });
  return parseJsonResponse<{ player: PlayerProfile; publicId: string }>(response);
}

export async function loginAccount(input: { login: string; password: string }): Promise<{ player: PlayerProfile; publicId: string }> {
  const response = await fetchWithNetworkHint("/api/auth/login", {
    method: "POST",
    headers: {
      "content-type": "application/json"
    },
    body: JSON.stringify(input)
  });
  return parseJsonResponse<{ player: PlayerProfile; publicId: string }>(response);
}

export async function helloPlayer(input: { publicId?: string; username?: string }): Promise<{ player: PlayerProfile; publicId: string }> {
  const response = await fetchWithNetworkHint("/api/player/hello", {
    method: "POST",
    headers: {
      "content-type": "application/json"
    },
    body: JSON.stringify(input)
  });
  return parseJsonResponse<{ player: PlayerProfile; publicId: string }>(response);
}

export async function fetchPlayerProfile(publicId: string): Promise<PlayerProfile> {
  const response = await fetchWithNetworkHint("/api/player/profile", {
    method: "GET",
    headers: withPlayerHeader(publicId)
  });
  const payload = await parseJsonResponse<{ player: PlayerProfile }>(response);
  return payload.player;
}

export async function updatePlayerProfile(publicId: string, username: string): Promise<PlayerProfile> {
  const response = await fetchWithNetworkHint("/api/player/profile", {
    method: "PATCH",
    headers: {
      "content-type": "application/json",
      ...withPlayerHeader(publicId)
    },
    body: JSON.stringify({ username })
  });
  const payload = await parseJsonResponse<{ player: PlayerProfile }>(response);
  return payload.player;
}

export async function fetchProgression(publicId: string): Promise<ProgressionResponse> {
  const response = await fetchWithNetworkHint("/api/progression", {
    method: "GET",
    headers: withPlayerHeader(publicId)
  });
  return parseJsonResponse<ProgressionResponse>(response);
}

export async function fetchAchievementDashboard(publicId: string): Promise<AchievementDashboardResponse> {
  const response = await fetchWithNetworkHint("/api/achievements", {
    method: "GET",
    headers: withPlayerHeader(publicId)
  });
  return parseJsonResponse<AchievementDashboardResponse>(response);
}

export async function equipPlayerTitle(publicId: string, title: string | null): Promise<PlayerProfile> {
  const response = await fetchWithNetworkHint("/api/player/title", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      ...withPlayerHeader(publicId)
    },
    body: JSON.stringify({ title })
  });
  const payload = await parseJsonResponse<{ player: PlayerProfile }>(response);
  return payload.player;
}

export async function resetPlayerProgress(publicId: string): Promise<{ player: PlayerProfile; decks: DeckListResponse }> {
  const response = await fetchWithNetworkHint("/api/player/reset", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      ...withPlayerHeader(publicId)
    }
  });
  return parseJsonResponse<{ player: PlayerProfile; decks: DeckListResponse }>(response);
}

export async function fetchDecks(publicId: string): Promise<DeckListResponse> {
  const response = await fetchWithNetworkHint("/api/decks", {
    method: "GET",
    headers: withPlayerHeader(publicId)
  });
  return parseJsonResponse<DeckListResponse>(response);
}

export async function saveDeckOnServer(publicId: string, deck: Deck): Promise<DeckListResponse> {
  const response = await fetchWithNetworkHint("/api/decks", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      ...withPlayerHeader(publicId)
    },
    body: JSON.stringify({ deck })
  });
  return parseJsonResponse<DeckListResponse>(response);
}

export async function deleteDeckOnServer(publicId: string, deckId: string): Promise<DeckListResponse> {
  const response = await fetchWithNetworkHint(`/api/decks/${deckId}`, {
    method: "DELETE",
    headers: withPlayerHeader(publicId)
  });
  return parseJsonResponse<DeckListResponse>(response);
}

export async function setActiveDeckOnServer(publicId: string, deckId: string): Promise<DeckListResponse> {
  const response = await fetchWithNetworkHint(`/api/decks/${deckId}/active`, {
    method: "POST",
    headers: withPlayerHeader(publicId)
  });
  return parseJsonResponse<DeckListResponse>(response);
}

export async function fetchCollection(publicId: string): Promise<CollectionEntry[]> {
  const response = await fetchWithNetworkHint("/api/collection", {
    method: "GET",
    headers: withPlayerHeader(publicId)
  });
  const payload = await parseJsonResponse<{ collection: CollectionEntry[] }>(response);
  return payload.collection;
}

export async function fetchShopOffers(publicId: string, limit = 20): Promise<ShopListResponse> {
  const response = await fetchWithNetworkHint(`/api/shop/offers?limit=${encodeURIComponent(String(limit))}`, {
    method: "GET",
    headers: withPlayerHeader(publicId)
  });
  return parseJsonResponse<ShopListResponse>(response);
}

export async function fetchShopConfig(): Promise<ShopConfig> {
  const response = await fetchWithNetworkHint("/api/shop/config", {
    method: "GET"
  });
  const payload = await parseJsonResponse<{ config: ShopConfig }>(response);
  return payload.config;
}

export async function purchaseShopCard(publicId: string, cardId: string): Promise<ShopPurchaseResult> {
  const response = await fetchWithNetworkHint("/api/shop/purchase", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      ...withPlayerHeader(publicId)
    },
    body: JSON.stringify({ cardId })
  });
  return parseJsonResponse<ShopPurchaseResult>(response);
}

export async function rerollShopOffers(publicId: string, limit = 20): Promise<ShopRerollResult> {
  const response = await fetchWithNetworkHint("/api/shop/reroll", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      ...withPlayerHeader(publicId)
    },
    body: JSON.stringify({ limit })
  });
  return parseJsonResponse<ShopRerollResult>(response);
}

export async function openShopBooster(publicId: string, packType: BoosterPackType): Promise<ShopBoosterResult> {
  const response = await fetchWithNetworkHint("/api/shop/booster/open", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      ...withPlayerHeader(publicId)
    },
    body: JSON.stringify({ packType })
  });
  return parseJsonResponse<ShopBoosterResult>(response);
}

export async function fetchPveNpcs(publicId: string): Promise<PveNpc[]> {
  const response = await fetchWithNetworkHint("/api/pve/npcs", {
    method: "GET",
    headers: withPlayerHeader(publicId)
  });
  const payload = await parseJsonResponse<{ npcs: PveNpc[] }>(response);
  return payload.npcs;
}

export async function fetchPveDropProgress(publicId: string): Promise<PveDropProgress[]> {
  const response = await fetchWithNetworkHint("/api/pve/drops", {
    method: "GET",
    headers: withPlayerHeader(publicId)
  });
  const payload = await parseJsonResponse<{ progress: PveDropProgress[] }>(response);
  return payload.progress;
}

export async function fetchPvpLobby(publicId: string): Promise<PvpLobbySnapshot> {
  const response = await fetchWithNetworkHint("/api/pvp/lobby", {
    method: "GET",
    headers: withPlayerHeader(publicId)
  });
  return parseJsonResponse<PvpLobbySnapshot>(response);
}

export async function startPveMatch(publicId: string, npcId: string): Promise<{ roomCode: string; npc: { id: string; name: string; tier: number } }> {
  const response = await fetchWithNetworkHint("/api/pve/start", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      ...withPlayerHeader(publicId)
    },
    body: JSON.stringify({ npcId })
  });
  return parseJsonResponse<{ roomCode: string; npc: { id: string; name: string; tier: number } }>(response);
}

export async function fetchFusionLog(publicId: string): Promise<FusionDiscoveryEntry[]> {
  const response = await fetchWithNetworkHint("/api/fusions/log", {
    method: "GET",
    headers: withPlayerHeader(publicId)
  });
  const payload = await parseJsonResponse<{ discoveries: FusionDiscoveryEntry[] }>(response);
  return payload.discoveries;
}

export async function syncFusionLog(
  publicId: string,
  discoveries: Array<{
    key: string;
    materialsCount: number;
    materialTags: string[];
    materialCardIds: string[];
    resultCardId: string;
    resultName: string;
  }>
): Promise<FusionDiscoveryEntry[]> {
  const response = await fetchWithNetworkHint("/api/fusions/sync", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      ...withPlayerHeader(publicId)
    },
    body: JSON.stringify({ discoveries })
  });
  const payload = await parseJsonResponse<{ discoveries: FusionDiscoveryEntry[] }>(response);
  return payload.discoveries;
}

export async function testFusion(
  publicId: string,
  materials: string[]
): Promise<FusionTestResult> {
  const response = await fetchWithNetworkHint("/api/fusions/test", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      ...withPlayerHeader(publicId)
    },
    body: JSON.stringify({ materials })
  });
  return parseJsonResponse<FusionTestResult>(response);
}

export async function fetchSocialSnapshot(publicId: string): Promise<SocialSnapshot> {
  const response = await fetchWithNetworkHint("/api/social/snapshot", {
    method: "GET",
    headers: withPlayerHeader(publicId)
  });
  return parseJsonResponse<SocialSnapshot>(response);
}

export async function searchSocialPlayers(publicId: string, query: string, limit = 24): Promise<SocialUser[]> {
  const response = await fetchWithNetworkHint(
    `/api/social/search?q=${encodeURIComponent(query)}&limit=${encodeURIComponent(String(limit))}`,
    {
      method: "GET",
      headers: withPlayerHeader(publicId)
    }
  );
  const payload = await parseJsonResponse<{ users: SocialUser[] }>(response);
  return payload.users;
}

export async function sendSocialFriendRequest(publicId: string, targetPublicId: string): Promise<SocialSnapshot> {
  const response = await fetchWithNetworkHint("/api/social/requests", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      ...withPlayerHeader(publicId)
    },
    body: JSON.stringify({ targetPublicId })
  });
  const payload = await parseJsonResponse<{ snapshot: SocialSnapshot }>(response);
  return payload.snapshot;
}

export async function acceptSocialFriendRequest(publicId: string, requesterPublicId: string): Promise<SocialSnapshot> {
  const response = await fetchWithNetworkHint(`/api/social/requests/${encodeURIComponent(requesterPublicId)}/accept`, {
    method: "POST",
    headers: withPlayerHeader(publicId)
  });
  const payload = await parseJsonResponse<{ snapshot: SocialSnapshot }>(response);
  return payload.snapshot;
}

export async function declineSocialFriendRequest(publicId: string, requesterPublicId: string): Promise<SocialSnapshot> {
  const response = await fetchWithNetworkHint(`/api/social/requests/${encodeURIComponent(requesterPublicId)}/reject`, {
    method: "POST",
    headers: withPlayerHeader(publicId)
  });
  const payload = await parseJsonResponse<{ snapshot: SocialSnapshot }>(response);
  return payload.snapshot;
}

export async function cancelSocialFriendRequest(publicId: string, targetPublicId: string): Promise<SocialSnapshot> {
  const response = await fetchWithNetworkHint(`/api/social/requests/${encodeURIComponent(targetPublicId)}`, {
    method: "DELETE",
    headers: withPlayerHeader(publicId)
  });
  const payload = await parseJsonResponse<{ snapshot: SocialSnapshot }>(response);
  return payload.snapshot;
}

export async function removeSocialFriend(publicId: string, friendPublicId: string): Promise<SocialSnapshot> {
  const response = await fetchWithNetworkHint(`/api/social/friends/${encodeURIComponent(friendPublicId)}`, {
    method: "DELETE",
    headers: withPlayerHeader(publicId)
  });
  const payload = await parseJsonResponse<{ snapshot: SocialSnapshot }>(response);
  return payload.snapshot;
}

export async function fetchSocialConversation(publicId: string, friendPublicId: string): Promise<SocialMessage[]> {
  const response = await fetchWithNetworkHint(`/api/social/conversations/${encodeURIComponent(friendPublicId)}`, {
    method: "GET",
    headers: withPlayerHeader(publicId)
  });
  const payload = await parseJsonResponse<{ messages: SocialMessage[] }>(response);
  return payload.messages;
}

export async function sendSocialMessage(publicId: string, friendPublicId: string, text: string): Promise<SocialMessage[]> {
  const response = await fetchWithNetworkHint(`/api/social/conversations/${encodeURIComponent(friendPublicId)}/messages`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      ...withPlayerHeader(publicId)
    },
    body: JSON.stringify({ text })
  });
  const payload = await parseJsonResponse<{ messages: SocialMessage[] }>(response);
  return payload.messages;
}

export async function markSocialConversationRead(publicId: string, friendPublicId: string): Promise<SocialSnapshot> {
  const response = await fetchWithNetworkHint(`/api/social/conversations/${encodeURIComponent(friendPublicId)}/read`, {
    method: "POST",
    headers: withPlayerHeader(publicId)
  });
  const payload = await parseJsonResponse<{ snapshot: SocialSnapshot }>(response);
  return payload.snapshot;
}

export async function fetchSocialRanking(publicId: string): Promise<SocialRankingResponse> {
  const response = await fetchWithNetworkHint("/api/social/ranking", {
    method: "GET",
    headers: withPlayerHeader(publicId)
  });
  return parseJsonResponse<SocialRankingResponse>(response);
}
