"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  clearStoredPublicId,
  fetchProgression,
  fetchShopConfig,
  fetchShopOffers,
  getStoredPublicId,
  openShopBooster,
  purchaseShopCard,
  rerollShopOffers,
  type BoosterPackType,
  type PlayerProfile,
  type ShopConfig,
  type ShopMeta,
  type ShopOffer
} from "../../lib/api";
import { GameCard } from "../../components/lobby/GameCard";
import { ShopPanel } from "../../components/lobby/ShopPanel";

export default function ShopPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [player, setPlayer] = useState<PlayerProfile | null>(null);
  const [offers, setOffers] = useState<ShopOffer[]>([]);
  const [shopMeta, setShopMeta] = useState<ShopMeta | null>(null);
  const [shopConfig, setShopConfig] = useState<ShopConfig | null>(null);
  const [buyingCardId, setBuyingCardId] = useState<string | null>(null);
  const [rerollingShop, setRerollingShop] = useState(false);
  const [openingBoosterType, setOpeningBoosterType] = useState<BoosterPackType | null>(null);

  const loadData = async (publicId: string) => {
    setLoading(true);
    setError("");
    try {
      const [progression, shop, config] = await Promise.all([
        fetchProgression(publicId),
        fetchShopOffers(publicId, 20),
        fetchShopConfig().catch(() => null)
      ]);
      setPlayer(progression.player);
      setOffers(shop.offers);
      setShopMeta(shop.meta ?? null);
      setShopConfig(config);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const boot = async () => {
      try {
        const publicId = getStoredPublicId();
        if (!publicId) {
          setPlayer(null);
          return;
        }
        await loadData(publicId);
      } catch (err) {
        clearStoredPublicId();
        setPlayer(null);
        setError(err instanceof Error ? err.message : "Falha ao carregar loja.");
      }
    };

    void boot();
  }, []);

  const handleBuy = async (cardId: string) => {
    if (!player) return null;
    try {
      setBuyingCardId(cardId);
      setError("");
      const result = await purchaseShopCard(player.publicId, cardId);
      setPlayer(result.player);
      const latestShop = await fetchShopOffers(player.publicId, 20);
      setOffers(latestShop.offers);
      setShopMeta(latestShop.meta);
      return result;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Falha ao comprar carta.");
      return null;
    } finally {
      setBuyingCardId(null);
    }
  };

  const handleReroll = async () => {
    if (!player) return null;
    try {
      setRerollingShop(true);
      setError("");
      const result = await rerollShopOffers(player.publicId, 20);
      setPlayer(result.player);
      setOffers(result.shop.offers);
      setShopMeta(result.shop.meta);
      return result;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Falha ao atualizar ofertas da loja.");
      return null;
    } finally {
      setRerollingShop(false);
    }
  };

  const handleOpenBooster = async (packType: BoosterPackType) => {
    if (!player) return null;
    try {
      setOpeningBoosterType(packType);
      setError("");
      const result = await openShopBooster(player.publicId, packType);
      setPlayer(result.player);
      const latestShop = await fetchShopOffers(player.publicId, 20);
      setOffers(latestShop.offers);
      setShopMeta(latestShop.meta);
      return result;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Falha ao abrir pacote.");
      return null;
    } finally {
      setOpeningBoosterType(null);
    }
  };

  return (
    <main className="fm-screen fm-noise-overlay lobby-readable relative min-h-[100dvh] overflow-y-auto overflow-x-hidden text-slate-100">
      <div className="mx-auto w-full max-w-[1800px] p-3 sm:p-4">
        <div className="space-y-3 rounded-2xl border border-[#d1a95b]/45 bg-[linear-gradient(180deg,rgba(4,11,27,0.86),rgba(3,9,22,0.92))] p-4 shadow-[0_18px_64px_rgba(0,0,0,0.62)]">
          <header className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <h1 className="fm-title text-2xl font-bold">Card Trader</h1>
            </div>
            <div className="flex gap-2">
              <Link href="/" className="fm-button rounded-md px-3 py-1.5 text-xs font-semibold">
                Voltar ao Lobby
              </Link>
              <Link href="/deck-builder" className="fm-button rounded-md px-3 py-1.5 text-xs font-semibold">
                Deck Builder
              </Link>
            </div>
          </header>

          {error ? <section className="rounded-xl border border-rose-500/70 bg-rose-900/40 px-3 py-2 text-sm text-rose-100">{error}</section> : null}

          {!player ? (
            <GameCard title="Conta necessaria" subtitle="Faca login no lobby para usar a loja.">
              <div className="flex gap-2">
                <Link href="/" className="fm-button rounded-md px-3 py-1.5 text-xs font-semibold">
                  Ir para Login
                </Link>
              </div>
            </GameCard>
          ) : (
            <ShopPanel
              loading={loading}
              playerLogged={Boolean(player)}
              gold={player.gold}
              offers={offers}
              shopMeta={shopMeta}
              shopConfig={shopConfig}
              buyingCardId={buyingCardId}
              onBuy={handleBuy}
              rerolling={rerollingShop}
              onReroll={handleReroll}
              openingBoosterType={openingBoosterType}
              onOpenBooster={handleOpenBooster}
            />
          )}
        </div>
      </div>
    </main>
  );
}
