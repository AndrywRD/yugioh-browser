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
      className={`group lobby-motion-card relative overflow-hidden rounded-xl bg-[linear-gradient(180deg,rgba(8,18,38,0.66),rgba(5,12,29,0.78))] p-4 shadow-[inset_0_1px_0_rgba(255,226,168,0.08),0_10px_22px_rgba(0,0,0,0.24)] transition-all duration-200 ${className ?? ""}`}
    >
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(120%_75%_at_0%_0%,rgba(86,154,255,0.08),transparent_56%)] opacity-80" />
      {(title || subtitle || rightSlot) && (
        <header className="relative z-[1] mb-3 flex items-start justify-between gap-2 border-b border-slate-700/55 pb-2.5">
          <div className="min-w-0">
            {title && <h3 className="fm-title truncate text-xs font-bold tracking-[0.11em]">{title}</h3>}
            {subtitle && <p className="mt-1 text-[11px] text-slate-300/90">{subtitle}</p>}
          </div>
          {rightSlot ? <div className="shrink-0">{rightSlot}</div> : null}
        </header>
      )}
      <div className="relative z-[1]">{children}</div>
    </article>
  );
}
