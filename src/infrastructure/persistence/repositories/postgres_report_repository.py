from __future__ import annotations

from sqlalchemy import select
from sqlalchemy.orm import Session

from src.domain.entities import Report
from src.domain.repositories import ReportRepository
from src.infrastructure.persistence.models import ReportModel
from src.infrastructure.persistence.repositories.mappers import model_to_report, report_to_model


class PostgresReportRepository(ReportRepository):
    def __init__(self, session: Session) -> None:
        self.session = session

    def create(self, report: Report) -> Report:
        model = report_to_model(report)
        self.session.add(model)
        self.session.flush()
        return model_to_report(model)

    def update(self, report: Report) -> Report:
        model = self.session.get(ReportModel, report.id)
        if model is None:
            return report
        model.name = report.name
        model.format = report.format
        model.schedule = report.schedule
        model.recipients = report.recipients
        model.file_path = report.file_path
        model.is_active = report.is_active
        model.last_generated_at = report.last_generated_at
        self.session.flush()
        return model_to_report(model)

    def get_by_id(self, report_id: str) -> Report | None:
        model = self.session.get(ReportModel, report_id)
        return model_to_report(model) if model else None

    def list_by_user(self, user_id: str) -> list[Report]:
        stmt = select(ReportModel).where(ReportModel.user_id == user_id).order_by(ReportModel.created_at.desc())
        models = self.session.scalars(stmt).all()
        return [model_to_report(item) for item in models]

    def delete(self, report_id: str) -> bool:
        model = self.session.get(ReportModel, report_id)
        if model is None:
            return False
        self.session.delete(model)
        return True
