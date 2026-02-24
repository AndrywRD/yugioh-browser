interface DamageNumberProps {
  value: number;
  type: "damage" | "heal";
  side: "YOU" | "OPP";
}

function cx(...classes: Array<string | false | undefined>) {
  return classes.filter(Boolean).join(" ");
}

export function DamageNumber({ value, type, side }: DamageNumberProps) {
  return (
    <div
      className={cx(
        "pointer-events-none absolute z-tooltip select-none text-xl font-black tracking-wide damage-float",
        side === "OPP" ? "right-[13%] top-[7%]" : "right-[13%] top-[20%]",
        type === "damage" ? "text-rose-300" : "text-emerald-300"
      )}
    >
      <span className="drop-shadow-[0_0_8px_rgba(0,0,0,0.65)]">{type === "damage" ? `-${value}` : `+${value}`}</span>
    </div>
  );
}
