import { gsap } from "gsap";
import type { RectRegistryApi } from "./rectRegistry";

const CARD_BACK_PATH = "/images/cartas/Back-FMR-EN-VG.png";

interface CardVisual {
  instanceId: string;
  name: string;
  imagePath?: string;
}

interface FusionResultVisual {
  templateId: string;
  name: string;
  imagePath?: string;
}

export interface FusionAnimationRequest {
  materials: CardVisual[];
  result: FusionResultVisual;
  targetSlotId: string;
}

export interface FusionAnimationHooks {
  onImpact?: () => void;
  onReveal?: () => void;
  onTravelStart?: () => void;
  onComplete?: () => void;
  shakeTarget?: HTMLElement | null;
}

interface GhostNode {
  id: string;
  node: HTMLDivElement;
  rect: DOMRect;
}

function wait(ms: number): Promise<void> {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}

function playTimeline(timeline: gsap.core.Timeline): Promise<void> {
  return new Promise((resolve) => {
    timeline.eventCallback("onComplete", () => resolve());
    timeline.play(0);
  });
}

function centerOfRect(rect: DOMRect): { x: number; y: number } {
  return {
    x: rect.left + rect.width / 2,
    y: rect.top + rect.height / 2
  };
}

function buildGhostNode(rect: DOMRect, name: string, imagePath?: string): HTMLDivElement {
  const ghost = document.createElement("div");
  ghost.className = "fusion-ghost-card";
  ghost.style.left = `${rect.left}px`;
  ghost.style.top = `${rect.top}px`;
  ghost.style.width = `${rect.width}px`;
  ghost.style.height = `${rect.height}px`;
  ghost.style.transform = "translate3d(0,0,0)";
  ghost.setAttribute("aria-hidden", "true");

  const img = document.createElement("img");
  img.className = "fusion-ghost-image";
  img.src = imagePath ?? CARD_BACK_PATH;
  img.alt = name;
  ghost.appendChild(img);

  return ghost;
}

function buildRuneNode(centerX: number, centerY: number): HTMLDivElement {
  const rune = document.createElement("div");
  rune.className = "fusion-rune-circle";
  rune.style.left = `${centerX - 150}px`;
  rune.style.top = `${centerY - 150}px`;
  rune.style.width = "300px";
  rune.style.height = "300px";
  rune.setAttribute("aria-hidden", "true");
  return rune;
}

function buildFlashNode(centerX: number, centerY: number): HTMLDivElement {
  const flash = document.createElement("div");
  flash.className = "fusion-flash-bloom";
  flash.style.left = `${centerX - 240}px`;
  flash.style.top = `${centerY - 240}px`;
  flash.style.width = "480px";
  flash.style.height = "480px";
  flash.setAttribute("aria-hidden", "true");
  return flash;
}

function resolveFusionCenter(materialNodes: GhostNode[]): { x: number; y: number } {
  const avgCenter = materialNodes.reduce(
    (acc, item) => {
      const center = centerOfRect(item.rect);
      return { x: acc.x + center.x, y: acc.y + center.y };
    },
    { x: 0, y: 0 }
  );
  const sourceCenter = {
    x: avgCenter.x / materialNodes.length,
    y: avgCenter.y / materialNodes.length
  };
  const viewCenter = {
    x: window.innerWidth / 2,
    y: window.innerHeight * 0.44
  };
  return {
    x: sourceCenter.x * 0.2 + viewCenter.x * 0.8,
    y: sourceCenter.y * 0.12 + viewCenter.y * 0.88
  };
}

function playImpactShake(target: HTMLElement | null): void {
  if (!target) return;
  gsap.killTweensOf(target);
  gsap.fromTo(
    target,
    { x: 0, y: 0, rotate: 0 },
    {
      keyframes: [
        { x: -5, y: 2, rotate: -0.35, duration: 0.045 },
        { x: 4, y: -2, rotate: 0.3, duration: 0.045 },
        { x: -3, y: 1, rotate: -0.2, duration: 0.04 },
        { x: 2, y: -1, rotate: 0.15, duration: 0.04 },
        { x: 0, y: 0, rotate: 0, duration: 0.05 }
      ],
      ease: "power1.out"
    }
  );
}

export async function playFusionAnimation(
  overlayRoot: HTMLDivElement | null,
  registry: RectRegistryApi,
  request: FusionAnimationRequest,
  hooks?: FusionAnimationHooks
): Promise<void> {
  if (!overlayRoot || request.materials.length === 0) return;

  registry.refreshRects();
  const materialNodes: GhostNode[] = [];
  for (const material of request.materials) {
    const rect = registry.getCardRect(material.instanceId);
    if (!rect) continue;
    const node = buildGhostNode(rect, material.name, material.imagePath);
    overlayRoot.appendChild(node);
    materialNodes.push({ id: material.instanceId, node, rect });
  }
  if (!materialNodes.length) return;

  const targetRect = registry.getSlotRect(request.targetSlotId);
  const targetCenter = targetRect ? centerOfRect(targetRect) : null;
  const fusionCenter = resolveFusionCenter(materialNodes);

  const rune = buildRuneNode(fusionCenter.x, fusionCenter.y);
  const flash = buildFlashNode(fusionCenter.x, fusionCenter.y);
  overlayRoot.appendChild(rune);
  overlayRoot.appendChild(flash);

  const animatedNodes: HTMLElement[] = [rune, flash, ...materialNodes.map((item) => item.node)];
  let resultGhost: HTMLDivElement | null = null;

  try {
    gsap.set(rune, { opacity: 0, scale: 0.55, rotation: -18 });
    gsap.set(flash, { opacity: 0, scale: 0.18 });
    gsap.set(materialNodes.map((item) => item.node), { transformOrigin: "50% 50%", x: 0, y: 0, scale: 1, rotation: 0, opacity: 1 });

    const introTimeline = gsap.timeline({ paused: true });
    introTimeline.to(
      materialNodes.map((item) => item.node),
      {
        y: -28,
        scale: 1.05,
        duration: 0.14,
        ease: "power2.out",
        stagger: 0.035
      },
      0
    );

    materialNodes.forEach((material, index) => {
      const center = centerOfRect(material.rect);
      const dx = fusionCenter.x - center.x;
      const dy = fusionCenter.y - center.y;
      const arc = -66 - index * 12;
      const swirl = index % 2 === 0 ? -18 : 18;
      introTimeline.to(
        material.node,
        {
          x: dx * 0.7,
          y: dy * 0.7 + arc,
          scale: 0.9,
          rotation: swirl,
          duration: 0.28,
          ease: "power2.inOut"
        },
        0.12
      );
      introTimeline.to(
        material.node,
        {
          x: dx,
          y: dy,
          scale: 0.66,
          rotation: swirl * 1.4,
          duration: 0.16,
          ease: "power3.in"
        },
        0.4
      );
    });

    introTimeline.to(
      rune,
      {
        opacity: 0.68,
        scale: 1,
        rotation: 120,
        duration: 0.55,
        ease: "power2.out"
      },
      0.08
    );

    introTimeline.to(
      flash,
      {
        opacity: 0.92,
        scale: 1.04,
        duration: 0.2,
        ease: "power2.out"
      },
      0.46
    );

    introTimeline.call(() => {
      hooks?.onImpact?.();
      playImpactShake(hooks?.shakeTarget ?? null);
    }, undefined, 0.46);

    introTimeline.to(
      flash,
      {
        opacity: 0,
        scale: 1.34,
        duration: 0.2,
        ease: "power2.in"
      },
      0.66
    );

    introTimeline.to(
      materialNodes.map((item) => item.node),
      {
        opacity: 0.02,
        scale: 0.2,
        duration: 0.17,
        ease: "power2.in"
      },
      0.56
    );

    await playTimeline(introTimeline);

    await wait(96);

    const baseRect = materialNodes[0].rect;
    const resultWidth = Math.max(96, baseRect.width * 0.96);
    const resultHeight = Math.max(136, baseRect.height * 0.96);
    const resultRect = new DOMRect(fusionCenter.x - resultWidth / 2, fusionCenter.y - resultHeight / 2, resultWidth, resultHeight);
    resultGhost = buildGhostNode(resultRect, request.result.name, request.result.imagePath);
    overlayRoot.appendChild(resultGhost);
    animatedNodes.push(resultGhost);
    gsap.set(resultGhost, { opacity: 0, scale: 0.52, rotation: -7, transformOrigin: "50% 50%" });

    const revealTimeline = gsap.timeline({ paused: true });
    revealTimeline.to(
      rune,
      {
        opacity: 0.88,
        scale: 1.12,
        rotation: 196,
        duration: 0.23,
        ease: "power2.out"
      },
      0
    );
    revealTimeline.to(
      resultGhost,
      {
        opacity: 1,
        scale: 1.08,
        rotation: 2,
        duration: 0.22,
        ease: "back.out(1.35)"
      },
      0.02
    );
    revealTimeline.call(() => hooks?.onReveal?.(), undefined, 0.02);
    revealTimeline.to(
      resultGhost,
      {
        scale: 1,
        rotation: 0,
        duration: 0.14,
        ease: "power1.out"
      },
      0.24
    );

    await playTimeline(revealTimeline);

    if (targetCenter && targetRect && resultGhost) {
      const dx = targetCenter.x - fusionCenter.x;
      const dy = targetCenter.y - fusionCenter.y;
      const scale = Math.min(targetRect.width / resultWidth, targetRect.height / resultHeight) * 0.95;

      const travelTimeline = gsap.timeline({ paused: true });
      travelTimeline.call(() => hooks?.onTravelStart?.(), undefined, 0);
      travelTimeline.to(
        rune,
        {
          opacity: 0.22,
          scale: 1.28,
          rotation: 250,
          duration: 0.45,
          ease: "power2.inOut"
        },
        0
      );
      travelTimeline.to(
        resultGhost,
        {
          x: dx,
          y: dy - 18,
          scale: scale * 1.03,
          rotation: -3,
          duration: 0.42,
          ease: "power2.inOut"
        },
        0
      );
      travelTimeline.to(
        resultGhost,
        {
          x: dx,
          y: dy,
          scale,
          rotation: 0,
          duration: 0.12,
          ease: "power1.out"
        },
        0.42
      );

      await playTimeline(travelTimeline);
    }

    await wait(34);
    hooks?.onComplete?.();
  } finally {
    gsap.killTweensOf(animatedNodes);
    overlayRoot.innerHTML = "";
  }
}
