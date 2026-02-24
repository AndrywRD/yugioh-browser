from src.presentation.websocket.manager import manager


async def broadcast_metric_update(widget_id: str, value: float) -> None:
    await manager.broadcast({"event": "metric_updated", "widget_id": widget_id, "value": value}, channel="metrics")


async def broadcast_alert(alert_id: str, severity: str, message: str) -> None:
    await manager.broadcast(
        {"event": "alert_triggered", "alert_id": alert_id, "severity": severity, "message": message},
        channel="alerts",
    )
