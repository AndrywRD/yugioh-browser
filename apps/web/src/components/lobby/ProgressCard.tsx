import type { LevelProgress, PlayerProfile, PveNpc } from "../../lib/api";
import { GameCard } from "./GameCard";
import { LobbyIcon } from "./LobbyIcon";
import { getUnlockRequirementLabel } from "./types";

interface ProgressCardProps {
  loading: boolean;
  player: PlayerProfile | null;
  npcs: PveNpc[];
  fusionCount: number;
  levelProgress: LevelProgress | null;
  achievementsUnlocked: number;
  availableAchievements: number;
  dailyMissionCompleted: number;
}

function currentTier(npcs: PveNpc[]): number {
  const tiers = npcs.filter((npc) => npc.defeated).map((npc) => npc.tier);
  if (!tiers.length) return 0;
  return Math.max(...tiers);
}

export function ProgressCard({
  loading,
  player,
  npcs,
  fusionCount,
  levelProgress,
  achievementsUnlocked,
  availableAchievements,
  dailyMissionCompleted
}: ProgressCardProps) {
  if (!player) {
    return (
      <GameCard title="Progresso">
        <p className="text-sm text-slate-300">Entre para acompanhar desbloqueios e avancos da conta.</p>
      </GameCard>
    );
  }

  const tier = currentTier(npcs);
  const unlockedNpcs = npcs.filter((npc) => npc.unlocked).length;
  const nextUnlock = [...npcs]
    .filter((npc) => !npc.unlocked)
    .sort((left, right) => left.tier - right.tier || left.name.localeCompare(right.name))[0];

  return (
    <GameCard title="Progresso" rightSlot={<LobbyIcon kind="progress" className="h-4 w-4" />}>
      {loading ? (
        <div className="h-[116px] animate-pulse rounded-lg border border-slate-700/70 bg-slate-800/60" />
      ) : (
        <div className="space-y-2 text-xs text-slate-200">
          <div className="grid grid-cols-3 gap-2">
            <div className="rounded-lg border border-slate-700/75 bg-slate-900/60 px-2 py-1.5 text-center">
              <p className="text-[10px] text-slate-400">Tier</p>
              <p className="text-sm font-semibold text-amber-100">T{tier}</p>
            </div>
            <div className="rounded-lg border border-slate-700/75 bg-slate-900/60 px-2 py-1.5 text-center">
              <p className="text-[10px] text-slate-400">NPCs</p>
              <p className="text-sm font-semibold text-cyan-100">{unlockedNpcs}</p>
            </div>
            <div className="rounded-lg border border-slate-700/75 bg-slate-900/60 px-2 py-1.5 text-center">
              <p className="text-[10px] text-slate-400">Conquistas</p>
              <p className="text-sm font-semibold text-emerald-100">{achievementsUnlocked}/{availableAchievements}</p>
            </div>
          </div>
          <p className="text-[11px] text-slate-300">
            Nivel {levelProgress?.level ?? player.level} | Fusoes {fusionCount} | Missoes resgatadas {dailyMissionCompleted}
          </p>
          <p className="rounded-lg border border-slate-700/80 bg-slate-900/65 p-2 text-[11px] text-slate-300">
            {nextUnlock ? `Proximo unlock: ${nextUnlock.name} (${getUnlockRequirementLabel(nextUnlock)})` : "Todos os NPCs desbloqueados."}
          </p>
        </div>
      )}
    </GameCard>
  );
}
