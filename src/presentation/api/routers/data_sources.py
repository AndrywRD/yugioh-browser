from __future__ import annotations

from datetime import UTC, datetime
from pathlib import Path
import shutil

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile, status
from sqlalchemy.orm import Session

from src.domain.entities import DataSource
from src.domain.enums import DataSourceType
from src.infrastructure.etl import ETLPipeline
from src.infrastructure.messaging.tasks import run_etl_job
from src.presentation.api.dependencies import TokenData, get_current_user, get_data_source_repository, get_db
from src.presentation.api.schemas import DataSourceCreateRequest, DataSourceResponse, DataSourceUpdateRequest
from src.shared.utils import generate_uuid

router = APIRouter(prefix="/data-sources", tags=["data-sources"])
UPLOAD_ROOT = Path("storage") / "data_sources"


def _validate_config_for_type(data_source_type: DataSourceType, config: dict) -> None:
    if not isinstance(config, dict):
        raise HTTPException(status_code=400, detail="Data source config must be a JSON object")

    if data_source_type == DataSourceType.CSV:
        filepath = config.get("filepath")
        if not filepath:
            raise HTTPException(
                status_code=400,
                detail="CSV data source requires config.filepath",
            )
        if not Path(str(filepath)).exists():
            raise HTTPException(
                status_code=400,
                detail=f"CSV file not found: {filepath}",
            )
        return

    if data_source_type == DataSourceType.API:
        endpoint = config.get("endpoint")
        if not endpoint:
            raise HTTPException(
                status_code=400,
                detail="API data source requires config.endpoint",
            )
        return

    if data_source_type == DataSourceType.DATABASE:
        if not config.get("connection_string") or not config.get("query"):
            raise HTTPException(
                status_code=400,
                detail="Database data source requires config.connection_string and config.query",
            )
        return

    if data_source_type == DataSourceType.GOOGLE_SHEETS:
        # Current implementation supports direct rows payload.
        rows = config.get("rows")
        if rows is None:
            raise HTTPException(
                status_code=400,
                detail="Google Sheets source requires config.rows in this implementation",
            )
        if not isinstance(rows, list):
            raise HTTPException(status_code=400, detail="config.rows must be a list")
        return

    raise HTTPException(
        status_code=400,
        detail=f"Data source type '{data_source_type.value}' is not supported by ETL pipeline",
    )


def _build_csv_storage_path(user_id: str, original_filename: str | None) -> Path:
    user_dir = UPLOAD_ROOT / user_id
    user_dir.mkdir(parents=True, exist_ok=True)

    sanitized_name = (original_filename or "data.csv").replace("\\", "_").replace("/", "_")
    if not sanitized_name.lower().endswith(".csv"):
        sanitized_name = f"{sanitized_name}.csv"

    final_name = f"{generate_uuid()}_{sanitized_name}"
    return user_dir / final_name


@router.post("", response_model=DataSourceResponse, status_code=status.HTTP_201_CREATED)
def create_data_source(
    payload: DataSourceCreateRequest,
    current_user: TokenData = Depends(get_current_user),
    repo=Depends(get_data_source_repository),
    db: Session = Depends(get_db),
):
    data_source = DataSource(
        id=generate_uuid(),
        user_id=current_user.user_id,
        name=payload.name,
        type=payload.type,
        description=payload.description,
        config=payload.config,
        credentials=payload.credentials,
    )
    created = repo.create(data_source)
    db.commit()
    return DataSourceResponse.model_validate(created)


@router.post("/upload-csv", response_model=DataSourceResponse, status_code=status.HTTP_201_CREATED)
def upload_csv_data_source(
    name: str = Form(...),
    description: str | None = Form(default=None),
    file: UploadFile = File(...),
    current_user: TokenData = Depends(get_current_user),
    repo=Depends(get_data_source_repository),
    db: Session = Depends(get_db),
):
    if not file.filename:
        raise HTTPException(status_code=400, detail="CSV file is required")

    if not file.filename.lower().endswith(".csv"):
        raise HTTPException(status_code=400, detail="Only .csv files are supported")

    target_path = _build_csv_storage_path(current_user.user_id, file.filename)
    with target_path.open("wb") as buffer:
        shutil.copyfileobj(file.file, buffer)

    data_source = DataSource(
        id=generate_uuid(),
        user_id=current_user.user_id,
        name=name,
        type=DataSourceType.CSV,
        description=description,
        config={"filepath": str(target_path.resolve())},
        credentials=None,
    )
    created = repo.create(data_source)
    db.commit()
    return DataSourceResponse.model_validate(created)


@router.get("", response_model=list[DataSourceResponse])
def list_data_sources(current_user: TokenData = Depends(get_current_user), repo=Depends(get_data_source_repository)):
    rows = repo.list_by_user(current_user.user_id)
    return [DataSourceResponse.model_validate(item) for item in rows]


@router.put("/{data_source_id}", response_model=DataSourceResponse)
def update_data_source(
    data_source_id: str,
    payload: DataSourceUpdateRequest,
    current_user: TokenData = Depends(get_current_user),
    repo=Depends(get_data_source_repository),
    db: Session = Depends(get_db),
):
    data_source = repo.get_by_id(data_source_id)
    if data_source is None or data_source.user_id != current_user.user_id:
        raise HTTPException(status_code=404, detail="Data source not found")

    updates = payload.model_dump(exclude_unset=True)
    for key, value in updates.items():
        setattr(data_source, key, value)

    updated = repo.update(data_source)
    db.commit()
    return DataSourceResponse.model_validate(updated)


@router.delete("/{data_source_id}")
def delete_data_source(
    data_source_id: str,
    current_user: TokenData = Depends(get_current_user),
    repo=Depends(get_data_source_repository),
    db: Session = Depends(get_db),
):
    data_source = repo.get_by_id(data_source_id)
    if data_source is None or data_source.user_id != current_user.user_id:
        raise HTTPException(status_code=404, detail="Data source not found")
    repo.delete(data_source_id)
    db.commit()
    return {"message": "Data source deleted successfully"}


@router.post("/{data_source_id}/test")
def test_data_source(
    data_source_id: str,
    current_user: TokenData = Depends(get_current_user),
    repo=Depends(get_data_source_repository),
):
    data_source = repo.get_by_id(data_source_id)
    if data_source is None or data_source.user_id != current_user.user_id:
        raise HTTPException(status_code=404, detail="Data source not found")

    _validate_config_for_type(data_source.type, data_source.config)

    source_type = data_source.type.value
    pipeline = ETLPipeline()
    supported = source_type in pipeline.EXTRACTORS
    return {"data_source_id": data_source_id, "supported": supported, "status": "ok" if supported else "unsupported"}


@router.post("/{data_source_id}/sync", status_code=status.HTTP_202_ACCEPTED)
def sync_data_source(
    data_source_id: str,
    current_user: TokenData = Depends(get_current_user),
    repo=Depends(get_data_source_repository),
    db: Session = Depends(get_db),
):
    data_source = repo.get_by_id(data_source_id)
    if data_source is None or data_source.user_id != current_user.user_id:
        raise HTTPException(status_code=404, detail="Data source not found")

    _validate_config_for_type(data_source.type, data_source.config)

    destination_table = f"data_source_{data_source_id.replace('-', '_')}"
    sync_status = "pending"
    sync_message = "Sync queued"

    try:
        run_etl_job.apply_async(
            args=[data_source.type.value, data_source.config, destination_table, data_source.id],
            ignore_result=True,
        )
    except Exception:
        # Fallback for environments without Celery/Redis broker.
        try:
            ETLPipeline().run(
                data_source.type.value,
                data_source.config,
                destination_table,
                data_source_id=data_source.id,
            )
            sync_status = "success"
            sync_message = "Sync completed locally (queue unavailable)"
        except (KeyError, ValueError, FileNotFoundError) as exc:
            raise HTTPException(status_code=400, detail=f"Invalid data source config: {exc}") from exc

    data_source.last_sync_at = datetime.now(UTC)
    data_source.last_sync_status = sync_status
    repo.update(data_source)
    db.commit()

    return {"message": sync_message, "data_source_id": data_source_id, "destination_table": destination_table}
