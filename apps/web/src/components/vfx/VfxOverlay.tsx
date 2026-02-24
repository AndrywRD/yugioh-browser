interface VfxOverlayProps {
  kind: "summon" | "fusion" | "destroy";
}

function cx(...classes: Array<string | false | undefined>) {
  return classes.filter(Boolean).join(" ");
}

export function VfxOverlay({ kind }: VfxOverlayProps) {
  return (
    <div
      className={cx(
        "pointer-events-none absolute inset-0 z-tooltip rounded-md",
        kind === "summon" && "vfx-summon",
        kind === "fusion" && "vfx-fusion",
        kind === "destroy" && "vfx-destroy"
      )}
    />
  );
}
