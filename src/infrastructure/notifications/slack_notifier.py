from __future__ import annotations

import requests

from src.infrastructure.monitoring.logger import get_logger

logger = get_logger()


class SlackNotifier:
    def send(self, webhook_url: str, payload: dict) -> None:
        try:
            requests.post(webhook_url, json=payload, timeout=10)
        except Exception:
            logger.warning("slack_notification_failed", webhook_url=webhook_url)
