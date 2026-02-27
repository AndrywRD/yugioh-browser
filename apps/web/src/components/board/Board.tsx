export function Board() {
  return (
    <div className="relative h-full w-full overflow-hidden rounded-2xl border border-amber-200/20 shadow-[0_30px_70px_rgba(0,0,0,0.45)]">
      <img
        src="/board/board-widescreen.png"
        alt="Yu-Gi-Oh! Súbita board"
        className="h-full w-full object-cover"
        style={{ filter: "contrast(1.05) saturate(1.05)" }}
      />
      <div className="pointer-events-none absolute inset-0 bg-black/10" />
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(255,255,255,0.10)_0%,rgba(255,255,255,0.02)_40%,rgba(0,0,0,0.42)_100%)]" />
    </div>
  );
}
