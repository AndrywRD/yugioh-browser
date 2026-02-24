from datetime import datetime

from sqlalchemy import JSON, Boolean, DateTime, ForeignKey, Integer, String
from sqlalchemy.orm import Mapped, mapped_column

from src.infrastructure.persistence.database import Base


class DataQualityCheckModel(Base):
    __tablename__ = "data_quality_checks"

    id: Mapped[str] = mapped_column(String(36), primary_key=True)
    data_source_id: Mapped[str] = mapped_column(String(36), ForeignKey("data_sources.id", ondelete="CASCADE"), index=True)
    check_type: Mapped[str] = mapped_column(String(50), nullable=False)
    column_name: Mapped[str | None] = mapped_column(String(255), nullable=True)
    expectation: Mapped[dict] = mapped_column(JSON, default=dict)
    last_run_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    last_status: Mapped[str | None] = mapped_column(String(50), nullable=True, index=True)
    failure_count: Mapped[int] = mapped_column(Integer, default=0)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
