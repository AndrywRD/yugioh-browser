# COMO O SISTEMA FUNCIONA (GUIA COMPLETO)

Este documento explica o funcionamento real do projeto `kpi-dashboard` no estado atual do codigo.

## 1. Visao geral

O sistema e uma plataforma de BI com:

- Backend FastAPI
- Frontend React + TypeScript
- Banco relacional (SQLite local no desenvolvimento atual, com suporte planejado para Postgres/Timescale)
- ETL para importar dados de fontes externas
- Camada de autenticacao JWT
- Alertas, relatorios e websocket

Arquitetura em camadas:

- `src/domain`: regras de negocio puras
- `src/application`: casos de uso e servicos
- `src/infrastructure`: banco, ETL, conectores, cache, mensageria
- `src/presentation`: API FastAPI, schemas, middlewares, websocket

## 2. Componentes principais

### Backend

- Entrada da API: `src/presentation/api/main.py`
- Rotas REST: `src/presentation/api/routers/`
- Persistencia: `src/infrastructure/persistence/`
- ETL: `src/infrastructure/etl/`

### Frontend

- App principal: `frontend/src/App.tsx`
- Tela de dashboards: `frontend/src/pages/DashboardListPage.tsx`
- Tela de detalhe: `frontend/src/pages/DashboardDetailPage.tsx`
- Tela de data sources: `frontend/src/pages/DataSourcesPage.tsx`

## 3. Fluxo de autenticacao

1. Usuario faz login em `POST /api/v1/auth/login`.
2. API retorna `access_token` JWT.
3. Frontend salva token e envia `Authorization: Bearer <token>`.
4. Endpoints protegidos usam dependencias de auth em `src/presentation/api/dependencies.py`.

Usuario default local:

- email: `admin@example.com`
- senha: `admin123`

## 4. Fluxo de dashboards

### Criar dashboard

- Endpoint: `POST /api/v1/dashboards`
- Frontend usa em `createDashboard()`

### Listar dashboards

- Endpoint: `GET /api/v1/dashboards`
- Frontend mostra na lista principal

### Abrir dashboard

- Endpoint: `GET /api/v1/dashboards/{id}/data`
- Backend monta resposta com widgets e ultima metrica de cada widget

Importante:

- O dashboard mostra metrica vindo da tabela `metrics`.
- Se widget nao tiver metrica salva, aparece vazio.

## 5. Fluxo de widgets

Widgets podem ser criados por:

- `POST /api/v1/widgets`
- `POST /api/v1/dashboards/{dashboard_id}/widgets`

Tambem existem:

- `GET /api/v1/widgets/{id}`
- `PUT /api/v1/widgets/{id}`
- `DELETE /api/v1/widgets/{id}`
- `POST /api/v1/widgets/{id}/refresh`

No frontend atual, ainda nao ha tela completa de CRUD de widget. A criacao pratica principal hoje e por API (`/docs`) ou pelo endpoint acoplado ao dashboard.

## 6. Fluxo de metricas

Endpoints principais:

- `POST /api/v1/metrics/calculate`
- `GET /api/v1/metrics/{metric_name}/history`
- `POST /api/v1/metrics/compare`
- `GET /api/v1/metrics/{metric_name}/trend`

`/metrics/calculate` cria registro em `metrics`. Esse e o caminho que alimenta visualizacao de KPI no dashboard hoje.

## 7. Fluxo de Data Sources e ETL

## 7.1 O que e um Data Source

Data source e um cadastro de origem de dados externa, com:

- `name`
- `type` (`csv`, `api`, `database`, `google_sheets`)
- `config` (obrigatorio na pratica para sync funcionar)
- `credentials` (opcional)

## 7.2 Endpoints

- `POST /api/v1/data-sources`
- `POST /api/v1/data-sources/upload-csv` (multipart upload)
- `GET /api/v1/data-sources`
- `PUT /api/v1/data-sources/{id}`
- `DELETE /api/v1/data-sources/{id}`
- `POST /api/v1/data-sources/{id}/test`
- `POST /api/v1/data-sources/{id}/sync`

## 7.3 O que acontece no sync

Quando chama `POST /sync`:

1. Backend valida `config` conforme tipo.
2. Tenta enfileirar task no Celery.
3. Se Celery/Redis estiver indisponivel, faz fallback e roda ETL local.
4. Atualiza `last_sync_status`.

### Validacoes de config no estado atual

- `csv`: precisa `config.filepath` e arquivo existente
- `api`: precisa `config.endpoint`
- `database`: precisa `config.connection_string` e `config.query`
- `google_sheets`: precisa `config.rows` (placeholder atual)

## 7.4 Resultado do ETL

No estado atual, o ETL grava em tabela dinamica:

- `data_source_<id>`

e guarda cache de resultado transformado.

Importante:

- ETL tambem converte automaticamente o dataframe transformado em registros na tabela `metrics`.
- Essa conversao e feita para widgets ligados ao `data_source_id`.
- Assim, apos `sync`, widgets conectados a fonte passam a receber metricas sem etapa manual de `/metrics/calculate`.

## 8. Como usar o sistema na pratica hoje

## 8.1 Caminho rapido (demo)

1. Rodar:
   - `python scripts/seed_db.py`
   - `python scripts/create_sample_data.py`
2. Iniciar backend e frontend
3. Login com usuario admin
4. Abrir dashboard de exemplo

## 8.2 Caminho com CSV proprio

Opcao A (recomendada): Upload pelo endpoint/UI

1. Envie o arquivo em `POST /api/v1/data-sources/upload-csv` com multipart:
   - campo `name`
   - campo `description` (opcional)
   - campo `file` (`.csv`)

2. O backend salva em `storage/data_sources/<user_id>/...csv` e preenche `config.filepath` automaticamente.

3. Rode `POST /api/v1/data-sources/{id}/sync`.

4. Se houver widgets apontando para esse data source, o ETL gera metricas automaticamente em `metrics`.

Opcao B (manual): criar data source com `config.filepath`

```json
{
  "name": "Meu CSV",
  "type": "csv",
  "config": {
    "filepath": "C:/Users/andryw/Desktop/Projetos/dashboard kpi/meus_dados.csv"
  }
}
```

Depois rode `POST /api/v1/data-sources/{id}/sync`.

## 9. Frontend: o que esta pronto e o que falta

Pronto:

- Login
- Lista e criacao de dashboard
- Detalhe do dashboard
- Tela de data sources com upload CSV e botao de sync

Limitacoes atuais:

- Sem editor completo de widget na UI
- Para tipos `api` e `database`, a UI ainda nao expoe editor de `config`; nesses casos o ajuste e via API

## 10. Erros comuns e significado

### Erro: `CSV data source requires config.filepath`

Causa: data source CSV sem `config.filepath`.

### Erro: `CSV file not found`

Causa: caminho informado nao existe no disco.

### Erro de Redis/Celery (`Connection refused localhost:6379`)

Causa: broker/backend da fila nao esta ativo.
Comportamento atual: API tenta fallback local para executar ETL.

## 11. Estado atual x Roadmap

O projeto esta funcional ponta a ponta para demonstracao e testes, mas ainda ha gaps para fluxo BI totalmente automatico:

- Configurador visual de widget e query
- Pipeline completo de ingestao para dashboard sem passos manuais

## 12. Checklist de operacao diaria

1. Subir backend
2. Fazer login
3. Criar/validar data source (upload CSV ou config correta)
4. Rodar sync
5. Criar/atualizar widgets
6. Verificar se widgets vinculados receberam metricas apos sync
7. Abrir dashboard e validar visualizacao

---

Se quiser, o proximo passo tecnico recomendado e:

1. implementar editor visual de widget (config de metrica/aggregacao/query)
2. adicionar mapeador de schema para tipos `api` e `database` na UI
3. enriquecer serie temporal para graficos diretamente no dashboard
