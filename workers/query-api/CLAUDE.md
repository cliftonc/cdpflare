# query-api Worker

Cloudflare Worker for querying analytics data via R2 SQL.

## Purpose

Deployable worker that proxies SQL queries to Cloudflare's R2 SQL API, providing HTTP access to Iceberg tables stored in R2.

## Architecture

```
Client → query-api Worker → Cloudflare R2 SQL API → R2 Iceberg Tables
```

## Files

| File | Description |
|------|-------------|
| `src/index.ts` | Worker entry point (imports @icelight/query) |
| `wrangler.jsonc` | Wrangler configuration |
| `package.json` | Dependencies |
| `tsconfig.json` | TypeScript config |

## Entry Point

```typescript
// src/index.ts
import { createQueryApp } from '@icelight/query';
export default createQueryApp();
```

The worker is a thin wrapper around `@icelight/query`.

## Configuration

### wrangler.jsonc

```jsonc
{
  "name": "icelight-query-api",
  "main": "src/index.ts",
  "compatibility_date": "2024-01-01",
  "compatibility_flags": ["nodejs_compat"],

  "vars": {
    "WAREHOUSE_NAME": "your-warehouse-name"
  }
  // CF_ACCOUNT_ID, CF_API_TOKEN set via wrangler secret
}
```

### Environment Variables

| Variable | Required | How to Set | Description |
|----------|----------|------------|-------------|
| `CF_ACCOUNT_ID` | Yes | Secret | Cloudflare account ID |
| `CF_API_TOKEN` | Yes | Secret | API token with R2 SQL permissions |
| `WAREHOUSE_NAME` | Yes | Var | R2 SQL warehouse name |
| `API_TOKEN` | No | Secret | Optional Bearer token for API auth |
| `ALLOWED_ORIGINS` | No | Var | Comma-separated CORS origins |

## Endpoints

| Method | Path | Description |
|--------|------|-------------|
| POST | `/query` | Execute SQL query |
| GET | `/tables/:namespace` | List tables in namespace |
| GET | `/tables/:namespace/:table` | Describe table schema |
| GET | `/health` | Health check |

## Development

```bash
# Run locally (needs secrets configured)
pnpm dev

# Type check
pnpm typecheck

# Deploy
pnpm deploy
```

## Setup Steps

1. **Get Cloudflare credentials**:
   - Account ID: Dashboard → Overview → Account ID
   - API Token: Dashboard → Profile → API Tokens (need R2 permissions)

2. **Set secrets**:
   ```bash
   wrangler secret put CF_ACCOUNT_ID
   wrangler secret put CF_API_TOKEN
   ```

3. **Configure warehouse name** in `wrangler.jsonc`:
   ```jsonc
   "vars": {
     "WAREHOUSE_NAME": "your-warehouse-name"
   }
   ```

4. **Optional: Enable API auth**:
   ```bash
   wrangler secret put API_TOKEN
   ```

5. **Deploy**:
   ```bash
   pnpm deploy
   ```

## Usage Examples

### Execute Query

```bash
curl -X POST https://icelight-query-api.<subdomain>.workers.dev/query \
  -H "Content-Type: application/json" \
  -d '{"sql": "SELECT * FROM analytics.events LIMIT 10"}'
```

### Get CSV Output

```bash
curl -X POST https://icelight-query-api.<subdomain>.workers.dev/query \
  -H "Content-Type: application/json" \
  -d '{"sql": "SELECT * FROM analytics.events LIMIT 10", "format": "csv"}'
```

### List Tables

```bash
curl https://icelight-query-api.<subdomain>.workers.dev/tables/analytics
```

### Describe Table

```bash
curl https://icelight-query-api.<subdomain>.workers.dev/tables/analytics/events
```

### With Authentication

```bash
curl -X POST https://icelight-query-api.<subdomain>.workers.dev/query \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer your-api-token" \
  -d '{"sql": "SELECT * FROM analytics.events LIMIT 10"}'
```

## R2 SQL Limitations

Current beta limitations:
- **Read-only**: Only SELECT queries supported
- **No joins**: Cannot join multiple tables
- **No aggregations**: GROUP BY, COUNT, SUM not supported

For complex queries, use external engines (PyIceberg, DuckDB, Spark).

## Notes

- Worker URL pattern: `https://icelight-query-api.<subdomain>.workers.dev`
- API Token permissions needed: Account → Workers R2 Storage → Edit
- Data must exist in R2 (run events through ingest worker first)
- Query errors return 400 with error message from R2 SQL API
