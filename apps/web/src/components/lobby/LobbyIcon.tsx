interface LobbyIconProps {
  kind:
    | "campaign"
    | "online"
    | "collection"
    | "friends"
    | "ranking"
    | "profile"
    | "progress"
    | "map"
    | "gold"
    | "pve"
    | "pvp"
    | "level"
    | "xp"
    | "achievement"
    | "deck";
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

  if (kind === "friends") {
    return (
      <svg viewBox="0 0 24 24" className={cls} fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
        <circle cx="8" cy="9" r="3" />
        <circle cx="16.5" cy="8.5" r="2.5" />
        <path d="M2.5 19c1.2-2.8 3.3-4.2 5.5-4.2S12.4 16.2 13.5 19" />
        <path d="M13.3 18.4c.8-2 2.2-3 3.8-3 1.4 0 2.7.8 3.4 2.4" />
      </svg>
    );
  }

  if (kind === "ranking") {
    return (
      <svg viewBox="0 0 24 24" className={cls} fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
        <path d="M4 19h16" />
        <path d="M6.5 19v-7M12 19v-11M17.5 19v-5" />
        <path d="M9 5l3-2 3 2" />
      </svg>
    );
  }

  if (kind === "gold") {
    return (
      <svg viewBox="0 0 24 24" className={cls} fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
        <ellipse cx="12" cy="7" rx="7" ry="3" />
        <path d="M5 7v6c0 1.7 3.1 3 7 3s7-1.3 7-3V7" />
        <path d="M5 13v4c0 1.7 3.1 3 7 3s7-1.3 7-3v-4" />
      </svg>
    );
  }

  if (kind === "pve") {
    return (
      <svg viewBox="0 0 24 24" className={cls} fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
        <path d="M12 3l3 6 6 .9-4.5 4.4 1 6.4L12 17l-5.5 3.7 1-6.4L3 9.9 9 9l3-6z" />
      </svg>
    );
  }

  if (kind === "pvp") {
    return (
      <svg viewBox="0 0 24 24" className={cls} fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
        <path d="M4 5l6 6-2 2-6-6 2-2z" />
        <path d="M20 5l-6 6 2 2 6-6-2-2z" />
        <path d="M8 13l3 3-2 2-3-3 2-2z" />
        <path d="M16 13l-3 3 2 2 3-3-2-2z" />
      </svg>
    );
  }

  if (kind === "level") {
    return (
      <svg viewBox="0 0 24 24" className={cls} fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
        <path d="M4 19h16" />
        <path d="M6 19V9M12 19V5M18 19v-7" />
      </svg>
    );
  }

  if (kind === "xp") {
    return (
      <svg viewBox="0 0 24 24" className={cls} fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
        <circle cx="12" cy="12" r="8" />
        <path d="M12 7v6l4 2" />
      </svg>
    );
  }

  if (kind === "achievement") {
    return (
      <svg viewBox="0 0 24 24" className={cls} fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
        <circle cx="12" cy="8" r="4" />
        <path d="M8 14l-2 6 6-3 6 3-2-6" />
      </svg>
    );
  }

  if (kind === "deck") {
    return (
      <svg viewBox="0 0 24 24" className={cls} fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
        <rect x="5" y="3" width="14" height="18" rx="2" />
        <path d="M9 7h6M9 11h6M9 15h6" />
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
