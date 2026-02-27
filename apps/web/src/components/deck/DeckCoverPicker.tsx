import { useEffect, useMemo, useState } from "react";
import { CARD_INDEX } from "@ruptura-arcana/game";
import type { Deck } from "@ruptura-arcana/shared";
import { getDeckCoverCardId, setDeckCoverCardId } from "../../lib/deckCover";

const CARD_BACK_SRC = "/images/cartas/back.jpg";

interface DeckCoverPickerProps {
  deck: Deck | null;
  label?: string;
  className?: string;
}

export function DeckCoverPicker({ deck, label = "Arte principal", className = "" }: DeckCoverPickerProps) {
  const [selectedCardId, setSelectedCardId] = useState<string | null>(null);

  const cardOptions = useMemo(() => {
    if (!deck) return [];
    return deck.cards.map((entry) => {
      const template = CARD_INDEX[entry.cardId];
      return {
        cardId: entry.cardId,
        count: entry.count,
        name: template?.name ?? entry.cardId,
        imagePath: template?.imagePath ?? ""
      };
    });
  }, [deck?.id, deck?.updatedAt]);

  useEffect(() => {
    if (!deck) {
      setSelectedCardId(null);
      return;
    }
    const stored = getDeckCoverCardId(deck.id);
    const valid = stored && deck.cards.some((entry) => entry.cardId === stored) ? stored : deck.cards[0]?.cardId ?? null;
    setSelectedCardId(valid);
    if (valid) {
      setDeckCoverCardId(deck.id, valid);
    }
  }, [deck?.id, deck?.updatedAt]);

  const selectedCard = cardOptions.find((option) => option.cardId === selectedCardId) ?? cardOptions[0] ?? null;
  const coverImage = selectedCard?.imagePath || "";

  return (
    <div className={`grid gap-2 ${className}`}>
      <label className="text-[11px] uppercase tracking-[0.12em] text-slate-400">{label}</label>
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2">
          <div className="h-[86px] w-[62px] overflow-hidden rounded border border-amber-300/50 bg-slate-950">
            {coverImage ? <img src={coverImage} alt={selectedCard?.name ?? "Carta do deck"} className="h-full w-full object-cover" /> : null}
          </div>
          <div className="h-[86px] w-[62px] overflow-hidden rounded border border-slate-500/70 bg-slate-950">
            <img src={CARD_BACK_SRC} alt="Verso da carta" className="h-full w-full object-cover" />
          </div>
        </div>

        <select
          value={selectedCardId ?? ""}
          onChange={(event) => {
            if (!deck) return;
            const next = event.target.value;
            setSelectedCardId(next);
            setDeckCoverCardId(deck.id, next);
          }}
          disabled={!deck || cardOptions.length === 0}
          className="min-w-[210px] flex-1 rounded-lg border border-slate-700/90 bg-slate-900/80 px-3 py-2 text-xs text-slate-100 outline-none transition focus:border-cyan-300/60"
        >
          {cardOptions.length === 0 ? (
            <option value="">Sem cartas no deck</option>
          ) : (
            cardOptions.map((option) => (
              <option key={option.cardId} value={option.cardId}>
                {option.name} x{option.count}
              </option>
            ))
          )}
        </select>
      </div>
    </div>
  );
}
