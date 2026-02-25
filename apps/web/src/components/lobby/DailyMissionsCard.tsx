import { useMemo, useState } from "react";
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

function MissionRow({ mission, claimingMissionKey, onClaim }: { mission: DailyMission; claimingMissionKey: string | null; onClaim: (missionKey: string) => void }) {
  const completed = mission.progress >= mission.target;
  const pct = progressPct(mission);

  return (
    <div className="rounded-lg border border-slate-700/75 bg-slate-900/60 p-2.5">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="truncate text-xs font-semibold uppercase tracking-[0.08em] text-amber-100">{mission.title}</p>
          <p className="line-clamp-1 text-[11px] text-slate-300">{mission.description}</p>
        </div>
        <span className="rounded border border-slate-600/80 bg-slate-800/70 px-2 py-0.5 text-[10px] text-slate-200">{mission.category}</span>
      </div>

      <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-slate-800">
        <div
          className={`h-full rounded-full transition-all ${mission.claimed ? "bg-emerald-400/70" : completed ? "bg-cyan-400/70" : "bg-amber-300/70"}`}
          style={{ width: `${mission.claimed ? 100 : pct}%` }}
        />
      </div>

      <div className="mt-2 flex items-center justify-between gap-2">
        <p className="text-[11px] text-slate-300">
          {mission.claimed ? "Resgatada" : `${Math.min(mission.progress, mission.target)}/${mission.target}`} | +{mission.rewardGold}g | +{mission.rewardXp} XP
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
}

export function DailyMissionsCard({ loading, playerLogged, missions, claimingMissionKey, onClaim }: DailyMissionsCardProps) {
  const [showAll, setShowAll] = useState(false);
  const preview = useMemo(() => missions.slice(0, 3), [missions]);

  if (!playerLogged) {
    return (
      <GameCard title="Missoes Diarias">
        <p className="text-sm text-slate-300">Entre na conta para liberar recompensas diarias.</p>
      </GameCard>
    );
  }

  return (
    <>
      <GameCard
        title="Missoes Diarias"
        subtitle="Top 3 missoes do dia."
        rightSlot={
          missions.length > 3 ? (
            <button type="button" onClick={() => setShowAll(true)} className="fm-link text-xs font-semibold">
              Ver todas
            </button>
          ) : null
        }
      >
        {loading ? (
          <div className="grid gap-2">
            {Array.from({ length: 3 }).map((_, index) => (
              <div key={`mission-skeleton-${index}`} className="h-16 animate-pulse rounded-lg border border-slate-700/80 bg-slate-800/60" />
            ))}
          </div>
        ) : preview.length === 0 ? (
          <p className="rounded-lg border border-slate-700/80 bg-slate-900/60 p-3 text-sm text-slate-300">Nenhuma missao ativa para hoje.</p>
        ) : (
          <div className="grid gap-2">
            {preview.map((mission) => (
              <MissionRow key={mission.key} mission={mission} claimingMissionKey={claimingMissionKey} onClaim={onClaim} />
            ))}
          </div>
        )}
      </GameCard>

      {showAll ? (
        <div className="fixed inset-0 z-modal flex items-center justify-center bg-black/60 p-4" onClick={() => setShowAll(false)}>
          <div
            className="w-full max-w-3xl rounded-xl border border-[#d0aa63]/65 bg-[linear-gradient(180deg,rgba(8,19,42,0.96),rgba(5,13,30,0.98))] p-4 shadow-[0_20px_40px_rgba(0,0,0,0.45)]"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="mb-3 flex items-center justify-between">
              <h3 className="fm-title text-sm font-bold tracking-[0.12em]">Missoes do dia</h3>
              <button type="button" onClick={() => setShowAll(false)} className="fm-button rounded-md px-2.5 py-1 text-xs font-semibold">
                Fechar
              </button>
            </div>
            <div className="fm-scroll max-h-[64vh] space-y-2 overflow-y-auto pr-1">
              {missions.map((mission) => (
                <MissionRow key={`all-${mission.key}`} mission={mission} claimingMissionKey={claimingMissionKey} onClaim={onClaim} />
              ))}
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
