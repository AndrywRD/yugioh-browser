# Ruptura Arcana — Documento Técnico Completo (MVP)

> Objetivo: especificar **toda a base** (game engine + web + online + deploy) para gerar implementação com IA, do zero, com decisões claras e um MVP jogável.

---

## 0) Visão geral do projeto

### Produto

Jogo de cartas **1x1** (duelo), rodando em **web**, com modo online via **salas** (rooms). O diferencial do jogo é o sistema de **Fusão estilo Forbidden Memories**:

- Sem tributo
- Sem Extra Deck
- Sem “Polimerização”
- Fusão com **2 ou 3 monstros** (mão/campo)
- Fusões por **tags** (não exige cartas específicas)
- Falha gera “Golem” (fallback) com stats definidos

### Meta do MVP

- Jogável do início ao fim: entrar em sala, iniciar partida, comprar, invocar, fundir, atacar, finalizar.
- Suportar **6–10 jogadores simultâneos** (ex.: 3–5 duelos rodando ao mesmo tempo no servidor).
- Deploy público com custo **zero** (ou mínimo), e caminho claro para evoluir.

### Não faz parte do MVP (adiado)

- Ranking / matchmaking avançado
- Loja / economia
- Anti-cheat avançado
- Replay, espectador, torneios
- Animações complexas
- Efeitos de cartas muito complexos (stack/pilha)

---

## 1) Stack recomendada

### Linguagem e base

- **TypeScript** em tudo (web + server + engine)
- **Node.js** no backend

### Frontend (web)

- **Next.js** (React + TS)
- Renderização e UI do campo, mão, interações, log
- **TailwindCSS** (produtivo e consistente)
- **Zustand** (state local leve) ou React state + hooks (MVP)
- Comunicação realtime via Socket.IO client

### Backend (online / realtime)

- **Fastify** (ou Express) + **Socket.IO**
  - Socket.IO simplifica reconexão e fallback; excelente para MVP.
- “Servidor autoritativo”: servidor valida tudo e é a fonte da verdade.

### Engine do jogo (regras)

- Pacote isolado `packages/game` com funções puras:
  - `validateAction(state, action, playerId)`
  - `applyAction(state, action, playerId) -> { nextState, events }`

### Banco de dados

**Recomendação para MVP**: **não usar DB para o core do duelo** (estado fica em memória).

- Motivo: duelo é realtime e efêmero, DB adiciona complexidade.
- DB é útil depois para contas, histórico, decks salvos, etc.

**Se precisar de DB no MVP (opcional)**:

- **Postgres** (Neon ou Supabase) para:
  - usuários (opcional)
  - decks (opcional)
  - analytics (opcional)
- **Redis** (Upstash) opcional para:
  - rate limit
  - presença/rooms distribuídas (futuro)

### Validação de mensagens

- **Zod** em `packages/shared` para validar payloads do socket no servidor.

---

## 2) Arquitetura do repositório (monorepo)

### Estrutura proposta

/ruptura-arcana
/apps
/web
src/
next.config.js
/server
src/
Dockerfile (opcional)
/packages
/shared
src/
types.ts
schemas.ts
constants.ts
/game
src/
engine/
state.ts
actions.ts
validate.ts
reducer.ts
fusion.ts
combat.ts
rng.ts
index.ts
package.json
pnpm-workspace.yaml
tsconfig.base.json


### Regras de separação (muito importante)
- `packages/game` **não conhece Socket, HTTP, banco, nem UI**.
- `apps/server`:
  - cria salas, gerencia conexões
  - chama o engine e transmite snapshots/events
- `apps/web`:
  - mostra estado, envia actions do usuário
  - nunca “decide” resultados

---

## 3) Modo online (realtime) — “Servidor autoritativo”

### Conceito
- Cliente **só envia intenção** (action).
- Servidor valida:
  - é o turno certo?
  - ação permitida nessa fase?
  - ação respeita limites (1 summon OU 1 fusão)?
  - carta existe e pertence ao jogador?
  - slots disponíveis?
- Servidor aplica e transmite atualização.

### Requisitos para suportar 6–10 jogadores simultâneos
- Estrutura de “rooms” em memória:
  - cada room = 1 duelo com 2 players
- 5 rooms simultâneas = 10 jogadores (ok)
- Estado de cada room é pequeno (JSON), transmissões são leves.

### Reconexão
- Socket.IO permite reconectar.
- Ao reconectar, servidor:
  - reassocia `playerId`/`socketId`
  - envia `game:snapshot` do estado atual.

### Anti-cheat (MVP)
- O servidor é autoritativo (já resolve o principal).
- Não confiar em nada do cliente:
  - posições, resultados, tags, etc. são calculados no server.
- Rate limit simples (opcional) para spam de actions.

---

## 4) Protocolo Socket.IO (eventos)

### Handshake / Identidade
- Para MVP: `playerId` gerado pelo servidor e guardado no `localStorage`.
- Em conexão:
  - cliente envia `auth:hello` com `storedPlayerId?`
  - servidor retorna `auth:session` com `playerId` final

### Eventos de sala (room)
**Client -> Server**
- `room:create` `{ username: string }`
- `room:join` `{ roomCode: string, username: string }`
- `room:leave` `{}`
- `room:ready` `{ ready: boolean }`
- `room:start` `{}` (somente host ou auto-start quando ambos ready)

**Server -> Client**
- `room:state` `{ roomCode, status, players, hostId }`
- `room:error` `{ message }`

### Eventos de jogo (game)
**Client -> Server**
- `game:action` `{ actionId: string, type: ActionType, payload: any }`

**Server -> Client**
- `game:snapshot` `{ version: number, state: GameStateForClient }`
- `game:events` `{ version: number, events: GameEvent[] }`
- `game:error` `{ actionId: string, message: string }`

### Observação de “visão por jogador”
- Snapshot é “personalizado”:
  - o dono recebe suas cartas na mão (ids + templates)
  - o oponente recebe apenas `handCount` (sem detalhes)

---

## 5) Especificação do GAME MVP (regras)

### Setup
- Duelo 1x1
- LP inicial: **8000**
- Deck: **40**
- Mão inicial: **5**
- Compra: 1 por turno

### Campo
- **5 slots de monstros** por jogador
- Zonas:
  - deckCount
  - hand (privado)
  - handCount (público)
  - graveyard (público por enquanto, ou privado parcial se quiser)
  - monsterZone[5]

### Turno
Fases:
1) DRAW: compra 1 carta
2) MAIN: invocação/fusão + spells (se existirem)
3) BATTLE: ataques
4) END: finaliza turno

### Posição de monstro
- `ATTACK` ou `DEFENSE`
- Regra: **1 mudança de posição por monstro por turno**
  - Implementação: flag `positionChangedThisTurn` por monstro.

### Invocação normal
- Permitida somente na MAIN.
- **1 por turno**.
- Requer slot vazio.
- Invoca da mão para o campo, escolhendo posição.

### Fusão (Forbidden Memories style)
- Permitida somente na MAIN.
- No turno, você escolhe **OU** invocação normal **OU** fusão.
- Materiais: **somente monstros**.
- Materiais podem vir de:
  - mão + mão
  - campo + campo
  - mão + campo
- Materiais: **2 ou 3** monstros no MVP.
- Resultado ocupa:
  - se algum material veio do campo, ocupa um slot escolhido dentre os slots envolvidos
  - se todos da mão, precisa escolher um slot vazio

#### Cadeia de fusão (3 materiais)
- O jogador define a ordem (ex.: A+B -> R1; R1+C -> R2).
- Se falhar em qualquer etapa com 3 materiais: fallback único (ver abaixo).

#### Fallback de falha
- Falha com 2 materiais: **Golem Inerte 500/500**.
- Falha com 3 materiais: **Golem Instável 1000/1000**.
- Limitador do Golem Instável (recomendado):
  - entra em `DEFENSE` e não pode mudar posição até o próximo turno do dono
  - e/ou não pode atacar no turno em que nasceu

> O fallback deve ser determinístico e calculado no servidor.

### Combate (ATK/DEF clássico)
- Cada monstro pode atacar 1 vez por BATTLE.
- O jogador escolhe atacante e alvo.
- Ataque direto permitido apenas se o oponente não tiver monstros em campo.

#### Resolução
Alvo em ATTACK:
- compara ATK vs ATK
- menor ATK é destruído
- diferença = dano de LP ao dono do monstro destruído (ou do menor ATK)

Alvo em DEFENSE:
- compara ATK do atacante vs DEF do defensor

- se ATK > DEF: defensor destruído, **sem dano**
- se ATK < DEF: atacante não é destruído, diferença = dano de LP ao atacante (dono do atacante)
- se igual: nada

### Fim de jogo

- LP <= 0: derrota
- Deck vazio: no MVP, aplica “fatiga”:
  - se comprar e não houver carta: toma 500 de dano (ou 1000) e segue

---

## 6) Sistema de TAGs (obrigatório no MVP)

### Objetivo das tags

- Definir fusões sem exigir cartas específicas.
- Controlar balance e liberdade criativa.

### Categorias recomendadas

**Tipo (Creature Type)**

- DRAGON, BEAST, WARRIOR, SPELLCASTER, UNDEAD, GOLEM, AQUATIC, AVIAN, INSECT, DEMON, ANGEL, PLANT, REPTILE

**Elemento**

- FIRE, WATER, EARTH, WIND, LIGHT, DARK, ARCANE (opcional como “elemento mágico”)

**Subtags / Material (para receitas e identidade)**

- METAL, SLIME, CURSED, HOLY, SHADOW, STORM, CRYSTAL, ANCIENT, WILD, MECHANIC (se quiser fantasia steampunk)

### Regras de composição de tags no resultado

- Todo monstro “resultado” tem um template com tags próprias.
- Para cadeia, as tags do resultado anterior contam na próxima fusão.
- O engine deve calcular fusão por tags disponíveis no “pool” do monstro (template).

---

## 7) FusionMap (tabela de fusões) — forma, não conteúdo

> Conteúdo (receitas e deck base) será feito depois. Aqui definimos apenas o **formato e regras do motor**.

### Estrutura de uma receita

- `id`
- `requiresAll: Tag[]`
- `requiresCount?: Array<{ tag: Tag, count: number }>`
- `requiresAny?: Tag[]` (opcional)
- `minAtkSum?: number` (opcional)
- `minDefSum?: number` (opcional)
- `priority: number`
- `resultMonsterTemplateId: string`

### Seleção de receita (determinística)

Quando múltiplas receitas casam:

1) maior `priority`
2) mais específica (mais requisitos totais)
3) se empate: desempate determinístico pelo `matchSeed` + hash dos materiais

> Importante: nada de RNG puro aqui, para manter competitivo.

---

## 8) Modelo de dados (GameState) — referência para implementação

### Tipos principais

- `CardTemplate` (definição de carta)
- `CardInstance` (instância no deck/mão/campo)
- `MonsterOnBoard` (instância no campo com estado extra)

### GameState (servidor)

Propriedades mínimas:

- `version: number`
- `status: "LOBBY" | "RUNNING" | "FINISHED"`
- `seed: number` (para desempates determinísticos)
- `turn: { playerId, phase, turnNumber }`
- `players: [PlayerState, PlayerState]`
- `flags: { usedSummonOrFuseThisTurn: boolean }` por jogador

`PlayerState`:

- `id`
- `username`
- `lp`
- `deck: CardInstanceId[]` (servidor pode manter lista embaralhada)
- `hand: CardInstanceId[]` (privado)
- `graveyard: CardInstanceId[]` (público)
- `monsterZone: Array<MonsterOnBoard | null>` (tamanho 5)

`MonsterOnBoard`:

- `instanceId`
- `position: "ATTACK" | "DEFENSE"`
- `hasAttackedThisTurn: boolean`
- `positionChangedThisTurn: boolean`
- `lockedPositionUntilTurn?: number` (para Golem Instável)

### Snapshots “por cliente”

- `GameStateForClient` deve ocultar:
  - `opponent.hand` detalhes (somente `handCount`).
- O servidor monta o snapshot conforme `viewerPlayerId`.

---

## 9) Ações (Actions) do jogo

### ActionType (MVP)

- `DRAW` (normalmente automático pelo servidor)
- `SUMMON`
- `FUSE`
- `CHANGE_POSITION`
- `ATTACK`
- `END_TURN`

### Payloads sugeridos

`SUMMON`

- `{ handInstanceId: string, slot: number, position: "ATTACK"|"DEFENSE" }`

`FUSE`

- `{ materials: FuseMaterial[], order: string[], resultSlot: number }`
  - `materials.length`: 2 ou 3
  - `order`: lista de `instanceId` na ordem para cadeia (2 ou 3)
  - `resultSlot`: obrigatório se todos da mão; se envolve campo, define o slot final (um dos slots materiais)

`CHANGE_POSITION`

- `{ slot: number, position: "ATTACK"|"DEFENSE" }`

`ATTACK`

- `{ attackerSlot: number, target?: { slot: number } | "DIRECT" }`

`END_TURN`

- `{}`

### Eventos (GameEvent) para log/UX

- `CARD_DRAWN`
- `MONSTER_SUMMONED`
- `FUSION_RESOLVED` (com materiais e resultado)
- `FUSION_FAILED` (com fallback)
- `POSITION_CHANGED`
- `ATTACK_DECLARED`
- `BATTLE_RESOLVED` (dano, destruições)
- `LP_CHANGED`
- `TURN_CHANGED`
- `GAME_FINISHED`

---

## 10) Servidor (apps/server) — responsabilidades

### Room Manager (em memória)

- `rooms: Map<roomCode, Room>`
- `Room`:
  - `code`
  - `players: { socketId, playerId, username, ready }[]`
  - `gameState?: GameState`
  - `createdAt`, `lastActivity`

### Fluxo

1) `room:create`: gera code, cria room, coloca host
2) `room:join`: entra se houver vaga (2 players)
3) `room:ready`: atualiza status, broadcast `room:state`
4) `room:start`: inicia `GameState`, embaralha decks (placeholders), compra inicial, envia `game:snapshot`
5) `game:action`: valida e aplica via engine; envia snapshot + events

### Limpeza de rooms

- Um job a cada X minutos remove rooms vazias e antigas.

### Emissão

- Após aplicar ação:
  - incrementa `state.version`
  - emite `game:events`
  - emite `game:snapshot`

> Para MVP, pode emitir snapshot sempre (mais fácil).

---

## 11) Frontend (apps/web) — responsabilidades

### Telas

1) Home:
   - criar sala
   - entrar com código
2) Lobby:
   - mostra players, ready, start
3) Match:
   - campo com 5 slots (ambos jogadores)
   - mão do jogador (clicável)
   - cemitério (visual simples)
   - log de eventos
   - botões: End Turn, Fusion Mode, Summon Mode

### Interações

- Modo “Summon”: selecionar carta da mão + slot + posição
- Modo “Fusion”: selecionar 2 ou 3 monstros (mão/campo) + ordem (UI simples: clique na ordem) + slot de resultado
- Modo “Attack”: selecionar atacante + alvo (slot ou direto)

### Estado local (client)

- Guardar:
  - `roomState`
  - `gameSnapshot`
  - “modo atual” de interação
  - seleção de cartas (fusion)
- O snapshot é sempre a verdade. UI se adapta.

---

## 12) Deploy — opções e recomendação

### Objetivo

- Hospedar web + server realtime com custo mínimo.

### Frontend (Next.js)

**Recomendado**: **Vercel (Free)**
- CI simples, CDN, domínio grátis, muito estável.
- Ótimo para o site.

### Backend (Socket.IO)

Para WebSockets, você precisa de host que suporte conexões longas.

**Recomendado**:
1) **Fly.io** (boa para realtime; costuma funcionar bem com sockets)
2) **Render** (pode dormir em free; pode atrapalhar partidas longas)
3) **Railway** (pode ter limitações/creditos; bom, mas depende da política atual)

**Escolha prática para MVP**:

- Web: Vercel
- Server: **Fly.io**

### Banco (opcional)

- **Neon Postgres** (free) ou **Supabase** (free) caso você adicione conta/decks.

### Ambientes e variáveis

- `WEB_ORIGIN` (URL do frontend)
- `PORT`
- `NODE_ENV`
- (opcional) `DATABASE_URL`
- (opcional) `REDIS_URL`

### CORS / Origins

- Server deve aceitar sockets apenas do `WEB_ORIGIN` (para reduzir abuso).

---

## 13) DB — decisão oficial do MVP

**DB no MVP**: **NÃO obrigatório**.

**Se quiser já preparar para evolução**:

- Use Postgres no Neon/Supabase e armazene:
  - `users (playerId, username, createdAt)`
  - `decks (id, playerId, name, listJson)`
  - `matches (id, p1, p2, winner, endedAt)` (opcional)
Mas o duelo em si continua em memória.

---

## 14) Segurança e robustez (MVP)

- Servidor autoritativo (essencial)
- Validar todos os payloads com Zod
- Limitar frequência de `game:action` por socket (rate limit leve)
- Tratar desconexão:
  - se player desconectar por X segundos: derrota por abandono (opcional)
  - ou pausar e esperar reconectar (MVP-friendly)

---

## 15) Observabilidade e logs

- Logar:
  - criação/remoção de rooms
  - início/fim de partidas
  - erros de validação de actions
- Em produção: logs do provider (Fly/Render) + console

---

## 16) Roadmap de implementação (MVP)

### Sprint 1: Infra + Lobby
- monorepo, shared types
- server Socket.IO: room create/join/ready/start
- web UI: Home + Lobby

### Sprint 2: Engine base + snapshot

- GameState
- turn loop (DRAW/MAIN/BATTLE/END)
- SUMMON + END_TURN
- UI do campo (5 slots) + mão simples

### Sprint 3: Combate ATK/DEF

- ATTACK + resolução
- LP e destruição
- fim de jogo

### Sprint 4: Fusão (2 e 3 materiais)

- motor de fusão por tags (sem tabela completa ainda, usar 5–10 receitas dummy)
- fallback goleminho 500/500 e golem 1000/1000
- UI de seleção + ordem

### Sprint 5: Deploy

- Vercel (web)
- Fly.io (server)
- Ajustes de CORS/origin

---

## 17) Checklist do que é “necessário para rodar o MVP”

### Obrigatório

- Room + lobby 2 players
- Snapshot por cliente (ocultando mão do oponente)
- Game engine: turn, summon, attack, end turn
- Fusion engine:
  - suporte a 2 e 3 materiais
  - suporte a materiais (mão/campo)
  - suporte a ordem (cadeia)
  - fallback (500/500 e 1000/1000)
- Sistema de tags (definição + aplicação)
- 1 conjunto mínimo de cartas e receitas dummy para testar

### Opcional no MVP (mas útil)

- Reconexão
- Timeout de AFK
- Persistir username/playerId em localStorage
- DB para salvar decks (se quiser)

---

## 18) Convenções para IA gerar código (importante)

### Princípios
- Nunca duplicar regra no client
- Engine pura e testável
- Server “thin”: valida + chama engine + envia snapshot

### Testes (recomendado)

- Testes unitários no engine:
  - combate ATK/DEF
  - fusão 2 e 3 materiais
  - validações de turno/fase

### Formato de mensagens

- Toda action deve ter `actionId` para idempotência e debug.
- Server responde erro com `actionId`.

---

## 19) Decisões finais fixadas

- 1x1
- 5 slots
- ATK/DEF clássico
- sem tributo
- sem extra deck
- fusão por tags (2 ou 3 materiais)
- falha 2 -> 500/500
- falha 3 -> 1000/1000 (com trava leve)
- 1 invocação normal OU 1 fusão por turno
- 1 mudança de posição por monstro por turno
- somente monstro + monstro

---

## 20) Próximos documentos (fora deste escopo)

- Deck base (40 cartas)
- FusionMap completo (40–60+ receitas)
- Facções/lore detalhado
- Design system da UI e identidade visual
- Sistema de contas e decks persistidos
- Matchmaking público e espectadores

---
Fim do documento.
