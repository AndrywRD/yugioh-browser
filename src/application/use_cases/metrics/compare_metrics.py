from src.application.services import MetricCalculationService


class CompareMetricsUseCase:
    def __init__(self, service: MetricCalculationService) -> None:
        self.service = service

    def execute(self, left: float, right: float) -> dict:
        return self.service.compare(left, right)
