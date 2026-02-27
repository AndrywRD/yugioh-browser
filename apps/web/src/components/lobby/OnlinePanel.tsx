import Link from "next/link";
import { GameCard } from "./GameCard";

interface OnlinePanelProps {
  playerLogged: boolean;
}

export function OnlinePanel({ playerLogged }: OnlinePanelProps) {
  if (!playerLogged) {
    return (
      <GameCard title="Arena PvP" subtitle="Entre na conta para acessar o modo online.">
        <p className="text-sm text-slate-300">As salas online ficam disponiveis apos login.</p>
      </GameCard>
    );
  }

  return (
    <GameCard title="Arena PvP Completa" subtitle="Visual completo com salas e duelistas online.">
      <div className="flex flex-wrap gap-2">
        <Link href="/pvp" className="fm-button rounded-lg px-3 py-2 text-sm font-semibold">
          Abrir Arena PvP
        </Link>
      </div>
    </GameCard>
  );
}
