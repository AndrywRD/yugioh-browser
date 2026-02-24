from __future__ import annotations

from fastapi import FastAPI, WebSocket, WebSocketDisconnect

from src.infrastructure.monitoring import configure_logging, metrics_response
from src.infrastructure.persistence import init_db
from src.infrastructure.persistence.seed import ensure_default_admin
from src.presentation.api.middleware import AuthMiddleware, RateLimitMiddleware, RequestLoggingMiddleware, setup_cors
from src.presentation.api.routers import alerts, auth, dashboards, data_sources, health, metrics, reports, widgets
from src.presentation.websocket import manager
from src.shared.config import get_settings

settings = get_settings()

configure_logging()

app = FastAPI(title=settings.app_name, version="1.0.0")
setup_cors(app)
app.add_middleware(RequestLoggingMiddleware)
app.add_middleware(RateLimitMiddleware, requests_per_minute=240)
app.add_middleware(AuthMiddleware)


@app.on_event("startup")
def on_startup() -> None:
    init_db()
    ensure_default_admin()


@app.get("/metrics", tags=["monitoring"])
def prometheus_metrics():
    return metrics_response()


@app.websocket("/ws/{channel}")
async def websocket_endpoint(websocket: WebSocket, channel: str):
    await manager.connect(websocket, channel=channel)
    try:
        while True:
            message = await websocket.receive_json()
            await manager.broadcast({"event": "message", "channel": channel, "payload": message}, channel=channel)
    except WebSocketDisconnect:
        manager.disconnect(websocket, channel=channel)


app.include_router(health.router)
app.include_router(auth.router, prefix=settings.api_prefix)
app.include_router(dashboards.router, prefix=settings.api_prefix)
app.include_router(widgets.router, prefix=settings.api_prefix)
app.include_router(metrics.router, prefix=settings.api_prefix)
app.include_router(data_sources.router, prefix=settings.api_prefix)
app.include_router(alerts.router, prefix=settings.api_prefix)
app.include_router(reports.router, prefix=settings.api_prefix)
