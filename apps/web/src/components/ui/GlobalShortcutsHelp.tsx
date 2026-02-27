"use client";

import { useEffect, useRef, useState } from "react";
import { bgmManager, loadBgmVolume, saveBgmVolume } from "../../lib/bgm";

function isTextInputActive(): boolean {
  if (typeof document === "undefined") return false;
  const active = document.activeElement as HTMLElement | null;
  if (!active) return false;
  const tag = active.tagName.toLowerCase();
  return tag === "input" || tag === "textarea" || active.isContentEditable;
}

export function GlobalShortcutsHelp() {
  const [open, setOpen] = useState(false);
  const [volume, setVolume] = useState(() => loadBgmVolume());
  const previousVolumeRef = useRef(Math.max(0.2, loadBgmVolume()));

  useEffect(() => {
    const onVolumeChanged = (event: Event) => {
      const custom = event as CustomEvent<number>;
      if (typeof custom.detail === "number") {
        setVolume(Math.max(0, Math.min(1, custom.detail)));
      }
    };
    window.addEventListener("bgm:volume-changed", onVolumeChanged as EventListener);
    return () => window.removeEventListener("bgm:volume-changed", onVolumeChanged as EventListener);
  }, []);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const lowered = event.key.toLowerCase();
      const questionPressed = event.key === "?" || (event.shiftKey && event.key === "/");

      if (event.key === "F1" || questionPressed) {
        event.preventDefault();
        setOpen((current) => !current);
        return;
      }

      if (event.key === "Escape" && open) {
        event.preventDefault();
        setOpen(false);
        return;
      }

      if (isTextInputActive()) return;

      if (lowered === "m") {
        event.preventDefault();
        if (volume > 0) {
          saveBgmVolume(0);
          bgmManager.setVolume(0);
          return;
        }
        const restored = previousVolumeRef.current || 0.5;
        const next = saveBgmVolume(restored);
        bgmManager.setVolume(next);
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, volume]);

  useEffect(() => {
    if (volume > 0) previousVolumeRef.current = volume;
  }, [volume]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[170] flex items-center justify-center bg-black/70 p-4" onClick={() => setOpen(false)}>
      <div
        className="fm-panel w-full max-w-[520px] rounded-xl border border-amber-300/50 bg-slate-950/95 p-4"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="mb-3 flex items-center justify-between gap-2">
          <h2 className="fm-title text-sm font-semibold text-amber-100">Atalhos de Teclado</h2>
          <button type="button" onClick={() => setOpen(false)} className="fm-button rounded px-2 py-1 text-[11px] font-semibold">
            Fechar (ESC)
          </button>
        </div>

        <div className="grid gap-2 text-xs">
          <div className="rounded border border-slate-700/70 bg-slate-900/70 p-2">
            <p className="mb-1 font-semibold text-slate-100">Globais</p>
            <p className="text-slate-300">M: mutar/desmutar audio</p>
            <p className="text-slate-300">F1 ou ?: abrir/fechar esta ajuda</p>
            <p className="text-slate-300">ESC: fecha modais ativos</p>
          </div>
          <div className="rounded border border-slate-700/70 bg-slate-900/70 p-2">
            <p className="mb-1 font-semibold text-slate-100">Duelo</p>
            <p className="text-slate-300">1-5 selecionam cartas da mao</p>
            <p className="text-slate-300">Espaco: encerrar turno</p>
            <p className="text-slate-300">A: atacar com monstro selecionado</p>
            <p className="text-slate-300">I: preparar invocacao com carta selecionada</p>
            <p className="text-slate-300">Enter: confirmar acao em fluxo</p>
          </div>
        </div>
      </div>
    </div>
  );
}

