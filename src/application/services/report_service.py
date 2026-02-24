from __future__ import annotations

from datetime import UTC, datetime
from pathlib import Path

import pandas as pd

from src.domain.entities import Report


class ReportService:
    def __init__(self, output_dir: str = "generated_reports") -> None:
        self.output_dir = Path(output_dir)
        self.output_dir.mkdir(parents=True, exist_ok=True)

    def generate(self, report: Report, rows: list[dict]) -> str:
        timestamp = datetime.now(UTC).strftime("%Y%m%d%H%M%S")
        extension = report.format.lower()
        if extension not in {"pdf", "excel", "csv"}:
            extension = "csv"

        filename = f"{report.id}_{timestamp}.{ 'xlsx' if extension == 'excel' else extension }"
        output_path = self.output_dir / filename

        dataframe = pd.DataFrame(rows)

        if extension == "excel":
            dataframe.to_excel(output_path, index=False)
        elif extension == "pdf":
            # Fallback for lightweight implementation: save tabular text as .pdf extension.
            output_path.write_text(dataframe.to_string(index=False), encoding="utf-8")
        else:
            dataframe.to_csv(output_path, index=False)

        return str(output_path)
