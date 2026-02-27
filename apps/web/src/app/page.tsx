"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import type { Deck } from "@ruptura-arcana/shared";
import {
  clearStoredPublicId,
  type CollectionEntry,
  fetchCollection,
  fetchDecks,
  fetchFusionLog,
  fetchProgression,
  fetchPveNpcs,
  getStoredPublicId,
  type LevelProgress,
  loginAccount,
  fetchSocialSnapshot,
  type PlayerAchievement,
  type DeckListResponse,
  type PlayerProfile,
  type PveNpc,
  type SocialUser,
  registerAccount,
  setActiveDeckOnServer,
  setStoredPublicId,
  startPveMatch
} from "../lib/api";
import { CollectionPanel } from "../components/lobby/CollectionPanel";
import { ContinueCampaignCard } from "../components/lobby/ContinueCampaignCard";
import { FriendsPanel } from "../components/lobby/FriendsPanel";
import { GameCard } from "../components/lobby/GameCard";
import { LobbyHeader } from "../components/lobby/LobbyHeader";
import { LobbyTicker, type LobbyTickerMessage } from "../components/lobby/LobbyTicker";
import { LobbyTabs } from "../components/lobby/LobbyTabs";
import { OnlinePanel } from "../components/lobby/OnlinePanel";
import { ProfileDeckCard } from "../components/lobby/ProfileDeckCard";
import { ProfilePanel } from "../components/lobby/ProfilePanel";
import { RankingPanel } from "../components/lobby/RankingPanel";
import { TabsAnimatedPanel } from "../components/lobby/TabsAnimatedPanel";
import type { LobbySection } from "../components/lobby/types";
import {
  applyUiPreferences,
  getDefaultUiPreferences,
  loadUiPreferences,
  saveUiPreferences,
  type UiPreferences
} from "../lib/uiPreferences";
import { loadScreenModule } from "../lib/lazyScreens";

const LOBBY_NOTICES_STORAGE_KEY = "ruptura_arcana_lobby_notices";
const LOBBY_AVATAR_STORAGE_PREFIX = "ruptura_arcana_avatar_";

function deckTotal(deck: Deck): number {
  return deck.cards.reduce((acc, entry) => acc + entry.count, 0);
}

export default function LobbyPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [section, setSection] = useState<LobbySection>("CAMPAIGN");
  const [uiPreferences, setUiPreferences] = useState<UiPreferences>(getDefaultUiPreferences());
  const [profileAvatarUrl, setProfileAvatarUrl] = useState<string | null>(null);

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
  const [collectionCount, setCollectionCount] = useState(0);
  const [fusionCount, setFusionCount] = useState(0);
  const [busyNpcId, setBusyNpcId] = useState<string | null>(null);
  const [friendsBadgeCount, setFriendsBadgeCount] = useState(0);

  const [tickerMessages, setTickerMessages] = useState<LobbyTickerMessage[]>([]);
  const [navigatingTo, setNavigatingTo] = useState<string | null>(null);

  const activeDeck = useMemo(() => {
    return decks.decks.find((deck) => deck.id === decks.activeDeckId) ?? null;
  }, [decks.activeDeckId, decks.decks]);

  const activeDeckTotal = useMemo(() => (activeDeck ? deckTotal(activeDeck) : 0), [activeDeck]);

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
    },
    options?: { announceLevelUp?: boolean; previousLevel?: number }
  ) => {
    setPlayer(payload.player);
    setLevelProgress(payload.levelProgress);
    setAchievements(payload.achievements);

    if (options?.announceLevelUp && typeof options.previousLevel === "number" && payload.player.level > options.previousLevel) {
      pushTicker(`Level UP! ${options.previousLevel} -> ${payload.player.level}`, "success");
    }
  };

  const resetLobbyState = () => {
    setPlayer(null);
    setLevelProgress(null);
    setAchievements([]);
    setDecks({ decks: [], activeDeckId: null });
    setNpcs([]);
    setCollectionEntries([]);
    setCollectionCount(0);
    setFusionCount(0);
    setBusyNpcId(null);
    setFriendsBadgeCount(0);
  };

  const refreshSocialBadge = async (publicId: string): Promise<void> => {
    try {
      const socialSnapshot = await fetchSocialSnapshot(publicId);
      setFriendsBadgeCount(socialSnapshot.badgeCount);
    } catch {
      setFriendsBadgeCount(0);
    }
  };

  const refreshLobbyData = async (publicId: string) => {
    const [progression, deckPayload, npcPayload, collection, fusionLog] = await Promise.all([
      fetchProgression(publicId),
      fetchDecks(publicId),
      fetchPveNpcs(publicId),
      fetchCollection(publicId).catch(() => []),
      fetchFusionLog(publicId).catch(() => [])
    ]);

    applyProgressionState({
      player: progression.player,
      levelProgress: progression.levelProgress,
      achievements: progression.achievements
    });

    setDecks(deckPayload);
    setNpcs(npcPayload);
    setCollectionEntries(collection);
    setCollectionCount(collection.reduce((acc, entry) => acc + entry.count, 0));
    setFusionCount(fusionLog.length);
    await refreshSocialBadge(publicId);
  };

  useEffect(() => {
    const loaded = loadUiPreferences();
    setUiPreferences(loaded);
    applyUiPreferences(loaded);
  }, []);

  useEffect(() => {
    const boot = async () => {
      try {
        setLoading(true);
        setError("");

        if (typeof window !== "undefined") {
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

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!player?.publicId) {
      setProfileAvatarUrl(null);
      return;
    }
    setProfileAvatarUrl(window.localStorage.getItem(`${LOBBY_AVATAR_STORAGE_PREFIX}${player.publicId}`));
  }, [player?.publicId]);

  useEffect(() => {
    if (!player?.publicId || !player.username) return;
    void refreshSocialBadge(player.publicId);
    const interval = window.setInterval(() => {
      void refreshSocialBadge(player.publicId);
    }, 30000);
    return () => window.clearInterval(interval);
  }, [player?.publicId, player?.username]);

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

  const handleChallengeFriend = (friend: SocialUser) => {
    if (!player) {
      setSection("PROFILE");
      return;
    }
    setNavigatingTo(`Preparando duelo PvP contra ${friend.username}...`);
    window.setTimeout(() => {
      router.push(
        `/match?username=${encodeURIComponent(player.username)}&mode=PVP&autoCreate=1&friend=${encodeURIComponent(friend.username)}`
      );
    }, 80);
  };

  const handleOpenNpcSelection = () => {
    if (!player) {
      setSection("PROFILE");
      return;
    }
    void loadScreenModule("DUEL");
    setNavigatingTo("Abrindo selecao de NPC...");
    window.setTimeout(() => {
      router.push("/pve");
    }, 80);
  };

  const handleStartNpcDuel = async (npcId: string) => {
    if (!player) {
      setSection("PROFILE");
      return;
    }

    try {
      setBusyNpcId(npcId);
      setError("");
      void loadScreenModule("DUEL");
      const start = await startPveMatch(player.publicId, npcId);
      setNavigatingTo("Preparando duelo PvE...");
      window.setTimeout(() => {
        router.push(`/match?roomCode=${start.roomCode}&username=${encodeURIComponent(player.username)}&mode=PVE`);
      }, 80);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Nao foi possivel iniciar o duelo PVE.";
      setError(message);
      pushTicker(message, "warning");
    } finally {
      setBusyNpcId(null);
    }
  };

  useEffect(() => {
    if (section === "FRIENDS") {
      void loadScreenModule("FRIENDS");
      return;
    }
    if (section === "RANKING") {
      void loadScreenModule("RANKING");
    }
  }, [section]);

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
            onOpenNpcSelection={handleOpenNpcSelection}
            onQuickDuel={(npcId) => void handleStartNpcDuel(npcId)}
          />
        </div>
      );
    }

    if (section === "ONLINE") {
      return <OnlinePanel playerLogged={Boolean(player)} />;
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

    if (section === "FRIENDS") {
      return (
        <FriendsPanel
          playerLogged={Boolean(player)}
          currentUserId={player?.publicId ?? null}
          currentUsername={player?.username ?? null}
          onBadgeCountChange={setFriendsBadgeCount}
          onChallengeFriend={handleChallengeFriend}
        />
      );
    }

    if (section === "RANKING") {
      return (
        <RankingPanel
          playerLogged={Boolean(player)}
          currentUserId={player?.publicId ?? null}
          currentUsername={player?.username ?? null}
          currentWinsPvp={player?.winsPvp ?? 0}
          currentLevel={player?.level ?? 1}
        />
      );
    }

    return (
      <ProfilePanel
        player={player}
        loading={loading}
        decks={decks}
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

      <div className="lobbyUi w-full min-h-[100dvh] p-1 sm:p-2 lg:p-3 xl:p-4">
        <section className="lobbyFrameA w-full min-h-[calc(100dvh-0.25rem)]">
          <div className="space-y-3 px-3 py-3 sm:px-4 sm:py-4 lg:space-y-4 lg:px-5 lg:py-5 xl:px-6 xl:py-6">
            <section className="lobbySurface lobbySurface--hero">
              <LobbyHeader
                player={player}
                levelProgress={levelProgress}
                loading={loading}
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
              <LobbyTabs
                active={section}
                onChange={setSection}
                disabled={false}
                badges={{ FRIENDS: friendsBadgeCount }}
                profileAvatarUrl={profileAvatarUrl}
              />
            </section>

            <div
              className={`grid gap-3 ${
                section === "PROFILE"
                  ? ""
                  : "lg:grid-cols-[minmax(0,1.9fr)_minmax(320px,0.95fr)] xl:grid-cols-[minmax(0,2fr)_minmax(360px,1fr)]"
              }`}
            >
              <section className="lobbySurface min-w-0">
                <TabsAnimatedPanel active={section}>{renderActiveSection()}</TabsAnimatedPanel>
              </section>

              {section !== "PROFILE" ? (
                <aside className="space-y-3 lg:sticky lg:top-2 lg:self-start">
                  <section className="lobbySurface lobbySurface--sidebar">
                    <ProfileDeckCard
                      loading={loading}
                      player={player}
                      levelProgress={levelProgress}
                      decks={decks}
                      onSetActiveDeck={(deckId) => void handleSetActiveDeck(deckId)}
                      onLogout={handleLogout}
                    />
                  </section>
                </aside>
              ) : null}
            </div>
          </div>
        </section>
      </div>

      {navigatingTo ? (
        <div className="fixed inset-0 z-[160] flex items-center justify-center bg-slate-950/78 backdrop-blur-[2px]">
          <div className="rounded-xl border border-amber-300/50 bg-slate-900/92 px-6 py-5 text-center shadow-[0_20px_55px_rgba(0,0,0,0.55)]">
            <div className="mx-auto mb-3 h-8 w-8 animate-spin rounded-full border-2 border-amber-200/30 border-t-amber-200" />
            <p className="text-sm font-semibold text-amber-100">{navigatingTo}</p>
          </div>
        </div>
      ) : null}
    </main>
  );
}
