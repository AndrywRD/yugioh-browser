class SendAlertUseCase:
    def __init__(self, notifier) -> None:
        self.notifier = notifier

    def execute(self, channel: str, payload: dict) -> None:
        self.notifier.send(channel, payload)
