import type { LevelProgress, PlayerProfile } from "../../lib/api";
import { LobbyIcon } from "./LobbyIcon";

interface LobbyHeaderProps {
  player: PlayerProfile | null;
  levelProgress: LevelProgress | null;
  loading: boolean;
  onAuthAction: () => void;
}

export function LobbyHeader({
  player,
  levelProgress: _levelProgress,
  loading,
  onAuthAction
}: LobbyHeaderProps) {
  return (
    <header className="relative overflow-hidden px-2 py-2">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_22%_50%,rgba(108,161,255,0.15),transparent_52%)]" />
      <div className="relative z-[1] grid gap-4 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-start">
        <div className="space-y-1">
          <h1 className="fm-title text-[clamp(28px,3.6vw,52px)] font-bold">Yu-Gi-Oh! Subita</h1>
          {!player && !loading ? <p className="text-xs text-slate-300">Conta nao autenticada.</p> : null}
        </div>

        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-1">
          {!player && (
            <button
              type="button"
              onClick={onAuthAction}
              className="lobby-pressable inline-flex items-center justify-center gap-2 rounded-lg border border-amber-300/80 bg-[linear-gradient(180deg,rgba(176,118,30,0.95),rgba(125,82,18,0.98))] px-4 py-2.5 text-sm font-semibold text-amber-50 shadow-[inset_0_1px_0_rgba(255,228,175,0.35),0_8px_16px_rgba(0,0,0,0.25)] transition hover:-translate-y-0.5 hover:brightness-110 active:translate-y-0"
            >
              <LobbyIcon kind="profile" />
              Entrar para Jogar
            </button>
          )}
        </div>
      </div>
    </header>
  );
}
