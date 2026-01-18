# CLAUDE.md - Project Context for Claude Code

## Project Overview

**icelight** is a Cloudflare Data Platform library that streams JSON analytics events to Apache Iceberg tables. It provides RudderStack/Segment-compatible HTTP endpoints for event ingestion and a query API for SQL access via R2 SQL.

### Architecture

```
Client/SDK → Event Ingest Worker → Cloudflare Pipeline → R2 + Iceberg → Query API Worker
```

- **Event Ingestion**: Hono-based worker accepting analytics events
- **Data Storage**: Cloudflare Pipelines write to R2 as Iceberg tables
- **Querying**: R2 SQL API proxy or external engines (PyIceberg, DuckDB)

## Repository Structure

```
icelight/
├── packages/                    # Shared libraries (npm publishable)
│   ├── core/                    # @icelight/core - Types & validation
│   │   └── src/
│   │       ├── event-schema.ts  # RudderStack/Segment event types
│   │       ├── validation.ts    # Event validation & flattening
│   │       └── config.ts        # Configuration types
│   ├── ingest/                  # @icelight/ingest - Ingestion library
│   │   └── src/
│   │       ├── auth.ts          # Hono auth middleware
│   │       ├── batch.ts         # Batch processing logic
│   │       └── handler.ts       # Hono app factory
│   └── query/                   # @icelight/query - Query library
│       └── src/
│           ├── sql-proxy.ts     # R2 SQL API client
│           ├── formatter.ts     # JSON/CSV output formatting
│           └── handler.ts       # Hono app factory
├── workers/                     # Deployable Cloudflare Workers
│   ├── event-ingest/            # Uses @icelight/ingest
│   └── query-api/               # Uses @icelight/query
├── scripts/                     # Infrastructure management
│   ├── setup-pipeline.ts        # Create R2/Pipeline resources
│   └── teardown.ts              # Delete resources
├── templates/                   # Configuration templates
│   ├── schema.events.json       # Pipeline event schema
│   └── .env.example             # Environment template
└── docs/                        # Documentation
```

## Local Configuration Pattern

**IMPORTANT**: Workers use `wrangler.local.jsonc` for deployment, NOT `wrangler.jsonc`.

- `wrangler.jsonc` - Template/example config (committed to git)
- `wrangler.local.jsonc` - Actual config with pipeline bindings (gitignored, created by `pnpm launch`)

The `pnpm launch` script creates `wrangler.local.jsonc` files in each worker directory with the correct pipeline/stream IDs for your Cloudflare account.

```bash
# This creates wrangler.local.jsonc files with your pipeline bindings
pnpm launch

# Deploy commands automatically use wrangler.local.jsonc
pnpm deploy:ingest   # Uses workers/event-ingest/wrangler.local.jsonc
pnpm deploy:query    # Uses workers/query-api/wrangler.local.jsonc
```

When debugging deployment issues, always check `wrangler.local.jsonc` (not `wrangler.jsonc`) to verify pipeline bindings are configured.

## Build & Development Commands

```bash
# Install dependencies
pnpm install

# Build all packages
pnpm build

# Type check all packages
pnpm typecheck

# Run ingest worker locally
pnpm dev:ingest

# Run query worker locally
pnpm dev:query

# Deploy workers
pnpm deploy:ingest
pnpm deploy:query
pnpm deploy:all

# Infrastructure
pnpm launch     # Create R2 bucket, pipeline, etc.
pnpm teardown   # Delete infrastructure
```

## Tech Stack

- **Runtime**: Cloudflare Workers
- **Framework**: [Hono](https://hono.dev/) v4.x - lightweight web framework
- **Package Manager**: pnpm with workspaces
- **Language**: TypeScript 5.x (strict mode)
- **Build**: TypeScript compiler (tsc) - no bundler for packages
- **Workers Build**: Wrangler handles bundling

## Code Conventions

### TypeScript

- Strict mode enabled (`strict: true`)
- Use `type` imports for type-only imports: `import type { Foo } from './foo.js'`
- Include `.js` extension in relative imports (ESM requirement)
- Prefer interfaces over types for object shapes
- Use `satisfies` for type-safe object literals with inference

### Hono Patterns

```typescript
// App factory pattern - each package exports a createXxxApp function
export function createIngestApp() {
  const app = new Hono<{ Bindings: IngestEnv }>();

  // Middleware
  app.use('*', cors({ ... }));
  app.use('*', authMiddleware(...));

  // Routes
  app.post('/v1/batch', async (c) => { ... });

  return app;
}

// Default export for direct use
export default createIngestApp();
```

### Context Types

```typescript
// Define environment bindings
interface IngestEnv {
  PIPELINE: PipelineBinding;
  AUTH_ENABLED?: string;
  AUTH_TOKEN?: string;
}

// Type the context
type IngestContext = Context<{ Bindings: IngestEnv }>;

// Use in handlers
async function handleRequest(c: IngestContext) {
  const token = c.env.AUTH_TOKEN;
  return c.json({ success: true });
}
```

### Error Handling

- Return JSON responses with `{ success: boolean, error?: string }`
- Use appropriate HTTP status codes (400 for client errors, 500 for server errors)
- Log errors with `console.error()` (available in Workers)

### File Naming

- `kebab-case.ts` for files
- `PascalCase` for types/interfaces
- `camelCase` for functions/variables
- `SCREAMING_SNAKE_CASE` for environment variables

## Key Interfaces

### Event Types (packages/core)

```typescript
// Base event - all events extend this
interface BaseEvent {
  userId?: string;
  anonymousId?: string;
  type: 'track' | 'identify' | 'page' | 'screen' | 'group' | 'alias';
  context?: EventContext;
  timestamp?: string;
  messageId?: string;
}

// Flattened for Iceberg storage (snake_case)
interface FlattenedEvent {
  message_id: string;
  type: EventType;
  user_id: string | null;
  anonymous_id: string | null;
  event: string | null;
  properties: Record<string, unknown> | null;
  timestamp: string;
  received_at: string;
}
```

### Pipeline Binding

```typescript
// Cloudflare Pipeline binding interface
interface PipelineBinding {
  send(messages: unknown[]): Promise<void>;
}
```

### Worker Environment

```typescript
// Ingest worker
interface IngestEnv {
  PIPELINE: PipelineBinding;
  AUTH_ENABLED?: string;
  AUTH_TOKEN?: string;
  ALLOWED_ORIGINS?: string;
}

// Query worker
interface QueryEnv {
  CF_ACCOUNT_ID: string;
  CF_API_TOKEN: string;
  WAREHOUSE_NAME: string;
  API_TOKEN?: string;
  ALLOWED_ORIGINS?: string;
}
```

## Testing Locally

### Test Ingest Worker

```bash
# Start local dev server
pnpm dev:ingest

# Send test event
curl -X POST http://localhost:8787/v1/track \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "test-user",
    "event": "Test Event",
    "properties": {"foo": "bar"}
  }'

# Send batch
curl -X POST http://localhost:8787/v1/batch \
  -H "Content-Type: application/json" \
  -d '{
    "batch": [
      {"type": "track", "userId": "u1", "event": "Event 1"},
      {"type": "identify", "userId": "u1", "traits": {"name": "Test"}}
    ]
  }'
```

### Test Query Worker

```bash
# Start local dev server (needs secrets configured)
pnpm dev:query

# Execute query
curl -X POST http://localhost:8788/query \
  -H "Content-Type: application/json" \
  -d '{"sql": "SELECT * FROM analytics.events LIMIT 10"}'
```

## Cloudflare Resources

### Pipelines (Beta)

- Pipelines are in open beta - API may change
- Pipeline binding requires pipeline to be created first via `pnpm launch`
- Immutable: streams, sinks, and pipelines cannot be modified, only deleted/recreated

### R2 SQL (Beta)

- Currently read-only (SELECT only)
- No joins between tables (coming H1 2026)
- No aggregations (coming H1 2026)
- Use external engines for complex queries

### Wrangler Commands Reference

```bash
# R2
wrangler r2 bucket create <name>
wrangler r2 bucket catalog enable <name>
wrangler r2 sql query "<warehouse>" "<sql>"

# Pipelines
wrangler pipelines stream create <name> --schema-file <path>
wrangler pipelines sink create <name> --type r2-data-catalog --bucket <bucket>
wrangler pipelines create <name> --r2 <bucket>

# Secrets
wrangler secret put <NAME> --config <wrangler.jsonc>

# Deploy
wrangler deploy --config <wrangler.jsonc>
```

## Common Tasks

### Add a New Event Type

1. Add type to `packages/core/src/event-schema.ts`
2. Update `AnalyticsEvent` union type
3. Update validation in `packages/core/src/validation.ts`
4. Rebuild: `pnpm build`

### Add a New Endpoint

1. Add route in `packages/ingest/src/handler.ts` or `packages/query/src/handler.ts`
2. Create handler function with proper typing
3. Export any new types from `src/index.ts`
4. Rebuild and typecheck: `pnpm build && pnpm typecheck`

### Modify Pipeline Schema

1. Update `templates/schema.events.json`
2. Update `FlattenedEvent` type in `packages/core/src/event-schema.ts`
3. Update `flattenEvent()` in `packages/core/src/validation.ts`
4. **Note**: Existing pipelines cannot be modified - must teardown and recreate

### Add New Configuration Option

1. Add to relevant `*Env` interface in handler
2. Add to `templates/.env.example`
3. Document in `docs/configuration.md`
4. Update `wrangler.jsonc` if needed

## Debugging Tips

- Use `console.log()` in Workers - visible in `wrangler dev` output
- Check Cloudflare dashboard for deployed worker logs
- Use `--local` flag with wrangler for fully local testing
- Pipeline errors appear in Cloudflare dashboard under Pipelines

## Dependencies

### Core Dependencies

- `hono` - Web framework for Workers
- No other runtime dependencies (keeps bundle small)

### Dev Dependencies

- `@cloudflare/workers-types` - TypeScript types for Workers APIs
- `wrangler` - Cloudflare CLI for development and deployment
- `typescript` - TypeScript compiler
- `tsx` - TypeScript execution for scripts
- `@types/node` - Node.js types for scripts

## Links

- [Cloudflare Pipelines Docs](https://developers.cloudflare.com/pipelines/)
- [R2 Data Catalog](https://developers.cloudflare.com/r2/data-catalog/)
- [R2 SQL](https://developers.cloudflare.com/r2-sql/)
- [Hono Documentation](https://hono.dev/)
- [Wrangler CLI](https://developers.cloudflare.com/workers/wrangler/)
