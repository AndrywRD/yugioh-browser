"use client";

import type { ReactNode } from "react";

interface ActionTrayProps {
  visible?: boolean;
  className?: string;
  children: ReactNode;
}

function cx(...classes: Array<string | false | undefined>) {
  return classes.filter(Boolean).join(" ");
}

export function ActionTray({ visible = true, className, children }: ActionTrayProps) {
  if (!visible) return null;

  return (
    <div className={cx("pointer-events-none absolute z-tooltip", className || "bottom-[86px] left-1/2 -translate-x-1/2")}>
      <div className="fm-panel pointer-events-auto flex flex-wrap items-center justify-center gap-2 px-3 py-2 text-xs text-slate-100">
        {children}
      </div>
    </div>
  );
}
