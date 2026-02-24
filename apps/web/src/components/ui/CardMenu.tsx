import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { computeMenuPosition, type AnchorRect } from "../../lib/anchors";

export interface CardMenuItem {
  key: string;
  label: string;
  disabled?: boolean;
  onSelect: () => void;
}

interface CardMenuProps {
  anchorRect: AnchorRect;
  items: CardMenuItem[];
}

function getIconForItem(key: string): string {
  if (key === "attack") return "/icons/icon_sword.png";
  if (key === "position") return "/icons/icon_shield.png";
  if (key === "flip") return "/icons/icon_confirm.png";
  if (key === "fusion") return "/icons/icon_fusion.png";
  if (key === "summon") return "/icons/icon_deck.png";
  if (key === "cancel") return "/icons/icon_cancel.png";
  return "/icons/icon_confirm.png";
}

export function CardMenu({ anchorRect, items }: CardMenuProps) {
  const menuRef = useRef<HTMLDivElement | null>(null);
  const [position, setPosition] = useState<{ left: number; top: number; placement: "top" | "bottom" } | null>(null);
  const [viewportHeight, setViewportHeight] = useState<number>(() =>
    typeof window !== "undefined" ? window.innerHeight : 900
  );
  const menuHeight = Math.min(Math.max(204, items.length * 44 + 76), Math.floor(viewportHeight * 0.72));

  const updatePosition = () => {
    const node = menuRef.current;
    if (!node) return;

    const rect = node.getBoundingClientRect();
    const next = computeMenuPosition({
      anchorRect,
      menuWidth: rect.width,
      menuHeight: rect.height,
      viewportWidth: window.innerWidth,
      viewportHeight: window.innerHeight
    });
    setPosition(next);
  };

  useLayoutEffect(() => {
    updatePosition();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [anchorRect.left, anchorRect.top, anchorRect.width, anchorRect.height, items.length]);

  useEffect(() => {
    const onReposition = () => updatePosition();
    const onResize = () => {
      setViewportHeight(window.innerHeight);
      onReposition();
    };
    window.addEventListener("resize", onResize);
    window.addEventListener("scroll", onReposition, true);

    return () => {
      window.removeEventListener("resize", onResize);
      window.removeEventListener("scroll", onReposition, true);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [anchorRect.left, anchorRect.top, anchorRect.width, anchorRect.height, menuHeight]);

  return (
    <div
      ref={menuRef}
      className="pointer-events-auto fixed z-contextmenu min-w-52"
      style={{
        left: `${position?.left ?? -9999}px`,
        top: `${position?.top ?? -9999}px`,
        height: `${menuHeight}px`
      }}
    >
      <div className="relative h-full w-[280px] max-w-[82vw] drop-shadow-[0_22px_36px_rgba(0,0,0,0.7)]">
        <div className="fm-scroll fm-panel absolute inset-0 flex flex-col gap-1.5 overflow-y-auto rounded-xl px-3 py-3">
          {items.map((item) => (
            <button
              key={item.key}
              type="button"
              disabled={item.disabled}
              onClick={item.onSelect}
              className="group/menu-item relative flex items-center gap-2.5 whitespace-nowrap rounded-md border border-cyan-300/25 bg-[#031226]/78 px-2.5 py-1.5 text-left text-xs font-semibold uppercase tracking-wide text-cyan-100 transition-colors hover:border-cyan-200/70 hover:bg-cyan-700/24 disabled:cursor-not-allowed disabled:border-slate-700/70 disabled:bg-slate-900/65 disabled:text-slate-400"
            >
              <img
                src={getIconForItem(item.key)}
                alt=""
                aria-hidden
                className={`h-4 w-4 shrink-0 transition-opacity ${
                  item.disabled ? "opacity-45" : "opacity-90 group-hover/menu-item:opacity-100"
                }`}
              />
              <span>{item.label}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
