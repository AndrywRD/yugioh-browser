import Link from "next/link";
import type { Deck } from "@ruptura-arcana/shared";
import type { DeckListResponse, PlayerProfile } from "../../lib/api";
import { GameCard } from "./GameCard";
import { ProfileChips } from "./ProfileChips";

interface ProfileDeckCardProps {
  loading: boolean;
  player: PlayerProfile | null;
  decks: DeckListResponse;
  activeDeck: Deck | null;
  activeDeckTotal: number;
  activeDeckValid: boolean;
  onSetActiveDeck: (deckId: string) => void;
  onLogout: () => void;
}

export function ProfileDeckCard({
  loading,
  player,
  decks,
  activeDeck,
  activeDeckTotal,
  activeDeckValid,
  onSetActiveDeck,
  onLogout
}: ProfileDeckCardProps) {
  if (!player) {
    return (
      <GameCard title="Perfil e Deck Ativo" subtitle="Entre para sincronizar progresso e decks">
        <p className="text-sm text-slate-300">Sem sessao ativa. Faca login para liberar campanha, online e colecao.</p>
      </GameCard>
    );
  }

  return (
    <GameCard title="Perfil e Deck Ativo" subtitle="Resumo rapido da conta">
      {loading ? (
        <div className="h-[170px] animate-pulse rounded-lg border border-slate-700/70 bg-slate-800/60" />
      ) : (
        <div className="space-y-3">
          <div className="space-y-1 text-xs text-slate-200">
            <p>
              Duelista: <span className="font-semibold text-slate-100">{player.username}</span>
            </p>
            <ProfileChips winsPve={player.winsPve} winsPvp={player.winsPvp} gold={player.gold} />
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-200">Deck Ativo</label>
            <select
              value={decks.activeDeckId ?? ""}
              onChange={(event) => onSetActiveDeck(event.target.value)}
              className="mt-1 w-full rounded-lg border border-slate-700/90 bg-slate-900/80 px-3 py-2 text-sm text-slate-100 outline-none transition focus:border-cyan-300/60"
            >
              {decks.decks.map((deck) => (
                <option key={deck.id} value={deck.id}>
                  {deck.name}
                </option>
              ))}
            </select>
            <div className="mt-1.5 flex flex-wrap items-center gap-1.5 text-xs">
              <span className="text-slate-300">{activeDeck ? `${activeDeck.name} | ${activeDeckTotal}/40 cartas` : "Nenhum deck selecionado"}</span>
              <span
                className={`rounded px-2 py-0.5 font-semibold ${
                  activeDeckValid ? "border border-emerald-300/60 bg-emerald-900/35 text-emerald-100" : "border border-rose-300/60 bg-rose-900/35 text-rose-100"
                }`}
              >
                {activeDeckValid ? "40/40 OK" : "Invalido"}
              </span>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <Link href="/profile" className="fm-button rounded-md px-2.5 py-1.5 text-xs font-semibold">
              Perfil
            </Link>
            <Link href="/deck-builder" className="fm-button rounded-md px-2.5 py-1.5 text-xs font-semibold">
              Deck Builder
            </Link>
            <button type="button" onClick={onLogout} className="fm-button rounded-md px-2.5 py-1.5 text-xs font-semibold">
              Sair
            </button>
          </div>
        </div>
      )}
    </GameCard>
  );
}
