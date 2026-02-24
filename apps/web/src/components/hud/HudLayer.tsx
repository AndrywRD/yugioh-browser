"use client";

import type { ReactNode } from "react";

interface HudLayerProps {
  children: ReactNode;
}

export function HudLayer({ children }: HudLayerProps) {
  return <div className="pointer-events-none absolute inset-0 z-hud">{children}</div>;
}
