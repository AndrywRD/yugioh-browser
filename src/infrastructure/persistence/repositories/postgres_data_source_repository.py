from __future__ import annotations

from sqlalchemy import select
from sqlalchemy.orm import Session

from src.domain.entities import DataSource
from src.domain.repositories import DataSourceRepository
from src.infrastructure.persistence.models import DataSourceModel
from src.infrastructure.persistence.repositories.mappers import data_source_to_model, model_to_data_source


class PostgresDataSourceRepository(DataSourceRepository):
    def __init__(self, session: Session) -> None:
        self.session = session

    def create(self, data_source: DataSource) -> DataSource:
        model = data_source_to_model(data_source)
        self.session.add(model)
        self.session.flush()
        return model_to_data_source(model)

    def update(self, data_source: DataSource) -> DataSource:
        model = self.session.get(DataSourceModel, data_source.id)
        if model is None:
            return data_source
        model.name = data_source.name
        model.type = data_source.type.value
        model.description = data_source.description
        model.config = data_source.config
        model.credentials_encrypted = data_source.credentials
        model.is_active = data_source.is_active
        model.last_sync_at = data_source.last_sync_at
        model.last_sync_status = data_source.last_sync_status
        self.session.flush()
        return model_to_data_source(model)

    def get_by_id(self, data_source_id: str) -> DataSource | None:
        model = self.session.get(DataSourceModel, data_source_id)
        return model_to_data_source(model) if model else None

    def list_by_user(self, user_id: str) -> list[DataSource]:
        stmt = select(DataSourceModel).where(DataSourceModel.user_id == user_id).order_by(DataSourceModel.created_at.desc())
        models = self.session.scalars(stmt).all()
        return [model_to_data_source(item) for item in models]

    def delete(self, data_source_id: str) -> bool:
        model = self.session.get(DataSourceModel, data_source_id)
        if model is None:
            return False
        self.session.delete(model)
        return True
