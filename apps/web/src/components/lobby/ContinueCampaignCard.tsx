import { useMemo, useState } from "react";
import type { LevelProgress, PveNpc } from "../../lib/api";
import { GameCard } from "./GameCard";

interface ContinueCampaignCardProps {
  loading: boolean;
  playerLogged: boolean;
  winsPve: number;
  levelProgress: LevelProgress | null;
  npcs: PveNpc[];
  busyNpcId: string | null;
  onOpenNpcSelection: () => void;
  onQuickDuel: (npcId: string) => void;
}

type ShowcaseStatus = "CONCLUIDO" | "DISPONIVEL" | "BLOQUEADO";

type ShowcaseNpc = {
  key: string;
  label: string;
  baseName: string;
  status: ShowcaseStatus;
  rewardLabel: string;
  actionLabel: string;
  actionEnabled: boolean;
  npcId: string | null;
  portraitCandidates: string[];
};

const DEFAULT_NPC_PORTRAIT = "/images/npcs/Card_shop_owner.png";

function progressPercent(levelProgress: LevelProgress | null): number {
  if (!levelProgress) return 49;
  const current = Math.max(0, levelProgress.xpInLevel);
  const total = Math.max(1, levelProgress.xpInLevel + levelProgress.xpToNextLevel);
  return Math.max(0, Math.min(100, Math.round((current / total) * 100)));
}

function normalizeSlug(value: string): string {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

function buildNpcPortraitCandidates(input: { id?: string | null; name: string }): string[] {
  const candidates: string[] = [];
  const push = (path: string): void => {
    if (!path || candidates.includes(path)) return;
    candidates.push(path);
  };

  const name = input.name.trim();
  const id = (input.id ?? "").trim();
  const idTail = id.replace(/^FM_\d+_/, "").replace(/_/g, " ").trim();
  const nameNoOrdinal = name.replace(/\s+\d+(st|nd|rd|th)$/i, "").trim();
  const nameNoGuardian = nameNoOrdinal.replace(/^Guardian\s+/i, "").trim();

  const aliasByName: Record<string, string[]> = {
    "Simon Muran": ["Simon_Muran", "SimonMuran"],
    Jono: ["Joey"],
    "Tea Gardner": ["Tea"],
    "Seto 2nd": ["Seto"],
    "Seto 3rd": ["Seto"],
    "Heishin 2nd": ["Heishin"],
    DarkNite: ["Nitemare", "Dark_Nite"],
    "Guardian Sebek": ["Sebek"],
    "Guardian Neku": ["Neku"],
    "Duel Master K": ["Duel_Master_K"]
  };

  const variants = new Set<string>([name, nameNoOrdinal, nameNoGuardian, idTail]);
  for (const variant of variants) {
    if (!variant) continue;
    push(`/images/npcs/${variant}.png`);
    push(`/images/npcs/${variant.replace(/\s+/g, "_")}.png`);
    push(`/images/npcs/${variant.replace(/\s+/g, "-")}.png`);
    push(`/images/npcs/${variant.replace(/[^A-Za-z0-9]/g, "")}.png`);
    push(`/images/npcs/${variant.toLowerCase().replace(/\s+/g, "_")}.png`);
    push(`/images/npcs/${normalizeSlug(variant)}.png`);
  }

  for (const alias of aliasByName[name] ?? []) {
    push(`/images/npcs/${alias}.png`);
    push(`/images/npcs/${alias.replace(/\s+/g, "_")}.png`);
    push(`/images/npcs/${normalizeSlug(alias)}.png`);
  }

  if (id) push(`/images/npcs/${id}.png`);
  push(DEFAULT_NPC_PORTRAIT);
  return candidates;
}

function statusClasses(status: ShowcaseStatus): string {
  if (status === "CONCLUIDO") return "border-amber-300/75 bg-amber-900/20";
  if (status === "DISPONIVEL") return "border-cyan-300/65 bg-cyan-900/20";
  return "border-slate-600/70 bg-slate-900/50 opacity-70";
}

function statusLabel(status: ShowcaseStatus): string {
  if (status === "CONCLUIDO") return "\u2705 Concluido";
  if (status === "DISPONIVEL") return "Disponivel";
  return "\ud83d\udd12 Bloqueado";
}

function buildShowcaseNpcs(npcs: PveNpc[]): ShowcaseNpc[] {
  const pending: ShowcaseNpc[] = [...npcs]
    .filter((npc) => npc.unlocked && !npc.defeated)
    .sort((a, b) => a.tier - b.tier || a.name.localeCompare(b.name))
    .slice(0, 9)
    .map<ShowcaseNpc>((npc) => {
      const status: ShowcaseStatus = "DISPONIVEL";
      return {
        key: npc.id,
        label: npc.name,
        baseName: npc.name,
        status,
        rewardLabel: `${npc.rewardGold}g`,
        actionLabel: "\u2694\ufe0f Duelar",
        actionEnabled: true,
        npcId: npc.id,
        portraitCandidates: buildNpcPortraitCandidates({ id: npc.id, name: npc.name })
      };
    });

  return pending;
}

export function ContinueCampaignCard({
  loading,
  playerLogged,
  winsPve,
  levelProgress,
  npcs,
  busyNpcId,
  onOpenNpcSelection,
  onQuickDuel
}: ContinueCampaignCardProps) {
  const pct = progressPercent(levelProgress);
  const currentTier = npcs.length ? Math.max(0, ...npcs.filter((npc) => npc.defeated).map((npc) => npc.tier)) : 2;
  const showcase = useMemo(() => buildShowcaseNpcs(npcs), [npcs]);
  const [portraitIndexByKey, setPortraitIndexByKey] = useState<Record<string, number>>({});

  if (!playerLogged) {
    return (
      <GameCard title="CONTINUE A CAMPANHA">
        <p className="text-base text-slate-300">Conecte sua conta para liberar campanha PvE.</p>
      </GameCard>
    );
  }

  const resolveNpcPortrait = (npc: ShowcaseNpc): string => {
    const index = portraitIndexByKey[npc.key] ?? 0;
    const safeIndex = Math.min(index, Math.max(0, npc.portraitCandidates.length - 1));
    return npc.portraitCandidates[safeIndex] ?? DEFAULT_NPC_PORTRAIT;
  };

  const handlePortraitError = (npc: ShowcaseNpc): void => {
    setPortraitIndexByKey((current) => {
      const currentIndex = current[npc.key] ?? 0;
      const maxIndex = Math.max(0, npc.portraitCandidates.length - 1);
      if (currentIndex >= maxIndex) return current;
      return {
        ...current,
        [npc.key]: currentIndex + 1
      };
    });
  };

  return (
    <GameCard title="CONTINUE A CAMPANHA">
      <div className="space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          <span className="fm-chip rounded-md px-2.5 py-1 text-sm font-bold tracking-[0.06em] text-amber-100">Tier T{currentTier}</span>
          <span className="fm-chip rounded-md px-2.5 py-1 text-sm font-bold tracking-[0.06em] text-cyan-100">{winsPve} Wins</span>
          <span className="fm-chip rounded-md px-2.5 py-1 text-sm font-bold tracking-[0.06em] text-emerald-100">{pct}% progresso</span>
        </div>

        <div className="h-2 overflow-hidden rounded-full bg-slate-800/90">
          <div className="h-full rounded-full bg-gradient-to-r from-orange-400 via-amber-300 to-cyan-300" style={{ width: `${pct}%` }} />
        </div>

        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {loading
            ? Array.from({ length: 9 }).map((_, index) => (
                <div key={`npc-loading-${index}`} className="h-[156px] animate-pulse rounded-lg border border-slate-700/70 bg-slate-800/60" />
              ))
            : showcase.length > 0
              ? showcase.map((npc) => (
                <article key={npc.key} className={`rounded-lg border p-2 ${statusClasses(npc.status)}`}>
                  <div className="overflow-hidden rounded-md border border-slate-700/70 bg-slate-900/70">
                    <img
                      src={resolveNpcPortrait(npc)}
                      alt={npc.baseName}
                      loading="lazy"
                      onError={() => handlePortraitError(npc)}
                      className="h-24 w-full object-contain"
                    />
                  </div>
                  <p className="mt-1 truncate text-[15px] font-semibold tracking-[0.03em] text-slate-100">{npc.label}</p>
                  <div className="mt-1 flex items-center justify-between gap-2">
                    <p className="text-xs tracking-[0.03em] text-slate-100">{statusLabel(npc.status)}</p>
                    <span className="rounded border border-amber-300/45 bg-amber-900/25 px-1.5 py-0.5 text-[11px] text-amber-100">{npc.rewardLabel}</span>
                  </div>
                  <div className="mt-2">
                    {npc.actionEnabled && npc.npcId ? (
                      <button
                        type="button"
                        onClick={() => onQuickDuel(npc.npcId as string)}
                        disabled={busyNpcId === npc.npcId}
                        className="fm-button w-full rounded-md px-2 py-1.5 text-xs font-semibold tracking-[0.04em] disabled:cursor-not-allowed disabled:opacity-45"
                      >
                        {busyNpcId === npc.npcId ? "..." : npc.actionLabel}
                      </button>
                    ) : (
                      <span className="inline-flex w-full justify-center rounded border border-slate-500/55 bg-slate-800/70 px-2 py-1.5 text-xs tracking-[0.03em] text-slate-300">
                        {npc.actionLabel}
                      </span>
                    )}
                  </div>
                </article>
                ))
              : (
                <div className="col-span-full rounded-lg border border-slate-700/75 bg-slate-900/70 p-4 text-sm text-slate-200">
                  Nenhum NPC pendente no momento. Abra a selecao para desafiar tiers superiores.
                </div>
              )}
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={onOpenNpcSelection}
            className="lobby-pressable rounded-lg border border-amber-300/85 bg-[linear-gradient(180deg,rgba(176,120,33,0.96),rgba(120,79,18,0.98))] px-4 py-2 text-sm font-semibold text-amber-50 shadow-[inset_0_1px_0_rgba(255,232,179,0.35),0_10px_18px_rgba(0,0,0,0.28)]"
          >
            Selecionar NPCs
          </button>
        </div>
      </div>
    </GameCard>
  );
}
