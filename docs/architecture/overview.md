# Architecture Overview

## Layers
- Domain: pure business rules and contracts
- Application: use case orchestration
- Infrastructure: data access, integrations, ETL, caching, queues
- Presentation: API contracts and transport concerns

## Data Flow
1. Data source configured via `/api/v1/data-sources`
2. Sync endpoint enqueues ETL task
3. ETL extracts/transforms/loads into warehouse + cache
4. Metric endpoints and dashboard endpoints read latest values
5. Alert service evaluates thresholds and persists history
6. WebSocket pushes updates to subscribed channels
