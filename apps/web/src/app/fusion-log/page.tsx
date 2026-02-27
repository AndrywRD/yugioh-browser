"use client";

import Link from "next/link";
import { useEffect, useMemo, useState, type DragEvent } from "react";
import { CARD_INDEX } from "@ruptura-arcana/game";
import { HudStage } from "../../components/ui/HudStage";
import {
  fetchCollection,
  fetchPlayerProfile,
  fetchFusionLog,
  getStoredPublicId,
  testFusion,
  type CollectionEntry,
  type FusionDiscoveryEntry,
  type FusionTestResult,
  type PlayerProfile
} from "../../lib/api";

export default function FusionLogPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [player, setPlayer] = useState<PlayerProfile | null>(null);
  const [collection, setCollection] = useState<CollectionEntry[]>([]);
  const [discoveries, setDiscoveries] = useState<FusionDiscoveryEntry[]>([]);
  const [search, setSearch] = useState("");
  const [tagFilter, setTagFilter] = useState("");

  const [labSlots, setLabSlots] = useState<[string, string, string]>(["", "", ""]);
  const [labSubmitting, setLabSubmitting] = useState(false);
  const [labError, setLabError] = useState("");
  const [labNotice, setLabNotice] = useState("");
  const [labResult, setLabResult] = useState<FusionTestResult | null>(null);
  const [draggingCardId, setDraggingCardId] = useState<string | null>(null);
  const [dragOverSlot, setDragOverSlot] = useState<number | null>(null);

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        setError("");
        const publicId = getStoredPublicId();
        if (!publicId) {
          throw new Error("Sessao nao encontrada. Faca login no lobby.");
        }
        const profile = await fetchPlayerProfile(publicId);
        setPlayer(profile);
        const [rows, collectionRows] = await Promise.all([fetchFusionLog(publicId), fetchCollection(publicId)]);
        setDiscoveries(rows);
        setCollection(collectionRows.filter((entry) => entry.count > 0));
      } catch (err) {
        setError(err instanceof Error ? err.message : "Falha ao carregar fusion log.");
      } finally {
        setLoading(false);
      }
    };

    void load();
  }, []);

  const cardNameById = useMemo(() => new Map(collection.map((entry) => [entry.cardId, entry.name] as const)), [collection]);

  const cardArtById = useMemo(() => {
    return new Map(collection.map((entry) => [entry.cardId, entry.imagePath ?? CARD_INDEX[entry.cardId]?.imagePath ?? ""] as const));
  }, [collection]);

  const cardCountById = useMemo(() => new Map(collection.map((entry) => [entry.cardId, entry.count] as const)), [collection]);

  const availableCards = useMemo(() => [...collection].sort((left, right) => left.name.localeCompare(right.name)), [collection]);

  const selectedLabMaterials = useMemo(() => labSlots.map((cardId) => cardId.trim()).filter(Boolean), [labSlots]);

  const usedInLabByCardId = useMemo(() => {
    const map = new Map<string, number>();
    for (const cardId of labSlots) {
      const normalized = cardId.trim();
      if (!normalized) continue;
      map.set(normalized, (map.get(normalized) ?? 0) + 1);
    }
    return map;
  }, [labSlots]);

  const getCardArt = (cardId: string): string => cardArtById.get(cardId) ?? CARD_INDEX[cardId]?.imagePath ?? "";

  const filteredDiscoveries = useMemo(() => {
    const text = search.trim().toLowerCase();
    const tag = tagFilter.trim().toUpperCase();

    return discoveries.filter((item) => {
      const resultCard = CARD_INDEX[item.resultCardId];
      const resultCardName = resultCard?.name ?? item.resultName;
      const resultTags = resultCard?.tags ?? [];
      const materialCardNames = item.materialCardIds.map((cardId) => cardNameById.get(cardId) ?? CARD_INDEX[cardId]?.name ?? cardId);
      const matchesText =
        text.length === 0 ||
        resultCardName.toLowerCase().includes(text) ||
        item.resultName.toLowerCase().includes(text) ||
        item.materialTags.some((materialTag) => materialTag.toLowerCase().includes(text)) ||
        materialCardNames.some((materialName) => materialName.toLowerCase().includes(text)) ||
        resultTags.some((resultTag) => resultTag.toLowerCase().includes(text));

      const matchesTag = tag.length === 0 || item.materialTags.includes(tag) || resultTags.some((resultTag) => String(resultTag) === tag);
      return matchesText && matchesTag;
    });
  }, [cardNameById, discoveries, search, tagFilter]);

  const uniqueTags = useMemo(() => {
    const tagSet = new Set<string>();
    for (const item of discoveries) {
      for (const tag of item.materialTags) tagSet.add(tag);
      const resultTags = CARD_INDEX[item.resultCardId]?.tags ?? [];
      for (const tag of resultTags) tagSet.add(tag);
    }
    return Array.from(tagSet).sort((a, b) => a.localeCompare(b));
  }, [discoveries]);

  const updateLabSlot = (slotIndex: 0 | 1 | 2, value: string) => {
    setLabSlots((current) => {
      const next: [string, string, string] = [...current] as [string, string, string];
      next[slotIndex] = value;
      return next;
    });
  };

  const placeCardInSlot = (slotIndex: 0 | 1 | 2, cardId: string) => {
    const normalizedCardId = cardId.trim();
    if (!normalizedCardId) return;
    const availableCopies = cardCountById.get(normalizedCardId) ?? 0;
    if (availableCopies <= 0) {
      setLabError("Carta invalida para o Fusion Lab.");
      return;
    }

    const usedOutsideTarget = labSlots.reduce((total, value, index) => (index === slotIndex ? total : value === normalizedCardId ? total + 1 : total), 0);
    if (usedOutsideTarget >= availableCopies) {
      const cardName = cardNameById.get(normalizedCardId) ?? CARD_INDEX[normalizedCardId]?.name ?? normalizedCardId;
      setLabError(`Voce nao possui copias suficientes de ${cardName}.`);
      return;
    }

    updateLabSlot(slotIndex, normalizedCardId);
    setLabError("");
    setLabNotice("");
  };

  const clearLabSlot = (slotIndex: 0 | 1 | 2) => {
    updateLabSlot(slotIndex, "");
    setLabError("");
    setLabNotice("");
  };

  const addCardToFirstAvailableSlot = (cardId: string) => {
    const emptySlotIndex = labSlots.findIndex((slotCardId) => slotCardId.trim().length === 0);
    const targetSlot = (emptySlotIndex >= 0 ? emptySlotIndex : 0) as 0 | 1 | 2;
    placeCardInSlot(targetSlot, cardId);
  };

  const onCollectionDragStart = (event: DragEvent<HTMLButtonElement>, cardId: string) => {
    event.dataTransfer.effectAllowed = "copy";
    event.dataTransfer.setData("text/plain", cardId);
    setDraggingCardId(cardId);
  };

  const onCollectionDragEnd = () => {
    setDraggingCardId(null);
    setDragOverSlot(null);
  };

  const onSlotDragOver = (event: DragEvent<HTMLDivElement>, slotIndex: 0 | 1 | 2) => {
    event.preventDefault();
    setDragOverSlot(slotIndex);
  };

  const onSlotDrop = (event: DragEvent<HTMLDivElement>, slotIndex: 0 | 1 | 2) => {
    event.preventDefault();
    const droppedCardId = event.dataTransfer.getData("text/plain") || draggingCardId || "";
    setDragOverSlot(null);
    setDraggingCardId(null);
    placeCardInSlot(slotIndex, droppedCardId);
  };

  const runFusionTest = async () => {
    if (!player) return;
    if (selectedLabMaterials.length < 2 || selectedLabMaterials.length > 3) {
      setLabError("Selecione 2 ou 3 cartas para testar.");
      return;
    }

    try {
      setLabSubmitting(true);
      setLabError("");
      setLabNotice("");
      const result = await testFusion(player.publicId, selectedLabMaterials);
      setLabResult(result);

      if (result.discovery) {
        const refreshed = await fetchFusionLog(player.publicId);
        setDiscoveries(refreshed);
        setLabNotice(`Descoberta registrada: ${result.discovery.resultName}.`);
      } else if (result.result.failed) {
        setLabNotice("Teste concluido sem descoberta (fusao nao encontrada).");
      } else {
        setLabNotice("Teste concluido. Essa fusao ja estava no seu log.");
      }
    } catch (err) {
      setLabError(err instanceof Error ? err.message : "Falha ao testar fusao.");
    } finally {
      setLabSubmitting(false);
    }
  };

  return (
    <HudStage>
      <div className="mx-auto w-full max-w-[1200px] space-y-4 pb-4">
        <header className="fm-panel rounded-xl px-4 py-3">
          <h1 className="fm-title text-xl font-bold text-cyan-200">Fusion Log</h1>
          <p className="fm-subtitle text-xs">Descobertas de fusao {player ? `de ${player.username}` : ""} - Total: {discoveries.length}</p>
        </header>

        <section className="fm-panel rounded-xl p-4">
          <div className="mb-3">
            <h2 className="text-sm font-semibold text-fuchsia-100">Fusion Lab (3 Slots)</h2>
            <p className="text-xs text-slate-300">Arraste cartas da colecao para os slots ou clique para auto-preencher.</p>
          </div>

          <div className="grid gap-3 md:grid-cols-[1fr_1fr]">
            <div className="space-y-2">
              <p className="text-xs text-slate-300">Slots de fusao</p>
              <div className="grid gap-2 sm:grid-cols-3">
                {([0, 1, 2] as const).map((slotIndex) => {
                  const cardId = labSlots[slotIndex];
                  const cardName = cardNameById.get(cardId) ?? CARD_INDEX[cardId]?.name ?? "";
                  const cardArt = getCardArt(cardId);
                  const isActiveDrop = dragOverSlot === slotIndex;
                  return (
                    <div
                      key={slotIndex}
                      onDragOver={(event) => onSlotDragOver(event, slotIndex)}
                      onDragLeave={() => setDragOverSlot(null)}
                      onDrop={(event) => onSlotDrop(event, slotIndex)}
                      className={`rounded-lg border p-2 transition ${isActiveDrop ? "border-cyan-300 bg-cyan-900/30" : "border-slate-700 bg-slate-800/60"}`}
                    >
                      <p className="text-[11px] font-semibold text-slate-300">Slot {slotIndex + 1}</p>
                      {cardId ? (
                        <div className="mt-1 flex items-start gap-2">
                          <div className="h-20 w-14 shrink-0 overflow-hidden rounded border border-slate-600/70 bg-slate-900">
                            {cardArt ? (
                              <img src={cardArt} alt={cardName || cardId} className="h-full w-full object-cover" loading="lazy" />
                            ) : (
                              <div className="flex h-full w-full items-center justify-center text-[10px] text-slate-400">No Art</div>
                            )}
                          </div>
                          <div className="min-w-0 space-y-1">
                            <p className="line-clamp-2 text-xs text-cyan-100">{cardName || cardId}</p>
                            <button
                              type="button"
                              onClick={() => clearLabSlot(slotIndex)}
                              className="rounded border border-rose-500/60 px-2 py-0.5 text-[11px] text-rose-200 hover:bg-rose-900/35"
                            >
                              Remover
                            </button>
                          </div>
                        </div>
                      ) : (
                        <p className="mt-1 text-xs text-slate-400">Arraste aqui</p>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="space-y-2">
              <p className="text-xs text-slate-300">Colecao (arraste para os slots)</p>
              <div className="fm-scroll max-h-60 overflow-y-auto rounded-lg border border-slate-700 bg-slate-950/70 p-2">
                <div className="grid gap-1.5">
                  {availableCards.map((entry) => {
                    const used = usedInLabByCardId.get(entry.cardId) ?? 0;
                    const remaining = Math.max(0, entry.count - used);
                    const disabled = remaining <= 0;
                    const cardArt = getCardArt(entry.cardId);
                    return (
                      <button
                        key={entry.cardId}
                        type="button"
                        draggable={!disabled}
                        onDragStart={(event) => onCollectionDragStart(event, entry.cardId)}
                        onDragEnd={onCollectionDragEnd}
                        onClick={() => addCardToFirstAvailableSlot(entry.cardId)}
                        disabled={disabled}
                        className="flex items-center justify-between gap-2 rounded border border-slate-700 bg-slate-900 px-2 py-1 text-left text-xs hover:border-cyan-400/60 hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-45"
                      >
                        <div className="flex min-w-0 items-center gap-2">
                          <div className="h-10 w-7 shrink-0 overflow-hidden rounded border border-slate-600/70 bg-slate-950">
                            {cardArt ? (
                              <img src={cardArt} alt={entry.name} className="h-full w-full object-cover" loading="lazy" />
                            ) : (
                              <div className="flex h-full w-full items-center justify-center text-[9px] text-slate-500">No</div>
                            )}
                          </div>
                          <span className="truncate pr-2 text-slate-100">{entry.name}</span>
                        </div>
                        <span className="shrink-0 text-[11px] text-slate-300">
                          x{entry.count} {used > 0 ? `(usadas ${used})` : ""}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>

          <div className="mt-3 flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={runFusionTest}
              disabled={labSubmitting || selectedLabMaterials.length < 2}
              className="fm-button rounded-lg px-3 py-2 text-sm font-semibold text-cyan-100 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {labSubmitting ? "Testando..." : "Testar Fusao"}
            </button>
            <button
              type="button"
              onClick={() => {
                setLabSlots(["", "", ""]);
                setLabResult(null);
                setLabError("");
                setLabNotice("");
              }}
              className="fm-button rounded-lg px-3 py-2 text-sm font-semibold"
            >
              Limpar
            </button>
          </div>

          {labResult && (
            <div className="mt-3 rounded-lg border border-slate-700 bg-slate-950/70 p-3">
              <p className="text-sm font-semibold text-cyan-100">Resultado do teste</p>
              <div className="mt-2 flex flex-wrap items-center gap-2">
                {labResult.materials.map((item) => {
                  const materialArt = getCardArt(item.cardId);
                  return (
                    <div key={`mat-${item.cardId}-${item.name}`} className="flex items-center gap-2 rounded border border-slate-700 bg-slate-900 px-2 py-1">
                      <div className="h-10 w-7 shrink-0 overflow-hidden rounded border border-slate-600/70 bg-slate-950">
                        {materialArt ? (
                          <img src={materialArt} alt={item.name} className="h-full w-full object-cover" loading="lazy" />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center text-[9px] text-slate-500">No</div>
                        )}
                      </div>
                      <span className="max-w-[130px] truncate text-xs text-slate-200">{item.name}</span>
                    </div>
                  );
                })}
              </div>
              <div className="mt-3 flex items-start gap-3 rounded border border-cyan-500/40 bg-cyan-900/20 p-2">
                <div className="h-20 w-14 shrink-0 overflow-hidden rounded border border-slate-600/70 bg-slate-900">
                  {getCardArt(labResult.result.cardId) ? (
                    <img src={getCardArt(labResult.result.cardId)} alt={labResult.result.name} className="h-full w-full object-cover" loading="lazy" />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-[10px] text-slate-400">No Art</div>
                  )}
                </div>
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-cyan-100">{labResult.result.name}</p>
                  <p className="text-[11px] text-slate-300">{labResult.result.cardId}</p>
                </div>
              </div>
              {labResult.result.failed && (
                <p className="mt-2 text-xs text-amber-200">Fusao nao encontrada. Fallback aplicado: {labResult.result.fallbackType ?? "FALLBACK_WEAK"}.</p>
              )}
            </div>
          )}

          {labNotice && <p className="mt-2 text-xs text-emerald-200">{labNotice}</p>}
          {labError && <p className="mt-2 text-xs text-rose-200">{labError}</p>}
        </section>

        <section className="fm-panel rounded-xl p-4">
          <div className="grid gap-3 md:grid-cols-[1fr_220px_auto]">
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Buscar por resultado, material ou tag..."
              className="rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-slate-100"
            />
            <select
              value={tagFilter}
              onChange={(event) => setTagFilter(event.target.value)}
              className="rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-slate-100"
            >
              <option value="">Todas as tags</option>
              {uniqueTags.map((tag) => (
                <option key={tag} value={tag}>
                  {tag}
                </option>
              ))}
            </select>
            <Link href="/" className="fm-button rounded-lg px-3 py-2 text-center text-sm font-semibold">
              Voltar ao Lobby
            </Link>
          </div>
        </section>

        {loading && <section className="fm-panel rounded-xl p-4 text-sm text-slate-300">Carregando descobertas...</section>}

        {!loading && (
          <section className="fm-panel rounded-xl p-4">
            <div className="fm-scroll h-[48vh] overflow-y-scroll pr-1">
              {filteredDiscoveries.length === 0 ? (
                <p className="rounded border border-slate-700 bg-slate-950/70 p-3 text-sm text-slate-300">Nenhuma fusao encontrada com os filtros atuais.</p>
              ) : (
                <ul className="grid gap-2 md:grid-cols-2">
                  {filteredDiscoveries.map((item) => {
                    const resultCard = CARD_INDEX[item.resultCardId];
                    const imagePath = resultCard?.imagePath;
                    const resultTags = resultCard?.tags ?? [];
                    const resultAtk = resultCard?.atk ?? 0;
                    const resultDef = resultCard?.def ?? 0;
                    const materialCardNames =
                      item.materialCardIds.length > 0
                        ? item.materialCardIds.map((cardId) => cardNameById.get(cardId) ?? CARD_INDEX[cardId]?.name ?? cardId)
                        : [];

                    return (
                      <li key={item.key} className="rounded-lg border border-slate-700 bg-slate-950/65 p-3">
                        <div className="flex items-start gap-3">
                          <div className="h-20 w-14 shrink-0 overflow-hidden rounded border border-slate-600/70 bg-slate-900">
                            {imagePath ? (
                              <img src={imagePath} alt={item.resultName} className="h-full w-full object-cover" loading="lazy" />
                            ) : (
                              <div className="flex h-full w-full items-center justify-center text-[10px] text-slate-400">No Art</div>
                            )}
                          </div>
                          <div className="min-w-0">
                            <p className="truncate text-sm font-semibold text-cyan-100">{item.resultName}</p>
                            <p className="text-[11px] text-slate-400">{item.resultCardId}</p>
                            <p className="mt-1 text-xs text-amber-200">ATK/DEF: {resultAtk}/{resultDef}</p>
                            <p className="mt-1 text-[11px] text-slate-300">Tags carta: {resultTags.length > 0 ? resultTags.join(" - ") : "--"}</p>
                            <p className="mt-1 text-[11px] text-slate-300">Tags materiais: {item.materialTags.length > 0 ? item.materialTags.join(" - ") : "--"}</p>
                            <p className="mt-1 text-xs text-amber-200">Materiais: {item.materialsCount} - Descoberta(s): {item.times}</p>
                            {materialCardNames.length > 0 ? (
                              <p className="mt-1 text-[11px] text-slate-200">Usadas: {materialCardNames.join(" + ")}</p>
                            ) : (
                              <p className="mt-1 text-[11px] text-slate-300">Usadas: --</p>
                            )}
                          </div>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          </section>
        )}

        {error && <p className="rounded border border-rose-500/60 bg-rose-900/30 px-3 py-2 text-sm text-rose-100">{error}</p>}
      </div>
    </HudStage>
  );
}
