from __future__ import annotations

from src.infrastructure.messaging.celery_config import celery_app


@celery_app.task
def evaluate_alerts_task(metric_values: dict[str, float]):
    return {"status": "queued", "processed": len(metric_values)}
