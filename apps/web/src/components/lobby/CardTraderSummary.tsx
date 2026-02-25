"use client";

import { useEffect, useMemo, useState } from "react";
import type { ShopMeta, ShopOffer } from "../../lib/api";
import { GameCard } from "./GameCard";

interface CardTraderSummaryProps {
  loading: boolean;
  playerLogged: boolean;
  gold: number;
  offers: ShopOffer[];
  shopMeta: ShopMeta | null;
  rerolling: boolean;
  canReroll: boolean;
  onOpenShop: () => void;
  onReroll: () => void;
}

function countdown(nextRotationAt: number, nowMs: number): string {
  const remainMs = Math.max(0, nextRotationAt - nowMs);
  const totalSeconds = Math.floor(remainMs / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
}

export function CardTraderSummary({
  loading,
  playerLogged,
  gold,
  offers,
  shopMeta,
  rerolling,
  canReroll,
  onOpenShop,
  onReroll
}: CardTraderSummaryProps) {
  const [nowMs, setNowMs] = useState(() => Date.now());

  useEffect(() => {
    const timer = window.setInterval(() => setNowMs(Date.now()), 30000);
    return () => window.clearInterval(timer);
  }, []);

  const previewCards = useMemo(() => offers.slice(0, 3), [offers]);

  if (!playerLogged) {
    return (
      <GameCard title="Card Trader" subtitle="Loja Arcana disponivel apos login.">
        <p className="text-sm text-slate-300">Entre para receber ofertas baseadas no seu progresso de campanha.</p>
      </GameCard>
    );
  }

  return (
    <GameCard title="Card Trader" subtitle="Loja Arcana com ofertas rotativas para seu nivel atual.">
      <div className="grid gap-3">
        <div className="grid gap-2 sm:grid-cols-3">
          <div className="rounded-lg border border-slate-700/80 bg-slate-900/65 px-3 py-2 text-xs text-slate-200">
            Ofertas atuais: <span className="font-semibold text-amber-100">{offers.length}</span>
          </div>
          <div className="rounded-lg border border-cyan-400/45 bg-cyan-950/25 px-3 py-2 text-xs text-cyan-100">
            Proxima rotacao: <span className="font-semibold">{shopMeta ? countdown(shopMeta.nextRotationAt, nowMs) : "--:--"}</span>
          </div>
          <div className="rounded-lg border border-amber-300/45 bg-amber-900/30 px-3 py-2 text-xs text-amber-100">
            Gold disponivel: <span className="font-semibold">{gold}</span>
          </div>
        </div>

        {loading ? (
          <div className="grid gap-2 sm:grid-cols-3">
            {Array.from({ length: 3 }).map((_, index) => (
              <div key={`shop-summary-loading-${index}`} className="h-[104px] animate-pulse rounded-lg border border-slate-700/75 bg-slate-800/60" />
            ))}
          </div>
        ) : previewCards.length > 0 ? (
          <div className="grid gap-2 sm:grid-cols-3">
            {previewCards.map((offer) => (
              <article key={offer.cardId} className="rounded-lg border border-slate-700/80 bg-slate-900/65 p-2">
                <div className="flex gap-2">
                  <div className="h-[76px] w-[54px] shrink-0 overflow-hidden rounded border border-slate-600/75 bg-slate-900">
                    {offer.imagePath ? <img src={offer.imagePath} alt={offer.name} className="h-full w-full object-cover" loading="lazy" /> : null}
                  </div>
                  <div className="min-w-0">
                    <p className="truncate text-xs font-semibold text-slate-100">{offer.name}</p>
                    <p className="mt-1 text-[11px] text-slate-300">{offer.kind}</p>
                    {offer.kind === "MONSTER" ? (
                      <p className="mt-1 text-[11px] text-slate-200">ATK {offer.atk ?? 0} / DEF {offer.def ?? 0}</p>
                    ) : (
                      <p className="mt-1 line-clamp-2 text-[10px] text-slate-300">{offer.effectDescription ?? "Sem efeito descrito."}</p>
                    )}
                    <p className="mt-1 text-[11px] font-semibold text-amber-100">{offer.price}g</p>
                  </div>
                </div>
              </article>
            ))}
          </div>
        ) : (
          <div className="rounded-lg border border-slate-700/80 bg-slate-900/65 px-3 py-3 text-sm text-slate-300">
            Nenhuma oferta disponivel agora.
          </div>
        )}

        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={onOpenShop} className="lobby-pressable rounded-lg border border-amber-300/80 bg-[linear-gradient(180deg,rgba(176,120,33,0.96),rgba(120,79,18,0.98))] px-4 py-2 text-sm font-semibold text-amber-50 shadow-[inset_0_1px_0_rgba(255,232,179,0.35),0_10px_18px_rgba(0,0,0,0.28)]">
            Abrir loja
          </button>
          <button
            type="button"
            onClick={onReroll}
            disabled={rerolling || !canReroll}
            className="fm-button rounded-lg px-4 py-2 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-45"
          >
            {rerolling ? "Atualizando..." : `Atualizar ofertas (${shopMeta?.rerollCost ?? 0}g)`}
          </button>
        </div>
      </div>
    </GameCard>
  );
}
