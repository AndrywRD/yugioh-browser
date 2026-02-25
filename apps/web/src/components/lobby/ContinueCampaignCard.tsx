import type { LevelProgress, PveNpc } from "../../lib/api";
import { GameCard } from "./GameCard";
import { getUnlockRequirementLabel } from "./types";

interface ContinueCampaignCardProps {
  loading: boolean;
  playerLogged: boolean;
  winsPve: number;
  levelProgress: LevelProgress | null;
  npcs: PveNpc[];
  busyNpcId: string | null;
  onContinueCampaign: () => void;
  onOpenNpcSelection: () => void;
  onOpenDeckBuilder: () => void;
  onQuickDuel: (npcId: string) => void;
}

function getRecommendedNpc(npcs: PveNpc[]): PveNpc | null {
  const unlocked = npcs.filter((npc) => npc.unlocked);
  if (!unlocked.length) return null;
  const pending = unlocked.find((npc) => !npc.defeated);
  return pending ?? unlocked[0] ?? null;
}

function progressPercent(levelProgress: LevelProgress | null): number {
  if (!levelProgress) return 0;
  const base = levelProgress.xpInLevel;
  const need = Math.max(1, levelProgress.xpToNextLevel + levelProgress.xpInLevel);
  return Math.max(0, Math.min(100, Math.round((base / need) * 100)));
}

export function ContinueCampaignCard({
  loading,
  playerLogged,
  winsPve,
  levelProgress,
  npcs,
  busyNpcId,
  onContinueCampaign,
  onOpenNpcSelection,
  onOpenDeckBuilder,
  onQuickDuel
}: ContinueCampaignCardProps) {
  if (!playerLogged) {
    return (
      <GameCard title="Continue a Campanha" subtitle="Entre para liberar progressao e duelos PvE.">
        <p className="text-sm text-slate-300">Conecte sua conta para acessar NPCs, drops e progressao de nivel.</p>
      </GameCard>
    );
  }

  const recommendedNpc = getRecommendedNpc(npcs);
  const currentTier = npcs.length ? Math.max(0, ...npcs.filter((npc) => npc.defeated).map((npc) => npc.tier)) : 0;
  const nextUnlock = [...npcs]
    .filter((npc) => !npc.unlocked)
    .sort((left, right) => left.tier - right.tier || left.name.localeCompare(right.name))[0];
  const unlockedPreview = npcs
    .filter((npc) => npc.unlocked)
    .sort((left, right) => left.tier - right.tier || Number(left.defeated) - Number(right.defeated) || left.name.localeCompare(right.name))
    .slice(0, 3);
  const pct = progressPercent(levelProgress);

  return (
    <GameCard title="Continue a Campanha" subtitle="Continue de onde parou e avance nos tiers de NPCs.">
      <div className="space-y-3">
        <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end">
          <div className="space-y-2">
            <p className="text-sm text-slate-100">
              Tier atual: <span className="font-semibold text-amber-100">T{currentTier}</span>
            </p>
            <p className="text-xs text-slate-300">
              {nextUnlock
                ? `Proximo unlock: ${nextUnlock.name} (${getUnlockRequirementLabel(nextUnlock)})`
                : "Todos os NPCs estao desbloqueados."}
            </p>
            <div className="h-2 overflow-hidden rounded-full bg-slate-800/90">
              <div className="h-full rounded-full bg-gradient-to-r from-amber-300/80 via-cyan-300/75 to-emerald-300/80" style={{ width: `${pct}%` }} />
            </div>
            <p className="text-[11px] text-slate-300">Wins PvE: {winsPve} | Progressao de nivel: {pct}%</p>
          </div>

          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-1">
            <button
              type="button"
              onClick={onContinueCampaign}
              className="lobby-pressable rounded-lg border border-amber-300/85 bg-[linear-gradient(180deg,rgba(176,120,33,0.96),rgba(120,79,18,0.98))] px-4 py-2 text-sm font-semibold text-amber-50 shadow-[inset_0_1px_0_rgba(255,232,179,0.35),0_10px_18px_rgba(0,0,0,0.28)]"
            >
              Continuar
            </button>
            <button type="button" onClick={onOpenNpcSelection} className="fm-button rounded-lg px-4 py-2 text-sm font-semibold">
              Selecionar NPC
            </button>
            <button type="button" onClick={onOpenDeckBuilder} className="fm-button rounded-lg px-4 py-2 text-sm font-semibold sm:col-span-2 lg:col-span-1">
              Deck Builder
            </button>
          </div>
        </div>

        <div className="grid gap-2 md:grid-cols-3">
          {loading ? (
            Array.from({ length: 3 }).map((_, index) => (
              <div key={`npc-loading-${index}`} className="h-[88px] animate-pulse rounded-lg border border-slate-700/70 bg-slate-800/60" />
            ))
          ) : unlockedPreview.length > 0 ? (
            unlockedPreview.map((npc) => {
              const isRecommended = recommendedNpc?.id === npc.id;
              return (
                <article key={npc.id} className="rounded-lg border border-slate-700/80 bg-slate-900/65 p-2.5">
                  <div className="flex items-start justify-between gap-2">
                    <p className="truncate text-sm font-semibold text-slate-100">{npc.name}</p>
                    <span className="text-[10px] text-cyan-100">T{npc.tier}</span>
                  </div>
                  <p className="mt-1 text-[11px] text-slate-300">{npc.defeated ? "Concluido" : "Disponivel"}</p>
                  <div className="mt-2 flex items-center justify-between gap-2">
                    <span className="rounded border border-amber-200/45 bg-amber-900/30 px-1.5 py-0.5 text-[10px] text-amber-100">{npc.rewardGold}g</span>
                    <button
                      type="button"
                      onClick={() => onQuickDuel(npc.id)}
                      disabled={busyNpcId === npc.id}
                      className="fm-button rounded-md px-2 py-1 text-[11px] font-semibold disabled:cursor-not-allowed disabled:opacity-45"
                    >
                      {busyNpcId === npc.id ? "Iniciando..." : isRecommended ? "Duelar (Recomendado)" : "Duelar"}
                    </button>
                  </div>
                </article>
              );
            })
          ) : (
            <div className="rounded-lg border border-slate-700/75 bg-slate-900/65 p-3 text-sm text-slate-300 md:col-span-3">
              Nenhum NPC desbloqueado ainda. Inicie sua campanha para liberar os desafios.
            </div>
          )}
        </div>
      </div>
    </GameCard>
  );
}
