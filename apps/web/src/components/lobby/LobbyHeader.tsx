import type { PlayerProfile } from "../../lib/api";
import { LobbyIcon } from "./LobbyIcon";

interface LobbyHeaderProps {
  player: PlayerProfile | null;
  loading: boolean;
  hasCampaignProgress: boolean;
  onPrimaryAction: () => void;
  onSecondaryAction: () => void;
  onAuthAction: () => void;
}

function HeaderChip({ label, value }: { label: string; value: string | number }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-md border border-slate-600/80 bg-slate-900/70 px-2 py-1 text-[11px] text-slate-200">
      <span className="text-slate-400">{label}</span>
      <span className="font-semibold text-slate-100">{value}</span>
    </span>
  );
}

export function LobbyHeader({
  player,
  loading,
  hasCampaignProgress,
  onPrimaryAction,
  onSecondaryAction,
  onAuthAction
}: LobbyHeaderProps) {
  return (
    <header className="relative overflow-hidden rounded-2xl border border-[#d2ae68]/45 bg-[linear-gradient(120deg,rgba(5,13,33,0.9),rgba(4,10,24,0.84))] px-6 py-5 shadow-[inset_0_1px_0_rgba(255,225,164,0.18),0_16px_30px_rgba(0,0,0,0.34)]">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_22%_50%,rgba(108,161,255,0.19),transparent_48%)]" />
      <div className="relative z-[1] grid gap-4 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end">
        <div className="space-y-2">
          <h1 className="fm-title text-[clamp(28px,3.6vw,52px)] font-bold">YU GI OH SUBITA</h1>
          <p className="fm-subtitle max-w-3xl text-sm text-slate-200/95">Fusoes imprevisiveis, duelos intensos e progressao constante entre campanha e PvP.</p>
          {player ? (
            <div className="flex flex-wrap gap-1.5 pt-1">
              <HeaderChip label="Gold" value={player.gold} />
              <HeaderChip label="Rank" value={player.level} />
              <HeaderChip label="Wins PvE" value={player.winsPve} />
              <HeaderChip label="Wins PvP" value={player.winsPvp} />
            </div>
          ) : !loading ? (
            <p className="text-xs text-slate-300">Conta nao autenticada.</p>
          ) : null}
        </div>

        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-1">
          {player ? (
            <>
              <button
                type="button"
                onClick={onPrimaryAction}
                className="lobby-pressable inline-flex items-center justify-center gap-2 rounded-lg border border-amber-300/80 bg-[linear-gradient(180deg,rgba(176,118,30,0.95),rgba(125,82,18,0.98))] px-4 py-2.5 text-sm font-semibold text-amber-50 shadow-[inset_0_1px_0_rgba(255,228,175,0.35),0_8px_16px_rgba(0,0,0,0.25)] transition hover:-translate-y-0.5 hover:brightness-110 active:translate-y-0"
              >
                <LobbyIcon kind="campaign" />
                {hasCampaignProgress ? "Continuar Campanha" : "Iniciar Campanha"}
              </button>
              <button
                type="button"
                onClick={onSecondaryAction}
                className="lobby-pressable inline-flex items-center justify-center gap-2 rounded-lg border border-amber-200/70 bg-[linear-gradient(180deg,rgba(16,39,78,0.96),rgba(9,24,52,0.95))] px-4 py-2.5 text-sm font-semibold text-slate-100 shadow-[inset_0_1px_0_rgba(255,225,170,0.2),0_8px_16px_rgba(0,0,0,0.24)] transition hover:-translate-y-0.5 hover:border-amber-100 active:translate-y-0"
              >
                <LobbyIcon kind="online" />
                Duelo Online
              </button>
            </>
          ) : (
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
