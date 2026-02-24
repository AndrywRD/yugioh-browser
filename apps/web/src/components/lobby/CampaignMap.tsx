import { useMemo, useState } from "react";
import type { PveNpc } from "../../lib/api";
import { SkeletonCard } from "./SkeletonCard";
import { NodeModal } from "./NodeModal";

interface CampaignMapProps {
  loading: boolean;
  npcs: PveNpc[];
  busyNpcId: string | null;
  onDuel: (npcId: string) => void;
}

interface MapNode {
  npc: PveNpc;
  x: number;
  y: number;
}

function buildNodePositions(npcs: PveNpc[]): MapNode[] {
  const sorted = [...npcs].sort((left, right) => left.tier - right.tier || left.name.localeCompare(right.name)).slice(0, 12);
  const xPattern = [12, 28, 45, 60, 78, 88];

  return sorted.map((npc, index) => {
    const row = Math.floor(index / 3);
    const col = index % 3;
    const x = xPattern[(row + col) % xPattern.length];
    const y = 12 + row * 20 + (col === 1 ? 4 : 0);
    return { npc, x, y };
  });
}

function nodeClassName(npc: PveNpc): string {
  if (!npc.unlocked) {
    return "border-slate-600 bg-slate-800 text-slate-400";
  }
  if (npc.defeated) {
    return "border-emerald-300/70 bg-emerald-700/55 text-emerald-100 shadow-[0_0_12px_rgba(16,185,129,0.45)]";
  }
  return "border-amber-300/85 bg-amber-700/55 text-amber-50 shadow-[0_0_12px_rgba(245,158,11,0.45)]";
}

export function CampaignMap({ loading, npcs, busyNpcId, onDuel }: CampaignMapProps) {
  const nodes = useMemo(() => buildNodePositions(npcs), [npcs]);
  const [selectedNpc, setSelectedNpc] = useState<PveNpc | null>(null);

  if (loading) {
    return <SkeletonCard className="min-h-[220px]" />;
  }

  if (nodes.length === 0) {
    return (
      <div className="flex min-h-[220px] items-center justify-center rounded-lg border border-slate-700/75 bg-slate-900/60 p-4 text-center text-sm text-slate-300">
        Inicie a campanha para desbloquear o mapa de duelos.
      </div>
    );
  }

  return (
    <>
      <div className="relative min-h-[220px] overflow-hidden rounded-lg border border-slate-700/75 bg-[radial-gradient(circle_at_35%_30%,rgba(84,148,255,0.18),rgba(3,12,30,0.78))]">
        <svg className="pointer-events-none absolute inset-0 h-full w-full opacity-70" viewBox="0 0 100 100" preserveAspectRatio="none">
          {nodes.map((node, index) => {
            if (index === 0) return null;
            const previous = nodes[index - 1];
            return (
              <line
                key={`link-${node.npc.id}`}
                x1={previous.x}
                y1={previous.y}
                x2={node.x}
                y2={node.y}
                stroke="rgba(125,211,252,0.35)"
                strokeWidth="0.7"
              />
            );
          })}
        </svg>

        {nodes.map((node) => (
          <button
            key={node.npc.id}
            type="button"
            title={`${node.npc.name} - T${node.npc.tier}`}
            onClick={() => setSelectedNpc(node.npc)}
            className={`lobby-motion-card absolute flex h-8 w-8 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border text-[11px] font-bold ${nodeClassName(node.npc)}`}
            style={{ left: `${node.x}%`, top: `${node.y}%` }}
          >
            {node.npc.unlocked ? (node.npc.defeated ? "✓" : `T${node.npc.tier}`) : "🔒"}
          </button>
        ))}
      </div>

      <NodeModal
        npc={selectedNpc}
        busy={selectedNpc ? busyNpcId === selectedNpc.id : false}
        onClose={() => setSelectedNpc(null)}
        onDuel={(npcId) => {
          onDuel(npcId);
          setSelectedNpc(null);
        }}
      />
    </>
  );
}

