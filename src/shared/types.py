from datetime import datetime
from typing import Any, Dict, List, TypedDict


class WidgetPosition(TypedDict):
    x: int
    y: int
    width: int
    height: int


class TimeSeriesPoint(TypedDict):
    timestamp: datetime
    value: float


JSONDict = Dict[str, Any]
JSONList = List[Dict[str, Any]]
