from __future__ import annotations

from pydantic import BaseModel, ConfigDict, Field

from src.domain.enums import AlertSeverity


class AlertCondition(BaseModel):
    operator: str = Field(..., pattern=r"^(gt|gte|lt|lte|eq)$")
    threshold: float


class AlertCreateRequest(BaseModel):
    widget_id: str | None = None
    name: str = Field(..., min_length=1, max_length=255)
    condition: AlertCondition
    severity: AlertSeverity
    notification_channels: list[str] = Field(default_factory=list)


class AlertUpdateRequest(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=255)
    condition: AlertCondition | None = None
    severity: AlertSeverity | None = None
    notification_channels: list[str] | None = None
    is_active: bool | None = None


class AlertResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    user_id: str
    widget_id: str | None
    name: str
    severity: AlertSeverity
    is_active: bool
