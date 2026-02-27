"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { bgmManager, loadBgmVolume, saveBgmVolume } from "../../lib/bgm";

const FALLBACK_VOLUME = 0.22;

function clampVolume(value: number): number {
  return Math.max(0, Math.min(1, value));
}

function toPercent(value: number): number {
  return Math.round(clampVolume(value) * 100);
}

export function BgmHudControls() {
  const [volume, setVolume] = useState<number>(FALLBACK_VOLUME);
  const previousVolumeRef = useRef<number>(0.5);
  const percent = useMemo(() => toPercent(volume), [volume]);

  const commitVolume = (next: number) => {
    const normalized = saveBgmVolume(clampVolume(next));
    bgmManager.setVolume(normalized);
    setVolume(normalized);
    if (normalized > 0) {
      previousVolumeRef.current = normalized;
    }
  };

  const handleToggleMute = () => {
    if (volume > 0) {
      commitVolume(0);
      return;
    }
    commitVolume(previousVolumeRef.current || 0.5);
  };

  const handleSliderChange = (value: number) => {
    commitVolume(value / 100);
  };

  useEffect(() => {
    const initial = clampVolume(loadBgmVolume());
    setVolume(initial);
    bgmManager.setVolume(initial);
    if (initial > 0) {
      previousVolumeRef.current = initial;
    }

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
    <div className="pointer-events-auto fixed right-2 top-2 z-[140] min-w-[188px] rounded-xl border border-amber-300/50 bg-slate-950/85 px-2.5 py-2 shadow-[0_10px_24px_rgba(0,0,0,0.45)] backdrop-blur-[2px] sm:right-3 sm:top-auto sm:bottom-3 sm:min-w-[212px] sm:px-3 sm:py-2.5">
      <div className="flex items-center justify-between gap-2">
        <button
          type="button"
          onClick={handleToggleMute}
          className="rounded border border-slate-500/60 bg-slate-900/70 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.1em] text-slate-200 hover:border-amber-200/70"
          aria-label="Alternar mute da BGM"
          title="Clique para mutar ou ligar a musica"
        >
          {volume > 0 ? "ON" : "MUTE"}
        </button>
        <span className="text-[10px] font-semibold uppercase tracking-[0.12em] text-amber-100">BGM</span>
        <span className="text-[10px] font-semibold uppercase tracking-[0.1em] text-slate-100">{percent}%</span>
      </div>

      <div className="mt-2">
        <input
          type="range"
          min={0}
          max={100}
          step={1}
          value={percent}
          onChange={(event) => handleSliderChange(Number(event.target.value))}
          className="w-full accent-amber-300"
          aria-label="Volume da BGM"
        />
        <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-slate-800/90">
          <div className="h-full rounded-full bg-gradient-to-r from-violet-400 via-fuchsia-400 to-orange-400 transition-[width] duration-150" style={{ width: `${percent}%` }} />
        </div>
      </div>
    </div>
  );
}
