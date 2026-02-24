# 📊 Dashboard de KPIs e Métricas de Negócio - Roadmap Completo

## 📋 Índice
- [Visão Geral](#visão-geral)
- [Arquitetura do Sistema](#arquitetura-do-sistema)
- [Stack Tecnológica](#stack-tecnológica)
- [Roadmap de Desenvolvimento](#roadmap-de-desenvolvimento)
- [Clean Code & Boas Práticas](#clean-code--boas-práticas)
- [System Design](#system-design)
- [Segurança](#segurança)
- [Testes](#testes)
- [Observabilidade](#observabilidade)
- [Deploy e CI/CD](#deploy-e-cicd)
- [Documentação](#documentação)

---

## 🎯 Visão Geral

### Problema de Negócio
Empresas modernas enfrentam:
- **Dados fragmentados** em múltiplos sistemas (CRM, ERP, Analytics, Planilhas)
- **Falta de visibilidade** sobre métricas críticas de negócio
- **Decisões baseadas em dados desatualizados** ou incompletos
- **Tempo desperdiçado** consolidando dados manualmente
- **Dificuldade em identificar tendências** e anomalias
- **Ausência de alertas proativos** para métricas importantes

### Solução Proposta
Plataforma centralizada de Business Intelligence que:
- ✅ Conecta com múltiplas fontes de dados (APIs, DBs, Planilhas, CSV)
- ✅ Executa ETL automatizado e agendado
- ✅ Armazena dados em data warehouse otimizado
- ✅ Gera dashboards interativos e customizáveis
- ✅ Envia alertas automáticos baseados em thresholds
- ✅ Produz relatórios agendados (PDF, Excel, Email)
- ✅ Fornece API para consumo externo de dados

### Objetivos do Projeto
1. **Técnico**: Demonstrar capacidade em data engineering e analytics
2. **Profissional**: Resolver problema crítico de visualização de dados
3. **Portfólio**: Projeto técnico robusto e escalável

### Casos de Uso Reais
- **E-commerce**: Vendas diárias, ticket médio, taxa de conversão, CAC
- **SaaS**: MRR, ARR, Churn rate, LTV, usuários ativos
- **Marketing**: ROI por canal, CTR, CPC, conversões
- **Operações**: SLA compliance, tempo médio de resposta, backlog
- **Financeiro**: Receita, despesas, margem, fluxo de caixa

---

## 🏗️ Arquitetura do Sistema

### Arquitetura Geral (Layered + ETL Pipeline)

```
┌─────────────────────────────────────────────────────────────────┐
│                     Presentation Layer                          │
│                  (Web Dashboard + API)                          │
│   ┌──────────────┐  ┌──────────────┐  ┌──────────────┐        │
│   │   React UI   │  │  FastAPI     │  │  Websockets  │        │
│   │   (Charts)   │  │  REST API    │  │  (Realtime)  │        │
│   └──────────────┘  └──────────────┘  └──────────────┘        │
└────────────────────────────┬────────────────────────────────────┘
                             │
┌────────────────────────────┴────────────────────────────────────┐
│                    Application Layer                            │
│              (Business Logic & Orchestration)                   │
│   ┌──────────────────────────────────────────────────┐         │
│   │  Dashboard Service                               │         │
│   │  - Generate widgets                              │         │
│   │  - Calculate metrics                             │         │
│   │  - Apply filters                                 │         │
│   └──────────────────────────────────────────────────┘         │
│   ┌──────────────────────────────────────────────────┐         │
│   │  Alert Service                                   │         │
│   │  - Evaluate thresholds                           │         │
│   │  - Send notifications                            │         │
│   └──────────────────────────────────────────────────┘         │
│   ┌──────────────────────────────────────────────────┐         │
│   │  Report Service                                  │         │
│   │  - Generate PDF/Excel                            │         │
│   │  - Schedule exports                              │         │
│   └──────────────────────────────────────────────────┘         │
└────────────────────────────┬────────────────────────────────────┘
                             │
┌────────────────────────────┴────────────────────────────────────┐
│                      ETL Pipeline                               │
│                                                                  │
│   ┌──────────┐      ┌──────────┐      ┌──────────┐            │
│   │ EXTRACT  │  →   │ TRANSFORM│  →   │  LOAD    │            │
│   │          │      │          │      │          │            │
│   │ - APIs   │      │ - Clean  │      │ - DW     │            │
│   │ - DBs    │      │ - Enrich │      │ - Cache  │            │
│   │ - Files  │      │ - Agg    │      │ - Index  │            │
│   └──────────┘      └──────────┘      └──────────┘            │
└────────────────────────────┬────────────────────────────────────┘
                             │
┌────────────────────────────┴────────────────────────────────────┐
│                   Data Storage Layer                            │
│                                                                  │
│   ┌──────────────┐  ┌──────────────┐  ┌──────────────┐        │
│   │  PostgreSQL  │  │    Redis     │  │  TimescaleDB │        │
│   │  (Metadata)  │  │   (Cache)    │  │ (Time Series)│        │
│   └──────────────┘  └──────────────┘  └──────────────┘        │
│                                                                  │
│   ┌──────────────┐  ┌──────────────┐                           │
│   │   MinIO      │  │   Celery     │                           │
│   │ (File Store) │  │ (Task Queue) │                           │
│   └──────────────┘  └──────────────┘                           │
└──────────────────────────────────────────────────────────────────┘
                             │
┌────────────────────────────┴────────────────────────────────────┐
│                    Data Sources                                 │
│                                                                  │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐       │
│  │   APIs   │  │   DBs    │  │   CSV    │  │  Sheets  │       │
│  │ REST/GQL │  │ Postgres │  │  Excel   │  │  Google  │       │
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘       │
└──────────────────────────────────────────────────────────────────┘
```

### Estrutura de Diretórios

```
kpi-dashboard/
│
├── src/
│   ├── domain/                          # Camada de Domínio
│   │   ├── entities/
│   │   │   ├── __init__.py
│   │   │   ├── metric.py
│   │   │   ├── dashboard.py
│   │   │   ├── widget.py
│   │   │   ├── data_source.py
│   │   │   └── alert.py
│   │   │
│   │   ├── value_objects/
│   │   │   ├── __init__.py
│   │   │   ├── metric_value.py
│   │   │   ├── time_range.py
│   │   │   └── threshold.py
│   │   │
│   │   ├── enums/
│   │   │   ├── __init__.py
│   │   │   ├── metric_type.py
│   │   │   ├── widget_type.py
│   │   │   ├── aggregation_type.py
│   │   │   └── alert_severity.py
│   │   │
│   │   ├── repositories/
│   │   │   ├── __init__.py
│   │   │   ├── metric_repository.py
│   │   │   ├── dashboard_repository.py
│   │   │   └── data_source_repository.py
│   │   │
│   │   └── exceptions/
│   │       ├── __init__.py
│   │       └── domain_exceptions.py
│   │
│   ├── application/                     # Camada de Aplicação
│   │   ├── use_cases/
│   │   │   ├── __init__.py
│   │   │   ├── dashboards/
│   │   │   │   ├── create_dashboard.py
│   │   │   │   ├── update_dashboard.py
│   │   │   │   ├── get_dashboard_data.py
│   │   │   │   └── delete_dashboard.py
│   │   │   │
│   │   │   ├── metrics/
│   │   │   │   ├── calculate_metric.py
│   │   │   │   ├── get_metric_history.py
│   │   │   │   └── compare_metrics.py
│   │   │   │
│   │   │   ├── etl/
│   │   │   │   ├── extract_data.py
│   │   │   │   ├── transform_data.py
│   │   │   │   └── load_data.py
│   │   │   │
│   │   │   └── alerts/
│   │   │       ├── evaluate_alerts.py
│   │   │       ├── send_alert.py
│   │   │       └── acknowledge_alert.py
│   │   │
│   │   ├── dtos/
│   │   │   ├── __init__.py
│   │   │   ├── dashboard_dto.py
│   │   │   ├── metric_dto.py
│   │   │   └── widget_dto.py
│   │   │
│   │   └── services/
│   │       ├── __init__.py
│   │       ├── dashboard_service.py
│   │       ├── metric_calculation_service.py
│   │       ├── alert_service.py
│   │       └── report_service.py
│   │
│   ├── infrastructure/                   # Camada de Infraestrutura
│   │   ├── persistence/
│   │   │   ├── __init__.py
│   │   │   ├── database.py
│   │   │   ├── models/
│   │   │   │   ├── __init__.py
│   │   │   │   ├── dashboard_model.py
│   │   │   │   ├── metric_model.py
│   │   │   │   ├── widget_model.py
│   │   │   │   └── data_source_model.py
│   │   │   │
│   │   │   └── repositories/
│   │   │       ├── __init__.py
│   │   │       ├── postgres_dashboard_repository.py
│   │   │       ├── timescale_metric_repository.py
│   │   │       └── postgres_data_source_repository.py
│   │   │
│   │   ├── cache/
│   │   │   ├── __init__.py
│   │   │   ├── redis_cache.py
│   │   │   └── cache_keys.py
│   │   │
│   │   ├── etl/
│   │   │   ├── __init__.py
│   │   │   ├── extractors/
│   │   │   │   ├── __init__.py
│   │   │   │   ├── base_extractor.py
│   │   │   │   ├── api_extractor.py
│   │   │   │   ├── database_extractor.py
│   │   │   │   ├── csv_extractor.py
│   │   │   │   └── google_sheets_extractor.py
│   │   │   │
│   │   │   ├── transformers/
│   │   │   │   ├── __init__.py
│   │   │   │   ├── base_transformer.py
│   │   │   │   ├── cleaner.py
│   │   │   │   ├── aggregator.py
│   │   │   │   └── enricher.py
│   │   │   │
│   │   │   └── loaders/
│   │   │       ├── __init__.py
│   │   │       ├── base_loader.py
│   │   │       ├── warehouse_loader.py
│   │   │       └── cache_loader.py
│   │   │
│   │   ├── connectors/
│   │   │   ├── __init__.py
│   │   │   ├── base_connector.py
│   │   │   ├── rest_api_connector.py
│   │   │   ├── graphql_connector.py
│   │   │   ├── sql_connector.py
│   │   │   └── file_connector.py
│   │   │
│   │   ├── messaging/
│   │   │   ├── __init__.py
│   │   │   ├── celery_config.py
│   │   │   └── tasks/
│   │   │       ├── __init__.py
│   │   │       ├── etl_tasks.py
│   │   │       ├── alert_tasks.py
│   │   │       └── report_tasks.py
│   │   │
│   │   ├── notifications/
│   │   │   ├── __init__.py
│   │   │   ├── email_notifier.py
│   │   │   ├── slack_notifier.py
│   │   │   └── webhook_notifier.py
│   │   │
│   │   ├── storage/
│   │   │   ├── __init__.py
│   │   │   └── minio_client.py
│   │   │
│   │   └── monitoring/
│   │       ├── __init__.py
│   │       ├── logger.py
│   │       └── metrics.py
│   │
│   ├── presentation/                     # Camada de Apresentação
│   │   ├── api/
│   │   │   ├── __init__.py
│   │   │   ├── main.py
│   │   │   ├── dependencies.py
│   │   │   │
│   │   │   ├── routers/
│   │   │   │   ├── __init__.py
│   │   │   │   ├── dashboards.py
│   │   │   │   ├── metrics.py
│   │   │   │   ├── widgets.py
│   │   │   │   ├── data_sources.py
│   │   │   │   ├── alerts.py
│   │   │   │   ├── reports.py
│   │   │   │   └── auth.py
│   │   │   │
│   │   │   ├── schemas/
│   │   │   │   ├── __init__.py
│   │   │   │   ├── dashboard_schemas.py
│   │   │   │   ├── metric_schemas.py
│   │   │   │   ├── widget_schemas.py
│   │   │   │   └── data_source_schemas.py
│   │   │   │
│   │   │   └── middleware/
│   │   │       ├── __init__.py
│   │   │       ├── auth_middleware.py
│   │   │       ├── cors_middleware.py
│   │   │       └── rate_limit_middleware.py
│   │   │
│   │   └── websocket/
│   │       ├── __init__.py
│   │       ├── manager.py
│   │       └── handlers.py
│   │
│   └── shared/
│       ├── __init__.py
│       ├── constants.py
│       ├── utils.py
│       └── types.py
│
├── frontend/                             # Frontend React (Opcional)
│   ├── src/
│   │   ├── components/
│   │   │   ├── Dashboard/
│   │   │   ├── Widgets/
│   │   │   └── Charts/
│   │   ├── pages/
│   │   ├── services/
│   │   └── utils/
│   ├── package.json
│   └── tsconfig.json
│
├── tests/
│   ├── unit/
│   │   ├── domain/
│   │   ├── application/
│   │   └── infrastructure/
│   ├── integration/
│   │   ├── api/
│   │   ├── database/
│   │   └── etl/
│   └── e2e/
│       └── scenarios/
│
├── migrations/
│   ├── versions/
│   └── env.py
│
├── docker/
│   ├── Dockerfile
│   ├── Dockerfile.frontend
│   └── docker-compose.yml
│
├── scripts/
│   ├── setup.sh
│   ├── seed_db.py
│   ├── create_sample_data.py
│   └── run_etl.sh
│
├── docs/
│   ├── architecture/
│   ├── api/
│   ├── etl/
│   └── setup.md
│
├── .github/
│   └── workflows/
│       ├── ci.yml
│       └── cd.yml
│
├── .env.example
├── .gitignore
├── pyproject.toml
├── requirements.txt
├── README.md
└── alembic.ini
```

---

## 🛠️ Stack Tecnológica

### Backend Core
- **Python 3.11+** - Linguagem principal
- **FastAPI** - Framework web assíncrono e performático
- **Pydantic V2** - Validação de dados
- **SQLAlchemy 2.0** - ORM
- **Alembic** - Database migrations

### Data Storage & Processing
- **PostgreSQL 15+** - Banco de dados principal (metadata)
- **TimescaleDB** - Extensão PostgreSQL para time-series
- **Redis 7+** - Cache e pub/sub
- **MinIO** - Object storage (arquivos, relatórios)

### Data Processing
- **Pandas** - Manipulação de dados
- **NumPy** - Computação numérica
- **Polars** - DataFrame performático (alternativa ao Pandas)
- **Apache Arrow** - Format de dados em memória
- **DuckDB** - Analytics em memória (opcional)

### ETL & Background Jobs
- **Celery** - Task queue distribuída
- **Celery Beat** - Agendamento de tarefas
- **RabbitMQ** - Message broker

### Data Visualization
- **Plotly** - Gráficos interativos
- **Matplotlib** - Gráficos estáticos
- **Seaborn** - Visualizações estatísticas
- **Chart.js** - Frontend charts (via React)

### Reports & Exports
- **ReportLab** - Geração de PDFs
- **XlsxWriter / openpyxl** - Excel files
- **WeasyPrint** - HTML to PDF

### Frontend (Opcional mas Recomendado)
- **React 18** - UI framework
- **TypeScript** - Type safety
- **Recharts / Victory** - React charts
- **TanStack Query** - Data fetching
- **Zustand** - State management
- **Tailwind CSS** - Styling

### External Integrations
- **httpx** - HTTP client assíncrono
- **gspread** - Google Sheets integration
- **requests** - HTTP requests
- **sqlalchemy-utils** - Utilities para SQLAlchemy

### Testing
- **pytest** - Framework de testes
- **pytest-asyncio** - Testes assíncronos
- **pytest-cov** - Coverage
- **faker** - Dados fake
- **factory-boy** - Test factories
- **great_expectations** - Data quality testing

### Quality & DevOps
- **black** - Code formatting
- **isort** - Import sorting
- **flake8** - Linting
- **mypy** - Type checking
- **pre-commit** - Git hooks
- **Docker** - Containerização
- **GitHub Actions** - CI/CD

### Monitoring & Observability
- **structlog** - Structured logging
- **prometheus-client** - Metrics
- **sentry-sdk** - Error tracking
- **grafana** - Dashboards (optional)

---

## 🗺️ Roadmap de Desenvolvimento

### 📅 FASE 1: Setup e Fundação (Semana 1-2)

#### Semana 1: Configuração Inicial
- [ ] **Dia 1-2: Setup do Projeto**
  - Criar repositório Git
  - Configurar Poetry para gerenciamento de dependências
  - Estruturar diretórios (Clean Architecture)
  - Configurar `.env.example` e `.gitignore`
  - Setup Docker e docker-compose
  - Configurar pre-commit hooks

- [ ] **Dia 3-4: Configuração de Bancos de Dados**
  - Setup PostgreSQL via Docker
  - Instalar e configurar TimescaleDB extension
  - Configurar SQLAlchemy engine
  - Setup Alembic para migrations
  - Criar primeira migration (tabelas base)
  - Setup Redis para cache

- [ ] **Dia 5-6: API Base e Estrutura**
  - Estruturar FastAPI application
  - Configurar CORS middleware
  - Criar health check endpoint
  - Setup logging estruturado (structlog)
  - Configurar exception handlers
  - Documentar OpenAPI/Swagger

- [ ] **Dia 7: CI/CD Pipeline**
  - Configurar GitHub Actions
  - Pipeline de testes automatizados
  - Quality checks (linting, type checking)
  - Build Docker containers

#### Semana 2: Domain Layer
- [ ] **Dia 1-2: Modelagem de Domínio**
  - Criar entidades (Dashboard, Widget, Metric, DataSource, Alert)
  - Implementar Value Objects (MetricValue, TimeRange, Threshold)
  - Definir Enums (MetricType, WidgetType, AggregationType)
  - Criar Domain Exceptions

- [ ] **Dia 3-4: Repository Interfaces**
  - Criar interfaces abstratas de repositórios
  - DashboardRepository
  - MetricRepository
  - DataSourceRepository
  - AlertRepository

- [ ] **Dia 5-6: Business Rules**
  - Regras de cálculo de métricas
  - Validações de threshold para alertas
  - Lógica de agregação de dados
  - Regras de permissão

- [ ] **Dia 7: Testes de Domínio**
  - Testes unitários para entidades
  - Testes de Value Objects
  - Testes de regras de negócio
  - Coverage > 90%

---

### 📅 FASE 2: Infrastructure Layer (Semana 3-4)

#### Semana 3: Persistência e Cache
- [ ] **Dia 1-3: Database Models & Repositories**
  - Models SQLAlchemy para todas as entidades
  - Implementar PostgresDashboardRepository
  - Implementar TimescaleMetricRepository (time-series)
  - Implementar PostgresDataSourceRepository
  - Unit of Work pattern
  - Transaction management

- [ ] **Dia 4-5: Cache Layer**
  - Implementar RedisCacheService
  - Cache de dashboard configurations
  - Cache de metric calculations
  - Cache de query results
  - Estratégias de invalidação
  - TTL policies

- [ ] **Dia 6-7: Testes de Infraestrutura**
  - Testes de integração com PostgreSQL
  - Testes de integração com TimescaleDB
  - Testes de cache Redis
  - Database fixtures
  - Seed data para desenvolvimento

#### Semana 4: Conectores de Dados
- [ ] **Dia 1-2: Base Connector Architecture**
  - Interface abstrata BaseConnector
  - Connection pooling
  - Retry logic
  - Error handling
  - Timeout management

- [ ] **Dia 3-4: Implementar Conectores**
  - RestAPIConnector (HTTP/REST)
  - SQLConnector (PostgreSQL, MySQL, SQLite)
  - CSVConnector (leitura de arquivos CSV)
  - ExcelConnector (XLS, XLSX)
  - GoogleSheetsConnector (API integration)

- [ ] **Dia 5-6: Data Source Management**
  - CRUD de data sources
  - Credential management (encrypted)
  - Connection testing
  - Health checks

- [ ] **Dia 7: Testes de Conectores**
  - Mock de APIs externas
  - Testes de parsing de dados
  - Testes de error handling
  - Testes de connection retry

---

### 📅 FASE 3: ETL Pipeline (Semana 5-6)

#### Semana 5: Extract & Transform
- [ ] **Dia 1-2: Extractors**
  - APIExtractor - extrair dados de REST APIs
  - DatabaseExtractor - extrair dados de bancos SQL
  - FileExtractor - extrair de CSV/Excel
  - GoogleSheetsExtractor
  - Incremental extraction (delta loads)

- [ ] **Dia 3-4: Transformers**
  - DataCleaner - limpeza de dados (nulls, duplicates)
  - DataValidator - validação com Great Expectations
  - DataEnricher - adicionar campos calculados
  - Aggregator - agregações (sum, avg, count, etc.)
  - Type conversion

- [ ] **Dia 5-6: Data Quality**
  - Schema validation
  - Data profiling
  - Anomaly detection
  - Quality metrics tracking
  - Error logging

- [ ] **Dia 7: Testes de ETL**
  - Testes de extractors
  - Testes de transformers
  - Testes de data quality
  - Testes de idempotência

#### Semana 6: Load & Orchestration
- [ ] **Dia 1-2: Loaders**
  - WarehouseLoader - carregar para TimescaleDB
  - CacheLoader - carregar para Redis
  - Bulk insert optimization
  - Upsert logic
  - Conflict resolution

- [ ] **Dia 3-4: ETL Orchestration**
  - ETL Pipeline orchestrator
  - Job scheduling
  - Dependency management
  - Parallel execution
  - Error recovery

- [ ] **Dia 5-6: Celery Tasks**
  - Task para execução de ETL
  - Task retry logic
  - Task monitoring
  - Celery Beat scheduling
  - Periodic jobs (hourly, daily, etc.)

- [ ] **Dia 7: Testes de Pipeline**
  - Testes end-to-end de ETL
  - Testes de scheduling
  - Testes de failure scenarios
  - Performance testing

---

### 📅 FASE 4: Application Layer (Semana 7-8)

#### Semana 7: Use Cases Principais
- [ ] **Dia 1-2: Dashboard Use Cases**
  - CreateDashboardUseCase
  - UpdateDashboardUseCase
  - GetDashboardDataUseCase
  - DeleteDashboardUseCase
  - DuplicateDashboardUseCase

- [ ] **Dia 3-4: Metric Use Cases**
  - CalculateMetricUseCase
  - GetMetricHistoryUseCase
  - CompareMetricsUseCase
  - GetMetricTrendUseCase
  - ExportMetricDataUseCase

- [ ] **Dia 5-6: Widget Use Cases**
  - CreateWidgetUseCase
  - UpdateWidgetUseCase
  - GetWidgetDataUseCase
  - RefreshWidgetUseCase
  - ConfigureWidgetUseCase

- [ ] **Dia 7: Testes de Use Cases**
  - Testes unitários isolados
  - Mocking de repositórios
  - Verificação de business logic
  - Edge cases

#### Semana 8: Services
- [ ] **Dia 1-2: Metric Calculation Service**
  - Cálculo de métricas básicas (sum, avg, count)
  - Cálculo de métricas derivadas (%, growth, ratio)
  - Aggregations por time period
  - Moving averages
  - Percentiles

- [ ] **Dia 3-4: Dashboard Service**
  - Layout management
  - Widget positioning
  - Data fetching orchestration
  - Real-time updates
  - Export dashboard config

- [ ] **Dia 5-6: Alert Service**
  - Alert evaluation engine
  - Threshold checking
  - Alert notification
  - Alert history
  - Acknowledgment

- [ ] **Dia 7: Report Service**
  - PDF generation
  - Excel export
  - Scheduled reports
  - Email delivery
  - Custom templates

---

### 📅 FASE 5: Presentation Layer - API (Semana 9-10)

#### Semana 9: Core Endpoints
- [ ] **Dia 1-2: Dashboard Endpoints**
  - POST /api/v1/dashboards
  - GET /api/v1/dashboards
  - GET /api/v1/dashboards/{id}
  - PUT /api/v1/dashboards/{id}
  - DELETE /api/v1/dashboards/{id}
  - POST /api/v1/dashboards/{id}/duplicate

- [ ] **Dia 3-4: Widget Endpoints**
  - POST /api/v1/widgets
  - GET /api/v1/widgets/{id}
  - PUT /api/v1/widgets/{id}
  - DELETE /api/v1/widgets/{id}
  - POST /api/v1/widgets/{id}/refresh

- [ ] **Dia 5-6: Metrics Endpoints**
  - GET /api/v1/metrics
  - POST /api/v1/metrics/calculate
  - GET /api/v1/metrics/{id}/history
  - POST /api/v1/metrics/compare
  - GET /api/v1/metrics/{id}/trend

- [ ] **Dia 7: Pydantic Schemas**
  - Request schemas com validação
  - Response schemas
  - Nested schemas
  - Examples para documentação

#### Semana 10: Advanced Features
- [ ] **Dia 1-2: Data Source Endpoints**
  - POST /api/v1/data-sources
  - GET /api/v1/data-sources
  - PUT /api/v1/data-sources/{id}
  - DELETE /api/v1/data-sources/{id}
  - POST /api/v1/data-sources/{id}/test
  - POST /api/v1/data-sources/{id}/sync

- [ ] **Dia 3-4: Alert Endpoints**
  - POST /api/v1/alerts
  - GET /api/v1/alerts
  - PUT /api/v1/alerts/{id}
  - DELETE /api/v1/alerts/{id}
  - POST /api/v1/alerts/{id}/acknowledge
  - GET /api/v1/alerts/history

- [ ] **Dia 5-6: Report Endpoints**
  - POST /api/v1/reports/generate
  - GET /api/v1/reports
  - GET /api/v1/reports/{id}/download
  - POST /api/v1/reports/schedule
  - GET /api/v1/reports/schedules

- [ ] **Dia 7: WebSocket para Real-time**
  - WebSocket endpoint
  - Connection management
  - Real-time metric updates
  - Broadcast alerts
  - Dashboard subscriptions

---

### 📅 FASE 6: Cálculos e Analytics (Semana 11)

- [ ] **Dia 1-2: Metric Calculations**
  - Time-based aggregations (hourly, daily, weekly, monthly)
  - Moving averages (SMA, EMA)
  - Growth rate calculations
  - Year-over-year comparisons
  - Percentile calculations

- [ ] **Dia 3-4: Statistical Analysis**
  - Standard deviation
  - Variance
  - Correlation
  - Trend detection
  - Forecasting básico (linear regression)

- [ ] **Dia 5-6: Query Optimization**
  - Query caching
  - Materialized views
  - Index optimization
  - Query result pagination
  - Lazy loading

- [ ] **Dia 7: Performance Testing**
  - Load testing de queries
  - Benchmark de cálculos
  - Identificar bottlenecks
  - Optimization passes

---

### 📅 FASE 7: Segurança (Semana 12)

- [ ] **Dia 1-2: Autenticação e Autorização**
  - JWT authentication
  - Role-based access control (Admin, Viewer, Editor)
  - Dashboard permissions
  - Data source access control
  - API key management

- [ ] **Dia 3: Encriptação de Credenciais**
  - Encrypt data source credentials
  - Key management
  - Secure storage
  - Credential rotation

- [ ] **Dia 4: Input Validation**
  - SQL injection prevention
  - XSS prevention
  - Query parameter validation
  - File upload validation
  - Rate limiting

- [ ] **Dia 5: Audit Trail**
  - Log de todas operações críticas
  - User activity tracking
  - Data access logging
  - Change history

- [ ] **Dia 6-7: Security Testing**
  - OWASP Top 10 verification
  - Dependency scanning
  - Security headers
  - Penetration testing básico

---

### 📅 FASE 8: Frontend (Opcional - Semana 13-14)

#### Semana 13: Setup e Core Components
- [ ] **Dia 1-2: Setup React**
  - Create React app com TypeScript
  - Configure routing (React Router)
  - Setup state management (Zustand)
  - Configure API client (TanStack Query)
  - Setup Tailwind CSS

- [ ] **Dia 3-4: Dashboard Components**
  - Dashboard list view
  - Dashboard detail view
  - Dashboard editor
  - Grid layout system
  - Drag & drop widgets

- [ ] **Dia 5-6: Widget Components**
  - Line chart widget
  - Bar chart widget
  - Pie chart widget
  - Number/KPI widget
  - Table widget

- [ ] **Dia 7: Layout & Navigation**
  - Main layout
  - Sidebar navigation
  - Top navigation
  - Breadcrumbs
  - Responsive design

#### Semana 14: Features Avançadas
- [ ] **Dia 1-2: Interatividade**
  - Filter controls
  - Date range picker
  - Drill-down functionality
  - Cross-filtering
  - Export to PDF/Excel

- [ ] **Dia 3-4: Real-time Updates**
  - WebSocket integration
  - Auto-refresh widgets
  - Live data updates
  - Alert notifications

- [ ] **Dia 5-6: Admin Features**
  - Data source management UI
  - Alert configuration UI
  - User management
  - Settings page

- [ ] **Dia 7: Polish & UX**
  - Loading states
  - Error handling
  - Empty states
  - Tooltips e help text
  - Accessibility (a11y)

---

### 📅 FASE 9: Testes e Qualidade (Semana 15)

- [ ] **Dia 1-2: Testes Unitários Completos**
  - Coverage > 85% em backend
  - Testes de todas as camadas
  - Parametrized tests
  - Edge cases

- [ ] **Dia 3-4: Testes de Integração**
  - API integration tests
  - Database integration tests
  - ETL integration tests
  - Cache integration tests

- [ ] **Dia 5: Testes E2E**
  - User journeys completos
  - Dashboard creation flow
  - Metric calculation flow
  - Alert triggering flow

- [ ] **Dia 6: Performance & Load Testing**
  - Load test de API endpoints
  - ETL performance testing
  - Query performance testing
  - Concurrent users testing

- [ ] **Dia 7: Code Review & Refactoring**
  - Code review completo
  - Refactoring de code smells
  - Documentation update
  - Clean up

---

### 📅 FASE 10: Deploy e Observability (Semana 16)

- [ ] **Dia 1-2: Containerização**
  - Otimizar Dockerfile
  - Multi-stage builds
  - docker-compose completo
  - Environment configs

- [ ] **Dia 3-4: CI/CD Pipeline**
  - Automated testing
  - Build automation
  - Security scanning
  - Deploy automation

- [ ] **Dia 5: Deploy em Cloud**
  - Setup em Railway/Render/Heroku
  - Database setup
  - Environment variables
  - Domain configuration

- [ ] **Dia 6: Monitoring**
  - Application monitoring
  - Error tracking (Sentry)
  - Performance monitoring
  - Uptime monitoring

- [ ] **Dia 7: Documentação Final**
  - README completo
  - API documentation
  - User guide
  - Architecture docs
  - Video demo

---

## 🧹 Clean Code & Boas Práticas

### Princípios SOLID Aplicados

#### 1. Single Responsibility Principle (SRP)

```python
# ❌ MAU - Classe fazendo múltiplas coisas
class MetricManager:
    def calculate_metric(self, data):
        # Calcula
        # Valida
        # Armazena
        # Envia notificação
        pass

# ✅ BOM - Responsabilidades separadas
class MetricCalculator:
    """Apenas cálculo de métricas"""
    def calculate(self, data: List[float], metric_type: MetricType) -> MetricValue:
        if metric_type == MetricType.SUM:
            return MetricValue(sum(data))
        elif metric_type == MetricType.AVERAGE:
            return MetricValue(sum(data) / len(data))
        # ... outras métricas

class MetricValidator:
    """Apenas validação"""
    def validate(self, metric_value: MetricValue) -> bool:
        return metric_value.value is not None and not math.isnan(metric_value.value)

class MetricRepository:
    """Apenas persistência"""
    def save(self, metric: Metric) -> Metric:
        # Salvar no banco
        pass

class MetricNotifier:
    """Apenas notificação"""
    def notify(self, metric: Metric) -> None:
        # Enviar alerta se necessário
        pass

class CalculateMetricUseCase:
    """Orquestra as operações"""
    def __init__(
        self,
        calculator: MetricCalculator,
        validator: MetricValidator,
        repository: MetricRepository,
        notifier: MetricNotifier
    ):
        self.calculator = calculator
        self.validator = validator
        self.repository = repository
        self.notifier = notifier

    def execute(self, data: List[float], metric_type: MetricType) -> Metric:
        # Calcular
        value = self.calculator.calculate(data, metric_type)
        
        # Validar
        if not self.validator.validate(value):
            raise InvalidMetricError()
        
        # Criar entidade
        metric = Metric(value=value, type=metric_type)
        
        # Persistir
        saved_metric = self.repository.save(metric)
        
        # Notificar
        self.notifier.notify(saved_metric)
        
        return saved_metric
```

#### 2. Open/Closed Principle (OCP)

```python
# ✅ Aberto para extensão, fechado para modificação
from abc import ABC, abstractmethod
from typing import Any, Dict

class DataExtractor(ABC):
    """Interface base para extractors"""
    
    @abstractmethod
    def extract(self, config: Dict[str, Any]) -> pd.DataFrame:
        """Extrair dados da fonte"""
        pass
    
    @abstractmethod
    def validate_config(self, config: Dict[str, Any]) -> bool:
        """Validar configuração"""
        pass

class APIExtractor(DataExtractor):
    """Extractor para REST APIs"""
    
    def extract(self, config: Dict[str, Any]) -> pd.DataFrame:
        url = config["url"]
        response = requests.get(url, headers=config.get("headers", {}))
        return pd.DataFrame(response.json())
    
    def validate_config(self, config: Dict[str, Any]) -> bool:
        return "url" in config

class DatabaseExtractor(DataExtractor):
    """Extractor para databases SQL"""
    
    def extract(self, config: Dict[str, Any]) -> pd.DataFrame:
        engine = create_engine(config["connection_string"])
        return pd.read_sql(config["query"], engine)
    
    def validate_config(self, config: Dict[str, Any]) -> bool:
        return "connection_string" in config and "query" in config

class CSVExtractor(DataExtractor):
    """Extractor para arquivos CSV"""
    
    def extract(self, config: Dict[str, Any]) -> pd.DataFrame:
        return pd.read_csv(config["filepath"])
    
    def validate_config(self, config: Dict[str, Any]) -> bool:
        return "filepath" in config

# Factory para criar extractors
class ExtractorFactory:
    _extractors = {
        "api": APIExtractor,
        "database": DatabaseExtractor,
        "csv": CSVExtractor,
    }
    
    @classmethod
    def create(cls, extractor_type: str) -> DataExtractor:
        extractor_class = cls._extractors.get(extractor_type)
        if not extractor_class:
            raise ValueError(f"Unknown extractor type: {extractor_type}")
        return extractor_class()
    
    @classmethod
    def register(cls, name: str, extractor_class: type):
        """Permite registrar novos extractors sem modificar código existente"""
        cls._extractors[name] = extractor_class

# Adicionar novo extractor não requer modificar código existente
class GoogleSheetsExtractor(DataExtractor):
    def extract(self, config: Dict[str, Any]) -> pd.DataFrame:
        # Implementação específica
        pass
    
    def validate_config(self, config: Dict[str, Any]) -> bool:
        return "spreadsheet_id" in config

# Registrar dinamicamente
ExtractorFactory.register("google_sheets", GoogleSheetsExtractor)
```

#### 3. Liskov Substitution Principle (LSP)

```python
# ✅ Subtipos devem ser substituíveis por seus tipos base
from abc import ABC, abstractmethod
from typing import List, Optional

class MetricRepository(ABC):
    """Interface base para repositórios de métrica"""
    
    @abstractmethod
    def save(self, metric: Metric) -> Metric:
        """Salvar métrica"""
        pass
    
    @abstractmethod
    def find_by_id(self, metric_id: str) -> Optional[Metric]:
        """Buscar métrica por ID"""
        pass
    
    @abstractmethod
    def find_by_time_range(
        self, 
        start: datetime, 
        end: datetime
    ) -> List[Metric]:
        """Buscar métricas em um período"""
        pass

class TimescaleMetricRepository(MetricRepository):
    """Implementação com TimescaleDB"""
    
    def save(self, metric: Metric) -> Metric:
        # Salva em TimescaleDB
        # Retorna métrica salva (mesmo tipo esperado)
        return metric
    
    def find_by_id(self, metric_id: str) -> Optional[Metric]:
        # Busca em TimescaleDB
        # Retorna Optional[Metric] como esperado
        return metric_or_none
    
    def find_by_time_range(
        self, 
        start: datetime, 
        end: datetime
    ) -> List[Metric]:
        # Aproveita hypertables do TimescaleDB
        return metrics_list

class InMemoryMetricRepository(MetricRepository):
    """Implementação em memória para testes"""
    
    def __init__(self):
        self._metrics: Dict[str, Metric] = {}
    
    def save(self, metric: Metric) -> Metric:
        self._metrics[metric.id] = metric
        return metric
    
    def find_by_id(self, metric_id: str) -> Optional[Metric]:
        return self._metrics.get(metric_id)
    
    def find_by_time_range(
        self, 
        start: datetime, 
        end: datetime
    ) -> List[Metric]:
        return [
            m for m in self._metrics.values()
            if start <= m.timestamp <= end
        ]

# Ambas implementações podem ser usadas intercambiavelmente
def process_metrics(repository: MetricRepository):
    """Funciona com qualquer implementação de MetricRepository"""
    metric = Metric(value=100, timestamp=datetime.now())
    saved = repository.save(metric)
    retrieved = repository.find_by_id(saved.id)
    # Funciona igualmente bem com qualquer implementação
```

#### 4. Interface Segregation Principle (ISP)

```python
# ❌ MAU - Interface gorda
class DataSourceOperations(ABC):
    @abstractmethod
    def extract_data(self): pass
    
    @abstractmethod
    def validate_connection(self): pass
    
    @abstractmethod
    def get_schema(self): pass
    
    @abstractmethod
    def execute_query(self): pass
    
    @abstractmethod
    def bulk_insert(self): pass
    
    @abstractmethod
    def create_index(self): pass

# ✅ BOM - Interfaces segregadas
class Readable(ABC):
    """Interface para fontes de dados que podem ser lidas"""
    @abstractmethod
    def extract_data(self) -> pd.DataFrame: pass

class Connectable(ABC):
    """Interface para fontes que requerem conexão"""
    @abstractmethod
    def validate_connection(self) -> bool: pass

class Queryable(ABC):
    """Interface para fontes que suportam queries"""
    @abstractmethod
    def execute_query(self, query: str) -> pd.DataFrame: pass

class Writable(ABC):
    """Interface para destinos de dados"""
    @abstractmethod
    def bulk_insert(self, data: pd.DataFrame) -> int: pass

class Indexable(ABC):
    """Interface para fontes que suportam índices"""
    @abstractmethod
    def create_index(self, column: str) -> bool: pass

# Classes implementam apenas o que precisam
class CSVDataSource(Readable):
    """CSV é apenas readable"""
    def extract_data(self) -> pd.DataFrame:
        return pd.read_csv(self.filepath)

class PostgreSQLDataSource(Readable, Connectable, Queryable, Writable, Indexable):
    """PostgreSQL implementa todas as interfaces"""
    def extract_data(self) -> pd.DataFrame:
        return pd.read_sql(self.query, self.engine)
    
    def validate_connection(self) -> bool:
        return self.engine.connect()
    
    def execute_query(self, query: str) -> pd.DataFrame:
        return pd.read_sql(query, self.engine)
    
    def bulk_insert(self, data: pd.DataFrame) -> int:
        return data.to_sql(self.table, self.engine, if_exists='append')
    
    def create_index(self, column: str) -> bool:
        self.engine.execute(f"CREATE INDEX ON {self.table}({column})")
        return True

class APIDataSource(Readable, Connectable):
    """API é readable e connectable, mas não queryable"""
    def extract_data(self) -> pd.DataFrame:
        response = requests.get(self.url)
        return pd.DataFrame(response.json())
    
    def validate_connection(self) -> bool:
        response = requests.head(self.url)
        return response.status_code == 200
```

#### 5. Dependency Inversion Principle (DIP)

```python
# ✅ Dependa de abstrações, não de implementações concretas

# Abstração (porta)
class CacheService(ABC):
    @abstractmethod
    def get(self, key: str) -> Optional[Any]: pass
    
    @abstractmethod
    def set(self, key: str, value: Any, ttl: int) -> None: pass
    
    @abstractmethod
    def delete(self, key: str) -> None: pass

# Implementação concreta (adaptador)
class RedisCacheService(CacheService):
    def __init__(self, redis_client: redis.Redis):
        self.redis = redis_client
    
    def get(self, key: str) -> Optional[Any]:
        data = self.redis.get(key)
        return json.loads(data) if data else None
    
    def set(self, key: str, value: Any, ttl: int) -> None:
        self.redis.setex(key, ttl, json.dumps(value, default=str))
    
    def delete(self, key: str) -> None:
        self.redis.delete(key)

# Use Case depende da ABSTRAÇÃO, não da implementação
class GetDashboardDataUseCase:
    def __init__(
        self,
        dashboard_repository: DashboardRepository,
        metric_calculator: MetricCalculator,
        cache: CacheService  # ← Depende da abstração
    ):
        self.dashboard_repository = dashboard_repository
        self.metric_calculator = metric_calculator
        self.cache = cache
    
    def execute(self, dashboard_id: str) -> DashboardData:
        # Tenta cache primeiro
        cache_key = f"dashboard:{dashboard_id}"
        cached = self.cache.get(cache_key)
        
        if cached:
            return DashboardData(**cached)
        
        # Se não tem cache, calcula
        dashboard = self.dashboard_repository.find_by_id(dashboard_id)
        data = self.metric_calculator.calculate_dashboard_metrics(dashboard)
        
        # Armazena no cache
        self.cache.set(cache_key, data.dict(), ttl=300)
        
        return data

# Dependency Injection
cache_service = RedisCacheService(redis_client)
use_case = GetDashboardDataUseCase(
    dashboard_repository=repo,
    metric_calculator=calc,
    cache=cache_service  # ← Injetando implementação
)
```

---

### Nomenclatura e Organização

```python
# ✅ Constantes
MAX_DASHBOARD_WIDGETS = 20
DEFAULT_CACHE_TTL_SECONDS = 300
METRIC_CALCULATION_TIMEOUT = 30

# ✅ Classes (PascalCase)
class DashboardRepository:
    pass

class MetricCalculationService:
    pass

# ✅ Funções e métodos (snake_case, descritivos)
def calculate_moving_average(values: List[float], window: int) -> List[float]:
    """
    Calcula média móvel de uma série temporal.
    
    Args:
        values: Lista de valores numéricos
        window: Tamanho da janela para a média móvel
    
    Returns:
        Lista com as médias móveis calculadas
    """
    pass

def aggregate_by_time_period(
    data: pd.DataFrame,
    period: str,
    aggregation: AggregationType
) -> pd.DataFrame:
    """Agrega dados por período de tempo"""
    pass

# ✅ Variáveis (snake_case, descritivas)
dashboard_config = load_dashboard_config(dashboard_id)
metric_values = calculate_metrics(raw_data)
is_cache_enabled = True

# ✅ Privadas (prefixo _)
class MetricCalculator:
    def __init__(self):
        self._cache = {}  # Privado
        self.calculations_count = 0  # Público
    
    def _validate_input(self, data: List[float]) -> bool:
        """Método privado de validação"""
        return len(data) > 0 and all(isinstance(x, (int, float)) for x in data)
    
    def calculate(self, data: List[float]) -> float:
        """Método público"""
        if not self._validate_input(data):
            raise ValueError("Invalid input data")
        return sum(data) / len(data)

# ✅ Type hints sempre
def process_metrics(
    raw_data: pd.DataFrame,
    metric_type: MetricType,
    time_range: TimeRange,
    cache_enabled: bool = True
) -> List[MetricResult]:
    pass
```

---

### Error Handling Robusto

```python
# ✅ Custom exceptions hierárquicas
class DomainException(Exception):
    """Exceção base para erros de domínio"""
    pass

class DataSourceException(DomainException):
    """Exceções relacionadas a fontes de dados"""
    pass

class ConnectionError(DataSourceException):
    """Erro de conexão com fonte de dados"""
    def __init__(self, source_name: str, original_error: Exception):
        self.source_name = source_name
        self.original_error = original_error
        super().__init__(
            f"Failed to connect to {source_name}: {str(original_error)}"
        )

class ExtractionError(DataSourceException):
    """Erro ao extrair dados"""
    def __init__(self, source_name: str, message: str):
        self.source_name = source_name
        super().__init__(f"Extraction failed for {source_name}: {message}")

class MetricCalculationException(DomainException):
    """Exceções de cálculo de métricas"""
    pass

class InvalidDataError(MetricCalculationException):
    """Dados inválidos para cálculo"""
    def __init__(self, reason: str):
        self.reason = reason
        super().__init__(f"Invalid data for calculation: {reason}")

class InsufficientDataError(MetricCalculationException):
    """Dados insuficientes para cálculo"""
    def __init__(self, required: int, received: int):
        self.required = required
        self.received = received
        super().__init__(
            f"Insufficient data: required {required}, received {received}"
        )

# ✅ Tratamento específico e logging
import structlog

logger = structlog.get_logger()

def extract_and_calculate_metrics(
    data_source_id: str,
    metric_type: MetricType
) -> MetricResult:
    try:
        # Extrair dados
        data = extractor.extract(data_source_id)
        
        logger.info(
            "data_extracted",
            data_source_id=data_source_id,
            rows_count=len(data)
        )
        
        # Calcular métrica
        result = calculator.calculate(data, metric_type)
        
        logger.info(
            "metric_calculated",
            data_source_id=data_source_id,
            metric_type=metric_type.value,
            result=result.value
        )
        
        return result
        
    except ConnectionError as e:
        logger.error(
            "connection_failed",
            data_source_id=data_source_id,
            source_name=e.source_name,
            error=str(e.original_error)
        )
        raise HTTPException(
            status_code=503,
            detail=f"Data source {e.source_name} is currently unavailable"
        )
    
    except ExtractionError as e:
        logger.error(
            "extraction_failed",
            data_source_id=data_source_id,
            source_name=e.source_name,
            error=str(e)
        )
        raise HTTPException(
            status_code=400,
            detail=f"Failed to extract data: {str(e)}"
        )
    
    except InvalidDataError as e:
        logger.warning(
            "invalid_data",
            data_source_id=data_source_id,
            reason=e.reason
        )
        raise HTTPException(
            status_code=422,
            detail=f"Invalid data: {e.reason}"
        )
    
    except InsufficientDataError as e:
        logger.warning(
            "insufficient_data",
            data_source_id=data_source_id,
            required=e.required,
            received=e.received
        )
        raise HTTPException(
            status_code=422,
            detail=f"Not enough data for calculation"
        )
    
    except Exception as e:
        logger.error(
            "unexpected_error",
            data_source_id=data_source_id,
            error_type=type(e).__name__,
            error=str(e),
            exc_info=True
        )
        raise HTTPException(
            status_code=500,
            detail="Internal server error"
        )

# ✅ Context managers para recursos
from contextlib import contextmanager

@contextmanager
def database_connection(connection_string: str):
    """Context manager para conexões de banco"""
    engine = create_engine(connection_string)
    connection = engine.connect()
    try:
        yield connection
    except Exception as e:
        logger.error("database_error", error=str(e))
        raise
    finally:
        connection.close()
        engine.dispose()

# Uso
with database_connection(config.database_url) as conn:
    data = pd.read_sql("SELECT * FROM metrics", conn)
    # Connection é automaticamente fechada
```

---

## 🏛️ System Design

### Database Schema

```sql
-- Users & Authentication
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    full_name VARCHAR(255),
    role VARCHAR(50) NOT NULL DEFAULT 'viewer', -- admin, editor, viewer
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_role ON users(role);

-- Data Sources
CREATE TABLE data_sources (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    type VARCHAR(50) NOT NULL, -- api, database, csv, google_sheets, etc.
    description TEXT,
    config JSONB NOT NULL, -- Configuração específica do tipo
    credentials_encrypted TEXT, -- Credenciais encriptadas
    is_active BOOLEAN DEFAULT TRUE,
    last_sync_at TIMESTAMP,
    last_sync_status VARCHAR(50), -- success, failed, pending
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_data_sources_user_id ON data_sources(user_id);
CREATE INDEX idx_data_sources_type ON data_sources(type);
CREATE INDEX idx_data_sources_is_active ON data_sources(is_active);

-- Dashboards
CREATE TABLE dashboards (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    layout JSONB, -- Grid layout configuration
    refresh_interval INTEGER DEFAULT 300, -- seconds
    is_public BOOLEAN DEFAULT FALSE,
    is_favorite BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_dashboards_user_id ON dashboards(user_id);
CREATE INDEX idx_dashboards_is_public ON dashboards(is_public);
CREATE INDEX idx_dashboards_created_at ON dashboards(created_at DESC);

-- Widgets
CREATE TABLE widgets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    dashboard_id UUID NOT NULL REFERENCES dashboards(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    type VARCHAR(50) NOT NULL, -- line_chart, bar_chart, pie_chart, number, table
    position JSONB NOT NULL, -- {x, y, width, height}
    config JSONB NOT NULL, -- Widget-specific configuration
    data_source_id UUID REFERENCES data_sources(id) ON DELETE SET NULL,
    query TEXT, -- Query or data extraction logic
    refresh_interval INTEGER, -- Override dashboard refresh
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_widgets_dashboard_id ON widgets(dashboard_id);
CREATE INDEX idx_widgets_data_source_id ON widgets(data_source_id);

-- Metrics (TimescaleDB hypertable)
CREATE TABLE metrics (
    id UUID NOT NULL,
    widget_id UUID REFERENCES widgets(id) ON DELETE CASCADE,
    metric_name VARCHAR(255) NOT NULL,
    metric_value DOUBLE PRECISION NOT NULL,
    metric_type VARCHAR(50), -- sum, avg, count, min, max, percentile
    dimensions JSONB, -- Additional dimensions for grouping
    timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    
    PRIMARY KEY (id, timestamp)
);

-- Converter para hypertable (TimescaleDB)
SELECT create_hypertable('metrics', 'timestamp', if_not_exists => TRUE);

-- Índices para queries comuns
CREATE INDEX idx_metrics_widget_id ON metrics(widget_id, timestamp DESC);
CREATE INDEX idx_metrics_metric_name ON metrics(metric_name, timestamp DESC);

-- Continuous aggregates para performance (TimescaleDB)
CREATE MATERIALIZED VIEW metrics_hourly
WITH (timescaledb.continuous) AS
SELECT 
    widget_id,
    metric_name,
    time_bucket('1 hour', timestamp) AS bucket,
    AVG(metric_value) as avg_value,
    MIN(metric_value) as min_value,
    MAX(metric_value) as max_value,
    COUNT(*) as count
FROM metrics
GROUP BY widget_id, metric_name, bucket;

CREATE MATERIALIZED VIEW metrics_daily
WITH (timescaledb.continuous) AS
SELECT 
    widget_id,
    metric_name,
    time_bucket('1 day', timestamp) AS bucket,
    AVG(metric_value) as avg_value,
    MIN(metric_value) as min_value,
    MAX(metric_value) as max_value,
    COUNT(*) as count
FROM metrics
GROUP BY widget_id, metric_name, bucket;

-- Alerts
CREATE TABLE alerts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    widget_id UUID REFERENCES widgets(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    condition JSONB NOT NULL, -- {operator: 'gt', threshold: 100}
    severity VARCHAR(50) NOT NULL, -- critical, warning, info
    notification_channels JSONB, -- [email, slack, webhook]
    is_active BOOLEAN DEFAULT TRUE,
    last_triggered_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_alerts_user_id ON alerts(user_id);
CREATE INDEX idx_alerts_widget_id ON alerts(widget_id);
CREATE INDEX idx_alerts_is_active ON alerts(is_active);

-- Alert History
CREATE TABLE alert_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    alert_id UUID NOT NULL REFERENCES alerts(id) ON DELETE CASCADE,
    metric_value DOUBLE PRECISION NOT NULL,
    threshold DOUBLE PRECISION NOT NULL,
    message TEXT,
    acknowledged BOOLEAN DEFAULT FALSE,
    acknowledged_at TIMESTAMP,
    acknowledged_by UUID REFERENCES users(id) ON DELETE SET NULL,
    triggered_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_alert_history_alert_id ON alert_history(alert_id, triggered_at DESC);
CREATE INDEX idx_alert_history_acknowledged ON alert_history(acknowledged);

-- ETL Jobs
CREATE TABLE etl_jobs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    data_source_id UUID NOT NULL REFERENCES data_sources(id) ON DELETE CASCADE,
    job_type VARCHAR(50) NOT NULL, -- full_load, incremental, scheduled
    status VARCHAR(50) NOT NULL, -- pending, running, completed, failed
    started_at TIMESTAMP,
    completed_at TIMESTAMP,
    rows_processed INTEGER DEFAULT 0,
    rows_failed INTEGER DEFAULT 0,
    error_message TEXT,
    metadata JSONB, -- Job-specific metadata
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_etl_jobs_data_source_id ON etl_jobs(data_source_id);
CREATE INDEX idx_etl_jobs_status ON etl_jobs(status);
CREATE INDEX idx_etl_jobs_created_at ON etl_jobs(created_at DESC);

-- Audit Log
CREATE TABLE audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    entity_type VARCHAR(50) NOT NULL, -- dashboard, widget, data_source, alert
    entity_id UUID NOT NULL,
    action VARCHAR(50) NOT NULL, -- created, updated, deleted, viewed
    changes JSONB, -- {old_value, new_value}
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_audit_logs_entity ON audit_logs(entity_type, entity_id);
CREATE INDEX idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX idx_audit_logs_created_at ON audit_logs(created_at DESC);

-- Reports
CREATE TABLE reports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    dashboard_id UUID REFERENCES dashboards(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    format VARCHAR(50) NOT NULL, -- pdf, excel, csv
    schedule JSONB, -- Cron-like schedule
    recipients JSONB, -- Email addresses
    file_path TEXT, -- Path in object storage
    last_generated_at TIMESTAMP,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_reports_user_id ON reports(user_id);
CREATE INDEX idx_reports_dashboard_id ON reports(dashboard_id);
CREATE INDEX idx_reports_is_active ON reports(is_active);

-- Data Quality Checks
CREATE TABLE data_quality_checks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    data_source_id UUID NOT NULL REFERENCES data_sources(id) ON DELETE CASCADE,
    check_type VARCHAR(50) NOT NULL, -- null_check, duplicate_check, schema_check, range_check
    column_name VARCHAR(255),
    expectation JSONB NOT NULL, -- Great Expectations config
    last_run_at TIMESTAMP,
    last_status VARCHAR(50), -- passed, failed, skipped
    failure_count INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_data_quality_checks_data_source_id ON data_quality_checks(data_source_id);
CREATE INDEX idx_data_quality_checks_last_status ON data_quality_checks(last_status);
```

---

### Caching Strategy

```python
from typing import Optional, Any, Callable
import json
import redis
from functools import wraps
import hashlib

class CacheService:
    """
    Serviço de cache com múltiplas estratégias
    """
    
    def __init__(self, redis_client: redis.Redis):
        self.redis = redis_client
    
    # Cache key patterns
    DASHBOARD_KEY = "dashboard:{dashboard_id}"
    DASHBOARD_DATA_KEY = "dashboard:data:{dashboard_id}"
    WIDGET_DATA_KEY = "widget:data:{widget_id}"
    METRIC_KEY = "metric:{metric_name}:{time_range}"
    QUERY_RESULT_KEY = "query:{query_hash}"
    
    def get(self, key: str) -> Optional[Any]:
        """Retrieve from cache"""
        data = self.redis.get(key)
        if data:
            return json.loads(data)
        return None
    
    def set(
        self,
        key: str,
        value: Any,
        ttl: int = 300
    ) -> None:
        """Store in cache with TTL"""
        self.redis.setex(
            key,
            ttl,
            json.dumps(value, default=str)
        )
    
    def delete(self, key: str) -> None:
        """Remove from cache"""
        self.redis.delete(key)
    
    def invalidate_pattern(self, pattern: str) -> None:
        """Invalidate all keys matching pattern"""
        keys = self.redis.keys(pattern)
        if keys:
            self.redis.delete(*keys)
    
    def generate_query_hash(self, query: str, params: dict) -> str:
        """Generate hash for query caching"""
        query_string = f"{query}:{json.dumps(params, sort_keys=True)}"
        return hashlib.sha256(query_string.encode()).hexdigest()

# Decorator para cache automático
def cached(
    key_pattern: str,
    ttl: int = 300,
    key_builder: Optional[Callable] = None
):
    """
    Decorator para cache de funções
    
    Args:
        key_pattern: Pattern da chave (ex: "widget:data:{widget_id}")
        ttl: Time to live em segundos
        key_builder: Função customizada para construir a chave
    """
    def decorator(func):
        @wraps(func)
        async def wrapper(*args, **kwargs):
            # Construir chave do cache
            if key_builder:
                cache_key = key_builder(*args, **kwargs)
            else:
                # Usar primeiro argumento como ID
                cache_key = key_pattern.format(**kwargs)
            
            # Tentar buscar do cache
            cached_result = cache.get(cache_key)
            if cached_result:
                logger.debug("cache_hit", key=cache_key)
                return cached_result
            
            # Executar função
            logger.debug("cache_miss", key=cache_key)
            result = await func(*args, **kwargs)
            
            # Armazenar no cache
            cache.set(cache_key, result, ttl)
            
            return result
        return wrapper
    return decorator

# Cache com diferentes TTLs por tipo de dado
class CacheTTL:
    DASHBOARD_CONFIG = 3600  # 1 hora
    DASHBOARD_DATA = 300     # 5 minutos
    WIDGET_DATA = 180        # 3 minutos
    METRIC_CALCULATION = 60  # 1 minuto
    QUERY_RESULT = 600       # 10 minutos
    USER_SESSION = 86400     # 24 horas

# Uso
@cached(
    key_pattern="dashboard:data:{dashboard_id}",
    ttl=CacheTTL.DASHBOARD_DATA
)
async def get_dashboard_data(dashboard_id: str) -> DashboardData:
    # Lógica de busca dos dados
    return dashboard_data

@cached(
    key_pattern="widget:data:{widget_id}",
    ttl=CacheTTL.WIDGET_DATA
)
async def get_widget_data(widget_id: str) -> WidgetData:
    # Lógica de cálculo dos dados do widget
    return widget_data

# Cache invalidation strategy
class CacheInvalidationService:
    """Serviço para invalidação inteligente de cache"""
    
    def __init__(self, cache: CacheService):
        self.cache = cache
    
    def on_dashboard_updated(self, dashboard_id: str):
        """Invalidar cache quando dashboard é atualizado"""
        # Invalidar config do dashboard
        self.cache.delete(f"dashboard:{dashboard_id}")
        
        # Invalidar dados do dashboard
        self.cache.delete(f"dashboard:data:{dashboard_id}")
        
        # Invalidar widgets relacionados
        self.cache.invalidate_pattern(f"widget:data:*")
        
        logger.info("cache_invalidated", dashboard_id=dashboard_id)
    
    def on_data_source_synced(self, data_source_id: str):
        """Invalidar cache quando dados são sincronizados"""
        # Buscar widgets que usam essa fonte
        widgets = get_widgets_by_data_source(data_source_id)
        
        for widget in widgets:
            self.cache.delete(f"widget:data:{widget.id}")
            self.cache.delete(f"dashboard:data:{widget.dashboard_id}")
        
        logger.info(
            "cache_invalidated_after_sync",
            data_source_id=data_source_id,
            affected_widgets=len(widgets)
        )
```

---

### Query Optimization

```python
from sqlalchemy import select, func
from sqlalchemy.orm import Session
import pandas as pd

class OptimizedMetricRepository:
    """Repository com queries otimizadas"""
    
    def __init__(self, session: Session):
        self.session = session
    
    def get_metrics_by_time_range(
        self,
        widget_id: str,
        start_date: datetime,
        end_date: datetime,
        aggregation: str = "hour"
    ) -> pd.DataFrame:
        """
        Query otimizada usando continuous aggregates do TimescaleDB
        """
        if aggregation == "hour":
            # Usa materialized view pré-computada
            query = """
                SELECT 
                    bucket as timestamp,
                    avg_value,
                    min_value,
                    max_value,
                    count
                FROM metrics_hourly
                WHERE widget_id = :widget_id
                    AND bucket BETWEEN :start_date AND :end_date
                ORDER BY bucket
            """
        elif aggregation == "day":
            query = """
                SELECT 
                    bucket as timestamp,
                    avg_value,
                    min_value,
                    max_value,
                    count
                FROM metrics_daily
                WHERE widget_id = :widget_id
                    AND bucket BETWEEN :start_date AND :end_date
                ORDER BY bucket
            """
        else:
            # Raw data
            query = """
                SELECT 
                    timestamp,
                    metric_value,
                    dimensions
                FROM metrics
                WHERE widget_id = :widget_id
                    AND timestamp BETWEEN :start_date AND :end_date
                ORDER BY timestamp
            """
        
        return pd.read_sql(
            query,
            self.session.bind,
            params={
                "widget_id": widget_id,
                "start_date": start_date,
                "end_date": end_date
            }
        )
    
    def get_latest_metrics(
        self,
        widget_ids: List[str],
        limit: int = 1000
    ) -> pd.DataFrame:
        """
        Query otimizada para buscar últimas métricas de múltiplos widgets
        Usa DISTINCT ON para performance
        """
        query = """
            SELECT DISTINCT ON (widget_id)
                widget_id,
                metric_name,
                metric_value,
                timestamp
            FROM metrics
            WHERE widget_id = ANY(:widget_ids)
            ORDER BY widget_id, timestamp DESC
            LIMIT :limit
        """
        
        return pd.read_sql(
            query,
            self.session.bind,
            params={
                "widget_ids": widget_ids,
                "limit": limit
            }
        )
    
    def bulk_insert_metrics(
        self,
        metrics: List[Metric]
    ) -> int:
        """
        Bulk insert otimizado para inserir múltiplas métricas
        """
        if not metrics:
            return 0
        
        # Preparar dados para bulk insert
        data = [
            {
                "id": m.id,
                "widget_id": m.widget_id,
                "metric_name": m.metric_name,
                "metric_value": m.metric_value,
                "timestamp": m.timestamp
            }
            for m in metrics
        ]
        
        # Bulk insert com SQLAlchemy
        self.session.bulk_insert_mappings(MetricModel, data)
        self.session.commit()
        
        return len(metrics)

# Index optimization hints
"""
Índices importantes para performance:

1. Time-based queries:
   CREATE INDEX idx_metrics_timestamp ON metrics(timestamp DESC);

2. Widget filtering:
   CREATE INDEX idx_metrics_widget_time ON metrics(widget_id, timestamp DESC);

3. Composite index para queries comuns:
   CREATE INDEX idx_metrics_composite ON metrics(widget_id, metric_name, timestamp DESC);

4. Partial index para métricas recentes (mais acessadas):
   CREATE INDEX idx_metrics_recent ON metrics(widget_id, timestamp DESC)
   WHERE timestamp > NOW() - INTERVAL '7 days';

5. BRIN index para colunas de timestamp (muito eficiente):
   CREATE INDEX idx_metrics_brin_timestamp ON metrics USING BRIN(timestamp);
"""
```

---

## 🔒 Segurança

### Autenticação e Autorização

```python
from datetime import datetime, timedelta
from typing import Optional
from jose import JWTError, jwt
from passlib.context import CryptContext
from pydantic import BaseModel
from enum import Enum

# Configuration
SECRET_KEY = os.getenv("SECRET_KEY")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 30

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

class UserRole(str, Enum):
    ADMIN = "admin"
    EDITOR = "editor"
    VIEWER = "viewer"

class TokenData(BaseModel):
    user_id: str
    email: str
    role: UserRole
    exp: datetime

def create_access_token(user: User) -> str:
    """Create JWT access token"""
    expire = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    
    to_encode = {
        "sub": str(user.id),
        "email": user.email,
        "role": user.role,
        "exp": expire
    }
    
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)

# Role-based access control
from fastapi import Depends, HTTPException, status

def require_role(required_role: UserRole):
    """
    Dependency para verificar role do usuário
    
    Usage:
        @app.get("/admin")
        async def admin_route(
            user: TokenData = Depends(require_role(UserRole.ADMIN))
        ):
            return {"message": "Admin access granted"}
    """
    async def role_checker(
        current_user: TokenData = Depends(get_current_user)
    ) -> TokenData:
        role_hierarchy = {
            UserRole.VIEWER: 0,
            UserRole.EDITOR: 1,
            UserRole.ADMIN: 2
        }
        
        if role_hierarchy[current_user.role] < role_hierarchy[required_role]:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Requires {required_role.value} role or higher"
            )
        
        return current_user
    
    return role_checker

# Resource-level permissions
class PermissionService:
    """Serviço para verificar permissões em recursos específicos"""
    
    @staticmethod
    def can_view_dashboard(user: TokenData, dashboard: Dashboard) -> bool:
        """Verifica se usuário pode visualizar dashboard"""
        # Admin pode ver tudo
        if user.role == UserRole.ADMIN:
            return True
        
        # Dashboard público pode ser visto por todos
        if dashboard.is_public:
            return True
        
        # Dono pode ver
        if dashboard.user_id == user.user_id:
            return True
        
        # Verificar se foi compartilhado (implementar lógica)
        return False
    
    @staticmethod
    def can_edit_dashboard(user: TokenData, dashboard: Dashboard) -> bool:
        """Verifica se usuário pode editar dashboard"""
        # Admin pode editar tudo
        if user.role == UserRole.ADMIN:
            return True
        
        # Viewer não pode editar
        if user.role == UserRole.VIEWER:
            return False
        
        # Dono pode editar
        if dashboard.user_id == user.user_id:
            return True
        
        return False
    
    @staticmethod
    def can_delete_dashboard(user: TokenData, dashboard: Dashboard) -> bool:
        """Verifica se usuário pode deletar dashboard"""
        # Apenas admin ou dono
        return (
            user.role == UserRole.ADMIN or
            dashboard.user_id == user.user_id
        )

# Usage in endpoints
@app.get("/api/v1/dashboards/{dashboard_id}")
async def get_dashboard(
    dashboard_id: str,
    current_user: TokenData = Depends(get_current_user),
    repo: DashboardRepository = Depends()
):
    dashboard = repo.find_by_id(dashboard_id)
    
    if not dashboard:
        raise HTTPException(status_code=404, detail="Dashboard not found")
    
    # Verificar permissão
    if not PermissionService.can_view_dashboard(current_user, dashboard):
        raise HTTPException(
            status_code=403,
            detail="You don't have permission to view this dashboard"
        )
    
    return dashboard

@app.delete("/api/v1/dashboards/{dashboard_id}")
async def delete_dashboard(
    dashboard_id: str,
    current_user: TokenData = Depends(get_current_user),
    repo: DashboardRepository = Depends()
):
    dashboard = repo.find_by_id(dashboard_id)
    
    if not dashboard:
        raise HTTPException(status_code=404, detail="Dashboard not found")
    
    # Verificar permissão
    if not PermissionService.can_delete_dashboard(current_user, dashboard):
        raise HTTPException(
            status_code=403,
            detail="You don't have permission to delete this dashboard"
        )
    
    repo.delete(dashboard_id)
    
    return {"message": "Dashboard deleted successfully"}
```

---

### Data Source Credentials Encryption

```python
from cryptography.fernet import Fernet
import base64
import os

class CredentialEncryptionService:
    """Serviço para encriptar/decriptar credenciais de data sources"""
    
    def __init__(self):
        key = os.getenv("ENCRYPTION_KEY")
        if not key:
            raise ValueError("ENCRYPTION_KEY must be set")
        
        self.fernet = Fernet(key.encode())
    
    def encrypt_credentials(self, credentials: dict) -> str:
        """
        Encrypt data source credentials
        
        Args:
            credentials: Dict with sensitive data (API keys, passwords, etc.)
        
        Returns:
            Base64 encoded encrypted string
        """
        import json
        
        credentials_json = json.dumps(credentials)
        encrypted = self.fernet.encrypt(credentials_json.encode())
        return base64.urlsafe_b64encode(encrypted).decode()
    
    def decrypt_credentials(self, encrypted_credentials: str) -> dict:
        """
        Decrypt data source credentials
        
        Args:
            encrypted_credentials: Base64 encoded encrypted string
        
        Returns:
            Dict with decrypted credentials
        """
        import json
        
        encrypted_bytes = base64.urlsafe_b64decode(encrypted_credentials.encode())
        decrypted = self.fernet.decrypt(encrypted_bytes)
        return json.loads(decrypted.decode())

# Usage in data source model
from sqlalchemy import Column, String, TypeDecorator

class EncryptedCredentials(TypeDecorator):
    """SQLAlchemy custom type for encrypted credentials"""
    impl = String
    cache_ok = True
    
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.encryption_service = CredentialEncryptionService()
    
    def process_bind_param(self, value, dialect):
        """Encrypt before storing"""
        if value is not None and isinstance(value, dict):
            return self.encryption_service.encrypt_credentials(value)
        return value
    
    def process_result_value(self, value, dialect):
        """Decrypt when retrieving"""
        if value is not None:
            return self.encryption_service.decrypt_credentials(value)
        return value

# Model
class DataSource(Base):
    __tablename__ = "data_sources"
    
    id = Column(String, primary_key=True)
    name = Column(String)
    type = Column(String)
    
    # Automatically encrypted/decrypted
    credentials = Column(EncryptedCredentials(1000))

# Usage
data_source = DataSource(
    name="Production DB",
    type="postgresql",
    credentials={
        "host": "db.example.com",
        "port": 5432,
        "username": "admin",
        "password": "super_secret_password",
        "database": "prod_db"
    }
)

session.add(data_source)
session.commit()

# Credentials são automaticamente encriptadas no banco
# e decriptadas ao buscar
retrieved = session.query(DataSource).first()
print(retrieved.credentials)  # Dict decriptado
```

---

### Input Validation & SQL Injection Prevention

```python
from pydantic import BaseModel, validator, Field
from typing import Optional, List
import re

class CreateDashboardRequest(BaseModel):
    """Request com validação rigorosa"""
    name: str = Field(..., min_length=1, max_length=255)
    description: Optional[str] = Field(None, max_length=5000)
    layout: dict = Field(...)
    refresh_interval: int = Field(default=300, ge=60, le=86400)
    
    @validator("name")
    def validate_name(cls, v):
        """Validar nome do dashboard"""
        # Remove caracteres especiais perigosos
        if not re.match(r"^[a-zA-Z0-9\s\-_]+$", v):
            raise ValueError(
                "Dashboard name can only contain letters, numbers, spaces, hyphens and underscores"
            )
        return v.strip()
    
    @validator("description")
    def sanitize_description(cls, v):
        """Sanitizar descrição"""
        if v:
            # Remove HTML tags
            v = re.sub(r"<[^>]+>", "", v)
            # Remove scripts
            v = re.sub(r"<script.*?</script>", "", v, flags=re.DOTALL)
            return v.strip()
        return v
    
    @validator("layout")
    def validate_layout(cls, v):
        """Validar estrutura do layout"""
        if not isinstance(v, dict):
            raise ValueError("Layout must be a valid JSON object")
        
        # Validar estrutura esperada
        if "widgets" not in v or not isinstance(v["widgets"], list):
            raise ValueError("Layout must contain a 'widgets' array")
        
        return v

class WidgetQueryRequest(BaseModel):
    """Request para query de widget com validação de SQL"""
    query: str = Field(..., min_length=1, max_length=10000)
    
    @validator("query")
    def validate_sql_query(cls, v):
        """Validar query SQL para prevenir SQL injection"""
        # Whitelist de comandos permitidos
        allowed_keywords = ["SELECT", "FROM", "WHERE", "JOIN", "GROUP BY", "ORDER BY", "LIMIT"]
        
        # Blacklist de comandos perigosos
        dangerous_keywords = [
            "DROP", "DELETE", "INSERT", "UPDATE", "ALTER", "CREATE",
            "TRUNCATE", "EXEC", "EXECUTE", "GRANT", "REVOKE"
        ]
        
        query_upper = v.upper()
        
        # Verificar se contém comandos perigosos
        for keyword in dangerous_keywords:
            if keyword in query_upper:
                raise ValueError(
                    f"Query contains forbidden keyword: {keyword}"
                )
        
        # Verificar se começa com SELECT
        if not query_upper.strip().startswith("SELECT"):
            raise ValueError("Only SELECT queries are allowed")
        
        # Verificar por comentários SQL suspeitos
        if "--" in v or "/*" in v or "*/" in v:
            raise ValueError("SQL comments are not allowed")
        
        return v.strip()

# Sempre usar queries parametrizadas
class SafeQueryExecutor:
    """Executor de queries com proteção contra SQL injection"""
    
    @staticmethod
    def execute_safe_query(
        connection,
        base_query: str,
        params: dict
    ) -> pd.DataFrame:
        """
        Executa query de forma segura usando parametrização
        
        NUNCA concatene valores diretamente na query!
        """
        # ✅ BOM - Parametrizado
        safe_query = text(base_query)
        result = connection.execute(safe_query, params)
        
        return pd.DataFrame(result.fetchall())
    
    @staticmethod
    def validate_identifier(identifier: str) -> str:
        """
        Valida identificadores (nomes de tabelas/colunas)
        para uso em queries dinâmicas
        """
        # Apenas alfanuméricos e underscore
        if not re.match(r"^[a-zA-Z_][a-zA-Z0-9_]*$", identifier):
            raise ValueError(f"Invalid identifier: {identifier}")
        
        return identifier

# Exemplo de uso seguro
def get_metrics_by_widget(
    widget_id: str,
    start_date: datetime,
    end_date: datetime
) -> pd.DataFrame:
    """Query segura com parametrização"""
    
    # ✅ Query parametrizada
    query = """
        SELECT 
            timestamp,
            metric_value,
            metric_name
        FROM metrics
        WHERE widget_id = :widget_id
            AND timestamp BETWEEN :start_date AND :end_date
        ORDER BY timestamp
    """
    
    params = {
        "widget_id": widget_id,
        "start_date": start_date,
        "end_date": end_date
    }
    
    return pd.read_sql(query, engine, params=params)

# ❌ NUNCA FAÇA ISSO!
def unsafe_query(widget_id: str):
    # SQL Injection vulnerability!
    query = f"SELECT * FROM metrics WHERE widget_id = '{widget_id}'"
    return pd.read_sql(query, engine)
```

---

## 🧪 Testes

### Estrutura de Testes

```python
# tests/unit/domain/test_metric.py
import pytest
from decimal import Decimal
from src.domain.entities.metric import Metric
from src.domain.value_objects.metric_value import MetricValue
from src.domain.exceptions import InvalidMetricError

class TestMetric:
    """Unit tests for Metric entity"""
    
    def test_create_metric_with_valid_data(self):
        """Should create metric with valid data"""
        metric = Metric(
            name="revenue",
            value=MetricValue(Decimal("1000.50")),
            timestamp=datetime.now()
        )
        
        assert metric.name == "revenue"
        assert metric.value.value == Decimal("1000.50")
    
    def test_create_metric_with_negative_value(self):
        """Should allow negative values for certain metrics"""
        metric = Metric(
            name="profit",
            value=MetricValue(Decimal("-100.00")),
            timestamp=datetime.now()
        )
        
        assert metric.value.value == Decimal("-100.00")
    
    def test_create_metric_with_nan_should_fail(self):
        """Should raise error for NaN values"""
        with pytest.raises(InvalidMetricError):
            Metric(
                name="revenue",
                value=MetricValue(float('nan')),
                timestamp=datetime.now()
            )
    
    @pytest.mark.parametrize("name,expected_valid", [
        ("revenue", True),
        ("total_sales", True),
        ("mrr", True),
        ("", False),
        (None, False),
        ("invalid name with spaces!", False),
    ])
    def test_metric_name_validation(self, name, expected_valid):
        """Should validate metric name format"""
        if expected_valid:
            metric = Metric(
                name=name,
                value=MetricValue(100),
                timestamp=datetime.now()
            )
            assert metric.name == name
        else:
            with pytest.raises(ValueError):
                Metric(
                    name=name,
                    value=MetricValue(100),
                    timestamp=datetime.now()
                )

# tests/integration/test_etl_pipeline.py
import pytest
from src.infrastructure.etl.extractors.csv_extractor import CSVExtractor
from src.infrastructure.etl.transformers.cleaner import DataCleaner
from src.infrastructure.etl.loaders.warehouse_loader import WarehouseLoader

@pytest.fixture
def sample_csv_file(tmp_path):
    """Create temporary CSV file for testing"""
    csv_content = """date,revenue,customers
2024-01-01,1000,50
2024-01-02,1500,75
2024-01-03,,60
2024-01-04,2000,80"""
    
    file_path = tmp_path / "test_data.csv"
    file_path.write_text(csv_content)
    return str(file_path)

class TestETLPipeline:
    """Integration tests for ETL pipeline"""
    
    @pytest.mark.asyncio
    async def test_full_etl_pipeline(
        self,
        sample_csv_file,
        db_session
    ):
        """Should execute complete ETL pipeline"""
        # Extract
        extractor = CSVExtractor()
        raw_data = extractor.extract({"filepath": sample_csv_file})
        
        assert len(raw_data) == 4
        assert "revenue" in raw_data.columns
        
        # Transform
        cleaner = DataCleaner()
        cleaned_data = cleaner.clean(raw_data)
        
        # Should fill missing values
        assert cleaned_data["revenue"].isna().sum() == 0
        
        # Load
        loader = WarehouseLoader(db_session)
        rows_loaded = loader.load(cleaned_data, "test_metrics")
        
        assert rows_loaded == 4
        
        # Verify data in database
        result = db_session.execute(
            "SELECT COUNT(*) FROM test_metrics"
        ).scalar()
        
        assert result == 4

# tests/e2e/test_dashboard_flow.py
@pytest.mark.e2e
class TestDashboardFlow:
    """End-to-end tests for dashboard creation and visualization"""
    
    @pytest.mark.asyncio
    async def test_complete_dashboard_workflow(
        self,
        client,
        auth_headers,
        test_data_source
    ):
        """
        Test complete flow:
        1. Create dashboard
        2. Add widget
        3. Sync data
        4. View dashboard data
        """
        # 1. Create dashboard
        dashboard_payload = {
            "name": "Sales Dashboard",
            "description": "Monthly sales metrics",
            "layout": {"widgets": []},
            "refresh_interval": 300
        }
        
        response = await client.post(
            "/api/v1/dashboards",
            json=dashboard_payload,
            headers=auth_headers
        )
        
        assert response.status_code == 201
        dashboard = response.json()
        dashboard_id = dashboard["id"]
        
        # 2. Add widget
        widget_payload = {
            "name": "Total Revenue",
            "type": "number",
            "position": {"x": 0, "y": 0, "width": 4, "height": 2},
            "config": {
                "metric": "revenue",
                "aggregation": "sum"
            },
            "data_source_id": test_data_source.id,
            "query": "SELECT SUM(revenue) as revenue FROM sales"
        }
        
        response = await client.post(
            f"/api/v1/dashboards/{dashboard_id}/widgets",
            json=widget_payload,
            headers=auth_headers
        )
        
        assert response.status_code == 201
        widget = response.json()
        
        # 3. Trigger data sync
        response = await client.post(
            f"/api/v1/data-sources/{test_data_source.id}/sync",
            headers=auth_headers
        )
        
        assert response.status_code == 202
        
        # Wait for sync to complete (in real test, use polling or webhooks)
        await asyncio.sleep(2)
        
        # 4. Get dashboard data
        response = await client.get(
            f"/api/v1/dashboards/{dashboard_id}/data",
            headers=auth_headers
        )
        
        assert response.status_code == 200
        data = response.json()
        
        assert "widgets" in data
        assert len(data["widgets"]) == 1
        assert data["widgets"][0]["id"] == widget["id"]
        assert "data" in data["widgets"][0]
```

---

## 📊 Observabilidade

### Structured Logging

```python
import structlog
from contextvars import ContextVar

# Context variables for request tracing
request_id_var: ContextVar[str] = ContextVar("request_id", default="")
user_id_var: ContextVar[str] = ContextVar("user_id", default="")

# Configure structlog
structlog.configure(
    processors=[
        structlog.contextvars.merge_contextvars,
        structlog.stdlib.filter_by_level,
        structlog.processors.TimeStamper(fmt="iso"),
        structlog.stdlib.add_logger_name,
        structlog.stdlib.add_log_level,
        structlog.processors.StackInfoRenderer(),
        structlog.processors.format_exc_info,
        structlog.processors.JSONRenderer()
    ],
    wrapper_class=structlog.stdlib.BoundLogger,
    logger_factory=structlog.stdlib.LoggerFactory(),
)

logger = structlog.get_logger()

# Middleware para adicionar request_id
from starlette.middleware.base import BaseHTTPMiddleware
import uuid

class RequestLoggingMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request, call_next):
        request_id = str(uuid.uuid4())
        request_id_var.set(request_id)
        
        # Log request
        logger.info(
            "request_started",
            method=request.method,
            path=request.url.path,
            request_id=request_id
        )
        
        start_time = time.time()
        
        response = await call_next(request)
        
        duration = time.time() - start_time
        
        # Log response
        logger.info(
            "request_completed",
            method=request.method,
            path=request.url.path,
            status_code=response.status_code,
            duration=duration,
            request_id=request_id
        )
        
        response.headers["X-Request-ID"] = request_id
        
        return response

# Usage in code
logger.info(
    "dashboard_created",
    dashboard_id=dashboard.id,
    user_id=current_user.user_id,
    widget_count=len(dashboard.widgets)
)

logger.error(
    "data_extraction_failed",
    data_source_id=data_source.id,
    error_type=type(e).__name__,
    error_message=str(e),
    exc_info=True
)
```

### Metrics com Prometheus

```python
from prometheus_client import Counter, Histogram, Gauge, Summary

# Define metrics
dashboards_created_total = Counter(
    "dashboards_created_total",
    "Total number of dashboards created",
    ["user_role"]
)

etl_jobs_total = Counter(
    "etl_jobs_total",
    "Total number of ETL jobs executed",
    ["data_source_type", "status"]
)

metric_calculation_duration = Histogram(
    "metric_calculation_duration_seconds",
    "Time spent calculating metrics",
    ["metric_type"],
    buckets=[0.1, 0.5, 1.0, 2.0, 5.0, 10.0]
)

query_execution_duration = Histogram(
    "query_execution_duration_seconds",
    "Database query execution time",
    ["query_type"]
)

active_widgets = Gauge(
    "active_widgets",
    "Number of active widgets across all dashboards"
)

cache_hit_rate = Gauge(
    "cache_hit_rate",
    "Cache hit rate percentage"
)

# Usage
@metric_calculation_duration.labels(metric_type="revenue").time()
def calculate_revenue_metric(data):
    # Calculation logic
    return result

# Increment counters
dashboards_created_total.labels(user_role="admin").inc()

etl_jobs_total.labels(
    data_source_type="api",
    status="success"
).inc()

# Update gauges
active_widgets.set(get_active_widget_count())
cache_hit_rate.set(calculate_cache_hit_rate())

# Expose metrics
from prometheus_client import generate_latest

@app.get("/metrics")
async def metrics():
    return Response(
        generate_latest(),
        media_type="text/plain"
    )
```

---

## 🚀 Deploy

### Docker Setup

```dockerfile
# Dockerfile
FROM python:3.11-slim

WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y \
    postgresql-client \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements
COPY requirements.txt .

# Install Python dependencies
RUN pip install --no-cache-dir -r requirements.txt

# Copy application code
COPY src/ ./src/
COPY alembic.ini .
COPY migrations/ ./migrations/

# Run migrations and start app
CMD alembic upgrade head && \
    uvicorn src.presentation.api.main:app --host 0.0.0.0 --port 8000
```

```yaml
# docker-compose.yml
version: '3.8'

services:
  db:
    image: timescale/timescaledb:latest-pg15
    environment:
      POSTGRES_USER: kpi_user
      POSTGRES_PASSWORD: kpi_password
      POSTGRES_DB: kpi_dashboard
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data
  
  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
    volumes:
      - redis_data:/data
  
  minio:
    image: minio/minio
    command: server /data --console-address ":9001"
    environment:
      MINIO_ROOT_USER: minioadmin
      MINIO_ROOT_PASSWORD: minioadmin
    ports:
      - "9000:9000"
      - "9001:9001"
    volumes:
      - minio_data:/data
  
  app:
    build: .
    ports:
      - "8000:8000"
    environment:
      DATABASE_URL: postgresql://kpi_user:kpi_password@db:5432/kpi_dashboard
      REDIS_URL: redis://redis:6379/0
      SECRET_KEY: your-secret-key-here
      ENCRYPTION_KEY: your-encryption-key-here
    depends_on:
      - db
      - redis
      - minio
  
  celery_worker:
    build: .
    command: celery -A src.infrastructure.messaging.celery_config worker --loglevel=info
    environment:
      DATABASE_URL: postgresql://kpi_user:kpi_password@db:5432/kpi_dashboard
      REDIS_URL: redis://redis:6379/0
    depends_on:
      - db
      - redis
  
  celery_beat:
    build: .
    command: celery -A src.infrastructure.messaging.celery_config beat --loglevel=info
    environment:
      DATABASE_URL: postgresql://kpi_user:kpi_password@db:5432/kpi_dashboard
      REDIS_URL: redis://redis:6379/0
    depends_on:
      - db
      - redis

volumes:
  postgres_data:
  redis_data:
  minio_data:
```

---

## 📚 Documentação

### README.md

```markdown
# 📊 Dashboard de KPIs e Métricas de Negócio

[![CI/CD](https://github.com/yourusername/kpi-dashboard/workflows/CI/CD/badge.svg)](https://github.com/yourusername/kpi-dashboard/actions)
[![Coverage](https://codecov.io/gh/yourusername/kpi-dashboard/branch/main/graph/badge.svg)](https://codecov.io/gh/yourusername/kpi-dashboard)
[![Python 3.11+](https://img.shields.io/badge/python-3.11+-blue.svg)](https://www.python.org/downloads/)

Plataforma de Business Intelligence para visualização de KPIs e métricas de negócio, com integração automática de múltiplas fontes de dados.

## 🎯 Features

- ✅ Dashboards interativos customizáveis
- ✅ Múltiplos tipos de widgets (gráficos, tabelas, KPIs)
- ✅ Integração com APIs, bancos de dados, planilhas
- ✅ ETL automatizado e agendado
- ✅ Alertas baseados em thresholds
- ✅ Relatórios em PDF/Excel
- ✅ Real-time updates via WebSocket
- ✅ Role-based access control

## 🏗️ Arquitetura

Clean Architecture com camadas bem definidas:
- **Presentation**: FastAPI + WebSocket + React
- **Application**: Use Cases & Business Logic
- **Domain**: Entities & Business Rules
- **Infrastructure**: DB, Cache, ETL, Integrations

## 🛠️ Stack

- **Backend**: Python 3.11, FastAPI
- **Database**: PostgreSQL + TimescaleDB
- **Cache**: Redis
- **Queue**: Celery + RabbitMQ
- **Storage**: MinIO
- **Frontend**: React + TypeScript (opcional)

## 🚀 Quick Start

```bash
# Clone
git clone https://github.com/yourusername/kpi-dashboard.git
cd kpi-dashboard

# Com Docker
docker-compose up -d

# Acesse
http://localhost:8000/docs
```

## 📖 Documentação Completa

Ver [ROADMAP.md](ROADMAP.md) para detalhes de desenvolvimento.

## 📝 License

MIT License
```

---

## ✅ Checklist de Conclusão

- [ ] Todas as 16 semanas completadas
- [ ] Testes > 85% coverage
- [ ] CI/CD funcionando
- [ ] Deploy em produção
- [ ] Documentação completa
- [ ] Demo video gravado
- [ ] README profissional
- [ ] LinkedIn post publicado

---

**Duração total**: 16 semanas (4 meses)
**Nível de complexidade**: Alto
**Impacto no portfólio**: Muito Alto

Este projeto demonstra:
- Data Engineering skills
- ETL pipeline development
- Business Intelligence
- Clean Architecture
- Security best practices
- Scalable system design

**Boa sorte no desenvolvimento! 📊🚀**
