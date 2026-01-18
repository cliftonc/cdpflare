# @icelight/query

Hono-based R2 SQL query API library for icelight.

## Purpose

This package provides:
- Hono app for executing SQL queries against R2 SQL
- R2 SQL API client
- JSON and CSV output formatting
- Optional Bearer token authentication

## Files

| File | Description |
|------|-------------|
| `handler.ts` | Hono app factory and route handlers |
| `sql-proxy.ts` | R2 SQL API client functions |
| `formatter.ts` | Result formatting (JSON/CSV) |
| `index.ts` | Public exports |

## Hono App

### Factory Pattern

```typescript
import { createQueryApp } from '@icelight/query';

// Create configured app
const app = createQueryApp();

// Or use default export directly
export { default } from '@icelight/query';
```

### Routes

| Method | Path | Description |
|--------|------|-------------|
| POST | `/query` | Execute SQL query |
| GET | `/tables/:namespace` | List tables in namespace |
| GET | `/tables/:namespace/:table` | Describe table schema |
| GET | `/health` | Health check |

## Environment Bindings

```typescript
interface QueryEnv {
  CF_ACCOUNT_ID: string;    // Cloudflare account ID
  CF_API_TOKEN: string;     // API token with R2 SQL access
  WAREHOUSE_NAME: string;   // R2 SQL warehouse name
  API_TOKEN?: string;       // Optional: require Bearer auth
  ALLOWED_ORIGINS?: string; // Comma-separated CORS origins
}
```

## R2 SQL Proxy

### executeQuery

```typescript
import { executeQuery, type R2SqlConfig } from '@icelight/query';

const config: R2SqlConfig = {
  accountId: '...',
  apiToken: '...',
  warehouseName: '...',
};

const result = await executeQuery('SELECT * FROM analytics.events LIMIT 10', config);
// { success: true, data: [...], meta: { columns, rowCount, executionTime } }
```

### Helper Functions

```typescript
// List tables in a namespace
const tables = await listTables('analytics', config);

// Describe a table
const schema = await describeTable('analytics', 'events', config);
```

## Request/Response Format

### Query Request

```json
{
  "sql": "SELECT * FROM analytics.events WHERE type = 'track' LIMIT 100",
  "format": "json"
}
```

Format options: `"json"` (default), `"csv"`

### JSON Response

```json
{
  "success": true,
  "data": [
    { "message_id": "abc", "type": "track", "event": "Purchase" }
  ],
  "meta": {
    "columns": [
      { "name": "message_id", "type": "string" },
      { "name": "type", "type": "string" }
    ],
    "rowCount": 1,
    "executionTime": 150
  }
}
```

### CSV Response

```
message_id,type,event
abc,track,Purchase
```

### Error Response

```json
{
  "success": false,
  "error": "Table not found: analytics.events"
}
```

## Authentication

If `API_TOKEN` is set, requests must include:

```
Authorization: Bearer <API_TOKEN>
```

Uses Hono's built-in `bearerAuth` middleware.

## Build

```bash
pnpm build      # Compile TypeScript
pnpm typecheck  # Type check without emitting
pnpm clean      # Remove dist/
```

## Dependencies

- `@icelight/core` - Configuration types
- `hono` - Web framework

## R2 SQL API

The proxy calls Cloudflare's R2 SQL API:

```
POST https://api.cloudflare.com/client/v4/accounts/{account_id}/r2/catalogs/{warehouse}/sql
Authorization: Bearer {api_token}
Content-Type: application/json

{"sql": "..."}
```

## Notes

- R2 SQL is currently read-only (SELECT only)
- No joins or aggregations yet (coming H1 2026)
- CSV format escapes values with commas/quotes properly
- Uses Hono's `Context<{ Bindings: QueryEnv }>` for typed env access
