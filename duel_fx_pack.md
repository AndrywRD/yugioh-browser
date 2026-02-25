# Duel FX Pack (Browser / React) — 6 efeitos “FM-like” (alto impacto, fácil de plugar)

Este documento descreve **6 efeitos** (os “primeiros que valem muito”):  
1) Impact Frames (hit stop + flash + shake)  
2) Damage Floaters (números de dano/buff)  
3) Attack Dash + Trail (avanço do atacante + rastro)  
4) Summon Rune Circle + Slot Glow (invocação estilosa)  
5) Flip Reveal 3D (revelar carta setada)  
6) Link Beam (linha arcana caster → alvo)

O foco aqui é implementação **no navegador** com consistência e performance.

---

## 0) Pré-requisitos (mínimos)

### Stack sugerido
- **React + TypeScript**
- Uma store (Zustand/Redux/Context) — tanto faz.
- **Overlay Layer** via Portal (um container fixo full-screen).
- Uma forma de obter **rects** (BoundingClientRect) das cartas/slots/LP HUD.

> Se você já tem o efeito de fusão, provavelmente já tem: overlay + rects + queue.  
> Neste .md, eu incluo uma implementação completa e limpa que você pode adaptar/mesclar.

---

## 1) Base comum (infra reutilizável)

### 1.1 Rect Registry (cards, slots, HUD)

**Objetivo:** qualquer efeito precisa localizar “de onde” e “pra onde” animar.

**IDs recomendados:**
- Card instance: `card:<player|enemy>:<zone>:<slotIndex>:<instanceId>`
- Slot: `slot:<player|enemy>:<zone>:<slotIndex>`
- HUD: `hud:lp:player`, `hud:lp:enemy`, `hud:energy:player`, etc.

**Hook (conceito):**
- Cada componente visual registra seu rect num store:
  - `registerRect(id, rect)`
  - `unregisterRect(id)`

**Dica:** use `ResizeObserver` + `requestAnimationFrame` para atualizar com custo baixo.

---

### 1.2 Overlay Layer (Portal)

**Objetivo:** renderizar “ghosts” (clones) e VFX sem mexer no layout real.

- `<OverlayRoot />` com:
  - `position: fixed; inset: 0; pointer-events: none;`
  - `z-index` acima do board.

Dentro dele:
- `GhostCard` (clones)
- `RuneCircle`
- `Beam`
- `TrailSlash`
- `FloatingText`
- `ScreenFlash`
- etc.

---

### 1.3 Animation Queue (fila de animações)

**Objetivo:** garantir que os efeitos rodem em sequência e não causem race condition com turnos.

- `enqueue(async () => { ... })`  
- Cada efeito retorna uma `Promise` que resolve quando termina.

**Regra:**  
1) engine decide resultado  
2) UI toca animação  
3) UI “commita” patch no estado real  
4) limpa overlay

---

## 2) Tokens visuais (rápidos, mas fazem diferença)

> Ajuste para o seu estilo navy+gold.

### CSS base (recomendado)
```css
/* Overlay */
.overlay-root {
  position: fixed;
  inset: 0;
  pointer-events: none;
  z-index: 9999;
}

/* Performance: animar com transform */
.vfx {
  will-change: transform, opacity, filter;
}

/* Brilho arcano (bem sutil) */
.vfx-glow {
  filter: drop-shadow(0 0 10px rgba(255, 205, 90, 0.22));
}

/* Mistura aditiva (use com moderação) */
.vfx-additive {
  mix-blend-mode: screen;
}
```

### Easing “cinematográfico”
- `easeOutExpo`, `easeOutBack`, `easeInOutCubic`
- “hit stop” curto: 80–120ms

---

## 3) Implementações (as 6)

A seguir, cada efeito tem:
- **Quando usar**
- **Como fica**
- **Dados necessários**
- **Passos**
- **Pseudo-código** (TS/React friendly)

---

# 3.1 Impact Frames (Hit Stop + Flash + Shake)

## Quando usar
- Ataque conectou
- Dano alto / crítico
- Carta destruída
- Trap respondeu

## Como fica
- “Pausa” curtinha (hit stop) + flash sutil + tremida leve.

## Dados necessários
- `focusRect` (rect do alvo ou do centro do evento)  
- intensidade (opcional): `strength`

## Passos
1) Hit stop: segura o ritmo por ~80ms  
2) Screen flash (overlay): opacidade baixa e rápida  
3) Screen shake: pequeno deslocamento do container do board (ou do overlay)

## Observação prática
No browser, **não** congele o thread. Faça “hit stop” como:
- pausar suas timelines/animadores (se usar GSAP)  
- ou apenas atrasar o próximo step e “segurar” transforms

## Pseudo-código
```ts
type ImpactFramesOpts = {
  focusRect: DOMRect;
  strength?: number; // 1..3
};

async function impactFrames(opts: ImpactFramesOpts) {
  const s = opts.strength ?? 1;

  overlay.spawnFlash({
    x: opts.focusRect.left + opts.focusRect.width / 2,
    y: opts.focusRect.top + opts.focusRect.height / 2,
    opacity: 0.10 + 0.06 * s,
    durationMs: 90,
  });

  await shakeElement(boardContainerEl, {
    amplitudePx: 4 * s,
    durationMs: 140,
  });

  await delay(80);
}
```

---

# 3.2 Damage Floaters (números e feedback)

## Quando usar
- Dano no LP
- Cura / shield
- Buff/debuff em carta
- Draw +1 (pequeno)

## Como fica
- `-500` sobe e some, com pop. Para crítico, `CRIT!`.

## Dados necessários
- ponto: `rectId` (alvo ou HUD LP)  
- valor: `amount`
- tipo: `"damage" | "heal" | "buff" | "debuff"`

## Passos
1) Spawn do floater no centro do alvo
2) Pop (scale), drift para cima, fade-out
3) Remover do overlay

## Pseudo-código
```ts
type FloaterType = "damage" | "heal" | "buff" | "debuff";

function damageFloater(rect: DOMRect, amount: number, type: FloaterType) {
  overlay.spawnFloatingText({
    x: rect.left + rect.width / 2,
    y: rect.top + rect.height / 2,
    text: amount > 0 ? `+${amount}` : `${amount}`,
    kind: type,
    durationMs: 650,
  });
}
```

### CSS do floater (simples)
```css
.floater {
  position: absolute;
  transform: translate(-50%, -50%);
  font-weight: 800;
  letter-spacing: 0.5px;
  opacity: 0;
}
.floater.damage { filter: drop-shadow(0 0 10px rgba(255, 80, 80, 0.35)); }
.floater.heal   { filter: drop-shadow(0 0 10px rgba(120, 255, 170, 0.25)); }
```

---

# 3.3 Attack Dash + Trail (avanço + rastro)

## Quando usar
- Ao declarar ataque e conectar no alvo.

## Como fica
- A carta atacante “dash” até perto do alvo, impacto, recoil para origem.
- Um rastro/“slash” acompanha.

## Dados necessários
- `attackerRect`, `targetRect`

## Passos
1) Criar ghost do atacante em overlay (ou animar o próprio card)
2) Dash até próximo do alvo
3) Impact (squash + impact frames)
4) Recoil de volta
5) Spawn/animar trail no caminho

## Pseudo-código
```ts
async function attackDash(attackerRect: DOMRect, targetRect: DOMRect) {
  const ghostId = overlay.spawnGhostCard({ rect: attackerRect, z: 10 });

  const start = center(attackerRect);
  const end = center(targetRect);

  const stopPoint = {
    x: lerp(start.x, end.x, 0.75),
    y: lerp(start.y, end.y, 0.75),
  };

  overlay.spawnTrailSlash({ from: start, to: stopPoint, durationMs: 260 });

  await overlay.animateGhost(
    ghostId,
    [
      { t: 0.0, x: start.x, y: start.y, scale: 1.0, rot: -2 },
      { t: 0.55, x: stopPoint.x, y: stopPoint.y, scale: 1.06, rot: 2, ease: "outExpo" },
      { t: 0.70, x: stopPoint.x, y: stopPoint.y, scale: 0.98, rot: 0, ease: "outQuad" },
      { t: 1.00, x: start.x, y: start.y, scale: 1.0, rot: 0, ease: "outBack" },
    ],
    { durationMs: 520 }
  );

  overlay.remove(ghostId);
}
```

---

# 3.4 Summon Rune Circle + Slot Glow (invocação)

## Quando usar
- Normal Summon / Special Summon / resultado de fusão indo pro campo

## Como fica
- Slot acende, círculo arcano aparece atrás, carta cai/chega e “encaixa”.

## Dados necessários
- `fromRect` (mão/extra deck/resultado)
- `slotRect` (destino no campo)

## Passos
1) Glow no slot (pulse)
2) Rune circle atrás do slot (rotate + fade in)
3) Ghost da carta vem (drop-in ou slide-in)
4) Pequeno “snap” ao encaixar
5) Remove rune circle

## Pseudo-código
```ts
async function summonToField(fromRect: DOMRect, slotRect: DOMRect) {
  const slotCenter = center(slotRect);

  const glowId = overlay.spawnSlotGlow({ rect: slotRect, durationMs: 520 });
  const runeId = overlay.spawnRuneCircle({
    x: slotCenter.x,
    y: slotCenter.y,
    size: Math.max(slotRect.width, slotRect.height) * 1.6,
  });

  const ghostId = overlay.spawnGhostCard({ rect: fromRect, z: 20 });

  const start = center(fromRect);
  const end = slotCenter;

  const start2 = { x: start.x, y: start.y - 90 }; // drop-in

  await overlay.animateGhost(
    ghostId,
    [
      { t: 0.0, x: start2.x, y: start2.y, scale: 0.98, rot: -6, opacity: 0.0 },
      { t: 0.15, x: start.x, y: start.y, scale: 1.0, rot: -2, opacity: 1.0, ease: "outQuad" },
      { t: 0.85, x: end.x, y: end.y, scale: 1.05, rot: 1, ease: "outExpo" },
      { t: 1.00, x: end.x, y: end.y, scale: 1.0, rot: 0, ease: "outBack" },
    ],
    { durationMs: 650 }
  );

  overlay.remove(ghostId);
  overlay.remove(glowId);
  overlay.fadeOutAndRemove(runeId, 220);
}
```

---

# 3.5 Flip Reveal 3D (carta setada revelando)

## Quando usar
- Flip Summon
- Ataque em DEF face-down (revela ao ser atacada)

## Como fica
- Carta gira no eixo Y (3D), troca a face no meio, brilho na borda.

## Dados necessários
- `cardRect` do setado
- `frontTexture` (arte da carta)
- `backTexture` (verso)

## Passos
1) Spawn ghost flip-card com face “back”
2) Rotaciona até 90°
3) Troca para “front”
4) Rotaciona 90° → 180°
5) Highlight rápido

## CSS essencial
```css
.flip-card {
  position: absolute;
  transform-style: preserve-3d;
  perspective: 900px;
}
.flip-face {
  position: absolute;
  inset: 0;
  backface-visibility: hidden;
}
.flip-front { transform: rotateY(180deg); }
```

## Pseudo-código
```ts
async function flipReveal(cardRect: DOMRect, textures: { front: string; back: string }) {
  const id = overlay.spawnFlipCard({ rect: cardRect, textures });

  await overlay.animateFlip(id, { rotateY: 90 }, { durationMs: 180, ease: "inOutCubic" });

  overlay.setFlipFace(id, "front"); // troca no meio

  await overlay.animateFlip(id, { rotateY: 180 }, { durationMs: 180, ease: "inOutCubic" });

  overlay.spawnEdgeHighlight({ rect: cardRect, durationMs: 220 });

  overlay.remove(id);
}
```

---

# 3.6 Link Beam (linha arcana caster → alvo)

## Quando usar
- Spells/skills com alvo
- Buff/debuff
- Destruir carta
- Equipar

## Como fica
- Uma linha curva brilhante conecta caster e alvo, com “pulse” no destino.

## Dados necessários
- `fromRect`, `toRect`

## Passos
1) Spawn beam SVG no overlay
2) Animate stroke dashoffset (desenha)
3) Pulse no target
4) Fade-out

## Pseudo-código
```ts
async function linkBeam(fromRect: DOMRect, toRect: DOMRect) {
  const from = center(fromRect);
  const to = center(toRect);

  const beamId = overlay.spawnBeam({ from, to, curvature: 0.22 });

  await overlay.animateBeam(beamId, { draw: 1 }, { durationMs: 220, ease: "outQuad" });

  overlay.spawnPulse({ x: to.x, y: to.y, durationMs: 260 });

  await overlay.fadeOutAndRemove(beamId, 180);
}
```

---

## 4) Presets prontos (as 6 animações como “API”)

Crie um módulo `duelFx.ts` (ou similar) expondo:

```ts
export const duelFx = {
  impactFrames,
  damageFloater,
  attackDash,
  summonToField,
  flipReveal,
  linkBeam,
};
```

**E no fluxo do duelo:**
- engine gera evento: `ATTACK_RESOLVED { attackerId, targetId, damage }`
- UI:
  1) `await duelFx.attackDash(attackerRect, targetRect)`
  2) `await duelFx.impactFrames({ focusRect: targetRect, strength: 2 })`
  3) `duelFx.damageFloater(lpHudRect, -damage, "damage")`
  4) commit do estado

---

## 5) Integração com sua fila (o jeito certo)

### Exemplo de “resolver ataque”
```ts
queue.enqueue(async () => {
  const attackerRect = rects.get(attackerId);
  const targetRect = rects.get(targetId);
  const lpRect = rects.get(targetPlayerLpHudId);

  await duelFx.attackDash(attackerRect, targetRect);
  await duelFx.impactFrames({ focusRect: targetRect, strength: 2 });
  duelFx.damageFloater(lpRect, -damage, "damage");

  gameStore.applyPatch(patchFromServerOrEngine);
});
```

---

## 6) Qualidade e performance (pra não “quebrar” no browser)

### Faça
- Animar **transform** (translate/scale/rotate) e opacity
- `will-change` nos VFX
- Capturar rects no começo e não recalcular no meio
- Overlay com `pointer-events: none`

### Evite
- Animar `top/left` (reflow)
- Filter blur pesado em grandes áreas o tempo todo
- Partículas demais simultâneas

---

## 7) Debug (muito útil)
- Modo dev: desenhar retângulos dos rects (HUD e slots)
- Log da queue: “qual efeito rodou e quanto durou”
- Botão “replay last animation” (acelera iteração)

---

## 8) Checklist (ordem de implementação)

1) `impactFrames`  
2) `damageFloater`  
3) `attackDash`  
4) `summonToField`  
5) `flipReveal`  
6) `linkBeam`

---

## 9) Ideias de expansão (quando quiser)
- Destroy dissolve (mask/noise)
- Turn banner (Your Turn)
- Critical zoom (camera fake)
- Spell cast “stamp” (sigilo que bate no alvo)
