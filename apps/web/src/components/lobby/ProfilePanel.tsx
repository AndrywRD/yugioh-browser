import Link from "next/link";
import type { Deck } from "@ruptura-arcana/shared";
import type { DeckListResponse, LevelProgress, PlayerAchievement, PlayerProfile } from "../../lib/api";
import type { UiPreferences, UiScale } from "../../lib/uiPreferences";
import { GameCard } from "./GameCard";

interface ProfilePanelProps {
  player: PlayerProfile | null;
  loading: boolean;
  decks: DeckListResponse;
  activeDeck: Deck | null;
  activeDeckTotal: number;
  levelProgress: LevelProgress | null;
  achievements: PlayerAchievement[];
  onSetActiveDeck: (deckId: string) => void;
  onLogout: () => void;
  uiPreferences: UiPreferences;
  onUpdateUiPreferences: (patch: Partial<UiPreferences>) => void;
}

function StatChip({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-lg border border-slate-700/75 bg-slate-900/65 px-3 py-2">
      <p className="text-[11px] uppercase tracking-[0.12em] text-slate-400">{label}</p>
      <p className="mt-1 text-sm font-semibold text-slate-100">{value}</p>
    </div>
  );
}

export function ProfilePanel({
  player,
  loading,
  decks,
  activeDeck,
  activeDeckTotal,
  levelProgress,
  achievements,
  onSetActiveDeck,
  onLogout,
  uiPreferences,
  onUpdateUiPreferences
}: ProfilePanelProps) {
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
              <StatChip label="Nivel" value={levelProgress?.level ?? player.level} />
              <StatChip label="XP total" value={player.xp} />
              <StatChip label="Wins PVE" value={player.winsPve} />
              <StatChip label="Wins PVP" value={player.winsPvp} />
              <StatChip label="Pts Conquista" value={player.achievementPoints} />
              <StatChip label="Slots de Deck" value={player.deckSlotLimit} />
            </div>

            <div className="rounded-lg border border-slate-700/75 bg-slate-900/65 p-3">
              <p className="text-[11px] uppercase tracking-[0.12em] text-slate-400">Titulo e progressao</p>
              <p className="mt-1 text-xs text-slate-200">{player.activeTitle ? `Titulo ativo: ${player.activeTitle}` : "Sem titulo ativo"}</p>
              <p className="mt-1 text-xs text-slate-300">
                XP no nivel: {levelProgress?.xpInLevel ?? 0} | XP para proximo: {levelProgress?.xpToNextLevel ?? 0}
              </p>
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

            <div className="rounded-lg border border-slate-700/75 bg-slate-900/65 p-3">
              <p className="text-[11px] uppercase tracking-[0.12em] text-slate-400">Conquistas recentes</p>
              {achievements.length === 0 ? (
                <p className="mt-2 text-xs text-slate-300">Nenhuma conquista desbloqueada ainda.</p>
              ) : (
                <div className="mt-2 grid gap-1.5">
                  {achievements.slice(0, 4).map((achievement) => (
                    <div key={achievement.key} className="rounded-md border border-slate-700/70 bg-slate-800/70 px-2 py-1.5">
                      <p className="text-xs font-semibold text-amber-100">{achievement.title}</p>
                      <p className="text-[11px] text-slate-300">{achievement.description}</p>
                    </div>
                  ))}
                </div>
              )}
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
