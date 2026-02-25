import { useCallback, useEffect, useMemo, useRef } from "react";

export type SlotRectZone = "MONSTER" | "SPELL_TRAP";
export type SlotRectSide = "PLAYER" | "ENEMY";

export function buildSlotRectId(side: SlotRectSide, zone: SlotRectZone, slotIndex: number): string {
  return `${side}:${zone}:${slotIndex}`;
}

interface RectRegistryMaps {
  cardElements: Map<string, HTMLElement>;
  slotElements: Map<string, HTMLElement>;
  cardRects: Map<string, DOMRect>;
  slotRects: Map<string, DOMRect>;
}

export interface RectRegistryApi {
  registerCardElement: (instanceId: string, element: HTMLElement | null) => void;
  registerSlotElement: (slotId: string, element: HTMLElement | null) => void;
  getCardRect: (instanceId: string) => DOMRect | null;
  getSlotRect: (slotId: string) => DOMRect | null;
  refreshRects: () => void;
}

function snapshotRect(element: HTMLElement): DOMRect {
  return element.getBoundingClientRect();
}

function refreshMapRects(elements: Map<string, HTMLElement>, rects: Map<string, DOMRect>): void {
  for (const [key, element] of elements.entries()) {
    rects.set(key, snapshotRect(element));
  }
}

export function useRectRegistry(): RectRegistryApi {
  const mapsRef = useRef<RectRegistryMaps>({
    cardElements: new Map<string, HTMLElement>(),
    slotElements: new Map<string, HTMLElement>(),
    cardRects: new Map<string, DOMRect>(),
    slotRects: new Map<string, DOMRect>()
  });
  const resizeObserverRef = useRef<ResizeObserver | null>(null);

  const refreshRects = useCallback(() => {
    const maps = mapsRef.current;
    refreshMapRects(maps.cardElements, maps.cardRects);
    refreshMapRects(maps.slotElements, maps.slotRects);
  }, []);

  const registerCardElement = useCallback(
    (instanceId: string, element: HTMLElement | null) => {
      const maps = mapsRef.current;
      if (!instanceId) return;
      if (!element) {
        const previous = maps.cardElements.get(instanceId);
        if (previous && resizeObserverRef.current) {
          resizeObserverRef.current.unobserve(previous);
        }
        maps.cardElements.delete(instanceId);
        maps.cardRects.delete(instanceId);
        return;
      }
      maps.cardElements.set(instanceId, element);
      maps.cardRects.set(instanceId, snapshotRect(element));
      resizeObserverRef.current?.observe(element);
    },
    []
  );

  const registerSlotElement = useCallback(
    (slotId: string, element: HTMLElement | null) => {
      const maps = mapsRef.current;
      if (!slotId) return;
      if (!element) {
        const previous = maps.slotElements.get(slotId);
        if (previous && resizeObserverRef.current) {
          resizeObserverRef.current.unobserve(previous);
        }
        maps.slotElements.delete(slotId);
        maps.slotRects.delete(slotId);
        return;
      }
      maps.slotElements.set(slotId, element);
      maps.slotRects.set(slotId, snapshotRect(element));
      resizeObserverRef.current?.observe(element);
    },
    []
  );

  const getCardRect = useCallback((instanceId: string) => {
    const maps = mapsRef.current;
    const liveElement = maps.cardElements.get(instanceId);
    if (liveElement) {
      const rect = snapshotRect(liveElement);
      maps.cardRects.set(instanceId, rect);
      return rect;
    }
    return maps.cardRects.get(instanceId) ?? null;
  }, []);

  const getSlotRect = useCallback((slotId: string) => {
    const maps = mapsRef.current;
    const liveElement = maps.slotElements.get(slotId);
    if (liveElement) {
      const rect = snapshotRect(liveElement);
      maps.slotRects.set(slotId, rect);
      return rect;
    }
    return maps.slotRects.get(slotId) ?? null;
  }, []);

  useEffect(() => {
    let rafId: number | null = null;

    const scheduleRefresh = () => {
      if (rafId !== null) return;
      rafId = window.requestAnimationFrame(() => {
        rafId = null;
        refreshRects();
      });
    };

    const resizeObserver = new ResizeObserver(() => scheduleRefresh());
    resizeObserverRef.current = resizeObserver;
    const maps = mapsRef.current;
    for (const element of maps.cardElements.values()) resizeObserver.observe(element);
    for (const element of maps.slotElements.values()) resizeObserver.observe(element);

    window.addEventListener("resize", scheduleRefresh);
    window.addEventListener("scroll", scheduleRefresh, true);

    return () => {
      resizeObserverRef.current = null;
      if (rafId !== null) {
        window.cancelAnimationFrame(rafId);
      }
      resizeObserver.disconnect();
      window.removeEventListener("resize", scheduleRefresh);
      window.removeEventListener("scroll", scheduleRefresh, true);
    };
  }, [refreshRects]);

  return useMemo(
    () => ({
      registerCardElement,
      registerSlotElement,
      getCardRect,
      getSlotRect,
      refreshRects
    }),
    [getCardRect, getSlotRect, refreshRects, registerCardElement, registerSlotElement]
  );
}
