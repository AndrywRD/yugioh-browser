"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { fetchPlayerProfile, getStoredPublicId, resetPlayerProgress, updatePlayerProfile, type PlayerProfile } from "../../lib/api";
import { HudStage } from "../../components/ui/HudStage";

export default function ProfilePage() {
  const [player, setPlayer] = useState<PlayerProfile | null>(null);
  const [username, setUsername] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        setError("");
        const storedPublicId = getStoredPublicId();
        if (!storedPublicId) {
          throw new Error("Sessao nao encontrada. Faca login no lobby.");
        }
        const profile = await fetchPlayerProfile(storedPublicId);
        setPlayer(profile);
        setUsername(profile.username);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Falha ao carregar perfil.");
      } finally {
        setLoading(false);
      }
    };

    void load();
  }, []);

  const handleSave = async () => {
    if (!player) return;
    try {
      setSaving(true);
      setError("");
      const next = await updatePlayerProfile(player.publicId, username);
      setPlayer(next);
      setUsername(next.username);
      setMessage("Perfil atualizado.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Falha ao salvar perfil.");
    } finally {
      setSaving(false);
    }
  };

  const handleResetProgress = async () => {
    if (!player) return;
    if (!window.confirm("Tem certeza que deseja resetar seu personagem? Isso apaga decks, colecao, fusion log e historico.")) {
      return;
    }

    try {
      setSaving(true);
      setError("");
      setMessage("");
      const result = await resetPlayerProgress(player.publicId);
      setPlayer(result.player);
      setUsername(result.player.username);
      setMessage("Personagem resetado com starter FM inicial.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Falha ao resetar personagem.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <HudStage>
      <div className="mx-auto w-full max-w-[900px] space-y-4">
        <header className="fm-panel fm-frame rounded-xl px-4 py-3">
          <h1 className="fm-title text-xl font-bold">Perfil</h1>
          <p className="fm-subtitle text-xs">Gerencie nome de exibicao e acompanhe progresso.</p>
        </header>

        <section className="fm-panel fm-frame rounded-xl p-4">
          {loading && <p className="text-sm text-slate-300">Carregando...</p>}

          {!loading && player && (
            <div className="grid gap-3">
              <label className="text-xs text-slate-300" htmlFor="username">
                Nome do duelista
              </label>
              <input
                id="username"
                value={username}
                onChange={(event) => setUsername(event.target.value)}
                className="rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm"
                maxLength={24}
              />
              <div className="fm-chip grid gap-2 rounded-lg p-3 text-xs text-slate-300 sm:grid-cols-3">
                <p>Wins PVE: {player.winsPve}</p>
                <p>Wins PVP: {player.winsPvp}</p>
                <p>Gold: {player.gold}</p>
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => void handleSave()}
                  disabled={saving}
                  className="fm-button rounded-lg px-3 py-2 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-45"
                >
                  {saving ? "Salvando..." : "Salvar Perfil"}
                </button>
                <Link href="/" className="fm-button rounded-lg px-3 py-2 text-sm font-semibold">
                  Voltar ao Lobby
                </Link>
                <button
                  type="button"
                  onClick={() => void handleResetProgress()}
                  disabled={saving}
                  className="fm-button rounded-lg px-3 py-2 text-sm font-semibold text-rose-100 disabled:cursor-not-allowed disabled:opacity-45"
                >
                  Resetar Personagem
                </button>
              </div>
            </div>
          )}
        </section>

        {message && <p className="rounded border border-emerald-500/60 bg-emerald-900/30 px-3 py-2 text-sm text-emerald-100">{message}</p>}
        {error && <p className="rounded border border-rose-500/60 bg-rose-900/30 px-3 py-2 text-sm text-rose-100">{error}</p>}
      </div>
    </HudStage>
  );
}
