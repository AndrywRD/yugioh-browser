import Link from "next/link";
import type { Deck } from "@ruptura-arcana/shared";
import type { DeckListResponse, PlayerProfile } from "../../lib/api";
import { GameCard } from "./GameCard";

interface ProfilePanelProps {
  player: PlayerProfile | null;
  loading: boolean;
  decks: DeckListResponse;
  activeDeck: Deck | null;
  activeDeckTotal: number;
  onSetActiveDeck: (deckId: string) => void;
  onLogout: () => void;
}

function StatChip({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-lg border border-slate-700/75 bg-slate-900/65 px-3 py-2">
      <p className="text-[11px] uppercase tracking-[0.12em] text-slate-400">{label}</p>
      <p className="mt-1 text-sm font-semibold text-slate-100">{value}</p>
    </div>
  );
}

export function ProfilePanel({ player, loading, decks, activeDeck, activeDeckTotal, onSetActiveDeck, onLogout }: ProfilePanelProps) {
  if (!player) {
    return (
      <GameCard title="Perfil" subtitle="Acesso restrito para contas autenticadas.">
        <p className="text-sm text-slate-300">Entre com login para configurar seu duelista.</p>
      </GameCard>
    );
  }

  return (
    <div className="grid gap-3">
      <GameCard title="Perfil do Duelista" subtitle="Informacoes da conta">
        {loading ? (
          <div className="h-[200px] animate-pulse rounded-lg border border-slate-700/70 bg-slate-800/60" />
        ) : (
          <div className="space-y-3">
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
              <StatChip label="Duelista" value={player.username} />
              <StatChip label="Gold" value={player.gold} />
              <StatChip label="Wins PVE" value={player.winsPve} />
              <StatChip label="Wins PVP" value={player.winsPvp} />
            </div>

            <div className="rounded-lg border border-slate-700/75 bg-slate-900/65 p-3">
              <label className="text-[11px] uppercase tracking-[0.12em] text-slate-400">Deck ativo</label>
              <select
                value={decks.activeDeckId ?? ""}
                onChange={(event) => onSetActiveDeck(event.target.value)}
                className="mt-2 w-full rounded-lg border border-slate-700/90 bg-slate-900/80 px-3 py-2 text-sm text-slate-100 outline-none transition focus:border-cyan-300/60"
              >
                {decks.decks.map((deck) => (
                  <option key={deck.id} value={deck.id}>
                    {deck.name}
                  </option>
                ))}
              </select>
              <p className="mt-2 text-xs text-slate-300">{activeDeck ? `${activeDeck.name} | ${activeDeckTotal}/40 cartas` : "Sem deck ativo"}</p>
            </div>
          </div>
        )}
      </GameCard>

      <GameCard title="Acoes de Conta" subtitle="Gerencie seu perfil e configuracoes">
        <div className="grid gap-2 sm:grid-cols-3">
          <Link href="/profile" className="fm-button rounded-lg px-3 py-2 text-center text-sm font-semibold">
            Editar Perfil
          </Link>
          <Link href="/deck-builder" className="fm-button rounded-lg px-3 py-2 text-center text-sm font-semibold">
            Abrir Deck Builder
          </Link>
          <button type="button" onClick={onLogout} className="fm-button rounded-lg px-3 py-2 text-sm font-semibold">
            Sair
          </button>
        </div>
      </GameCard>
    </div>
  );
}
