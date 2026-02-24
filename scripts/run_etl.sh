#!/usr/bin/env bash
set -euo pipefail

python -m src.infrastructure.etl_runner "$@"
