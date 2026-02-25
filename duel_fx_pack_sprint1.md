# Duel FX Pack v2 — Sprint 1 (3 efeitos)
## 1) Destroy/Banish/Send-to-Grave  • 2) Turn Banner  • 3) Draw / Add-to-Hand

Este arquivo continua a mesma filosofia do pack anterior: **alto impacto no browser**, usando
**Overlay + RectRegistry + AnimationQueue** (fila) e animando só `transform/opacity`.

> Pré-requisito: você já tem a infra do pack anterior (overlay, queue, rects).
> Aqui eu foco nos 3 novos efeitos, com pseudo-código pronto pra plugar.

---

## 0) Convenções e IDs (recomendado)

### Rect IDs
- Deck (topo de compra): `zone:deck:player`, `zone:deck:enemy`
- Mão: `zone:hand:player`, `zone:hand:enemy`
- Slot de mão (opcional): `zone:hand:player:<i>`
- Cemitério: `zone:grave:player`, `zone:grave:enemy`
- Banimento: `zone:banish:player`, `zone:banish:enemy`
- Campo/slot destino: `zone:field:player:<i>`, `zone:field:enemy:<i>`

### Helper
```ts
const rect = rects.get(id); // DOMRect
const c = center(rect);     // {x,y}
```

---

## 1) Destroy / Banish / Send-to-Grave (cinematográfico)

### Quando usar
- Carta destruída em batalha
- Carta enviada ao cemitério por efeito
- Carta banida (“remove from play”)

### Objetivo visual (feel)
- **Destroy:** “impact + crumble/dissolve” (rápido e agressivo)
- **Send to Grave:** “puxada” para o cemitério (controlado)
- **Banish:** “implosão arcana” (limpo e mágico)

### Dados necessários
- `cardRect` (origem, onde a carta está na tela)
- `destinationRect` (grave ou banish)
- (opcional) `strength` (1..3) com base em dano / raridade / evento

---

### 1.1 Building blocks (reutilizáveis)
- `spawnGhostCard(rect)`
- `spawnDustBurst(x,y)` (10–18 dots)
- `spawnSigilPop(x,y)` (círculo arcano pequeno)
- `spawnTrailSlash(from,to)` (trail curto)

> Mesmo sem partículas, dá pra ficar ótimo só com blur+opacity.

---

### 1.2 Preset: Send to Grave (mais comum)

**Look:** carta “solta” do campo, reduz, borra levemente e é puxada para o cemitério.

**Passos**
1) Micro lift (6px) + scale 1.04
2) Move para o grave com easing `outExpo`
3) No final: `scale 0.4`, `opacity 0`, blur leve
4) Cleanup

**Pseudo-código**
```ts
type SendToZoneOpts = {
  cardRect: DOMRect;
  destRect: DOMRect;       // grave
  strength?: number;       // 1..3
};

async function sendToGrave(opts: SendToZoneOpts) {
  const s = opts.strength ?? 1;
  const ghostId = overlay.spawnGhostCard({ rect: opts.cardRect, z: 30 });

  const start = center(opts.cardRect);
  const end = center(opts.destRect);

  overlay.spawnTrailSlash({ from: start, to: end, durationMs: 240 });

  await overlay.animateGhost(
    ghostId,
    [
      { t: 0.0, x: start.x, y: start.y, scale: 1.0, rot: 0, opacity: 1 },
      { t: 0.15, x: start.x, y: start.y - 10, scale: 1.04, rot: -2, ease: "outQuad" },
      { t: 0.85, x: end.x, y: end.y, scale: 0.62, rot: 4, ease: "outExpo" },
      { t: 1.00, x: end.x, y: end.y, scale: 0.40, rot: 8, opacity: 0.0, blur: 2 + s, ease: "outQuad" },
    ],
    { durationMs: 520 }
  );

  overlay.remove(ghostId);
}
```

---

### 1.3 Preset: Destroy (batida + crumble)

**Look:** impacto + “quebra”/fade + puxada curta pro grave (ou some no lugar).

**Passos**
1) ImpactFrames (flash + shake)
2) Squash rápido na carta
3) Dust burst
4) Dissolve rápido + (opcional) ir pro grave

**Pseudo-código**
```ts
type DestroyOpts = {
  cardRect: DOMRect;
  graveRect?: DOMRect;
  strength?: number;
};

async function destroyCard(opts: DestroyOpts) {
  const s = opts.strength ?? 2;

  await duelFx.impactFrames({ focusRect: opts.cardRect, strength: s });

  const ghostId = overlay.spawnGhostCard({ rect: opts.cardRect, z: 35 });
  const p = center(opts.cardRect);

  overlay.spawnDustBurst({ x: p.x, y: p.y, intensity: 10 + s * 4 });

  const end = opts.graveRect ? center(opts.graveRect) : p;

  await overlay.animateGhost(
    ghostId,
    [
      { t: 0.0, x: p.x, y: p.y, scale: 1.0, rot: 0, opacity: 1 },
      { t: 0.15, x: p.x, y: p.y, scaleX: 1.10, scaleY: 0.88, rot: -3, ease: "outQuad" },
      { t: 0.35, x: p.x, y: p.y, scale: 0.92, rot: 2, ease: "outQuad" },
      { t: 1.00, x: end.x, y: end.y, scale: 0.25, rot: 12, opacity: 0.0, blur: 3 + s, ease: "outExpo" },
    ],
    { durationMs: 420 }
  );

  overlay.remove(ghostId);
}
```

---

### 1.4 Preset: Banish (implosão arcana + vanish)

**Look:** sigilo aparece, “puxa” a carta, shrink + fade, beam curto até zona banish.

**Pseudo-código**
```ts
type BanishOpts = {
  cardRect: DOMRect;
  banishRect: DOMRect;
};

async function banishCard(opts: BanishOpts) {
  const ghostId = overlay.spawnGhostCard({ rect: opts.cardRect, z: 40 });
  const start = center(opts.cardRect);
  const end = center(opts.banishRect);

  overlay.spawnSigilPop({
    x: start.x,
    y: start.y,
    size: Math.max(opts.cardRect.width, opts.cardRect.height) * 1.4,
  });

  await overlay.animateGhost(
    ghostId,
    [
      { t: 0.0, x: start.x, y: start.y, scale: 1.0, rot: 0, opacity: 1 },
      { t: 0.40, x: start.x, y: start.y, scale: 0.70, rot: 6, glow: 1, ease: "outExpo" },
      { t: 0.55, x: start.x, y: start.y, scale: 0.45, rot: 10, opacity: 0.85, ease: "outQuad" },
      { t: 0.80, x: end.x, y: end.y, scale: 0.25, rot: 14, opacity: 0.2, ease: "outExpo" },
      { t: 1.00, x: end.x, y: end.y, scale: 0.10, rot: 18, opacity: 0.0, ease: "outQuad" },
    ],
    { durationMs: 520 }
  );

  // opcional: beam e pulse no destino
  overlay.spawnPulse({ x: end.x, y: end.y, durationMs: 260 });

  overlay.remove(ghostId);
}
```

---

### 1.5 Integração (commit do estado)
- Você anima **primeiro**
- Depois aplica o patch (remove do campo, adiciona no grave/banish)

```ts
queue.enqueue(async () => {
  const cardRect = rects.get(cardId);
  const graveRect = rects.get("zone:grave:player");

  await fx.destroyCard({ cardRect, graveRect, strength: 2 });

  gameStore.applyPatch(patch);
});
```

---

## 2) Turn Banner (entrada de turno com runas)

### Quando usar
- início do turno do jogador
- início do turno do inimigo
- fase (opcional): Draw / Main / Battle / End

### Objetivo visual
- Banner curto e forte, sem poluir
- Runas/sweep sutil atrás
- Dim leve no board (opcional)

### Dados necessários
- `side`: `"player" | "enemy"`
- texto: `"SEU TURNO"` / `"TURNO INIMIGO"`
- (opcional) fase

### Implementação (overlay)
Componentes:
- `TurnBanner` (texto + moldura arcana)
- `RuneSweep` (svg/gradient animado)
- `BackdropDim` (opacity 0.08–0.14)

**Pseudo-código**
```ts
type TurnBannerOpts = {
  side: "player" | "enemy";
  phase?: "DRAW" | "MAIN" | "BATTLE" | "END";
};

async function playTurnBanner(opts: TurnBannerOpts) {
  const text = opts.side === "player" ? "SEU TURNO" : "TURNO INIMIGO";

  const id = overlay.spawnTurnBanner({
    text,
    subtext: opts.phase ? `FASE: ${opts.phase}` : undefined,
  });

  overlay.spawnBackdropDim({ opacity: 0.10, durationMs: 900 });
  overlay.spawnRuneSweep({ durationMs: 750 });

  await overlay.animateBanner(
    id,
    [
      { t: 0.0, y: -16, scale: 0.98, opacity: 0.0 },
      { t: 0.25, y: 0, scale: 1.0, opacity: 1.0, ease: "outExpo" },
      { t: 0.70, y: 0, scale: 1.0, opacity: 1.0 },
      { t: 1.00, y: 12, scale: 0.99, opacity: 0.0, ease: "inOutCubic" },
    ],
    { durationMs: 820 }
  );

  overlay.remove(id);
}
```

**Onde chamar**
```ts
queue.enqueue(async () => {
  await fx.playTurnBanner({ side: "player", phase: "DRAW" });
  gameStore.applyPatch(patch);
});
```

---

## 3) Draw / Add-to-Hand (compra e adicionar carta na mão)

### Quando usar
- Draw do deck para mão
- Gerar carta e adicionar à mão
- Buscar carta específica e adicionar à mão

### Objetivo visual
- Carta nasce do deck, viaja com rastro, encaixa na mão com snap
- Mão responde (slot glow + bounce)

### Dados necessários
- `deckRect` (origem)
- `handRectOrSlot` (destino)
- textura/arte do card (opcional)

---

### 3.1 Se você NÃO tem rect por slot da mão (ainda)
Calcule um destino dentro da zona da mão:

```ts
function handPoint(handRect: DOMRect, index: number, total: number) {
  const padding = 24;
  const usable = handRect.width - padding * 2;
  const x = handRect.left + padding + (usable * (index + 0.5)) / Math.max(total, 1);
  const y = handRect.top + handRect.height * 0.55;
  return { x, y };
}
```

---

### 3.2 Preset: Draw (deck → mão)

**Passos**
1) Spawn ghost no deckRect
2) Lift + glow
3) Travel em arco (mid point alto)
4) Glow na mão
5) Snap no destino
6) Commit do estado real

**Pseudo-código**
```ts
type DrawToHandOpts = {
  deckRect: DOMRect;
  handRectOrSlot: DOMRect;
  handIndex?: number;
  handTotal?: number;
  cardTexture?: string;
};

async function drawToHand(opts: DrawToHandOpts) {
  const start = center(opts.deckRect);

  let end = center(opts.handRectOrSlot);
  if (opts.handIndex != null && opts.handTotal != null) {
    end = handPoint(opts.handRectOrSlot, opts.handIndex, opts.handTotal);
  }

  const ghostId = overlay.spawnGhostCard({
    rect: opts.deckRect,
    z: 50,
    texture: opts.cardTexture,
  });

  overlay.spawnTrailSlash({ from: start, to: end, durationMs: 300 });

  overlay.spawnSlotGlow({ rect: inflateRect(opts.handRectOrSlot, 1.06), durationMs: 420 });

  const mid = { x: lerp(start.x, end.x, 0.5), y: Math.min(start.y, end.y) - 140 };

  await overlay.animateGhost(
    ghostId,
    [
      { t: 0.0, x: start.x, y: start.y, scale: 0.92, rot: -6, opacity: 0.0 },
      { t: 0.12, x: start.x, y: start.y - 24, scale: 1.0, rot: -2, opacity: 1.0, ease: "outQuad" },
      { t: 0.55, x: mid.x, y: mid.y, scale: 1.02, rot: 2, ease: "outExpo" },
      { t: 0.90, x: end.x, y: end.y, scale: 1.06, rot: 0, ease: "outExpo" },
      { t: 1.00, x: end.x, y: end.y, scale: 1.0, rot: 0, ease: "outBack" },
    ],
    { durationMs: 540 }
  );

  await overlay.fadeOutAndRemove(ghostId, 120);
}
```

---

### 3.3 Preset: Add-to-Hand (qualquer zona → mão)
```ts
async function addToHand(fromRect: DOMRect, handRect: DOMRect, index: number, total: number) {
  return drawToHand({ deckRect: fromRect, handRectOrSlot: handRect, handIndex: index, handTotal: total });
}
```

---

### 3.4 Integrando com evento de draw do engine
```ts
queue.enqueue(async () => {
  const deckRect = rects.get("zone:deck:player");
  const handRect = rects.get("zone:hand:player");

  await fx.drawToHand({
    deckRect,
    handRectOrSlot: handRect,
    handIndex: newCardIndex,
    handTotal: nextHandSize,
    cardTexture: cardArtUrl,
  });

  gameStore.applyPatch(patch);
});
```

---

## 4) API sugerida (expandir seu `duelFx.ts`)
```ts
export const fx = {
  // Sprint 1
  sendToGrave,
  destroyCard,
  banishCard,
  playTurnBanner,
  drawToHand,
  addToHand,

  // pack anterior
  impactFrames,
  damageFloater,
  attackDash,
  summonToField,
  flipReveal,
  linkBeam,
};
```

---

## 5) Ajustes finos (pra ficar “mais perfeito”)

### Duração
- Destroy: 360–460ms
- Send to grave: 480–560ms
- Banish: 480–560ms
- Turn banner: 750–900ms
- Draw: 500–620ms

### Intensidade por contexto
- `strength = 1` (leve)
- `strength = 2` (padrão)
- `strength = 3` (crítico/lendária/final blow)

---

## 6) Performance
- Overlay + transforms
- Evitar blur alto no board inteiro
- Preferir `drop-shadow`, SVG e sprites leves
- Capturar rects no começo da animação

---

## 7) Checklist (ordem)
1) `sendToGrave`
2) `destroyCard`
3) `banishCard`
4) `playTurnBanner`
5) `drawToHand` (com `handPoint` se não tiver slots)

---

## 8) Extras opcionais
- Draw múltiplo (stagger 120ms)
- Destroy “overkill” (shake + flash maior)
- Turn banner com som e variação de glow por lado
