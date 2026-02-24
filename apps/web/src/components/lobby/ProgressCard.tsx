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

function computeCurrentTier(npcs: PveNpc[]): number {
  const defeatedTiers = npcs.filter((npc) => npc.defeated).map((npc) => npc.tier);
  if (defeatedTiers.length === 0) return 0;
  return Math.max(...defeatedTiers);
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
      <GameCard title="Progresso" subtitle="Acompanhe tiers e desbloqueios">
        <p className="text-sm text-slate-300">Entre para acompanhar avancos da campanha e descobertas de fusao.</p>
      </GameCard>
    );
  }

  const currentTier = computeCurrentTier(npcs);
  const unlockedCount = npcs.filter((npc) => npc.unlocked).length;
  const defeatedCount = npcs.filter((npc) => npc.defeated).length;
  const nextUnlock = [...npcs]
    .filter((npc) => !npc.unlocked)
    .sort((left, right) => left.tier - right.tier || left.name.localeCompare(right.name))[0];

  return (
    <GameCard
      title="Progresso"
      subtitle="Microprogressao da jornada"
      rightSlot={<LobbyIcon kind="progress" className="h-4 w-4" />}
    >
      {loading ? (
        <div className="h-[126px] animate-pulse rounded-lg border border-slate-700/70 bg-slate-800/60" />
      ) : (
        <div className="space-y-2 text-xs text-slate-200">
          <p>
            Tier atual: <span className="font-semibold text-amber-100">T{currentTier}</span>
          </p>
          <p className="text-slate-300">
            Nivel: <span className="font-semibold text-cyan-100">{levelProgress?.level ?? player.level}</span>{" "}
            | XP para proximo: {levelProgress?.xpToNextLevel ?? 0}
          </p>
          <p className="text-slate-300">NPCs desbloqueados: {unlockedCount}</p>
          <p className="text-slate-300">NPCs derrotados: {defeatedCount}</p>
          <p className="text-slate-300">Fusoes descobertas: {fusionCount}</p>
          <p className="text-slate-300">
            Conquistas: {achievementsUnlocked}/{availableAchievements}
          </p>
          <p className="text-slate-300">Missoes resgatadas hoje: {dailyMissionCompleted}</p>
          <p className="rounded-lg border border-slate-700/80 bg-slate-900/65 p-2 text-[11px] text-slate-300">
            {nextUnlock
              ? `Proximo unlock: ${nextUnlock.name} (${getUnlockRequirementLabel(nextUnlock)})`
              : "Todos os NPCs estao desbloqueados."}
          </p>
        </div>
      )}
    </GameCard>
  );
}
