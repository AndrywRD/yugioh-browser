from __future__ import annotations

from src.infrastructure.monitoring.logger import get_logger

logger = get_logger()


class EmailNotifier:
    def send(self, payload: dict) -> None:
        logger.info("email_notification_sent", payload=payload)
