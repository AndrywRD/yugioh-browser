"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import type { Deck } from "@ruptura-arcana/shared";
import {
  type BoosterPackType,
  clearStoredPublicId,
  type CollectionEntry,
  fetchCollection,
  fetchDecks,
  fetchFusionLog,
  fetchPlayerProfile,
  fetchPveNpcs,
  fetchShopConfig,
  fetchShopOffers,
  getStoredPublicId,
  loginAccount,
  openShopBooster,
  purchaseShopCard,
  registerAccount,
  rerollShopOffers,
  setActiveDeckOnServer,
  setStoredPublicId,
  type DeckListResponse,
  type PlayerProfile,
  type PveNpc,
  type ShopMeta,
  type ShopConfig,
  type ShopOffer
} from "../lib/api";
import { CollectionPanel } from "../components/lobby/CollectionPanel";
import { GameCard } from "../components/lobby/GameCard";
import { JoinCodeModal } from "../components/lobby/JoinCodeModal";
import { LobbyHeader } from "../components/lobby/LobbyHeader";
import { LobbyTicker, type LobbyTickerMessage } from "../components/lobby/LobbyTicker";
import { LobbyTabs } from "../components/lobby/LobbyTabs";
import { OnlinePanel } from "../components/lobby/OnlinePanel";
import { ProfileDeckCard } from "../components/lobby/ProfileDeckCard";
import { ProfilePanel } from "../components/lobby/ProfilePanel";
import { ProgressCard } from "../components/lobby/ProgressCard";
import { QuickActions } from "../components/lobby/QuickActions";
import { ShopPanel } from "../components/lobby/ShopPanel";
import { TabsAnimatedPanel } from "../components/lobby/TabsAnimatedPanel";
import type { LobbySection } from "../components/lobby/types";

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

  const [authBusy, setAuthBusy] = useState(false);
  const [authMode, setAuthMode] = useState<"LOGIN" | "REGISTER">("LOGIN");
  const [loginField, setLoginField] = useState("");
  const [passwordField, setPasswordField] = useState("");
  const [registerUsernameField, setRegisterUsernameField] = useState("");

  const [player, setPlayer] = useState<PlayerProfile | null>(null);
  const [decks, setDecks] = useState<DeckListResponse>({ decks: [], activeDeckId: null });
  const [npcs, setNpcs] = useState<PveNpc[]>([]);
  const [collectionEntries, setCollectionEntries] = useState<CollectionEntry[]>([]);
  const [shopOffers, setShopOffers] = useState<ShopOffer[]>([]);
  const [shopMeta, setShopMeta] = useState<ShopMeta | null>(null);
  const [shopConfig, setShopConfig] = useState<ShopConfig | null>(null);
  const [shopLoading, setShopLoading] = useState(false);
  const [collectionCount, setCollectionCount] = useState(0);
  const [fusionCount, setFusionCount] = useState(0);
  const [buyingCardId, setBuyingCardId] = useState<string | null>(null);
  const [rerollingShop, setRerollingShop] = useState(false);
  const [openingBoosterType, setOpeningBoosterType] = useState<BoosterPackType | null>(null);

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

  const refreshLobbyData = async (publicId: string) => {
    try {
      setShopLoading(true);
      const [profile, deckPayload, npcPayload, collection, fusionLog, shop, config] = await Promise.all([
        fetchPlayerProfile(publicId),
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
        })),
        fetchShopConfig().catch(
          () =>
            ({
              reroll: {
                dailyLimit: 6,
                baseCost: 120,
                stepCost: 85,
                maxCost: 760
              },
              boosters: [
                { type: "BEGINNER", label: "Booster Iniciante", cost: 340, cards: 3 },
                { type: "INTERMEDIATE", label: "Booster Intermediario", cost: 760, cards: 4 },
                { type: "ADVANCED", label: "Booster Avancado", cost: 1420, cards: 5 }
              ]
            } satisfies ShopConfig)
        )
      ]);

      setPlayer(profile);
      setDecks(deckPayload);
      setNpcs(npcPayload);
      setCollectionEntries(collection);
      setShopOffers(shop.offers);
      setShopMeta(shop.meta ?? null);
      setShopConfig(config);
      setCollectionCount(collection.reduce((acc, entry) => acc + entry.count, 0));
      setFusionCount(fusionLog.length);
    } finally {
      setShopLoading(false);
    }
  };

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
          setPlayer(null);
          setDecks({ decks: [], activeDeckId: null });
          setNpcs([]);
          setCollectionEntries([]);
          setShopOffers([]);
          setShopMeta(null);
          setShopConfig(null);
          setCollectionCount(0);
          setFusionCount(0);
          return;
        }

        await refreshLobbyData(storedPublicId);
      } catch (err) {
        clearStoredPublicId();
        setPlayer(null);
        setDecks({ decks: [], activeDeckId: null });
        setNpcs([]);
        setCollectionEntries([]);
        setShopOffers([]);
        setShopMeta(null);
        setShopConfig(null);
        setCollectionCount(0);
        setFusionCount(0);
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
    setPlayer(null);
    setDecks({ decks: [], activeDeckId: null });
    setNpcs([]);
    setCollectionEntries([]);
    setShopOffers([]);
    setShopMeta(null);
    setShopConfig(null);
    setCollectionCount(0);
    setFusionCount(0);
    setError("");
    setPasswordField("");
    setJoinModalOpen(false);
    setJoinCode("");
    setJoinError("");
    setBuyingCardId(null);
    setRerollingShop(false);
    setOpeningBoosterType(null);
    setSection("CAMPAIGN");
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

  const handleBuyShopCard = async (cardId: string) => {
    if (!player) {
      setSection("PROFILE");
      return null;
    }

    const targetOffer = shopOffers.find((offer) => offer.cardId === cardId);
    if (!targetOffer) {
      const message = "Carta nao encontrada na loja atual.";
      setError(message);
      pushTicker(message, "warning");
      return null;
    }
    if (player.gold < targetOffer.price) {
      const message = "Gold insuficiente para esta compra.";
      setError(message);
      pushTicker(message, "warning");
      return null;
    }

    const prevPlayer = player;
    const prevOffers = shopOffers;
    const prevCollection = collectionEntries;
    const prevCollectionCount = collectionCount;
    const optimisticGold = player.gold - targetOffer.price;

    setPlayer({ ...player, gold: optimisticGold });
    setShopOffers((current) =>
      current.map((offer) => ({
        ...offer,
        owned: offer.cardId === cardId ? offer.owned + 1 : offer.owned,
        affordable: offer.price <= optimisticGold
      }))
    );
    setCollectionEntries((current) => {
      const found = current.find((entry) => entry.cardId === cardId);
      if (found) {
        return current.map((entry) => (entry.cardId === cardId ? { ...entry, count: entry.count + 1 } : entry));
      }
      return [
        ...current,
        {
          cardId: targetOffer.cardId,
          count: 1,
          name: targetOffer.name,
          kind: targetOffer.kind,
          atk: targetOffer.atk,
          def: targetOffer.def,
          tags: targetOffer.tags,
          effectDescription: targetOffer.effectDescription,
          imagePath: targetOffer.imagePath,
          password: targetOffer.password,
          cost: targetOffer.cost,
          catalogNumber: targetOffer.catalogNumber
        }
      ];
    });
    setCollectionCount((current) => current + 1);

    try {
      setBuyingCardId(cardId);
      setError("");
      const result = await purchaseShopCard(prevPlayer.publicId, cardId);
      setPlayer(result.player);
      pushTicker(`Compra realizada: ${result.purchased.name} (-${result.purchased.price} gold).`, "success");

      void (async () => {
        try {
          const latestShop = await fetchShopOffers(prevPlayer.publicId, 20);
          setShopOffers(latestShop.offers);
          setShopMeta(latestShop.meta);
        } catch {
          // keep optimistic state on fallback
        }
      })();

      return result;
    } catch (err) {
      setPlayer(prevPlayer);
      setShopOffers(prevOffers);
      setCollectionEntries(prevCollection);
      setCollectionCount(prevCollectionCount);
      const message = err instanceof Error ? err.message : "Falha ao comprar carta.";
      setError(message);
      pushTicker(message, "warning");
      return null;
    } finally {
      setBuyingCardId(null);
    }
  };

  const handleRerollShop = async () => {
    if (!player) {
      setSection("PROFILE");
      return null;
    }
    if (shopMeta && shopMeta.rerollUsed >= shopMeta.rerollLimit) {
      const message = "Limite diario de reroll atingido.";
      setError(message);
      pushTicker(message, "warning");
      return null;
    }
    if (shopMeta && player.gold < shopMeta.rerollCost) {
      const message = "Gold insuficiente para atualizar ofertas.";
      setError(message);
      pushTicker(message, "warning");
      return null;
    }

    try {
      setRerollingShop(true);
      setError("");
      const result = await rerollShopOffers(player.publicId, 20);
      setPlayer(result.player);
      setShopOffers(result.shop.offers);
      setShopMeta(result.shop.meta);
      pushTicker(`Loja atualizada. Custo do reroll: ${result.shop.meta.rerollCost} (proximo).`, "success");
      return result;
    } catch (err) {
      const message = err instanceof Error ? err.message : "Falha ao atualizar ofertas da loja.";
      setError(message);
      pushTicker(message, "warning");
      return null;
    } finally {
      setRerollingShop(false);
    }
  };

  const handleOpenBooster = async (packType: BoosterPackType) => {
    if (!player) {
      setSection("PROFILE");
      return null;
    }

    try {
      setOpeningBoosterType(packType);
      setError("");
      const result = await openShopBooster(player.publicId, packType);
      setPlayer(result.player);
      setCollectionEntries((current) => {
        const map = new Map(current.map((entry) => [entry.cardId, { ...entry }]));
        for (const card of result.cards) {
          const existing = map.get(card.cardId);
          if (existing) {
            existing.count += 1;
            map.set(card.cardId, existing);
          } else {
            map.set(card.cardId, {
              cardId: card.cardId,
              count: 1,
              name: card.name,
              kind: card.kind,
              atk: card.atk,
              def: card.def,
              tags: card.tags,
              effectDescription: card.effectDescription,
              imagePath: card.imagePath
            });
          }
        }
        return Array.from(map.values());
      });
      setCollectionCount((current) => current + result.cards.length);

      void (async () => {
        try {
          const latestShop = await fetchShopOffers(player.publicId, 20);
          setShopOffers(latestShop.offers);
          setShopMeta(latestShop.meta);
        } catch {
          // no-op
        }
      })();

      pushTicker(`Pacote ${packType} aberto: ${result.cards.length} cartas.`, "success");
      return result;
    } catch (err) {
      const message = err instanceof Error ? err.message : "Falha ao abrir pacote.";
      setError(message);
      pushTicker(message, "warning");
      return null;
    } finally {
      setOpeningBoosterType(null);
    }
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

      <div className="mt-4 grid gap-2 sm:grid-cols-3">
        <Link href="/match" className="fm-button rounded-lg px-3 py-2 text-center text-xs font-semibold">
          Modo Duelo
        </Link>
        <Link href="/deck-builder" className="fm-button rounded-lg px-3 py-2 text-center text-xs font-semibold">
          Deck Builder
        </Link>
        <Link href="/fusion-log" className="fm-button rounded-lg px-3 py-2 text-center text-xs font-semibold">
          Fusion Log
        </Link>
      </div>
    </GameCard>
  );

  const renderActiveSection = () => {
    if (!player) return renderAuthPanel();

    if (section === "CAMPAIGN") {
      return (
        <ShopPanel
          loading={loading || shopLoading}
          playerLogged={Boolean(player)}
          gold={player.gold}
          offers={shopOffers}
          shopMeta={shopMeta}
          shopConfig={shopConfig}
          buyingCardId={buyingCardId}
          onBuy={handleBuyShopCard}
          rerolling={rerollingShop}
          onReroll={handleRerollShop}
          openingBoosterType={openingBoosterType}
          onOpenBooster={handleOpenBooster}
        />
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
        onSetActiveDeck={(deckId) => void handleSetActiveDeck(deckId)}
        onLogout={handleLogout}
      />
    );
  };

  return (
    <main className="fm-screen fm-noise-overlay relative h-screen overflow-y-auto overflow-x-hidden text-slate-100">
      <div className="mx-auto w-full max-w-[1920px] p-2 sm:p-3 lg:p-4">
        <section className="relative min-h-[calc(100vh-1rem)] overflow-hidden rounded-[24px] border border-[#d1a95b]/45 shadow-[0_18px_64px_rgba(0,0,0,0.62)] sm:min-h-[calc(100vh-1.5rem)] lg:min-h-[calc(100vh-2rem)]">
          <Image src="/ui/ui-lobby.png" alt="Lobby background" fill priority className="pointer-events-none select-none object-cover opacity-[0.82]" />
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(115%_85%_at_24%_30%,rgba(106,154,255,0.24),transparent_56%),radial-gradient(150%_120%_at_70%_95%,rgba(0,0,0,0.6),transparent_68%),linear-gradient(180deg,rgba(4,9,22,0.28),rgba(3,7,18,0.62))]" />

          <div className="relative z-[1] mx-auto w-full max-w-[1760px] space-y-4 px-4 py-4 sm:px-5 sm:py-5 lg:space-y-5 lg:px-7 lg:py-6">
            <LobbyHeader
              player={player}
              loading={loading}
              hasCampaignProgress={hasCampaignProgress}
              onPrimaryAction={handlePrimaryAction}
              onSecondaryAction={handleSecondaryAction}
              onAuthAction={() => setSection("PROFILE")}
            />
            <LobbyTicker
              messages={tickerMessages}
              onRemove={removeTicker}
            />

            {error ? (
              <section className="rounded-xl border border-rose-500/70 bg-rose-900/40 px-3 py-2 text-sm text-rose-100">{error}</section>
            ) : null}

            <LobbyTabs active={section} onChange={setSection} disabled={false} />

            <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_370px]">
              <section className="min-w-0 space-y-3">
                <TabsAnimatedPanel active={section}>{renderActiveSection()}</TabsAnimatedPanel>
              </section>

              <aside className="space-y-3">
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
                <ProgressCard loading={loading} player={player} npcs={npcs} fusionCount={fusionCount} />
              </aside>
            </div>

            <QuickActions disabled={!player} />
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
