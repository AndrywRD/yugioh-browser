import type { ReactNode } from "react";
import type { LobbySection } from "./types";

interface TabsAnimatedPanelProps {
  active: LobbySection;
  children: ReactNode;
}

export function TabsAnimatedPanel({ active, children }: TabsAnimatedPanelProps) {
  return (
    <div key={active} className="lobby-tab-enter">
      {children}
    </div>
  );
}

