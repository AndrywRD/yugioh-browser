from __future__ import annotations

import re

from pydantic import BaseModel, ConfigDict, Field, field_validator

from src.shared.utils import sanitize_text

NAME_PATTERN = re.compile(r"^[a-zA-Z0-9\s\-_]+$")


class DashboardCreateRequest(BaseModel):
    name: str = Field(..., min_length=1, max_length=255)
    description: str | None = Field(default=None, max_length=5000)
    layout: dict = Field(default_factory=lambda: {"widgets": []})
    refresh_interval: int = Field(default=300, ge=60, le=86400)
    is_public: bool = False

    @field_validator("name")
    @classmethod
    def validate_name(cls, value: str) -> str:
        if not NAME_PATTERN.match(value):
            raise ValueError("Dashboard name contains invalid characters")
        return value.strip()

    @field_validator("description")
    @classmethod
    def sanitize_description(cls, value: str | None) -> str | None:
        if value is None:
            return value
        return sanitize_text(value)

    @field_validator("layout")
    @classmethod
    def validate_layout(cls, value: dict) -> dict:
        if "widgets" not in value or not isinstance(value["widgets"], list):
            raise ValueError("Layout must contain widgets list")
        return value


class DashboardUpdateRequest(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=255)
    description: str | None = Field(default=None, max_length=5000)
    layout: dict | None = None
    refresh_interval: int | None = Field(default=None, ge=60, le=86400)
    is_public: bool | None = None
    is_favorite: bool | None = None


class DashboardResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    user_id: str
    name: str
    description: str | None
    layout: dict
    refresh_interval: int
    is_public: bool
    is_favorite: bool


class DashboardDataResponse(BaseModel):
    id: str
    name: str
    description: str | None
    refresh_interval: int
    widgets: list[dict]
