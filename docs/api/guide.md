# API Guide

Use OpenAPI docs at `/docs` for complete request/response examples.

## Auth Flow
1. `POST /api/v1/auth/register`
2. `POST /api/v1/auth/login`
3. Use `Authorization: Bearer <token>`

## Core Flows
- Dashboard CRUD and duplication
- Widget CRUD and refresh
- Metric calculation/history/trend
- Data source sync and ETL scheduling
- Alert management and acknowledgement
- Report generation and download
