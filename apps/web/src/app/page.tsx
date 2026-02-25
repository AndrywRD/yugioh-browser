"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import type { Deck } from "@ruptura-arcana/shared";
import {
  claimDailyMissionReward,
  clearStoredPublicId,
  type CollectionEntry,
  type DailyMission,
  fetchCollection,
  fetchDecks,
  fetchFusionLog,
  fetchProgression,
  fetchPveNpcs,
  fetchShopOffers,
  getStoredPublicId,
  type LevelProgress,
  loginAccount,
  type PlayerAchievement,
  type DeckListResponse,
  type PlayerProfile,
  type PveNpc,
  registerAccount,
  rerollShopOffers,
  setActiveDeckOnServer,
  setStoredPublicId,
  startPveMatch,
  type ShopMeta,
  type ShopOffer
} from "../lib/api";
import { CardTraderSummary } from "../components/lobby/CardTraderSummary";
import { CollectionPanel } from "../components/lobby/CollectionPanel";
import { ContinueCampaignCard } from "../components/lobby/ContinueCampaignCard";
import { DailyMissionsCard } from "../components/lobby/DailyMissionsCard";
import { GameCard } from "../components/lobby/GameCard";
import { JoinCodeModal } from "../components/lobby/JoinCodeModal";
import { LobbyHeader } from "../components/lobby/LobbyHeader";
import { LobbyTicker, type LobbyTickerMessage } from "../components/lobby/LobbyTicker";
import { LobbyTabs } from "../components/lobby/LobbyTabs";
import { OnlinePanel } from "../components/lobby/OnlinePanel";
import { ProfileDeckCard } from "../components/lobby/ProfileDeckCard";
import { ProfilePanel } from "../components/lobby/ProfilePanel";
import { ProgressCard } from "../components/lobby/ProgressCard";
import { TabsAnimatedPanel } from "../components/lobby/TabsAnimatedPanel";
import { TutorialCard } from "../components/lobby/TutorialCard";
import type { LobbySection } from "../components/lobby/types";
import {
  applyUiPreferences,
  getDefaultUiPreferences,
  loadUiPreferences,
  saveUiPreferences,
  type UiPreferences
} from "../lib/uiPreferences";
import {
  buildTutorialMatchUrl,
  loadTutorialProgress,
  resetTutorialProgress,
  TUTORIAL_LESSONS,
  type TutorialLessonId,
  type TutorialProgress
} from "../lib/tutorial";

const LAST_ROOM_CODE_STORAGE_KEY = "ruptura_arcana_last_room_code";
const LOBBY_NOTICES_STORAGE_KEY = "ruptura_arcana_lobby_notices";

function deckTotal(deck: Deck): number {
  return deck.cards.reduce((acc, entry) => acc + entry.count, 0);
}

export default function LobbyPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [section, setSection] = useState<LobbySection>("CAMPAIGN");
  const [uiPreferences, setUiPreferences] = useState<UiPreferences>(getDefaultUiPreferences());

  const [authBusy, setAuthBusy] = useState(false);
  const [authMode, setAuthMode] = useState<"LOGIN" | "REGISTER">("LOGIN");
  const [loginField, setLoginField] = useState("");
  const [passwordField, setPasswordField] = useState("");
  const [registerUsernameField, setRegisterUsernameField] = useState("");

  const [player, setPlayer] = useState<PlayerProfile | null>(null);
  const [decks, setDecks] = useState<DeckListResponse>({ decks: [], activeDeckId: null });
  const [npcs, setNpcs] = useState<PveNpc[]>([]);
  const [collectionEntries, setCollectionEntries] = useState<CollectionEntry[]>([]);
  const [levelProgress, setLevelProgress] = useState<LevelProgress | null>(null);
  const [achievements, setAchievements] = useState<PlayerAchievement[]>([]);
  const [availableAchievements, setAvailableAchievements] = useState(0);
  const [dailyMissions, setDailyMissions] = useState<DailyMission[]>([]);
  const [claimingMissionKey, setClaimingMissionKey] = useState<string | null>(null);
  const [shopOffers, setShopOffers] = useState<ShopOffer[]>([]);
  const [shopMeta, setShopMeta] = useState<ShopMeta | null>(null);
  const [shopLoading, setShopLoading] = useState(false);
  const [rerollingShop, setRerollingShop] = useState(false);
  const [collectionCount, setCollectionCount] = useState(0);
  const [fusionCount, setFusionCount] = useState(0);
  const [tutorialProgress, setTutorialProgress] = useState<TutorialProgress | null>(null);
  const [tutorialBusy, setTutorialBusy] = useState(false);
  const [busyNpcId, setBusyNpcId] = useState<string | null>(null);

  const [creatingRoom, setCreatingRoom] = useState(false);
  const [joinModalOpen, setJoinModalOpen] = useState(false);
  const [joinCode, setJoinCode] = useState("");
  const [joinBusy, setJoinBusy] = useState(false);
  const [joinError, setJoinError] = useState("");
  const [lastRoomCode, setLastRoomCode] = useState<string | null>(null);
  const [tickerMessages, setTickerMessages] = useState<LobbyTickerMessage[]>([]);

  const activeDeck = useMemo(() => {
    return decks.decks.find((deck) => deck.id === decks.activeDeckId) ?? null;
  }, [decks.activeDeckId, decks.decks]);

  const activeDeckTotal = useMemo(() => (activeDeck ? deckTotal(activeDeck) : 0), [activeDeck]);
  const activeDeckValid = useMemo(() => Boolean(activeDeck && activeDeckTotal === 40), [activeDeck, activeDeckTotal]);
  const hasCampaignProgress = Boolean(player && player.winsPve > 0);

  const removeTicker = useCallback((id: string) => {
    setTickerMessages((current) => current.filter((message) => message.id !== id));
  }, []);

  const pushTicker = (text: string, tone: LobbyTickerMessage["tone"] = "info") => {
    const message: LobbyTickerMessage = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      text,
      tone
    };
    setTickerMessages((current) => [message, ...current].slice(0, 3));
  };

  const applyProgressionState = (
    payload: {
      player: PlayerProfile;
      levelProgress: LevelProgress;
      achievements: PlayerAchievement[];
      availableAchievements: number;
      dailyMissions: DailyMission[];
    },
    options?: { announceLevelUp?: boolean; previousLevel?: number; announceMissionClaim?: boolean }
  ) => {
    setPlayer(payload.player);
    setLevelProgress(payload.levelProgress);
    setAchievements(payload.achievements);
    setAvailableAchievements(payload.availableAchievements);
    setDailyMissions(payload.dailyMissions);

    if (options?.announceLevelUp && typeof options.previousLevel === "number" && payload.player.level > options.previousLevel) {
      pushTicker(`Level UP! ${options.previousLevel} -> ${payload.player.level}`, "success");
    }
    if (options?.announceMissionClaim) {
      pushTicker("Missao diaria resgatada com sucesso.", "success");
    }
  };

  const resetLobbyState = () => {
    setPlayer(null);
    setLevelProgress(null);
    setAchievements([]);
    setAvailableAchievements(0);
    setDailyMissions([]);
    setClaimingMissionKey(null);
    setDecks({ decks: [], activeDeckId: null });
    setNpcs([]);
    setCollectionEntries([]);
    setShopOffers([]);
    setShopMeta(null);
    setCollectionCount(0);
    setFusionCount(0);
    setBusyNpcId(null);
  };

  const refreshLobbyData = async (publicId: string) => {
    try {
      setShopLoading(true);
      const [progression, deckPayload, npcPayload, collection, fusionLog, shop] = await Promise.all([
        fetchProgression(publicId),
        fetchDecks(publicId),
        fetchPveNpcs(publicId),
        fetchCollection(publicId).catch(() => []),
        fetchFusionLog(publicId).catch(() => []),
        fetchShopOffers(publicId, 20).catch(() => ({
          offers: [],
          meta: {
            rotationKey: "fallback",
            nextRotationAt: Date.now() + 24 * 60 * 60 * 1000,
            rerollUsed: 0,
            rerollLimit: 0,
            rerollCost: 0
          } satisfies ShopMeta
        }))
      ]);

      applyProgressionState({
        player: progression.player,
        levelProgress: progression.levelProgress,
        achievements: progression.achievements,
        availableAchievements: progression.availableAchievements,
        dailyMissions: progression.dailyMissions
      });

      setDecks(deckPayload);
      setNpcs(npcPayload);
      setCollectionEntries(collection);
      setShopOffers(shop.offers);
      setShopMeta(shop.meta ?? null);
      setCollectionCount(collection.reduce((acc, entry) => acc + entry.count, 0));
      setFusionCount(fusionLog.length);
    } finally {
      setShopLoading(false);
    }
  };

  const refreshProgressionOnly = async (
    publicId: string,
    options?: { announceLevelUp?: boolean; previousLevel?: number; announceMissionClaim?: boolean }
  ) => {
    const progression = await fetchProgression(publicId);
    applyProgressionState(
      {
        player: progression.player,
        levelProgress: progression.levelProgress,
        achievements: progression.achievements,
        availableAchievements: progression.availableAchievements,
        dailyMissions: progression.dailyMissions
      },
      options
    );
    return progression;
  };

  useEffect(() => {
    const loaded = loadUiPreferences();
    setUiPreferences(loaded);
    applyUiPreferences(loaded);
  }, []);

  useEffect(() => {
    const syncTutorial = () => {
      setTutorialProgress(loadTutorialProgress());
      setTutorialBusy(false);
    };

    syncTutorial();
    window.addEventListener("focus", syncTutorial);
    return () => window.removeEventListener("focus", syncTutorial);
  }, []);

  useEffect(() => {
    const boot = async () => {
      try {
        setLoading(true);
        setError("");

        if (typeof window !== "undefined") {
          const storedCode = window.localStorage.getItem(LAST_ROOM_CODE_STORAGE_KEY);
          if (storedCode) setLastRoomCode(storedCode);
          const rawNotices = window.localStorage.getItem(LOBBY_NOTICES_STORAGE_KEY);
          if (rawNotices) {
            try {
              const notices = JSON.parse(rawNotices) as Array<{ text: string; tone?: LobbyTickerMessage["tone"] }>;
              notices.slice(0, 3).forEach((notice) => {
                if (notice?.text) pushTicker(notice.text, notice.tone ?? "info");
              });
            } catch {
              // ignore malformed notices
            }
            window.localStorage.removeItem(LOBBY_NOTICES_STORAGE_KEY);
          }
        }

        const storedPublicId = getStoredPublicId();
        if (!storedPublicId) {
          resetLobbyState();
          return;
        }

        await refreshLobbyData(storedPublicId);
      } catch (err) {
        clearStoredPublicId();
        resetLobbyState();
        setError(err instanceof Error ? err.message : "Sessao invalida. Faca login novamente.");
      } finally {
        setLoading(false);
      }
    };

    void boot();
  }, []);

  const handleLogin = async () => {
    try {
      setAuthBusy(true);
      setError("");
      const result = await loginAccount({
        login: loginField,
        password: passwordField
      });
      setStoredPublicId(result.publicId);
      setPasswordField("");
      await refreshLobbyData(result.publicId);
      setSection("CAMPAIGN");
      pushTicker(`Bem-vindo de volta, ${result.player.username}.`, "success");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Falha no login.");
    } finally {
      setAuthBusy(false);
    }
  };

  const handleRegister = async () => {
    try {
      setAuthBusy(true);
      setError("");
      const result = await registerAccount({
        login: loginField,
        password: passwordField,
        username: registerUsernameField || loginField
      });
      setStoredPublicId(result.publicId);
      setPasswordField("");
      await refreshLobbyData(result.publicId);
      setSection("CAMPAIGN");
      pushTicker(`Conta criada com sucesso: ${result.player.username}.`, "success");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Falha ao criar conta.");
    } finally {
      setAuthBusy(false);
    }
  };

  const handleLogout = () => {
    clearStoredPublicId();
    resetLobbyState();
    setError("");
    setPasswordField("");
    setJoinModalOpen(false);
    setJoinCode("");
    setJoinError("");
    setRerollingShop(false);
    setSection("CAMPAIGN");
  };

  const handleUpdateUiPreferences = (patch: Partial<UiPreferences>) => {
    setUiPreferences((current) => {
      const merged: UiPreferences = {
        ...current,
        ...patch
      };
      return saveUiPreferences(merged);
    });
  };

  const handleSetActiveDeck = async (deckId: string) => {
    if (!player) return;
    try {
      const payload = await setActiveDeckOnServer(player.publicId, deckId);
      setDecks(payload);
      const selected = payload.decks.find((deck) => deck.id === payload.activeDeckId);
      const selectedTotal = selected ? deckTotal(selected) : 0;
      if (selected) {
        pushTicker(`Deck ativo alterado para ${selected.name} (${selectedTotal}/40).`, selectedTotal === 40 ? "success" : "warning");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Falha ao alterar deck ativo.");
    }
  };

  const handleRerollShop = async () => {
    if (!player) {
      setSection("PROFILE");
      return;
    }
    if (shopMeta && shopMeta.rerollUsed >= shopMeta.rerollLimit) {
      const message = "Limite diario de reroll atingido.";
      setError(message);
      pushTicker(message, "warning");
      return;
    }
    if (shopMeta && player.gold < shopMeta.rerollCost) {
      const message = "Gold insuficiente para atualizar ofertas.";
      setError(message);
      pushTicker(message, "warning");
      return;
    }

    try {
      setRerollingShop(true);
      setError("");
      const result = await rerollShopOffers(player.publicId, 20);
      setPlayer(result.player);
      setShopOffers(result.shop.offers);
      setShopMeta(result.shop.meta);
      pushTicker(`Loja atualizada. Proximo reroll: ${result.shop.meta.rerollCost}g.`, "success");
    } catch (err) {
      const message = err instanceof Error ? err.message : "Falha ao atualizar ofertas da loja.";
      setError(message);
      pushTicker(message, "warning");
    } finally {
      setRerollingShop(false);
    }
  };

  const handleClaimDailyMission = async (missionKey: string) => {
    if (!player) {
      setSection("PROFILE");
      return;
    }

    try {
      setClaimingMissionKey(missionKey);
      setError("");
      const previousLevel = player.level;
      const progression = await claimDailyMissionReward(player.publicId, missionKey);
      applyProgressionState(
        {
          player: progression.player,
          levelProgress: progression.levelProgress,
          achievements: progression.achievements,
          availableAchievements: progression.availableAchievements,
          dailyMissions: progression.dailyMissions
        },
        { announceMissionClaim: true, announceLevelUp: true, previousLevel }
      );
    } catch (err) {
      const message = err instanceof Error ? err.message : "Falha ao resgatar missao.";
      setError(message);
      pushTicker(message, "warning");
    } finally {
      setClaimingMissionKey(null);
    }
  };

  const handleStartTutorialLesson = (lessonId: TutorialLessonId) => {
    if (!player) {
      setSection("PROFILE");
      return;
    }

    setTutorialBusy(true);
    setError("");
    const tutorialUrl = buildTutorialMatchUrl({
      lessonId,
      username: player.username
    });
    router.push(tutorialUrl);
  };

  const handleResetTutorial = () => {
    const updated = resetTutorialProgress();
    setTutorialProgress(updated);
    pushTicker("Tutorial resetado. Voce pode recomecar da licao 1.", "info");
  };

  const handlePrimaryAction = () => {
    if (!player) {
      setSection("PROFILE");
      return;
    }
    setSection("CAMPAIGN");
    router.push("/pve");
  };

  const handleSecondaryAction = () => {
    if (!player) {
      setSection("PROFILE");
      return;
    }
    setSection("ONLINE");
  };

  const handleOpenShop = () => {
    if (!player) {
      setSection("PROFILE");
      return;
    }
    router.push("/shop");
  };

  const handleOpenNpcSelection = () => {
    if (!player) {
      setSection("PROFILE");
      return;
    }
    router.push("/pve");
  };

  const handleOpenDeckBuilder = () => {
    if (!player) {
      setSection("PROFILE");
      return;
    }
    router.push("/deck-builder");
  };

  const handleStartNpcDuel = async (npcId: string) => {
    if (!player) {
      setSection("PROFILE");
      return;
    }

    try {
      setBusyNpcId(npcId);
      setError("");
      const start = await startPveMatch(player.publicId, npcId);
      router.push(`/match?roomCode=${start.roomCode}&username=${encodeURIComponent(player.username)}&mode=PVE`);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Nao foi possivel iniciar o duelo PVE.";
      setError(message);
      pushTicker(message, "warning");
    } finally {
      setBusyNpcId(null);
    }
  };

  const handleCreateRoom = () => {
    if (!player) {
      setSection("PROFILE");
      return;
    }
    setCreatingRoom(true);
    pushTicker("Criando sala PvP...", "info");
    router.push(`/match?username=${encodeURIComponent(player.username)}&mode=PVP&autoCreate=1`);
  };

  const handleOpenJoinModal = () => {
    if (!player) {
      setSection("PROFILE");
      return;
    }
    setJoinError("");
    setJoinCode("");
    setJoinModalOpen(true);
  };

  const handleJoinSubmit = () => {
    if (!player) {
      setSection("PROFILE");
      return;
    }

    const normalizedCode = joinCode.trim().toUpperCase();
    if (!normalizedCode) {
      setJoinError("Informe um codigo de sala.");
      return;
    }

    setJoinBusy(true);
    setJoinError("");
    if (typeof window !== "undefined") {
      window.localStorage.setItem(LAST_ROOM_CODE_STORAGE_KEY, normalizedCode);
    }
    setLastRoomCode(normalizedCode);
    pushTicker(`Entrando na sala ${normalizedCode}...`, "info");
    router.push(`/match?roomCode=${normalizedCode}&username=${encodeURIComponent(player.username)}&mode=PVP`);
  };

  const handleCopyLastRoomCode = async () => {
    if (!lastRoomCode) return;
    try {
      await navigator.clipboard.writeText(lastRoomCode);
      pushTicker("Codigo de sala copiado.", "success");
    } catch {
      setError("Nao foi possivel copiar o codigo da sala.");
    }
  };

  const inputClass =
    "rounded-lg border border-slate-700/90 bg-slate-900/80 px-3 py-2 text-sm text-slate-100 outline-none transition focus:border-cyan-300/60";

  const renderAuthPanel = () => (
    <GameCard title="Acesso da Conta" subtitle="Entre ou crie uma conta para desbloquear campanha, online e progressao.">
      <div className="mb-3 flex gap-2">
        <button
          type="button"
          onClick={() => setAuthMode("LOGIN")}
          className={`fm-button rounded-lg px-3 py-2 text-xs font-semibold ${authMode === "LOGIN" ? "" : "opacity-70"}`}
        >
          Login
        </button>
        <button
          type="button"
          onClick={() => setAuthMode("REGISTER")}
          className={`fm-button rounded-lg px-3 py-2 text-xs font-semibold ${authMode === "REGISTER" ? "" : "opacity-70"}`}
        >
          Criar Conta
        </button>
      </div>

      <div className="grid max-w-[560px] gap-2.5">
        <input value={loginField} onChange={(event) => setLoginField(event.target.value)} placeholder="Login (3-32 caracteres)" className={inputClass} />
        <input
          value={passwordField}
          onChange={(event) => setPasswordField(event.target.value)}
          placeholder="Senha (min 6)"
          type="password"
          className={inputClass}
        />
        {authMode === "REGISTER" && (
          <input
            value={registerUsernameField}
            onChange={(event) => setRegisterUsernameField(event.target.value)}
            placeholder="Nome do duelista (opcional)"
            className={inputClass}
          />
        )}
        <button
          type="button"
          onClick={() => void (authMode === "LOGIN" ? handleLogin() : handleRegister())}
          disabled={authBusy}
          className="fm-button w-fit rounded-lg px-4 py-2 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-45"
        >
          {authBusy ? "Processando..." : authMode === "LOGIN" ? "Entrar" : "Criar Conta"}
        </button>
      </div>

      <div className="mt-4 grid gap-2 sm:grid-cols-4">
        <Link href="/match" className="fm-button rounded-lg px-3 py-2 text-center text-xs font-semibold">
          Modo Duelo
        </Link>
        <Link href="/deck-builder" className="fm-button rounded-lg px-3 py-2 text-center text-xs font-semibold">
          Deck Builder
        </Link>
        <Link href="/fusion-log" className="fm-button rounded-lg px-3 py-2 text-center text-xs font-semibold">
          Fusion Log
        </Link>
        <Link href="/shop" className="fm-button rounded-lg px-3 py-2 text-center text-xs font-semibold">
          Card Trader
        </Link>
      </div>
    </GameCard>
  );

  const renderActiveSection = () => {
    if (!player) return renderAuthPanel();

    if (section === "CAMPAIGN") {
      return (
        <div className="space-y-3">
          <ContinueCampaignCard
            loading={loading}
            playerLogged={Boolean(player)}
            winsPve={player.winsPve}
            levelProgress={levelProgress}
            npcs={npcs}
            busyNpcId={busyNpcId}
            onContinueCampaign={handlePrimaryAction}
            onOpenNpcSelection={handleOpenNpcSelection}
            onOpenDeckBuilder={handleOpenDeckBuilder}
            onQuickDuel={(npcId) => void handleStartNpcDuel(npcId)}
          />
          <TutorialCard
            loading={loading}
            playerLogged={Boolean(player)}
            progress={tutorialProgress}
            lessons={TUTORIAL_LESSONS}
            busy={tutorialBusy}
            onStartLesson={(lessonId) => handleStartTutorialLesson(lessonId)}
            onReset={handleResetTutorial}
          />
          <CardTraderSummary
            loading={loading || shopLoading}
            playerLogged={Boolean(player)}
            gold={player.gold}
            offers={shopOffers}
            shopMeta={shopMeta}
            rerolling={rerollingShop}
            canReroll={Boolean(shopMeta) && Boolean(player) && player.gold >= (shopMeta?.rerollCost ?? Number.POSITIVE_INFINITY) && (shopMeta?.rerollUsed ?? 0) < (shopMeta?.rerollLimit ?? 0)}
            onOpenShop={handleOpenShop}
            onReroll={() => void handleRerollShop()}
          />
        </div>
      );
    }

    if (section === "ONLINE") {
      return (
        <OnlinePanel
          playerLogged={Boolean(player)}
          loading={loading}
          creatingRoom={creatingRoom}
          lastRoomCode={lastRoomCode}
          onCreateRoom={handleCreateRoom}
          onOpenJoinModal={handleOpenJoinModal}
          onCopyCode={handleCopyLastRoomCode}
        />
      );
    }

    if (section === "COLLECTION") {
      return (
        <CollectionPanel
          playerLogged={Boolean(player)}
          loading={loading}
          activeDeck={activeDeck}
          activeDeckTotal={activeDeckTotal}
          collectionCount={collectionCount}
          fusionCount={fusionCount}
        />
      );
    }

    return (
      <ProfilePanel
        player={player}
        loading={loading}
        decks={decks}
        activeDeck={activeDeck}
        activeDeckTotal={activeDeckTotal}
        levelProgress={levelProgress}
        achievements={achievements}
        onSetActiveDeck={(deckId) => void handleSetActiveDeck(deckId)}
        onLogout={handleLogout}
        uiPreferences={uiPreferences}
        onUpdateUiPreferences={handleUpdateUiPreferences}
      />
    );
  };

  return (
    <main className="fm-screen fm-noise-overlay fm-scroll lobby-readable lobbyRoot relative min-h-[100dvh] overflow-y-auto overflow-x-hidden text-slate-100">
      <div className="lobbyBg" aria-hidden="true">
        <div className="bgScene" />
        <div className="bgVignette" />
        <div className="bgStars" />
        <div className="bgNoise" />
      </div>

      <div className="lobbyUi mx-auto w-full max-w-[1920px] p-2 sm:p-3 lg:p-4">
        <section className="lobbyFrameA mx-auto w-full max-w-[1760px]">
          <div className="space-y-4 px-4 py-4 sm:px-5 sm:py-5 lg:space-y-5 lg:px-7 lg:py-6">
            <section className="lobbySurface lobbySurface--hero">
              <LobbyHeader
                player={player}
                loading={loading}
                hasCampaignProgress={hasCampaignProgress}
                onPrimaryAction={handlePrimaryAction}
                onSecondaryAction={handleSecondaryAction}
                onAuthAction={() => setSection("PROFILE")}
              />
            </section>

            <LobbyTicker messages={tickerMessages} onRemove={removeTicker} />

            {error ? (
              <section className="rounded-xl border border-rose-500/70 bg-rose-900/40 px-3 py-2 text-sm text-rose-100">
                {error}
              </section>
            ) : null}

            <section className="lobbySurface lobbySurface--tabs">
              <LobbyTabs active={section} onChange={setSection} disabled={false} />
            </section>

            <div className="grid gap-4 xl:grid-cols-[minmax(0,1.85fr)_minmax(320px,1fr)]">
              <section className="lobbySurface min-w-0">
                <TabsAnimatedPanel active={section}>{renderActiveSection()}</TabsAnimatedPanel>
              </section>

              <aside className="space-y-3">
                {section !== "PROFILE" && (
                  <section className="lobbySurface lobbySurface--sidebar">
                    <ProfileDeckCard
                      loading={loading}
                      player={player}
                      decks={decks}
                      activeDeck={activeDeck}
                      activeDeckTotal={activeDeckTotal}
                      activeDeckValid={activeDeckValid}
                      onSetActiveDeck={(deckId) => void handleSetActiveDeck(deckId)}
                      onLogout={handleLogout}
                    />
                  </section>
                )}
                <section className="lobbySurface lobbySurface--sidebar">
                  <DailyMissionsCard
                    loading={loading}
                    playerLogged={Boolean(player)}
                    missions={dailyMissions}
                    claimingMissionKey={claimingMissionKey}
                    onClaim={(missionKey) => void handleClaimDailyMission(missionKey)}
                  />
                </section>
                <section className="lobbySurface lobbySurface--sidebar">
                  <ProgressCard
                    loading={loading}
                    player={player}
                    npcs={npcs}
                    fusionCount={fusionCount}
                    levelProgress={levelProgress}
                    achievementsUnlocked={achievements.length}
                    availableAchievements={availableAchievements}
                    dailyMissionCompleted={dailyMissions.filter((mission) => mission.claimed).length}
                  />
                </section>
              </aside>
            </div>
          </div>
        </section>
      </div>

      <JoinCodeModal
        open={joinModalOpen}
        code={joinCode}
        busy={joinBusy}
        error={joinError}
        onCodeChange={setJoinCode}
        onClose={() => {
          if (joinBusy) return;
          setJoinModalOpen(false);
          setJoinBusy(false);
          setJoinError("");
        }}
        onSubmit={handleJoinSubmit}
      />
    </main>
  );
}
