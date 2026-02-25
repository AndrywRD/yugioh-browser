"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { CARD_INDEX } from "@ruptura-arcana/game";
import {
  fetchPlayerProfile,
  fetchPveDropProgress,
  fetchPveNpcs,
  getStoredPublicId,
  startPveMatch,
  type PlayerProfile,
  type PveDropProgress,
  type PveNpc
} from "../../lib/api";
import { HudStage } from "../../components/ui/HudStage";

type NpcSortKey = "REWARD_DESC" | "RAREST_DROP" | "PROGRESS" | "DIFFICULTY";
type DropSortKey = "MISSING_FIRST" | "RAREST_FIRST" | "VALUE_DESC" | "TARGET_FIRST";
type DropKindFilter = "ALL" | "MONSTER" | "SPELL" | "TRAP";

type DropRow = {
  cardId: string;
  name: string;
  chance: number;
  minCount: number;
  maxCount: number;
  kind: DropKindFilter;
  atk: number;
  def: number;
  tags: string[];
  effectDescription?: string;
  imagePath?: string;
  owned: boolean;
  target: boolean;
  scoreValue: number;
};

const STORAGE_KEYS = {
  compactMode: "ruptura_arcana_pve_compact_mode_v2",
  favoriteNpcIds: "ruptura_arcana_pve_favorite_npc_ids_v2",
  pinnedNpcIds: "ruptura_arcana_pve_pinned_npc_ids_v2",
  wishlistCardIds: "ruptura_arcana_pve_wishlist_card_ids_v2",
  showOnlyTargetNpcs: "ruptura_arcana_pve_show_only_target_npcs_v2",
  npcSortKey: "ruptura_arcana_pve_sort_key_v2",
  tierFilter: "ruptura_arcana_pve_tier_filter_v2"
} as const;

function parseStoredBoolean(key: string, fallback: boolean): boolean {
  if (typeof window === "undefined") return fallback;
  const raw = window.localStorage.getItem(key);
  if (raw === "1") return true;
  if (raw === "0") return false;
  return fallback;
}

function parseStoredStringArray(key: string): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.map((value) => String(value ?? "").trim()).filter(Boolean);
  } catch {
    return [];
  }
}

function parseStoredTierFilter(): number | "ALL" {
  if (typeof window === "undefined") return "ALL";
  const raw = window.localStorage.getItem(STORAGE_KEYS.tierFilter);
  if (!raw || raw === "ALL") return "ALL";
  const value = Number(raw);
  if (!Number.isFinite(value)) return "ALL";
  return Math.max(0, Math.floor(value));
}

function parseStoredNpcSort(): NpcSortKey {
  if (typeof window === "undefined") return "PROGRESS";
  const raw = window.localStorage.getItem(STORAGE_KEYS.npcSortKey);
  if (raw === "REWARD_DESC" || raw === "RAREST_DROP" || raw === "PROGRESS" || raw === "DIFFICULTY") {
    return raw;
  }
  return "PROGRESS";
}

function persistBoolean(key: string, value: boolean): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(key, value ? "1" : "0");
}

function persistStringArray(key: string, value: string[]): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(key, JSON.stringify(Array.from(new Set(value)).sort((left, right) => left.localeCompare(right))));
}

function normalizeSlug(value: string): string {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

function buildPortraitCandidates(npc: PveNpc): string[] {
  const candidates: string[] = [];
  const push = (path: string | null | undefined): void => {
    if (!path || !path.trim()) return;
    if (!candidates.includes(path)) candidates.push(path);
  };

  const aliasByName: Record<string, string[]> = {
    DarkNite: ["Nitemare", "Dark_Nite"],
    "Guardian Sebek": ["Sebek"],
    "Guardian Neku": ["Neku"]
  };

  const baseName = npc.name.trim();
  const nameNoOrdinal = baseName.replace(/\s+\d+(st|nd|rd|th)$/i, "").trim();
  const nameNoGuardian = nameNoOrdinal.replace(/^Guardian\s+/i, "").trim();
  const idTail = npc.id.replace(/^FM_\d+_/, "").replace(/_/g, " ").trim();

  const variants = new Set<string>([baseName, nameNoOrdinal, nameNoGuardian, idTail]);
  for (const value of variants) {
    if (!value) continue;
    push(`/images/npcs/${value}.png`);
    push(`/images/npcs/${value.replace(/\s+/g, "_")}.png`);
    push(`/images/npcs/${value.replace(/\s+/g, "-")}.png`);
    push(`/images/npcs/${value.replace(/[^A-Za-z0-9]/g, "")}.png`);
    push(`/images/npcs/${value.toLowerCase().replace(/\s+/g, "_")}.png`);
    push(`/images/npcs/${normalizeSlug(value)}.png`);
  }

  for (const alias of aliasByName[baseName] ?? []) {
    push(`/images/npcs/${alias}.png`);
    push(`/images/npcs/${alias.replace(/\s+/g, "_")}.png`);
    push(`/images/npcs/${normalizeSlug(alias)}.png`);
  }

  push(npc.portraitPath);
  push(npc.portraitAltPath);
  push(npc.fallbackPortraitPath);
  push("/images/cartas/Back-FMR-EN-VG.png");
  return candidates;
}

function statusView(npc: PveNpc): { label: string; className: string } {
  if (!npc.unlocked) return { label: "Bloqueado", className: "border-slate-500/60 bg-slate-800/70 text-slate-300" };
  if (npc.defeated) return { label: "Derrotado", className: "border-emerald-400/50 bg-emerald-900/30 text-emerald-200" };
  return { label: "Disponivel", className: "border-cyan-400/50 bg-cyan-900/30 text-cyan-100" };
}

function unlockText(npc: PveNpc): string {
  if (npc.unlockRequirement.type === "NONE") return "Disponivel desde o inicio";
  if (npc.unlockRequirement.type === "DEFEAT_NPC") return `Derrote ${npc.unlockRequirement.npcId}`;
  return `Venca ${npc.unlockRequirement.wins} duelos PVE`;
}

function dropScoreValue(cardId: string): number {
  const card = CARD_INDEX[cardId];
  if (!card) return 0;
  if (card.kind === "MONSTER") return (card.atk ?? 0) * 0.62 + (card.def ?? 0) * 0.38;
  const effect = (card.effectKey ?? "").toUpperCase();
  if (effect.includes("DESTROY_ALL") || effect.includes("RAIGEKI")) return 3000;
  if (effect.includes("DESTROY")) return 2400;
  if (effect.includes("NEGATE_ATTACK")) return 2050;
  if (effect.includes("EQUIP_CONTINUOUS")) return 1950;
  if (effect.includes("BOOST")) return 1800;
  if (effect.includes("HEAL") || effect.includes("DAMAGE")) return 1500;
  return 1300;
}

function clampPercent(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(100, value));
}

function mapDropsForNpc(npc: PveNpc, tracker: PveDropProgress | undefined, wishlistCardIdSet: Set<string>): DropRow[] {
  const obtainedSet = new Set(tracker?.obtainedCardIds ?? []);
  return npc.rewardCards.map((drop) => {
    const card = CARD_INDEX[drop.cardId];
    const kind = (card?.kind === "MONSTER" || card?.kind === "SPELL" || card?.kind === "TRAP" ? card.kind : "MONSTER") as DropKindFilter;
    const imagePath = card?.imagePath;
    return {
      cardId: drop.cardId,
      name: card?.name ?? drop.cardId,
      chance: Math.max(0, Math.min(1, drop.chance)),
      minCount: Math.max(1, drop.minCount),
      maxCount: Math.max(1, drop.maxCount),
      kind,
      atk: card?.atk ?? 0,
      def: card?.def ?? 0,
      tags: card?.tags ?? [],
      effectDescription: card?.effectDescription,
      imagePath,
      owned: obtainedSet.has(drop.cardId),
      target: wishlistCardIdSet.has(drop.cardId),
      scoreValue: dropScoreValue(drop.cardId)
    };
  });
}

function sortDropRows(rows: DropRow[], sortKey: DropSortKey): DropRow[] {
  const sorted = [...rows];
  sorted.sort((left, right) => {
    if (sortKey === "TARGET_FIRST") {
      if (left.target !== right.target) return left.target ? -1 : 1;
      if (left.owned !== right.owned) return left.owned ? 1 : -1;
      if (left.chance !== right.chance) return left.chance - right.chance;
      return right.scoreValue - left.scoreValue;
    }

    if (sortKey === "MISSING_FIRST") {
      if (left.owned !== right.owned) return left.owned ? 1 : -1;
      if (left.target !== right.target) return left.target ? -1 : 1;
      if (left.chance !== right.chance) return left.chance - right.chance;
      return right.scoreValue - left.scoreValue;
    }

    if (sortKey === "RAREST_FIRST") {
      if (left.chance !== right.chance) return left.chance - right.chance;
      if (left.owned !== right.owned) return left.owned ? 1 : -1;
      return right.scoreValue - left.scoreValue;
    }

    if (left.scoreValue !== right.scoreValue) return right.scoreValue - left.scoreValue;
    if (left.chance !== right.chance) return left.chance - right.chance;
    if (left.owned !== right.owned) return left.owned ? 1 : -1;
    return left.name.localeCompare(right.name);
  });
  return sorted;
}

function pickTopDrops(rows: DropRow[]): DropRow[] {
  const sorted = [...rows];
  sorted.sort((left, right) => {
    if (left.target !== right.target) return left.target ? -1 : 1;
    if (left.owned !== right.owned) return left.owned ? 1 : -1;
    if (left.chance !== right.chance) return left.chance - right.chance;
    return right.scoreValue - left.scoreValue;
  });
  return sorted.slice(0, 3);
}

function toggleStringValue(values: string[], value: string): string[] {
  return values.includes(value) ? values.filter((entry) => entry !== value) : [...values, value];
}

export default function PvePage() {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [player, setPlayer] = useState<PlayerProfile | null>(null);
  const [npcs, setNpcs] = useState<PveNpc[]>([]);
  const [dropProgressRows, setDropProgressRows] = useState<PveDropProgress[]>([]);
  const [busyNpcId, setBusyNpcId] = useState<string | null>(null);

  const [searchTerm, setSearchTerm] = useState("");
  const [compactMode, setCompactMode] = useState<boolean>(() => parseStoredBoolean(STORAGE_KEYS.compactMode, true));
  const [showOnlyTargetNpcs, setShowOnlyTargetNpcs] = useState<boolean>(() => parseStoredBoolean(STORAGE_KEYS.showOnlyTargetNpcs, false));
  const [npcSortKey, setNpcSortKey] = useState<NpcSortKey>(() => parseStoredNpcSort());
  const [tierFilter, setTierFilter] = useState<number | "ALL">(() => parseStoredTierFilter());

  const [favoriteNpcIds, setFavoriteNpcIds] = useState<string[]>(() => parseStoredStringArray(STORAGE_KEYS.favoriteNpcIds));
  const [pinnedNpcIds, setPinnedNpcIds] = useState<string[]>(() => parseStoredStringArray(STORAGE_KEYS.pinnedNpcIds));
  const [wishlistCardIds, setWishlistCardIds] = useState<string[]>(() => parseStoredStringArray(STORAGE_KEYS.wishlistCardIds));

  const [portraitIndexByNpcId, setPortraitIndexByNpcId] = useState<Record<string, number>>({});
  const [selectedNpcId, setSelectedNpcId] = useState<string | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [drawerDropSortKey, setDrawerDropSortKey] = useState<DropSortKey>("MISSING_FIRST");
  const [drawerDropKindFilter, setDrawerDropKindFilter] = useState<DropKindFilter>("ALL");
  const [drawerMissingOnly, setDrawerMissingOnly] = useState(false);
  const [previewCardId, setPreviewCardId] = useState<string | null>(null);

  useEffect(() => persistBoolean(STORAGE_KEYS.compactMode, compactMode), [compactMode]);
  useEffect(() => persistBoolean(STORAGE_KEYS.showOnlyTargetNpcs, showOnlyTargetNpcs), [showOnlyTargetNpcs]);
  useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(STORAGE_KEYS.npcSortKey, npcSortKey);
  }, [npcSortKey]);
  useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(STORAGE_KEYS.tierFilter, tierFilter === "ALL" ? "ALL" : String(tierFilter));
  }, [tierFilter]);
  useEffect(() => persistStringArray(STORAGE_KEYS.favoriteNpcIds, favoriteNpcIds), [favoriteNpcIds]);
  useEffect(() => persistStringArray(STORAGE_KEYS.pinnedNpcIds, pinnedNpcIds), [pinnedNpcIds]);
  useEffect(() => persistStringArray(STORAGE_KEYS.wishlistCardIds, wishlistCardIds), [wishlistCardIds]);

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        setError("");
        const publicId = getStoredPublicId();
        if (!publicId) throw new Error("Sessao nao encontrada. Faca login no lobby.");

        const [profile, npcRows, dropRows] = await Promise.all([
          fetchPlayerProfile(publicId),
          fetchPveNpcs(publicId),
          fetchPveDropProgress(publicId).catch(() => [])
        ]);

        setPlayer(profile);
        setNpcs(npcRows);
        setDropProgressRows(dropRows);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Falha ao carregar campanha PVE.");
      } finally {
        setLoading(false);
      }
    };

    void load();
  }, []);

  const dropProgressByNpcId = useMemo(() => {
    return dropProgressRows.reduce<Record<string, PveDropProgress>>((acc, row) => {
      acc[row.npcId] = row;
      return acc;
    }, {});
  }, [dropProgressRows]);

  const favoriteNpcIdSet = useMemo(() => new Set(favoriteNpcIds), [favoriteNpcIds]);
  const pinnedNpcIdSet = useMemo(() => new Set(pinnedNpcIds), [pinnedNpcIds]);
  const wishlistCardIdSet = useMemo(() => new Set(wishlistCardIds), [wishlistCardIds]);

  const tiers = useMemo(() => {
    const unique = Array.from(new Set(npcs.map((npc) => npc.tier)));
    unique.sort((left, right) => left - right);
    return unique;
  }, [npcs]);

  const npcDropsByNpcId = useMemo(() => {
    return npcs.reduce<Record<string, DropRow[]>>((acc, npc) => {
      acc[npc.id] = mapDropsForNpc(npc, dropProgressByNpcId[npc.id], wishlistCardIdSet);
      return acc;
    }, {});
  }, [dropProgressByNpcId, npcs, wishlistCardIdSet]);

  const filteredSortedNpcs = useMemo(() => {
    const normalizedSearch = searchTerm.trim().toLowerCase();
    const rows = npcs.filter((npc) => {
      if (tierFilter !== "ALL" && npc.tier !== tierFilter) return false;
      if (normalizedSearch && !npc.name.toLowerCase().includes(normalizedSearch) && !npc.id.toLowerCase().includes(normalizedSearch)) return false;
      if (showOnlyTargetNpcs) {
        const drops = npcDropsByNpcId[npc.id] ?? [];
        const hasTarget = drops.some((drop) => drop.target && !drop.owned);
        if (!hasTarget) return false;
      }
      return true;
    });

    const getRarestChance = (npc: PveNpc): number => {
      const drops = npcDropsByNpcId[npc.id] ?? [];
      if (drops.length === 0) return 1;
      return Math.min(...drops.map((drop) => drop.chance));
    };

    const getProgressRatio = (npc: PveNpc): number => {
      const tracker = dropProgressByNpcId[npc.id];
      if (!tracker || tracker.totalPossible <= 0) return 0;
      return tracker.obtainedCount / tracker.totalPossible;
    };

    rows.sort((left, right) => {
      const leftPinned = pinnedNpcIdSet.has(left.id);
      const rightPinned = pinnedNpcIdSet.has(right.id);
      if (leftPinned !== rightPinned) return leftPinned ? -1 : 1;

      const leftFav = favoriteNpcIdSet.has(left.id);
      const rightFav = favoriteNpcIdSet.has(right.id);
      if (leftFav !== rightFav) return leftFav ? -1 : 1;

      if (npcSortKey === "REWARD_DESC") {
        if (left.rewardGold !== right.rewardGold) return right.rewardGold - left.rewardGold;
      } else if (npcSortKey === "RAREST_DROP") {
        const leftChance = getRarestChance(left);
        const rightChance = getRarestChance(right);
        if (leftChance !== rightChance) return leftChance - rightChance;
      } else if (npcSortKey === "PROGRESS") {
        const leftProgress = getProgressRatio(left);
        const rightProgress = getProgressRatio(right);
        if (leftProgress !== rightProgress) return leftProgress - rightProgress;
      } else {
        if (left.tier !== right.tier) return left.tier - right.tier;
      }

      if (left.unlocked !== right.unlocked) return left.unlocked ? -1 : 1;
      return left.name.localeCompare(right.name);
    });

    return rows;
  }, [dropProgressByNpcId, favoriteNpcIdSet, npcDropsByNpcId, npcSortKey, npcs, pinnedNpcIdSet, searchTerm, showOnlyTargetNpcs, tierFilter]);

  const selectedNpc = useMemo(() => {
    if (!selectedNpcId) return null;
    return npcs.find((npc) => npc.id === selectedNpcId) ?? null;
  }, [npcs, selectedNpcId]);

  useEffect(() => {
    if (filteredSortedNpcs.length === 0) {
      setSelectedNpcId(null);
      setDrawerOpen(false);
      return;
    }
    if (!selectedNpcId || !filteredSortedNpcs.some((npc) => npc.id === selectedNpcId)) {
      setSelectedNpcId(filteredSortedNpcs[0].id);
    }
  }, [filteredSortedNpcs, selectedNpcId]);

  const selectedNpcDrops = useMemo(() => {
    if (!selectedNpc) return [];
    const rows = npcDropsByNpcId[selectedNpc.id] ?? [];
    let filtered = rows;
    if (drawerDropKindFilter !== "ALL") {
      filtered = filtered.filter((row) => row.kind === drawerDropKindFilter);
    }
    if (drawerMissingOnly) {
      filtered = filtered.filter((row) => !row.owned);
    }
    return sortDropRows(filtered, drawerDropSortKey);
  }, [drawerDropKindFilter, drawerDropSortKey, drawerMissingOnly, npcDropsByNpcId, selectedNpc]);

  useEffect(() => {
    if (!selectedNpcDrops.length) {
      setPreviewCardId(null);
      return;
    }
    if (!previewCardId || !selectedNpcDrops.some((drop) => drop.cardId === previewCardId)) {
      setPreviewCardId(selectedNpcDrops[0].cardId);
    }
  }, [previewCardId, selectedNpcDrops]);

  const selectedDropPreview = useMemo(() => {
    if (!previewCardId) return null;
    return selectedNpcDrops.find((drop) => drop.cardId === previewCardId) ?? null;
  }, [previewCardId, selectedNpcDrops]);

  const tierSummary = useMemo(() => {
    const scope = tierFilter === "ALL" ? npcs : npcs.filter((npc) => npc.tier === tierFilter);
    const unlockedCount = scope.filter((npc) => npc.unlocked).length;
    const defeatedCount = scope.filter((npc) => npc.defeated).length;

    let totalPossible = 0;
    let obtained = 0;
    for (const npc of scope) {
      const tracker = dropProgressByNpcId[npc.id];
      if (!tracker) continue;
      totalPossible += tracker.totalPossible;
      obtained += tracker.obtainedCount;
    }
    const completionPercent = totalPossible > 0 ? clampPercent((obtained / totalPossible) * 100) : 0;

    return {
      scopeCount: scope.length,
      unlockedCount,
      defeatedCount,
      obtained,
      totalPossible,
      completionPercent
    };
  }, [dropProgressByNpcId, npcs, tierFilter]);

  const handleDuel = async (npc: PveNpc): Promise<void> => {
    if (!player || !npc.unlocked) return;
    try {
      setBusyNpcId(npc.id);
      setError("");
      const start = await startPveMatch(player.publicId, npc.id);
      router.push(`/match?roomCode=${start.roomCode}&username=${encodeURIComponent(player.username)}&mode=PVE`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Nao foi possivel iniciar o duelo PVE.");
    } finally {
      setBusyNpcId(null);
    }
  };

  const handlePortraitError = (npc: PveNpc): void => {
    setPortraitIndexByNpcId((current) => {
      const index = current[npc.id] ?? 0;
      const maxIndex = Math.max(0, buildPortraitCandidates(npc).length - 1);
      if (index >= maxIndex) return current;
      return {
        ...current,
        [npc.id]: index + 1
      };
    });
  };

  const getPortraitSrc = (npc: PveNpc): string => {
    const candidates = buildPortraitCandidates(npc);
    const index = portraitIndexByNpcId[npc.id] ?? 0;
    return candidates[Math.min(index, candidates.length - 1)] ?? "/images/cartas/Back-FMR-EN-VG.png";
  };

  return (
    <HudStage>
      <div className="mx-auto w-full max-w-[1760px] space-y-3 pb-3">
        <section className="fm-panel rounded-xl px-4 py-3">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h1 className="fm-title text-lg font-bold">Campanha PVE</h1>
              <p className="text-xs text-slate-300">
                {tierFilter === "ALL" ? "Todos os tiers" : `Tier ${tierFilter}`} - {tierSummary.unlockedCount}/{tierSummary.scopeCount} desbloqueados
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Link href="/" className="fm-button rounded-md px-3 py-1.5 text-xs font-semibold">
                Voltar ao Lobby
              </Link>
              <Link href="/deck-builder" className="fm-button rounded-md px-3 py-1.5 text-xs font-semibold">
                Deck Builder
              </Link>
            </div>
          </div>

          <div className="mt-3 grid gap-2 md:grid-cols-2 xl:grid-cols-5">
            <div className="xl:col-span-2">
              <input
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
                placeholder="Buscar NPC por nome ou ID..."
                className="w-full rounded-md border border-slate-700/80 bg-slate-950/70 px-3 py-2 text-sm text-slate-100 outline-none transition focus:border-cyan-300/60"
              />
            </div>
            <label className="flex items-center gap-2 rounded-md border border-slate-700/80 bg-slate-950/70 px-3 py-2 text-xs text-slate-200">
              Ordenar
              <select
                value={npcSortKey}
                onChange={(event) => setNpcSortKey(event.target.value as NpcSortKey)}
                className="w-full rounded border border-slate-700/80 bg-slate-900/80 px-2 py-1 text-xs text-slate-100 outline-none"
              >
                <option value="PROGRESS">Progresso</option>
                <option value="REWARD_DESC">Recompensa</option>
                <option value="RAREST_DROP">Drop mais raro</option>
                <option value="DIFFICULTY">Dificuldade</option>
              </select>
            </label>
            <label className="flex items-center gap-2 rounded-md border border-slate-700/80 bg-slate-950/70 px-3 py-2 text-xs text-slate-200">
              <input type="checkbox" checked={compactMode} onChange={(event) => setCompactMode(event.target.checked)} />
              Modo compacto
            </label>
            <label className="flex items-center gap-2 rounded-md border border-slate-700/80 bg-slate-950/70 px-3 py-2 text-xs text-slate-200">
              <input type="checkbox" checked={showOnlyTargetNpcs} onChange={(event) => setShowOnlyTargetNpcs(event.target.checked)} />
              NPCs com meus alvos
            </label>
          </div>

          <div className="mt-2 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setTierFilter("ALL")}
              className={`rounded-md border px-2.5 py-1 text-xs font-semibold transition ${
                tierFilter === "ALL"
                  ? "border-amber-300/75 bg-amber-800/40 text-amber-100"
                  : "border-slate-700/80 bg-slate-900/70 text-slate-300 hover:border-slate-600/80"
              }`}
            >
              Todos
            </button>
            {tiers.map((tier) => (
              <button
                key={tier}
                type="button"
                onClick={() => setTierFilter(tier)}
                className={`rounded-md border px-2.5 py-1 text-xs font-semibold transition ${
                  tierFilter === tier
                    ? "border-cyan-300/70 bg-cyan-900/45 text-cyan-100"
                    : "border-slate-700/80 bg-slate-900/70 text-slate-300 hover:border-slate-600/80"
                }`}
              >
                T{tier}
              </button>
            ))}
          </div>

          <div className="mt-3 grid gap-2 sm:grid-cols-3">
            <div className="rounded-md border border-slate-700/70 bg-slate-950/55 px-3 py-2">
              <p className="text-[11px] uppercase tracking-wide text-slate-400">Tier selecionado</p>
              <p className="text-sm font-semibold text-slate-100">
                {tierFilter === "ALL" ? "Todos" : `Tier ${tierFilter}`} - {tierSummary.defeatedCount} derrotados
              </p>
            </div>
            <div className="rounded-md border border-slate-700/70 bg-slate-950/55 px-3 py-2">
              <p className="text-[11px] uppercase tracking-wide text-slate-400">Tracker global</p>
              <p className="text-sm font-semibold text-slate-100">
                {tierSummary.obtained}/{tierSummary.totalPossible} drops
              </p>
            </div>
            <div className="rounded-md border border-slate-700/70 bg-slate-950/55 px-3 py-2">
              <p className="text-[11px] uppercase tracking-wide text-slate-400">Conclusao</p>
              <p className="text-sm font-semibold text-slate-100">{tierSummary.completionPercent.toFixed(1)}%</p>
              <div className="mt-1 h-1.5 overflow-hidden rounded bg-slate-800/80">
                <div className="h-full rounded bg-gradient-to-r from-cyan-400/80 to-emerald-400/80" style={{ width: `${tierSummary.completionPercent}%` }} />
              </div>
            </div>
          </div>
        </section>

        {error ? <section className="rounded-md border border-rose-500/70 bg-rose-900/35 px-3 py-2 text-xs text-rose-100">{error}</section> : null}

        {loading ? (
          <section className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
            {Array.from({ length: 6 }).map((_, index) => (
              <div key={`skeleton-${index}`} className="h-44 animate-pulse rounded-lg border border-slate-700/70 bg-slate-900/60" />
            ))}
          </section>
        ) : filteredSortedNpcs.length === 0 ? (
          <section className="rounded-lg border border-slate-700/75 bg-slate-950/65 px-4 py-6 text-center">
            <p className="text-sm font-semibold text-slate-100">Nenhum NPC encontrado para os filtros atuais.</p>
            <p className="mt-1 text-xs text-slate-400">Ajuste busca, tier ou toggle de alvos para continuar.</p>
          </section>
        ) : (
          <section className={`grid gap-2 ${compactMode ? "sm:grid-cols-2 xl:grid-cols-3" : "xl:grid-cols-2"}`}>
            {filteredSortedNpcs.map((npc) => {
              const tracker = dropProgressByNpcId[npc.id];
              const status = statusView(npc);
              const drops = npcDropsByNpcId[npc.id] ?? [];
              const topDrops = pickTopDrops(drops);
              const obtainedCount = tracker?.obtainedCount ?? 0;
              const totalPossible = tracker?.totalPossible ?? drops.length;
              const missingCount = Math.max(0, (tracker?.missingCount ?? Math.max(0, totalPossible - obtainedCount)));
              const progressPercent = totalPossible > 0 ? clampPercent((obtainedCount / totalPossible) * 100) : 0;
              const hasTarget = drops.some((drop) => drop.target && !drop.owned);
              const isPinned = pinnedNpcIdSet.has(npc.id);
              const isFavorite = favoriteNpcIdSet.has(npc.id);
              const hasNewDrops = tracker ? tracker.obtainedCount > tracker.totalPossible - tracker.missingCount : false;

              return (
                <article key={npc.id} className="lobby-motion-card rounded-lg border border-slate-700/75 bg-slate-950/65 p-2.5">
                  <div className="flex gap-2.5">
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedNpcId(npc.id);
                        setDrawerOpen(true);
                      }}
                      className={`group relative shrink-0 overflow-hidden rounded-md border ${
                        compactMode ? "h-24 w-20" : "h-28 w-24"
                      } border-slate-600/75 bg-slate-900/70`}
                    >
                      <img
                        src={getPortraitSrc(npc)}
                        alt={npc.name}
                        loading="lazy"
                        onError={() => handlePortraitError(npc)}
                        className="h-full w-full object-cover transition group-hover:scale-[1.03]"
                      />
                      {hasNewDrops ? (
                        <span className="absolute left-1 top-1 rounded bg-emerald-600/90 px-1.5 py-0.5 text-[10px] font-bold text-white">Novo!</span>
                      ) : null}
                    </button>

                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="truncate text-sm font-semibold text-slate-100">
                            {npc.name}
                            <span className="ml-1 text-[11px] text-cyan-200/90">T{npc.tier}</span>
                          </p>
                          <div className="mt-1 flex flex-wrap gap-1.5">
                            <span className={`rounded px-2 py-0.5 text-[10px] font-semibold ${status.className}`}>{status.label}</span>
                            {hasTarget ? <span className="rounded border border-amber-300/60 bg-amber-800/45 px-2 py-0.5 text-[10px] font-semibold text-amber-100">Alvos</span> : null}
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={() => void handleDuel(npc)}
                          disabled={!npc.unlocked || busyNpcId === npc.id}
                          className="fm-button shrink-0 rounded-md px-3 py-1.5 text-xs font-semibold disabled:cursor-not-allowed disabled:opacity-45"
                        >
                          {busyNpcId === npc.id ? "..." : npc.unlocked ? "Duelar" : "Bloqueado"}
                        </button>
                      </div>

                      <div className="mt-1.5 flex flex-wrap items-center gap-1.5 text-[11px]">
                        <span className="rounded border border-amber-300/45 bg-amber-800/25 px-2 py-0.5 text-amber-100">{npc.rewardGold} gold</span>
                        <span className="rounded border border-slate-600/70 bg-slate-900/70 px-2 py-0.5 text-slate-300">
                          {obtainedCount}/{totalPossible} - faltam {missingCount}
                        </span>
                      </div>

                      <div className="mt-1.5 h-1.5 overflow-hidden rounded bg-slate-800/75">
                        <div className="h-full rounded bg-gradient-to-r from-cyan-400/80 to-emerald-400/80" style={{ width: `${progressPercent}%` }} />
                      </div>

                      <div className="mt-2 grid gap-1">
                        {topDrops.map((drop) => (
                          <button
                            key={`${npc.id}-${drop.cardId}`}
                            type="button"
                            onClick={() => {
                              setSelectedNpcId(npc.id);
                              setDrawerOpen(true);
                              setPreviewCardId(drop.cardId);
                            }}
                            className="flex items-center justify-between gap-2 rounded border border-slate-700/70 bg-slate-900/70 px-2 py-1 text-left text-[11px]"
                          >
                            <span className="truncate text-slate-200">{drop.name}</span>
                            <span className={`shrink-0 ${drop.owned ? "text-emerald-200" : "text-cyan-200"}`}>
                              {Math.round(drop.chance * 100)}%
                            </span>
                          </button>
                        ))}
                        {!topDrops.length ? <p className="text-[11px] text-slate-500">Sem drops cadastrados.</p> : null}
                      </div>

                      <div className="mt-2 flex flex-wrap gap-1.5">
                        <button
                          type="button"
                          onClick={() => setPinnedNpcIds((current) => toggleStringValue(current, npc.id))}
                          className={`rounded border px-2 py-0.5 text-[11px] ${
                            isPinned ? "border-cyan-300/70 bg-cyan-900/45 text-cyan-100" : "border-slate-700/80 bg-slate-900/70 text-slate-300"
                          }`}
                          title="Fixar NPC no topo"
                        >
                          Pin
                        </button>
                        <button
                          type="button"
                          onClick={() => setFavoriteNpcIds((current) => toggleStringValue(current, npc.id))}
                          className={`rounded border px-2 py-0.5 text-[11px] ${
                            isFavorite ? "border-amber-300/70 bg-amber-800/45 text-amber-100" : "border-slate-700/80 bg-slate-900/70 text-slate-300"
                          }`}
                          title="Favoritar NPC"
                        >
                          Fav
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedNpcId(npc.id);
                            setDrawerOpen(true);
                          }}
                          className="rounded border border-slate-700/80 bg-slate-900/70 px-2 py-0.5 text-[11px] text-slate-300"
                        >
                          Detalhes
                        </button>
                      </div>

                      {!npc.unlocked ? <p className="mt-1 text-[11px] text-slate-400">{unlockText(npc)}</p> : null}
                    </div>
                  </div>
                </article>
              );
            })}
          </section>
        )}
      </div>

      {drawerOpen && selectedNpc ? (
        <div className="fixed inset-0 z-modal bg-black/55" onClick={() => setDrawerOpen(false)}>
          <aside
            className="fm-scroll absolute bottom-0 right-0 top-0 w-full max-w-[560px] overflow-y-auto border-l border-slate-700/80 bg-[linear-gradient(180deg,rgba(5,12,28,0.98),rgba(2,8,20,0.99))] p-3 shadow-[-18px_0_42px_rgba(0,0,0,0.55)]"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="fm-title text-sm font-bold">{selectedNpc.name}</p>
                <p className="text-xs text-slate-300">
                  Tier {selectedNpc.tier} - {statusView(selectedNpc).label}
                </p>
              </div>
              <button type="button" onClick={() => setDrawerOpen(false)} className="fm-button rounded-md px-2.5 py-1 text-xs font-semibold">
                Fechar
              </button>
            </div>

            <div className="mt-3 grid gap-2 sm:grid-cols-[120px_1fr]">
              <div className="overflow-hidden rounded-md border border-slate-700/70 bg-slate-900/75">
                <img src={getPortraitSrc(selectedNpc)} alt={selectedNpc.name} className="h-32 w-full object-cover" loading="lazy" />
              </div>
              <div className="rounded-md border border-slate-700/70 bg-slate-900/70 p-2.5 text-xs text-slate-200">
                <p className="text-slate-100">Recompensa base: {selectedNpc.rewardGold} gold</p>
                <p className="mt-1">Drops possiveis: {(npcDropsByNpcId[selectedNpc.id] ?? []).length}</p>
                <p className="mt-1 text-slate-300">Requisito: {unlockText(selectedNpc)}</p>
                <button
                  type="button"
                  onClick={() => void handleDuel(selectedNpc)}
                  disabled={!selectedNpc.unlocked || busyNpcId === selectedNpc.id}
                  className="fm-button mt-2 w-full rounded-md px-3 py-1.5 text-xs font-semibold disabled:cursor-not-allowed disabled:opacity-45"
                >
                  {busyNpcId === selectedNpc.id ? "Iniciando duelo..." : selectedNpc.unlocked ? "Duelar" : "Bloqueado"}
                </button>
              </div>
            </div>

            <div className="mt-3 rounded-md border border-slate-700/70 bg-slate-900/65 p-2.5">
              <p className="text-xs font-semibold text-slate-100">Tracker de farm</p>
              {(() => {
                const tracker = dropProgressByNpcId[selectedNpc.id];
                const total = tracker?.totalPossible ?? (npcDropsByNpcId[selectedNpc.id]?.length ?? 0);
                const obtained = tracker?.obtainedCount ?? 0;
                const missing = Math.max(0, total - obtained);
                const percent = total > 0 ? clampPercent((obtained / total) * 100) : 0;
                return (
                  <>
                    <p className="mt-1 text-xs text-slate-200">
                      {obtained}/{total} drops obtidos - faltam {missing}
                    </p>
                    <div className="mt-2 h-2 overflow-hidden rounded bg-slate-800/80">
                      <div className="h-full rounded bg-gradient-to-r from-cyan-400/80 to-emerald-400/80" style={{ width: `${percent}%` }} />
                    </div>
                  </>
                );
              })()}
            </div>

            <div className="mt-3 grid gap-2 sm:grid-cols-3">
              <label className="rounded-md border border-slate-700/70 bg-slate-900/65 px-2 py-1.5 text-[11px] text-slate-300">
                Ordenar drops
                <select
                  value={drawerDropSortKey}
                  onChange={(event) => setDrawerDropSortKey(event.target.value as DropSortKey)}
                  className="mt-1 w-full rounded border border-slate-700/80 bg-slate-900/85 px-2 py-1 text-xs text-slate-100"
                >
                  <option value="MISSING_FIRST">Mais faltando</option>
                  <option value="RAREST_FIRST">Mais raro</option>
                  <option value="VALUE_DESC">Maior valor</option>
                  <option value="TARGET_FIRST">Meus alvos</option>
                </select>
              </label>

              <label className="rounded-md border border-slate-700/70 bg-slate-900/65 px-2 py-1.5 text-[11px] text-slate-300">
                Tipo
                <select
                  value={drawerDropKindFilter}
                  onChange={(event) => setDrawerDropKindFilter(event.target.value as DropKindFilter)}
                  className="mt-1 w-full rounded border border-slate-700/80 bg-slate-900/85 px-2 py-1 text-xs text-slate-100"
                >
                  <option value="ALL">Todos</option>
                  <option value="MONSTER">Monstro</option>
                  <option value="SPELL">Magia</option>
                  <option value="TRAP">Armadilha</option>
                </select>
              </label>

              <label className="flex items-center gap-2 rounded-md border border-slate-700/70 bg-slate-900/65 px-2 py-1.5 text-[11px] text-slate-300">
                <input type="checkbox" checked={drawerMissingOnly} onChange={(event) => setDrawerMissingOnly(event.target.checked)} />
                Mostrar so faltando
              </label>
            </div>

            <div className="mt-3 rounded-md border border-slate-700/70 bg-slate-900/62 p-2.5">
              <p className="text-xs font-semibold text-slate-100">Drops do NPC</p>
              <div className="fm-scroll mt-2 max-h-[320px] space-y-1.5 overflow-y-auto pr-1">
                {selectedNpcDrops.map((drop) => (
                  <button
                    key={`${selectedNpc.id}-${drop.cardId}`}
                    type="button"
                    onClick={() => setPreviewCardId(drop.cardId)}
                    className={`flex w-full items-center gap-2 rounded border px-2 py-1.5 text-left ${
                      previewCardId === drop.cardId
                        ? "border-cyan-300/75 bg-cyan-900/35"
                        : "border-slate-700/70 bg-slate-900/65 hover:border-slate-600/80"
                    }`}
                  >
                    <div className="h-12 w-9 shrink-0 overflow-hidden rounded border border-slate-700/80 bg-slate-950/80">
                      {drop.imagePath ? <img src={drop.imagePath} alt={drop.name} className="h-full w-full object-cover" loading="lazy" /> : null}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-xs font-semibold text-slate-100">{drop.name}</p>
                      <p className="text-[11px] text-slate-300">
                        {drop.kind === "MONSTER" ? `${drop.atk}/${drop.def}` : drop.effectDescription ?? "Sem efeito descrito."}
                      </p>
                      <p className="text-[10px] text-cyan-200/90">
                        {Math.round(drop.chance * 100)}% - x{drop.minCount}-{drop.maxCount}
                      </p>
                    </div>
                    <div className="flex shrink-0 flex-col items-end gap-1">
                      <span className={`rounded px-1.5 py-0.5 text-[10px] ${drop.owned ? "bg-emerald-900/45 text-emerald-200" : "bg-slate-800/75 text-slate-300"}`}>
                        {drop.owned ? "Completo" : "Faltando"}
                      </span>
                      <button
                        type="button"
                        onClick={(event) => {
                          event.stopPropagation();
                          setWishlistCardIds((current) => toggleStringValue(current, drop.cardId));
                        }}
                        className={`rounded border px-1.5 py-0.5 text-[10px] ${
                          drop.target ? "border-amber-300/70 bg-amber-800/45 text-amber-100" : "border-slate-700/80 bg-slate-900/70 text-slate-300"
                        }`}
                      >
                        {drop.target ? "Alvo" : "Marcar"}
                      </button>
                    </div>
                  </button>
                ))}
                {selectedNpcDrops.length === 0 ? <p className="text-xs text-slate-400">Nenhum drop para os filtros aplicados.</p> : null}
              </div>
            </div>

            {selectedDropPreview ? (
              <div className="mt-3 rounded-md border border-slate-700/70 bg-slate-900/65 p-2.5">
                <p className="text-xs font-semibold text-slate-100">Preview da carta</p>
                <div className="mt-2 grid gap-2 sm:grid-cols-[96px_1fr]">
                  <div className="h-32 w-24 overflow-hidden rounded border border-slate-700/70 bg-slate-950/75">
                    {selectedDropPreview.imagePath ? (
                      <img src={selectedDropPreview.imagePath} alt={selectedDropPreview.name} className="h-full w-full object-cover" loading="lazy" />
                    ) : null}
                  </div>
                  <div className="text-xs text-slate-200">
                    <p className="text-sm font-semibold text-slate-100">{selectedDropPreview.name}</p>
                    <p className="mt-1 text-slate-300">Tipo: {selectedDropPreview.kind}</p>
                    {selectedDropPreview.kind === "MONSTER" ? (
                      <p className="mt-1 text-slate-300">
                        ATK/DEF: {selectedDropPreview.atk}/{selectedDropPreview.def}
                      </p>
                    ) : (
                      <p className="mt-1 text-slate-300">{selectedDropPreview.effectDescription ?? "Sem efeito descrito."}</p>
                    )}
                    <p className="mt-1 text-cyan-200/90">
                      Chance: {Math.round(selectedDropPreview.chance * 100)}% - Quantidade: x{selectedDropPreview.minCount}-{selectedDropPreview.maxCount}
                    </p>
                    <p className="mt-1 text-[11px] text-slate-400">
                      Tags: {selectedDropPreview.tags.length ? selectedDropPreview.tags.join(", ") : "Sem tags"}
                    </p>
                  </div>
                </div>
              </div>
            ) : null}
          </aside>
        </div>
      ) : null}
    </HudStage>
  );
}

