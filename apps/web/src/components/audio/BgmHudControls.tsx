"use client";

import { useEffect, useMemo, useState } from "react";
import { bgmManager, loadBgmVolume, saveBgmVolume } from "../../lib/bgm";

const STEP = 0.05;

function clampVolume(value: number): number {
  return Math.max(0, Math.min(1, value));
}

function toPercent(value: number): number {
  return Math.round(clampVolume(value) * 100);
}

export function BgmHudControls() {
  const [volume, setVolume] = useState<number>(() => loadBgmVolume());

  const canDecrease = volume > 0;
  const canIncrease = volume < 1;
  const percent = useMemo(() => toPercent(volume), [volume]);

  const commitVolume = (next: number) => {
    const normalized = saveBgmVolume(clampVolume(next));
    bgmManager.setVolume(normalized);
    setVolume(normalized);
  };

  useEffect(() => {
    const onVolumeChanged = (event: Event) => {
      const custom = event as CustomEvent<number>;
      if (typeof custom.detail === "number") {
        setVolume(clampVolume(custom.detail));
      }
    };
    window.addEventListener("bgm:volume-changed", onVolumeChanged as EventListener);
    return () => window.removeEventListener("bgm:volume-changed", onVolumeChanged as EventListener);
  }, []);

  return (
    <div className="pointer-events-auto fixed bottom-3 right-3 z-[140] flex items-center gap-2 rounded-xl border border-amber-300/50 bg-slate-950/82 px-2 py-1.5 shadow-[0_10px_24px_rgba(0,0,0,0.45)] backdrop-blur-[2px]">
      <span className="text-[10px] font-semibold uppercase tracking-[0.12em] text-amber-100">BGM</span>
      <button
        type="button"
        onClick={() => commitVolume(volume - STEP)}
        disabled={!canDecrease}
        className="fm-button rounded-md px-2 py-0.5 text-xs font-semibold disabled:cursor-not-allowed disabled:opacity-40"
        aria-label="Diminuir volume"
      >
        -
      </button>
      <span className="w-10 text-center text-xs font-semibold text-slate-100">{percent}%</span>
      <button
        type="button"
        onClick={() => commitVolume(volume + STEP)}
        disabled={!canIncrease}
        className="fm-button rounded-md px-2 py-0.5 text-xs font-semibold disabled:cursor-not-allowed disabled:opacity-40"
        aria-label="Aumentar volume"
      >
        +
      </button>
    </div>
  );
}

