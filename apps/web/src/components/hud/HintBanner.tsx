"use client";

interface HintBannerProps {
  text: string;
  visible?: boolean;
  className?: string;
}

function cx(...classes: Array<string | false | undefined>) {
  return classes.filter(Boolean).join(" ");
}

export function HintBanner({ text, visible = true, className }: HintBannerProps) {
  if (!visible || !text) return null;

  return (
    <div className={cx("pointer-events-none absolute bottom-[136px] left-1/2 z-tooltip -translate-x-1/2", className)}>
      <div className="fm-chip rounded-md px-3 py-1.5 text-[11px] text-amber-100 shadow-[0_8px_18px_rgba(0,0,0,0.4)]">
        {text}
      </div>
    </div>
  );
}
