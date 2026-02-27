import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { FaChartLine, FaCoins, FaCrosshairs, FaUserGroup } from "react-icons/fa6";
import type { DeckListResponse, LevelProgress, PlayerProfile } from "../../lib/api";
import { GameCard } from "./GameCard";
import { DeckCoverPicker } from "../deck/DeckCoverPicker";

interface ProfileDeckCardProps {
  loading: boolean;
  player: PlayerProfile | null;
  levelProgress: LevelProgress | null;
  decks: DeckListResponse;
  onSetActiveDeck: (deckId: string) => void;
  onLogout: () => void;
}

export function ProfileDeckCard({
  loading,
  player,
  levelProgress,
  decks,
  onSetActiveDeck,
  onLogout
}: ProfileDeckCardProps) {
  const [avatarDataUrl, setAvatarDataUrl] = useState<string | null>(null);
  const activeDeck = useMemo(() => decks.decks.find((deck) => deck.id === decks.activeDeckId) ?? null, [decks.activeDeckId, decks.decks]);
  const progressPercent = levelProgress
    ? Math.max(
        0,
        Math.min(
          100,
          Math.round((Math.max(0, levelProgress.xpInLevel) / Math.max(1, levelProgress.xpInLevel + levelProgress.xpToNextLevel)) * 100)
        )
      )
    : 0;

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!player?.publicId) {
      setAvatarDataUrl(null);
      return;
    }
    setAvatarDataUrl(window.localStorage.getItem(`ruptura_arcana_avatar_${player.publicId}`));
  }, [player?.publicId]);

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
          <div className="flex items-center gap-3 rounded-lg border border-slate-700/75 bg-slate-900/60 px-2.5 py-2">
            <div className="h-12 w-12 overflow-hidden rounded-full border border-amber-300/60 bg-slate-950">
              {avatarDataUrl ? <img src={avatarDataUrl} alt="Avatar" className="h-full w-full object-cover" /> : null}
            </div>
            <div>
              <p className="text-sm font-semibold text-slate-100">{player.username}</p>
            </div>
          </div>
          <div className="grid gap-2 sm:grid-cols-2">
            <div className="rounded border border-slate-700/75 bg-slate-900/60 px-2.5 py-2 text-slate-100">
              <span className="inline-flex items-center gap-1 rounded border border-slate-500/60 px-1.5 py-0.5 text-[10px] font-semibold tracking-[0.08em] text-slate-200">
                <FaCoins className="h-2.5 w-2.5" /> GOLD
              </span>
              <p className="mt-1 text-[15px] font-bold tracking-[0.03em] text-amber-100">{player.gold.toLocaleString("pt-BR")}</p>
            </div>
            <div className="rounded border border-slate-700/75 bg-slate-900/60 px-2.5 py-2 text-slate-100">
              <span className="inline-flex items-center gap-1 rounded border border-slate-500/60 px-1.5 py-0.5 text-[10px] font-semibold tracking-[0.08em] text-slate-200">
                <FaCrosshairs className="h-2.5 w-2.5" /> PVE
              </span>
              <p className="mt-1 text-[15px] font-semibold tracking-[0.03em] text-cyan-100">{player.winsPve}</p>
            </div>
            <div className="rounded border border-slate-700/75 bg-slate-900/60 px-2.5 py-2 text-slate-100">
              <span className="inline-flex items-center gap-1 rounded border border-slate-500/60 px-1.5 py-0.5 text-[10px] font-semibold tracking-[0.08em] text-slate-200">
                <FaUserGroup className="h-2.5 w-2.5" /> PVP
              </span>
              <p className="mt-1 text-[15px] font-semibold tracking-[0.03em] text-cyan-100">{player.winsPvp}</p>
            </div>
            <div className="rounded border border-slate-700/75 bg-slate-900/60 px-2.5 py-2 text-slate-100">
              <span className="inline-flex items-center gap-1 rounded border border-slate-500/60 px-1.5 py-0.5 text-[10px] font-semibold tracking-[0.08em] text-slate-200">
                <FaChartLine className="h-2.5 w-2.5" /> RANK
              </span>
              <p className="mt-1 text-[15px] font-bold tracking-[0.03em] text-amber-100">{levelProgress?.level ?? player.level}</p>
            </div>
            <div className="rounded border border-slate-700/75 bg-slate-900/60 px-2.5 py-2 text-slate-100">
              <span className="inline-flex items-center gap-1 rounded border border-slate-500/60 px-1.5 py-0.5 text-[10px] font-semibold tracking-[0.08em] text-slate-200">
                <FaChartLine className="h-2.5 w-2.5" /> XP
              </span>
              <p className="mt-1 text-[15px] font-semibold tracking-[0.03em] text-slate-100">{progressPercent}%</p>
              <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-slate-800/90">
                <div className="h-full rounded-full bg-gradient-to-r from-violet-400 via-fuchsia-400 to-orange-400" style={{ width: `${progressPercent}%` }} />
              </div>
            </div>
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
            <DeckCoverPicker deck={activeDeck} className="mt-3" />
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
