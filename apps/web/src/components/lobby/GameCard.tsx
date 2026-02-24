import type { ReactNode } from "react";

interface GameCardProps {
  title?: string;
  subtitle?: string;
  className?: string;
  rightSlot?: ReactNode;
  children: ReactNode;
}

export function GameCard({ title, subtitle, className, rightSlot, children }: GameCardProps) {
  return (
    <article
      className={`group lobby-motion-card relative overflow-hidden rounded-xl border border-[#d5b06a]/45 bg-[linear-gradient(180deg,rgba(7,18,40,0.92),rgba(4,11,28,0.94))] p-4 shadow-[inset_0_1px_0_rgba(255,226,168,0.18),0_12px_26px_rgba(0,0,0,0.35)] transition-all duration-200 hover:-translate-y-0.5 hover:border-[#f5cd88]/70 hover:shadow-[inset_0_1px_0_rgba(255,239,186,0.26),0_18px_34px_rgba(0,0,0,0.4)] ${className ?? ""}`}
    >
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(120%_75%_at_0%_0%,rgba(86,154,255,0.12),transparent_55%)] opacity-80" />
      {(title || subtitle || rightSlot) && (
        <header className="relative z-[1] mb-3 flex items-start justify-between gap-2">
          <div className="min-w-0">
            {title && <h3 className="fm-title truncate text-xs font-bold tracking-[0.12em]">{title}</h3>}
            {subtitle && <p className="mt-1 text-[11px] text-slate-300/95">{subtitle}</p>}
          </div>
          {rightSlot ? <div className="shrink-0">{rightSlot}</div> : null}
        </header>
      )}
      <div className="relative z-[1]">{children}</div>
    </article>
  );
}
