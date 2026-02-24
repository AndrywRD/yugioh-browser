export interface AnchorRect {
  left: number;
  top: number;
  width: number;
  height: number;
}

export interface MenuPlacement {
  left: number;
  top: number;
  placement: "top" | "bottom";
}

interface ComputeMenuPositionInput {
  anchorRect: AnchorRect;
  menuWidth: number;
  menuHeight: number;
  viewportWidth: number;
  viewportHeight: number;
  offset?: number;
  padding?: number;
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

export function toAnchorRect(rect: Pick<DOMRect, "left" | "top" | "width" | "height">): AnchorRect {
  return {
    left: rect.left,
    top: rect.top,
    width: rect.width,
    height: rect.height
  };
}

export function computeMenuPosition({
  anchorRect,
  menuWidth,
  menuHeight,
  viewportWidth,
  viewportHeight,
  offset = 10,
  padding = 8
}: ComputeMenuPositionInput): MenuPlacement {
  const rawLeft = anchorRect.left + anchorRect.width / 2 - menuWidth / 2;
  const minLeft = padding;
  const maxLeft = Math.max(padding, viewportWidth - menuWidth - padding);
  const left = clamp(rawLeft, minLeft, maxLeft);

  const topCandidate = anchorRect.top - menuHeight - offset;
  const bottomCandidate = anchorRect.top + anchorRect.height + offset;

  const canPlaceTop = topCandidate >= padding;
  const placement: "top" | "bottom" = canPlaceTop ? "top" : "bottom";

  const rawTop = canPlaceTop ? topCandidate : bottomCandidate;
  const minTop = padding;
  const maxTop = Math.max(padding, viewportHeight - menuHeight - padding);
  const top = clamp(rawTop, minTop, maxTop);

  return { left, top, placement };
}
