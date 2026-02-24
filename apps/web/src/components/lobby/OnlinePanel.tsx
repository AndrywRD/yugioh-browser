import { GameCard } from "./GameCard";
import { LobbyIcon } from "./LobbyIcon";

interface OnlinePanelProps {
  playerLogged: boolean;
  loading: boolean;
  creatingRoom: boolean;
  lastRoomCode?: string | null;
  onCreateRoom: () => void;
  onOpenJoinModal: () => void;
  onCopyCode?: () => void;
}

export function OnlinePanel({
  playerLogged,
  loading,
  creatingRoom,
  lastRoomCode,
  onCreateRoom,
  onOpenJoinModal,
  onCopyCode
}: OnlinePanelProps) {
  if (!playerLogged) {
    return (
      <GameCard title="Duelar Online" subtitle="Entre na conta para acessar salas PvP.">
        <p className="text-sm text-slate-300">As salas online ficam disponiveis apos login.</p>
      </GameCard>
    );
  }

  return (
    <div className="grid gap-3">
      <GameCard title="Duelar Online" subtitle="Crie uma sala ou entre por codigo.">
        <div className="grid gap-2 sm:grid-cols-2">
          <button
            type="button"
            onClick={onCreateRoom}
            disabled={loading || creatingRoom}
            className="lobby-pressable rounded-lg border border-amber-300/80 bg-[linear-gradient(180deg,rgba(174,118,28,0.96),rgba(118,78,18,0.98))] px-3 py-2 text-sm font-semibold text-amber-50 shadow-[inset_0_1px_0_rgba(255,234,187,0.3)] transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <span className="inline-flex items-center gap-2">
              <LobbyIcon kind="online" />
              {creatingRoom ? "Abrindo..." : "Criar Sala"}
            </span>
          </button>
          <button
            type="button"
            onClick={onOpenJoinModal}
            disabled={loading || creatingRoom}
            className="lobby-pressable fm-button rounded-lg px-3 py-2 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-50"
          >
            Entrar com Codigo
          </button>
        </div>
      </GameCard>

      <GameCard title="Status da Sala" subtitle="Fluxo rapido para PvP">
        {lastRoomCode ? (
          <div className="rounded-lg border border-cyan-300/40 bg-slate-900/70 p-3">
            <p className="text-xs text-slate-300">Ultima sala criada:</p>
            <p className="mt-1 text-lg font-bold tracking-[0.18em] text-cyan-100">{lastRoomCode}</p>
            <div className="mt-2 flex items-center gap-2 text-xs">
              <span className="rounded bg-slate-800 px-2 py-1 text-slate-200">Players: aguardando 2/2</span>
              {onCopyCode ? (
                <button type="button" onClick={onCopyCode} className="fm-button rounded-md px-2 py-1 text-xs font-semibold">
                  Copiar
                </button>
              ) : null}
            </div>
          </div>
        ) : (
          <p className="rounded-lg border border-slate-700/75 bg-slate-900/65 p-3 text-sm text-slate-300">
            Crie uma sala para gerar codigo ou entre com um codigo existente.
          </p>
        )}
      </GameCard>
    </div>
  );
}
