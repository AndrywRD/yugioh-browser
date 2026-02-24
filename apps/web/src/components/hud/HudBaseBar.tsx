"use client";

interface HudBaseBarProps {
  className?: string;
}

function cx(...classes: Array<string | false | undefined>) {
  return classes.filter(Boolean).join(" ");
}

export function HudBaseBar({ className }: HudBaseBarProps) {
  return (
    <div
      className={cx(
        "pointer-events-none absolute left-0 right-0 z-statusbar h-[74px] border-t border-amber-300/30 bg-slate-950/86 shadow-[inset_0_8px_18px_rgba(0,0,0,0.45)]",
        className
      )}
    >
      <div className="absolute inset-0 bg-[repeating-linear-gradient(180deg,rgba(255,255,255,0.035)_0px,rgba(255,255,255,0.035)_1px,rgba(0,0,0,0)_3px,rgba(0,0,0,0)_5px)] opacity-45" />
      <div className="absolute inset-x-0 top-0 h-px bg-amber-200/45" />
    </div>
  );
}

