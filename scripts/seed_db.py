from pathlib import Path
import sys

PROJECT_ROOT = Path(__file__).resolve().parents[1]
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

from src.infrastructure.persistence import init_db
from src.infrastructure.persistence.seed import ensure_default_admin


if __name__ == "__main__":
    init_db()
    ensure_default_admin()
    print("Database initialized and admin user ensured.")
