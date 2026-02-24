from __future__ import annotations

from pydantic import BaseModel, ConfigDict, Field

from src.domain.enums import DataSourceType


class DataSourceCreateRequest(BaseModel):
    name: str = Field(..., min_length=1, max_length=255)
    type: DataSourceType
    description: str | None = None
    config: dict = Field(default_factory=dict)
    credentials: dict | None = None


class DataSourceUpdateRequest(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=255)
    description: str | None = None
    config: dict | None = None
    credentials: dict | None = None
    is_active: bool | None = None


class DataSourceResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    user_id: str
    name: str
    type: DataSourceType
    description: str | None
    config: dict
    is_active: bool
    last_sync_status: str | None
