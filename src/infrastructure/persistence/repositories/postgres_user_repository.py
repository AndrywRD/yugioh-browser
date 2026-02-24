from __future__ import annotations

from sqlalchemy import select
from sqlalchemy.orm import Session

from src.domain.entities import User
from src.domain.repositories import UserRepository
from src.infrastructure.persistence.models import UserModel
from src.infrastructure.persistence.repositories.mappers import model_to_user, user_to_model


class PostgresUserRepository(UserRepository):
    def __init__(self, session: Session) -> None:
        self.session = session

    def create(self, user: User) -> User:
        model = user_to_model(user)
        self.session.add(model)
        self.session.flush()
        return model_to_user(model)

    def get_by_id(self, user_id: str) -> User | None:
        model = self.session.get(UserModel, user_id)
        return model_to_user(model) if model else None

    def get_by_email(self, email: str) -> User | None:
        stmt = select(UserModel).where(UserModel.email == email)
        model = self.session.scalars(stmt).first()
        return model_to_user(model) if model else None

    def list_all(self) -> list[User]:
        stmt = select(UserModel).order_by(UserModel.created_at.desc())
        models = self.session.scalars(stmt).all()
        return [model_to_user(item) for item in models]
