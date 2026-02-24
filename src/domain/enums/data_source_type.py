from enum import Enum


class DataSourceType(str, Enum):
    API = "api"
    DATABASE = "database"
    CSV = "csv"
    EXCEL = "excel"
    GOOGLE_SHEETS = "google_sheets"
