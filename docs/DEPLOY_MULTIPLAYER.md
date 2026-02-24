# Deploy Multiplayer (Render - simples e rapido)

Este repositório agora possui `render.yaml` pronto para:

- `kpi-backend` (FastAPI + WebSocket)
- `kpi-frontend` (Vite static)
- `kpi-postgres` (managed Postgres)
- `kpi-redis` (managed Key Value/Redis)

## 1) Publicar via Blueprint

1. Suba o projeto para um repositório Git (GitHub/GitLab/Bitbucket).
2. No Render: **New +** -> **Blueprint**.
3. Selecione o repositório.
4. O Render vai detectar `render.yaml` e criar os 4 serviços.
5. Clique em **Apply**.

## 2) Ajustar envs obrigatorias (apos criar os servicos)

Depois que os serviços forem criados, configure manualmente:

### Backend (`kpi-backend`)
- `CORS_ORIGINS=https://URL_DO_FRONTEND.onrender.com`
- `ADMIN_PASSWORD=<senha-forte>`

### Frontend (`kpi-frontend`)
- `VITE_API_BASE_URL=https://URL_DO_BACKEND.onrender.com/api/v1`
- `VITE_WS_BASE_URL=wss://URL_DO_BACKEND.onrender.com`

> O `render.yaml` deixa essas envs como `sync: false` de propósito, porque as URLs públicas só existem depois da criação dos serviços.

## 3) Ordem de deploy recomendada

1. Aguarde `kpi-postgres` e `kpi-redis` ficarem `available`.
2. Deploy do `kpi-backend`.
3. Ajuste `CORS_ORIGINS` no backend com a URL real do frontend.
4. Ajuste `VITE_API_BASE_URL` e `VITE_WS_BASE_URL` no frontend.
5. Redeploy manual do frontend.

## 4) Checklist de validação

1. `GET https://URL_DO_BACKEND.onrender.com/health` deve responder 200.
2. Login no frontend deve funcionar.
3. Abrir tela de dashboard detalhado e validar realtime:
   - sem erro de `localhost` no console.
   - websocket conectado em `wss://.../ws/metrics`.
4. Sem erro de CORS nas chamadas `/api/v1/*`.

## 5) Observações de operação

- Mantenha `kpi-backend` com 1 instância no início.
- O manager WebSocket atual é em memória; múltiplas réplicas exigem pub/sub (passo futuro).
