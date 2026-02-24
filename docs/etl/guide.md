# ETL Guide

## Supported Source Types
- `api`
- `database`
- `csv`
- `google_sheets` (placeholder mode)

## Pipeline Steps
1. Extract using source-specific extractor
2. Clean nulls/duplicates
3. Enrich computed columns
4. Aggregate (optional)
5. Load to SQL warehouse table
6. Cache latest transformed rows

## Trigger Methods
- API: `POST /api/v1/data-sources/{id}/sync`
- Celery task: `run_etl_job`
- CLI script: `scripts/run_etl.sh`
