function cx(...classes: Array<string | false | undefined>) {
  return classes.filter(Boolean).join(" ");
}

interface CardViewProps {
  name: string;
  atk: number;
  def: number;
  position: "ATTACK" | "DEFENSE";
  imagePath?: string;
  faceDown?: boolean;
  isSpellTrap?: boolean;
  selected?: boolean;
  highlighted?: boolean;
  canInteract?: boolean;
  isTarget?: boolean;
  disabled?: boolean;
  mini?: boolean;
  effect?: "attack" | "hit" | "summon" | "fusion" | "destroy";
  badge?: string;
  hasAttacked?: boolean;
  positionChanged?: boolean;
  cannotAttack?: boolean;
}

export function CardView({
  name,
  atk,
  def,
  position,
  imagePath,
  faceDown = false,
  isSpellTrap = false,
  selected = false,
  highlighted = false,
  canInteract = true,
  isTarget = false,
  disabled = false,
  mini = false,
  effect,
  badge,
  hasAttacked = false,
  positionChanged = false,
  cannotAttack = false
}: CardViewProps) {
  return (
    <div
      className={cx(
        "group relative h-full w-full overflow-hidden rounded-md border border-cyan-300/20 bg-gradient-to-b from-slate-900/95 via-slate-800/85 to-slate-950/95 text-left shadow-[0_16px_28px_rgba(0,0,0,0.58)] transition-transform duration-200",
        canInteract && !disabled && "hover:-translate-y-1 hover:scale-[1.02] hover:rotate-[1deg] hover:border-emerald-300/70",
        highlighted && "shadow-[0_0_18px_rgba(74,222,128,0.55)]",
        selected && "border-cyan-200/70 shadow-[0_0_20px_rgba(34,211,238,0.72)]",
        isTarget && "border-rose-300/75 shadow-[0_0_22px_rgba(251,113,133,0.78)]",
        disabled && "opacity-45 saturate-50",
        effect === "attack" && "attack-anim",
        effect === "hit" && "hit-anim",
        effect === "summon" && "summon-anim",
        effect === "fusion" && "fusion-anim",
        effect === "destroy" && "destroy-anim"
      )}
    >
      {badge ? (
        <span className="absolute right-1.5 top-1.5 z-20 inline-flex h-5 w-5 items-center justify-center rounded-full bg-amber-400 text-[10px] font-black text-slate-950 shadow">
          {badge}
        </span>
      ) : null}
      {!isSpellTrap && (hasAttacked || positionChanged || cannotAttack) ? (
        <div className="absolute left-1.5 top-1.5 z-20 flex flex-col gap-1">
          {hasAttacked ? (
            <span className="rounded bg-rose-900/90 px-1 py-0.5 text-[9px] font-bold text-rose-100">
              ATK OK
            </span>
          ) : null}
          {positionChanged ? (
            <span className="rounded bg-sky-900/90 px-1 py-0.5 text-[9px] font-bold text-sky-100">
              POS
            </span>
          ) : null}
          {cannotAttack ? (
            <span className="rounded bg-slate-900/90 px-1 py-0.5 text-[9px] font-bold text-slate-100">
              LOCK
            </span>
          ) : null}
        </div>
      ) : null}
      {(imagePath || faceDown) ? (
        <img
          src={faceDown ? "/images/cartas/Back-FMR-EN-VG.png" : imagePath}
          alt={faceDown ? "Carta virada para baixo" : name}
          className={cx(
            "absolute inset-0 h-full w-full object-cover",
            !isSpellTrap && position === "DEFENSE" && "origin-center rotate-90 scale-[0.76]"
          )}
          loading="lazy"
        />
      ) : null}
      <div
        className={cx(
          "absolute inset-0 opacity-45",
          isSpellTrap ? "bg-violet-950/70" : position === "ATTACK" ? "bg-red-950/70" : "bg-blue-950/70"
        )}
      />
      <div className="absolute inset-0 bg-gradient-to-b from-black/20 via-black/10 to-black/65" />
      <div className={cx("relative flex h-full flex-col justify-between p-2", mini && "p-1")}>
        <p className={cx("truncate font-semibold text-cyan-100", mini ? "text-[10px]" : "text-xs")}>
          {faceDown ? (isSpellTrap ? "Set" : "Face-down") : name}
        </p>
        <div className="flex items-end justify-between gap-2">
          {isSpellTrap ? (
            <span className={cx("inline-flex rounded bg-black/55 px-1.5 py-0.5 font-bold text-violet-200", mini ? "text-[9px]" : "text-[10px]")}>
              {faceDown ? "S/T" : "ATIVA"}
            </span>
          ) : (
            <>
              <span
                className={cx(
                  "inline-flex items-center gap-1 rounded bg-black/55 px-1.5 py-0.5 font-bold",
                  mini ? "text-[9px]" : "text-[10px]",
                  position === "ATTACK" ? "text-amber-300" : "text-sky-300"
                )}
              >
                <img
                  src={position === "ATTACK" ? "/icons/icon_sword.png" : "/icons/icon_shield.png"}
                  alt=""
                  aria-hidden
                  className={cx("shrink-0 opacity-90", mini ? "h-2.5 w-2.5" : "h-3 w-3")}
                />
                {position === "ATTACK" ? "A" : "D"}
              </span>
              <p className={cx("font-mono text-emerald-200", mini ? "text-[10px]" : "text-[11px]")}>
                {faceDown ? "?" : `${atk}/${def}`}
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
