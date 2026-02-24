from __future__ import annotations

from pydantic import BaseModel, ConfigDict, Field


class GenerateReportRequest(BaseModel):
    dashboard_id: str | None = None
    name: str = Field(..., min_length=1, max_length=255)
    format: str = Field(..., pattern=r"^(pdf|excel|csv)$")
    rows: list[dict] = Field(default_factory=list)


class ScheduleReportRequest(BaseModel):
    dashboard_id: str | None = None
    name: str = Field(..., min_length=1, max_length=255)
    format: str = Field(..., pattern=r"^(pdf|excel|csv)$")
    schedule: dict
    recipients: list[str] = Field(default_factory=list)


class ReportResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    user_id: str
    dashboard_id: str | None
    name: str
    format: str
    schedule: dict | None
    recipients: list[str] | None
    file_path: str | None
    is_active: bool
