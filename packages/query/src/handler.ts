// Polyfill for process.env - required by @leonardovida-md/drizzle-neo-duckdb
// which uses process.env for debug logging
declare const globalThis: { process?: { env: Record<string, string | undefined> } };
if (typeof globalThis.process === 'undefined') {
  globalThis.process = { env: {} };
}

import { Hono, Context } from 'hono';
import { cors } from 'hono/cors';
import { bearerAuth } from 'hono/bearer-auth';
import { sql } from 'drizzle-orm';
import { drizzle } from '@leonardovida-md/drizzle-neo-duckdb';
import { executeQuery, listTables, describeTable, type R2SqlConfig } from './sql-proxy.js';
import { formatResult, type OutputFormat } from './formatter.js';
import { HttpDuckDBConnection } from '@cdpflare/duckdb-http-adapter';
import { events } from './schema/events.js';
import { createCubeApp } from 'drizzle-cube/adapters/hono';
import { allCubes } from './cubes/events.js';

export interface QueryEnv {
  CF_ACCOUNT_ID: string;
  CF_API_TOKEN: string;
  WAREHOUSE_NAME: string;
  API_TOKEN?: string; // Optional: require API token for query requests
  ALLOWED_ORIGINS?: string;
  // DuckDB API configuration - use either Service Binding OR URL
  DUCKDB_API?: Fetcher; // Service Binding to DuckDB API worker (preferred)
  DUCKDB_API_URL?: string; // URL to the DuckDB API worker (fallback)
  DUCKDB_API_TOKEN?: string; // Optional: Bearer token for DuckDB API
  // Ingest API configuration (for proxying /v1/* routes)
  INGEST_API?: Fetcher; // Service Binding to ingest worker (preferred)
  INGEST_API_URL?: string; // URL to the event ingest worker (fallback)
}

export interface QueryRequest {
  sql: string;
  format?: OutputFormat;
}

export interface QueryResponse {
  success: boolean;
  data?: unknown[];
  meta?: {
    columns?: Array<{ name: string; type: string }>;
    rowCount?: number;
    executionTime?: number;
  };
  error?: string;
}

type QueryContext = Context<{ Bindings: QueryEnv }>;

/**
 * Get R2 SQL config from environment
 */
function getR2Config(env: QueryEnv): R2SqlConfig {
  return {
    accountId: env.CF_ACCOUNT_ID,
    apiToken: env.CF_API_TOKEN,
    warehouseName: env.WAREHOUSE_NAME,
  };
}

/**
 * Create the Hono app for query API
 */
export function createQueryApp() {
  const app = new Hono<{ Bindings: QueryEnv }>();

  // CORS middleware
  app.use('*', async (c, next) => {
    const origins = c.env.ALLOWED_ORIGINS?.split(',').map((o: string) => o.trim()) || ['*'];
    const corsMiddleware = cors({
      origin: origins.includes('*') ? '*' : origins,
      allowMethods: ['GET', 'POST', 'OPTIONS'],
      allowHeaders: ['Content-Type', 'Authorization'],
      maxAge: 86400,
    });
    return corsMiddleware(c, next);
  });

  // Optional auth middleware - only apply if API_TOKEN is set
  app.use('*', async (c, next) => {
    if (c.env.API_TOKEN) {
      const authMiddleware = bearerAuth({ token: c.env.API_TOKEN });
      return authMiddleware(c, next);
    }
    await next();
  });

  // Health check
  app.get('/health', (c) => c.json({ status: 'ok' }));

  // Execute SQL query
  app.post('/query', async (c) => {
    return handleQuery(c);
  });

  // List tables in a namespace
  app.get('/tables/:namespace', async (c) => {
    return handleListTables(c);
  });

  // Describe a table
  app.get('/tables/:namespace/:table', async (c) => {
    return handleDescribeTable(c);
  });

  // Execute DuckDB query (via HTTP adapter)
  app.post('/duckdb', async (c) => {
    return handleDuckDbQuery(c);
  });

  // Proxy /v1/* routes to the ingest API
  app.all('/v1/*', async (c) => {
    return handleIngestProxy(c);
  });

  // Mount cube API routes
  app.all('/cubejs-api/*', async (c) => {
    return handleCubeRequest(c);
  });

  return app;
}

/**
 * Handle SQL query request
 */
async function handleQuery(c: QueryContext) {
  // Validate config
  if (!c.env.CF_ACCOUNT_ID || !c.env.CF_API_TOKEN || !c.env.WAREHOUSE_NAME) {
    return c.json(
      { success: false, error: 'Missing required configuration: CF_ACCOUNT_ID, CF_API_TOKEN, WAREHOUSE_NAME' } satisfies QueryResponse,
      500
    );
  }

  let body: QueryRequest;
  try {
    body = await c.req.json<QueryRequest>();
  } catch {
    return c.json(
      { success: false, error: 'Invalid JSON body' } satisfies QueryResponse,
      400
    );
  }

  if (!body.sql || typeof body.sql !== 'string') {
    return c.json(
      { success: false, error: 'Missing or invalid sql field' } satisfies QueryResponse,
      400
    );
  }

  const config = getR2Config(c.env);
  const result = await executeQuery(body.sql, config);

  const format = body.format || 'json';
  const formatted = formatResult(result, format);

  return new Response(formatted.body, {
    status: result.success ? 200 : 400,
    headers: {
      'Content-Type': formatted.contentType,
    },
  });
}

/**
 * Handle list tables request
 */
async function handleListTables(c: QueryContext) {
  if (!c.env.CF_ACCOUNT_ID || !c.env.CF_API_TOKEN || !c.env.WAREHOUSE_NAME) {
    return c.json(
      { success: false, error: 'Missing required configuration' } satisfies QueryResponse,
      500
    );
  }

  const namespace = c.req.param('namespace');
  const config = getR2Config(c.env);
  const result = await listTables(namespace, config);

  return c.json(result satisfies QueryResponse, result.success ? 200 : 400);
}

/**
 * Handle describe table request
 */
async function handleDescribeTable(c: QueryContext) {
  if (!c.env.CF_ACCOUNT_ID || !c.env.CF_API_TOKEN || !c.env.WAREHOUSE_NAME) {
    return c.json(
      { success: false, error: 'Missing required configuration' } satisfies QueryResponse,
      500
    );
  }

  const namespace = c.req.param('namespace');
  const table = c.req.param('table');
  const config = getR2Config(c.env);
  const result = await describeTable(namespace, table, config);

  return c.json(result satisfies QueryResponse, result.success ? 200 : 400);
}

/**
 * Handle DuckDB query request (via Drizzle ORM + HTTP adapter)
 */
async function handleDuckDbQuery(c: QueryContext) {
  // Check if DuckDB API is configured (Service Binding or URL)
  if (!c.env.DUCKDB_API && !c.env.DUCKDB_API_URL) {
    return c.json(
      { success: false, error: 'DuckDB API not configured: DUCKDB_API (binding) or DUCKDB_API_URL is required' } satisfies QueryResponse,
      500
    );
  }

  let body: QueryRequest;
  try {
    body = await c.req.json<QueryRequest>();
  } catch {
    return c.json(
      { success: false, error: 'Invalid JSON body' } satisfies QueryResponse,
      400
    );
  }

  if (!body.sql || typeof body.sql !== 'string') {
    return c.json(
      { success: false, error: 'Missing or invalid sql field' } satisfies QueryResponse,
      400
    );
  }

  const startTime = Date.now();

  try {
    // Create connection to DuckDB API via HTTP adapter
    // Use Service Binding if available (preferred), otherwise use URL
    const useServiceBinding = !!c.env.DUCKDB_API;
    const connection = new HttpDuckDBConnection({
      // Service bindings need a valid URL (host is ignored, only path matters)
      // External fetch needs the actual worker URL
      endpoint: useServiceBinding ? 'https://duckdb-api' : (c.env.DUCKDB_API_URL as string),
      token: c.env.DUCKDB_API_TOKEN,
      timeout: 60000, // 60 seconds for cold starts
      // If Service Binding is configured, use it for fetch
      fetch: useServiceBinding ? c.env.DUCKDB_API!.fetch.bind(c.env.DUCKDB_API) : undefined,
    });

    // Create Drizzle instance with the HTTP connection
    // The HTTP adapter implements the same interface as @duckdb/node-api connection
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const db = await drizzle(connection as any, { schema: { events } });

    // Execute raw SQL query via Drizzle
    const result = await db.execute(sql.raw(body.sql));

    // Result is an array of row objects
    const data = result as Record<string, unknown>[];
    const columns = data.length > 0 ? Object.keys(data[0]) : [];

    const executionTime = Date.now() - startTime;

    const response: QueryResponse = {
      success: true,
      data,
      meta: {
        columns: columns.map((name: string) => ({ name, type: 'unknown' })),
        rowCount: data.length,
        executionTime,
      },
    };

    // Format output
    const format = body.format || 'json';
    const formatted = formatResult(response, format);

    return new Response(formatted.body, {
      status: 200,
      headers: {
        'Content-Type': formatted.contentType,
      },
    });
  } catch (error) {
    const executionTime = Date.now() - startTime;
    const errorMessage = error instanceof Error ? error.message : String(error);

    return c.json(
      {
        success: false,
        error: errorMessage,
        meta: { executionTime },
      } satisfies QueryResponse,
      400
    );
  }
}

/**
 * Handle ingest API proxy request
 * Forwards /v1/* requests to the configured INGEST_API (binding) or INGEST_API_URL
 */
async function handleIngestProxy(c: QueryContext) {
  if (!c.env.INGEST_API && !c.env.INGEST_API_URL) {
    return c.json(
      { success: false, error: 'Ingest API not configured: INGEST_API (binding) or INGEST_API_URL is required' },
      500
    );
  }

  // Build the target URL - preserve the path after /v1
  const path = c.req.path; // e.g., /v1/track, /v1/batch
  const useServiceBinding = !!c.env.INGEST_API;

  // Service bindings need a valid URL (host is ignored, only path matters)
  // External fetch needs the actual worker URL
  const targetUrl = useServiceBinding
    ? `https://ingest-api${path}`
    : new URL(path, c.env.INGEST_API_URL).toString();

  // Copy query parameters for external URLs
  if (!useServiceBinding) {
    const url = new URL(c.req.url);
    const fullUrl = new URL(targetUrl);
    fullUrl.search = url.search;
  }

  // Forward the request
  const headers = new Headers(c.req.raw.headers);
  // Remove host header to avoid issues
  headers.delete('host');

  // Use service binding fetch or global fetch
  const fetchFn = useServiceBinding ? c.env.INGEST_API!.fetch.bind(c.env.INGEST_API) : fetch;

  try {
    const response = await fetchFn(targetUrl, {
      method: c.req.method,
      headers,
      body: c.req.method !== 'GET' && c.req.method !== 'HEAD' ? c.req.raw.body : undefined,
    });

    // Return the response from the ingest API
    return new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers: response.headers,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    return c.json(
      { success: false, error: `Ingest proxy error: ${errorMessage}` },
      502
    );
  }
}

/**
 * Handle cube API request (via drizzle-cube)
 */
async function handleCubeRequest(c: QueryContext) {
  // Check if DuckDB API is configured (Service Binding or URL)
  if (!c.env.DUCKDB_API && !c.env.DUCKDB_API_URL) {
    return c.json({ error: 'DuckDB API not configured' }, 500);
  }

  // Create connection to DuckDB API via HTTP adapter
  const useServiceBinding = !!c.env.DUCKDB_API;
  const connection = new HttpDuckDBConnection({
    endpoint: useServiceBinding ? 'https://duckdb-api' : (c.env.DUCKDB_API_URL as string),
    token: c.env.DUCKDB_API_TOKEN,
    timeout: 60000,
    fetch: useServiceBinding ? c.env.DUCKDB_API!.fetch.bind(c.env.DUCKDB_API) : undefined,
  });

  // Create Drizzle instance with the HTTP connection
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = await drizzle(connection as any, { schema: { events } });

  // Create the cube app with drizzle-cube
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const cubeApp = createCubeApp({
    cubes: allCubes as any,
    drizzle: db,
    schema: { events },
    extractSecurityContext: async () => ({}),
    engineType: 'postgres',
  });

  // Forward request to cube app
  return cubeApp.fetch(c.req.raw, c.env, c.executionCtx);
}

/**
 * Default export for direct use as a Worker
 */
export default createQueryApp();
