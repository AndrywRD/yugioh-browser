"use client";

import { usePathname } from "next/navigation";
import { useEffect, useMemo } from "react";
import { BgmManager, resolveTrackForPath } from "../../lib/bgm";

export function BgmController() {
  const pathname = usePathname();
  const bgm = useMemo(() => new BgmManager(0.22), []);

  useEffect(() => {
    const unlock = () => bgm.unlock();
    window.addEventListener("pointerdown", unlock, { passive: true });
    window.addEventListener("keydown", unlock);
    window.addEventListener("touchstart", unlock, { passive: true });

    return () => {
      window.removeEventListener("pointerdown", unlock);
      window.removeEventListener("keydown", unlock);
      window.removeEventListener("touchstart", unlock);
    };
  }, [bgm]);

  useEffect(() => {
    bgm.setTrack(resolveTrackForPath(pathname));
  }, [bgm, pathname]);

  useEffect(() => {
    return () => bgm.dispose();
  }, [bgm]);

  return null;
}

