"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { fetchPlayerProfile, fetchPvpLobby, getStoredPublicId, type PlayerProfile, type PvpLobbySnapshot } from "../../lib/api";
import { HudStage } from "../../components/ui/HudStage";

const LAST_ROOM_CODE_STORAGE_KEY = "ruptura_arcana_last_room_code";

export default function PvpPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [player, setPlayer] = useState<PlayerProfile | null>(null);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [snapshot, setSnapshot] = useState<PvpLobbySnapshot>({ onlinePlayers: [], openRooms: [] });
  const [refreshing, setRefreshing] = useState(false);
  const [searching, setSearching] = useState(false);
  const [creatingRoom, setCreatingRoom] = useState(false);
  const [joinCode, setJoinCode] = useState("");
  const [joiningByCode, setJoiningByCode] = useState(false);
  const [joiningRoomCode, setJoiningRoomCode] = useState<string | null>(null);

  const publicId = useMemo(() => getStoredPublicId(), []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!publicId) {
      setAvatarUrl(null);
      return;
    }
    setAvatarUrl(window.localStorage.getItem(`ruptura_arcana_avatar_${publicId}`));
  }, [publicId]);

  const loadSnapshot = async (silent = false) => {
    if (!publicId) {
      setError("Sessao nao encontrada. Faca login no lobby.");
      return;
    }
    try {
      if (silent) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }
      setError("");
      const [profile, pvpSnapshot] = await Promise.all([fetchPlayerProfile(publicId), fetchPvpLobby(publicId)]);
      setPlayer(profile);
      setSnapshot(pvpSnapshot);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Falha ao carregar arena PvP.");
    } finally {
      if (silent) {
        setRefreshing(false);
      } else {
        setLoading(false);
      }
    }
  };

  useEffect(() => {
    void loadSnapshot(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleCreateRoom = () => {
    if (!player) return;
    setCreatingRoom(true);
    setMessage("Criando sala PvP...");
    window.setTimeout(() => {
      router.push(`/match?username=${encodeURIComponent(player.username)}&mode=PVP&autoCreate=1`);
    }, 220);
  };

  const handleFindDuel = () => {
    if (!player) return;
    setSearching(true);
    setError("");

    const openRoom = snapshot.openRooms.find((room) => room.playerCount < 2 && room.status === "LOBBY");
    if (openRoom) {
      setMessage(`Entrando na sala ${openRoom.roomCode}...`);
      if (typeof window !== "undefined") {
        window.localStorage.setItem(LAST_ROOM_CODE_STORAGE_KEY, openRoom.roomCode);
      }
      window.setTimeout(() => {
        router.push(`/match?roomCode=${openRoom.roomCode}&username=${encodeURIComponent(player.username)}&mode=PVP`);
      }, 220);
      return;
    }

    setMessage("Nenhuma sala disponivel. Criando sala PvP...");
    window.setTimeout(() => {
      router.push(`/match?username=${encodeURIComponent(player.username)}&mode=PVP&autoCreate=1`);
    }, 220);
  };

  const handleJoinByCode = () => {
    if (!player) return;
    const normalizedCode = joinCode.trim().toUpperCase();
    if (!normalizedCode) {
      setError("Informe um codigo de sala.");
      return;
    }
    setJoiningByCode(true);
    setMessage(`Entrando na sala ${normalizedCode}...`);
    if (typeof window !== "undefined") {
      window.localStorage.setItem(LAST_ROOM_CODE_STORAGE_KEY, normalizedCode);
    }
    window.setTimeout(() => {
      router.push(`/match?roomCode=${normalizedCode}&username=${encodeURIComponent(player.username)}&mode=PVP`);
    }, 220);
  };

  const handleJoinRoom = (roomCode: string) => {
    if (!player) return;
    setJoiningRoomCode(roomCode);
    setMessage(`Entrando na sala ${roomCode}...`);
    if (typeof window !== "undefined") {
      window.localStorage.setItem(LAST_ROOM_CODE_STORAGE_KEY, roomCode);
    }
    window.setTimeout(() => {
      router.push(`/match?roomCode=${roomCode}&username=${encodeURIComponent(player.username)}&mode=PVP`);
    }, 220);
  };

  return (
    <HudStage>
      <div className="mx-auto w-full max-w-[1320px] space-y-4 pb-4">
        <header className="fm-panel rounded-xl px-4 py-3">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div>
              <h1 className="fm-title text-xl font-bold text-amber-100">Arena PvP</h1>
              <p className="fm-subtitle text-xs">
                {player ? `${player.username} | Rank ${player.level} | Vitorias PvP: ${player.winsPvp}` : "Lobby online para duelos em tempo real."}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <div className="h-10 w-10 overflow-hidden rounded-full border border-amber-300/60 bg-slate-900/80">
                {avatarUrl ? <img src={avatarUrl} alt="Avatar" className="h-full w-full object-cover" /> : null}
              </div>
              <button
                type="button"
                onClick={() => void loadSnapshot(true)}
                disabled={loading || refreshing || searching || creatingRoom || joiningByCode || joiningRoomCode !== null}
                className="fm-button rounded-lg px-3 py-2 text-xs font-semibold disabled:cursor-not-allowed disabled:opacity-45"
              >
                {refreshing ? "Atualizando..." : "Atualizar"}
              </button>
              <Link href="/" className="fm-button rounded-lg px-3 py-2 text-xs font-semibold">
                Voltar ao Lobby
              </Link>
            </div>
          </div>
        </header>

        <section className="fm-panel rounded-xl p-4">
          <div className="grid gap-3 lg:grid-cols-[1fr_auto]">
            <div className="rounded-lg border border-slate-700/75 bg-slate-900/65 p-3">
              <p className="text-sm font-semibold text-slate-100">Entrar por codigo</p>
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <input
                  value={joinCode}
                  onChange={(event) => setJoinCode(event.target.value)}
                  placeholder="Ex.: ABC12"
                  maxLength={8}
                  className="rounded-lg border border-slate-700/90 bg-slate-900/80 px-3 py-2 text-sm text-slate-100 outline-none transition focus:border-cyan-300/60"
                />
                <button
                  type="button"
                  onClick={handleJoinByCode}
                  disabled={loading || joiningByCode || searching || creatingRoom || joiningRoomCode !== null}
                  className="fm-button rounded-lg px-3 py-2 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-45"
                >
                  {joiningByCode ? "Entrando..." : "Entrar"}
                </button>
              </div>
            </div>

            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-1">
              <button
                type="button"
                onClick={handleFindDuel}
                disabled={loading || searching || creatingRoom || joiningByCode || joiningRoomCode !== null}
                className="lobby-pressable inline-flex min-h-[78px] items-center justify-center gap-2 rounded-lg border border-amber-300/80 bg-[linear-gradient(180deg,rgba(176,118,30,0.95),rgba(125,82,18,0.98))] px-6 py-3 text-sm font-semibold text-amber-50 shadow-[inset_0_1px_0_rgba(255,228,175,0.35)] transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-45"
              >
                <span className={`h-3.5 w-3.5 rounded-full border-2 border-amber-50/70 border-t-transparent ${searching ? "animate-spin" : ""}`} />
                {searching ? "Procurando duelo..." : "Procurar Duelo"}
              </button>
              <button
                type="button"
                onClick={handleCreateRoom}
                disabled={loading || creatingRoom || searching || joiningByCode || joiningRoomCode !== null}
                className="fm-button inline-flex min-h-[78px] items-center justify-center rounded-lg px-6 py-3 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-45"
              >
                {creatingRoom ? "Criando sala..." : "Criar Sala"}
              </button>
            </div>
          </div>
        </section>

        <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)]">
          <section className="fm-panel rounded-xl p-3">
            <p className="text-sm font-semibold text-slate-100">Jogadores online ({snapshot.onlinePlayers.length})</p>
            <div className="fm-scroll mt-2 max-h-[420px] overflow-y-auto pr-1">
              {loading ? (
                <div className="grid gap-2 sm:grid-cols-2">
                  {Array.from({ length: 6 }).map((_, index) => (
                    <div key={`online-player-skeleton-${index}`} className="h-24 animate-pulse rounded-lg border border-slate-700/70 bg-slate-900/70" />
                  ))}
                </div>
              ) : snapshot.onlinePlayers.length === 0 ? (
                <p className="rounded-lg border border-slate-700/70 bg-slate-900/70 p-3 text-sm text-slate-300">
                  Nenhum duelista online no momento.
                </p>
              ) : (
                <ul className="grid gap-2 sm:grid-cols-2">
                  {snapshot.onlinePlayers.map((row) => (
                    <li key={row.playerId} className="rounded-lg border border-slate-700/70 bg-slate-900/70 p-2.5">
                      <p className="truncate text-sm font-semibold text-slate-100">{row.username}</p>
                      <p className="mt-1 text-xs text-slate-300">
                        {row.inRoom ? `Em sala ${row.roomCode ?? "--"}` : "Livre para duelo"}
                      </p>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </section>

          <section className="fm-panel rounded-xl p-3">
            <p className="text-sm font-semibold text-slate-100">Salas disponiveis ({snapshot.openRooms.length})</p>
            <div className="fm-scroll mt-2 max-h-[420px] space-y-2 overflow-y-auto pr-1">
              {loading ? (
                Array.from({ length: 4 }).map((_, index) => (
                  <div key={`room-skeleton-${index}`} className="h-24 animate-pulse rounded-lg border border-slate-700/70 bg-slate-900/70" />
                ))
              ) : snapshot.openRooms.length === 0 ? (
                <p className="rounded-lg border border-slate-700/70 bg-slate-900/70 p-3 text-sm text-slate-300">
                  Nenhuma sala aberta. Crie a primeira.
                </p>
              ) : (
                snapshot.openRooms.map((room) => {
                  const canJoin = room.playerCount < 2 && room.status === "LOBBY";
                  return (
                    <article key={room.roomCode} className="rounded-lg border border-slate-700/70 bg-slate-900/70 p-3">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div>
                          <p className="text-sm font-semibold text-slate-100">
                            Sala {room.roomCode}
                            <span className="ml-1 text-[11px] text-cyan-200/90">Host: {room.hostUsername}</span>
                          </p>
                          <p className="mt-1 text-xs text-slate-300">
                            {room.playerCount}/2 jogadores | Status: {room.status}
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleJoinRoom(room.roomCode)}
                          disabled={!canJoin || joiningRoomCode !== null || searching || creatingRoom || joiningByCode}
                          className="fm-button rounded px-3 py-1.5 text-xs font-semibold disabled:cursor-not-allowed disabled:opacity-45"
                        >
                          {joiningRoomCode === room.roomCode ? "Entrando..." : canJoin ? "Entrar" : "Indisponivel"}
                        </button>
                      </div>
                      <div className="mt-2 grid gap-1 text-[11px] text-slate-300">
                        {room.players.map((roomPlayer) => (
                          <p key={`${room.roomCode}-${roomPlayer.playerId}`}>
                            {roomPlayer.username} {roomPlayer.online ? "(online)" : "(offline)"}
                          </p>
                        ))}
                      </div>
                    </article>
                  );
                })
              )}
            </div>
          </section>
        </div>

        {message ? <p className="rounded border border-emerald-500/60 bg-emerald-900/30 px-3 py-2 text-sm text-emerald-100">{message}</p> : null}
        {error ? <p className="rounded border border-rose-500/60 bg-rose-900/30 px-3 py-2 text-sm text-rose-100">{error}</p> : null}
      </div>
    </HudStage>
  );
}
