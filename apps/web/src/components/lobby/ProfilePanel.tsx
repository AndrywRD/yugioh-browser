import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import type { DeckListResponse, LevelProgress, PlayerAchievement, PlayerProfile } from "../../lib/api";
import type { UiPreferences, UiScale } from "../../lib/uiPreferences";
import { DeckCoverPicker } from "../deck/DeckCoverPicker";
import { GameCard } from "./GameCard";
import { LobbyIcon } from "./LobbyIcon";

interface ProfilePanelProps {
  player: PlayerProfile | null;
  loading: boolean;
  decks: DeckListResponse;
  levelProgress: LevelProgress | null;
  achievements: PlayerAchievement[];
  onSetActiveDeck: (deckId: string) => void;
  onLogout: () => void;
  uiPreferences: UiPreferences;
  onUpdateUiPreferences: (patch: Partial<UiPreferences>) => void;
}

function StatChip({
  label,
  value,
  icon
}: {
  label: string;
  value: string | number;
  icon:
    | "profile"
    | "gold"
    | "level"
    | "xp"
    | "pve"
    | "pvp"
    | "achievement"
    | "deck";
}) {
  return (
    <div className="rounded-lg border border-slate-700/75 bg-slate-900/65 px-3 py-2">
      <p className="flex items-center gap-2 text-[11px] uppercase tracking-[0.12em] text-slate-400">
        <LobbyIcon kind={icon} className="h-3.5 w-3.5 text-amber-200/90" />
        <span>{label}</span>
      </p>
      <p className="mt-1 text-sm font-semibold text-slate-100">{value}</p>
    </div>
  );
}

export function ProfilePanel({
  player,
  loading,
  decks,
  levelProgress,
  achievements,
  onSetActiveDeck,
  onLogout,
  uiPreferences,
  onUpdateUiPreferences
}: ProfilePanelProps) {
  const [avatarDataUrl, setAvatarDataUrl] = useState<string | null>(null);
  const activeDeck = useMemo(() => decks.decks.find((deck) => deck.id === decks.activeDeckId) ?? null, [decks.activeDeckId, decks.decks]);

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
      <GameCard title="Perfil" subtitle="Acesso restrito para contas autenticadas.">
        <p className="text-sm text-slate-300">Entre com login para configurar seu duelista.</p>
      </GameCard>
    );
  }

  return (
    <div className="grid gap-3">
      <GameCard title="Perfil do Duelista">
        {loading ? (
          <div className="h-[200px] animate-pulse rounded-lg border border-slate-700/70 bg-slate-800/60" />
        ) : (
          <div className="space-y-3">
            <div className="flex items-center gap-3 rounded-lg border border-slate-700/75 bg-slate-900/65 px-3 py-2">
              <div className="h-12 w-12 overflow-hidden rounded-full border border-amber-300/60 bg-slate-950">
                {avatarDataUrl ? <img src={avatarDataUrl} alt="Avatar" className="h-full w-full object-cover" /> : null}
              </div>
              <div>
                <p className="text-xs uppercase tracking-[0.12em] text-slate-400">Perfil</p>
                <p className="text-sm font-semibold text-slate-100">{player.username}</p>
              </div>
            </div>
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
              <StatChip label="Duelista" value={player.username} icon="profile" />
              <StatChip label="Gold" value={player.gold} icon="gold" />
              <StatChip label="Nivel" value={levelProgress?.level ?? player.level} icon="level" />
              <StatChip label="XP total" value={player.xp} icon="xp" />
              <StatChip label="Wins PVE" value={player.winsPve} icon="pve" />
              <StatChip label="Wins PVP" value={player.winsPvp} icon="pvp" />
              <StatChip label="Pts Conquista" value={player.achievementPoints} icon="achievement" />
              <StatChip label="Slots de Deck" value={player.deckSlotLimit} icon="deck" />
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
              <DeckCoverPicker deck={activeDeck} className="mt-3" />
            </div>

            {/* Conquistas recentes removidas conforme solicitado */}
          </div>
        )}
      </GameCard>

      <GameCard title="Acoes de Conta">
        <div className="grid gap-2 sm:grid-cols-6">
          <Link href="/profile" className="fm-button rounded-lg px-3 py-2 text-center text-sm font-semibold">
            Editar Perfil
          </Link>
          <Link href="/deck-builder" className="fm-button rounded-lg px-3 py-2 text-center text-sm font-semibold">
            Abrir Deck Builder
          </Link>
          <Link href="/fusion-log" className="fm-button rounded-lg px-3 py-2 text-center text-sm font-semibold">
            Fusion Log
          </Link>
          <Link href="/achievements" className="fm-button rounded-lg px-3 py-2 text-center text-sm font-semibold">
            Conquistas
          </Link>
          <Link href="/pvp" className="fm-button rounded-lg px-3 py-2 text-center text-sm font-semibold">
            Arena PvP
          </Link>
          <button type="button" onClick={onLogout} className="fm-button rounded-lg px-3 py-2 text-sm font-semibold">
            Sair
          </button>
        </div>

        <div className="mt-3 rounded-lg border border-slate-700/75 bg-slate-900/60 p-3">
          <p className="text-[11px] uppercase tracking-[0.12em] text-slate-400">Acessibilidade e UI</p>
          <div className="mt-2 grid gap-2 sm:grid-cols-2">
            <label className="text-xs text-slate-300">
              Escala da UI
              <select
                value={uiPreferences.scale}
                onChange={(event) => onUpdateUiPreferences({ scale: event.target.value as UiScale })}
                className="mt-1 w-full rounded-lg border border-slate-700/90 bg-slate-900/85 px-2 py-1.5 text-xs text-slate-100 outline-none transition focus:border-cyan-300/60"
              >
                <option value="COMPACT">Compacta</option>
                <option value="NORMAL">Normal</option>
                <option value="LARGE">Grande</option>
              </select>
            </label>
            <div className="grid gap-1.5 text-xs text-slate-200">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={uiPreferences.fastAnimations}
                  onChange={(event) => onUpdateUiPreferences({ fastAnimations: event.target.checked })}
                />
                Animacoes rapidas
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={uiPreferences.highContrast}
                  onChange={(event) => onUpdateUiPreferences({ highContrast: event.target.checked })}
                />
                Contraste alto
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={uiPreferences.colorblindAssist}
                  onChange={(event) => onUpdateUiPreferences({ colorblindAssist: event.target.checked })}
                />
                Assistencia colorblind
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={uiPreferences.fontBoost}
                  onChange={(event) => onUpdateUiPreferences({ fontBoost: event.target.checked })}
                />
                Fontes maiores
              </label>
            </div>
          </div>
        </div>
      </GameCard>
    </div>
  );
}
