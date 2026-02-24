interface LobbyIconProps {
  kind: "campaign" | "online" | "collection" | "profile" | "progress" | "map";
  className?: string;
}

export function LobbyIcon({ kind, className }: LobbyIconProps) {
  const base = "h-4 w-4 text-amber-200";
  const cls = `${base} ${className ?? ""}`;

  if (kind === "campaign") {
    return (
      <svg viewBox="0 0 24 24" className={cls} fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
        <path d="M4 5l6-2 4 2 6-2v16l-6 2-4-2-6 2V5z" />
        <path d="M10 3v16M14 5v16" />
      </svg>
    );
  }

  if (kind === "online") {
    return (
      <svg viewBox="0 0 24 24" className={cls} fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
        <path d="M5 10a10 10 0 0 1 14 0" />
        <path d="M8 13a6 6 0 0 1 8 0" />
        <path d="M11 16a2 2 0 0 1 2 0" />
        <circle cx="12" cy="19" r="1" fill="currentColor" stroke="none" />
      </svg>
    );
  }

  if (kind === "collection") {
    return (
      <svg viewBox="0 0 24 24" className={cls} fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
        <rect x="4" y="5" width="13" height="16" rx="2" />
        <path d="M9 3h11v16" />
      </svg>
    );
  }

  if (kind === "profile") {
    return (
      <svg viewBox="0 0 24 24" className={cls} fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
        <circle cx="12" cy="8" r="4" />
        <path d="M4 21c1.8-3.2 4.6-5 8-5s6.2 1.8 8 5" />
      </svg>
    );
  }

  if (kind === "map") {
    return (
      <svg viewBox="0 0 24 24" className={cls} fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
        <path d="M12 21s6-5.2 6-10a6 6 0 1 0-12 0c0 4.8 6 10 6 10z" />
        <circle cx="12" cy="11" r="2" />
      </svg>
    );
  }

  return (
    <svg viewBox="0 0 24 24" className={cls} fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
      <path d="M3 12h18M12 3v18" />
      <circle cx="12" cy="12" r="9" />
    </svg>
  );
}
