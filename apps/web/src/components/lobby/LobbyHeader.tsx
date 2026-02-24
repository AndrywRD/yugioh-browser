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

function StatChip({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="fm-chip inline-flex items-center gap-1 rounded-md border px-2 py-1 text-[11px]">
      <span className="text-slate-300">{label}</span>
      <span className="font-semibold text-slate-100">{value}</span>
    </div>
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
    <header className="relative overflow-hidden rounded-2xl border border-[#d2ae68]/50 bg-[linear-gradient(120deg,rgba(5,14,34,0.94),rgba(4,11,26,0.88))] px-6 py-5 shadow-[inset_0_1px_0_rgba(255,225,164,0.18),0_18px_30px_rgba(0,0,0,0.35)]">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_25%_50%,rgba(108,161,255,0.2),transparent_44%)]" />
      <div className="relative z-[1] grid gap-4 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end">
        <div>
          <p className="text-[11px] uppercase tracking-[0.24em] text-cyan-200/85">Lobby Arcano</p>
          <h1 className="fm-title mt-1 text-[clamp(26px,3.3vw,46px)] font-bold">Ruptura Arcana</h1>
          <p className="fm-subtitle mt-2 max-w-2xl text-sm text-slate-200/95">
            Fusoes imprevisiveis. Duelo arcano. Monte seu deck, avance na campanha e desafie duelistas online.
          </p>

          <div className="mt-4 flex flex-wrap gap-2">
            {loading ? (
              <StatChip label="Status" value="Carregando..." />
            ) : player ? (
              <>
                <StatChip label="Duelista" value={player.username} />
                <StatChip label="Gold" value={player.gold} />
                <StatChip label="Wins PVE" value={player.winsPve} />
                <StatChip label="Wins PVP" value={player.winsPvp} />
              </>
            ) : (
              <StatChip label="Conta" value="Nao autenticada" />
            )}
          </div>
        </div>

        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-1">
          {player ? (
            <>
              <button
                type="button"
                onClick={onPrimaryAction}
                className="lobby-pressable inline-flex items-center justify-center gap-2 rounded-lg border border-amber-300/80 bg-[linear-gradient(180deg,rgba(176,118,30,0.95),rgba(125,82,18,0.98))] px-4 py-2.5 text-sm font-semibold text-amber-50 shadow-[inset_0_1px_0_rgba(255,228,175,0.35),0_8px_16px_rgba(0,0,0,0.25)] transition hover:-translate-y-0.5 hover:brightness-110 active:translate-y-0 active:scale-[0.99]"
              >
                <LobbyIcon kind="campaign" />
                {hasCampaignProgress ? "Continuar Campanha" : "Iniciar Campanha"}
              </button>
              <button
                type="button"
                onClick={onSecondaryAction}
                className="lobby-pressable inline-flex items-center justify-center gap-2 rounded-lg border border-amber-200/70 bg-[linear-gradient(180deg,rgba(16,39,78,0.96),rgba(9,24,52,0.95))] px-4 py-2.5 text-sm font-semibold text-slate-100 shadow-[inset_0_1px_0_rgba(255,225,170,0.2),0_8px_16px_rgba(0,0,0,0.24)] transition hover:-translate-y-0.5 hover:border-amber-100 active:translate-y-0 active:scale-[0.99]"
              >
                <LobbyIcon kind="online" />
                Duelar Online
              </button>
            </>
          ) : (
            <button
              type="button"
              onClick={onAuthAction}
              className="lobby-pressable inline-flex items-center justify-center gap-2 rounded-lg border border-amber-300/80 bg-[linear-gradient(180deg,rgba(176,118,30,0.95),rgba(125,82,18,0.98))] px-4 py-2.5 text-sm font-semibold text-amber-50 shadow-[inset_0_1px_0_rgba(255,228,175,0.35),0_8px_16px_rgba(0,0,0,0.25)] transition hover:-translate-y-0.5 hover:brightness-110 active:translate-y-0 active:scale-[0.99]"
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
