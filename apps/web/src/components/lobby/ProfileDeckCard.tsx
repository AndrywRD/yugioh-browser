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
      <GameCard title="Perfil">
        <p className="text-sm text-slate-300">Sem sessao ativa. Faca login para liberar campanha, online e colecao.</p>
      </GameCard>
    );
  }

  return (
    <GameCard title="Perfil">
      {loading ? (
        <div className="h-[170px] animate-pulse rounded-lg border border-slate-700/70 bg-slate-800/60" />
      ) : (
        <div className="space-y-3">
          <div className="space-y-1">
            <p className="text-sm font-semibold text-slate-100">{player.username}</p>
            <ProfileChips winsPve={player.winsPve} winsPvp={player.winsPvp} gold={player.gold} />
          </div>

          <div className="rounded-lg border border-slate-700/75 bg-slate-900/60 p-2.5">
            <label className="text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-300">Deck ativo</label>
            <select
              value={decks.activeDeckId ?? ""}
              onChange={(event) => onSetActiveDeck(event.target.value)}
              className="mt-1.5 w-full rounded-lg border border-slate-700/90 bg-slate-900/80 px-3 py-2 text-sm text-slate-100 outline-none transition focus:border-cyan-300/60"
            >
              {decks.decks.map((deck) => (
                <option key={deck.id} value={deck.id}>
                  {deck.name}
                </option>
              ))}
            </select>
            <div className="mt-1.5 flex items-center gap-2 text-xs">
              <span className="text-slate-300">{activeDeck ? `${activeDeck.name} | ${activeDeckTotal}/40` : "Sem deck selecionado"}</span>
              <span
                className={`rounded border px-1.5 py-0.5 text-[10px] font-semibold ${
                  activeDeckValid ? "border-emerald-300/55 bg-emerald-900/30 text-emerald-100" : "border-rose-300/55 bg-rose-900/30 text-rose-100"
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
