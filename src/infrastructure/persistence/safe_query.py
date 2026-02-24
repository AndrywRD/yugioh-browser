from __future__ import annotations

import re

import pandas as pd
from sqlalchemy import text

IDENTIFIER_PATTERN = re.compile(r"^[a-zA-Z_][a-zA-Z0-9_]*$")


class SafeQueryExecutor:
    @staticmethod
    def execute_safe_query(connection, base_query: str, params: dict) -> pd.DataFrame:
        result = connection.execute(text(base_query), params)
        return pd.DataFrame(result.fetchall(), columns=result.keys())

    @staticmethod
    def validate_identifier(identifier: str) -> str:
        if not IDENTIFIER_PATTERN.match(identifier):
            raise ValueError(f"Invalid identifier: {identifier}")
        return identifier
