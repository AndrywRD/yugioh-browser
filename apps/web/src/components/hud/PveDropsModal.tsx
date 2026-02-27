"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { CARD_INDEX } from "@ruptura-arcana/game";

interface PveRewardCard {
  cardId: string;
  count: number;
}

interface PveDropsModalProps {
  visible: boolean;
  didWin: boolean;
  npcId: string;
  rewardGold: number;
  rewardCards: PveRewardCard[];
  onLeave: () => void;
  onCampaign: () => void;
  onRematch?: () => void;
  canRematch?: boolean;
  rematchBusy?: boolean;
}

export function PveDropsModal({
  visible,
  didWin,
  npcId,
  rewardGold,
  rewardCards,
  onLeave,
  onCampaign,
  onRematch,
  canRematch = false,
  rematchBusy = false
}: PveDropsModalProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    return () => setMounted(false);
  }, []);

  if (!visible || !mounted) return null;

  return createPortal(
    <div className="fixed inset-0 z-[90] flex items-center justify-center bg-black/80 backdrop-blur-[3px]">
      <div className="w-[580px] max-w-[95vw] rounded-2xl border border-amber-200/55 bg-[linear-gradient(180deg,rgba(6,15,30,0.985),rgba(3,8,18,0.995))] p-5 shadow-[0_26px_58px_rgba(0,0,0,0.74)]">
        <div className="mb-4 rounded-lg border border-slate-700/80 bg-slate-900/65 px-3 py-2">
          <h2 className={`text-2xl font-black uppercase tracking-[0.12em] ${didWin ? "text-amber-200" : "text-rose-300"}`}>
            {didWin ? "Recompensas PVE" : "Derrota PVE"}
          </h2>
          {didWin ? (
            <p className="mt-1 text-sm font-semibold text-emerald-200 [text-shadow:0_1px_2px_rgba(0,0,0,0.92)]">Gold recebido: +{rewardGold}</p>
          ) : (
            <p className="mt-1 text-sm font-medium text-slate-200 [text-shadow:0_1px_2px_rgba(0,0,0,0.92)]">Sem recompensas neste duelo.</p>
          )}
        </div>

        <div className="fm-scroll max-h-[46vh] overflow-y-auto pr-1">
          {didWin && rewardCards.length > 0 ? (
            <ul className="space-y-2">
              {rewardCards.map((drop, index) => {
                const card = CARD_INDEX[drop.cardId];
                const isMonster = card?.kind === "MONSTER";
                const isSpell = card?.kind === "SPELL";
                const typeLabel = isMonster
                  ? `ATK/DEF: ${card?.atk ?? 0}/${card?.def ?? 0}`
                  : isSpell
                    ? card?.effectKey?.startsWith("EQUIP")
                      ? "SPELL EQUIP"
                      : "SPELL"
                    : "TRAP";
                return (
                  <li key={`${drop.cardId}-${index}`} className="flex items-center gap-3 rounded-lg border border-slate-600/90 bg-slate-900/85 p-2">
                    <div className="h-16 w-12 shrink-0 overflow-hidden rounded border border-slate-600 bg-slate-950">
                      {card?.imagePath ? (
                        <img src={card.imagePath} alt={card.name} className="h-full w-full object-cover" loading="lazy" />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center text-[10px] text-slate-400">No Art</div>
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-slate-100 [text-shadow:0_1px_2px_rgba(0,0,0,0.9)]">{card?.name ?? drop.cardId}</p>
                      <p className="text-[11px] font-medium text-slate-300">{typeLabel}</p>
                    </div>
                    <span className="rounded bg-amber-800/70 px-2 py-1 text-xs font-semibold text-amber-100">x{drop.count}</span>
                  </li>
                );
              })}
            </ul>
          ) : (
            <p className="rounded-lg border border-slate-700 bg-slate-900/70 p-3 text-sm text-slate-300">
              {didWin ? "Nenhuma carta dropada nesta vitoria." : "Tente novamente para obter drops."}
            </p>
          )}
        </div>

        <div className="mt-4 flex justify-end gap-2">
          {canRematch ? (
            <button
              type="button"
              onClick={onRematch}
              disabled={rematchBusy}
              className="rounded-lg border border-cyan-300/65 bg-cyan-700/80 px-4 py-2 text-sm font-semibold text-cyan-50 disabled:cursor-not-allowed disabled:opacity-45 hover:bg-cyan-600"
            >
              {rematchBusy ? "Iniciando..." : "Revanche"}
            </button>
          ) : null}
          <button
            type="button"
            onClick={onCampaign}
            className="rounded-lg border border-cyan-300/65 bg-cyan-700/80 px-4 py-2 text-sm font-semibold text-cyan-50 hover:bg-cyan-600"
          >
            Voltar Campanha
          </button>
          <button
            type="button"
            onClick={onLeave}
            className="rounded-lg border border-amber-300/60 bg-amber-700/85 px-4 py-2 text-sm font-semibold text-amber-100 hover:bg-amber-600"
          >
            Voltar Lobby
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
