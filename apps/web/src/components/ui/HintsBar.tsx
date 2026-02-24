interface HintsBarProps {
  yourTurn: boolean;
  phase: string;
  turnNumber: number;
  mainActionUsed?: boolean;
  waitingPrompt?: boolean;
}

export function HintsBar({ yourTurn, phase, turnNumber, mainActionUsed = false, waitingPrompt = false }: HintsBarProps) {
  return (
    <div className="fm-panel flex items-center justify-between gap-3 px-3 py-2">
      <div>
        <p className="fm-subtitle text-xs">Turno {turnNumber} - Fase {phase}</p>
        <div className="mt-1 flex flex-wrap items-center gap-1.5 text-[10px]">
          <span className={`rounded border px-2 py-0.5 ${mainActionUsed ? "border-amber-300/70 bg-amber-900/40 text-amber-100" : "border-slate-500/60 bg-slate-900/60 text-slate-200"}`}>
            Acao principal: {mainActionUsed ? "usada" : "livre"}
          </span>
          {waitingPrompt ? (
            <span className="rounded border border-violet-300/70 bg-violet-900/50 px-2 py-0.5 text-violet-100">
              Aguardando resposta de combate
            </span>
          ) : null}
        </div>
      </div>
      <span
        className={`inline-flex rounded-full border px-3 py-1 text-xs font-semibold ${
          yourTurn
            ? "border-emerald-300/50 bg-emerald-900/50 text-emerald-100"
            : "border-slate-400/50 bg-slate-800/75 text-slate-200"
        }`}
      >
        {yourTurn ? "Sua vez" : "Vez do oponente"}
      </span>
    </div>
  );
}
