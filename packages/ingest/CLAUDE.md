# @icelight/ingest

Hono-based event ingestion library for icelight.

## Purpose

This package provides:
- Hono app for receiving analytics events
- RudderStack/Segment-compatible HTTP endpoints
- Authentication middleware (Bearer, Basic, API Key)
- CORS handling
- Batch and single event processing

## Files

| File | Description |
|------|-------------|
| `handler.ts` | Hono app factory and route handlers |
| `auth.ts` | Authentication middleware |
| `batch.ts` | Event batch processing logic |
| `index.ts` | Public exports |

## Hono App

### Factory Pattern

```typescript
import { createIngestApp } from '@icelight/ingest';

// Create configured app
const app = createIngestApp();

// Or use default export directly
export { default } from '@icelight/ingest';
```

### Routes

| Method | Path | Description |
|--------|------|-------------|
| POST | `/v1/batch` | Batch events (primary) |
| POST | `/v1/track` | Single track event |
| POST | `/v1/identify` | Single identify event |
| POST | `/v1/page` | Single page event |
| POST | `/v1/screen` | Single screen event |
| POST | `/v1/group` | Single group event |
| POST | `/v1/alias` | Single alias event |
| GET | `/health` | Health check |

Also available without `/v1` prefix (e.g., `/batch`, `/track`).

## Environment Bindings

```typescript
interface IngestEnv {
  PIPELINE: PipelineBinding;  // Cloudflare Pipeline binding
  AUTH_ENABLED?: string;      // "true" to enable auth
  AUTH_TOKEN?: string;        // Secret token for auth
  ALLOWED_ORIGINS?: string;   // Comma-separated CORS origins
}
```

## Authentication

The auth middleware (`auth.ts`) supports:

1. **Bearer Token**: `Authorization: Bearer <token>`
2. **Basic Auth**: `Authorization: Basic <base64>` (username = token)
3. **API Key Header**: `X-API-Key: <token>`

```typescript
import { authMiddleware } from '@icelight/ingest';

app.use('*', authMiddleware((c) => ({
  enabled: c.env.AUTH_ENABLED === 'true',
  token: c.env.AUTH_TOKEN,
})));
```

## Pipeline Binding

The app expects a `PIPELINE` binding that implements:

```typescript
interface PipelineBinding {
  send(messages: unknown[]): Promise<void>;
}
```

Events are flattened to `FlattenedEvent` format before sending.

## Request/Response Format

### Batch Request

```json
{
  "batch": [
    {
      "type": "track",
      "userId": "user-123",
      "event": "Purchase",
      "properties": { "value": 99 }
    }
  ],
  "sentAt": "2024-01-15T10:00:00Z"
}
```

### Single Event Request

```json
{
  "userId": "user-123",
  "event": "Purchase",
  "properties": { "value": 99 }
}
```

### Response

```json
{
  "success": true,
  "count": 1
}
```

### Error Response

```json
{
  "success": false,
  "errors": ["batch[0]: Event must have either userId or anonymousId"]
}
```

## Build

```bash
pnpm build      # Compile TypeScript
pnpm typecheck  # Type check without emitting
pnpm clean      # Remove dist/
```

## Dependencies

- `@icelight/core` - Event types and validation
- `hono` - Web framework

## Notes

- Uses Hono's `Context<{ Bindings: IngestEnv }>` for typed env access
- CORS middleware dynamically configured from `ALLOWED_ORIGINS`
- Events are validated before sending to pipeline
- Message IDs generated if not provided by client
