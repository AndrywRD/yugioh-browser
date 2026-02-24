import type { PveNpc } from "../../lib/api";

interface NpcCardProps {
  npc: PveNpc;
  recommended?: boolean;
  compact?: boolean;
  busy?: boolean;
  onDuel: (npcId: string) => void;
}

function statusLabel(npc: PveNpc): { label: string; className: string } {
  if (!npc.unlocked) {
    return { label: "Bloqueado", className: "border-slate-500/60 bg-slate-800/70 text-slate-300" };
  }
  if (npc.defeated) {
    return { label: "Concluido", className: "border-emerald-400/45 bg-emerald-900/35 text-emerald-200" };
  }
  return { label: "Novo", className: "border-cyan-400/50 bg-cyan-900/35 text-cyan-100" };
}

export function NpcCard({ npc, recommended = false, compact = false, busy = false, onDuel }: NpcCardProps) {
  const status = statusLabel(npc);

  return (
    <article className="lobby-motion-card rounded-lg border border-slate-700/80 bg-slate-900/65 p-3">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-slate-100">
            {npc.name}
            <span className="ml-1 text-[11px] text-cyan-200/90">T{npc.tier}</span>
          </p>
          <div className="mt-1 flex flex-wrap gap-1.5">
            <span className={`rounded px-2 py-0.5 text-[10px] font-semibold ${status.className}`}>{status.label}</span>
            {recommended ? (
              <span className="rounded border border-amber-300/60 bg-amber-700/45 px-2 py-0.5 text-[10px] font-semibold text-amber-100">
                Recomendado
              </span>
            ) : null}
          </div>
        </div>
        {!compact ? (
          <button
            type="button"
            onClick={() => onDuel(npc.id)}
            disabled={!npc.unlocked || busy}
            className="lobby-pressable fm-button shrink-0 rounded-md px-3 py-1 text-xs font-semibold disabled:cursor-not-allowed disabled:opacity-45"
          >
            {busy ? "Conectando..." : "Duelar"}
          </button>
        ) : null}
      </div>

      <div className="mt-2 flex items-center justify-between gap-2 text-xs text-slate-300">
        <span className="inline-flex items-center gap-1 rounded border border-amber-200/35 bg-amber-900/25 px-2 py-0.5 text-amber-100">
          <span aria-hidden>🪙</span>
          {npc.rewardGold} gold
        </span>
        <span className="text-[11px] text-slate-400">{npc.rewardCards.length} drops possiveis</span>
      </div>

      {compact ? (
        <button
          type="button"
          onClick={() => onDuel(npc.id)}
          disabled={!npc.unlocked || busy}
          className="lobby-pressable fm-button mt-2 w-full rounded-md px-3 py-1 text-xs font-semibold disabled:cursor-not-allowed disabled:opacity-45"
        >
          {busy ? "Conectando..." : npc.unlocked ? "Duelar" : "Bloqueado"}
        </button>
      ) : null}
    </article>
  );
}

