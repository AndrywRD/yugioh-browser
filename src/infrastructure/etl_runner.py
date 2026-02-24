from __future__ import annotations

import argparse

from src.infrastructure.etl import ETLPipeline


def main() -> None:
    parser = argparse.ArgumentParser(description="Run ETL pipeline")
    parser.add_argument("source_type", help="api|database|csv|google_sheets")
    parser.add_argument("destination_table", help="destination table name")
    parser.add_argument("--config", default="{}", help="JSON config")
    args = parser.parse_args()

    config = __import__("json").loads(args.config)
    result = ETLPipeline().run(args.source_type, config, args.destination_table)
    print(result)


if __name__ == "__main__":
    main()
