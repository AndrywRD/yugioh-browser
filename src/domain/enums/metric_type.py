from enum import Enum


class MetricType(str, Enum):
    RAW = "raw"
    SUM = "sum"
    AVG = "avg"
    COUNT = "count"
    MIN = "min"
    MAX = "max"
    PERCENTILE = "percentile"
    GROWTH_RATE = "growth_rate"
    RATIO = "ratio"
