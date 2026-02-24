"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { CARD_INDEX } from "@ruptura-arcana/game";
import type { Deck, DeckListPayload } from "@ruptura-arcana/shared";
import { HudStage } from "../../components/ui/HudStage";
import {
  deleteDeckOnServer,
  fetchCollection,
  fetchPlayerProfile,
  getStoredPublicId,
  saveDeckOnServer,
  setActiveDeckOnServer,
  type CollectionEntry,
  type DeckListResponse
} from "../../lib/api";
import { socket } from "../../lib/socket";
import {
  addCardToDeck,
  createEmptyDeck,
  deckCardTotal,
  duplicateDeck,
  ensureDeckCollection,
  exportDeckAsJson,
  getDeckById,
  importDeckFromJson,
  loadDeckCollection,
  removeCardFromDeck,
  removeDeck,
  renameDeck,
  saveDeckCollection,
  setDeckActive,
  upsertDeck,
  validateDeckForUi,
  type DeckCollection
} from "../../lib/decks";
import { SfxManager } from "../../lib/sfx";

const PAGE_SIZE = 120;

type SortMode = "NAME_ASC" | "ATK_DESC" | "DEF_DESC" | "NUMBER_ASC";
type DeckBuilderCard = {
  id: string;
  name: string;
  atk?: number;
  def?: number;
  tags: string[];
  imagePath?: string;
  catalogNumber?: number;
  password?: string;
  cost?: number;
  effectDescription?: string;
};

function toDeckBuilderCard(entry: CollectionEntry): DeckBuilderCard {
  const catalogCard = CARD_INDEX[entry.cardId];
  if (catalogCard) {
    return {
      id: catalogCard.id,
      name: catalogCard.name,
      atk: catalogCard.atk,
      def: catalogCard.def,
      tags: [...catalogCard.tags],
      imagePath: catalogCard.imagePath,
      catalogNumber: catalogCard.catalogNumber,
      password: catalogCard.password,
      cost: catalogCard.cost,
      effectDescription: catalogCard.effectDescription
    };
  }

  return {
    id: entry.cardId,
    name: entry.name,
    atk: entry.atk,
    def: entry.def,
    tags: [...entry.tags],
    imagePath: entry.imagePath,
    catalogNumber: entry.catalogNumber,
    password: entry.password,
    cost: entry.cost,
    effectDescription: entry.effectDescription
  };
}

function cardDisplayType(atk: number | undefined, def: number | undefined): string {
  return (atk ?? 0) > 0 || (def ?? 0) > 0 ? "MONSTER" : "SPELL/TRAP";
}

function formatError(error: unknown): string {
  if (error instanceof Error) return error.message;
  return "Operacao nao concluida.";
}

export default function DeckBuilderPage() {
  const [connected, setConnected] = useState(false);
  const [playerId, setPlayerId] = useState<string | null>(null);
  const [collection, setCollection] = useState<DeckCollection>(() => ensureDeckCollection(null));
  const [selectedCardId, setSelectedCardId] = useState<string | null>(null);

  const [query, setQuery] = useState("");
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [atkMin, setAtkMin] = useState("0");
  const [atkMax, setAtkMax] = useState("5000");
  const [defMin, setDefMin] = useState("0");
  const [defMax, setDefMax] = useState("5000");
  const [sortMode, setSortMode] = useState<SortMode>("NUMBER_ASC");
  const [page, setPage] = useState(1);

  const [importText, setImportText] = useState("");
  const [feedback, setFeedback] = useState("");
  const [syncError, setSyncError] = useState("");
  const [brokenImageIds, setBrokenImageIds] = useState<Record<string, true>>({});
  const [publicId, setPublicId] = useState<string | null>(null);
  const [ownedCollection, setOwnedCollection] = useState<CollectionEntry[]>([]);
  const [collectionLoading, setCollectionLoading] = useState(true);
  const [mutatingDeck, setMutatingDeck] = useState(false);
  const sfx = useMemo(() => new SfxManager(0.26), []);

  const activeDeck = useMemo(() => getDeckById(collection, collection.activeDeckId), [collection]);
  const validation = useMemo(() => (activeDeck ? validateDeckForUi(activeDeck) : null), [activeDeck]);
  const ownedCountByCard = useMemo(() => {
    const map = new Map<string, number>();
    for (const entry of ownedCollection) {
      map.set(entry.cardId, entry.count);
    }
    return map;
  }, [ownedCollection]);

  const ownedCards = useMemo(() => {
    return ownedCollection
      .filter((entry) => entry.count > 0)
      .map((entry) => toDeckBuilderCard(entry));
  }, [ownedCollection]);

  const ownedCopiesTotal = useMemo(() => ownedCollection.reduce((sum, entry) => sum + entry.count, 0), [ownedCollection]);

  const tagOptions = useMemo(() => {
    return Array.from(new Set(ownedCards.flatMap((card) => card.tags))).sort((a, b) => a.localeCompare(b));
  }, [ownedCards]);

  const deckCountByCard = useMemo(() => {
    const map = new Map<string, number>();
    if (!activeDeck) return map;
    for (const entry of activeDeck.cards) {
      map.set(entry.cardId, entry.count);
    }
    return map;
  }, [activeDeck]);
  const deckIsFull = useMemo(() => (activeDeck ? deckCardTotal(activeDeck) >= 40 : true), [activeDeck]);

  const filteredCards = useMemo(() => {
    const q = query.trim().toLowerCase();
    const minAtk = Number.parseInt(atkMin || "0", 10);
    const maxAtk = Number.parseInt(atkMax || "5000", 10);
    const minDef = Number.parseInt(defMin || "0", 10);
    const maxDef = Number.parseInt(defMax || "5000", 10);

    const base = ownedCards.filter((card) => {
      const atk = card.atk ?? 0;
      const def = card.def ?? 0;
      if (q && !card.name.toLowerCase().includes(q)) return false;
      if (atk < minAtk || atk > maxAtk) return false;
      if (def < minDef || def > maxDef) return false;
      if (selectedTags.length > 0 && !selectedTags.every((tag) => card.tags.includes(tag))) return false;
      return true;
    });

    const sorted = [...base];
    if (sortMode === "NAME_ASC") {
      sorted.sort((a, b) => a.name.localeCompare(b.name));
    } else if (sortMode === "ATK_DESC") {
      sorted.sort((a, b) => (b.atk ?? 0) - (a.atk ?? 0) || (b.def ?? 0) - (a.def ?? 0) || a.name.localeCompare(b.name));
    } else if (sortMode === "DEF_DESC") {
      sorted.sort((a, b) => (b.def ?? 0) - (a.def ?? 0) || (b.atk ?? 0) - (a.atk ?? 0) || a.name.localeCompare(b.name));
    } else {
      sorted.sort((a, b) => {
        const aNumber = a.catalogNumber ?? Number.MAX_SAFE_INTEGER;
        const bNumber = b.catalogNumber ?? Number.MAX_SAFE_INTEGER;
        if (aNumber !== bNumber) return aNumber - bNumber;
        return a.name.localeCompare(b.name);
      });
    }
    return sorted;
  }, [query, atkMin, atkMax, defMin, defMax, selectedTags, sortMode, ownedCards]);

  const totalPages = Math.max(1, Math.ceil(filteredCards.length / PAGE_SIZE));
  const pagedCards = useMemo(() => {
    const start = (page - 1) * PAGE_SIZE;
    return filteredCards.slice(start, start + PAGE_SIZE);
  }, [filteredCards, page]);

  const selectedCard = useMemo(() => {
    if (selectedCardId) {
      const ownedCard = ownedCards.find((card) => card.id === selectedCardId);
      if (ownedCard) return ownedCard;

      const catalogCard = CARD_INDEX[selectedCardId];
      if (catalogCard) {
        return {
          id: catalogCard.id,
          name: catalogCard.name,
          atk: catalogCard.atk,
          def: catalogCard.def,
          tags: [...catalogCard.tags],
          imagePath: catalogCard.imagePath,
          catalogNumber: catalogCard.catalogNumber,
          password: catalogCard.password,
          cost: catalogCard.cost,
          effectDescription: catalogCard.effectDescription
        } satisfies DeckBuilderCard;
      }

      return null;
    }
    return pagedCards[0] ?? null;
  }, [selectedCardId, pagedCards, ownedCards]);

  const deckRows = useMemo(() => {
    if (!activeDeck) return [];
    return activeDeck.cards
      .map((entry) => ({
        entry,
        card: CARD_INDEX[entry.cardId] ?? null
      }))
      .sort((a, b) => {
        const aLabel = a.card?.name ?? a.entry.cardId;
        const bLabel = b.card?.name ?? b.entry.cardId;
        return aLabel.localeCompare(bLabel);
      });
  }, [activeDeck]);

  const applyRemoteDeckState = (payload: DeckListResponse | DeckListPayload) => {
    const remote = ensureDeckCollection({
      decks: payload.decks,
      activeDeckId: payload.activeDeckId
    });
    setCollection(remote);
    saveDeckCollection(remote);
    setSyncError("");
  };

  const persistCollection = (next: DeckCollection) => {
    const normalized = ensureDeckCollection(next);
    setCollection(normalized);
    saveDeckCollection(normalized);
  };

  const updateActiveDeck = (updater: (current: Deck) => Deck) => {
    if (!activeDeck) return;
    const updated = updater(activeDeck);
    persistCollection(upsertDeck(collection, updated));
  };

  const syncDeckToServer = (deck: Deck) => {
    if (!playerId) return;
    socket.emit("deck:save", { deck });
    socket.emit("deck:setActive", { deckId: deck.id });
  };

  const loadOwnedCollection = async (knownPublicId?: string) => {
    try {
      setCollectionLoading(true);
      const cachedPublicId = knownPublicId ?? publicId ?? getStoredPublicId() ?? undefined;
      if (!cachedPublicId) {
        throw new Error("Sessao nao encontrada. Faca login no lobby.");
      }
      await fetchPlayerProfile(cachedPublicId);
      setPublicId(cachedPublicId);
      const rows = await fetchCollection(cachedPublicId);
      setOwnedCollection(rows.filter((entry) => entry.count > 0));
      setSyncError("");
    } catch (error) {
      setSyncError(`Colecao: ${formatError(error)}`);
    } finally {
      setCollectionLoading(false);
    }
  };

  useEffect(() => {
    persistCollection(loadDeckCollection());
    void loadOwnedCollection();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const unlock = () => sfx.unlock();
    window.addEventListener("pointerdown", unlock, { passive: true });
    window.addEventListener("keydown", unlock);
    window.addEventListener("touchstart", unlock, { passive: true });
    return () => {
      window.removeEventListener("pointerdown", unlock);
      window.removeEventListener("keydown", unlock);
      window.removeEventListener("touchstart", unlock);
    };
  }, [sfx]);

  useEffect(() => {
    const storedPlayerId = getStoredPublicId();
    if (!storedPlayerId) {
      setSyncError("Sessao nao encontrada. Faca login no lobby.");
      return;
    }
    socket.connect();

    const onConnect = () => {
      setConnected(true);
      socket.emit("auth:hello", storedPlayerId ? { storedPlayerId } : {});
    };
    const onDisconnect = () => setConnected(false);
    const onSession = (payload: { playerId: string }) => {
      setPublicId(storedPlayerId);
      setPlayerId(payload.playerId);
      socket.emit("deck:list", {});
      void loadOwnedCollection(storedPlayerId);
    };
    const onDeckList = (payload: DeckListPayload) => {
      applyRemoteDeckState(payload);
    };
    const onDeckError = (payload: { message: string }) => {
      setSyncError(payload.message);
    };

    socket.on("connect", onConnect);
    socket.on("disconnect", onDisconnect);
    socket.on("auth:session", onSession);
    socket.on("deck:list", onDeckList);
    socket.on("deck:error", onDeckError);

    return () => {
      socket.off("connect", onConnect);
      socket.off("disconnect", onDisconnect);
      socket.off("auth:session", onSession);
      socket.off("deck:list", onDeckList);
      socket.off("deck:error", onDeckError);
      socket.disconnect();
    };
  }, []);

  useEffect(() => {
    setPage(1);
  }, [query, selectedTags, atkMin, atkMax, defMin, defMax, sortMode]);

  useEffect(() => {
    if (page > totalPages) {
      setPage(totalPages);
    }
  }, [page, totalPages]);

  const handleCreateDeck = () => {
    const deck = createEmptyDeck(`Deck ${collection.decks.length + 1}`);
    const next = setDeckActive(upsertDeck(collection, deck), deck.id);
    persistCollection(next);
    setFeedback("Novo deck criado.");
  };

  const handleDuplicateDeck = () => {
    if (!activeDeck) return;
    const copy = duplicateDeck(activeDeck);
    const next = setDeckActive(upsertDeck(collection, copy), copy.id);
    persistCollection(next);
    setFeedback("Deck duplicado.");
  };

  const handleRenameDeck = () => {
    if (!activeDeck) return;
    const name = window.prompt("Novo nome do deck:", activeDeck.name);
    if (name === null) return;
    const trimmed = name.trim();
    if (!trimmed) {
      setFeedback("Nome invalido. Digite um nome com pelo menos 1 caractere.");
      return;
    }
    if (trimmed === activeDeck.name) {
      setFeedback("O nome informado e igual ao atual.");
      return;
    }

    const previous = collection;
    const updated = renameDeck(activeDeck, trimmed);
    const optimistic = upsertDeck(collection, updated);
    persistCollection(optimistic);
    setFeedback("Renomeando deck...");

    if (!publicId) {
      setFeedback("Deck renomeado localmente.");
      return;
    }

    setMutatingDeck(true);
    void saveDeckOnServer(publicId, updated)
      .then((remote) => {
        applyRemoteDeckState(remote);
        setFeedback("Deck renomeado com sucesso.");
      })
      .catch((error) => {
        persistCollection(previous);
        setFeedback(`Falha ao renomear: ${formatError(error)}`);
      })
      .finally(() => {
        setMutatingDeck(false);
      });
  };

  const handleDeleteDeck = () => {
    if (!activeDeck) return;
    if (!window.confirm(`Remover o deck '${activeDeck.name}'?`)) return;
    const previous = collection;
    const next = removeDeck(collection, activeDeck.id);
    persistCollection(next);
    setFeedback("Removendo deck...");

    if (!publicId) {
      socket.emit("deck:delete", { deckId: activeDeck.id });
      if (next.activeDeckId) {
        socket.emit("deck:setActive", { deckId: next.activeDeckId });
      }
      setFeedback("Deck removido localmente.");
      return;
    }

    setMutatingDeck(true);
    void deleteDeckOnServer(publicId, activeDeck.id)
      .then((remote) => {
        applyRemoteDeckState(remote);
        setFeedback("Deck removido com sucesso.");
      })
      .catch((error) => {
        persistCollection(previous);
        setFeedback(`Falha ao remover deck: ${formatError(error)}`);
      })
      .finally(() => {
        setMutatingDeck(false);
      });
  };

  const handleAddCard = (cardId: string) => {
    if (!activeDeck) return;
    const ownedCopies = ownedCountByCard.get(cardId) ?? 0;
    if (ownedCopies <= 0) {
      setFeedback("Essa carta nao esta na sua colecao.");
      return;
    }
    const copies = deckCountByCard.get(cardId) ?? 0;
    if (copies >= 3) {
      setFeedback("Limite de 3 copias por carta.");
      return;
    }
    if (copies >= ownedCopies) {
      setFeedback(`Voce possui apenas ${ownedCopies} copia(s) dessa carta.`);
      return;
    }
    if (deckCardTotal(activeDeck) >= 40) {
      setFeedback("Deck ja possui 40 cartas.");
      return;
    }
    updateActiveDeck((deck) => addCardToDeck(deck, cardId));
    sfx.play("ui_click");
  };

  const handleRemoveCard = (cardId: string) => {
    updateActiveDeck((deck) => removeCardFromDeck(deck, cardId));
    sfx.play("ui_click");
  };

  const handleSaveDeck = () => {
    if (!activeDeck) return;
    const result = validateDeckForUi(activeDeck);
    if (!result.ok) {
      setFeedback(`Deck invalido: ${result.errors[0] ?? "erro de validacao"}`);
      return;
    }
    if (!publicId) {
      syncDeckToServer(activeDeck);
      setFeedback("Deck salvo via socket.");
      return;
    }

    setMutatingDeck(true);
    setFeedback("Salvando deck no servidor...");
    void saveDeckOnServer(publicId, activeDeck)
      .then((remote) => {
        applyRemoteDeckState(remote);
        setFeedback("Deck salvo no servidor.");
      })
      .catch((error) => {
        setFeedback(`Falha ao salvar deck: ${formatError(error)}`);
      })
      .finally(() => {
        setMutatingDeck(false);
      });
  };

  const handleExportDeck = async () => {
    if (!activeDeck) return;
    const text = exportDeckAsJson(activeDeck);
    try {
      await navigator.clipboard.writeText(text);
      setFeedback("Deck copiado para a area de transferencia.");
    } catch {
      setImportText(text);
      setFeedback("Nao foi possivel copiar. JSON colocado na caixa de importacao.");
    }
  };

  const handleImportDeck = () => {
    try {
      const imported = importDeckFromJson(importText);
      const withName = {
        ...imported,
        name: imported.name?.trim() ? imported.name : `Deck ${collection.decks.length + 1}`
      };
      const next = setDeckActive(upsertDeck(collection, withName), withName.id);
      persistCollection(next);
      setImportText("");
      setFeedback("Deck importado.");
    } catch (error) {
      setFeedback(formatError(error));
    }
  };

  const handleTagToggle = (tag: string) => {
    setSelectedTags((current) => {
      if (current.includes(tag)) {
        return current.filter((item) => item !== tag);
      }
      return [...current, tag];
    });
  };

  const handleSetActiveDeck = (deckId: string) => {
    const previous = collection;
    persistCollection(setDeckActive(collection, deckId));

    if (!publicId) {
      socket.emit("deck:setActive", { deckId });
      return;
    }

    setMutatingDeck(true);
    void setActiveDeckOnServer(publicId, deckId)
      .then((remote) => {
        applyRemoteDeckState(remote);
      })
      .catch((error) => {
        persistCollection(previous);
        setFeedback(`Falha ao ativar deck: ${formatError(error)}`);
      })
      .finally(() => {
        setMutatingDeck(false);
      });
  };

  return (
    <HudStage>
      <header className="fm-panel fm-frame mx-auto mb-4 flex w-full max-w-[1700px] items-center justify-between rounded-xl px-4 py-3">
        <div>
          <h1 className="fm-title text-xl font-bold">Deck Builder</h1>
          <p className="fm-subtitle text-xs">
            Socket: {connected ? "conectado" : "desconectado"} {playerId ? `| Sessao: ${playerId}` : ""}
            {publicId ? ` | Perfil: ${publicId}` : ""}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => {
              socket.emit("deck:list", {});
              void loadOwnedCollection();
            }}
            disabled={mutatingDeck}
            className="fm-button rounded-lg px-3 py-2 text-xs font-semibold disabled:cursor-not-allowed disabled:opacity-45"
          >
            Sincronizar
          </button>
          <Link href="/" className="fm-button rounded-lg px-3 py-2 text-xs font-semibold">
            Voltar ao Lobby
          </Link>
        </div>
      </header>

      <section className="mx-auto grid w-full max-w-[1700px] gap-3 xl:grid-cols-[1.45fr_1fr_0.8fr]">
        <article className="fm-panel fm-frame rounded-xl p-3">
          <div className="mb-3 grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
            <div className="rounded-lg border border-slate-700 bg-slate-950/50 px-3 py-2 text-xs">
              <p className="text-slate-400">Cartas unicas na colecao</p>
              <p className="text-sm font-semibold text-emerald-200">{ownedCollection.length}</p>
            </div>
            <div className="rounded-lg border border-slate-700 bg-slate-950/50 px-3 py-2 text-xs">
              <p className="text-slate-400">Copias totais</p>
              <p className="text-sm font-semibold text-emerald-200">{ownedCopiesTotal}</p>
            </div>
            <div className="rounded-lg border border-slate-700 bg-slate-950/50 px-3 py-2 text-xs">
              <p className="text-slate-400">Cartas filtradas</p>
              <p className="text-sm font-semibold text-cyan-200">{filteredCards.length}</p>
            </div>
            <div className="rounded-lg border border-slate-700 bg-slate-950/50 px-3 py-2 text-xs">
              <p className="text-slate-400">Deck ativo</p>
              <p className="truncate text-sm font-semibold text-slate-100">{activeDeck?.name ?? "Sem deck"}</p>
            </div>
          </div>

          <div className="mb-3 grid gap-2 md:grid-cols-2 xl:grid-cols-4">
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Buscar por nome"
              className="rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm"
            />
            <select
              value={sortMode}
              onChange={(event) => setSortMode(event.target.value as SortMode)}
              className="rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm"
            >
              <option value="NUMBER_ASC">Numero (asc)</option>
              <option value="NAME_ASC">Nome (A-Z)</option>
              <option value="ATK_DESC">ATK (desc)</option>
              <option value="DEF_DESC">DEF (desc)</option>
            </select>
            <input value={atkMin} onChange={(event) => setAtkMin(event.target.value)} placeholder="ATK min" className="rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm" />
            <input value={atkMax} onChange={(event) => setAtkMax(event.target.value)} placeholder="ATK max" className="rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm" />
            <input value={defMin} onChange={(event) => setDefMin(event.target.value)} placeholder="DEF min" className="rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm" />
            <input value={defMax} onChange={(event) => setDefMax(event.target.value)} placeholder="DEF max" className="rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm" />
          </div>

          <div className="mb-3 max-h-24 overflow-auto rounded-lg border border-slate-800 bg-slate-950/40 p-2">
            <div className="flex flex-wrap gap-2">
              {tagOptions.map((tag) => (
                <button
                  key={tag}
                  type="button"
                  onClick={() => handleTagToggle(tag)}
                  className={`rounded-full border px-2 py-0.5 text-[11px] ${
                    selectedTags.includes(tag) ? "border-cyan-300 bg-cyan-800/40 text-cyan-100" : "border-slate-600 bg-slate-800 text-slate-300"
                  }`}
                >
                  {tag}
                </button>
              ))}
            </div>
          </div>

          <div className="mb-3 flex items-center justify-between text-xs text-slate-300">
            <span>
              {collectionLoading
                ? "Atualizando colecao..."
                : `Mostrando cartas da sua colecao: ${filteredCards.length} | Pagina ${page}/${totalPages}`}
            </span>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setPage((current) => Math.max(1, current - 1))}
                className="rounded border border-slate-600 px-2 py-1"
              >
                Anterior
              </button>
              <button
                type="button"
                onClick={() => setPage((current) => Math.min(totalPages, current + 1))}
                className="rounded border border-slate-600 px-2 py-1"
              >
                Proxima
              </button>
            </div>
          </div>

          <div className="grid max-h-[70vh] grid-cols-2 gap-2 overflow-auto md:grid-cols-3 xl:grid-cols-4">
            {!collectionLoading && pagedCards.length === 0 ? (
              <div className="col-span-full rounded-lg border border-slate-700 bg-slate-950/40 p-4 text-center text-sm text-slate-300">
                Nenhuma carta da sua colecao corresponde aos filtros atuais.
              </div>
            ) : null}
            {pagedCards.map((card) => {
              const inDeck = deckCountByCard.get(card.id) ?? 0;
              const ownedCopies = ownedCountByCard.get(card.id) ?? 0;
              const canAdd = inDeck < Math.min(3, ownedCopies) && !deckIsFull;
              const hasImage = Boolean(card.imagePath) && !brokenImageIds[card.id];
              return (
                <div
                  key={card.id}
                  role="button"
                  tabIndex={0}
                  onClick={() => {
                    sfx.play("ui_click");
                    setSelectedCardId(card.id);
                  }}
                  onDoubleClick={() => handleAddCard(card.id)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") {
                      handleAddCard(card.id);
                    }
                  }}
                  className={`rounded-lg border p-2 text-left transition ${
                    selectedCard?.id === card.id ? "border-cyan-300 bg-cyan-900/20" : "border-slate-700 bg-slate-900/80 hover:border-cyan-500/60"
                  }`}
                >
                  {hasImage ? (
                    <img
                      src={card.imagePath}
                      alt={card.name}
                      className="mb-1 h-32 w-full rounded object-contain object-center"
                      loading="lazy"
                      onError={() => setBrokenImageIds((current) => ({ ...current, [card.id]: true }))}
                    />
                  ) : (
                    <div className="mb-1 flex h-32 w-full items-center justify-center rounded bg-slate-800 text-[10px] text-slate-400">Sem arte</div>
                  )}
                  <p className="truncate text-xs font-semibold">{card.name}</p>
                  <p className="text-[11px] text-slate-300">
                    #{card.catalogNumber ?? "--"} | {card.atk ?? 0}/{card.def ?? 0}
                  </p>
                  <div className="mt-1 flex items-center justify-between">
                    <span className="text-[11px] text-emerald-300">Possui: {ownedCopies}</span>
                    <span className="text-[11px] text-cyan-300">No deck: {inDeck}</span>
                    <span className="text-[10px] text-slate-400">{cardDisplayType(card.atk, card.def)}</span>
                  </div>
                  <div className="mt-2 flex gap-1">
                    <button
                      type="button"
                      onClick={(event) => {
                        event.stopPropagation();
                        handleAddCard(card.id);
                      }}
                      disabled={!canAdd}
                      className="rounded bg-emerald-700 px-2 py-1 text-[11px] font-semibold disabled:cursor-not-allowed disabled:opacity-45"
                    >
                      +
                    </button>
                    <button
                      type="button"
                      onClick={(event) => {
                        event.stopPropagation();
                        handleRemoveCard(card.id);
                      }}
                      className="rounded bg-rose-700 px-2 py-1 text-[11px] font-semibold"
                    >
                      -
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </article>

        <article className="fm-panel fm-frame rounded-xl p-3">
          <div className="mb-2 flex flex-wrap gap-2">
            <select
              value={collection.activeDeckId ?? ""}
              onChange={(event) => handleSetActiveDeck(event.target.value)}
              disabled={mutatingDeck}
              className="rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm"
            >
              {collection.decks.map((deck) => (
                <option key={deck.id} value={deck.id}>
                  {deck.name}
                </option>
              ))}
            </select>
            <button type="button" onClick={handleCreateDeck} disabled={mutatingDeck} className="fm-button rounded-lg px-3 py-2 text-xs font-semibold disabled:cursor-not-allowed disabled:opacity-45">
              Novo
            </button>
            <button type="button" onClick={handleDuplicateDeck} disabled={mutatingDeck} className="fm-button rounded-lg px-3 py-2 text-xs font-semibold disabled:cursor-not-allowed disabled:opacity-45">
              Duplicar
            </button>
            <button type="button" onClick={handleRenameDeck} disabled={mutatingDeck} className="fm-button rounded-lg px-3 py-2 text-xs font-semibold disabled:cursor-not-allowed disabled:opacity-45">
              Renomear
            </button>
            <button type="button" onClick={handleDeleteDeck} disabled={mutatingDeck} className="fm-button rounded-lg px-3 py-2 text-xs font-semibold disabled:cursor-not-allowed disabled:opacity-45">
              Excluir
            </button>
          </div>

          <div
            className={`mb-3 rounded-lg border px-3 py-2 text-sm ${
              validation?.ok ? "border-emerald-500/70 bg-emerald-900/30 text-emerald-200" : "border-rose-500/70 bg-rose-900/30 text-rose-200"
            }`}
          >
            <p className="font-semibold">
              {activeDeck?.name ?? "Sem deck"} | Total: {validation?.total ?? 0}/40
            </p>
            {!validation?.ok && validation?.errors[0] ? <p className="text-xs">{validation.errors[0]}</p> : <p className="text-xs">Deck valido.</p>}
          </div>

          <div className="mb-3 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={handleSaveDeck}
              disabled={!validation?.ok}
              className="fm-button rounded-lg px-3 py-2 text-xs font-semibold disabled:cursor-not-allowed disabled:opacity-45"
            >
              Salvar no Servidor
            </button>
            <button type="button" onClick={handleExportDeck} className="fm-button rounded-lg px-3 py-2 text-xs font-semibold">
              Exportar JSON
            </button>
            <button type="button" onClick={handleImportDeck} className="fm-button rounded-lg px-3 py-2 text-xs font-semibold">
              Importar JSON
            </button>
          </div>

          <textarea
            value={importText}
            onChange={(event) => setImportText(event.target.value)}
            placeholder='Cole JSON do deck aqui para importar'
            className="mb-3 h-24 w-full rounded-lg border border-slate-700 bg-slate-800 p-2 text-xs"
          />

          <div className="max-h-[56vh] overflow-y-auto overflow-x-hidden rounded-lg border border-slate-800 bg-slate-950/50 p-2 pb-5">
            {deckRows.length === 0 ? (
              <p className="text-xs text-slate-400">Deck vazio.</p>
            ) : (
              <ul className="grid gap-2">
                {deckRows.map(({ entry, card }) => (
                  <li key={entry.cardId} className="grid min-h-[52px] grid-cols-[1fr_auto] items-center gap-2 rounded bg-slate-900/80 p-2 text-xs leading-5">
                    <button
                      type="button"
                      onClick={() => {
                        if (!card) return;
                        sfx.play("ui_click");
                        setSelectedCardId(card.id);
                      }}
                      className={`truncate text-left leading-tight ${card ? "text-slate-100 hover:text-cyan-200" : "text-amber-300"}`}
                    >
                      {card ? `${card.name} (${entry.count})` : `[Removida] ${entry.cardId} (${entry.count})`}
                    </button>
                    <div className="flex gap-1">
                      <button
                        type="button"
                        onClick={() => {
                          if (!card) return;
                          handleAddCard(card.id);
                        }}
                        disabled={!card}
                        className="h-7 min-w-7 rounded bg-emerald-700 px-2 py-1 disabled:cursor-not-allowed disabled:opacity-45"
                      >
                        +
                      </button>
                      <button type="button" onClick={() => handleRemoveCard(entry.cardId)} className="h-7 min-w-7 rounded bg-rose-700 px-2 py-1">
                        -
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </article>

        <article className="fm-panel fm-frame rounded-xl p-3">
          <h2 className="mb-2 text-sm font-semibold text-slate-200">Preview</h2>
          {selectedCard ? (
            <div className="space-y-2">
              <div className="group relative flex h-[520px] items-center justify-center overflow-hidden rounded-lg border border-slate-700 bg-slate-900/70 p-3">
                {selectedCard.imagePath && !brokenImageIds[selectedCard.id] ? (
                  <img
                    src={selectedCard.imagePath}
                    alt={selectedCard.name}
                    className="max-h-full max-w-full object-contain object-center transition-transform duration-200 group-hover:scale-[1.02]"
                    onError={() => setBrokenImageIds((current) => ({ ...current, [selectedCard.id]: true }))}
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center rounded-lg bg-slate-800 text-xs text-slate-400">Sem imagem</div>
                )}
              </div>
              <h3 className="text-sm font-semibold text-cyan-100">{selectedCard.name}</h3>
              <p className="text-xs text-slate-300">
                #{selectedCard.catalogNumber ?? "--"} | ATK {selectedCard.atk ?? 0} / DEF {selectedCard.def ?? 0}
              </p>
              <p className="text-xs text-slate-300">
                Password: {selectedCard.password ?? "--"} | Cost: {selectedCard.cost ?? "--"}
              </p>
              {selectedCard.effectDescription ? (
                <div className="rounded-lg border border-violet-400/35 bg-violet-950/35 px-2 py-1.5 text-xs leading-relaxed text-violet-100">
                  {selectedCard.effectDescription}
                </div>
              ) : null}
              <div className="flex flex-wrap gap-1">
                {selectedCard.tags.map((tag) => (
                  <span key={tag} className="rounded-full border border-cyan-500/40 bg-cyan-900/25 px-2 py-0.5 text-[10px] text-cyan-200">
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          ) : (
            <p className="text-xs text-slate-400">Selecione uma carta para visualizar.</p>
          )}

          <div className="mt-4 rounded-lg border border-slate-700 bg-slate-950/50 p-2 text-xs">
            <p className="font-semibold text-slate-200">Feedback</p>
            <p className="text-slate-300">{feedback || "Sem mensagens."}</p>
            {syncError ? <p className="mt-1 text-rose-300">Sync: {syncError}</p> : null}
          </div>
        </article>
      </section>
    </HudStage>
  );
}
