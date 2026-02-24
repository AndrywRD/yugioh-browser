# Ruptura Arcana (MVP)

Implementacao MVP do documento `jogo.md` com:

- Monorepo TypeScript
- `apps/server`: Fastify + Socket.IO (servidor autoritativo)
- `apps/web`: Next.js + Tailwind (Home, Lobby e Match)
- `packages/shared`: tipos e schemas Zod
- `packages/game`: engine puro (turno, summon, fuse, attack, end turn)

## O que o MVP cobre

- Sala 1x1 (create/join/ready/start/leave)
- Snapshot por jogador (mao do oponente oculta)
- Turno e fases essenciais
- Invocacao normal (1 por turno, ou fusao)
- Fusao por tags com 2 ou 3 materiais (mao/campo)
- Ordem de cadeia para 3 materiais
- Fallback:
  - 2 materiais falha -> `Golem Inerte` 500/500
  - 3 materiais falha -> `Golem Instavel` 1000/1000 em DEFENSE com trava leve
- Combate ATK/DEF classico
- Ataque direto quando oponente sem monstros
- Fim de jogo por LP <= 0
- Fatiga ao comprar sem cartas (500 LP)

## Estrutura

```txt
apps/
  web/
  server/
packages/
  shared/
  game/
```

## Como rodar localmente

1. Instale dependencias no monorepo:

```bash
npm install
```

2. Suba o servidor:

```bash
npm run dev:server
```

3. Em outro terminal, suba o frontend:

```bash
npm run dev:web
```

4. Acesse:

- Web: `http://localhost:3000`
- Health server: `http://localhost:3333/health`

## Variaveis de ambiente

### Server (`apps/server/.env`)

```env
PORT=3333
WEB_ORIGIN=http://localhost:3000
```

### Web (`apps/web/.env.local`)

```env
NEXT_PUBLIC_SERVER_URL=http://localhost:3333
```

## Testes

Unitarios do engine:

```bash
npm run test
```
