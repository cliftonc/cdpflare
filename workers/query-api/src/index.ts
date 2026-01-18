import { createQueryApp, createEventsCube } from '@icelight/query';
import { cubeConfig } from './cube-config.js';

// Create cube with custom configuration
const eventsCube = createEventsCube(cubeConfig);

// Create and export the Hono app
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

export default createQueryApp({ cubes: [eventsCube] });
