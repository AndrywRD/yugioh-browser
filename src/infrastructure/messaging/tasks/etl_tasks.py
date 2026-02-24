from __future__ import annotations

from src.infrastructure.etl import ETLPipeline
from src.infrastructure.messaging.celery_config import celery_app
from src.infrastructure.monitoring import etl_jobs_total


@celery_app.task(bind=True, max_retries=3, ignore_result=True)
def run_etl_job(
    self,
    source_type: str,
    extract_config: dict,
    destination_table: str,
    data_source_id: str | None = None,
):
    pipeline = ETLPipeline()
    try:
        result = pipeline.run(
            source_type=source_type,
            extract_config=extract_config,
            destination_table=destination_table,
            data_source_id=data_source_id,
        )
        etl_jobs_total.labels(data_source_type=source_type, status="success").inc()
        return result
    except Exception as exc:
        etl_jobs_total.labels(data_source_type=source_type, status="failed").inc()
        raise self.retry(exc=exc, countdown=2**self.request.retries)


@celery_app.task
def run_scheduled_etl():
    return {"status": "scheduled_job_placeholder"}
