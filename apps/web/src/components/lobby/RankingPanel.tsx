"use client";

import { useEffect, useMemo, useState } from "react";
import { fetchSocialRanking, type SocialRankingEntry, type SocialRankingResponse } from "../../lib/api";
import { GameCard } from "./GameCard";

type RankingTab = "GLOBAL" | "FRIENDS";

interface RankingPanelProps {
  playerLogged: boolean;
  currentUserId: string | null;
  currentUsername: string | null;
  currentWinsPvp?: number;
  currentLevel?: number;
}

export function RankingPanel({ playerLogged, currentUserId, currentUsername }: RankingPanelProps) {
  const [tab, setTab] = useState<RankingTab>("GLOBAL");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [ranking, setRanking] = useState<SocialRankingResponse | null>(null);

  const ready = Boolean(playerLogged && currentUserId && currentUsername);

  const loadRanking = async (silent = false) => {
    if (!ready || !currentUserId) return;
    try {
      if (!silent) setLoading(true);
      setError("");
      const next = await fetchSocialRanking(currentUserId);
      setRanking(next);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Falha ao carregar ranking.");
    } finally {
      if (!silent) setLoading(false);
    }
  };

  useEffect(() => {
    void loadRanking(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, currentUserId, currentUsername]);

  useEffect(() => {
    if (!ready) return;
    const interval = window.setInterval(() => {
      void loadRanking(true);
    }, 30000);
    return () => window.clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, currentUserId, currentUsername]);

  const rows = useMemo<SocialRankingEntry[]>(() => {
    if (!ranking) return [];
    return tab === "GLOBAL" ? ranking.global : ranking.friends;
  }, [ranking, tab]);

  if (!playerLogged || !currentUserId || !currentUsername) {
    return (
      <GameCard title="Ranking" subtitle="Entre para ver classificacao global e entre amigos.">
        <p className="text-sm text-slate-300">O ranking fica disponivel apos login na conta.</p>
      </GameCard>
    );
  }

  return (
    <GameCard
      title="Ranking"
      subtitle="Disputa por wins PvP com atualizacao periodica."
      rightSlot={
        <button
          type="button"
          onClick={() => void loadRanking(true)}
          disabled={loading}
          className="fm-button rounded-md px-2.5 py-1 text-xs font-semibold disabled:opacity-45"
        >
          {loading ? "..." : "Atualizar"}
        </button>
      }
    >
      <div className="mb-3 flex flex-wrap gap-2">
        {([
          { key: "GLOBAL", label: "Global" },
          { key: "FRIENDS", label: "Amigos" }
        ] as const).map((item) => (
          <button
            key={item.key}
            type="button"
            onClick={() => setTab(item.key)}
            className={`rounded-md border px-3 py-1.5 text-xs font-semibold transition ${
              tab === item.key
                ? "border-amber-200/85 bg-amber-900/30 text-amber-100"
                : "border-slate-600/70 bg-slate-900/60 text-slate-300 hover:border-amber-200/45 hover:text-amber-100"
            }`}
          >
            {item.label}
          </button>
        ))}
      </div>

      {loading && !rows.length ? (
        <div className="h-36 animate-pulse rounded-lg border border-slate-700/70 bg-slate-900/65" />
      ) : rows.length ? (
        <div className="fm-scroll max-h-[420px] space-y-2 overflow-y-auto pr-1">
          {rows.slice(0, 20).map((row) => (
            <article
              key={row.publicId}
              className={`rounded-lg border px-3 py-2 ${
                row.isCurrentUser ? "border-amber-300/75 bg-amber-900/25" : "border-slate-700/75 bg-slate-900/65"
              }`}
            >
              <div className="flex items-center justify-between gap-2 text-sm">
                <p className="min-w-0 truncate font-semibold text-slate-100">
                  <span className="mr-1 text-cyan-200">
                    {row.position === 1 ? "🥇" : row.position === 2 ? "🥈" : row.position === 3 ? "🥉" : `${row.position}.`}
                  </span>
                  {row.username}
                  {row.isCurrentUser ? <span className="ml-1 text-[11px] text-amber-100">(voce)</span> : null}
                </p>
                <span className="text-xs text-slate-300">{row.online ? "online" : "offline"}</span>
              </div>
              <div className="mt-1 flex items-center gap-2 text-[11px] text-slate-300">
                <span className="rounded border border-cyan-300/45 bg-cyan-900/25 px-2 py-0.5 text-cyan-100">Wins PvP: {row.winsPvp}</span>
                <span className="rounded border border-amber-300/45 bg-amber-900/25 px-2 py-0.5 text-amber-100">Level {row.level}</span>
              </div>
            </article>
          ))}
        </div>
      ) : (
        <p className="rounded-lg border border-slate-700/70 bg-slate-900/65 p-3 text-sm text-slate-300">
          Nenhum amigo disponivel no ranking ainda.
        </p>
      )}

      {error ? <p className="mt-3 rounded border border-rose-500/60 bg-rose-900/30 px-3 py-2 text-sm text-rose-100">{error}</p> : null}
    </GameCard>
  );
}
