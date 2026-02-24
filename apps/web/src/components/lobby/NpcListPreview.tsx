import { useMemo, useState } from "react";
import type { PveNpc } from "../../lib/api";
import { NpcCard } from "./NpcCard";
import { SkeletonCard } from "./SkeletonCard";

interface NpcListPreviewProps {
  loading: boolean;
  npcs: PveNpc[];
  busyNpcId: string | null;
  onDuel: (npcId: string) => void;
}

function getUnlockedSorted(npcs: PveNpc[]): PveNpc[] {
  return [...npcs]
    .filter((npc) => npc.unlocked)
    .sort((left, right) => left.tier - right.tier || Number(left.defeated) - Number(right.defeated) || left.name.localeCompare(right.name));
}

function getAllSorted(npcs: PveNpc[]): PveNpc[] {
  return [...npcs].sort((left, right) => left.tier - right.tier || Number(right.unlocked) - Number(left.unlocked) || left.name.localeCompare(right.name));
}

function getRecommended(unlocked: PveNpc[]): string | null {
  const notDefeated = unlocked.find((npc) => !npc.defeated);
  if (notDefeated) return notDefeated.id;
  return unlocked[0]?.id ?? null;
}

export function NpcListPreview({ loading, npcs, busyNpcId, onDuel }: NpcListPreviewProps) {
  const [showAll, setShowAll] = useState(false);
  const unlocked = useMemo(() => getUnlockedSorted(npcs), [npcs]);
  const allNpcs = useMemo(() => getAllSorted(npcs), [npcs]);
  const recommendedId = useMemo(() => getRecommended(unlocked), [unlocked]);
  const preview = unlocked.slice(0, 3);

  return (
    <>
      {loading ? (
        <div className="grid gap-2">
          <SkeletonCard className="h-[108px]" />
          <SkeletonCard className="h-[108px]" />
          <SkeletonCard className="h-[108px]" />
        </div>
      ) : preview.length === 0 ? (
        <div className="rounded-lg border border-slate-700/75 bg-slate-900/65 p-4 text-sm text-slate-300">
          Inicie a campanha para desbloquear seus primeiros desafios.
        </div>
      ) : (
        <div className="space-y-2">
          <div className="grid gap-2 md:grid-cols-3">
            {preview.map((npc) => (
              <NpcCard
                key={npc.id}
                npc={npc}
                recommended={recommendedId === npc.id}
                busy={busyNpcId === npc.id}
                onDuel={onDuel}
              />
            ))}
          </div>
          <div className="flex justify-end">
            <button type="button" onClick={() => setShowAll(true)} className="fm-link text-xs font-semibold">
              Ver todos os NPCs
            </button>
          </div>
        </div>
      )}

      {showAll ? (
        <div className="fixed inset-0 z-modal flex items-center justify-center bg-black/60 p-4" onClick={() => setShowAll(false)}>
          <div
            className="w-full max-w-4xl rounded-xl border border-[#d0aa63]/65 bg-[linear-gradient(180deg,rgba(8,19,42,0.96),rgba(5,13,30,0.98))] p-4 shadow-[0_20px_40px_rgba(0,0,0,0.45)]"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="mb-3 flex items-center justify-between">
              <h3 className="fm-title text-sm font-bold tracking-[0.12em]">Todos os desafios</h3>
              <button type="button" onClick={() => setShowAll(false)} className="fm-button rounded-md px-2.5 py-1 text-xs font-semibold">
                Fechar
              </button>
            </div>

            <div className="fm-scroll max-h-[64vh] overflow-y-auto pr-1">
              <div className="grid gap-2 md:grid-cols-2">
                {allNpcs.map((npc) => (
                  <NpcCard
                    key={`all-${npc.id}`}
                    npc={npc}
                    compact
                    recommended={recommendedId === npc.id}
                    busy={busyNpcId === npc.id}
                    onDuel={onDuel}
                  />
                ))}
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
