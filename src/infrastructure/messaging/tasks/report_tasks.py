from __future__ import annotations

from src.infrastructure.messaging.celery_config import celery_app


@celery_app.task
def generate_report_task(report_id: str):
    return {"status": "queued", "report_id": report_id}
