import { Hono } from 'hono';
import { createQueryApp, createEventsCube, type QueryEnv } from '@icelight/query';
import { cubeConfig } from './cube-config.js';
import { CloudflareKVProvider } from './cache/cloudflare-kv-provider.js';
import { createDashboardRoutes } from './dashboards/routes.js';

// Create cube with custom configuration
const eventsCube = createEventsCube(cubeConfig);

// Create the query app with cube configuration
// The app handles query endpoints:
// - POST /query - Execute SQL query (body: { sql: string, format?: 'json' | 'csv' })
// - GET /tables/:namespace - List tables in a namespace
// - GET /tables/:namespace/:table - Describe a table schema
// - GET /health - Health check
// - /cubejs-api/* - Drizzle Cube semantic API (with JSON field extraction)
//
// Configuration (set via secrets/vars):
// - CF_ACCOUNT_ID: Cloudflare account ID
// - CF_API_TOKEN: Cloudflare API token with R2 SQL permissions
// - WAREHOUSE_NAME: R2 SQL warehouse name
// - API_TOKEN: (optional) Bearer token to require for API access
// - ALLOWED_ORIGINS: (optional) Comma-separated list of allowed CORS origins
// - CACHE: (optional) KV namespace binding for drizzle-cube query caching
// - DB: (optional) D1 database binding for dashboard storage

const queryApp = createQueryApp({
  cubes: [eventsCube],
  cache: {
    providerFactory: (kv) => new CloudflareKVProvider(kv),
    defaultTtlMs: 3600000, // 60 minutes
    keyPrefix: 'drizzle-cube:',
    includeSecurityContext: true,
  },
});

// Create the main app and mount sub-apps
const app = new Hono<{ Bindings: QueryEnv }>();

// Mount dashboard routes at /api/dashboards
app.route('/api/dashboards', createDashboardRoutes());

// Mount the query app for all other routes
app.route('/', queryApp);

export default app;
