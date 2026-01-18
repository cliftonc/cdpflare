# icelight

Stream JSON analytics events to Apache Iceberg tables on Cloudflare's data platform.

## Overview

icelight provides a complete solution for collecting analytics events and storing them in queryable Iceberg tables using Cloudflare's infrastructure:

- **Event Ingestion**: RudderStack/Segment-compatible HTTP endpoints
- **Data Storage**: Apache Iceberg tables on R2 with automatic compaction
- **Query API**: SQL queries via R2 SQL or external engines (PyIceberg, DuckDB, Spark)

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│   Your App /    │────▶│  Event Ingest   │────▶│   Cloudflare    │
│  Analytics SDK  │     │    Worker       │     │    Pipeline     │
└─────────────────┘     └─────────────────┘     └────────┬────────┘
                                                         │
                        ┌─────────────────┐     ┌────────▼────────┐
                        │   Query API     │◀────│  R2 + Iceberg   │
                        │    Worker       │     │   Data Catalog  │
                        └─────────────────┘     └─────────────────┘
```

## Prerequisites

Before you begin, you'll need:

### 1. Cloudflare Account

Sign up for a free Cloudflare account at **[dash.cloudflare.com/sign-up](https://dash.cloudflare.com/sign-up)**

> **Note**: R2 and Pipelines are available on all plans, including free. You may need to add a payment method to enable R2.

### 2. Node.js & pnpm

- **Node.js 18+**: [nodejs.org](https://nodejs.org/)
- **pnpm 8+**: `npm install -g pnpm`

## Quick Start

### Step 1: Clone & Install

```bash
git clone https://github.com/your-org/icelight.git
cd icelight
pnpm install
```

### Step 2: Login to Cloudflare

The setup script requires authentication with Cloudflare. Run:

```bash
npx wrangler login
```

This opens a browser window to authorize wrangler. Once complete, you'll see a success message.

### Step 3: Setup Infrastructure

Run the setup script to create all Cloudflare resources and configure workers:

```bash
pnpm launch
```

You'll be prompted to enter a project name (e.g., `myproject`). The script will:

1. Check you're logged in to Cloudflare
2. Create an R2 bucket with Data Catalog enabled
3. Create a Pipeline stream with the event schema
4. Create a sink to write Parquet files to R2
5. Create a pipeline connecting the stream to the sink
6. **Automatically generate `wrangler.local.jsonc`** files for both workers with the correct configuration

> **Note**: The generated `wrangler.local.jsonc` files are gitignored and contain your account-specific pipeline bindings and warehouse settings.

### Step 4: Deploy Ingest Worker

```bash
pnpm deploy:ingest
```

You'll see output with your worker URL:
```
Deployed icelight-event-ingest triggers
  https://icelight-event-ingest.YOUR-SUBDOMAIN.workers.dev
```

### Step 5: Test Ingestion

Send a test event:

```bash
curl -X POST https://icelight-event-ingest.YOUR-SUBDOMAIN.workers.dev/v1/track \
  -H "Content-Type: application/json" \
  -d '{"userId":"test-user","event":"Test Event","properties":{"key":"value"}}'
```

You should receive: `{"success":true,"count":1}`

### Step 6: Deploy Query API (Optional)

The `pnpm launch` script already configured the Query API worker with the correct warehouse name and set the required secrets (`CF_ACCOUNT_ID` and `CF_API_TOKEN`). Just deploy:

```bash
pnpm deploy:query
```

> **Note**: If you skipped the Query API setup during `pnpm launch`, you can run the script again or manually set secrets:
> ```bash
> npx wrangler secret put CF_ACCOUNT_ID -c workers/query-api/wrangler.local.jsonc
> npx wrangler secret put CF_API_TOKEN -c workers/query-api/wrangler.local.jsonc
> ```

### Step 7: Test Query API

```bash
# Check health
curl https://icelight-query-api.YOUR-SUBDOMAIN.workers.dev/health

# Query events (after pipeline has processed data - may take a minute)
curl -X POST https://icelight-query-api.YOUR-SUBDOMAIN.workers.dev/query \
  -H "Content-Type: application/json" \
  -d '{"sql": "SELECT * FROM analytics.events LIMIT 10"}'
```

## SDK Integration

### RudderStack / Segment

```javascript
import { Analytics } from '@rudderstack/analytics-js';

const analytics = new Analytics({
  writeKey: 'any-value', // Required by SDK, not validated if AUTH_ENABLED=false
  dataPlaneUrl: 'https://icelight-event-ingest.YOUR-SUBDOMAIN.workers.dev'
});

// Track events
analytics.track('Purchase Completed', {
  orderId: '12345',
  revenue: 99.99
});

// Identify users
analytics.identify('user-123', {
  email: 'user@example.com',
  plan: 'premium'
});
```

### Direct HTTP

```bash
# Track event
curl -X POST https://YOUR-WORKER.workers.dev/v1/track \
  -H "Content-Type: application/json" \
  -d '{"userId":"user-123","event":"Button Clicked","properties":{"button":"signup"}}'

# Batch events
curl -X POST https://YOUR-WORKER.workers.dev/v1/batch \
  -H "Content-Type: application/json" \
  -d '{"batch":[
    {"type":"track","userId":"u1","event":"Page View"},
    {"type":"identify","userId":"u1","traits":{"name":"John"}}
  ]}'
```

## API Endpoints

### Ingestion Worker

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/v1/batch` | POST | Batch events (primary) |
| `/v1/track` | POST | Single track event |
| `/v1/identify` | POST | Single identify event |
| `/v1/page` | POST | Single page event |
| `/v1/screen` | POST | Single screen event |
| `/v1/group` | POST | Single group event |
| `/v1/alias` | POST | Single alias event |
| `/health` | GET | Health check |

## Configuration

### Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `AUTH_ENABLED` | `false` | Require authentication |
| `AUTH_TOKEN` | - | API token (set as secret if auth enabled) |
| `ALLOWED_ORIGINS` | `*` | CORS allowed origins (comma-separated) |

### Enable Authentication

```bash
# Edit workers/event-ingest/wrangler.local.jsonc and set AUTH_ENABLED to "true", then:
npx wrangler secret put AUTH_TOKEN -c workers/event-ingest/wrangler.local.jsonc
# Enter your secret token when prompted

pnpm deploy:ingest
```

Clients must then include the token:
```bash
curl -X POST https://YOUR-WORKER.workers.dev/v1/track \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"userId":"test","event":"Test"}'
```

## Query API

The Query API worker provides HTTP access to your analytics data via R2 SQL.

### Deploy Query API

The `pnpm launch` script configures everything automatically. Just deploy:

```bash
pnpm deploy:query
```

### Web UI

The Query API includes a web-based Query Explorer and Event Simulator:

**Live Demo**: https://icelight-query-api.clifton-cunningham.workers.dev/

- **Query Editor**: Write and execute SQL queries against your analytics data
- **Event Simulator**: Send test events to your ingestion endpoint using the RudderStack SDK

### Query Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/query` | POST | Execute SQL query |
| `/duckdb` | POST | Execute DuckDB query (full SQL support) |
| `/tables/:namespace` | GET | List tables in namespace |
| `/tables/:namespace/:table` | GET | Describe table schema |
| `/cubejs-api/v1/meta` | GET | Get semantic layer metadata |
| `/cubejs-api/v1/load` | POST | Execute semantic query |
| `/health` | GET | Health check |

### Semantic API (Drizzle Cube)

The Query API includes a semantic layer that automatically extracts fields from JSON columns (`properties`, `traits`, `context`). This enables structured queries without writing raw SQL.

```bash
curl -X POST https://icelight-query-api.YOUR-SUBDOMAIN.workers.dev/cubejs-api/v1/load \
  -H "Content-Type: application/json" \
  -d '{
    "query": {
      "dimensions": ["Events.type", "Events.product", "Events.email"],
      "measures": ["Events.count", "Events.totalRevenue"],
      "limit": 100
    }
  }'
```

**Customize JSON field extraction** by editing `workers/query-api/src/cube-config.ts`. See [Configuring JSON Field Extraction](docs/querying.md#configuring-json-field-extraction) for details.

### Example Queries

```bash
# Basic query - get recent events
curl -X POST https://icelight-query-api.YOUR-SUBDOMAIN.workers.dev/query \
  -H "Content-Type: application/json" \
  -d '{"sql": "SELECT * FROM analytics.events LIMIT 10"}'

# Filter by event type
curl -X POST https://icelight-query-api.YOUR-SUBDOMAIN.workers.dev/query \
  -H "Content-Type: application/json" \
  -d '{"sql": "SELECT * FROM analytics.events WHERE type = '\''track'\'' LIMIT 10"}'

# Filter by user
curl -X POST https://icelight-query-api.YOUR-SUBDOMAIN.workers.dev/query \
  -H "Content-Type: application/json" \
  -d '{"sql": "SELECT * FROM analytics.events WHERE user_id = '\''user-123'\'' LIMIT 10"}'

# Get CSV output
curl -X POST https://icelight-query-api.YOUR-SUBDOMAIN.workers.dev/query \
  -H "Content-Type: application/json" \
  -d '{"sql": "SELECT * FROM analytics.events LIMIT 10", "format": "csv"}'

# List tables
curl https://icelight-query-api.YOUR-SUBDOMAIN.workers.dev/tables/analytics

# Describe table schema
curl https://icelight-query-api.YOUR-SUBDOMAIN.workers.dev/tables/analytics/events
```

### Query with Authentication

If `API_TOKEN` is configured:

```bash
curl -X POST https://icelight-query-api.YOUR-SUBDOMAIN.workers.dev/query \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_API_TOKEN" \
  -d '{"sql": "SELECT * FROM analytics.events LIMIT 10"}'
```

### Via Wrangler CLI

```bash
# The warehouse name format is: {ACCOUNT_ID}_{BUCKET_NAME}
# You can find your warehouse name in the R2 Data Catalog dashboard
npx wrangler r2 sql query "YOUR_WAREHOUSE_NAME" \
  "SELECT * FROM analytics.events LIMIT 10"
```

### Via External Tools

Connect PyIceberg, DuckDB, or Spark to your R2 Data Catalog. See [Cloudflare R2 SQL docs](https://developers.cloudflare.com/r2-sql/) for connection details.

## DuckDB API (Optional)

The DuckDB API provides full SQL support (JOINs, aggregations, window functions) by running DuckDB in a Cloudflare Container.

### Deploy DuckDB API

The `pnpm launch` script offers to configure the DuckDB API. If you selected yes, just deploy:

```bash
pnpm deploy:duckdb
```

### DuckDB API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/query` | POST | Execute SQL query with full DuckDB support |
| `/_health` | GET | Health check |
| `/_debug` | GET | Debug info (env vars, init status) |

### Example Query

```bash
curl -X POST https://icelight-duckdb-api.YOUR-SUBDOMAIN.workers.dev/query \
  -H "Content-Type: application/json" \
  -d '{"query": "SELECT * FROM r2_datalake.analytics.events LIMIT 10"}'
```

### Advantages over Query API (R2 SQL)

- Full DuckDB SQL (JOINs, aggregations, window functions, CTEs)
- Complex analytics queries
- Queries R2 Data Catalog Iceberg tables

### Configuration

| Variable | Description |
|----------|-------------|
| `R2_TOKEN` | Cloudflare API token (secret) |
| `R2_ENDPOINT` | R2 catalog URI |
| `R2_CATALOG` | Warehouse name |
| `API_TOKEN` | Optional Bearer token for auth |

> **Note**: Cloudflare Containers is currently in public beta.

## Project Structure

```
icelight/
├── packages/
│   ├── core/           # Shared types and validation
│   ├── ingest/         # Ingestion library (Hono)
│   └── query/          # Query library (Hono)
├── workers/
│   ├── event-ingest/   # Ingestion worker
│   ├── query-api/      # Query API worker (R2 SQL)
│   └── duckdb-api/     # DuckDB API worker (Containers)
├── container/          # DuckDB container (Node.js + DuckDB)
├── scripts/
│   ├── setup-pipeline.ts     # Infrastructure setup
│   └── download-extensions.sh # DuckDB extensions downloader
└── templates/
    └── schema.events.json    # Event schema
```

## Development

```bash
# Run ingest worker locally (with remote pipeline binding)
pnpm dev:ingest

# Run query worker locally
pnpm dev:query

# Build all packages
pnpm build

# Type check
pnpm typecheck
```

> **Note**: Local development uses `wrangler.local.jsonc` which contains your pipeline bindings. Run `pnpm launch` first to generate these files.

## Cleanup

```bash
# Delete pipeline resources
npx wrangler pipelines delete icelight_events_pipeline
npx wrangler pipelines sinks delete icelight_events_sink
npx wrangler pipelines streams delete icelight_events_stream

# Delete R2 bucket (will fail if not empty)
npx wrangler r2 bucket delete icelight-data
```

## Troubleshooting

### "send is not a function" error

Ensure `compatibility_date` in `wrangler.local.jsonc` is `"2025-01-01"` or later. The Pipelines `send()` method requires this.

### "Not logged in" error

Run `npx wrangler login` and complete the browser authorization flow.

### Pipeline binding not working

1. Check that `wrangler.local.jsonc` exists in `workers/event-ingest/` - if not, run `pnpm launch`
2. Verify the pipeline binding in `wrangler.local.jsonc` has the correct stream ID
3. Run `npx wrangler pipelines streams list` to see your streams
4. Redeploy after any config changes: `pnpm deploy:ingest`

### Query API returns empty data

1. Check that data has been flushed to R2 (pipelines have a 5-minute flush interval by default)
2. Verify the `WAREHOUSE_NAME` in `workers/query-api/wrangler.local.jsonc` matches your bucket name (just the bucket name, not with account ID prefix)
3. Check that `CF_ACCOUNT_ID` and `CF_API_TOKEN` secrets are set correctly

### "wrangler.local.jsonc not found" error

Run `pnpm launch` to create the local configuration files with your pipeline bindings.

## Limitations

- **Cloudflare Pipelines**: Currently in open beta - API may change
- **R2 SQL**: Read-only, limited query support (improving in 2026)
- **Local Development**: Pipelines require `--remote` flag for full testing

## Documentation

- [Getting Started](docs/getting-started.md)
- [Configuration](docs/configuration.md)
- [Querying Data](docs/querying.md) - SQL queries, Semantic API, JSON field extraction
- [SDK Integration](docs/sdk-integration.md)

## Links

- [Cloudflare Pipelines Docs](https://developers.cloudflare.com/pipelines/)
- [R2 Data Catalog](https://developers.cloudflare.com/r2/data-catalog/)
- [R2 SQL](https://developers.cloudflare.com/r2-sql/)

## License

MIT
