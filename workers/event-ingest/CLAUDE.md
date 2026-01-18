# event-ingest Worker

Cloudflare Worker for analytics event ingestion.

## Purpose

Deployable worker that receives analytics events from SDKs (RudderStack, Segment, custom) and forwards them to a Cloudflare Pipeline for storage in Iceberg tables.

## Architecture

```
SDK/Client → event-ingest Worker → Cloudflare Pipeline → R2 Iceberg
```

## Files

| File | Description |
|------|-------------|
| `src/index.ts` | Worker entry point (imports @icelight/ingest) |
| `wrangler.jsonc` | Wrangler configuration |
| `package.json` | Dependencies |
| `tsconfig.json` | TypeScript config |

## Entry Point

```typescript
// src/index.ts
import { createIngestApp } from '@icelight/ingest';
export default createIngestApp();
```

The worker is a thin wrapper around `@icelight/ingest`.

## Configuration

### wrangler.jsonc

```jsonc
{
  "name": "icelight-event-ingest",
  "main": "src/index.ts",
  // IMPORTANT: 2025-01-01 or later required for Pipelines send() method
  "compatibility_date": "2025-01-01",
  "compatibility_flags": ["nodejs_compat"],

  "vars": {
    "AUTH_ENABLED": "false"
  },

  // Configure after running pnpm launch with your stream ID
  "pipelines": [
    {
      "pipeline": "icelight-events-pipeline",
      "binding": "PIPELINE"
    }
  ]
}
```

### Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `PIPELINE` | Yes | Pipeline binding (configured in wrangler.jsonc) |
| `AUTH_ENABLED` | No | Set to "true" to require authentication |
| `AUTH_TOKEN` | If auth enabled | Secret token (set via `wrangler secret`) |
| `ALLOWED_ORIGINS` | No | Comma-separated CORS origins (default: "*") |

## Endpoints

| Method | Path | Description |
|--------|------|-------------|
| POST | `/v1/batch` | Batch events (primary endpoint) |
| POST | `/v1/track` | Single track event |
| POST | `/v1/identify` | Single identify event |
| POST | `/v1/page` | Single page event |
| POST | `/v1/screen` | Single screen event |
| POST | `/v1/group` | Single group event |
| POST | `/v1/alias` | Single alias event |
| GET | `/health` | Health check |

## Development

```bash
# Run locally
pnpm dev

# Type check
pnpm typecheck

# Deploy
pnpm deploy
```

## Setup Steps

1. **Create pipeline infrastructure**:
   ```bash
   pnpm launch  # From root
   ```

2. **Uncomment pipeline binding** in `wrangler.jsonc`

3. **Set secrets** (if using auth):
   ```bash
   wrangler secret put AUTH_TOKEN
   ```

4. **Deploy**:
   ```bash
   pnpm deploy
   ```

## Testing Locally

```bash
# Start dev server
pnpm dev

# Send test event
curl -X POST http://localhost:8787/v1/track \
  -H "Content-Type: application/json" \
  -d '{"userId": "test", "event": "Test Event"}'

# Send batch
curl -X POST http://localhost:8787/v1/batch \
  -H "Content-Type: application/json" \
  -d '{"batch": [{"type": "track", "userId": "test", "event": "Test"}]}'
```

Note: Pipeline binding won't work locally unless using `--remote` flag.

## SDK Compatibility

Compatible with:
- RudderStack JavaScript SDK
- Segment Analytics.js
- Any SDK using the Segment HTTP API format

Configure SDK to point to this worker's URL as the data plane.

## Notes

- Worker URL pattern: `https://icelight-event-ingest.<subdomain>.workers.dev`
- Events are validated before sending to pipeline
- Invalid events return 400 with error details
- Pipeline must exist before deploying (run `pnpm launch` first)
