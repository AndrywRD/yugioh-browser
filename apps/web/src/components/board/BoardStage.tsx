import { useEffect, useMemo, useState, type MouseEvent as ReactMouseEvent } from "react";
import type { CardClientView, MonsterClientView, SpellTrapClientView } from "@ruptura-arcana/shared";
import { CardView } from "../card/CardView";
import { toAnchorRect, type AnchorRect } from "../../lib/anchors";
import { buildSlotRectId } from "../../lib/animation/rectRegistry";
import { Board } from "./Board";
import { Highlights } from "./Highlights";
import { TargetingOverlay } from "./TargetingOverlay";
import {
  ENEMY_MONSTER_SLOTS,
  ENEMY_SPELL_TRAP_SLOTS,
  PLAYER_MONSTER_SLOTS,
  PLAYER_SPELL_TRAP_SLOTS,
  type BoardSlotSide,
  type BoardSlotZone
} from "./slots";
import { BOARD_ZONES, type ZoneId } from "./zones";
import { VfxOverlay } from "../vfx/VfxOverlay";

export interface SlotMarker {
  side: BoardSlotSide;
  zone: BoardSlotZone;
  slotIndex: number;
}

export interface SlotBadge extends SlotMarker {
  label: string;
}

export interface SlotEffect extends SlotMarker {
  effect: "attack" | "hit" | "summon" | "fusion" | "destroy";
}

interface ZonePopoverState {
  id: ZoneId;
  xPct: number;
  yPct: number;
}

interface BoardStageProps {
  playerMonsters: Array<MonsterClientView | null>;
  enemyMonsters: Array<MonsterClientView | null>;
  playerSpellTraps: Array<SpellTrapClientView | null>;
  enemySpellTraps: Array<SpellTrapClientView | null>;
  zoneCounts?: Partial<Record<ZoneId, number>>;
  zoneCards?: Partial<Record<ZoneId, CardClientView[]>>;
  selectedSlots?: SlotMarker[];
  targetSlots?: SlotMarker[];
  highlightedSlots?: SlotMarker[];
  slotBadges?: SlotBadge[];
  slotEffects?: SlotEffect[];
  targetingMode?: "ATTACK" | "FUSION" | null;
  attackEffectSlot?: SlotMarker | null;
  hitEffectSlot?: SlotMarker | null;
  inputLocked?: boolean;
  registerCardElement?: (instanceId: string, element: HTMLButtonElement | null) => void;
  registerSlotElement?: (slotId: string, element: HTMLButtonElement | null) => void;
  registerZoneElement?: (zoneId: string, element: HTMLElement | null) => void;
  onClickSlot: (slotIndex: number, side: BoardSlotSide, zone: BoardSlotZone, anchorRect: AnchorRect) => void;
  onHoverSlot?: (slotIndex: number, side: BoardSlotSide, zone: BoardSlotZone, anchorRect: AnchorRect | null) => void;
  onHoverMonster?: (
    card: {
      source: "FIELD" | "OPP_FIELD" | "FIELD_SPELL_TRAP" | "OPP_SPELL_TRAP";
      name: string;
      atk: number;
      def: number;
      position?: "ATTACK" | "DEFENSE";
      effectDescription?: string;
      imagePath?: string;
    } | null,
    anchorRect: AnchorRect | null
  ) => void;
}

const FULL_DECK_SIZE = 40;
const BACK_CARD_IMAGE = "/images/cartas/Back-FMR-EN-VG.png";

function includesMarker(markers: SlotMarker[] | undefined, side: BoardSlotSide, zone: BoardSlotZone, slotIndex: number): boolean {
  return Boolean(markers?.some((marker) => marker.side === side && marker.zone === zone && marker.slotIndex === slotIndex));
}

function markerMatch(marker: SlotMarker | null | undefined, side: BoardSlotSide, zone: BoardSlotZone, slotIndex: number): boolean {
  return Boolean(marker && marker.side === side && marker.zone === zone && marker.slotIndex === slotIndex);
}

function getBadge(slotBadges: SlotBadge[] | undefined, side: BoardSlotSide, zone: BoardSlotZone, slotIndex: number): string | undefined {
  return slotBadges?.find((badge) => badge.side === side && badge.zone === zone && badge.slotIndex === slotIndex)?.label;
}

function getSlotEffect(
  slotEffects: SlotEffect[] | undefined,
  side: BoardSlotSide,
  zone: BoardSlotZone,
  slotIndex: number
): "attack" | "hit" | "summon" | "fusion" | "destroy" | undefined {
  return slotEffects?.find((effect) => effect.side === side && effect.zone === zone && effect.slotIndex === slotIndex)?.effect;
}

function isDebugEnabledByEnv(): boolean {
  const value = process.env.NEXT_PUBLIC_DEBUG_SLOTS ?? "";
  return value === "1" || value.toLowerCase() === "true";
}

function zoneLabel(id: ZoneId): string {
  if (id === "DECK_OPP") return "Deck Oponente";
  if (id === "GRAVE_OPP") return "Cemiterio Oponente";
  if (id === "DECK_YOU") return "Seu Deck";
  return "Seu Cemiterio";
}

function zoneShortLabel(id: ZoneId): string {
  if (id.startsWith("DECK")) return "D";
  return "G";
}

function buildZonePopover(zoneId: ZoneId): ZonePopoverState {
  const zone = BOARD_ZONES.find((item) => item.id === zoneId);
  if (!zone) {
    return { id: zoneId, xPct: 50, yPct: 50 };
  }

  const isTopZone = zoneId.endsWith("OPP");
  return {
    id: zoneId,
    xPct: zone.left + zone.w / 2,
    yPct: isTopZone ? zone.top + zone.h + 1.5 : zone.top - 1.5
  };
}

function isDeckZone(zoneId: ZoneId): boolean {
  return zoneId === "DECK_OPP" || zoneId === "DECK_YOU";
}

function isGraveZone(zoneId: ZoneId): boolean {
  return zoneId === "GRAVE_OPP" || zoneId === "GRAVE_YOU";
}

function zoneRectId(zoneId: ZoneId): "zone:deck:player" | "zone:deck:enemy" | "zone:grave:player" | "zone:grave:enemy" {
  if (zoneId === "DECK_YOU") return "zone:deck:player";
  if (zoneId === "DECK_OPP") return "zone:deck:enemy";
  if (zoneId === "GRAVE_YOU") return "zone:grave:player";
  return "zone:grave:enemy";
}

export function BoardStage({
  playerMonsters,
  enemyMonsters,
  playerSpellTraps,
  enemySpellTraps,
  zoneCounts,
  zoneCards,
  selectedSlots,
  targetSlots,
  highlightedSlots,
  slotBadges,
  slotEffects,
  targetingMode,
  attackEffectSlot,
  hitEffectSlot,
  inputLocked = false,
  registerCardElement,
  registerSlotElement,
  registerZoneElement,
  onClickSlot,
  onHoverSlot,
  onHoverMonster
}: BoardStageProps) {
  const [debugSlots, setDebugSlots] = useState<boolean>(() => isDebugEnabledByEnv());
  const [zonePopover, setZonePopover] = useState<ZonePopoverState | null>(null);
  const [graveViewerZone, setGraveViewerZone] = useState<ZoneId | null>(null);

  const zoneCountMap = useMemo(() => zoneCounts ?? {}, [zoneCounts]);
  const zoneCardMap = useMemo(() => zoneCards ?? {}, [zoneCards]);
  const boardInputLocked = Boolean(inputLocked || graveViewerZone);

  const registerSlotRef = (side: BoardSlotSide, zone: BoardSlotZone, slotIndex: number, cardInstanceId?: string) => {
    const slotId = buildSlotRectId(side, zone, slotIndex);
    return (element: HTMLButtonElement | null) => {
      registerSlotElement?.(slotId, element);
      if (cardInstanceId) {
        registerCardElement?.(cardInstanceId, element);
      }
    };
  };

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key.toLowerCase() !== "d") return;
      setDebugSlots((current) => !current);
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  const handleZoneClick = (event: ReactMouseEvent<HTMLButtonElement>, zoneId: ZoneId) => {
    if (boardInputLocked) return;
    event.stopPropagation();
    if (isGraveZone(zoneId)) {
      setZonePopover(null);
      setGraveViewerZone((current) => (current === zoneId ? null : zoneId));
      return;
    }

    setGraveViewerZone(null);
    setZonePopover((current) => {
      if (current?.id === zoneId) return null;
      return buildZonePopover(zoneId);
    });
  };

  const handleSlotClick = (event: ReactMouseEvent<HTMLButtonElement>, slotIndex: number, side: BoardSlotSide, zone: BoardSlotZone) => {
    if (boardInputLocked) return;
    setZonePopover(null);
    setGraveViewerZone(null);
    onClickSlot(slotIndex, side, zone, toAnchorRect(event.currentTarget.getBoundingClientRect()));
  };

  return (
    <div className="relative mx-auto aspect-[3/2] h-auto w-full max-w-[min(100%,calc((100dvh-220px)*1.5))] overflow-hidden rounded-2xl">
      <Board />
      <TargetingOverlay mode={targetingMode ?? null} />

      {debugSlots && (
        <>
          <div className="pointer-events-none absolute inset-0 z-highlights">
            <div className="absolute left-1/2 top-0 h-full w-px -translate-x-1/2 bg-cyan-300/50" />
            <div className="absolute left-0 top-1/2 h-px w-full -translate-y-1/2 bg-cyan-300/50" />
          </div>
          <span className="pointer-events-none absolute right-2 top-2 z-tooltip rounded bg-cyan-900/80 px-2 py-1 text-[10px] font-bold text-cyan-100">
            DEBUG SLOTS (D)
          </span>
        </>
      )}

      <div className="pointer-events-none absolute inset-0 z-slots">
        {BOARD_ZONES.map((zone) => {
          const count = zoneCountMap[zone.id] ?? 0;
          const cardsInZone = zoneCardMap[zone.id] ?? [];
          const lastGraveCard = cardsInZone.length ? cardsInZone[cardsInZone.length - 1] : null;
          const deckCountForVisual = count > 0 ? count : FULL_DECK_SIZE;
          const deckLayerCount = Math.max(3, Math.min(8, Math.ceil(deckCountForVisual / 6)));
          return (
            <button
              key={zone.id}
              type="button"
              ref={(element) => registerZoneElement?.(zoneRectId(zone.id), element)}
              onClick={(event) => handleZoneClick(event, zone.id)}
              className={`${boardInputLocked ? "pointer-events-none" : "pointer-events-auto"} absolute rounded-md border border-amber-300/35 bg-black/25 shadow-[0_8px_14px_rgba(0,0,0,0.35)] transition-all hover:border-amber-200/70 hover:bg-black/35 ${
                debugSlots ? "ring-1 ring-cyan-300/80" : ""
              }`}
              style={{ left: `${zone.left}%`, top: `${zone.top}%`, width: `${zone.w}%`, height: `${zone.h}%` }}
            >
              {isDeckZone(zone.id) && (
                <span className="pointer-events-none absolute inset-0">
                  {Array.from({ length: deckLayerCount }).map((_, layerIndex) => {
                    const offset = (deckLayerCount - layerIndex - 1) * 1.4;
                    const opacity = 0.5 + layerIndex * 0.07;
                    return (
                      <img
                        key={`${zone.id}-deck-${layerIndex}`}
                        src={BACK_CARD_IMAGE}
                        alt=""
                        aria-hidden
                        className="absolute rounded-sm object-cover shadow-[0_4px_8px_rgba(0,0,0,0.45)]"
                        style={{
                          left: `${8 + offset}%`,
                          top: `${7 + offset}%`,
                          width: "68%",
                          height: "82%",
                          opacity: Math.min(1, opacity)
                        }}
                      />
                    );
                  })}
                  <span className="absolute inset-0 rounded-md bg-gradient-to-br from-transparent via-transparent to-black/35" />
                </span>
              )}

              {isGraveZone(zone.id) && lastGraveCard?.imagePath ? (
                <span className="pointer-events-none absolute inset-0 overflow-hidden rounded-md">
                  <img
                    src={lastGraveCard.imagePath}
                    alt={lastGraveCard.name}
                    className="h-full w-full object-cover opacity-90"
                    onError={(event) => {
                      event.currentTarget.style.display = "none";
                    }}
                  />
                  <span className="absolute inset-0 bg-gradient-to-b from-black/10 via-black/5 to-black/45" />
                </span>
              ) : null}

              <span className="pointer-events-none absolute left-1.5 top-1 rounded bg-slate-950/80 px-1 text-[10px] font-bold text-amber-200">
                {zoneShortLabel(zone.id)}
              </span>
              <span className="pointer-events-none absolute bottom-1 right-1 rounded bg-slate-950/85 px-1.5 text-[10px] font-semibold text-amber-100">
                {isDeckZone(zone.id) ? `${count}/${FULL_DECK_SIZE}` : count}
              </span>
              {debugSlots && (
                <span className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded bg-black/70 px-1.5 py-0.5 text-[10px] font-bold text-cyan-100">
                  {zone.id}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {zonePopover && (
        <div
          className="pointer-events-none absolute z-tooltip -translate-x-1/2 rounded-lg border border-amber-200/55 bg-slate-950/90 px-3 py-2 text-xs text-amber-100 shadow-[0_12px_28px_rgba(0,0,0,0.45)]"
          style={{ left: `${zonePopover.xPct}%`, top: `${zonePopover.yPct}%` }}
        >
          <p className="font-semibold">{zoneLabel(zonePopover.id)}</p>
          <p>Total: {zoneCountMap[zonePopover.id] ?? 0}</p>
        </div>
      )}

      {graveViewerZone && (
        <div
          className="fixed inset-0 z-[140] flex items-center justify-center bg-black/55 p-4"
          onClick={() => setGraveViewerZone(null)}
        >
          <div
            className="w-full max-w-[860px] rounded-xl border border-amber-300/40 bg-slate-950/95 p-3 shadow-[0_22px_44px_rgba(0,0,0,0.55)]"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="mb-2 flex items-center justify-between border-b border-slate-700 pb-2">
              <div>
                <p className="text-sm font-semibold text-amber-100">{zoneLabel(graveViewerZone)}</p>
                <p className="text-xs text-slate-300">Cartas: {(zoneCardMap[graveViewerZone] ?? []).length}</p>
              </div>
              <button
                type="button"
                onClick={() => setGraveViewerZone(null)}
                className="rounded-md border border-slate-500/70 bg-slate-800/85 px-2 py-1 text-xs font-semibold text-slate-100 hover:border-slate-300/80"
              >
                Fechar
              </button>
            </div>

            <div className="max-h-[48vh] overflow-y-auto pr-1">
              {(zoneCardMap[graveViewerZone] ?? []).length === 0 ? (
                <p className="rounded-md border border-slate-700 bg-slate-900/70 p-3 text-sm text-slate-300">Cemiterio vazio.</p>
              ) : (
                <ul className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                  {[...(zoneCardMap[graveViewerZone] ?? [])].reverse().map((card, index) => (
                    <li
                      key={`${card.instanceId}-${index}`}
                      className="flex items-center gap-2 rounded-md border border-slate-700 bg-slate-900/80 p-2"
                    >
                      <div className="h-16 w-12 shrink-0 overflow-hidden rounded border border-slate-600/70 bg-slate-900">
                        {card.imagePath ? (
                          <img
                            src={card.imagePath}
                            alt={card.name}
                            className="h-full w-full object-cover"
                            onError={(event) => {
                              event.currentTarget.style.display = "none";
                            }}
                          />
                        ) : null}
                      </div>
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-slate-100">{card.name}</p>
                        <p className="text-xs text-slate-300">
                          ATK {card.atk} / DEF {card.def}
                        </p>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </div>
      )}

      <div className="pointer-events-none absolute inset-0 z-cards">
        {ENEMY_MONSTER_SLOTS.map((slot, slotIndex) => {
          const monster = enemyMonsters[slotIndex];
          const hasMonster = Boolean(monster);
          const selected = includesMarker(selectedSlots, "ENEMY", "MONSTER", slotIndex);
          const highlighted = includesMarker(highlightedSlots, "ENEMY", "MONSTER", slotIndex);
          const target = includesMarker(targetSlots, "ENEMY", "MONSTER", slotIndex);
          const visualEffect =
            getSlotEffect(slotEffects, "ENEMY", "MONSTER", slotIndex) ??
            (markerMatch(attackEffectSlot, "ENEMY", "MONSTER", slotIndex)
              ? "attack"
              : markerMatch(hitEffectSlot, "ENEMY", "MONSTER", slotIndex)
                ? "hit"
                : undefined);
          return (
            <button
              key={`enemy-${slotIndex}`}
              type="button"
              ref={registerSlotRef("ENEMY", "MONSTER", slotIndex, monster?.instanceId)}
              onClick={(event) => handleSlotClick(event, slotIndex, "ENEMY", "MONSTER")}
              onMouseEnter={(event) => {
                const anchorRect = toAnchorRect(event.currentTarget.getBoundingClientRect());
                onHoverSlot?.(slotIndex, "ENEMY", "MONSTER", anchorRect);
                if (monster) {
                  onHoverMonster?.(
                    {
                      source: "OPP_FIELD",
                      name: monster.name,
                      atk: monster.atk,
                      def: monster.def,
                      position: monster.position,
                      effectDescription: monster.effectDescription,
                      imagePath: monster.imagePath
                    },
                    anchorRect
                  );
                }
              }}
              onMouseLeave={() => {
                onHoverSlot?.(slotIndex, "ENEMY", "MONSTER", null);
                onHoverMonster?.(null, null);
              }}
              className={`${boardInputLocked ? "pointer-events-none" : "pointer-events-auto"} absolute rounded-md border transition-all duration-150 ${
                hasMonster
                  ? "border-rose-400/60 bg-rose-900/20 hover:border-rose-300 hover:bg-rose-800/20"
                  : "border-amber-200/25 bg-black/10 hover:border-amber-100/55"
              } ${
                debugSlots ? "border-2 border-cyan-300/80" : ""
              }`}
              style={{
                left: `${slot.left}%`,
                top: `${slot.top}%`,
                width: `${slot.w}%`,
                height: `${slot.h}%`
              }}
            >
              {highlighted && !target && !selected ? <Highlights variant="valid" /> : null}
              {selected && !target ? <Highlights variant="selected" /> : null}
              {target ? <Highlights variant="target" /> : null}

              {debugSlots && (
                <span className="pointer-events-none absolute left-1/2 top-1/2 z-30 -translate-x-1/2 -translate-y-1/2 rounded bg-black/70 px-1.5 py-0.5 text-[10px] font-bold text-cyan-100">
                  E{slot.index}
                </span>
              )}

              {visualEffect === "summon" || visualEffect === "fusion" || visualEffect === "destroy" ? <VfxOverlay kind={visualEffect} /> : null}

              {monster ? (
                <CardView
                  name={monster.name}
                  atk={monster.atk}
                  def={monster.def}
                  position={monster.position}
                  imagePath={monster.imagePath}
                  faceDown={monster.face === "FACE_DOWN"}
                  mini
                  canInteract
                  selected={selected}
                  highlighted={highlighted}
                  isTarget={target}
                  badge={getBadge(slotBadges, "ENEMY", "MONSTER", slotIndex)}
                  effect={visualEffect}
                  hasAttacked={monster.hasAttackedThisTurn}
                  positionChanged={monster.positionChangedThisTurn}
                  cannotAttack={monster.cannotAttackThisTurn}
                />
              ) : null}
            </button>
          );
        })}

        {ENEMY_SPELL_TRAP_SLOTS.map((slot, slotIndex) => {
          const card = enemySpellTraps[slotIndex];
          const hasCard = Boolean(card);
          const selected = includesMarker(selectedSlots, "ENEMY", "SPELL_TRAP", slotIndex);
          const highlighted = includesMarker(highlightedSlots, "ENEMY", "SPELL_TRAP", slotIndex);
          const target = includesMarker(targetSlots, "ENEMY", "SPELL_TRAP", slotIndex);
          const visualEffect = getSlotEffect(slotEffects, "ENEMY", "SPELL_TRAP", slotIndex);
          return (
            <button
              key={`enemy-spell-${slotIndex}`}
              type="button"
              ref={registerSlotRef("ENEMY", "SPELL_TRAP", slotIndex, card?.instanceId)}
              onClick={(event) => handleSlotClick(event, slotIndex, "ENEMY", "SPELL_TRAP")}
              onMouseEnter={(event) => {
                const anchorRect = toAnchorRect(event.currentTarget.getBoundingClientRect());
                onHoverSlot?.(slotIndex, "ENEMY", "SPELL_TRAP", anchorRect);
                if (card) {
                  onHoverMonster?.(
                    {
                      source: "OPP_SPELL_TRAP",
                      name: card.name,
                      atk: card.atk,
                      def: card.def,
                      effectDescription: card.effectDescription,
                      imagePath: card.imagePath
                    },
                    anchorRect
                  );
                }
              }}
              onMouseLeave={() => {
                onHoverSlot?.(slotIndex, "ENEMY", "SPELL_TRAP", null);
                onHoverMonster?.(null, null);
              }}
              className={`${boardInputLocked ? "pointer-events-none" : "pointer-events-auto"} absolute rounded-md border transition-all duration-150 ${
                hasCard
                  ? "border-violet-300/60 bg-violet-900/20 hover:border-violet-200 hover:bg-violet-800/20"
                  : "border-violet-200/30 bg-black/10 hover:border-violet-100/55"
              } ${debugSlots ? "border-2 border-cyan-300/80" : ""}`}
              style={{
                left: `${slot.left}%`,
                top: `${slot.top}%`,
                width: `${slot.w}%`,
                height: `${slot.h}%`
              }}
            >
              {highlighted && !target && !selected ? <Highlights variant="valid" /> : null}
              {selected && !target ? <Highlights variant="selected" /> : null}
              {target ? <Highlights variant="target" /> : null}

              {debugSlots && (
                <span className="pointer-events-none absolute left-1/2 top-1/2 z-30 -translate-x-1/2 -translate-y-1/2 rounded bg-black/70 px-1.5 py-0.5 text-[10px] font-bold text-cyan-100">
                  ES{slot.index}
                </span>
              )}

              {card ? (
                <CardView
                  name={card.name}
                  atk={card.atk}
                  def={card.def}
                  position="ATTACK"
                  imagePath={card.imagePath}
                  mini
                  canInteract
                  selected={selected}
                  highlighted={highlighted}
                  isTarget={target}
                  isSpellTrap
                  faceDown={card.face === "FACE_DOWN"}
                  badge={getBadge(slotBadges, "ENEMY", "SPELL_TRAP", slotIndex)}
                  effect={visualEffect}
                />
              ) : null}
            </button>
          );
        })}

        {PLAYER_MONSTER_SLOTS.map((slot, slotIndex) => {
          const monster = playerMonsters[slotIndex];
          const hasMonster = Boolean(monster);
          const selected = includesMarker(selectedSlots, "PLAYER", "MONSTER", slotIndex);
          const highlighted = includesMarker(highlightedSlots, "PLAYER", "MONSTER", slotIndex);
          const target = includesMarker(targetSlots, "PLAYER", "MONSTER", slotIndex);
          const visualEffect =
            getSlotEffect(slotEffects, "PLAYER", "MONSTER", slotIndex) ??
            (markerMatch(attackEffectSlot, "PLAYER", "MONSTER", slotIndex)
              ? "attack"
              : markerMatch(hitEffectSlot, "PLAYER", "MONSTER", slotIndex)
                ? "hit"
                : undefined);
          return (
            <button
              key={`player-${slotIndex}`}
              type="button"
              ref={registerSlotRef("PLAYER", "MONSTER", slotIndex, monster?.instanceId)}
              onClick={(event) => handleSlotClick(event, slotIndex, "PLAYER", "MONSTER")}
              onMouseEnter={(event) => {
                const anchorRect = toAnchorRect(event.currentTarget.getBoundingClientRect());
                onHoverSlot?.(slotIndex, "PLAYER", "MONSTER", anchorRect);
                if (monster) {
                  onHoverMonster?.(
                    {
                      source: "FIELD",
                      name: monster.name,
                      atk: monster.atk,
                      def: monster.def,
                      position: monster.position,
                      effectDescription: monster.effectDescription,
                      imagePath: monster.imagePath
                    },
                    anchorRect
                  );
                }
              }}
              onMouseLeave={() => {
                onHoverSlot?.(slotIndex, "PLAYER", "MONSTER", null);
                onHoverMonster?.(null, null);
              }}
              className={`${boardInputLocked ? "pointer-events-none" : "pointer-events-auto"} absolute rounded-md border transition-all duration-150 ${
                hasMonster
                  ? "border-cyan-300/70 bg-cyan-900/20 hover:border-cyan-200 hover:bg-cyan-800/15"
                  : "border-amber-200/25 bg-black/10 hover:border-cyan-200/55"
              } ${
                debugSlots ? "border-2 border-cyan-300/80" : ""
              }`}
              style={{
                left: `${slot.left}%`,
                top: `${slot.top}%`,
                width: `${slot.w}%`,
                height: `${slot.h}%`
              }}
            >
              {highlighted && !target && !selected ? <Highlights variant="valid" /> : null}
              {selected && !target ? <Highlights variant="selected" /> : null}
              {target ? <Highlights variant="target" /> : null}

              {debugSlots && (
                <span className="pointer-events-none absolute left-1/2 top-1/2 z-30 -translate-x-1/2 -translate-y-1/2 rounded bg-black/70 px-1.5 py-0.5 text-[10px] font-bold text-cyan-100">
                  P{slot.index}
                </span>
              )}

              {visualEffect === "summon" || visualEffect === "fusion" || visualEffect === "destroy" ? <VfxOverlay kind={visualEffect} /> : null}

              {monster ? (
                <CardView
                  name={monster.name}
                  atk={monster.atk}
                  def={monster.def}
                  position={monster.position}
                  imagePath={monster.imagePath}
                  faceDown={monster.face === "FACE_DOWN"}
                  canInteract
                  selected={selected}
                  highlighted={highlighted}
                  isTarget={target}
                  badge={getBadge(slotBadges, "PLAYER", "MONSTER", slotIndex)}
                  effect={visualEffect}
                  hasAttacked={monster.hasAttackedThisTurn}
                  positionChanged={monster.positionChangedThisTurn}
                  cannotAttack={monster.cannotAttackThisTurn}
                />
              ) : null}
            </button>
          );
        })}

        {PLAYER_SPELL_TRAP_SLOTS.map((slot, slotIndex) => {
          const card = playerSpellTraps[slotIndex];
          const hasCard = Boolean(card);
          const selected = includesMarker(selectedSlots, "PLAYER", "SPELL_TRAP", slotIndex);
          const highlighted = includesMarker(highlightedSlots, "PLAYER", "SPELL_TRAP", slotIndex);
          const target = includesMarker(targetSlots, "PLAYER", "SPELL_TRAP", slotIndex);
          const visualEffect = getSlotEffect(slotEffects, "PLAYER", "SPELL_TRAP", slotIndex);
          return (
            <button
              key={`player-spell-${slotIndex}`}
              type="button"
              ref={registerSlotRef("PLAYER", "SPELL_TRAP", slotIndex, card?.instanceId)}
              onClick={(event) => handleSlotClick(event, slotIndex, "PLAYER", "SPELL_TRAP")}
              onMouseEnter={(event) => {
                const anchorRect = toAnchorRect(event.currentTarget.getBoundingClientRect());
                onHoverSlot?.(slotIndex, "PLAYER", "SPELL_TRAP", anchorRect);
                if (card) {
                  onHoverMonster?.(
                    {
                      source: "FIELD_SPELL_TRAP",
                      name: card.name,
                      atk: card.atk,
                      def: card.def,
                      effectDescription: card.effectDescription,
                      imagePath: card.imagePath
                    },
                    anchorRect
                  );
                }
              }}
              onMouseLeave={() => {
                onHoverSlot?.(slotIndex, "PLAYER", "SPELL_TRAP", null);
                onHoverMonster?.(null, null);
              }}
              className={`${boardInputLocked ? "pointer-events-none" : "pointer-events-auto"} absolute rounded-md border transition-all duration-150 ${
                hasCard
                  ? "border-violet-300/65 bg-violet-900/24 hover:border-violet-200 hover:bg-violet-800/20"
                  : "border-violet-200/30 bg-black/10 hover:border-violet-100/55"
              } ${debugSlots ? "border-2 border-cyan-300/80" : ""}`}
              style={{
                left: `${slot.left}%`,
                top: `${slot.top}%`,
                width: `${slot.w}%`,
                height: `${slot.h}%`
              }}
            >
              {highlighted && !target && !selected ? <Highlights variant="valid" /> : null}
              {selected && !target ? <Highlights variant="selected" /> : null}
              {target ? <Highlights variant="target" /> : null}

              {debugSlots && (
                <span className="pointer-events-none absolute left-1/2 top-1/2 z-30 -translate-x-1/2 -translate-y-1/2 rounded bg-black/70 px-1.5 py-0.5 text-[10px] font-bold text-cyan-100">
                  PS{slot.index}
                </span>
              )}

              {card ? (
                <CardView
                  name={card.name}
                  atk={card.atk}
                  def={card.def}
                  position="ATTACK"
                  imagePath={card.imagePath}
                  canInteract
                  selected={selected}
                  highlighted={highlighted}
                  isTarget={target}
                  isSpellTrap
                  faceDown={card.face === "FACE_DOWN"}
                  badge={getBadge(slotBadges, "PLAYER", "SPELL_TRAP", slotIndex)}
                  effect={visualEffect}
                />
              ) : null}
            </button>
          );
        })}
      </div>
    </div>
  );
}
