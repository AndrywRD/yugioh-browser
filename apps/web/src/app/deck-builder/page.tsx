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

type SortMode = "NAME_ASC" | "ATK_DESC" | "DEF_DESC" | "NUMBER_ASC" | "COST_ASC" | "RARITY";
type KindFilter = "ALL" | "MONSTER" | "SPELL" | "TRAP";
type DeckToolsTab = "SAVE" | "IMPORT_EXPORT" | "LOGS";
type DeckBuilderCard = {
  id: string;
  name: string;
  kind?: "MONSTER" | "SPELL" | "TRAP";
  effectKey?: string;
  atk?: number;
  def?: number;
  tags: string[];
  imagePath?: string;
  catalogNumber?: number;
  password?: string;
  cost?: number;
  rarity?: "C" | "R" | "SR" | "UR";
  effectDescription?: string;
};

function toDeckBuilderCard(entry: CollectionEntry): DeckBuilderCard {
  const catalogCard = CARD_INDEX[entry.cardId];
  if (catalogCard) {
    return {
      id: catalogCard.id,
      name: catalogCard.name,
      kind: catalogCard.kind,
      effectKey: catalogCard.effectKey,
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
    kind: entry.kind,
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

function cardDisplayType(card: { kind?: "MONSTER" | "SPELL" | "TRAP"; effectKey?: string; atk?: number; def?: number }): string {
  if (card.kind === "TRAP") return "TRAP";
  if (card.kind === "SPELL") {
    if (card.effectKey === "EQUIP_CONTINUOUS" || card.effectKey === "EQUIP_BUFF_500") return "EQUIP";
    return "SPELL";
  }
  return (card.atk ?? 0) > 0 || (card.def ?? 0) > 0 ? "MONSTER" : "SPELL/TRAP";
}

function formatError(error: unknown): string {
  if (error instanceof Error) return error.message;
  return "Operacao nao concluida.";
}

function cloneDeckSnapshot(deck: Deck): Deck {
  return {
    ...deck,
    cards: deck.cards.map((card) => ({ ...card }))
  };
}

function normalizeDeckCardMap(deck: Deck): Map<string, number> {
  const map = new Map<string, number>();
  for (const card of deck.cards) {
    map.set(card.cardId, card.count);
  }
  return map;
}

function calculateDeckChangeCount(currentDeck: Deck | null, savedDeck: Deck | null): number {
  if (!currentDeck) return 0;
  if (!savedDeck) {
    return currentDeck.cards.length + (currentDeck.name ? 1 : 0);
  }

  let changes = 0;
  if (currentDeck.name !== savedDeck.name) changes += 1;

  const currentMap = normalizeDeckCardMap(currentDeck);
  const savedMap = normalizeDeckCardMap(savedDeck);
  const ids = new Set([...currentMap.keys(), ...savedMap.keys()]);
  for (const cardId of ids) {
    if ((currentMap.get(cardId) ?? 0) !== (savedMap.get(cardId) ?? 0)) {
      changes += 1;
    }
  }
  return changes;
}

export default function DeckBuilderPage() {
  const [playerId, setPlayerId] = useState<string | null>(null);
  const [collection, setCollection] = useState<DeckCollection>(() => ensureDeckCollection(null));
  const [savedDeckSnapshots, setSavedDeckSnapshots] = useState<Record<string, Deck>>({});
  const [undoStack, setUndoStack] = useState<Deck[]>([]);
  const [selectedCardId, setSelectedCardId] = useState<string | null>(null);

  const [query, setQuery] = useState("");
  const [kindFilter, setKindFilter] = useState<KindFilter>("ALL");
  const [onlyOutsideDeck, setOnlyOutsideDeck] = useState(false);
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [atkMin, setAtkMin] = useState("0");
  const [atkMax, setAtkMax] = useState("5000");
  const [defMin, setDefMin] = useState("0");
  const [defMax, setDefMax] = useState("5000");
  const [sortMode, setSortMode] = useState<SortMode>("NUMBER_ASC");
  const [page, setPage] = useState(1);
  const [toolTab, setToolTab] = useState<DeckToolsTab>("SAVE");
  const [importText, setImportText] = useState("");
  const [actionLogs, setActionLogs] = useState<string[]>([]);
  const [saveError, setSaveError] = useState("");

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
  const savedActiveDeck = useMemo(() => (activeDeck ? savedDeckSnapshots[activeDeck.id] ?? null : null), [activeDeck, savedDeckSnapshots]);
  const pendingChanges = useMemo(() => calculateDeckChangeCount(activeDeck ?? null, savedActiveDeck), [activeDeck, savedActiveDeck]);
  const hasUnsavedChanges = pendingChanges > 0;
  const saveState = useMemo<"SAVED" | "DIRTY" | "ERROR">(() => {
    if (saveError) return "ERROR";
    if (hasUnsavedChanges) return "DIRTY";
    return "SAVED";
  }, [hasUnsavedChanges, saveError]);

  const appendActionLog = (message: string) => {
    const time = new Date().toLocaleTimeString("pt-BR", { hour12: false });
    setActionLogs((current) => [`${time} | ${message}`, ...current].slice(0, 80));
  };

  const markDeckAsSaved = (deck: Deck) => {
    setSavedDeckSnapshots((current) => ({
      ...current,
      [deck.id]: cloneDeckSnapshot(deck)
    }));
    setSaveError("");
  };
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
      if (kindFilter !== "ALL" && card.kind !== kindFilter) return false;
      if (onlyOutsideDeck && (deckCountByCard.get(card.id) ?? 0) > 0) return false;
      if (atk < minAtk || atk > maxAtk) return false;
      if (def < minDef || def > maxDef) return false;
      if (selectedTags.length > 0 && !selectedTags.every((tag) => card.tags.includes(tag))) return false;
      return true;
    });

    const sorted = [...base];
    if (sortMode === "NAME_ASC") {
      sorted.sort((a, b) => a.name.localeCompare(b.name));
    } else if (sortMode === "COST_ASC") {
      sorted.sort((a, b) => (a.cost ?? Number.MAX_SAFE_INTEGER) - (b.cost ?? Number.MAX_SAFE_INTEGER) || a.name.localeCompare(b.name));
    } else if (sortMode === "RARITY") {
      const rarityRank: Record<string, number> = { UR: 0, SR: 1, R: 2, C: 3 };
      sorted.sort((a, b) => {
        const rankA = rarityRank[a.rarity ?? "C"] ?? 9;
        const rankB = rarityRank[b.rarity ?? "C"] ?? 9;
        if (rankA !== rankB) return rankA - rankB;
        return a.name.localeCompare(b.name);
      });
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
  }, [query, kindFilter, onlyOutsideDeck, deckCountByCard, atkMin, atkMax, defMin, defMax, selectedTags, sortMode, ownedCards]);

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
          kind: catalogCard.kind,
          effectKey: catalogCard.effectKey,
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
    const nextSnapshots: Record<string, Deck> = {};
    for (const deck of remote.decks) {
      nextSnapshots[deck.id] = cloneDeckSnapshot(deck);
    }
    setSavedDeckSnapshots(nextSnapshots);
    setSaveError("");
    setUndoStack([]);
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
    setUndoStack((current) => [cloneDeckSnapshot(activeDeck), ...current].slice(0, 25));
    const updated = updater(activeDeck);
    persistCollection(upsertDeck(collection, updated));
    setSaveError("");
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
      socket.emit("auth:hello", storedPlayerId ? { storedPlayerId } : {});
    };
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
      setSaveError(payload.message);
    };

    socket.on("connect", onConnect);
    socket.on("auth:session", onSession);
    socket.on("deck:list", onDeckList);
    socket.on("deck:error", onDeckError);

    return () => {
      socket.off("connect", onConnect);
      socket.off("auth:session", onSession);
      socket.off("deck:list", onDeckList);
      socket.off("deck:error", onDeckError);
      socket.disconnect();
    };
  }, []);

  useEffect(() => {
    setPage(1);
  }, [query, kindFilter, onlyOutsideDeck, selectedTags, atkMin, atkMax, defMin, defMax, sortMode]);

  useEffect(() => {
    if (page > totalPages) {
      setPage(totalPages);
    }
  }, [page, totalPages]);

  const handleCreateDeck = () => {
    const deck = createEmptyDeck(`Deck ${collection.decks.length + 1}`);
    const next = setDeckActive(upsertDeck(collection, deck), deck.id);
    persistCollection(next);
    setSelectedCardId(null);
    setSaveError("");
    setFeedback("Novo deck criado.");
    appendActionLog(`Novo deck criado: ${deck.name}.`);
  };

  const handleDuplicateDeck = () => {
    if (!activeDeck) return;
    const copy = duplicateDeck(activeDeck);
    const next = setDeckActive(upsertDeck(collection, copy), copy.id);
    persistCollection(next);
    setSaveError("");
    setFeedback("Deck duplicado.");
    appendActionLog(`Deck duplicado: ${activeDeck.name} -> ${copy.name}.`);
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
    setSaveError("");
    setFeedback("Renomeando deck...");
    appendActionLog(`Renomeando deck para ${trimmed}...`);

    if (!publicId) {
      setFeedback("Deck renomeado localmente.");
      return;
    }

    setMutatingDeck(true);
    void saveDeckOnServer(publicId, updated)
      .then((remote) => {
        applyRemoteDeckState(remote);
        setFeedback("Deck renomeado com sucesso.");
        appendActionLog(`Deck renomeado para ${trimmed}.`);
      })
      .catch((error) => {
        persistCollection(previous);
        const message = formatError(error);
        setFeedback(`Falha ao renomear: ${message}`);
        setSaveError(message);
        appendActionLog(`Falha ao renomear deck: ${message}.`);
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
    setSaveError("");
    setFeedback("Removendo deck...");
    appendActionLog(`Removendo deck ${activeDeck.name}...`);

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
        appendActionLog(`Deck removido com sucesso.`);
      })
      .catch((error) => {
        persistCollection(previous);
        const message = formatError(error);
        setFeedback(`Falha ao remover deck: ${message}`);
        setSaveError(message);
        appendActionLog(`Falha ao remover deck: ${message}.`);
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
    appendActionLog(`Adicionou ${CARD_INDEX[cardId]?.name ?? cardId}.`);
    sfx.play("ui_click");
  };

  const handleRemoveCard = (cardId: string) => {
    updateActiveDeck((deck) => removeCardFromDeck(deck, cardId));
    appendActionLog(`Removeu ${CARD_INDEX[cardId]?.name ?? cardId}.`);
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
      markDeckAsSaved(activeDeck);
      appendActionLog("Deck salvo via socket.");
      setFeedback("Deck salvo via socket.");
      return;
    }

    setMutatingDeck(true);
    setFeedback("Salvando deck no servidor...");
    void saveDeckOnServer(publicId, activeDeck)
      .then((remote) => {
        applyRemoteDeckState(remote);
        setFeedback("Deck salvo no servidor.");
        appendActionLog("Deck salvo no servidor.");
      })
      .catch((error) => {
        const message = formatError(error);
        setFeedback(`Falha ao salvar deck: ${message}`);
        setSaveError(message);
        appendActionLog(`Falha ao salvar deck: ${message}.`);
      })
      .finally(() => {
        setMutatingDeck(false);
      });
  };

  const handleExportDeck = async () => {
    if (!activeDeck) return;
    const serialized = exportDeckAsJson(activeDeck);
    try {
      await navigator.clipboard.writeText(serialized);
      setFeedback("JSON do deck copiado para a area de transferencia.");
      appendActionLog("Deck exportado (clipboard).");
    } catch {
      setImportText(serialized);
      setFeedback("Falha ao copiar. JSON carregado no campo de importacao.");
      appendActionLog("Falha no clipboard; JSON carregado no campo.");
    }
  };

  const handleImportDeck = () => {
    try {
      const imported = importDeckFromJson(importText);
      const withName: Deck = {
        ...imported,
        name: imported.name?.trim() ? imported.name : `Deck ${collection.decks.length + 1}`
      };
      const next = setDeckActive(upsertDeck(collection, withName), withName.id);
      persistCollection(next);
      setImportText("");
      setSelectedCardId(null);
      setSaveError("");
      appendActionLog(`Deck importado: ${withName.name}.`);
      setFeedback("Deck importado com sucesso.");
    } catch (error) {
      const message = formatError(error);
      setFeedback(message);
      setSaveError(message);
      appendActionLog(`Falha ao importar deck: ${message}.`);
    }
  };

  const handleUndo = () => {
    if (!activeDeck || undoStack.length === 0) return;
    const [previous, ...rest] = undoStack;
    setUndoStack(rest);
    persistCollection(upsertDeck(collection, previous));
    setSaveError("");
    setFeedback("Ultima alteracao desfeita.");
    appendActionLog("Desfez ultima alteracao.");
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
    setUndoStack([]);

    if (!publicId) {
      socket.emit("deck:setActive", { deckId });
      setFeedback("Deck ativo atualizado localmente.");
      return;
    }

    setMutatingDeck(true);
    void setActiveDeckOnServer(publicId, deckId)
      .then((remote) => {
        applyRemoteDeckState(remote);
        appendActionLog("Deck ativo atualizado.");
      })
      .catch((error) => {
        persistCollection(previous);
        const message = formatError(error);
        setFeedback(`Falha ao ativar deck: ${message}`);
        setSaveError(message);
        appendActionLog(`Falha ao ativar deck: ${message}.`);
      })
      .finally(() => {
        setMutatingDeck(false);
      });
  };

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      const isTypingTarget =
        target?.tagName === "INPUT" ||
        target?.tagName === "TEXTAREA" ||
        target?.tagName === "SELECT" ||
        target?.isContentEditable;
      if (isTypingTarget) return;

      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "z") {
        event.preventDefault();
        handleUndo();
        return;
      }

      if (!selectedCard) return;

      if (event.key === "Enter") {
        event.preventDefault();
        handleAddCard(selectedCard.id);
        return;
      }

      if (event.key === "Backspace") {
        event.preventDefault();
        handleRemoveCard(selectedCard.id);
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [selectedCard, undoStack, collection, activeDeck]);

  useEffect(() => {
    const onBeforeUnload = (event: BeforeUnloadEvent) => {
      if (!hasUnsavedChanges) return;
      event.preventDefault();
      event.returnValue = "";
    };

    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [hasUnsavedChanges]);

  const selectedCardDeckCount = selectedCard ? deckCountByCard.get(selectedCard.id) ?? 0 : 0;
  const selectedCardOwnedCount = selectedCard ? ownedCountByCard.get(selectedCard.id) ?? 0 : 0;
  const deckTotal = validation?.total ?? 0;
  return (
    <HudStage>
      <header className="fm-panel fm-frame mx-auto mb-4 grid w-full max-w-[1700px] gap-3 rounded-xl px-4 py-3 xl:grid-cols-[minmax(0,1fr)_minmax(0,1.35fr)_auto] xl:items-center">
        <div className="min-w-0">
          <h1 className="fm-title text-xl font-bold">Deck Builder</h1>
        </div>

        <div className="grid gap-2 lg:grid-cols-[minmax(0,1fr)_auto]">
          <div className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center">
            <select
              value={collection.activeDeckId ?? ""}
              onChange={(event) => handleSetActiveDeck(event.target.value)}
              disabled={mutatingDeck}
              className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm"
            >
              {collection.decks.map((deck) => (
                <option key={deck.id} value={deck.id}>
                  {deck.name}
                </option>
              ))}
            </select>
            <div className="flex items-center gap-2 text-sm">
              <span className="font-semibold text-cyan-100">{deckTotal}/40</span>
              <span className={`rounded px-2 py-0.5 text-xs font-semibold ${validation?.ok ? "bg-emerald-900/35 text-emerald-100" : "bg-amber-900/35 text-amber-100"}`}>
                {validation?.ok ? "Deck valido" : "Ajustes pendentes"}
              </span>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={handleCreateDeck} disabled={mutatingDeck} className="fm-button rounded-lg px-3 py-2 text-xs font-semibold disabled:cursor-not-allowed disabled:opacity-45">
              Novo
            </button>
            <button type="button" onClick={handleDuplicateDeck} disabled={mutatingDeck || !activeDeck} className="fm-button rounded-lg px-3 py-2 text-xs font-semibold disabled:cursor-not-allowed disabled:opacity-45">
              Duplicar
            </button>
            <button type="button" onClick={handleRenameDeck} disabled={mutatingDeck || !activeDeck} className="fm-button rounded-lg px-3 py-2 text-xs font-semibold disabled:cursor-not-allowed disabled:opacity-45">
              Renomear
            </button>
            <button type="button" onClick={handleDeleteDeck} disabled={mutatingDeck || !activeDeck} className="rounded-lg border border-rose-400/55 bg-rose-900/25 px-3 py-2 text-xs font-semibold text-rose-100 disabled:cursor-not-allowed disabled:opacity-45">
              Excluir
            </button>
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-start gap-2 xl:justify-end">
          <button
            type="button"
            onClick={handleSaveDeck}
            disabled={!validation?.ok || !hasUnsavedChanges || mutatingDeck}
            className="rounded-lg border border-amber-200/75 bg-[linear-gradient(180deg,rgba(176,118,30,0.95),rgba(125,82,18,0.98))] px-4 py-2 text-xs font-semibold text-amber-50 shadow-[inset_0_1px_0_rgba(255,228,175,0.35),0_8px_16px_rgba(0,0,0,0.25)] disabled:cursor-not-allowed disabled:opacity-45"
          >
            {mutatingDeck ? "Salvando..." : "Salvar alteracoes"}
          </button>
          <button
            type="button"
            onClick={() => {
              socket.emit("deck:list", {});
              void loadOwnedCollection();
              appendActionLog("Sincronizacao solicitada.");
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

      <section className="mx-auto grid w-full max-w-[1700px] gap-4 lg:grid-cols-2 xl:grid-cols-[34fr_36fr_30fr]">
        <article className="fm-panel fm-frame rounded-xl p-4">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-sm font-semibold uppercase tracking-[0.08em] text-slate-100">Colecao</h2>
            <span className="text-xs text-slate-300">{collectionLoading ? "Atualizando..." : `${filteredCards.length} cartas`}</span>
          </div>

          <div className="mb-2 grid gap-2 md:grid-cols-[minmax(0,1fr)_200px_auto]">
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Buscar carta..."
              className="rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm"
            />
            <select
              value={sortMode}
              onChange={(event) => setSortMode(event.target.value as SortMode)}
              className="rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm"
            >
              <option value="NAME_ASC">Nome</option>
              <option value="COST_ASC">Custo</option>
              <option value="ATK_DESC">ATK</option>
              <option value="DEF_DESC">DEF</option>
              <option value="RARITY">Raridade</option>
              <option value="NUMBER_ASC">Numero</option>
            </select>
            <label className="flex items-center gap-2 rounded-lg border border-slate-700 bg-slate-900/70 px-3 py-2 text-xs text-slate-200">
              <input type="checkbox" checked={onlyOutsideDeck} onChange={(event) => setOnlyOutsideDeck(event.target.checked)} className="h-3.5 w-3.5" />
              Fora do deck
            </label>
          </div>

          <div className="mb-2 flex flex-wrap gap-2">
            {(["ALL", "MONSTER", "SPELL", "TRAP"] as const).map((kind) => (
              <button
                key={kind}
                type="button"
                onClick={() => setKindFilter(kind)}
                className={`rounded-full border px-2 py-1 text-[11px] ${
                  kindFilter === kind ? "border-cyan-300/70 bg-cyan-900/35 text-cyan-100" : "border-slate-600 bg-slate-800 text-slate-300"
                }`}
              >
                {kind === "ALL" ? "Todos" : kind}
              </button>
            ))}
            <button
              type="button"
              onClick={() => setShowAdvancedFilters((current) => !current)}
              className="rounded-full border border-slate-600 bg-slate-800 px-2 py-1 text-[11px] text-slate-300"
            >
              {showAdvancedFilters ? "Ocultar filtros" : "Filtros avancados"}
            </button>
          </div>

          {showAdvancedFilters ? (
            <div className="mb-3 rounded-lg bg-slate-950/45 p-2">
              <div className="mb-2 grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
                <input value={atkMin} onChange={(event) => setAtkMin(event.target.value)} placeholder="ATK min" className="rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm" />
                <input value={atkMax} onChange={(event) => setAtkMax(event.target.value)} placeholder="ATK max" className="rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm" />
                <input value={defMin} onChange={(event) => setDefMin(event.target.value)} placeholder="DEF min" className="rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm" />
                <input value={defMax} onChange={(event) => setDefMax(event.target.value)} placeholder="DEF max" className="rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm" />
              </div>
              <div className="mb-2 max-h-20 overflow-auto rounded-lg bg-slate-900/70 p-2">
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
              <button
                type="button"
                onClick={() => {
                  setSelectedTags([]);
                  setAtkMin("0");
                  setAtkMax("5000");
                  setDefMin("0");
                  setDefMax("5000");
                  appendActionLog("Filtros avancados limpos.");
                }}
                className="fm-button rounded-md px-2 py-1 text-xs font-semibold"
              >
                Limpar filtros
              </button>
            </div>
          ) : null}

          <div className="mb-3 flex items-center justify-between text-xs text-slate-300">
            <span>Pagina {page}/{totalPages}</span>
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
                    {cardDisplayType(card)} | {card.atk ?? 0}/{card.def ?? 0}
                  </p>
                  <div className="mt-1 flex items-center justify-between">
                    <span className="text-[11px] text-emerald-300">Possui: {ownedCopies}</span>
                    <span className="text-[11px] text-cyan-300">No deck: {inDeck}</span>
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

        <article className="fm-panel fm-frame rounded-xl p-4">
          <div className="mb-3">
            <div className="mb-1 flex items-center justify-between">
              <h2 className="text-sm font-semibold uppercase tracking-[0.08em] text-slate-100">Deck</h2>
              <span className="text-lg font-bold text-cyan-100">{deckTotal}/40</span>
            </div>
            <div className="h-1.5 w-full overflow-hidden rounded bg-slate-800">
              <div
                className={`h-full rounded ${validation?.ok ? "bg-emerald-400/80" : "bg-amber-400/80"}`}
                style={{ width: `${Math.min(100, (deckTotal / 40) * 100)}%` }}
              />
            </div>
            <div className="mt-1 flex flex-wrap gap-2 text-[11px]">
              <span className={`rounded px-2 py-0.5 ${validation?.ok ? "bg-emerald-900/35 text-emerald-100" : "bg-amber-900/35 text-amber-100"}`}>
                {validation?.ok ? "Deck valido" : `Faltam ${Math.max(0, 40 - deckTotal)} cartas`}
              </span>
              {saveState === "DIRTY" ? <span className="rounded bg-amber-900/35 px-2 py-0.5 text-amber-100">Alteracoes pendentes</span> : null}
              {saveState === "ERROR" ? <span className="rounded bg-rose-900/35 px-2 py-0.5 text-rose-100">Erro no salvamento</span> : null}
            </div>
          </div>

          <div className="max-h-[44vh] overflow-y-auto overflow-x-hidden rounded-lg bg-slate-950/50 p-2">
            {deckRows.length === 0 ? (
              <p className="text-xs text-slate-400">Deck vazio.</p>
            ) : (
              <ul className="grid gap-2">
                {deckRows.map(({ entry, card }) => {
                  const ownedCopies = ownedCountByCard.get(entry.cardId) ?? 0;
                  const canIncrease = Boolean(card) && entry.count < Math.min(3, ownedCopies) && deckTotal < 40;
                  return (
                    <li key={entry.cardId} className="grid min-h-[56px] grid-cols-[1fr_auto] items-center gap-2 rounded bg-slate-900/80 p-2 text-xs">
                      <div className="min-w-0">
                        <button
                          type="button"
                          onClick={() => {
                            if (!card) return;
                            sfx.play("ui_click");
                            setSelectedCardId(card.id);
                          }}
                          className={`truncate text-left leading-tight ${card ? "text-slate-100 hover:text-cyan-200" : "text-amber-300"}`}
                        >
                          {card ? card.name : `[Removida] ${entry.cardId}`}
                        </button>
                        {card ? (
                          <p className="truncate text-[11px] text-slate-400">
                            {cardDisplayType(card)} {card.kind === "MONSTER" ? `| ATK ${card.atk ?? 0} / DEF ${card.def ?? 0}` : ""}
                          </p>
                        ) : null}
                      </div>
                      <div className="flex items-center gap-1">
                        <button type="button" onClick={() => handleRemoveCard(entry.cardId)} className="h-7 min-w-7 rounded bg-rose-700 px-2 py-1 font-semibold">
                          -
                        </button>
                        <span className="w-7 text-center text-sm font-semibold text-slate-100">{entry.count}</span>
                        <button
                          type="button"
                          onClick={() => {
                            if (!card) return;
                            handleAddCard(card.id);
                          }}
                          disabled={!canIncrease}
                          className="h-7 min-w-7 rounded bg-emerald-700 px-2 py-1 font-semibold disabled:cursor-not-allowed disabled:opacity-45"
                        >
                          +
                        </button>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>

          <div className="mt-3 rounded-lg bg-slate-950/45 p-2">
            <div className="mb-2 flex flex-wrap gap-2">
              {([
                ["SAVE", "Salvar"],
                ["IMPORT_EXPORT", "Importar/Exportar"],
                ["LOGS", "Logs"]
              ] as const).map(([key, label]) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => setToolTab(key)}
                  className={`rounded-md px-2 py-1 text-xs font-semibold ${
                    toolTab === key ? "bg-cyan-900/40 text-cyan-100 ring-1 ring-cyan-300/55" : "bg-slate-800 text-slate-300"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>

            {toolTab === "SAVE" ? (
              <div className="space-y-2 text-xs text-slate-300">
                <p>{hasUnsavedChanges ? `${pendingChanges} alteracao(oes) pendente(s).` : "Tudo salvo."}</p>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={handleSaveDeck}
                    disabled={!validation?.ok || !hasUnsavedChanges || mutatingDeck}
                    className="fm-button rounded-md px-3 py-1.5 font-semibold disabled:cursor-not-allowed disabled:opacity-45"
                  >
                    Salvar no servidor
                  </button>
                  <button
                    type="button"
                    onClick={handleUndo}
                    disabled={undoStack.length === 0}
                    className="fm-button rounded-md px-3 py-1.5 font-semibold disabled:cursor-not-allowed disabled:opacity-45"
                  >
                    Desfazer (Ctrl+Z)
                  </button>
                </div>
              </div>
            ) : null}

            {toolTab === "IMPORT_EXPORT" ? (
              <div className="space-y-2">
                <div className="flex flex-wrap gap-2">
                  <button type="button" onClick={handleExportDeck} className="fm-button rounded-md px-3 py-1.5 text-xs font-semibold">
                    Exportar JSON
                  </button>
                  <button type="button" onClick={handleImportDeck} className="fm-button rounded-md px-3 py-1.5 text-xs font-semibold">
                    Colar e importar
                  </button>
                </div>
                <textarea
                  value={importText}
                  onChange={(event) => setImportText(event.target.value)}
                  placeholder='Cole JSON do deck para importar'
                  className="h-24 w-full rounded-lg border border-slate-700 bg-slate-800 p-2 text-xs"
                />
              </div>
            ) : null}

            {toolTab === "LOGS" ? (
              <div className="space-y-2 text-xs">
                <div className="max-h-28 overflow-y-auto rounded bg-slate-900/70 p-2">
                  {actionLogs.length === 0 ? (
                    <p className="text-slate-400">Sem eventos recentes.</p>
                  ) : (
                    <ul className="space-y-1 text-slate-300">
                      {actionLogs.map((line, index) => (
                        <li key={`${line}-${index}`}>{line}</li>
                      ))}
                    </ul>
                  )}
                </div>
                <p className="text-slate-300">{feedback || "Sem mensagens."}</p>
                {syncError ? <p className="text-rose-300">Sync: {syncError}</p> : null}
              </div>
            ) : null}
          </div>
        </article>

        <article className="fm-panel fm-frame rounded-xl p-4 lg:col-span-2 xl:col-span-1">
          <h2 className="mb-2 text-sm font-semibold uppercase tracking-[0.08em] text-slate-200">Preview</h2>
          {selectedCard ? (
            <div className="space-y-3">
              <div className="group relative flex h-[480px] items-center justify-center overflow-hidden rounded-lg border border-slate-700 bg-slate-900/70 p-3">
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
                {cardDisplayType(selectedCard)} | ATK {selectedCard.atk ?? 0} / DEF {selectedCard.def ?? 0}
              </p>
              <p className="text-xs text-slate-300">No deck: {selectedCardDeckCount} | Na colecao: {selectedCardOwnedCount}</p>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => handleAddCard(selectedCard.id)}
                  disabled={selectedCardDeckCount >= Math.min(3, selectedCardOwnedCount) || deckIsFull}
                  className="fm-button rounded-md px-3 py-1.5 text-xs font-semibold disabled:cursor-not-allowed disabled:opacity-45"
                >
                  Adicionar ao deck
                </button>
                <button
                  type="button"
                  onClick={() => handleRemoveCard(selectedCard.id)}
                  disabled={selectedCardDeckCount <= 0}
                  className="rounded-md border border-rose-400/50 bg-rose-900/25 px-3 py-1.5 text-xs font-semibold text-rose-100 disabled:cursor-not-allowed disabled:opacity-45"
                >
                  Remover do deck
                </button>
              </div>
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
        </article>
      </section>
    </HudStage>
  );
}
