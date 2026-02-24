from src.application.services import MetricCalculationService


class GetMetricTrendUseCase:
    def __init__(self, service: MetricCalculationService) -> None:
        self.service = service

    def execute(self, values: list[float], window: int = 3) -> dict:
        return {
            "sma": self.service.moving_average(values, window),
            "ema": self.service.exponential_moving_average(values),
        }
