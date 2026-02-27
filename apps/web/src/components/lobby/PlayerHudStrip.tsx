import type { LevelProgress, PlayerProfile } from "../../lib/api";

interface PlayerHudStripProps {
  player: PlayerProfile;
  levelProgress: LevelProgress | null;
}

function progressPercent(levelProgress: LevelProgress | null): number {
  if (!levelProgress) return 0;
  const currentXp = Math.max(0, levelProgress.xpInLevel);
  const levelTotal = Math.max(1, levelProgress.xpInLevel + levelProgress.xpToNextLevel);
  return Math.max(0, Math.min(100, Math.round((currentXp / levelTotal) * 100)));
}

function Badge({ label }: { label: string }) {
  return <span className="rounded border border-slate-500/60 px-1 text-[10px] text-slate-300">{label}</span>;
}

export function PlayerHudStrip({ player, levelProgress }: PlayerHudStripProps) {
  const percent = progressPercent(levelProgress);
  const rank = levelProgress?.level ?? player.level;

  return (
    <section className="rounded-xl border border-amber-300/45 bg-slate-950/55 p-3 shadow-[0_8px_20px_rgba(0,0,0,0.28)]">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-slate-100">
        <span className="inline-flex items-center gap-1 rounded-md border border-slate-600/70 bg-slate-900/60 px-2 py-1">
          <Badge label="PLY" /> Jogador: {player.username}
        </span>
        <span className="inline-flex items-center gap-1 rounded-md border border-slate-600/70 bg-slate-900/60 px-2 py-1">
          <Badge label="PVE" /> PvE: {player.winsPve}
        </span>
        <span className="inline-flex items-center gap-1 rounded-md border border-slate-600/70 bg-slate-900/60 px-2 py-1">
          <Badge label="PVP" /> PvP: {player.winsPvp}
        </span>
      </div>

      <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-slate-100">
        <span className="inline-flex items-center gap-1 rounded-md border border-slate-600/70 bg-slate-900/60 px-2 py-1">
          <Badge label="GLD" /> Gold: {player.gold.toLocaleString("pt-BR")}
        </span>
        <span className="inline-flex items-center gap-1 rounded-md border border-slate-600/70 bg-slate-900/60 px-2 py-1">
          <Badge label="RANK" /> Rank: {rank}
        </span>
        <div className="inline-flex min-w-[220px] items-center gap-2 rounded-md border border-slate-600/70 bg-slate-900/60 px-2 py-1">
          <Badge label="XP" />
          <span className="shrink-0">Progresso: {percent}%</span>
          <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-slate-800/90">
            <div className="h-full rounded-full bg-gradient-to-r from-violet-400 via-fuchsia-400 to-orange-400" style={{ width: `${percent}%` }} />
          </div>
        </div>
      </div>
    </section>
  );
}

