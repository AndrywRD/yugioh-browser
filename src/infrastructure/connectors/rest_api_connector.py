from __future__ import annotations

import time

import requests

from src.infrastructure.connectors.base_connector import BaseConnector


class RestAPIConnector(BaseConnector):
    def __init__(self, timeout: int = 30, max_retries: int = 3) -> None:
        self.timeout = timeout
        self.max_retries = max_retries

    def test_connection(self, config: dict) -> bool:
        endpoint = config.get("endpoint")
        if not endpoint:
            return False
        try:
            response = requests.get(endpoint, timeout=self.timeout)
            return response.status_code < 500
        except Exception:
            return False

    def fetch(self, config: dict):
        endpoint = config["endpoint"]
        params = config.get("params", {})
        headers = config.get("headers", {})

        attempt = 0
        while attempt < self.max_retries:
            try:
                response = requests.get(endpoint, params=params, headers=headers, timeout=self.timeout)
                response.raise_for_status()
                return response.json()
            except Exception:
                attempt += 1
                if attempt >= self.max_retries:
                    raise
                time.sleep(0.5 * attempt)
