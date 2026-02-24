from enum import Enum


class WidgetType(str, Enum):
    LINE_CHART = "line_chart"
    BAR_CHART = "bar_chart"
    PIE_CHART = "pie_chart"
    NUMBER = "number"
    TABLE = "table"
    AREA_CHART = "area_chart"
