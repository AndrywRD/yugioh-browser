"use client";

import { useEffect, useMemo, useState } from "react";
import {
  acceptSocialFriendRequest,
  cancelSocialFriendRequest,
  declineSocialFriendRequest,
  fetchSocialConversation,
  fetchSocialSnapshot,
  markSocialConversationRead,
  removeSocialFriend,
  searchSocialPlayers,
  sendSocialFriendRequest,
  sendSocialMessage,
  type SocialMessage,
  type SocialSnapshot,
  type SocialUser
} from "../../lib/api";
import { GameCard } from "./GameCard";

type FriendsTab = "FRIENDS" | "REQUESTS" | "SEARCH";

interface FriendsPanelProps {
  playerLogged: boolean;
  currentUserId: string | null;
  currentUsername: string | null;
  onBadgeCountChange?: (count: number) => void;
  onChallengeFriend?: (friend: SocialUser) => void;
}

interface ToastMessage {
  id: string;
  text: string;
  tone: "info" | "success" | "warning";
}

function presenceDotClass(presence: SocialUser["presence"]): string {
  if (presence === "ONLINE") return "bg-emerald-400";
  if (presence === "IN_DUEL") return "bg-cyan-400";
  return "bg-rose-400";
}

function presenceLabel(presence: SocialUser["presence"]): string {
  if (presence === "ONLINE") return "online";
  if (presence === "IN_DUEL") return "em duelo";
  return "offline";
}

function makeToast(text: string, tone: ToastMessage["tone"] = "info"): ToastMessage {
  return {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
    text,
    tone
  };
}

function initials(name: string): string {
  const parts = name
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  if (!parts.length) return "??";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0] ?? ""}${parts[1][0] ?? ""}`.toUpperCase();
}

export function FriendsPanel({ playerLogged, currentUserId, currentUsername, onBadgeCountChange, onChallengeFriend }: FriendsPanelProps) {
  const [tab, setTab] = useState<FriendsTab>("FRIENDS");
  const [loading, setLoading] = useState(false);
  const [snapshot, setSnapshot] = useState<SocialSnapshot | null>(null);
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");
  const [searching, setSearching] = useState(false);
  const [searchResult, setSearchResult] = useState<SocialUser[]>([]);
  const [chatFriend, setChatFriend] = useState<SocialUser | null>(null);
  const [chatMessages, setChatMessages] = useState<SocialMessage[]>([]);
  const [chatInput, setChatInput] = useState("");
  const [chatSending, setChatSending] = useState(false);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const [processingFriendId, setProcessingFriendId] = useState<string | null>(null);

  const ready = Boolean(playerLogged && currentUserId && currentUsername);

  const pushToast = (text: string, tone: ToastMessage["tone"] = "info") => {
    setToasts((current) => [makeToast(text, tone), ...current].slice(0, 4));
  };

  const removeToast = (id: string) => {
    setToasts((current) => current.filter((item) => item.id !== id));
  };

  const refreshSnapshot = async (silent = false) => {
    if (!ready || !currentUserId) return;
    try {
      if (!silent) setLoading(true);
      setError("");
      const next = await fetchSocialSnapshot(currentUserId);
      setSnapshot(next);
      onBadgeCountChange?.(next.badgeCount);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Falha ao carregar amigos.");
    } finally {
      if (!silent) setLoading(false);
    }
  };

  useEffect(() => {
    void refreshSnapshot(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUserId, currentUsername, playerLogged]);

  useEffect(() => {
    if (!ready) return;
    const interval = window.setInterval(() => {
      void refreshSnapshot(true);
    }, 15000);
    return () => window.clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, currentUserId, currentUsername]);

  useEffect(() => {
    if (!chatFriend || !ready || !currentUserId) return;
    let cancelled = false;
    const loadConversation = async () => {
      try {
        const [messages, nextSnapshot] = await Promise.all([
          fetchSocialConversation(currentUserId, chatFriend.publicId),
          markSocialConversationRead(currentUserId, chatFriend.publicId)
        ]);
        if (cancelled) return;
        setChatMessages(messages);
        setSnapshot(nextSnapshot);
        onBadgeCountChange?.(nextSnapshot.badgeCount);
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Falha ao carregar conversa.");
        }
      }
    };
    void loadConversation();
    return () => {
      cancelled = true;
    };
  }, [chatFriend, ready, currentUserId, onBadgeCountChange]);

  useEffect(() => {
    if (!chatFriend || !ready || !currentUserId) return;
    const interval = window.setInterval(() => {
      void (async () => {
        try {
          const [messages, nextSnapshot] = await Promise.all([
            fetchSocialConversation(currentUserId, chatFriend.publicId),
            fetchSocialSnapshot(currentUserId)
          ]);
          setChatMessages(messages);
          setSnapshot(nextSnapshot);
          onBadgeCountChange?.(nextSnapshot.badgeCount);
        } catch {
          // ignore polling errors
        }
      })();
    }, 4000);
    return () => window.clearInterval(interval);
  }, [chatFriend, ready, currentUserId, onBadgeCountChange]);

  useEffect(() => {
    if (!toasts.length) return;
    const timeout = window.setTimeout(() => {
      setToasts((current) => current.slice(0, -1));
    }, 3200);
    return () => window.clearTimeout(timeout);
  }, [toasts]);

  const searchCandidates = useMemo(() => {
    if (!snapshot) return [];
    const blocked = new Set<string>([
      ...(snapshot.friends.map((item) => item.publicId) ?? []),
      ...(snapshot.incomingRequests.map((item) => item.publicId) ?? []),
      ...(snapshot.outgoingRequests.map((item) => item.publicId) ?? [])
    ]);
    return snapshot.users.filter((user) => !blocked.has(user.publicId));
  }, [snapshot]);

  const handleSearch = async () => {
    if (!ready || !currentUserId) return;
    const normalizedQuery = query.trim();
    if (!normalizedQuery) {
      setSearchResult(searchCandidates);
      return;
    }
    try {
      setSearching(true);
      setError("");
      const result = await searchSocialPlayers(currentUserId, normalizedQuery);
      const blocked = new Set<string>([
        ...(snapshot?.friends.map((item) => item.publicId) ?? []),
        ...(snapshot?.incomingRequests.map((item) => item.publicId) ?? []),
        ...(snapshot?.outgoingRequests.map((item) => item.publicId) ?? [])
      ]);
      setSearchResult(result.filter((user) => !blocked.has(user.publicId)));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Falha ao buscar jogadores.");
    } finally {
      setSearching(false);
    }
  };

  const handleSendRequest = async (targetPublicId: string) => {
    if (!ready || !currentUserId) return;
    try {
      setProcessingFriendId(targetPublicId);
      const next = await sendSocialFriendRequest(currentUserId, targetPublicId);
      setSnapshot(next);
      setSearchResult((current) => current.filter((item) => item.publicId !== targetPublicId));
      onBadgeCountChange?.(next.badgeCount);
      pushToast("Solicitacao enviada.", "success");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Falha ao enviar solicitacao.");
    } finally {
      setProcessingFriendId(null);
    }
  };

  const handleAccept = async (requesterPublicId: string) => {
    if (!ready || !currentUserId) return;
    try {
      setProcessingFriendId(requesterPublicId);
      const next = await acceptSocialFriendRequest(currentUserId, requesterPublicId);
      setSnapshot(next);
      onBadgeCountChange?.(next.badgeCount);
      pushToast("Solicitacao aceita.", "success");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Falha ao aceitar solicitacao.");
    } finally {
      setProcessingFriendId(null);
    }
  };

  const handleDecline = async (requesterPublicId: string) => {
    if (!ready || !currentUserId) return;
    try {
      setProcessingFriendId(requesterPublicId);
      const next = await declineSocialFriendRequest(currentUserId, requesterPublicId);
      setSnapshot(next);
      onBadgeCountChange?.(next.badgeCount);
      pushToast("Solicitacao recusada.", "warning");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Falha ao recusar solicitacao.");
    } finally {
      setProcessingFriendId(null);
    }
  };

  const handleCancelRequest = async (targetPublicId: string) => {
    if (!ready || !currentUserId) return;
    try {
      setProcessingFriendId(targetPublicId);
      const next = await cancelSocialFriendRequest(currentUserId, targetPublicId);
      setSnapshot(next);
      onBadgeCountChange?.(next.badgeCount);
      pushToast("Solicitacao cancelada.", "info");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Falha ao cancelar solicitacao.");
    } finally {
      setProcessingFriendId(null);
    }
  };

  const handleRemoveFriend = async (friendPublicId: string) => {
    if (!ready || !currentUserId) return;
    try {
      setProcessingFriendId(friendPublicId);
      const next = await removeSocialFriend(currentUserId, friendPublicId);
      setSnapshot(next);
      if (chatFriend?.publicId === friendPublicId) {
        setChatFriend(null);
        setChatMessages([]);
      }
      onBadgeCountChange?.(next.badgeCount);
      pushToast("Amigo removido.", "warning");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Falha ao remover amigo.");
    } finally {
      setProcessingFriendId(null);
    }
  };

  const handleSendChat = async () => {
    if (!chatFriend || !ready || !currentUserId || !chatInput.trim()) return;
    try {
      setChatSending(true);
      const nextMessages = await sendSocialMessage(currentUserId, chatFriend.publicId, chatInput);
      setChatMessages(nextMessages);
      setChatInput("");
      const nextSnapshot = await fetchSocialSnapshot(currentUserId);
      setSnapshot(nextSnapshot);
      onBadgeCountChange?.(nextSnapshot.badgeCount);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Falha ao enviar mensagem.");
    } finally {
      setChatSending(false);
    }
  };

  if (!playerLogged || !currentUserId || !currentUsername) {
    return (
      <GameCard title="Amigos" subtitle="Entre com sua conta para habilitar recursos sociais.">
        <p className="text-sm text-slate-300">Sistema de amigos e chat disponivel apenas para jogadores autenticados.</p>
      </GameCard>
    );
  }

  return (
    <div className="space-y-3">
      <GameCard
        title="Amigos"
        rightSlot={
          <button
            type="button"
            onClick={() => void refreshSnapshot(true)}
            className="fm-button rounded-md px-2.5 py-1 text-xs font-semibold"
          >
            Atualizar
          </button>
        }
      >
        <div className="mb-3 flex flex-wrap gap-2">
          {([
            { key: "FRIENDS", label: "Amigos" },
            { key: "REQUESTS", label: "Solicitacoes" },
            { key: "SEARCH", label: "Buscar Jogadores" }
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

        {loading ? (
          <div className="h-36 animate-pulse rounded-lg border border-slate-700/70 bg-slate-900/65" />
        ) : tab === "FRIENDS" ? (
          <div className="space-y-2">
            {snapshot?.friends.length ? (
              snapshot.friends.map((friend) => {
                const canChallenge = friend.presence === "ONLINE";
                const unread = snapshot.unreadByFriend[friend.publicId] ?? 0;
                return (
                  <article key={friend.publicId} className="rounded-lg border border-slate-700/75 bg-slate-900/65 p-2.5">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex min-w-0 items-center gap-2">
                        <span className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-slate-500/70 bg-slate-800/85 text-xs font-semibold text-slate-100">
                          {initials(friend.username)}
                        </span>
                        <div className="min-w-0">
                          <p className="truncate text-sm font-semibold text-slate-100">{friend.username}</p>
                          <p className="mt-0.5 inline-flex items-center gap-1 text-[11px] text-slate-300">
                            <span className={`h-2 w-2 rounded-full ${presenceDotClass(friend.presence)}`} />
                            {presenceLabel(friend.presence)}
                          </p>
                        </div>
                      </div>
                      <div className="flex flex-wrap items-center gap-1.5">
                        <button
                          type="button"
                          disabled={!canChallenge}
                          onClick={() => onChallengeFriend?.(friend)}
                          className="fm-button rounded-md px-2.5 py-1 text-xs font-semibold disabled:cursor-not-allowed disabled:opacity-45"
                        >
                          {friend.presence === "IN_DUEL" ? "Em duelo" : "Desafiar"}
                        </button>
                        <button type="button" onClick={() => setChatFriend(friend)} className="fm-button rounded-md px-2.5 py-1 text-xs font-semibold">
                          Mensagem {unread > 0 ? `(${unread})` : ""}
                        </button>
                        <button
                          type="button"
                          onClick={() => void handleRemoveFriend(friend.publicId)}
                          disabled={processingFriendId === friend.publicId}
                          className="rounded-md border border-rose-400/55 bg-rose-900/30 px-2.5 py-1 text-xs font-semibold text-rose-100 disabled:cursor-not-allowed disabled:opacity-45"
                        >
                          Remover
                        </button>
                      </div>
                    </div>
                  </article>
                );
              })
            ) : (
              <p className="rounded-lg border border-slate-700/70 bg-slate-900/65 p-3 text-sm text-slate-300">
                Voce ainda nao possui amigos. Use a aba Buscar Jogadores para adicionar.
              </p>
            )}
          </div>
        ) : tab === "REQUESTS" ? (
          <div className="grid gap-3 lg:grid-cols-2">
            <section className="rounded-lg border border-slate-700/75 bg-slate-900/65 p-2.5">
              <p className="mb-2 text-xs font-semibold uppercase tracking-[0.08em] text-slate-300">Recebidas</p>
              <div className="space-y-2">
                {snapshot?.incomingRequests.length ? (
                  snapshot.incomingRequests.map((user) => (
                    <article key={user.publicId} className="rounded border border-slate-700/70 bg-slate-950/55 p-2">
                      <div className="flex items-center justify-between gap-2">
                        <p className="truncate text-sm font-semibold text-slate-100">{user.username}</p>
                        <div className="flex gap-1">
                          <button
                            type="button"
                            onClick={() => void handleAccept(user.publicId)}
                            disabled={processingFriendId === user.publicId}
                            className="rounded-md border border-emerald-400/60 bg-emerald-900/35 px-2 py-1 text-[11px] font-semibold text-emerald-100 disabled:opacity-45"
                          >
                            Aceitar
                          </button>
                          <button
                            type="button"
                            onClick={() => void handleDecline(user.publicId)}
                            disabled={processingFriendId === user.publicId}
                            className="rounded-md border border-rose-400/60 bg-rose-900/35 px-2 py-1 text-[11px] font-semibold text-rose-100 disabled:opacity-45"
                          >
                            Recusar
                          </button>
                        </div>
                      </div>
                    </article>
                  ))
                ) : (
                  <p className="text-xs text-slate-300">Nenhuma solicitacao recebida.</p>
                )}
              </div>
            </section>

            <section className="rounded-lg border border-slate-700/75 bg-slate-900/65 p-2.5">
              <p className="mb-2 text-xs font-semibold uppercase tracking-[0.08em] text-slate-300">Enviadas</p>
              <div className="space-y-2">
                {snapshot?.outgoingRequests.length ? (
                  snapshot.outgoingRequests.map((user) => (
                    <article key={user.publicId} className="rounded border border-slate-700/70 bg-slate-950/55 p-2">
                      <div className="flex items-center justify-between gap-2">
                        <p className="truncate text-sm font-semibold text-slate-100">{user.username}</p>
                        <button
                          type="button"
                          onClick={() => void handleCancelRequest(user.publicId)}
                          disabled={processingFriendId === user.publicId}
                          className="rounded-md border border-amber-300/55 bg-amber-900/35 px-2 py-1 text-[11px] font-semibold text-amber-100 disabled:opacity-45"
                        >
                          Cancelar
                        </button>
                      </div>
                    </article>
                  ))
                ) : (
                  <p className="text-xs text-slate-300">Sem solicitacoes pendentes.</p>
                )}
              </div>
            </section>
          </div>
        ) : (
          <div className="space-y-2">
            <div className="flex flex-wrap gap-2">
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Buscar por nome..."
                className="w-full max-w-[320px] rounded-lg border border-slate-700/85 bg-slate-900/80 px-3 py-2 text-sm text-slate-100 outline-none transition focus:border-cyan-300/60"
              />
              <button
                type="button"
                onClick={() => void handleSearch()}
                disabled={searching}
                className="fm-button rounded-lg px-3 py-2 text-xs font-semibold disabled:opacity-45"
              >
                {searching ? "Buscando..." : "Buscar"}
              </button>
            </div>
            <div className="max-h-[340px] space-y-2 overflow-y-auto pr-1">
              {(query.trim() ? searchResult : searchCandidates).map((candidate) => (
                <article key={candidate.publicId} className="rounded border border-slate-700/75 bg-slate-900/65 p-2">
                  <div className="flex items-center justify-between gap-2">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-slate-100">{candidate.username}</p>
                      <p className="text-[11px] text-slate-300">{presenceLabel(candidate.presence)}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => void handleSendRequest(candidate.publicId)}
                      disabled={processingFriendId === candidate.publicId}
                      className="fm-button rounded px-2.5 py-1 text-xs font-semibold disabled:opacity-45"
                    >
                      Adicionar
                    </button>
                  </div>
                </article>
              ))}
              {!query.trim() && !searchCandidates.length ? (
                <p className="text-xs text-slate-300">Nenhum jogador disponivel para adicionar no momento.</p>
              ) : null}
              {query.trim() && !searchResult.length && !searching ? <p className="text-xs text-slate-300">Nenhum jogador encontrado.</p> : null}
            </div>
          </div>
        )}
      </GameCard>

      {chatFriend ? (
        <section className="fm-panel rounded-xl border border-amber-300/40 bg-slate-950/80 p-3 shadow-[0_16px_36px_rgba(0,0,0,0.45)] backdrop-blur-[2px]">
          <div className="mb-2 flex items-center justify-between gap-2">
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-amber-100">Chat com {chatFriend.username}</p>
              <p className="text-[11px] text-slate-300">{presenceLabel(chatFriend.presence)}</p>
            </div>
            <button type="button" onClick={() => setChatFriend(null)} className="fm-button rounded-md px-2 py-1 text-[11px] font-semibold">
              Fechar
            </button>
          </div>
          <div className="fm-scroll max-h-[320px] space-y-2 overflow-y-auto rounded-lg border border-slate-700/70 bg-slate-900/60 p-2">
            {chatMessages.map((message) => {
              const own = message.fromPublicId === currentUserId;
              return (
                <div key={message.id} className={`flex ${own ? "justify-end" : "justify-start"}`}>
                  <div
                    className={`max-w-[86%] rounded-lg border px-2.5 py-1.5 text-xs ${
                      own
                        ? "border-cyan-300/55 bg-cyan-900/35 text-cyan-100"
                        : "border-slate-600/70 bg-slate-800/75 text-slate-100"
                    }`}
                  >
                    <p>{message.text}</p>
                    <p className="mt-1 text-[10px] opacity-75">
                      {new Date(message.createdAt).toLocaleTimeString("pt-BR", { hour12: false })}
                    </p>
                  </div>
                </div>
              );
            })}
            {!chatMessages.length ? <p className="text-[11px] text-slate-300">Sem mensagens ainda.</p> : null}
          </div>
          <div className="mt-2 flex gap-2">
            <input
              value={chatInput}
              onChange={(event) => setChatInput(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault();
                  void handleSendChat();
                }
              }}
              placeholder="Digite uma mensagem..."
              className="w-full rounded-lg border border-slate-700/85 bg-slate-900/80 px-3 py-2 text-sm text-slate-100 outline-none transition focus:border-cyan-300/60"
            />
            <button
              type="button"
              onClick={() => void handleSendChat()}
              disabled={chatSending || !chatInput.trim()}
              className="fm-button rounded-lg px-3 py-2 text-xs font-semibold disabled:opacity-45"
            >
              {chatSending ? "..." : "Enviar"}
            </button>
          </div>
        </section>
      ) : null}

      {error ? <p className="rounded border border-rose-500/60 bg-rose-900/30 px-3 py-2 text-sm text-rose-100">{error}</p> : null}

      <div className="pointer-events-none fixed right-4 top-4 z-[140] flex w-[min(340px,92vw)] flex-col gap-2">
        {toasts.map((toast) => (
          <button
            key={toast.id}
            type="button"
            onClick={() => removeToast(toast.id)}
            className={`pointer-events-auto rounded-lg border px-3 py-2 text-left text-xs shadow-[0_12px_30px_rgba(0,0,0,0.42)] ${
              toast.tone === "success"
                ? "border-emerald-300/50 bg-emerald-900/40 text-emerald-100"
                : toast.tone === "warning"
                  ? "border-amber-300/50 bg-amber-900/40 text-amber-100"
                  : "border-cyan-300/45 bg-cyan-900/35 text-cyan-100"
            }`}
          >
            {toast.text}
          </button>
        ))}
      </div>
    </div>
  );
}
