"use client";

import { Orbitron } from "next/font/google";

const orbitron = Orbitron({ subsets: ["latin"], weight: ["600", "700", "800"] });

export interface StatusBarSelection {
  name: string;
  atk?: number;
  def?: number;
  pos?: "ATK" | "DEF" | "--" | string;
}

interface BoxDef {
  top: number;
  left: number;
  w: number;
  h: number;
}

const NAME_BOX: BoxDef = { top: 43.5, left: 18, w: 53, h: 14.5 };
const STATS_BOX: BoxDef = { top: 40.5, left: 73, w: 20, h: 23 };

interface StatusBarProps {
  selected?: StatusBarSelection | null;
  className?: string;
}

function cx(...classes: Array<string | false | undefined>) {
  return classes.filter(Boolean).join(" ");
}

export function StatusBar({ selected, className }: StatusBarProps) {
  const cardName = selected?.name ?? "--";
  const atk = selected?.atk;
  const def = selected?.def;
  const pos = selected?.pos ?? "--";

  return (
    <div
      className={cx(
        "pointer-events-none absolute bottom-[120px] left-6 z-statusbar w-[520px] max-w-[38vw] min-w-[300px] max-[1200px]:max-w-[46vw] max-[900px]:max-w-[56vw]",
        className
      )}
    >
      <div className="relative aspect-[3.3/1] drop-shadow-[0_12px_20px_rgba(0,0,0,0.5)]">
        <img src="/ui/status_bar.png" alt="Status Bar" className="h-full w-full object-cover" />

        <div
          className="absolute"
          style={{ top: `${NAME_BOX.top}%`, left: `${NAME_BOX.left}%`, width: `${NAME_BOX.w}%`, height: `${NAME_BOX.h}%` }}
        >
          <p className={cx(orbitron.className, "status-bar-name leading-tight")}>{cardName}</p>
        </div>

        <div
          className="absolute"
          style={{ top: `${STATS_BOX.top}%`, left: `${STATS_BOX.left}%`, width: `${STATS_BOX.w}%`, height: `${STATS_BOX.h}%` }}
        >
          <div className={cx(orbitron.className, "status-bar-stats grid h-full content-center justify-end text-right leading-tight")}>
            <p>ATK: {typeof atk === "number" ? atk : "----"}</p>
            <p>DEF: {typeof def === "number" ? def : "----"}</p>
            <p>POS: {pos}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
