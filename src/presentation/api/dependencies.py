from __future__ import annotations

from dataclasses import dataclass

from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session

from src.domain.entities import Dashboard
from src.domain.enums import UserRole
from src.infrastructure.persistence.database import get_db_session
from src.infrastructure.persistence.repositories import (
    AlertHistoryRepository,
    PostgresAlertRepository,
    PostgresDashboardRepository,
    PostgresDataSourceRepository,
    PostgresReportRepository,
    PostgresUserRepository,
    PostgresWidgetRepository,
    TimescaleMetricRepository,
)
from src.infrastructure.security import decode_access_token


oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/v1/auth/login")


@dataclass(slots=True)
class TokenData:
    user_id: str
    email: str
    role: UserRole


def get_db() -> Session:
    yield from get_db_session()


def get_dashboard_repository(db: Session = Depends(get_db)) -> PostgresDashboardRepository:
    return PostgresDashboardRepository(db)


def get_metric_repository(db: Session = Depends(get_db)) -> TimescaleMetricRepository:
    return TimescaleMetricRepository(db)


def get_widget_repository(db: Session = Depends(get_db)) -> PostgresWidgetRepository:
    return PostgresWidgetRepository(db)


def get_data_source_repository(db: Session = Depends(get_db)) -> PostgresDataSourceRepository:
    return PostgresDataSourceRepository(db)


def get_alert_repository(db: Session = Depends(get_db)) -> PostgresAlertRepository:
    return PostgresAlertRepository(db)


def get_alert_history_repository(db: Session = Depends(get_db)) -> AlertHistoryRepository:
    return AlertHistoryRepository(db)


def get_report_repository(db: Session = Depends(get_db)) -> PostgresReportRepository:
    return PostgresReportRepository(db)


def get_user_repository(db: Session = Depends(get_db)) -> PostgresUserRepository:
    return PostgresUserRepository(db)


def get_current_user(
    token: str = Depends(oauth2_scheme),
    user_repo: PostgresUserRepository = Depends(get_user_repository),
) -> TokenData:
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )

    try:
        payload = decode_access_token(token)
        user_id = str(payload.get("sub"))
        email = str(payload.get("email"))
        role = UserRole(str(payload.get("role", UserRole.VIEWER.value)))
    except Exception as exc:
        raise credentials_exception from exc

    user = user_repo.get_by_id(user_id)
    if user is None or not user.is_active:
        raise credentials_exception

    return TokenData(user_id=user_id, email=email, role=role)


def require_role(required_role: UserRole):
    def role_checker(current_user: TokenData = Depends(get_current_user)) -> TokenData:
        hierarchy = {UserRole.VIEWER: 0, UserRole.EDITOR: 1, UserRole.ADMIN: 2}
        if hierarchy[current_user.role] < hierarchy[required_role]:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Insufficient role")
        return current_user

    return role_checker


class PermissionService:
    @staticmethod
    def can_view_dashboard(user: TokenData, dashboard: Dashboard) -> bool:
        if user.role == UserRole.ADMIN:
            return True
        if dashboard.is_public:
            return True
        if dashboard.user_id == user.user_id:
            return True
        return False

    @staticmethod
    def can_edit_dashboard(user: TokenData, dashboard: Dashboard) -> bool:
        if user.role == UserRole.ADMIN:
            return True
        if user.role == UserRole.VIEWER:
            return False
        if dashboard.user_id == user.user_id:
            return True
        return False

    @staticmethod
    def can_delete_dashboard(user: TokenData, dashboard: Dashboard) -> bool:
        return user.role == UserRole.ADMIN or dashboard.user_id == user.user_id
