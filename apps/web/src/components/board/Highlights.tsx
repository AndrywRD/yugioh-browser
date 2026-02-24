type HighlightVariant = "selected" | "target" | "valid";

interface HighlightsProps {
  variant: HighlightVariant;
  className?: string;
}

function cx(...classes: Array<string | false | undefined>) {
  return classes.filter(Boolean).join(" ");
}

function getHighlightAsset(variant: HighlightVariant): string {
  if (variant === "target") return "/ui/highlight_target_red.png";
  if (variant === "valid") return "/ui/highlight_valid_green.png";
  return "/ui/highlight_selected_cyan.png";
}

export function Highlights({ variant, className }: HighlightsProps) {
  return (
    <img
      src={getHighlightAsset(variant)}
      alt=""
      aria-hidden
      className={cx(
        "pointer-events-none absolute inset-0 z-highlights h-full w-full object-fill opacity-95 drop-shadow-[0_0_10px_rgba(0,0,0,0.52)]",
        className
      )}
    />
  );
}
