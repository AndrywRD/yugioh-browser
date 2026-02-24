from __future__ import annotations

from celery import Celery

from src.shared.config import get_settings

settings = get_settings()

celery_app = Celery(
    "kpi_dashboard",
    broker=settings.celery_broker_url,
    backend=settings.celery_result_backend,
)

celery_app.conf.update(
    task_serializer="json",
    accept_content=["json"],
    result_serializer="json",
    task_ignore_result=True,
    timezone="UTC",
    enable_utc=True,
    beat_schedule={
        "hourly-etl-sync": {
            "task": "src.infrastructure.messaging.tasks.etl_tasks.run_scheduled_etl",
            "schedule": 3600.0,
        }
    },
)
