"use client";

interface CardPreviewData {
  name: string;
  atk: number;
  def: number;
  position?: "ATTACK" | "DEFENSE";
  effectDescription?: string;
  imagePath?: string;
}

interface CardPreviewProps {
  card: CardPreviewData | null;
  dimmed?: boolean;
}

export function CardPreview({ card, dimmed = false }: CardPreviewProps) {
  if (!card) return null;

  return (
    <div
      className={`pointer-events-none absolute bottom-[86px] right-4 z-preview w-[300px] max-w-[30vw] min-w-[220px] transition-opacity max-[1100px]:w-[250px] max-[1100px]:max-w-[36vw] max-[760px]:w-[220px] max-[760px]:max-w-[45vw] ${
        dimmed ? "opacity-55" : "opacity-95"
      }`}
    >
      <div className="rounded-xl border border-amber-200/45 bg-gradient-to-b from-slate-900/95 via-slate-800/88 to-slate-950/95 p-2.5 shadow-[0_16px_32px_rgba(0,0,0,0.55)]">
        <div className="mb-1.5 rounded border border-amber-200/35 bg-black/25 px-2 py-1 text-center text-xs font-semibold text-amber-100">
          Preview
        </div>
        <div className="relative aspect-[0.7] overflow-hidden rounded-md border border-cyan-300/30 bg-gradient-to-b from-slate-700/70 to-slate-950/95 p-2">
          {card.imagePath ? (
            <img src={card.imagePath} alt={card.name} className="h-full w-full object-contain object-center" loading="lazy" />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-xs text-slate-300">Sem imagem</div>
          )}
        </div>
        <p className="mt-2 truncate text-center text-sm font-semibold text-cyan-100">{card.name}</p>
        {card.effectDescription ? (
          <p className="mt-1 rounded-md border border-cyan-300/25 bg-slate-950/70 px-2 py-1.5 text-[11px] leading-relaxed text-slate-200">
            {card.effectDescription}
          </p>
        ) : null}
      </div>
    </div>
  );
}
