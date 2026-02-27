"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import type { ChangeEvent, ReactNode } from "react";
import { FaCoins, FaCrosshairs, FaImage, FaLayerGroup, FaUserGroup } from "react-icons/fa6";
import {
  equipPlayerTitle,
  fetchAchievementDashboard,
  fetchCollection,
  getStoredPublicId,
  resetPlayerProgress,
  updatePlayerProfile,
  type PlayerProfile,
  type PlayerTitleEntry
} from "../../lib/api";
import { HudStage } from "../../components/ui/HudStage";

function avatarStorageKey(publicId: string): string {
  return `ruptura_arcana_avatar_${publicId}`;
}

function StatCard({ icon, label, value }: { icon: ReactNode; label: string; value: string | number }) {
  return (
    <article className="rounded-xl border border-slate-700/80 bg-slate-900/70 px-3 py-3">
      <p className="text-[11px] uppercase tracking-[0.11em] text-slate-400">
        {icon} {label}
      </p>
      <p className="mt-1 text-base font-semibold text-slate-100">{value}</p>
    </article>
  );
}

export default function ProfilePage() {
  const [player, setPlayer] = useState<PlayerProfile | null>(null);
  const [username, setUsername] = useState("");
  const [titles, setTitles] = useState<PlayerTitleEntry[]>([]);
  const [collectionTotal, setCollectionTotal] = useState(245);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [equippingTitle, setEquippingTitle] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [avatarDataUrl, setAvatarDataUrl] = useState<string | null>(null);
  const uploadInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        setError("");
        const storedPublicId = getStoredPublicId();
        if (!storedPublicId) {
          throw new Error("Sessao nao encontrada. Faca login no lobby.");
        }

        const [dashboard, collection] = await Promise.all([
          fetchAchievementDashboard(storedPublicId),
          fetchCollection(storedPublicId).catch(() => [])
        ]);

        setPlayer(dashboard.player);
        setUsername(dashboard.player.username);
        setTitles(dashboard.titles);
        setCollectionTotal(collection.reduce((acc, entry) => acc + entry.count, 0));
        if (typeof window !== "undefined") {
          setAvatarDataUrl(window.localStorage.getItem(avatarStorageKey(dashboard.player.publicId)));
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Falha ao carregar perfil.");
      } finally {
        setLoading(false);
      }
    };

    void load();
  }, []);

  const equippedTitle = useMemo(() => {
    return titles.find((title) => title.equipped)?.name ?? player?.activeTitle ?? "Iniciante";
  }, [player?.activeTitle, titles]);

  const handleSave = async () => {
    if (!player) return;
    try {
      setSaving(true);
      setError("");
      setMessage("");
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

  const handleEquipTitle = async (title: string) => {
    if (!player) return;
    try {
      setEquippingTitle(title);
      setError("");
      setMessage("");
      const nextPlayer = await equipPlayerTitle(player.publicId, title);
      setPlayer(nextPlayer);
      setTitles((current) =>
        current.map((entry) => ({
          ...entry,
          equipped: entry.name === title
        }))
      );
      setMessage(`Titulo equipado: ${title}.`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Falha ao equipar titulo.");
    } finally {
      setEquippingTitle(null);
    }
  };

  const handleResetProgress = async () => {
    if (!player) return;
    if (!window.confirm("Tem certeza que deseja resetar seu personagem? Isso apaga decks, colecao e progresso.")) {
      return;
    }

    try {
      setSaving(true);
      setError("");
      setMessage("");
      await resetPlayerProgress(player.publicId);

      const [dashboard, collection] = await Promise.all([
        fetchAchievementDashboard(player.publicId),
        fetchCollection(player.publicId).catch(() => [])
      ]);

      setPlayer(dashboard.player);
      setUsername(dashboard.player.username);
      setTitles(dashboard.titles);
      setCollectionTotal(collection.reduce((acc, entry) => acc + entry.count, 0));
      setMessage("Personagem resetado com sucesso.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Falha ao resetar personagem.");
    } finally {
      setSaving(false);
    }
  };

  const handleAvatarUpload = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !player) return;
    if (!file.type.startsWith("image/")) {
      setError("Arquivo invalido. Envie uma imagem.");
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const value = typeof reader.result === "string" ? reader.result : null;
      if (!value) return;
      setAvatarDataUrl(value);
      if (typeof window !== "undefined") {
        window.localStorage.setItem(avatarStorageKey(player.publicId), value);
      }
      setMessage("Avatar atualizado.");
    };
    reader.onerror = () => setError("Falha ao processar imagem.");
    reader.readAsDataURL(file);
  };

  return (
    <HudStage>
      <div className="mx-auto w-full max-w-[1200px] space-y-4 pb-5">
        <header className="fm-panel fm-frame rounded-xl px-4 py-3">
          <h1 className="fm-title text-xl font-bold">Perfil do Duelista</h1>
        </header>

        {loading ? (
          <section className="rounded-xl border border-slate-700/80 bg-slate-900/70 p-5 text-sm text-slate-300">Carregando perfil...</section>
        ) : player ? (
          <>
            <section className="fm-panel fm-frame rounded-xl p-4">
              <div className="grid gap-4 lg:grid-cols-[auto_minmax(0,1fr)] lg:items-center">
                <div className="mx-auto flex h-24 w-24 items-center justify-center rounded-full border border-amber-300/65 bg-gradient-to-br from-violet-900/80 to-slate-900/90 text-3xl">
                  {avatarDataUrl ? (
                    <img src={avatarDataUrl} alt="Avatar do duelista" className="h-full w-full rounded-full object-cover" />
                  ) : (
                    <span aria-hidden>DU</span>
                  )}
                </div>

                <div className="space-y-2">
                  <div className="grid gap-2 sm:grid-cols-[minmax(180px,1fr)_auto_auto] sm:items-center">
                    <input
                      value={username}
                      onChange={(event) => setUsername(event.target.value)}
                      maxLength={24}
                      className="rounded-lg border border-slate-700 bg-slate-900/80 px-3 py-2 text-sm text-slate-100"
                    />
                    <span className="rounded border border-slate-700 bg-slate-900/70 px-2 py-1 text-xs text-slate-200">Rank {player.level}</span>
                    <span className="rounded border border-amber-300/60 bg-amber-900/30 px-2 py-1 text-xs text-amber-100">Titulo: {equippedTitle}</span>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => void handleSave()}
                      disabled={saving}
                      className="fm-button rounded-lg px-3 py-2 text-xs font-semibold disabled:cursor-not-allowed disabled:opacity-45"
                    >
                      {saving ? "Salvando..." : "Salvar Perfil"}
                    </button>
                    <button
                      type="button"
                      onClick={() => uploadInputRef.current?.click()}
                      className="fm-button rounded-lg px-3 py-2 text-xs font-semibold"
                    >
                      <span className="inline-flex items-center gap-1.5">
                        <FaImage className="h-3.5 w-3.5" />
                        Upload Avatar
                      </span>
                    </button>
                    <input ref={uploadInputRef} type="file" accept="image/*" onChange={handleAvatarUpload} className="hidden" />
                    <button
                      type="button"
                      onClick={() => void handleResetProgress()}
                      disabled={saving}
                      className="fm-button rounded-lg px-3 py-2 text-xs font-semibold text-rose-100 disabled:cursor-not-allowed disabled:opacity-45"
                    >
                      Resetar Personagem
                    </button>
                    <Link href="/" className="fm-button rounded-lg px-3 py-2 text-xs font-semibold">
                      Voltar ao Lobby
                    </Link>
                  </div>
                </div>
              </div>
            </section>

            <section className="grid gap-2 md:grid-cols-2 xl:grid-cols-4">
              <StatCard icon={<FaCrosshairs className="mr-1 inline h-3.5 w-3.5" />} label="Vitorias PvE" value={player.winsPve} />
              <StatCard icon={<FaUserGroup className="mr-1 inline h-3.5 w-3.5" />} label="Vitorias PvP" value={player.winsPvp} />
              <StatCard icon={<FaLayerGroup className="mr-1 inline h-3.5 w-3.5" />} label="Cartas" value={collectionTotal} />
              <StatCard icon={<FaCoins className="mr-1 inline h-3.5 w-3.5" />} label="Gold" value={player.gold.toLocaleString("pt-BR")} />
            </section>

            <section className="fm-panel fm-frame rounded-xl p-4">
              <div className="mb-3 flex items-center justify-between gap-2">
                <h2 className="fm-title text-sm font-bold">Titulos Desbloqueados</h2>
                <span className="rounded border border-slate-700 bg-slate-900/70 px-2 py-1 text-[11px] text-slate-300">Equipado: {equippedTitle}</span>
              </div>

              {titles.length === 0 ? (
                <p className="text-sm text-slate-300">Nenhum titulo desbloqueado ainda.</p>
              ) : (
                <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
                  {titles.map((title) => {
                    const isEquipped = title.equipped || title.name === equippedTitle;
                    return (
                      <article
                        key={title.name}
                        className={`rounded-lg border p-3 ${
                          isEquipped ? "border-amber-300/70 bg-amber-900/25" : "border-slate-700/75 bg-slate-900/65"
                        }`}
                      >
                        <p className="text-sm font-semibold text-slate-100">{title.name}</p>
                        <p className="mt-1 text-xs text-slate-300">{isEquipped ? "Titulo atual equipado" : "Disponivel para equipar"}</p>
                        <button
                          type="button"
                          onClick={() => void handleEquipTitle(title.name)}
                          disabled={isEquipped || equippingTitle !== null}
                          className="fm-button mt-2 w-full rounded-md px-2 py-1.5 text-xs font-semibold disabled:cursor-not-allowed disabled:opacity-45"
                        >
                          {equippingTitle === title.name ? "Equipando..." : isEquipped ? "EQUIPADO" : "EQUIPAR"}
                        </button>
                      </article>
                    );
                  })}
                </div>
              )}
            </section>
          </>
        ) : null}

        {message ? <p className="rounded border border-emerald-500/60 bg-emerald-900/30 px-3 py-2 text-sm text-emerald-100">{message}</p> : null}
        {error ? <p className="rounded border border-rose-500/60 bg-rose-900/30 px-3 py-2 text-sm text-rose-100">{error}</p> : null}
      </div>
    </HudStage>
  );
}
