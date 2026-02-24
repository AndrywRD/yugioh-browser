import type { DailyMission } from "../../lib/api";
import { GameCard } from "./GameCard";

interface DailyMissionsCardProps {
  loading: boolean;
  playerLogged: boolean;
  missions: DailyMission[];
  claimingMissionKey: string | null;
  onClaim: (missionKey: string) => void;
}

function progressPct(mission: DailyMission): number {
  if (mission.target <= 0) return 0;
  return Math.min(100, Math.round((mission.progress / mission.target) * 100));
}

export function DailyMissionsCard({ loading, playerLogged, missions, claimingMissionKey, onClaim }: DailyMissionsCardProps) {
  if (!playerLogged) {
    return (
      <GameCard title="Missoes Diarias" subtitle="Entre na conta para liberar recompensas diarias.">
        <p className="text-sm text-slate-300">As missões reiniciam todos os dias no UTC 00:00.</p>
      </GameCard>
    );
  }

  return (
    <GameCard title="Missoes Diarias" subtitle="Conclua objetivos e resgate XP + gold.">
      {loading ? (
        <div className="grid gap-2">
          {Array.from({ length: 3 }).map((_, index) => (
            <div key={`mission-skeleton-${index}`} className="h-16 animate-pulse rounded-lg border border-slate-700/80 bg-slate-800/60" />
          ))}
        </div>
      ) : missions.length === 0 ? (
        <p className="rounded-lg border border-slate-700/80 bg-slate-900/60 p-3 text-sm text-slate-300">Nenhuma missão ativa para hoje.</p>
      ) : (
        <div className="grid gap-2">
          {missions.map((mission) => {
            const completed = mission.progress >= mission.target;
            const pct = progressPct(mission);
            return (
              <div key={mission.key} className="rounded-lg border border-slate-700/80 bg-slate-900/65 p-2.5">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.08em] text-amber-100">{mission.title}</p>
                    <p className="text-[11px] text-slate-300">{mission.description}</p>
                  </div>
                  <span className="rounded border border-slate-600/80 bg-slate-800/70 px-2 py-0.5 text-[10px] text-slate-200">
                    {mission.category}
                  </span>
                </div>

                <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-slate-800">
                  <div
                    className={`h-full rounded-full transition-all ${mission.claimed ? "bg-emerald-400/70" : completed ? "bg-cyan-400/70" : "bg-amber-300/70"}`}
                    style={{ width: `${mission.claimed ? 100 : pct}%` }}
                  />
                </div>

                <div className="mt-2 flex items-center justify-between gap-2">
                  <p className="text-[11px] text-slate-300">
                    {mission.claimed ? "Resgatada" : `${Math.min(mission.progress, mission.target)}/${mission.target}`} | +{mission.rewardGold} gold | +{mission.rewardXp} XP
                  </p>
                  <button
                    type="button"
                    disabled={mission.claimed || !completed || claimingMissionKey === mission.key}
                    onClick={() => onClaim(mission.key)}
                    className="fm-button rounded-md px-2 py-1 text-[11px] font-semibold disabled:cursor-not-allowed disabled:opacity-45"
                  >
                    {mission.claimed ? "OK" : claimingMissionKey === mission.key ? "Resgatando..." : "Resgatar"}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </GameCard>
  );
}

