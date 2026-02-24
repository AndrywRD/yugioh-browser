class AcknowledgeAlertUseCase:
    def __init__(self, history_repository) -> None:
        self.history_repository = history_repository

    def execute(self, alert_history_id: str, user_id: str) -> bool:
        return self.history_repository.acknowledge(alert_history_id, user_id)
