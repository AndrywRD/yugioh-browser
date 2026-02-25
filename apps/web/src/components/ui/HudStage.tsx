import type { ReactNode } from "react";

type HudStageProps = {
  children: ReactNode;
  contentClassName?: string;
};

export function HudStage({ children, contentClassName }: HudStageProps) {
  return (
    <main className="fm-screen fm-noise-overlay relative min-h-[100dvh] overflow-x-hidden overflow-y-auto p-3 text-slate-100 sm:p-4">
      <div className="mx-auto flex min-h-[calc(100dvh-1.5rem)] w-full max-w-[1820px] items-stretch justify-center sm:min-h-[calc(100dvh-2rem)]">
        <section className="relative h-full w-full overflow-hidden rounded-[20px] border border-[#d1a95b]/45 bg-[linear-gradient(180deg,rgba(8,18,38,0.92),rgba(4,10,24,0.96))] shadow-[0_18px_64px_rgba(0,0,0,0.62)]">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(120%_90%_at_18%_20%,rgba(108,145,255,0.16),transparent_56%),linear-gradient(180deg,rgba(3,9,22,0.14),rgba(3,9,22,0.35))]" />
          <div className={`fm-scroll relative z-10 h-full overflow-y-auto p-4 sm:p-5 ${contentClassName ?? ""}`}>{children}</div>
        </section>
      </div>
    </main>
  );
}
