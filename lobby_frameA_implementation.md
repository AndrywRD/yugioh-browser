# Lobby “Game UI” Upgrade — Implementação com Frame A (9-slice) + Background Layers + Ornaments
> Objetivo: transformar o lobby de “grid de informações” em “interface de game”, usando **assets** (BG scene, stars, noise, ornaments) e **Frame A** como painel principal via **9-slice (CSS border-image)**.  
> Você vai colocar os arquivos na pasta indicada com os nomes **exatos** abaixo.

---

## 0) Estrutura de pastas e nomes (obrigatório)

Coloque tudo em:

```
/public/ui/lobby/
```

Com estes nomes:

### Background
- `bg_scene.png`  *(a imagem grande “scene” do fundo — opaca)*
- `bg_stars.png`  *(starfield / poeira / pontos — pode ser fraco, vamos usar blend)*
- `bg_noise.png`  *(grain/noise tile — ideal 1024x1024, repetível)*
- `bg_vignette.png` *(opcional: se você gerou um vignette PNG; se não, usamos CSS radial)*

### Frames / UI
- `frameA.png`  *(Frame A principal — o seu frame “mais pesado”)*

### Ornaments (opcionais, mas recomendados)
- `orn_rune_strip.png` *(faixa de runas para headers)*
- `orn_corner.png` *(ornamento de canto, se tiver)*
- `orn_seal.png` *(selo/badge pequeno, se tiver)*

> Se você não tiver ornaments separados, ignore os itens de ornaments e use só BG + frameA.

---

## 1) Camadas do fundo (muda a cara instant)

### HTML/React (estrutura)
No container do Lobby, a estrutura precisa ser:

```tsx
<div className="lobbyRoot">
  <div className="lobbyBg" aria-hidden="true">
    <div className="bgScene" />
    <div className="bgVignette" />
    <div className="bgStars" />
    <div className="bgNoise" />
  </div>

  <div className="lobbyUi">
    {/* TODO: seu conteúdo atual do lobby */}
  </div>
</div>
```

### CSS (camadas)
```css
.lobbyRoot{
  position: relative;
  min-height: 100vh;
  overflow: hidden;
  background: #05070d; /* fallback */
}

.lobbyBg{
  position: absolute;
  inset: 0;
  z-index: 0;
}

.lobbyUi{
  position: relative;
  z-index: 10;
}

/* 1) Scene (fundo principal) */
.bgScene{
  position: absolute;
  inset: 0;
  background: url("/ui/lobby/bg_scene.png") center/cover no-repeat;
  filter: blur(3px) saturate(1.06) brightness(0.92);
  transform: scale(1.03); /* evita borda do blur */
}

/* 2) Vignette (se não tiver png, use radial-gradient) */
.bgVignette{
  position: absolute;
  inset: 0;
  /* Se você tiver bg_vignette.png:
  background: url("/ui/lobby/bg_vignette.png") center/cover no-repeat;
  opacity: 0.85;
  */
  background: radial-gradient(
    ellipse at center,
    rgba(0,0,0,0.0) 35%,
    rgba(0,0,0,0.82) 100%
  );
  opacity: 0.95;
}

/* 3) Stars/Dust (blend) */
.bgStars{
  position: absolute;
  inset: 0;
  background: url("/ui/lobby/bg_stars.png") center/cover no-repeat;
  opacity: 0.18;
  mix-blend-mode: screen; /* dá brilho sem “sujar” */
}

/* 4) Noise (tile) */
.bgNoise{
  position: absolute;
  inset: 0;
  background: url("/ui/lobby/bg_noise.png") repeat;
  opacity: 0.06;
  mix-blend-mode: overlay;
}
```

### Ajustes finos recomendados
- Se o fundo ficar “apagado”: aumente `bgStars opacity` para `0.22–0.30`
- Se a UI perder contraste: aumente `bgVignette opacity` para `1.0`
- Se o noise ficar visível: reduza para `0.03–0.05`

---

## 2) Frame A (9-slice) — painel com cara de game

### Por que 9-slice?
Evita distorção dos cantos ornamentados quando o painel aumenta/diminui.

### CSS do Frame A (base)
> **Importante:** você precisa ajustar o `slice` (64 é padrão bom).  
> Se o seu canto parecer “comido” ou “esticado”, teste 56, 64, 72.

```css
.frameA{
  /* 9-slice */
  border: 64px solid transparent;
  border-image-source: url("/ui/lobby/frameA.png");
  border-image-slice: 64 fill;
  border-image-width: 64px;
  border-image-repeat: stretch;

  /* “surface” por dentro (não use bordas internas) */
  background: rgba(8, 12, 22, 0.72);

  /* layout */
  padding: 16px; /* conteúdo fica dentro do painel */
  box-shadow: 0 18px 48px rgba(0,0,0,0.55);
}
```

### Variações úteis do Frame A
```css
.frameA--hero{
  background: rgba(8, 12, 22, 0.62);
}

.frameA--sidebar{
  background: rgba(8, 12, 22, 0.68);
}

.frameA--soft{
  border: 56px solid transparent;
  border-image-slice: 56 fill;
  border-image-width: 56px;
}
```

---

## 3) Aplicação no seu layout atual (mínimo de refactor)

### Onde usar Frame A (prioridade)
1) Hero/topo (header do lobby)
2) “Continue a Campanha” (card grande)
3) Sidebar “Perfil” e “Missões”
4) “Card Trader”

### Exemplo: wrap rápido
```tsx
<section className="frameA frameA--hero">
  {/* seu header/topo */}
</section>

<section className="frameA">
  {/* Continue a Campanha */}
</section>

<aside className="frameA frameA--sidebar">
  {/* Perfil */}
</aside>
```

---

## 4) Deixar menos “dashboard” (só com composição)

Mesmo mantendo os mesmos dados, faça estas 3 mudanças:

### 4.1 Continue a Campanha vira “Hero Visual”
Dentro do card:
- esquerda: **imagem do próximo NPC / tier** (grande)
- direita: texto + barra + CTA

Estrutura sugerida:
```tsx
<section className="frameA campaignHero">
  <div className="campaignHeroMedia" />
  <div className="campaignHeroInfo">
    {/* textos, barra, botões */}
  </div>
</section>
```

CSS:
```css
.campaignHero{
  display: grid;
  grid-template-columns: 40% 60%;
  gap: 16px;
  align-items: stretch;
}

.campaignHeroMedia{
  border-radius: 12px;
  background: url("/ui/lobby/hero_npc.png") center/cover no-repeat; /* opcional */
  filter: saturate(1.02) contrast(1.02);
  box-shadow: inset 0 0 0 1px rgba(255, 215, 120, 0.08);
  min-height: 220px;
}
```

> Se você não tem `hero_npc.png`, deixe um gradient + rune watermark por enquanto.

### 4.2 Missões como “quest cards”
- Ícone grande (orn_seal) ou sprite
- barra mais grossa
- recompensa maior e com ícone

### 4.3 Menos borda interna
Dentro do frame: **remova outlines internas** e separe só por `gap/padding` e leve diferença de background.

---

## 5) Rune/Ornament Watermark nos headers (opcional, mas dá “cara de game”)

### Estrutura no header do painel
```tsx
<div className="panelHeader">
  <h3>MISSÕES DIÁRIAS</h3>
  <div className="panelHeaderRune" aria-hidden="true" />
</div>
```

CSS:
```css
.panelHeader{
  position: relative;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding-bottom: 10px;
  margin-bottom: 12px;
}

.panelHeaderRune{
  position: absolute;
  right: 0;
  top: -2px;
  width: 180px;
  height: 44px;
  background: url("/ui/lobby/orn_rune_strip.png") right/contain no-repeat;
  opacity: 0.12;
  mix-blend-mode: screen;
  pointer-events: none;
}
```

---

## 6) Microanimações (rápidas e com impacto)

### Hover lift em cards clicáveis
```css
.clickCard{
  transition: transform 180ms ease, box-shadow 180ms ease, filter 180ms ease;
}

.clickCard:hover{
  transform: translateY(-4px);
  box-shadow: 0 18px 42px rgba(0,0,0,0.55);
  filter: drop-shadow(0 0 14px rgba(255, 205, 90, 0.12));
}
```

### Shine sutil no botão dourado (CTA principal)
> Use um pseudo-elemento com gradient que “passa” de lado.  
```css
.ctaGold{
  position: relative;
  overflow: hidden;
}

.ctaGold::after{
  content:"";
  position:absolute;
  top:-40%;
  left:-60%;
  width: 40%;
  height: 180%;
  background: linear-gradient(90deg, rgba(255,255,255,0), rgba(255,255,255,0.22), rgba(255,255,255,0));
  transform: rotate(18deg);
  animation: shine 1.8s ease-in-out infinite;
  opacity: 0.55;
}

@keyframes shine{
  0% { left: -60%; }
  55%{ left: 120%; }
  100%{ left: 120%; }
}
```

> Se ficar chamativo demais: reduza `opacity` para 0.25 ou aumente o tempo para 2.4s.

---

## 7) Checklist de validação (antes de commitar)

1) **BG scene** visível mas não compete com texto  
2) **Vignette** escurece bordas e melhora leitura  
3) Stars/dust aparece sutil (screen)  
4) Noise quase imperceptível  
5) Frame A não deforma canto (ajuste slice 56/64/72)  
6) Painéis internos sem bordas demais  
7) CTA principal “puxa” atenção

---

## 8) Troubleshooting rápido

### “O frame ficou esticado/feio”
- Ajuste `border-image-slice` e `border` juntos:
  - teste `56`, `64`, `72`
- Garanta que o PNG tem cantos bem definidos e área central “limpa”.

### “Stars não aparece”
- Aumente `.bgStars opacity` para `0.28`
- Troque blend para `lighten`:
  - `mix-blend-mode: lighten;`

### “Noise apareceu demais”
- Reduza para `0.03`
- Use blend `soft-light`:
  - `mix-blend-mode: soft-light;`

---

## 9) Exemplo mínimo de aplicação (sem mudar seu grid)

```tsx
<div className="lobbyRoot">
  <div className="lobbyBg" aria-hidden="true">
    <div className="bgScene" />
    <div className="bgVignette" />
    <div className="bgStars" />
    <div className="bgNoise" />
  </div>

  <div className="lobbyUi">
    <header className="frameA frameA--hero">
      {/* header atual + tabs */}
    </header>

    <main className="lobbyGrid">
      <section className="frameA campaignHero">
        {/* Continue a Campanha */}
      </section>

      <aside className="frameA frameA--sidebar">
        {/* Perfil + Missões + Progresso */}
      </aside>

      <section className="frameA">
        {/* Card Trader */}
      </section>

      <section className="frameA">
        {/* Tutorial */}
      </section>
    </main>
  </div>
</div>
```

---

## 10) Próximo passo recomendado (depois que isso funcionar)
- Criar **Frame B** (mais fino) para cards pequenos
- Criar ícones consistentes (gold/xp/deck/online)
- Adicionar **particles animadas** em canvas no fundo (bem poucas)

