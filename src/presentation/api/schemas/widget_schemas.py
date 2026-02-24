from __future__ import annotations

import re

from pydantic import BaseModel, ConfigDict, Field, field_validator

from src.domain.enums import WidgetType

SQL_DANGEROUS_KEYWORDS = {
    "DROP",
    "DELETE",
    "INSERT",
    "UPDATE",
    "ALTER",
    "CREATE",
    "TRUNCATE",
    "EXEC",
    "EXECUTE",
    "GRANT",
    "REVOKE",
}


class WidgetCreateRequest(BaseModel):
    dashboard_id: str | None = None
    name: str = Field(..., min_length=1, max_length=255)
    type: WidgetType
    position: dict
    config: dict
    data_source_id: str | None = None
    query: str | None = Field(default=None, max_length=10000)
    refresh_interval: int | None = Field(default=None, ge=60, le=86400)

    @field_validator("position")
    @classmethod
    def validate_position(cls, value: dict) -> dict:
        required = {"x", "y", "width", "height"}
        if not required.issubset(value.keys()):
            raise ValueError("Position must include x, y, width and height")
        return value

    @field_validator("query")
    @classmethod
    def validate_query(cls, value: str | None) -> str | None:
        if value is None:
            return value
        query_upper = value.upper()
        if any(keyword in query_upper for keyword in SQL_DANGEROUS_KEYWORDS):
            raise ValueError("Only safe SELECT queries are allowed")
        if not query_upper.strip().startswith("SELECT"):
            raise ValueError("Only SELECT queries are allowed")
        if "--" in value or "/*" in value or "*/" in value:
            raise ValueError("SQL comments are not allowed")
        return value.strip()


class WidgetUpdateRequest(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=255)
    position: dict | None = None
    config: dict | None = None
    query: str | None = Field(default=None, max_length=10000)
    refresh_interval: int | None = Field(default=None, ge=60, le=86400)


class WidgetResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    dashboard_id: str
    name: str
    type: WidgetType
    position: dict
    config: dict
    data_source_id: str | None
    query: str | None
    refresh_interval: int | None
