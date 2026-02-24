from datetime import datetime

from sqlalchemy import JSON, DateTime, ForeignKey, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from src.infrastructure.persistence.database import Base


class WidgetModel(Base):
    __tablename__ = "widgets"

    id: Mapped[str] = mapped_column(String(36), primary_key=True)
    dashboard_id: Mapped[str] = mapped_column(String(36), ForeignKey("dashboards.id", ondelete="CASCADE"), index=True)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    type: Mapped[str] = mapped_column(String(50), nullable=False)
    position: Mapped[dict] = mapped_column(JSON, default=dict)
    config: Mapped[dict] = mapped_column(JSON, default=dict)
    data_source_id: Mapped[str | None] = mapped_column(String(36), ForeignKey("data_sources.id", ondelete="SET NULL"), nullable=True, index=True)
    query: Mapped[str | None] = mapped_column(Text, nullable=True)
    refresh_interval: Mapped[int | None] = mapped_column(Integer, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    dashboard = relationship("DashboardModel", back_populates="widgets")
    data_source = relationship("DataSourceModel", back_populates="widgets")
    metrics = relationship("MetricModel", back_populates="widget", cascade="all,delete-orphan")
