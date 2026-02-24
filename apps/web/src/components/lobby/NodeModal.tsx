import type { PveNpc } from "../../lib/api";
import { getUnlockRequirementLabel } from "./types";

interface NodeModalProps {
  npc: PveNpc | null;
  busy: boolean;
  onClose: () => void;
  onDuel: (npcId: string) => void;
}

export function NodeModal({ npc, busy, onClose, onDuel }: NodeModalProps) {
  if (!npc) return null;

  return (
    <div className="fixed inset-0 z-modal flex items-center justify-center bg-black/60 p-4" onClick={onClose}>
      <div
        className="w-full max-w-lg rounded-xl border border-[#d0aa63]/65 bg-[linear-gradient(180deg,rgba(8,19,42,0.96),rgba(5,13,30,0.98))] p-4 shadow-[0_20px_40px_rgba(0,0,0,0.45)]"
        onClick={(event) => event.stopPropagation()}
      >
        <h3 className="fm-title text-sm font-bold tracking-[0.12em]">{npc.name}</h3>
        <p className="mt-1 text-xs text-slate-300">Tier T{npc.tier}</p>

        <div className="mt-3 rounded-lg border border-slate-700/75 bg-slate-900/70 p-3 text-xs text-slate-200">
          <p>Status: {npc.unlocked ? (npc.defeated ? "Concluido" : "Disponivel") : "Bloqueado"}</p>
          <p className="mt-1">Recompensa base: {npc.rewardGold} gold</p>
          <p className="mt-1">Drops possiveis: {npc.rewardCards.length}</p>
          <p className="mt-1 text-slate-300">Requisito: {getUnlockRequirementLabel(npc)}</p>
        </div>

        <div className="mt-4 flex items-center justify-end gap-2">
          <button type="button" onClick={onClose} className="fm-button rounded-lg px-3 py-1.5 text-xs font-semibold">
            Fechar
          </button>
          <button
            type="button"
            onClick={() => onDuel(npc.id)}
            disabled={!npc.unlocked || busy}
            className="lobby-pressable rounded-lg border border-amber-300/80 bg-[linear-gradient(180deg,rgba(174,118,28,0.96),rgba(118,78,18,0.98))] px-3 py-1.5 text-xs font-semibold text-amber-50 shadow-[inset_0_1px_0_rgba(255,234,187,0.3)] transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-45"
          >
            {busy ? "Conectando..." : npc.unlocked ? "Duelar" : "Bloqueado"}
          </button>
        </div>
      </div>
    </div>
  );
}

