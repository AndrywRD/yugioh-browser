import pytest
from sqlalchemy import text

from src.infrastructure.etl.extractors.csv_extractor import CSVExtractor
from src.infrastructure.etl.loaders.warehouse_loader import WarehouseLoader
from src.infrastructure.etl.transformers.cleaner import DataCleaner


@pytest.fixture
def sample_csv_file(tmp_path):
    csv_content = """date,revenue,customers
2024-01-01,1000,50
2024-01-02,1500,75
2024-01-03,,60
2024-01-04,2000,80"""

    file_path = tmp_path / "test_data.csv"
    file_path.write_text(csv_content)
    return str(file_path)


class TestETLPipeline:
    def test_full_etl_pipeline(self, sample_csv_file, db_session):
        extractor = CSVExtractor()
        raw_data = extractor.extract({"filepath": sample_csv_file})

        assert len(raw_data) == 4
        assert "revenue" in raw_data.columns

        cleaner = DataCleaner()
        cleaned_data = cleaner.clean(raw_data)

        assert cleaned_data["revenue"].isna().sum() == 0

        loader = WarehouseLoader()
        rows_loaded = loader.load(cleaned_data, "test_metrics")

        assert rows_loaded == 4

        result = db_session.execute(text("SELECT COUNT(*) FROM test_metrics"))
        count = result.scalar()
        assert count == 4
