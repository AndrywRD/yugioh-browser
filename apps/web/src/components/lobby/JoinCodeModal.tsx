import { useEffect } from "react";

interface JoinCodeModalProps {
  open: boolean;
  code: string;
  busy?: boolean;
  error?: string;
  onCodeChange: (code: string) => void;
  onClose: () => void;
  onSubmit: () => void;
}

export function JoinCodeModal({ open, code, busy = false, error, onCodeChange, onClose, onSubmit }: JoinCodeModalProps) {
  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onClose, open]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-modal flex items-center justify-center bg-black/60 p-4">
      <div className="w-full max-w-md rounded-xl border border-[#d0aa63]/65 bg-[linear-gradient(180deg,rgba(8,19,42,0.96),rgba(5,13,30,0.98))] p-4 shadow-[0_20px_40px_rgba(0,0,0,0.45)]">
        <h3 className="fm-title text-sm font-bold tracking-[0.12em]">Entrar com Codigo</h3>
        <p className="mt-1 text-xs text-slate-300">Digite o codigo da sala para entrar direto no duelo online.</p>

        <input
          autoFocus
          value={code}
          onChange={(event) => onCodeChange(event.target.value.toUpperCase())}
          placeholder="Ex: A1B2"
          maxLength={8}
          className="mt-3 w-full rounded-lg border border-slate-700/85 bg-slate-900/80 px-3 py-2 text-sm text-slate-100 outline-none transition focus:border-cyan-300/60"
        />

        {error ? <p className="mt-2 text-xs text-rose-300">{error}</p> : null}

        <div className="mt-4 flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="fm-button rounded-lg px-3 py-1.5 text-xs font-semibold"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={onSubmit}
            disabled={busy}
            className="rounded-lg border border-amber-300/80 bg-[linear-gradient(180deg,rgba(174,118,28,0.96),rgba(118,78,18,0.98))] px-3 py-1.5 text-xs font-semibold text-amber-50 shadow-[inset_0_1px_0_rgba(255,234,187,0.3)] transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {busy ? "Conectando..." : "Entrar"}
          </button>
        </div>
      </div>
    </div>
  );
}
