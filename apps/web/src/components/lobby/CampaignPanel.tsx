import type { PveNpc } from "../../lib/api";
import { CampaignMap } from "./CampaignMap";
import { GameCard } from "./GameCard";
import { LobbyIcon } from "./LobbyIcon";
import { NpcListPreview } from "./NpcListPreview";

interface CampaignPanelProps {
  loading: boolean;
  playerLogged: boolean;
  npcs: PveNpc[];
  busyNpcId: string | null;
  onStartNpcDuel: (npcId: string) => void;
  onOpenMap: () => void;
}

export function CampaignPanel({ loading, playerLogged, npcs, busyNpcId, onStartNpcDuel, onOpenMap }: CampaignPanelProps) {
  if (!playerLogged) {
    return (
      <GameCard title="Campanha" subtitle="Entre para desbloquear os desafios PvE.">
        <p className="text-sm text-slate-200/90">Conecte sua conta para iniciar progressao e receber drops dos NPCs.</p>
      </GameCard>
    );
  }

  return (
    <div className="grid gap-3">
      <GameCard
        title="Proximos Desafios"
        subtitle="Selecao rapida dos proximos duelos recomendados."
        rightSlot={
          <button type="button" onClick={onOpenMap} className="fm-link inline-flex items-center gap-1 text-xs font-semibold">
            <LobbyIcon kind="map" className="h-3.5 w-3.5" />
            Ver todos
          </button>
        }
      >
        <NpcListPreview loading={loading} npcs={npcs} busyNpcId={busyNpcId} onDuel={onStartNpcDuel} />
      </GameCard>

      <GameCard title="Mapa da Campanha" subtitle="Visual de tiers e rotas (placeholder)">
        <CampaignMap loading={loading} npcs={npcs} busyNpcId={busyNpcId} onDuel={onStartNpcDuel} />
        <div className="mt-2 flex justify-end">
          <button
            type="button"
            onClick={onOpenMap}
            className="rounded-md border border-amber-200/70 bg-slate-900/70 px-3 py-1 text-xs font-semibold text-amber-100 transition hover:bg-slate-800/75"
          >
            Abrir mapa completo
          </button>
        </div>
      </GameCard>
    </div>
  );
}
