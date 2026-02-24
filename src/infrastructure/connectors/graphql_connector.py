from __future__ import annotations

import requests

from src.infrastructure.connectors.base_connector import BaseConnector


class GraphQLConnector(BaseConnector):
    def __init__(self, timeout: int = 30) -> None:
        self.timeout = timeout

    def test_connection(self, config: dict) -> bool:
        endpoint = config.get("endpoint")
        if not endpoint:
            return False
        query = "query { __typename }"
        try:
            response = requests.post(endpoint, json={"query": query}, timeout=self.timeout)
            return response.status_code < 500
        except Exception:
            return False

    def fetch(self, config: dict):
        endpoint = config["endpoint"]
        query = config["query"]
        variables = config.get("variables", {})
        headers = config.get("headers", {})

        response = requests.post(
            endpoint,
            json={"query": query, "variables": variables},
            headers=headers,
            timeout=self.timeout,
        )
        response.raise_for_status()
        body = response.json()
        if "errors" in body:
            raise ValueError(body["errors"])
        return body.get("data", {})
