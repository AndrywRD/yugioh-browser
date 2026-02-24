from pathlib import Path
import sys
from datetime import UTC, datetime, timedelta

PROJECT_ROOT = Path(__file__).resolve().parents[1]
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

from src.domain.entities import Dashboard, DataSource, Metric, Widget
from src.domain.enums import DataSourceType, MetricType, WidgetType
from src.domain.value_objects import MetricValue
from src.infrastructure.persistence import db_session_scope, init_db
from src.infrastructure.persistence.repositories import (
    PostgresDashboardRepository,
    PostgresDataSourceRepository,
    PostgresUserRepository,
    PostgresWidgetRepository,
    TimescaleMetricRepository,
)
from src.shared.config import get_settings
from src.shared.utils import generate_uuid


def create_sample_data() -> None:
    settings = get_settings()
    with db_session_scope() as session:
        user_repo = PostgresUserRepository(session)
        dashboard_repo = PostgresDashboardRepository(session)
        data_source_repo = PostgresDataSourceRepository(session)
        widget_repo = PostgresWidgetRepository(session)
        metric_repo = TimescaleMetricRepository(session)

        user = user_repo.get_by_email(settings.admin_email)
        if user is None:
            raise RuntimeError("Admin user not found. Run scripts/seed_db.py first.")

        data_source = DataSource(
            id=generate_uuid(),
            user_id=user.id,
            name="Sample CSV Source",
            type=DataSourceType.CSV,
            description="Sample data source for demo",
            config={"filepath": "data/sample_sales.csv"},
            credentials=None,
        )
        data_source_repo.create(data_source)

        dashboard = Dashboard(
            id=generate_uuid(),
            user_id=user.id,
            name="Sales Overview",
            description="Main sales KPI dashboard",
            layout={"widgets": []},
            refresh_interval=300,
        )
        dashboard_repo.create(dashboard)

        widget = Widget(
            id=generate_uuid(),
            dashboard_id=dashboard.id,
            name="Total Revenue",
            type=WidgetType.NUMBER,
            position={"x": 0, "y": 0, "width": 4, "height": 2},
            config={"metric": "revenue", "aggregation": "sum"},
            data_source_id=data_source.id,
            query="SELECT SUM(revenue) AS revenue FROM sales",
        )
        widget_repo.create(widget)

        now = datetime.now(UTC)
        for index, value in enumerate([1200, 1450, 1630, 1710, 2100]):
            metric_repo.create(
                Metric(
                    id=generate_uuid(),
                    widget_id=widget.id,
                    metric_name="revenue",
                    metric_value=MetricValue(value),
                    metric_type=MetricType.SUM,
                    timestamp=now - timedelta(days=(4 - index)),
                )
            )


if __name__ == "__main__":
    init_db()
    create_sample_data()
    print("Sample data created successfully.")
