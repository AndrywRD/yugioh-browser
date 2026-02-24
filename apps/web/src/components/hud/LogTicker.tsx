"use client";

interface LogTickerProps {
  lines: string[];
  className?: string;
}

function cx(...classes: Array<string | false | undefined>) {
  return classes.filter(Boolean).join(" ");
}

export function LogTicker({ lines, className }: LogTickerProps) {
  if (lines.length === 0) return null;

  return (
    <div className={cx("pointer-events-none absolute left-1/2 top-2 z-tooltip -translate-x-1/2", className)}>
      <div className="max-w-[92vw] rounded-lg border border-amber-300/65 bg-slate-950/96 px-3.5 py-2.5 shadow-[0_12px_22px_rgba(0,0,0,0.6)] backdrop-blur-[1px]">
        <div className="grid gap-1.5">
          {lines.slice(0, 3).map((line, index) => (
            <div key={`${line}-${index}`} className="rounded border border-slate-700/80 bg-black/35 px-2 py-1">
              <p className="max-w-[620px] truncate text-[12px] font-medium text-amber-50 [text-shadow:0_1px_2px_rgba(0,0,0,0.98),0_0_8px_rgba(0,0,0,0.9)] ticker-line">
                {line}
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
