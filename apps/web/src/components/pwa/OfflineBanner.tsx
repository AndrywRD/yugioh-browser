"use client";

import { useEffect, useState } from "react";

export function OfflineBanner() {
  const [online, setOnline] = useState(true);

  useEffect(() => {
    if (typeof window === "undefined") return;
    setOnline(window.navigator.onLine);
    const handleOnline = () => setOnline(true);
    const handleOffline = () => setOnline(false);
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  if (online) return null;

  return (
    <div className="pointer-events-none fixed left-1/2 top-2 z-[180] -translate-x-1/2">
      <div className="rounded-lg border border-amber-300/70 bg-slate-950/92 px-3 py-2 text-xs font-semibold text-amber-100 shadow-[0_12px_24px_rgba(0,0,0,0.42)]">
        Voce esta offline. Recursos locais continuam disponiveis.
      </div>
    </div>
  );
}

