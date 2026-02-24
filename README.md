# KPI Dashboard

Business Intelligence platform for KPI dashboards and business metrics, with ETL orchestration, alerts, reports, and real-time updates.

## Features

- Multi-source ingestion (API, SQL, CSV, Google Sheets placeholder)
- CSV upload endpoint with automatic storage path configuration
- ETL pipeline (extract, clean, enrich, aggregate, load)
- Interactive dashboards and widget catalog (line/bar/pie/number/table)
- Metric calculations (sum, avg, count, min, max, percentile, trend)
- Alerts with thresholds and acknowledgement flow
- Report generation (CSV/Excel/PDF placeholder)
- JWT auth + RBAC (admin/editor/viewer)
- Encrypted data source credentials at rest
- Structured logging + Prometheus metrics endpoint
- REST API + WebSocket updates
- Dockerized local stack (TimescaleDB, Redis, RabbitMQ, MinIO)

## Architecture

- `src/domain`: entities, value objects, repository ports, domain rules
- `src/application`: use cases and orchestration services
- `src/infrastructure`: persistence, ETL, connectors, messaging, cache, monitoring
- `src/presentation`: FastAPI routers, schemas, middleware, websocket
- `frontend`: React + TypeScript dashboard UI

## Quick Start

### 1. Backend (local)

```bash
python -m venv .venv
source .venv/bin/activate  # Windows PowerShell: .venv\Scripts\Activate.ps1
pip install -r requirements.txt
cp .env.example .env
alembic upgrade head
python scripts/seed_db.py
python scripts/create_sample_data.py
uvicorn src.presentation.api.main:app --reload
```

For development tooling/tests, install:

```bash
pip install -r requirements-dev.txt
```

API docs: `http://localhost:8000/docs`

Default admin:

- Email: `admin@example.com`
- Password: `admin123`

### 2. Frontend

```bash
cd frontend
npm install
npm run dev
```

Frontend URL: `http://localhost:5173`

### 3. Docker stack

```bash
cd docker
docker compose up -d --build
```

## Main API Endpoints

- Auth: `POST /api/v1/auth/register`, `POST /api/v1/auth/login`, `GET /api/v1/auth/me`
- Dashboards: CRUD + duplicate + data
- Widgets: CRUD + refresh
- Metrics: list, calculate, history, compare, trend, export
- Data Sources: CRUD + CSV upload + test + sync
- Alerts: CRUD + acknowledge + history
- Reports: generate, list, download, schedule, schedules
- Health: `GET /health`
- Prometheus: `GET /metrics`
- WebSocket: `WS /ws/{channel}`

## Testing

```bash
pytest -q
```

## CI/CD

- `.github/workflows/ci.yml`: lint, type-check, tests
- `.github/workflows/cd.yml`: Docker image build/deploy scaffold
- `docs/DEPLOY_MULTIPLAYER.md`: guia rapido para deploy multiplayer em producao
- `render.yaml`: blueprint pronto para deploy rapido no Render (backend + frontend + postgres + redis)

## Notes

- The roadmap timeline was intentionally ignored and the full project is delivered end-to-end.
- Some advanced integrations are provided with pragmatic placeholders (Google Sheets auth flow, true PDF rendering, cloud deploy secrets).
- During data source sync, ETL output is converted into `metrics` records for widgets linked to that source.
