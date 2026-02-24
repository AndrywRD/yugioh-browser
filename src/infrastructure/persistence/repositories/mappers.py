from __future__ import annotations

from src.domain.entities import Alert, Dashboard, DataSource, Metric, Report, User, Widget
from src.domain.enums import AlertSeverity, DataSourceType, MetricType, UserRole, WidgetType
from src.domain.value_objects import MetricValue, Threshold
from src.infrastructure.persistence.models import (
    AlertModel,
    DashboardModel,
    DataSourceModel,
    MetricModel,
    ReportModel,
    UserModel,
    WidgetModel,
)


def model_to_dashboard(model: DashboardModel) -> Dashboard:
    return Dashboard(
        id=model.id,
        user_id=model.user_id,
        name=model.name,
        description=model.description,
        layout=model.layout or {"widgets": []},
        refresh_interval=model.refresh_interval,
        is_public=model.is_public,
        is_favorite=model.is_favorite,
    )


def dashboard_to_model(entity: Dashboard) -> DashboardModel:
    return DashboardModel(
        id=entity.id,
        user_id=entity.user_id,
        name=entity.name,
        description=entity.description,
        layout=entity.layout,
        refresh_interval=entity.refresh_interval,
        is_public=entity.is_public,
        is_favorite=entity.is_favorite,
    )


def model_to_widget(model: WidgetModel) -> Widget:
    return Widget(
        id=model.id,
        dashboard_id=model.dashboard_id,
        name=model.name,
        type=WidgetType(model.type),
        position=model.position or {},
        config=model.config or {},
        data_source_id=model.data_source_id,
        query=model.query,
        refresh_interval=model.refresh_interval,
    )


def widget_to_model(entity: Widget) -> WidgetModel:
    return WidgetModel(
        id=entity.id,
        dashboard_id=entity.dashboard_id,
        name=entity.name,
        type=entity.type.value,
        position=entity.position,
        config=entity.config,
        data_source_id=entity.data_source_id,
        query=entity.query,
        refresh_interval=entity.refresh_interval,
    )


def model_to_metric(model: MetricModel) -> Metric:
    return Metric(
        id=model.id,
        widget_id=model.widget_id,
        metric_name=model.metric_name,
        metric_value=MetricValue(model.metric_value),
        metric_type=MetricType(model.metric_type) if model.metric_type else MetricType.RAW,
        dimensions=model.dimensions,
        timestamp=model.timestamp,
    )


def metric_to_model(entity: Metric) -> MetricModel:
    return MetricModel(
        id=entity.id,
        widget_id=entity.widget_id,
        metric_name=entity.metric_name,
        metric_value=entity.value_as_float,
        metric_type=entity.metric_type.value,
        dimensions=entity.dimensions,
        timestamp=entity.timestamp,
    )


def model_to_data_source(model: DataSourceModel) -> DataSource:
    return DataSource(
        id=model.id,
        user_id=model.user_id,
        name=model.name,
        type=DataSourceType(model.type),
        description=model.description,
        config=model.config or {},
        credentials=model.credentials_encrypted,
        is_active=model.is_active,
        last_sync_at=model.last_sync_at,
        last_sync_status=model.last_sync_status,
    )


def data_source_to_model(entity: DataSource) -> DataSourceModel:
    return DataSourceModel(
        id=entity.id,
        user_id=entity.user_id,
        name=entity.name,
        type=entity.type.value,
        description=entity.description,
        config=entity.config,
        credentials_encrypted=entity.credentials,
        is_active=entity.is_active,
        last_sync_at=entity.last_sync_at,
        last_sync_status=entity.last_sync_status,
    )


def model_to_alert(model: AlertModel) -> Alert:
    condition = model.condition or {"operator": "gt", "threshold": 0}
    return Alert(
        id=model.id,
        user_id=model.user_id,
        widget_id=model.widget_id,
        name=model.name,
        threshold=Threshold(condition.get("operator", "gt"), float(condition.get("threshold", 0))),
        severity=AlertSeverity(model.severity),
        notification_channels=model.notification_channels or [],
        is_active=model.is_active,
        last_triggered_at=model.last_triggered_at,
    )


def alert_to_model(entity: Alert) -> AlertModel:
    return AlertModel(
        id=entity.id,
        user_id=entity.user_id,
        widget_id=entity.widget_id,
        name=entity.name,
        condition={"operator": entity.threshold.operator, "threshold": entity.threshold.value},
        severity=entity.severity.value,
        notification_channels=entity.notification_channels,
        is_active=entity.is_active,
        last_triggered_at=entity.last_triggered_at,
    )


def model_to_report(model: ReportModel) -> Report:
    return Report(
        id=model.id,
        user_id=model.user_id,
        dashboard_id=model.dashboard_id,
        name=model.name,
        format=model.format,
        schedule=model.schedule,
        recipients=model.recipients,
        file_path=model.file_path,
        is_active=model.is_active,
        last_generated_at=model.last_generated_at,
    )


def report_to_model(entity: Report) -> ReportModel:
    return ReportModel(
        id=entity.id,
        user_id=entity.user_id,
        dashboard_id=entity.dashboard_id,
        name=entity.name,
        format=entity.format,
        schedule=entity.schedule,
        recipients=entity.recipients,
        file_path=entity.file_path,
        is_active=entity.is_active,
        last_generated_at=entity.last_generated_at,
    )


def model_to_user(model: UserModel) -> User:
    return User(
        id=model.id,
        email=model.email,
        password_hash=model.password_hash,
        full_name=model.full_name,
        role=UserRole(model.role),
        is_active=model.is_active,
        created_at=model.created_at,
        updated_at=model.updated_at,
    )


def user_to_model(entity: User) -> UserModel:
    return UserModel(
        id=entity.id,
        email=entity.email,
        password_hash=entity.password_hash,
        full_name=entity.full_name,
        role=entity.role.value,
        is_active=entity.is_active,
    )
