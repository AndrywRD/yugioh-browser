import { gsap } from "gsap";

const CARD_BACK_PATH = "/images/cartas/Back-FMR-EN-VG.png";
const FX_SLOW_FACTOR = 1.38;
const FM_IMPACT_HOLD_MS = 96;

function slowSec(value: number): number {
  return value * FX_SLOW_FACTOR;
}

function slowMs(value: number): number {
  return Math.round(value * FX_SLOW_FACTOR);
}

function normalizeVector(x: number, y: number): { x: number; y: number } {
  const len = Math.hypot(x, y);
  if (len <= 0.0001) return { x: 0, y: 0 };
  return { x: x / len, y: y / len };
}

function center(rect: DOMRect): { x: number; y: number } {
  return { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
}

function ensureOverlayRoot(overlayRoot: HTMLElement | null): HTMLElement | null {
  if (overlayRoot) return overlayRoot;
  if (typeof document === "undefined") return null;
  return document.body ?? null;
}

function cleanupNode(node: HTMLElement | SVGElement): void {
  gsap.killTweensOf(node);
  node.remove();
}

function createDiv(className: string): HTMLDivElement {
  const node = document.createElement("div");
  node.className = `vfx ${className}`;
  node.setAttribute("aria-hidden", "true");
  return node;
}

function createGhostCard(rect: DOMRect, imagePath?: string, faceDown = false): HTMLDivElement {
  const ghost = createDiv("duel-fx-ghost-card");
  ghost.style.left = `${rect.left}px`;
  ghost.style.top = `${rect.top}px`;
  ghost.style.width = `${rect.width}px`;
  ghost.style.height = `${rect.height}px`;

  const img = document.createElement("img");
  img.className = "duel-fx-ghost-image";
  img.src = faceDown ? CARD_BACK_PATH : imagePath ?? CARD_BACK_PATH;
  img.alt = "";
  ghost.appendChild(img);
  return ghost;
}

function createPulse(x: number, y: number, size: number, className: string): HTMLDivElement {
  const pulse = createDiv(className);
  pulse.style.left = `${x - size / 2}px`;
  pulse.style.top = `${y - size / 2}px`;
  pulse.style.width = `${size}px`;
  pulse.style.height = `${size}px`;
  return pulse;
}

function spawnDustBurst(root: HTMLElement, x: number, y: number, intensity = 12): HTMLElement[] {
  const particles: HTMLElement[] = [];
  for (let i = 0; i < intensity; i += 1) {
    const p = createDiv("duel-fx-dust vfx-additive");
    p.style.left = `${x}px`;
    p.style.top = `${y}px`;
    root.appendChild(p);
    const angle = (Math.PI * 2 * i) / intensity + Math.random() * 0.35;
    const distance = 24 + Math.random() * 44;
    gsap.fromTo(
      p,
      { x: 0, y: 0, opacity: 0.85, scale: 0.55 + Math.random() * 0.35 },
      {
        x: Math.cos(angle) * distance,
        y: Math.sin(angle) * distance - 8,
        opacity: 0,
        scale: 0.15,
        duration: slowSec(0.42 + Math.random() * 0.16),
        ease: "power2.out",
        onComplete: () => cleanupNode(p)
      }
    );
    particles.push(p);
  }
  return particles;
}

async function playTimeline(tl: gsap.core.Timeline): Promise<void> {
  await new Promise<void>((resolve) => {
    tl.eventCallback("onComplete", () => resolve());
    tl.play(0);
  });
}

export async function impactFrames(
  overlayRoot: HTMLElement | null,
  opts: {
    focusRect: DOMRect;
    strength?: number;
    boardRoot?: HTMLElement | null;
  }
): Promise<void> {
  const root = ensureOverlayRoot(overlayRoot);
  if (!root) return;
  const strength = Math.max(1, Math.min(3, opts.strength ?? 1));
  const c = center(opts.focusRect);

  const flash = createPulse(c.x, c.y, 260 + strength * 80, "duel-fx-impact-flash vfx-additive");
  root.appendChild(flash);

  const tl = gsap.timeline({ paused: true });
  tl.fromTo(
    flash,
    { opacity: 0, scale: 0.15 },
    { opacity: 0.1 + 0.06 * strength, scale: 1, duration: slowSec(0.09), ease: "power2.out" }
  ).to(flash, { opacity: 0, scale: 1.22, duration: slowSec(0.11), ease: "power2.in" });

  if (opts.boardRoot) {
    tl.to(
      opts.boardRoot,
      {
        keyframes: [
          { x: -3 * strength, y: 1 * strength, rotate: -0.24 * strength, duration: slowSec(0.045) },
          { x: 2.6 * strength, y: -1.2 * strength, rotate: 0.2 * strength, duration: slowSec(0.045) },
          { x: -1.8 * strength, y: 0.7 * strength, rotate: -0.12 * strength, duration: slowSec(0.04) },
          { x: 0, y: 0, rotate: 0, duration: slowSec(0.05) }
        ],
        ease: "power1.out"
      },
      0
    );
  }

  await playTimeline(tl);
  cleanupNode(flash);
  await new Promise((resolve) => window.setTimeout(resolve, slowMs(FM_IMPACT_HOLD_MS)));
}

export function damageFloater(
  overlayRoot: HTMLElement | null,
  opts: {
    rect: DOMRect;
    amount: number;
    type: "damage" | "heal" | "buff" | "debuff";
    text?: string;
  }
): void {
  const root = ensureOverlayRoot(overlayRoot);
  if (!root) return;
  const c = center(opts.rect);
  const node = createDiv(`duel-fx-floater ${opts.type}`);
  node.textContent = opts.text ?? (opts.amount >= 0 ? `+${opts.amount}` : `${opts.amount}`);
  node.style.left = `${c.x}px`;
  node.style.top = `${c.y}px`;
  root.appendChild(node);

  const driftX = (Math.random() - 0.5) * 14;
  gsap.fromTo(
    node,
    { opacity: 0, scale: 0.68, x: 0, y: 10 },
    {
      opacity: 1,
      scale: 1.1,
      duration: slowSec(0.16),
      ease: "back.out(1.35)",
      onComplete: () => {
        gsap.to(node, {
          x: driftX,
          y: -48,
          opacity: 0,
          scale: 0.9,
          duration: slowSec(0.6),
          ease: "power2.out",
          onComplete: () => cleanupNode(node)
        });
      }
    }
  );
}

export async function attackDash(
  overlayRoot: HTMLElement | null,
  opts: {
    attackerRect: DOMRect;
    targetRect: DOMRect;
    attackerImagePath?: string;
  }
): Promise<void> {
  const root = ensureOverlayRoot(overlayRoot);
  if (!root) return;
  const start = center(opts.attackerRect);
  const end = center(opts.targetRect);
  const dir = normalizeVector(end.x - start.x, end.y - start.y);
  const stop = { x: start.x + (end.x - start.x) * 0.75, y: start.y + (end.y - start.y) * 0.75 };
  const anticipation = { x: -dir.x * 18, y: -dir.y * 18 };
  const ghost = createGhostCard(opts.attackerRect, opts.attackerImagePath);
  root.appendChild(ghost);

  const trail = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  trail.setAttribute("class", "vfx duel-fx-attack-trail");
  trail.setAttribute("width", `${window.innerWidth}`);
  trail.setAttribute("height", `${window.innerHeight}`);
  trail.setAttribute("viewBox", `0 0 ${window.innerWidth} ${window.innerHeight}`);
  trail.style.position = "fixed";
  trail.style.inset = "0";
  trail.style.pointerEvents = "none";
  trail.style.zIndex = "66";

  const line = document.createElementNS("http://www.w3.org/2000/svg", "path");
  const ctrlX = start.x + (stop.x - start.x) * 0.55;
  const ctrlY = Math.min(start.y, stop.y) - 62;
  line.setAttribute("d", `M ${start.x} ${start.y} Q ${ctrlX} ${ctrlY} ${stop.x} ${stop.y}`);
  line.setAttribute("class", "duel-fx-trail-path");
  trail.appendChild(line);
  root.appendChild(trail);

  const totalLength = line.getTotalLength();
  line.style.strokeDasharray = `${totalLength}`;
  line.style.strokeDashoffset = `${totalLength}`;

  const tl = gsap.timeline({ paused: true });
  tl.to(
    line,
    {
      strokeDashoffset: 0,
      opacity: 1,
      duration: slowSec(0.28),
      ease: "power2.out"
    },
    0
  );
  tl.to(
    ghost,
    {
      x: anticipation.x,
      y: anticipation.y,
      scale: 0.97,
      rotation: -3,
      duration: slowSec(0.1),
      ease: "power2.out"
    },
    0
  );
  tl.to(
    ghost,
    {
      x: stop.x - start.x,
      y: stop.y - start.y,
      scale: 1.06,
      rotation: 3,
      duration: slowSec(0.31),
      ease: "expo.out"
    },
    slowSec(0.08)
  );
  tl.call(
    () => {
      spawnDustBurst(root, stop.x, stop.y, 10);
    },
    undefined,
    slowSec(0.38)
  );
  tl.to(
    ghost,
    {
      x: 0,
      y: 0,
      scale: 1,
      rotation: 0,
      duration: slowSec(0.28),
      ease: "back.out(1.2)"
    },
    slowSec(0.4)
  );
  tl.to(
    line,
    {
      opacity: 0,
      duration: slowSec(0.2),
      ease: "power1.out"
    },
    slowSec(0.4)
  );

  await playTimeline(tl);
  await new Promise((resolve) => window.setTimeout(resolve, slowMs(30)));
  cleanupNode(ghost);
  cleanupNode(trail);
}

export async function summonToField(
  overlayRoot: HTMLElement | null,
  opts: {
    slotRect: DOMRect;
    fromRect?: DOMRect | null;
    imagePath?: string;
  }
): Promise<void> {
  const root = ensureOverlayRoot(overlayRoot);
  if (!root) return;
  const slotCenter = center(opts.slotRect);
  const sourceCenter = opts.fromRect ? center(opts.fromRect) : { x: slotCenter.x, y: slotCenter.y - 110 };
  const sourceRect = new DOMRect(
    sourceCenter.x - opts.slotRect.width / 2,
    sourceCenter.y - opts.slotRect.height / 2,
    opts.slotRect.width,
    opts.slotRect.height
  );

  const ghost = createGhostCard(sourceRect, opts.imagePath);
  const rune = createPulse(slotCenter.x, slotCenter.y, Math.max(opts.slotRect.width, opts.slotRect.height) * 1.9, "duel-fx-rune vfx-additive");
  const glow = createPulse(slotCenter.x, slotCenter.y, Math.max(opts.slotRect.width, opts.slotRect.height) * 1.5, "duel-fx-slot-glow");
  root.appendChild(rune);
  root.appendChild(glow);
  root.appendChild(ghost);

  gsap.set(rune, { opacity: 0, scale: 0.64, rotation: -30 });
  gsap.set(glow, { opacity: 0, scale: 0.7 });
  gsap.set(ghost, { opacity: 0, scale: 0.95, rotation: -5 });

  const start = center(sourceRect);
  const end = slotCenter;

  const tl = gsap.timeline({ paused: true });
  tl.to(rune, { opacity: 0.68, scale: 1, rotation: 120, duration: slowSec(0.48), ease: "power2.out" }, 0);
  tl.to(glow, { opacity: 0.62, scale: 1, duration: slowSec(0.36), ease: "power2.out" }, slowSec(0.04));
  tl.to(
    ghost,
    {
      opacity: 1,
      x: end.x - start.x,
      y: end.y - start.y,
      scale: 1.08,
      rotation: 1,
      duration: slowSec(0.62),
      ease: "expo.out"
    },
    slowSec(0.02)
  );
  tl.call(
    () => {
      spawnDustBurst(root, end.x, end.y, 12);
    },
    undefined,
    slowSec(0.54)
  );
  tl.to(ghost, { scale: 1, rotation: 0, duration: slowSec(0.18), ease: "back.out(1.28)" }, slowSec(0.58));
  tl.to([rune, glow], { opacity: 0, duration: slowSec(0.24), ease: "power2.in" }, slowSec(0.7));

  await playTimeline(tl);
  cleanupNode(ghost);
  cleanupNode(rune);
  cleanupNode(glow);
}

export async function flipReveal(
  overlayRoot: HTMLElement | null,
  opts: {
    cardRect: DOMRect;
    frontImagePath?: string;
    backImagePath?: string;
  }
): Promise<void> {
  const root = ensureOverlayRoot(overlayRoot);
  if (!root) return;
  const wrap = createDiv("duel-fx-flip-wrap");
  wrap.style.left = `${opts.cardRect.left}px`;
  wrap.style.top = `${opts.cardRect.top}px`;
  wrap.style.width = `${opts.cardRect.width}px`;
  wrap.style.height = `${opts.cardRect.height}px`;

  const inner = createDiv("duel-fx-flip-card");
  const backFace = createDiv("duel-fx-flip-face duel-fx-flip-back");
  const frontFace = createDiv("duel-fx-flip-face duel-fx-flip-front");
  backFace.style.backgroundImage = `url('${opts.backImagePath ?? CARD_BACK_PATH}')`;
  frontFace.style.backgroundImage = `url('${opts.frontImagePath ?? CARD_BACK_PATH}')`;

  inner.appendChild(backFace);
  inner.appendChild(frontFace);
  wrap.appendChild(inner);
  root.appendChild(wrap);

  gsap.set(inner, { rotationY: 0, transformOrigin: "50% 50%" });

  const edge = createPulse(opts.cardRect.left + opts.cardRect.width / 2, opts.cardRect.top + opts.cardRect.height / 2, opts.cardRect.width * 1.2, "duel-fx-edge");
  root.appendChild(edge);
  gsap.set(edge, { opacity: 0 });

  const tl = gsap.timeline({ paused: true });
  tl.to(inner, { y: -8, scale: 1.03, duration: slowSec(0.1), ease: "power2.out" }, 0);
  tl.to(inner, { rotationY: 90, duration: slowSec(0.2), ease: "power2.inOut" }, 0);
  tl.to(inner, { rotationY: 180, duration: slowSec(0.2), ease: "power2.inOut" }, slowSec(0.2));
  tl.to(inner, { y: 0, scale: 1, duration: slowSec(0.14), ease: "back.out(1.2)" }, slowSec(0.28));
  tl.to(edge, { opacity: 0.62, scale: 1.04, duration: slowSec(0.12), ease: "power2.out" }, slowSec(0.28));
  tl.to(edge, { opacity: 0, scale: 1.22, duration: slowSec(0.18), ease: "power2.in" }, slowSec(0.4));

  await playTimeline(tl);
  cleanupNode(wrap);
  cleanupNode(edge);
}

export async function linkBeam(
  overlayRoot: HTMLElement | null,
  opts: {
    fromRect: DOMRect;
    toRect: DOMRect;
  }
): Promise<void> {
  const root = ensureOverlayRoot(overlayRoot);
  if (!root) return;
  const from = center(opts.fromRect);
  const to = center(opts.toRect);
  const curvature = 0.22;
  const cx = from.x + (to.x - from.x) * 0.5;
  const cy = Math.min(from.y, to.y) - Math.abs(to.x - from.x) * curvature;

  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  svg.setAttribute("class", "vfx duel-fx-beam");
  svg.setAttribute("width", `${window.innerWidth}`);
  svg.setAttribute("height", `${window.innerHeight}`);
  svg.setAttribute("viewBox", `0 0 ${window.innerWidth} ${window.innerHeight}`);
  svg.style.position = "fixed";
  svg.style.inset = "0";
  svg.style.pointerEvents = "none";
  svg.style.zIndex = "67";

  const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
  path.setAttribute("d", `M ${from.x} ${from.y} Q ${cx} ${cy} ${to.x} ${to.y}`);
  path.setAttribute("class", "duel-fx-beam-path");
  const core = document.createElementNS("http://www.w3.org/2000/svg", "path");
  core.setAttribute("d", `M ${from.x} ${from.y} Q ${cx} ${cy} ${to.x} ${to.y}`);
  core.setAttribute("class", "duel-fx-beam-path-core");
  svg.appendChild(path);
  svg.appendChild(core);
  root.appendChild(svg);

  const targetPulse = createPulse(to.x, to.y, 120, "duel-fx-beam-target vfx-additive");
  root.appendChild(targetPulse);
  gsap.set(targetPulse, { opacity: 0, scale: 0.6 });

  const length = path.getTotalLength();
  path.style.strokeDasharray = `${length}`;
  path.style.strokeDashoffset = `${length}`;
  core.style.strokeDasharray = `${length}`;
  core.style.strokeDashoffset = `${length}`;

  const tl = gsap.timeline({ paused: true });
  tl.to(
    path,
    {
      strokeDashoffset: 0,
      opacity: 1,
      duration: slowSec(0.26),
      ease: "power2.out"
    },
    0
  );
  tl.to(
    core,
    {
      strokeDashoffset: 0,
      opacity: 1,
      duration: slowSec(0.2),
      ease: "power2.out"
    },
    slowSec(0.03)
  );
  tl.to(targetPulse, { opacity: 0.72, scale: 1, duration: slowSec(0.18), ease: "power2.out" }, slowSec(0.16));
  tl.to(targetPulse, { opacity: 0, scale: 1.26, duration: slowSec(0.2), ease: "power2.in" }, slowSec(0.34));
  tl.to([path, core], { opacity: 0, duration: slowSec(0.2), ease: "power2.in" }, slowSec(0.32));

  await playTimeline(tl);
  cleanupNode(svg);
  cleanupNode(targetPulse);
}

export const duelFx = {
  impactFrames,
  damageFloater,
  attackDash,
  summonToField,
  flipReveal,
  linkBeam
};
