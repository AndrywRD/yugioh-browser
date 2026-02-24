import type { CardClientView } from "@ruptura-arcana/shared";
import { toAnchorRect, type AnchorRect } from "../../lib/anchors";
import { Highlights } from "../board/Highlights";
import { CardView } from "../card/CardView";
import { useMemo, useRef, useState } from "react";

interface HandFanProps {
  cards: CardClientView[];
  selectedIds: string[];
  highlightedIds?: string[];
  badgeById?: Record<string, string>;
  onCardClick: (card: CardClientView, index: number, anchorRect: AnchorRect) => void;
  onCardHover?: (card: CardClientView | null, anchorRect: AnchorRect | null) => void;
}

function cx(...classes: Array<string | false | undefined>) {
  return classes.filter(Boolean).join(" ");
}

const CARD_W = 110;
const CARD_H = 154;
const BASE_GAP = 12;

export function HandFan({ cards, selectedIds, highlightedIds, badgeById, onCardClick, onCardHover }: HandFanProps) {
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const holdTimerRef = useRef<number | null>(null);

  const overlap = useMemo(() => {
    if (cards.length <= 6) return 0;
    return Math.min(40, Math.max(0, (cards.length - 6) * 8));
  }, [cards.length]);

  const useOverlap = cards.length > 6;
  const stackStep = CARD_W - overlap;
  const railWidth = useMemo(() => {
    if (!cards.length) return 0;
    if (!useOverlap) return cards.length * CARD_W + Math.max(0, cards.length - 1) * BASE_GAP;
    return CARD_W + (cards.length - 1) * stackStep;
  }, [cards.length, stackStep, useOverlap]);

  const fanCenter = (cards.length - 1) / 2;

  const clearHold = () => {
    if (holdTimerRef.current) {
      window.clearTimeout(holdTimerRef.current);
      holdTimerRef.current = null;
    }
  };

  return (
    <div className="pointer-events-auto h-full w-full overflow-visible px-2 pb-1 pt-1">
      <div className="h-full w-full overflow-x-auto overflow-y-visible [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
        <div
          className="relative mx-auto flex h-full min-w-max items-end pb-1 pt-3"
          style={{
            width: railWidth > 0 ? `${railWidth}px` : "100%"
          }}
        >
          {cards.map((card, index) => {
            const selected = selectedIds.includes(card.instanceId);
            const highlighted = highlightedIds?.includes(card.instanceId) ?? false;
            const isHovered = hoveredId === card.instanceId;
            const angle = useOverlap ? Math.max(-10, Math.min(10, (index - fanCenter) * 2.2)) : 0;
            const liftY = selected ? -34 : isHovered ? -30 : 8;
            const scale = selected ? 1.05 : isHovered ? 1.04 : 1;
            const marginLeft = index === 0 ? 0 : useOverlap ? -overlap : BASE_GAP;
            return (
              <button
                key={card.instanceId}
                type="button"
                onClick={(event) => onCardClick(card, index, toAnchorRect(event.currentTarget.getBoundingClientRect()))}
                onMouseEnter={(event) => {
                  const anchorRect = toAnchorRect(event.currentTarget.getBoundingClientRect());
                  setHoveredId(card.instanceId);
                  onCardHover?.(card, anchorRect);
                }}
                onMouseLeave={() => {
                  setHoveredId((current) => (current === card.instanceId ? null : current));
                  onCardHover?.(null, null);
                  clearHold();
                }}
                onPointerDown={(event) => {
                  clearHold();
                  if (event.pointerType !== "touch") return;
                  holdTimerRef.current = window.setTimeout(() => {
                    onCardHover?.(card, toAnchorRect(event.currentTarget.getBoundingClientRect()));
                  }, 280);
                }}
                onPointerUp={clearHold}
                onPointerCancel={clearHold}
                className={cx("relative shrink-0 origin-bottom transition-transform duration-200 ease-out", (isHovered || selected) && "z-[999]")}
                style={{
                  width: `${CARD_W}px`,
                  height: `${CARD_H}px`,
                  marginLeft: `${marginLeft}px`,
                  zIndex: selected || isHovered ? 999 : index + 1,
                  transform: `translateY(${liftY}px) scale(${scale}) rotate(${isHovered || selected ? 0 : angle}deg)`
                }}
              >
                {highlighted && !selected ? <Highlights variant="valid" /> : null}
                {selected ? <Highlights variant="selected" /> : null}
                <CardView
                  name={card.name}
                  atk={card.atk}
                  def={card.def}
                  position="ATTACK"
                  imagePath={card.imagePath}
                  selected={selected}
                  highlighted={highlighted}
                  canInteract
                  badge={badgeById?.[card.instanceId]}
                />
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
