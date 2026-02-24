from src.application.services import AlertService


class EvaluateAlertsUseCase:
    def __init__(self, alert_service: AlertService) -> None:
        self.alert_service = alert_service

    def execute(self, metric_values: dict[str, float]) -> list[dict]:
        return self.alert_service.evaluate_all(metric_values)
