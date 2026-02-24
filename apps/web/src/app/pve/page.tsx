"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { CARD_INDEX } from "@ruptura-arcana/game";
import {
  fetchPlayerProfile,
  fetchPveDropProgress,
  fetchPveNpcs,
  getStoredPublicId,
  startPveMatch,
  type PlayerProfile,
  type PveDropProgress,
  type PveNpc
} from "../../lib/api";
import { HudStage } from "../../components/ui/HudStage";

function unlockText(npc: PveNpc): string {
  if (npc.unlockRequirement.type === "NONE") return "Disponivel desde o inicio";
  if (npc.unlockRequirement.type === "DEFEAT_NPC") return `Derrote ${npc.unlockRequirement.npcId}`;
  return `Venca ${npc.unlockRequirement.wins} duelos PVE`;
}

function normalizeSlug(value: string): string {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

function buildPortraitCandidates(npc: PveNpc): string[] {
  const candidates: string[] = [];
  const push = (path: string | null | undefined): void => {
    if (!path || !path.trim()) return;
    if (!candidates.includes(path)) candidates.push(path);
  };
  const aliasByName: Record<string, string[]> = {
    DarkNite: ["Nitemare", "Dark_Nite"],
    "Guardian Sebek": ["Sebek"],
    "Guardian Neku": ["Neku"]
  };

  const baseName = npc.name.trim();
  const nameNoOrdinal = baseName.replace(/\s+\d+(st|nd|rd|th)$/i, "").trim();
  const nameNoGuardian = nameNoOrdinal.replace(/^Guardian\s+/i, "").trim();
  const idTail = npc.id.replace(/^FM_\d+_/, "").replace(/_/g, " ").trim();

  const variants = new Set<string>([baseName, nameNoOrdinal, nameNoGuardian, idTail]);
  for (const value of variants) {
    if (!value) continue;
    push(`/images/npcs/${value}.png`);
    push(`/images/npcs/${value.replace(/\s+/g, "_")}.png`);
    push(`/images/npcs/${value.replace(/\s+/g, "-")}.png`);
    push(`/images/npcs/${value.replace(/[^A-Za-z0-9]/g, "")}.png`);
    push(`/images/npcs/${value.toLowerCase().replace(/\s+/g, "_")}.png`);
    push(`/images/npcs/${normalizeSlug(value)}.png`);
  }

  for (const alias of aliasByName[baseName] ?? []) {
    push(`/images/npcs/${alias}.png`);
    push(`/images/npcs/${alias.replace(/\s+/g, "_")}.png`);
    push(`/images/npcs/${normalizeSlug(alias)}.png`);
  }

  push(npc.portraitPath);
  push(npc.portraitAltPath);
  push(npc.fallbackPortraitPath);
  push("/images/cartas/Back-FMR-EN-VG.png");

  return candidates;
}

export default function PvePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [player, setPlayer] = useState<PlayerProfile | null>(null);
  const [npcs, setNpcs] = useState<PveNpc[]>([]);
  const [dropProgressByNpcId, setDropProgressByNpcId] = useState<Record<string, PveDropProgress>>({});
  const [busyNpcId, setBusyNpcId] = useState<string | null>(null);
  const [portraitIndexByNpcId, setPortraitIndexByNpcId] = useState<Record<string, number>>({});
  const [error, setError] = useState("");

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        setError("");
        const publicId = getStoredPublicId();
        if (!publicId) {
          throw new Error("Sessao nao encontrada. Faca login no lobby.");
        }
        const profile = await fetchPlayerProfile(publicId);
        setPlayer(profile);
        const [rows, dropProgress] = await Promise.all([fetchPveNpcs(publicId), fetchPveDropProgress(publicId).catch(() => [])]);
        setNpcs(rows);
        setDropProgressByNpcId(
          dropProgress.reduce<Record<string, PveDropProgress>>((acc, row) => {
            acc[row.npcId] = row;
            return acc;
          }, {})
        );
      } catch (err) {
        setError(err instanceof Error ? err.message : "Falha ao carregar campanha PVE.");
      } finally {
        setLoading(false);
      }
    };

    void load();
  }, []);

  const groupedByTier = useMemo(() => {
    const groups = new Map<number, PveNpc[]>();
    for (const npc of npcs) {
      const list = groups.get(npc.tier) ?? [];
      list.push(npc);
      groups.set(npc.tier, list);
    }
    return Array.from(groups.entries()).sort((a, b) => a[0] - b[0]);
  }, [npcs]);

  const handleDuel = async (npc: PveNpc) => {
    if (!player || !npc.unlocked) return;
    try {
      setBusyNpcId(npc.id);
      setError("");
      const start = await startPveMatch(player.publicId, npc.id);
      router.push(`/match?roomCode=${start.roomCode}&username=${encodeURIComponent(player.username)}&mode=PVE`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Nao foi possivel iniciar o duelo PVE.");
    } finally {
      setBusyNpcId(null);
    }
  };

  const getPortraitSrc = (npc: PveNpc): string => {
    const candidates = buildPortraitCandidates(npc);
    const index = portraitIndexByNpcId[npc.id] ?? 0;
    return candidates[Math.min(index, candidates.length - 1)] ?? "/images/cartas/Back-FMR-EN-VG.png";
  };

  const handlePortraitError = (npc: PveNpc): void => {
    setPortraitIndexByNpcId((current) => {
      const index = current[npc.id] ?? 0;
      const maxIndex = Math.max(0, buildPortraitCandidates(npc).length - 1);
      if (index >= maxIndex) return current;
      return {
        ...current,
        [npc.id]: index + 1
      };
    });
  };

  return (
    <HudStage>
      <div className="mx-auto w-full max-w-[1400px] space-y-4 pb-4">
        <header className="fm-panel fm-frame rounded-xl px-4 py-3">
          <h1 className="fm-title text-xl font-bold text-emerald-200">Campanha PVE</h1>
          <p className="fm-subtitle text-xs">NPCs inspirados em Yu-Gi-Oh! Forbidden Memories, com decks e drops sincronizados no backend.</p>
          <p className="mt-1 text-[10px] text-slate-400">Retratos personalizados: coloque PNGs em <code>/public/images/npcs</code> usando o id do NPC (ex.: <code>FM_01_SIMON_MURAN.png</code>).</p>
        </header>

        {loading && <section className="fm-panel fm-frame rounded-xl p-4 text-sm text-slate-300">Carregando NPCs...</section>}

        {!loading &&
          groupedByTier.map(([tier, entries]) => (
            <section key={tier} className="fm-panel fm-frame rounded-xl p-4">
              <h2 className="fm-title text-sm font-semibold uppercase tracking-wider">
                Tier {tier} - {entries.length} NPCs - {entries.filter((entry) => entry.unlocked).length} desbloqueados
              </h2>
              <div className="mt-3 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                {entries.map((npc) => (
                  <article key={npc.id} className={`rounded-lg border p-3 ${npc.unlocked ? "fm-panel border-emerald-500/40 bg-emerald-900/20" : "fm-panel border-slate-700 bg-slate-950/45 opacity-80"}`}>
                    <div className="relative mb-3 overflow-hidden rounded-md border border-cyan-700/40 bg-slate-950/60">
                      <div className="aspect-[4/3]">
                        <img
                          src={getPortraitSrc(npc)}
                          alt={npc.name}
                          className="h-full w-full object-cover"
                          loading="lazy"
                          onError={() => handlePortraitError(npc)}
                        />
                      </div>
                      <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-slate-950/95 via-slate-950/40 to-transparent p-2">
                        <div className="flex items-center justify-between gap-2">
                          <h3 className="truncate text-sm font-semibold text-slate-100">{npc.name}</h3>
                          <span className="fm-chip rounded-full px-2 py-0.5 text-[10px] text-slate-200">{npc.defeated ? "Derrotado" : "Pendente"}</span>
                        </div>
                        <p className="mt-0.5 truncate text-[10px] text-cyan-200/90">Carta assinatura: {npc.aceCardName ?? "Nao definida"}</p>
                      </div>
                    </div>
                    <p className="mt-1 text-xs text-slate-300">Recompensa base: {npc.rewardGold} gold</p>
                    <p className="mt-1 text-xs text-slate-400">Desbloqueio: {unlockText(npc)}</p>
                    <div className="mt-2 rounded border border-cyan-500/35 bg-cyan-950/20 px-2 py-1.5 text-[11px] text-cyan-100">
                      {(() => {
                        const tracker = dropProgressByNpcId[npc.id];
                        if (!tracker) {
                          return "Tracker de drops: sem dados ainda.";
                        }
                        return `Tracker de drops: ${tracker.obtainedCount}/${tracker.totalPossible} obtidas | faltam ${tracker.missingCount}.`;
                      })()}
                    </div>
                    <div className="fm-chip mt-2 rounded p-2">
                      <div className="flex items-center justify-between">
                        <p className="text-[11px] font-semibold text-slate-200">Drops</p>
                        <p className="text-[10px] text-slate-400">{npc.rewardCards.length} possiveis</p>
                      </div>
                      <ul className="mt-1 max-h-32 space-y-1 overflow-y-auto pr-1 text-[11px] text-slate-300">
                        {npc.rewardCards.map((drop) => {
                          const tracker = dropProgressByNpcId[npc.id];
                          const owned = Boolean(tracker?.obtainedCardIds.includes(drop.cardId));
                          return (
                            <li key={`${npc.id}-${drop.cardId}`} className="fm-chip flex items-center justify-between gap-3 rounded px-1.5 py-1">
                            <span className="truncate">{CARD_INDEX[drop.cardId]?.name ?? drop.cardId}</span>
                            <span className={`shrink-0 ${owned ? "text-emerald-200" : "text-cyan-200"}`}>
                              {Math.round(drop.chance * 100)}% - x{drop.minCount}-{drop.maxCount}
                            </span>
                            <span className="shrink-0 text-[10px] text-slate-300">{owned ? "obtida" : "faltando"}</span>
                          </li>
                          );
                        })}
                        {npc.rewardCards.length === 0 && <li>Sem drop configurado.</li>}
                      </ul>
                    </div>
                    <button
                      type="button"
                      onClick={() => void handleDuel(npc)}
                      disabled={!npc.unlocked || busyNpcId === npc.id}
                      className="fm-button mt-3 w-full rounded-lg px-3 py-2 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-45"
                    >
                      {busyNpcId === npc.id ? "Iniciando..." : npc.unlocked ? "Duelar" : "Bloqueado"}
                    </button>
                  </article>
                ))}
              </div>
            </section>
          ))}

        <div className="flex flex-wrap gap-2">
          <Link href="/" className="fm-button rounded-lg px-3 py-2 text-xs font-semibold">
            Voltar ao Lobby
          </Link>
          <Link href="/deck-builder" className="fm-button rounded-lg px-3 py-2 text-xs font-semibold text-amber-100">
            Editar Deck
          </Link>
          <Link href="/match" className="fm-button rounded-lg px-3 py-2 text-xs font-semibold text-cyan-100">
            Ir para PVP
          </Link>
        </div>

        {error && <p className="rounded border border-rose-500/60 bg-rose-900/30 px-3 py-2 text-sm text-rose-100">{error}</p>}
      </div>
    </HudStage>
  );
}
