"use client";

import { usePathname } from "next/navigation";
import { useEffect } from "react";
import { bgmManager, loadBgmVolume, resolveTrackForPath } from "../../lib/bgm";

export function BgmController() {
  const pathname = usePathname();

  useEffect(() => {
    bgmManager.setVolume(loadBgmVolume());
    const unlock = () => bgmManager.unlock();
    window.addEventListener("pointerdown", unlock, { passive: true });
    window.addEventListener("keydown", unlock);
    window.addEventListener("touchstart", unlock, { passive: true });

    return () => {
      window.removeEventListener("pointerdown", unlock);
      window.removeEventListener("keydown", unlock);
      window.removeEventListener("touchstart", unlock);
    };
  }, []);

  useEffect(() => {
    bgmManager.setTrack(resolveTrackForPath(pathname));
  }, [pathname]);

  useEffect(() => {
    return () => bgmManager.dispose();
  }, []);

  return null;
}
