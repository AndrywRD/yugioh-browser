# Deploy Multiplayer (Render - simples, rapido e sem Blueprint pago)

Este repositório possui `render.yaml` pronto para deploy via Blueprint, mas se o Render pedir plano pago para Blueprint, faça o fluxo manual abaixo (gratis).

## 0) Fluxo manual (gratis, sem Blueprint)

### 0.1 Backend (Web Service)

No Render:

1. **New +** -> **Web Service**
2. Conecte o repo `AndrywRD/yugioh-browser`
3. Branch: `main`
4. Configure:
   - Root Directory: *(vazio)*
   - Build Command: `pip install -r requirements.txt`
   - Start Command: `alembic upgrade head && uvicorn src.presentation.api.main:app --host 0.0.0.0 --port $PORT`
5. Em **Environment**, adicione:
   - `PYTHON_VERSION=3.11.10`

### 0.2 Frontend (Static Site)

1. **New +** -> **Static Site**
2. Repo: `AndrywRD/yugioh-browser`
3. Branch: `main`
4. Configure:
   - Root Directory: `frontend`
   - Build Command: `npm ci && npm run build`
   - Publish Directory: `dist`
5. Em **Redirects/Rewrites**, criar:
   - Source: `/*`
   - Destination: `/index.html`
   - Action: `Rewrite`

### 0.3 Banco e Redis (gratis)

Opcao A (se seu Render oferecer free):
- criar Postgres e Redis no proprio Render.

Opcao B (mais comum hoje):
- Postgres no **Neon** (free)
- Redis no **Upstash** (free)

Depois, copie as URLs de conexao para as envs do backend.

### 0.4 Variaveis de ambiente

#### Backend
- `PYTHON_VERSION=3.11.10`
- `ENVIRONMENT=production`
- `DEBUG=false`
- `SECRET_KEY=<valor-forte>`
- `ENCRYPTION_KEY=<valor-forte>`
- `DATABASE_URL=<postgres-url>`
- `REDIS_URL=<redis-url>`
- `CELERY_BROKER_URL=<redis-url>`
- `CELERY_RESULT_BACKEND=<redis-url>`
- `CORS_ORIGINS=https://URL_DO_FRONTEND.onrender.com`
- `ADMIN_EMAIL=admin@example.com`
- `ADMIN_PASSWORD=<senha-forte>`
- `ADMIN_FULL_NAME=Admin User`

#### Frontend
- `VITE_API_BASE_URL=https://URL_DO_BACKEND.onrender.com/api/v1`
- `VITE_WS_BASE_URL=wss://URL_DO_BACKEND.onrender.com`

### 0.5 Ordem correta

1. Deploy backend.
2. Deploy frontend.
3. Atualizar `CORS_ORIGINS` no backend com a URL real do frontend.
4. Atualizar envs do frontend com a URL real do backend.
5. Redeploy frontend.

- `kpi-backend` (FastAPI + WebSocket)
- `kpi-frontend` (Vite static)
- `kpi-postgres` (managed Postgres)
- `kpi-redis` (managed Key Value/Redis)

## 1) Publicar via Blueprint (se sua conta permitir)

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
