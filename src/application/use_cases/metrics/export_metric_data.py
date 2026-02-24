import io

import pandas as pd


class ExportMetricDataUseCase:
    def execute(self, rows: list[dict], fmt: str = "csv") -> bytes:
        dataframe = pd.DataFrame(rows)
        if fmt == "excel":
            buffer = io.BytesIO()
            dataframe.to_excel(buffer, index=False)
            return buffer.getvalue()

        csv_buffer = io.StringIO()
        dataframe.to_csv(csv_buffer, index=False)
        return csv_buffer.getvalue().encode("utf-8")
