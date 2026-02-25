"use client";

import { Orbitron } from "next/font/google";
import { useEffect, useRef, useState } from "react";

const orbitron = Orbitron({ subsets: ["latin"], weight: ["700", "800"] });

type FlashType = "hit" | "heal" | null;

type LpBox = {
  topPct: number;
  leftPct: number;
  wPct: number;
  hPct: number;
};

const OPP_LP_BOX: LpBox = {
  topPct: 28.2,
  leftPct: 49.5,
  wPct: 37,
  hPct: 13.2
};

const YOU_LP_BOX: LpBox = {
  topPct: 52.2,
  leftPct: 49.5,
  wPct: 37,
  hPct: 13.2
};

const HAND_BOX: LpBox = {
  topPct: 68.8,
  leftPct: 10.6,
  wPct: 17.8,
  hPct: 8.6
};

interface LpHudImageProps {
  youLp: number;
  opponentLp: number;
  opponentHandCount?: number;
  className?: string;
  registerRect?: (id: "hud:lp:you" | "hud:lp:opp", element: HTMLDivElement | null) => void;
}

function clampLp(value: number): number {
  return Math.max(0, Math.trunc(value));
}

function cx(...classes: Array<string | false | undefined>) {
  return classes.filter(Boolean).join(" ");
}

export function LpHudImage({ youLp, opponentLp, opponentHandCount, className, registerRect }: LpHudImageProps) {
  const [youFlash, setYouFlash] = useState<FlashType>(null);
  const [opponentFlash, setOpponentFlash] = useState<FlashType>(null);
  const [youPulse, setYouPulse] = useState(false);
  const [opponentPulse, setOpponentPulse] = useState(false);

  const prevYouLpRef = useRef<number | null>(null);
  const prevOpponentLpRef = useRef<number | null>(null);
  const timeoutIdsRef = useRef<number[]>([]);

  useEffect(() => {
    return () => {
      for (const id of timeoutIdsRef.current) {
        window.clearTimeout(id);
      }
      timeoutIdsRef.current = [];
    };
  }, []);

  useEffect(() => {
    const currentYouLp = clampLp(youLp);
    const currentOpponentLp = clampLp(opponentLp);

    const prevYou = prevYouLpRef.current;
    const prevOpponent = prevOpponentLpRef.current;

    if (prevYou !== null && prevYou !== currentYouLp) {
      setYouFlash(currentYouLp < prevYou ? "hit" : "heal");
      setYouPulse(true);

      const clearFlashId = window.setTimeout(() => setYouFlash(null), 320);
      const clearPulseId = window.setTimeout(() => setYouPulse(false), 280);
      timeoutIdsRef.current.push(clearFlashId, clearPulseId);
    }

    if (prevOpponent !== null && prevOpponent !== currentOpponentLp) {
      setOpponentFlash(currentOpponentLp < prevOpponent ? "hit" : "heal");
      setOpponentPulse(true);

      const clearFlashId = window.setTimeout(() => setOpponentFlash(null), 320);
      const clearPulseId = window.setTimeout(() => setOpponentPulse(false), 280);
      timeoutIdsRef.current.push(clearFlashId, clearPulseId);
    }

    prevYouLpRef.current = currentYouLp;
    prevOpponentLpRef.current = currentOpponentLp;
  }, [youLp, opponentLp]);

  const youText = String(clampLp(youLp));
  const opponentText = String(clampLp(opponentLp));

  return (
    <div
      className={cx(
        "pointer-events-none absolute right-3 top-3 z-hud w-[360px] max-w-[32vw] min-w-[220px] opacity-95 max-[1200px]:max-w-[36vw] max-[860px]:max-w-[46vw] max-[720px]:right-1 max-[720px]:top-1 max-[720px]:max-w-[58vw]",
        className
      )}
    >
      <div className="relative aspect-[2.5/1] drop-shadow-[0_10px_18px_rgba(0,0,0,0.4)]">
        <img src="/ui/hud-hp.png" alt="HUD LP" className="h-full w-full object-cover" />

        {typeof opponentHandCount === "number" && (
          <div
            className="absolute"
            style={{ left: `${HAND_BOX.leftPct}%`, top: `${HAND_BOX.topPct}%`, width: `${HAND_BOX.wPct}%`, height: `${HAND_BOX.hPct}%` }}
          >
            <span className={cx(orbitron.className, "lp-hud-chip")}>HAND {Math.max(0, opponentHandCount)}</span>
          </div>
        )}

        <div
          ref={(element) => registerRect?.("hud:lp:opp", element)}
          className="absolute"
          style={{
            left: `${OPP_LP_BOX.leftPct}%`,
            top: `${OPP_LP_BOX.topPct}%`,
            width: `${OPP_LP_BOX.wPct}%`,
            height: `${OPP_LP_BOX.hPct}%`
          }}
        >
          {opponentFlash && (
            <div className={cx("absolute inset-0 rounded-sm", opponentFlash === "hit" ? "lp-hud-flash-hit" : "lp-hud-flash-heal")} />
          )}
          <div className="relative flex h-full items-center justify-end pr-[4.2%]">
            <span
              className={cx(
                orbitron.className,
                "lp-hud-value translate-y-px text-[clamp(17px,1.72vw,34px)] leading-none tabular-nums",
                opponentPulse && "lp-hud-value-pulse"
              )}
            >
              {opponentText}
            </span>
          </div>
        </div>

        <div
          ref={(element) => registerRect?.("hud:lp:you", element)}
          className="absolute"
          style={{
            left: `${YOU_LP_BOX.leftPct}%`,
            top: `${YOU_LP_BOX.topPct}%`,
            width: `${YOU_LP_BOX.wPct}%`,
            height: `${YOU_LP_BOX.hPct}%`
          }}
        >
          {youFlash && (
            <div className={cx("absolute inset-0 rounded-sm", youFlash === "hit" ? "lp-hud-flash-hit" : "lp-hud-flash-heal")} />
          )}
          <div className="relative flex h-full items-center justify-end pr-[4.2%]">
            <span
              className={cx(
                orbitron.className,
                "lp-hud-value translate-y-px text-[clamp(17px,1.72vw,34px)] leading-none tabular-nums",
                youPulse && "lp-hud-value-pulse"
              )}
            >
              {youText}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
