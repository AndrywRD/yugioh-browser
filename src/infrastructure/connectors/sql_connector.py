from __future__ import annotations

from sqlalchemy import create_engine, text

from src.infrastructure.connectors.base_connector import BaseConnector


class SQLConnector(BaseConnector):
    def test_connection(self, config: dict) -> bool:
        try:
            engine = create_engine(config["connection_string"])
            with engine.connect() as conn:
                conn.execute(text("SELECT 1"))
            return True
        except Exception:
            return False

    def fetch(self, config: dict):
        engine = create_engine(config["connection_string"])
        query = config["query"]
        params = config.get("params", {})
        with engine.connect() as conn:
            result = conn.execute(text(query), params)
            return [dict(row._mapping) for row in result]
