import { useEffect, useMemo, useState } from "react";
import type { BoosterPackType, ShopBoosterResult, ShopConfig, ShopMeta, ShopOffer, ShopPurchaseResult, ShopRerollResult } from "../../lib/api";
import { GameCard } from "./GameCard";
import { SkeletonCard } from "./SkeletonCard";

interface ShopPanelProps {
  loading: boolean;
  playerLogged: boolean;
  gold: number;
  offers: ShopOffer[];
  shopMeta: ShopMeta | null;
  shopConfig: ShopConfig | null;
  buyingCardId: string | null;
  onBuy: (cardId: string) => Promise<ShopPurchaseResult | null>;
  rerolling: boolean;
  onReroll: () => Promise<ShopRerollResult | null>;
  openingBoosterType: BoosterPackType | null;
  onOpenBooster: (packType: BoosterPackType) => Promise<ShopBoosterResult | null>;
}

const FALLBACK_PACK_META: Array<{ type: BoosterPackType; label: string; cost: number; cards: number }> = [
  { type: "BEGINNER", label: "Booster Iniciante", cost: 340, cards: 3 },
  { type: "INTERMEDIATE", label: "Booster Intermediario", cost: 760, cards: 4 },
  { type: "ADVANCED", label: "Booster Avancado", cost: 1420, cards: 5 }
];

function segmentClasses(segment: ShopOffer["segment"]): string {
  if (segment === "AVANCADO") return "border-fuchsia-300/60 bg-fuchsia-900/30 text-fuchsia-100";
  if (segment === "INTERMEDIARIO") return "border-cyan-300/60 bg-cyan-900/30 text-cyan-100";
  return "border-emerald-300/60 bg-emerald-900/30 text-emerald-100";
}

function rarityClasses(rarity: ShopOffer["rarity"]): string {
  if (rarity === "UR") return "border-amber-300/70 bg-amber-900/35 text-amber-100";
  if (rarity === "SR") return "border-purple-300/70 bg-purple-900/35 text-purple-100";
  if (rarity === "R") return "border-cyan-300/70 bg-cyan-900/35 text-cyan-100";
  return "border-slate-400/70 bg-slate-800/80 text-slate-100";
}

function formatCountdown(nextRotationAt: number, nowMs: number): string {
  const remainMs = Math.max(0, nextRotationAt - nowMs);
  const totalSeconds = Math.floor(remainMs / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  const hh = String(hours).padStart(2, "0");
  const mm = String(minutes).padStart(2, "0");
  const ss = String(seconds).padStart(2, "0");
  return `${hh}:${mm}:${ss}`;
}

function playShopSuccessSound(): void {
  if (typeof window === "undefined") return;
  const AudioContextCtor = window.AudioContext || (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!AudioContextCtor) return;
  const ctx = new AudioContextCtor();
  const now = ctx.currentTime;

  const osc1 = ctx.createOscillator();
  const gain1 = ctx.createGain();
  osc1.type = "triangle";
  osc1.frequency.setValueAtTime(520, now);
  osc1.frequency.exponentialRampToValueAtTime(880, now + 0.12);
  gain1.gain.setValueAtTime(0.0001, now);
  gain1.gain.exponentialRampToValueAtTime(0.08, now + 0.02);
  gain1.gain.exponentialRampToValueAtTime(0.0001, now + 0.16);
  osc1.connect(gain1).connect(ctx.destination);
  osc1.start(now);
  osc1.stop(now + 0.17);

  const osc2 = ctx.createOscillator();
  const gain2 = ctx.createGain();
  osc2.type = "sine";
  osc2.frequency.setValueAtTime(1040, now + 0.08);
  gain2.gain.setValueAtTime(0.0001, now + 0.08);
  gain2.gain.exponentialRampToValueAtTime(0.045, now + 0.11);
  gain2.gain.exponentialRampToValueAtTime(0.0001, now + 0.21);
  osc2.connect(gain2).connect(ctx.destination);
  osc2.start(now + 0.08);
  osc2.stop(now + 0.22);

  void ctx.resume().catch(() => undefined);
  window.setTimeout(() => {
    void ctx.close().catch(() => undefined);
  }, 360);
}

export function ShopPanel({
  loading,
  playerLogged,
  gold,
  offers,
  shopMeta,
  shopConfig,
  buyingCardId,
  onBuy,
  rerolling,
  onReroll,
  openingBoosterType,
  onOpenBooster
}: ShopPanelProps) {
  const [offerToConfirm, setOfferToConfirm] = useState<ShopOffer | null>(null);
  const [kindFilter, setKindFilter] = useState<"ALL" | "MONSTER" | "SPELL" | "TRAP">("ALL");
  const [atkMin, setAtkMin] = useState(0);
  const [atkMax, setAtkMax] = useState(5000);
  const [defMin, setDefMin] = useState(0);
  const [defMax, setDefMax] = useState(5000);
  const [onlyUnowned, setOnlyUnowned] = useState(false);
  const [nowMs, setNowMs] = useState(() => Date.now());
  const [obtainedCard, setObtainedCard] = useState<ShopOffer | null>(null);
  const [boosterResult, setBoosterResult] = useState<ShopBoosterResult | null>(null);

  const modalOpen = Boolean(offerToConfirm);
  const rerollLocked = !shopMeta || shopMeta.rerollUsed >= shopMeta.rerollLimit;
  const packConfigs = useMemo(() => {
    return shopConfig?.boosters?.length ? shopConfig.boosters : FALLBACK_PACK_META;
  }, [shopConfig]);
  const packLabelByType = useMemo(() => {
    const map = new Map<BoosterPackType, string>();
    for (const pack of packConfigs) {
      map.set(pack.type, pack.label);
    }
    return map;
  }, [packConfigs]);

  useEffect(() => {
    const timer = window.setInterval(() => setNowMs(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    if (!modalOpen) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !buyingCardId) {
        setOfferToConfirm(null);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [modalOpen, buyingCardId]);

  useEffect(() => {
    if (!obtainedCard) return;
    const timeout = window.setTimeout(() => setObtainedCard(null), 2200);
    return () => window.clearTimeout(timeout);
  }, [obtainedCard]);

  const filteredOffers = useMemo(() => {
    return offers.filter((offer) => {
      if (kindFilter !== "ALL" && offer.kind !== kindFilter) return false;
      if (onlyUnowned && offer.owned > 0) return false;
      if (offer.kind === "MONSTER") {
        if ((offer.atk ?? 0) < atkMin || (offer.atk ?? 0) > atkMax) return false;
        if ((offer.def ?? 0) < defMin || (offer.def ?? 0) > defMax) return false;
      }
      return true;
    });
  }, [offers, kindFilter, onlyUnowned, atkMin, atkMax, defMin, defMax]);

  const confirmPurchase = async () => {
    if (!offerToConfirm || buyingCardId) return;
    const purchased = await onBuy(offerToConfirm.cardId);
    if (purchased) {
      playShopSuccessSound();
      setObtainedCard(offerToConfirm);
      setOfferToConfirm(null);
    }
  };

  const handleOpenBooster = async (packType: BoosterPackType) => {
    const result = await onOpenBooster(packType);
    if (result) {
      playShopSuccessSound();
      setBoosterResult(result);
    }
  };

  if (!playerLogged) {
    return (
      <GameCard title="Loja Arcana" subtitle="Entre para receber ofertas personalizadas.">
        <p className="text-sm text-slate-300">A selecao da loja usa seu progresso PVE e seu gold atual.</p>
      </GameCard>
    );
  }

  return (
    <div className="grid gap-3">
      <GameCard
        title="Loja Arcana"
        subtitle="Ofertas dinamicas com preco por tier, raridade e demanda global da comunidade."
        rightSlot={<span className="rounded border border-amber-300/60 bg-amber-900/35 px-2 py-0.5 text-[11px] font-semibold text-amber-100">Gold: {gold}</span>}
      >
        <div className="mb-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded border border-slate-600/80 bg-slate-900/65 px-2 py-1 text-[11px] text-slate-300">
            Ofertas: <span className="font-semibold text-slate-100">{offers.length}</span>
          </div>
          <div className="rounded border border-cyan-500/45 bg-cyan-950/30 px-2 py-1 text-[11px] text-cyan-100">
            Proxima rotacao: <span className="font-semibold">{shopMeta ? formatCountdown(shopMeta.nextRotationAt, nowMs) : "--:--:--"}</span>
          </div>
          <div className="rounded border border-slate-600/80 bg-slate-900/65 px-2 py-1 text-[11px] text-slate-300">
            Reroll hoje: <span className="font-semibold text-slate-100">{shopMeta ? `${shopMeta.rerollUsed}/${shopMeta.rerollLimit}` : "-"}</span>
          </div>
          <button
            type="button"
            onClick={() => void onReroll()}
            disabled={loading || rerolling || Boolean(buyingCardId) || rerollLocked || !shopMeta || gold < (shopMeta?.rerollCost ?? Number.POSITIVE_INFINITY)}
            className="fm-button rounded px-2 py-1 text-[11px] font-semibold disabled:cursor-not-allowed disabled:opacity-45"
          >
            {rerolling ? "Atualizando..." : `Atualizar ofertas (${shopMeta?.rerollCost ?? 0}g)`}
          </button>
        </div>
        <div className="mb-3 grid gap-2 rounded-lg border border-slate-700/80 bg-slate-900/55 p-2">
          <p className="text-xs font-semibold uppercase tracking-[0.08em] text-amber-100">Pacotes Booster</p>
          <div className="grid gap-2 md:grid-cols-3">
            {packConfigs.map((pack) => {
              const packType = pack.type;
              return (
                <button
                  key={packType}
                  type="button"
                  onClick={() => void handleOpenBooster(packType)}
                  disabled={loading || Boolean(buyingCardId) || Boolean(openingBoosterType) || gold < pack.cost}
                  className="fm-button rounded-lg border border-slate-600/80 bg-slate-900/60 px-2 py-2 text-left disabled:cursor-not-allowed disabled:opacity-45"
                >
                  <p className="text-xs font-semibold text-slate-100">{pack.label}</p>
                  <p className="text-[11px] text-slate-300">{pack.cards} cartas</p>
                  <p className="text-[11px] font-semibold text-emerald-200">{openingBoosterType === packType ? "Abrindo..." : `${pack.cost} gold`}</p>
                </button>
              );
            })}
          </div>
        </div>

        <div className="mb-3 grid gap-2 rounded-lg border border-slate-700/80 bg-slate-900/55 p-2 md:grid-cols-2 xl:grid-cols-6">
          <label className="text-[11px] text-slate-300">
            Tipo
            <select
              value={kindFilter}
              onChange={(event) => setKindFilter(event.target.value as "ALL" | "MONSTER" | "SPELL" | "TRAP")}
              className="mt-1 w-full rounded border border-slate-600/70 bg-slate-950/80 px-2 py-1 text-xs text-slate-100"
            >
              <option value="ALL">Todos</option>
              <option value="MONSTER">Monster</option>
              <option value="SPELL">Spell</option>
              <option value="TRAP">Trap</option>
            </select>
          </label>

          <label className="text-[11px] text-slate-300">
            ATK min
            <input
              type="number"
              min={0}
              max={5000}
              value={atkMin}
              onChange={(event) => setAtkMin(Number(event.target.value) || 0)}
              className="mt-1 w-full rounded border border-slate-600/70 bg-slate-950/80 px-2 py-1 text-xs text-slate-100"
            />
          </label>

          <label className="text-[11px] text-slate-300">
            ATK max
            <input
              type="number"
              min={0}
              max={5000}
              value={atkMax}
              onChange={(event) => setAtkMax(Number(event.target.value) || 0)}
              className="mt-1 w-full rounded border border-slate-600/70 bg-slate-950/80 px-2 py-1 text-xs text-slate-100"
            />
          </label>

          <label className="text-[11px] text-slate-300">
            DEF min
            <input
              type="number"
              min={0}
              max={5000}
              value={defMin}
              onChange={(event) => setDefMin(Number(event.target.value) || 0)}
              className="mt-1 w-full rounded border border-slate-600/70 bg-slate-950/80 px-2 py-1 text-xs text-slate-100"
            />
          </label>

          <label className="text-[11px] text-slate-300">
            DEF max
            <input
              type="number"
              min={0}
              max={5000}
              value={defMax}
              onChange={(event) => setDefMax(Number(event.target.value) || 0)}
              className="mt-1 w-full rounded border border-slate-600/70 bg-slate-950/80 px-2 py-1 text-xs text-slate-100"
            />
          </label>

          <label className="flex items-end gap-2 pb-1 text-[11px] text-slate-300">
            <input
              type="checkbox"
              checked={onlyUnowned}
              onChange={(event) => setOnlyUnowned(event.target.checked)}
              className="h-3.5 w-3.5 rounded border-slate-500/80 bg-slate-950"
            />
            Somente nao possuo
          </label>
        </div>

        {loading ? (
          <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
            {Array.from({ length: 6 }).map((_, index) => (
              <SkeletonCard key={`shop-skeleton-${index}`} className="h-[132px]" />
            ))}
          </div>
        ) : filteredOffers.length === 0 ? (
          <div className="rounded-lg border border-slate-700/80 bg-slate-900/55 px-3 py-4 text-center text-sm text-slate-300">
            Nenhuma oferta encontrada com os filtros atuais.
          </div>
        ) : (
          <div className="fm-scroll max-h-[68vh] overflow-y-auto pr-1">
            <div className="mb-2 text-xs text-slate-300">Mostrando {filteredOffers.length} / {offers.length} ofertas.</div>
            <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
              {filteredOffers.map((offer) => (
                <article key={offer.cardId} className="lobby-motion-card flex gap-2 rounded-lg border border-slate-700/80 bg-slate-900/65 p-2.5">
                  <div className="h-[90px] w-[64px] shrink-0 overflow-hidden rounded border border-slate-600/75 bg-slate-900">
                    {offer.imagePath ? (
                      <img src={offer.imagePath} alt={offer.name} className="h-full w-full object-cover" loading="lazy" />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center text-[10px] text-slate-400">No Art</div>
                    )}
                  </div>

                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-slate-100">{offer.name}</p>
                    <div className="mt-1 flex flex-wrap gap-1">
                      <span className={`rounded border px-1.5 py-0.5 text-[10px] font-semibold ${segmentClasses(offer.segment)}`}>{offer.segment}</span>
                      <span className={`rounded border px-1.5 py-0.5 text-[10px] font-semibold ${rarityClasses(offer.rarity)}`}>{offer.rarity}</span>
                      <span className="rounded border border-amber-200/45 bg-amber-900/30 px-1.5 py-0.5 text-[10px] font-semibold text-amber-100">{offer.kind}</span>
                    </div>

                    {offer.kind === "MONSTER" ? (
                      <p className="mt-1 text-xs text-slate-200">
                        ATK <span className="font-semibold text-amber-100">{offer.atk ?? 0}</span> / DEF{" "}
                        <span className="font-semibold text-cyan-100">{offer.def ?? 0}</span>
                      </p>
                    ) : (
                      <p className="mt-1 max-h-[32px] overflow-hidden text-[11px] leading-snug text-slate-300">{offer.effectDescription ?? "Sem efeito descritivo."}</p>
                    )}

                    <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                      <span className="rounded border border-emerald-300/45 bg-emerald-900/35 px-1.5 py-0.5 text-[10px] font-semibold text-emerald-100">Preco: {offer.price}</span>
                      <span
                        className={`rounded border px-1.5 py-0.5 text-[10px] ${
                          offer.affordable ? "border-cyan-300/45 bg-cyan-900/35 text-cyan-100" : "border-rose-300/45 bg-rose-900/35 text-rose-100"
                        }`}
                      >
                        {offer.affordable ? "Compravel agora" : "Gold insuficiente"}
                      </span>
                      {offer.owned > 0 ? (
                        <span className="rounded border border-slate-500/60 bg-slate-800/75 px-1.5 py-0.5 text-[10px] text-slate-200">Colecao x{offer.owned}</span>
                      ) : null}
                    </div>

                    <button
                      type="button"
                      onClick={() => setOfferToConfirm(offer)}
                      disabled={Boolean(buyingCardId) || gold < offer.price}
                      className="fm-button mt-2 w-full rounded px-2 py-1 text-[11px] font-semibold disabled:cursor-not-allowed disabled:opacity-45"
                    >
                      {buyingCardId === offer.cardId ? "Comprando..." : gold >= offer.price ? "Comprar" : "Sem gold"}
                    </button>
                  </div>
                </article>
              ))}
            </div>
          </div>
        )}
      </GameCard>

      {offerToConfirm ? (
        <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/68 p-4">
          <button
            type="button"
            className="absolute inset-0 cursor-default"
            onClick={() => {
              if (!buyingCardId) setOfferToConfirm(null);
            }}
            aria-label="Fechar confirmacao"
          />
          <div className="relative w-full max-w-[760px] rounded-xl border border-amber-300/45 bg-slate-950/95 p-4 shadow-[0_20px_56px_rgba(0,0,0,0.75)]">
            <div className="mb-3 border-b border-slate-700/80 pb-3">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-amber-200">Confirmar Compra</p>
              <p className="mt-1 text-sm text-slate-300">Verifique os dados da carta antes de concluir.</p>
            </div>

            <div className="grid gap-4 md:grid-cols-[230px_minmax(0,1fr)]">
              <div className="mx-auto h-[330px] w-[230px] overflow-hidden rounded border border-slate-600/80 bg-slate-900">
                {offerToConfirm.imagePath ? (
                  <img src={offerToConfirm.imagePath} alt={offerToConfirm.name} className="h-full w-full object-cover" />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-sm text-slate-400">Sem arte</div>
                )}
              </div>

              <div className="min-w-0">
                <p className="text-lg font-semibold text-slate-100">{offerToConfirm.name}</p>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  <span className={`rounded border px-2 py-0.5 text-[10px] font-semibold ${segmentClasses(offerToConfirm.segment)}`}>{offerToConfirm.segment}</span>
                  <span className={`rounded border px-2 py-0.5 text-[10px] font-semibold ${rarityClasses(offerToConfirm.rarity)}`}>{offerToConfirm.rarity}</span>
                  <span className="rounded border border-amber-200/45 bg-amber-900/30 px-2 py-0.5 text-[10px] font-semibold text-amber-100">{offerToConfirm.kind}</span>
                </div>

                {offerToConfirm.kind === "MONSTER" ? (
                  <p className="mt-3 text-sm text-slate-200">
                    ATK <span className="font-semibold text-amber-100">{offerToConfirm.atk ?? 0}</span> / DEF{" "}
                    <span className="font-semibold text-cyan-100">{offerToConfirm.def ?? 0}</span>
                  </p>
                ) : (
                  <p className="mt-3 rounded border border-slate-700/80 bg-slate-900/75 px-2 py-2 text-xs leading-relaxed text-slate-200">
                    {offerToConfirm.effectDescription ?? "Sem efeito descritivo."}
                  </p>
                )}

                <div className="mt-3 flex flex-wrap gap-2 text-xs">
                  <span className="rounded border border-emerald-300/45 bg-emerald-900/35 px-2 py-1 font-semibold text-emerald-100">Preco: {offerToConfirm.price} gold</span>
                  <span className="rounded border border-slate-500/60 bg-slate-800/70 px-2 py-1 text-slate-200">Na colecao: x{offerToConfirm.owned}</span>
                  <span className="rounded border border-cyan-300/40 bg-cyan-900/30 px-2 py-1 text-cyan-100">Gold apos compra: {Math.max(gold - offerToConfirm.price, 0)}</span>
                </div>
              </div>
            </div>

            <div className="mt-4 flex flex-wrap justify-end gap-2">
              <button
                type="button"
                onClick={() => setOfferToConfirm(null)}
                disabled={Boolean(buyingCardId)}
                className="fm-button rounded px-3 py-1.5 text-xs font-semibold disabled:cursor-not-allowed disabled:opacity-45"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => void confirmPurchase()}
                disabled={Boolean(buyingCardId) || gold < offerToConfirm.price}
                className="fm-button rounded px-3 py-1.5 text-xs font-semibold disabled:cursor-not-allowed disabled:opacity-45"
              >
                {buyingCardId === offerToConfirm.cardId ? "Comprando..." : "Confirmar compra"}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {boosterResult ? (
        <div className="fixed inset-0 z-[125] flex items-center justify-center bg-black/70 p-4">
          <button type="button" className="absolute inset-0" aria-label="Fechar resultado" onClick={() => setBoosterResult(null)} />
          <div className="relative w-full max-w-[860px] rounded-xl border border-cyan-300/35 bg-slate-950/95 p-4 shadow-[0_20px_56px_rgba(0,0,0,0.75)]">
            <div className="mb-3 border-b border-slate-700/80 pb-3">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-cyan-100">Resultado do Booster</p>
              <p className="mt-1 text-sm text-slate-300">
                {packLabelByType.get(boosterResult.packType) ?? boosterResult.packType} aberto por {boosterResult.packCost} gold.
              </p>
            </div>

            <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
              {boosterResult.cards.map((card) => (
                <div key={`${boosterResult.packType}-${card.cardId}-${card.name}`} className="rounded border border-slate-700/80 bg-slate-900/65 p-2">
                  <div className="flex gap-2">
                    <div className="h-[88px] w-[62px] overflow-hidden rounded border border-slate-600/75 bg-slate-900">
                      {card.imagePath ? <img src={card.imagePath} alt={card.name} className="h-full w-full object-cover" /> : null}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-slate-100">{card.name}</p>
                      <div className="mt-1 flex flex-wrap gap-1">
                        <span className={`rounded border px-1.5 py-0.5 text-[10px] font-semibold ${segmentClasses(card.segment)}`}>{card.segment}</span>
                        <span className={`rounded border px-1.5 py-0.5 text-[10px] font-semibold ${rarityClasses(card.rarity)}`}>{card.rarity}</span>
                      </div>
                      {card.kind === "MONSTER" ? (
                        <p className="mt-1 text-xs text-slate-200">
                          ATK <span className="font-semibold text-amber-100">{card.atk}</span> / DEF <span className="font-semibold text-cyan-100">{card.def}</span>
                        </p>
                      ) : (
                        <p className="mt-1 max-h-[32px] overflow-hidden text-[11px] leading-snug text-slate-300">{card.effectDescription ?? "Sem efeito."}</p>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-4 flex justify-end">
              <button type="button" onClick={() => setBoosterResult(null)} className="fm-button rounded px-3 py-1.5 text-xs font-semibold">
                Fechar
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {obtainedCard ? (
        <div className="pointer-events-none fixed bottom-6 right-6 z-[130] overflow-hidden rounded-lg border border-amber-300/65 bg-slate-950/90 px-3 py-2 shadow-[0_12px_24px_rgba(0,0,0,0.45)] shop-obtained-pop">
          <div className="flex items-center gap-2">
            <div className="h-[54px] w-[38px] overflow-hidden rounded border border-slate-500/70 bg-slate-900">
              {obtainedCard.imagePath ? <img src={obtainedCard.imagePath} alt={obtainedCard.name} className="h-full w-full object-cover" /> : null}
            </div>
            <div>
              <p className="text-[11px] uppercase tracking-[0.12em] text-amber-200">Card Obtido</p>
              <p className="text-sm font-semibold text-slate-100">{obtainedCard.name}</p>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
