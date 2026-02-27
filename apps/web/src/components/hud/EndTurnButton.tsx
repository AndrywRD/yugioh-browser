"use client";

interface EndTurnButtonProps {
  enabled: boolean;
  onEndTurn: () => void;
  label?: string;
  shortcutHint?: string;
  className?: string;
}

function cx(...classes: Array<string | false | undefined>) {
  return classes.filter(Boolean).join(" ");
}

export function EndTurnButton({ enabled, onEndTurn, label = "End Turn", shortcutHint, className }: EndTurnButtonProps) {
  return (
    <div className={cx("pointer-events-auto absolute z-tooltip", className || "bottom-4 right-4")}>
      <div className="group relative">
        <button
          type="button"
          onClick={onEndTurn}
          disabled={!enabled}
          title={enabled ? `Encerrar turno${shortcutHint ? ` [${shortcutHint}]` : ""}` : "Aguarde o oponente"}
          data-shortcut={shortcutHint}
          className={cx(
            "fm-button rounded-lg px-3 py-1.5 text-xs font-semibold uppercase tracking-wide",
            !enabled && "cursor-not-allowed opacity-50 saturate-50"
          )}
        >
          <span>{label}</span>
          {shortcutHint ? <span className="ml-1 text-[10px] text-amber-100/90">[{shortcutHint}]</span> : null}
        </button>
        {!enabled && (
          <span className="pointer-events-none absolute -top-8 right-0 hidden whitespace-nowrap rounded-md border border-slate-500/80 bg-slate-950/95 px-2 py-1 text-[11px] text-slate-200 shadow group-hover:block">
            Aguarde o oponente
          </span>
        )}
      </div>
    </div>
  );
}
