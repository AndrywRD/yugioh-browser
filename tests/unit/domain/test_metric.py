from datetime import datetime
from decimal import Decimal

import pytest

from src.domain.entities.metric import Metric
from src.domain.enums import MetricType
from src.domain.exceptions import InvalidMetricError
from src.domain.value_objects.metric_value import MetricValue


class TestMetric:
    def test_create_metric_with_valid_data(self):
        metric = Metric(
            id="m1",
            widget_id=None,
            metric_name="revenue",
            metric_value=MetricValue(Decimal("1000.50")),
            metric_type=MetricType.SUM,
            timestamp=datetime.utcnow(),
        )

        assert metric.metric_name == "revenue"
        assert metric.metric_value.value == Decimal("1000.50")

    def test_create_metric_with_negative_value(self):
        metric = Metric(
            id="m2",
            widget_id=None,
            metric_name="profit",
            metric_value=MetricValue(Decimal("-100.00")),
            metric_type=MetricType.SUM,
            timestamp=datetime.utcnow(),
        )

        assert metric.metric_value.value == Decimal("-100.00")

    def test_create_metric_with_nan_should_fail(self):
        with pytest.raises(InvalidMetricError):
            Metric(
                id="m3",
                widget_id=None,
                metric_name="revenue",
                metric_value=MetricValue(float("nan")),
                metric_type=MetricType.SUM,
                timestamp=datetime.utcnow(),
            )

    @pytest.mark.parametrize(
        "name,expected_valid",
        [
            ("revenue", True),
            ("total_sales", True),
            ("mrr", True),
            ("", False),
            ("invalid name with spaces!", False),
        ],
    )
    def test_metric_name_validation(self, name, expected_valid):
        if expected_valid:
            metric = Metric(
                id="m4",
                widget_id=None,
                metric_name=name,
                metric_value=MetricValue(100),
                metric_type=MetricType.SUM,
                timestamp=datetime.utcnow(),
            )
            assert metric.metric_name == name
        else:
            with pytest.raises(InvalidMetricError):
                Metric(
                    id="m4",
                    widget_id=None,
                    metric_name=name,
                    metric_value=MetricValue(100),
                    metric_type=MetricType.SUM,
                    timestamp=datetime.utcnow(),
                )
