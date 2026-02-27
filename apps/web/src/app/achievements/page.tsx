"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  equipPlayerTitle,
  fetchAchievementDashboard,
  getStoredPublicId,
  type AchievementDashboardEntry,
  type PlayerProfile,
  type PlayerTitleEntry
} from "../../lib/api";
import { HudStage } from "../../components/ui/HudStage";

type Tab = "ACHIEVEMENTS" | "TITLES";

function progressPercent(entry: AchievementDashboardEntry): number {
  if (entry.target <= 0) return 0;
  return Math.max(0, Math.min(100, Math.round((entry.progress / entry.target) * 100)));
}

export default function AchievementsPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [tab, setTab] = useState<Tab>("ACHIEVEMENTS");
  const [player, setPlayer] = useState<PlayerProfile | null>(null);
  const [achievements, setAchievements] = useState<AchievementDashboardEntry[]>([]);
  const [titles, setTitles] = useState<PlayerTitleEntry[]>([]);
  const [equippingTitle, setEquippingTitle] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        setError("");
        const publicId = getStoredPublicId();
        if (!publicId) throw new Error("Sessao nao encontrada. Faca login no lobby.");
        const dashboard = await fetchAchievementDashboard(publicId);
        setPlayer(dashboard.player);
        setAchievements(dashboard.achievements);
        setTitles(dashboard.titles);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Falha ao carregar conquistas.");
      } finally {
        setLoading(false);
      }
    };
    void load();
  }, []);

  const unlockedCount = useMemo(() => achievements.filter((entry) => entry.unlocked).length, [achievements]);
  const completedCount = useMemo(() => achievements.filter((entry) => entry.completed).length, [achievements]);

  const handleEquipTitle = async (title: string | null) => {
    if (!player) return;
    try {
      setEquippingTitle(title ?? "__CLEAR__");
      setError("");
      setMessage("");
      const nextPlayer = await equipPlayerTitle(player.publicId, title);
      setPlayer(nextPlayer);
      setTitles((current) =>
        current.map((entry) => ({
          ...entry,
          equipped: Boolean(title) && entry.name === title
        }))
      );
      setMessage(title ? `Titulo equipado: ${title}.` : "Titulo removido.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Falha ao equipar titulo.");
    } finally {
      setEquippingTitle(null);
    }
  };

  return (
    <HudStage>
      <div className="mx-auto w-full max-w-[1200px] space-y-4 pb-4">
        <header className="fm-panel rounded-xl px-4 py-3">
          <h1 className="fm-title text-xl font-bold text-amber-100">Conquistas</h1>
          <p className="fm-subtitle text-xs">
            {player ? `${player.username} | Pontos de conquista: ${player.achievementPoints}` : "Painel de progresso e titulos desbloqueados."}
          </p>
        </header>

        <section className="fm-panel rounded-xl p-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setTab("ACHIEVEMENTS")}
                className={`rounded-lg border px-3 py-1.5 text-xs font-semibold ${
                  tab === "ACHIEVEMENTS"
                    ? "border-amber-300/75 bg-amber-900/35 text-amber-100"
                    : "border-slate-700/80 bg-slate-900/65 text-slate-300 hover:border-amber-300/40 hover:text-amber-100"
                }`}
              >
                Conquistas
              </button>
              <button
                type="button"
                onClick={() => setTab("TITLES")}
                className={`rounded-lg border px-3 py-1.5 text-xs font-semibold ${
                  tab === "TITLES"
                    ? "border-amber-300/75 bg-amber-900/35 text-amber-100"
                    : "border-slate-700/80 bg-slate-900/65 text-slate-300 hover:border-amber-300/40 hover:text-amber-100"
                }`}
              >
                Titulos
              </button>
            </div>

            <div className="flex flex-wrap gap-2 text-[11px]">
              <span className="rounded border border-emerald-300/45 bg-emerald-900/30 px-2 py-1 text-emerald-100">
                Desbloqueadas: {unlockedCount}/{achievements.length}
              </span>
              <span className="rounded border border-cyan-300/45 bg-cyan-900/30 px-2 py-1 text-cyan-100">
                Concluidas: {completedCount}/{achievements.length}
              </span>
              <span className="rounded border border-amber-300/45 bg-amber-900/30 px-2 py-1 text-amber-100">
                Titulo ativo: {player?.activeTitle ?? "Nenhum"}
              </span>
            </div>
          </div>
        </section>

        {loading ? (
          <section className="grid gap-2 md:grid-cols-2">
            {Array.from({ length: 6 }).map((_, index) => (
              <div key={`achievement-skeleton-${index}`} className="h-32 animate-pulse rounded-lg border border-slate-700/70 bg-slate-900/70" />
            ))}
          </section>
        ) : tab === "ACHIEVEMENTS" ? (
          <section className="grid gap-2 md:grid-cols-2">
            {achievements.map((entry) => {
              const percent = progressPercent(entry);
              return (
                <article
                  key={entry.key}
                  className={`rounded-lg border p-3 ${
                    entry.unlocked
                      ? "border-amber-300/55 bg-amber-950/20"
                      : "border-slate-700/80 bg-slate-900/65"
                  }`}
                >
                  <div className="mb-2 flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-slate-100">{entry.title}</p>
                      <p className="mt-0.5 text-xs text-slate-300">{entry.description}</p>
                    </div>
                    <span
                      className={`shrink-0 rounded border px-2 py-0.5 text-[10px] font-semibold ${
                        entry.unlocked
                          ? "border-emerald-300/50 bg-emerald-900/35 text-emerald-100"
                          : entry.completed
                            ? "border-cyan-300/50 bg-cyan-900/35 text-cyan-100"
                            : "border-slate-600/60 bg-slate-800/75 text-slate-300"
                      }`}
                    >
                      {entry.unlocked ? "Concluida" : entry.completed ? "Pronta" : "Em progresso"}
                    </span>
                  </div>

                  <div className="text-xs text-slate-300">
                    <p>
                      Progresso: {entry.progress}/{entry.target}
                    </p>
                    <div className="mt-1 h-2 overflow-hidden rounded bg-slate-800/90">
                      <div
                        className="h-full rounded bg-gradient-to-r from-violet-400/85 via-fuchsia-400/85 to-orange-400/85"
                        style={{ width: `${percent}%` }}
                      />
                    </div>
                  </div>

                  <div className="mt-2 flex flex-wrap gap-1.5 text-[10px]">
                    <span className="rounded border border-amber-300/45 bg-amber-900/30 px-1.5 py-0.5 text-amber-100">
                      +{entry.rewardGold} gold
                    </span>
                    <span className="rounded border border-cyan-300/45 bg-cyan-900/30 px-1.5 py-0.5 text-cyan-100">
                      +{entry.rewardXp} xp
                    </span>
                    {entry.rewardDeckSlots > 0 ? (
                      <span className="rounded border border-fuchsia-300/45 bg-fuchsia-900/30 px-1.5 py-0.5 text-fuchsia-100">
                        +{entry.rewardDeckSlots} slots
                      </span>
                    ) : null}
                    {entry.rewardTitle ? (
                      <span className="rounded border border-emerald-300/45 bg-emerald-900/30 px-1.5 py-0.5 text-emerald-100">
                        Titulo: {entry.rewardTitle}
                      </span>
                    ) : null}
                  </div>
                </article>
              );
            })}
          </section>
        ) : (
          <section className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            <article className="rounded-lg border border-slate-700/75 bg-slate-900/65 p-3">
              <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-400">Controle</p>
              <p className="mt-1 text-sm text-slate-200">Remover titulo atual.</p>
              <button
                type="button"
                onClick={() => void handleEquipTitle(null)}
                disabled={equippingTitle !== null}
                className="fm-button mt-2 rounded px-3 py-1.5 text-xs font-semibold disabled:cursor-not-allowed disabled:opacity-45"
              >
                {equippingTitle === "__CLEAR__" ? "Atualizando..." : "Limpar titulo"}
              </button>
            </article>

            {titles.length === 0 ? (
              <article className="rounded-lg border border-slate-700/75 bg-slate-900/65 p-3 text-sm text-slate-300">
                Nenhum titulo desbloqueado ainda.
              </article>
            ) : (
              titles.map((title) => (
                <article
                  key={title.name}
                  className={`rounded-lg border p-3 ${
                    title.equipped
                      ? "border-amber-300/70 bg-amber-900/25"
                      : "border-slate-700/75 bg-slate-900/65"
                  }`}
                >
                  <p className="text-sm font-semibold text-slate-100">{title.name}</p>
                  <p className="mt-1 text-xs text-slate-300">{title.equipped ? "Titulo equipado no perfil." : "Disponivel para equipar."}</p>
                  <button
                    type="button"
                    onClick={() => void handleEquipTitle(title.name)}
                    disabled={title.equipped || equippingTitle !== null}
                    className="fm-button mt-2 rounded px-3 py-1.5 text-xs font-semibold disabled:cursor-not-allowed disabled:opacity-45"
                  >
                    {equippingTitle === title.name ? "Equipando..." : title.equipped ? "Equipado" : "Equipar"}
                  </button>
                </article>
              ))
            )}
          </section>
        )}

        <section className="fm-panel rounded-xl p-3">
          <div className="grid gap-2 sm:grid-cols-3">
            <Link href="/" className="fm-button rounded-lg px-3 py-2 text-center text-xs font-semibold">
              Voltar ao Lobby
            </Link>
            <Link href="/profile" className="fm-button rounded-lg px-3 py-2 text-center text-xs font-semibold">
              Perfil
            </Link>
            <Link href="/fusion-log" className="fm-button rounded-lg px-3 py-2 text-center text-xs font-semibold">
              Fusion Log
            </Link>
          </div>
        </section>

        {message ? <p className="rounded border border-emerald-500/60 bg-emerald-900/30 px-3 py-2 text-sm text-emerald-100">{message}</p> : null}
        {error ? <p className="rounded border border-rose-500/60 bg-rose-900/30 px-3 py-2 text-sm text-rose-100">{error}</p> : null}
      </div>
    </HudStage>
  );
}

