"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";

interface EndScreenProps {
  visible: boolean;
  won: boolean;
  onLeave: () => void;
  onDismiss: () => void;
}

function cx(...classes: Array<string | false | undefined>) {
  return classes.filter(Boolean).join(" ");
}

export function EndScreen({ visible, won, onLeave, onDismiss }: EndScreenProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    return () => setMounted(false);
  }, []);

  if (!visible || !mounted) return null;

  return createPortal(
    <div className="fixed inset-0 z-modal flex items-center justify-center bg-black/80 backdrop-blur-[3px]">
      <div className="w-[430px] max-w-[90vw] rounded-2xl border border-amber-200/55 bg-[linear-gradient(180deg,rgba(6,15,30,0.98),rgba(3,8,18,0.99))] px-6 py-7 text-center shadow-[0_26px_58px_rgba(0,0,0,0.74)]">
        <h2
          className={cx(
            "text-4xl font-black uppercase tracking-[0.16em]",
            won ? "text-amber-200 drop-shadow-[0_0_14px_rgba(251,191,36,0.4)]" : "text-rose-300 drop-shadow-[0_0_14px_rgba(251,113,133,0.35)]"
          )}
        >
          {won ? "Victory" : "Defeat"}
        </h2>
        <p className="mt-2 text-sm font-medium text-slate-100 [text-shadow:0_1px_2px_rgba(0,0,0,0.92)]">
          {won ? "Duelo vencido." : "Voce foi derrotado."}
        </p>

        <div className="mt-6 flex justify-center gap-3">
          <button
            type="button"
            onClick={onLeave}
            className="rounded-lg border border-amber-300/60 bg-amber-700/85 px-4 py-2 text-sm font-semibold text-amber-100 hover:bg-amber-600"
          >
            Voltar ao Lobby
          </button>
          <button
            type="button"
            onClick={onDismiss}
            className="rounded-lg border border-slate-500/70 bg-slate-800 px-4 py-2 text-sm font-semibold text-slate-100 hover:bg-slate-700"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
