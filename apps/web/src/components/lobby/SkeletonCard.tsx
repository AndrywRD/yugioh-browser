interface SkeletonCardProps {
  className?: string;
}

export function SkeletonCard({ className }: SkeletonCardProps) {
  return (
    <div
      className={`relative overflow-hidden rounded-lg border border-slate-700/70 bg-slate-800/60 ${className ?? ""}`}
      aria-hidden
    >
      <div className="absolute inset-0 animate-pulse bg-[linear-gradient(110deg,rgba(148,163,184,0.08),rgba(148,163,184,0.18),rgba(148,163,184,0.08))]" />
    </div>
  );
}

