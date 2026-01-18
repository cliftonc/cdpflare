# Configuration Guide

## Environment Variables

### Ingestion Worker

| Variable | Type | Default | Description |
|----------|------|---------|-------------|
| `AUTH_ENABLED` | string | `"false"` | Set to `"true"` to require authentication |
| `AUTH_TOKEN` | secret | - | API token for authentication (set via `wrangler secret`) |
| `ALLOWED_ORIGINS` | string | `"*"` | Comma-separated list of allowed CORS origins |

### Query Worker

| Variable | Type | Required | Description |
|----------|------|----------|-------------|
| `CF_ACCOUNT_ID` | secret | Yes | Your Cloudflare account ID |
| `CF_API_TOKEN` | secret | Yes | Cloudflare API token with R2 SQL permissions |
| `WAREHOUSE_NAME` | string | Yes | R2 SQL warehouse name (usually same as bucket name) |
| `API_TOKEN` | secret | No | Optional Bearer token for query API authentication |
| `ALLOWED_ORIGINS` | string | `"*"` | Comma-separated list of allowed CORS origins |

### Pipeline Setup Script

| Variable | Default | Description |
|----------|---------|-------------|
| `BUCKET_NAME` | `icelight-data` | R2 bucket name |
| `PIPELINE_NAME` | `icelight-events-pipeline` | Pipeline name |
| `STREAM_NAME` | `icelight-events-stream` | Stream name |
| `SINK_NAME` | `icelight-events-sink` | Sink name |
| `NAMESPACE` | `analytics` | Iceberg namespace |
| `TABLE_NAME` | `events` | Iceberg table name |
| `COMPRESSION` | `zstd` | Parquet compression (zstd, snappy, gzip, none) |
| `ROLL_INTERVAL` | `60` | Seconds between Parquet file writes |

## Wrangler Configuration

### Ingestion Worker (`workers/event-ingest/wrangler.jsonc`)

```jsonc
{
  "name": "icelight-event-ingest",
  "main": "src/index.ts",
  "compatibility_date": "2024-01-01",
  "compatibility_flags": ["nodejs_compat"],

  "vars": {
    "AUTH_ENABLED": "false",
    "ALLOWED_ORIGINS": "*"
  },

  // Uncomment after running pnpm launch
  "pipelines": [
    {
      "pipeline": "icelight-events-pipeline",
      "binding": "PIPELINE"
    }
  ]
}
```

### Query Worker (`workers/query-api/wrangler.jsonc`)

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

## Authentication

### Ingestion Authentication

The ingestion worker supports multiple authentication methods:

1. **Bearer Token**: `Authorization: Bearer <token>`
2. **Basic Auth**: `Authorization: Basic <base64>` (username is the token)
3. **API Key Header**: `X-API-Key: <token>`

To enable authentication:

```bash
# Set the secret
wrangler secret put AUTH_TOKEN --config workers/event-ingest/wrangler.jsonc

# Update wrangler.jsonc
"vars": {
  "AUTH_ENABLED": "true"
}

# Redeploy
pnpm deploy:ingest
```

### Query API Authentication

Optional Bearer token authentication:

```bash
# Set the secret
wrangler secret put API_TOKEN --config workers/query-api/wrangler.jsonc

# Redeploy
pnpm deploy:query
```

Requests must include: `Authorization: Bearer <token>`

## CORS Configuration

Both workers support CORS configuration via `ALLOWED_ORIGINS`:

```jsonc
"vars": {
  "ALLOWED_ORIGINS": "https://myapp.com,https://staging.myapp.com"
}
```

Use `"*"` to allow all origins (not recommended for production).

## Cloudflare API Token Permissions

Create an API token at [Cloudflare Dashboard](https://dash.cloudflare.com/profile/api-tokens) with:

- **Account** → Workers R2 Storage → Edit
- **Account** → Account Analytics → Read (optional, for monitoring)

## Custom Domain

To use a custom domain for your workers:

1. Add the domain to your Cloudflare account
2. Update `wrangler.jsonc`:

```jsonc
{
  "routes": [
    {
      "pattern": "events.yourdomain.com/*",
      "custom_domain": true
    }
  ]
}
```
