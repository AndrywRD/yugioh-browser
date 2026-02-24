from __future__ import annotations

from datetime import UTC, datetime
from pathlib import Path

from fastapi import APIRouter, Depends, HTTPException, Query, status
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session

from src.application.services import ReportService
from src.domain.entities import Report
from src.presentation.api.dependencies import TokenData, get_current_user, get_db, get_report_repository
from src.presentation.api.schemas import GenerateReportRequest, ReportResponse, ScheduleReportRequest
from src.shared.utils import generate_uuid

router = APIRouter(prefix="/reports", tags=["reports"])


@router.post("/generate", response_model=ReportResponse, status_code=status.HTTP_201_CREATED)
def generate_report(
    payload: GenerateReportRequest,
    current_user: TokenData = Depends(get_current_user),
    repo=Depends(get_report_repository),
    db: Session = Depends(get_db),
):
    report = Report(
        id=generate_uuid(),
        user_id=current_user.user_id,
        dashboard_id=payload.dashboard_id,
        name=payload.name,
        format=payload.format,
    )
    created = repo.create(report)

    service = ReportService()
    file_path = service.generate(created, payload.rows)
    created.file_path = file_path
    created.last_generated_at = datetime.now(UTC)
    updated = repo.update(created)

    db.commit()
    return ReportResponse.model_validate(updated)


@router.get("", response_model=list[ReportResponse])
def list_reports(current_user: TokenData = Depends(get_current_user), repo=Depends(get_report_repository)):
    rows = repo.list_by_user(current_user.user_id)
    return [ReportResponse.model_validate(item) for item in rows]


@router.get("/{report_id}/download")
def download_report(
    report_id: str,
    current_user: TokenData = Depends(get_current_user),
    repo=Depends(get_report_repository),
):
    report = repo.get_by_id(report_id)
    if report is None or report.user_id != current_user.user_id:
        raise HTTPException(status_code=404, detail="Report not found")
    if report.file_path is None or not Path(report.file_path).exists():
        raise HTTPException(status_code=404, detail="Report file not found")

    return FileResponse(path=report.file_path, filename=Path(report.file_path).name)


@router.post("/schedule", response_model=ReportResponse, status_code=status.HTTP_201_CREATED)
def schedule_report(
    payload: ScheduleReportRequest,
    current_user: TokenData = Depends(get_current_user),
    repo=Depends(get_report_repository),
    db: Session = Depends(get_db),
):
    report = Report(
        id=generate_uuid(),
        user_id=current_user.user_id,
        dashboard_id=payload.dashboard_id,
        name=payload.name,
        format=payload.format,
        schedule=payload.schedule,
        recipients=payload.recipients,
    )
    created = repo.create(report)
    db.commit()
    return ReportResponse.model_validate(created)


@router.get("/schedules")
def list_schedules(
    active_only: bool = Query(default=True),
    current_user: TokenData = Depends(get_current_user),
    repo=Depends(get_report_repository),
):
    rows = repo.list_by_user(current_user.user_id)
    if active_only:
        rows = [item for item in rows if item.is_active]
    return [
        {
            "id": item.id,
            "name": item.name,
            "format": item.format,
            "schedule": item.schedule,
            "recipients": item.recipients,
            "is_active": item.is_active,
        }
        for item in rows
    ]
