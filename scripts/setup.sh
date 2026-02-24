#!/usr/bin/env bash
set -euo pipefail

python -m venv .venv
source .venv/bin/activate
pip install --upgrade pip
pip install -r requirements.txt
cp .env.example .env || true
alembic upgrade head
python scripts/seed_db.py

echo "Setup completed. Run: uvicorn src.presentation.api.main:app --reload"
