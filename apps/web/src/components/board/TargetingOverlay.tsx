interface TargetingOverlayProps {
  mode: "ATTACK" | "FUSION" | null;
}

export function TargetingOverlay({ mode }: TargetingOverlayProps) {
  if (!mode) return null;

  return (
    <div className="pointer-events-none absolute inset-0 z-targeting rounded-2xl bg-[radial-gradient(circle_at_center,rgba(255,255,255,0.02)_0%,rgba(0,0,0,0.42)_78%)]">
      <div className="absolute inset-0 rounded-2xl border border-amber-200/18" />
      <div className="absolute left-1/2 top-4 -translate-x-1/2 rounded-md border border-amber-300/55 bg-slate-950/82 px-3 py-1 text-[11px] font-semibold tracking-wide text-amber-100 shadow-[0_6px_16px_rgba(0,0,0,0.45)]">
        {mode === "ATTACK" ? "ATTACK MODE" : "FUSION MODE"}
      </div>
    </div>
  );
}
