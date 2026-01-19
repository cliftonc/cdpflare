/**
 * DuckDB API Worker
 *
 * This worker manages a DuckDB Container and proxies requests to it.
 * The container runs DuckDB with Iceberg extension configured to access
 * R2 Data Catalog for querying analytics events.
 *
 * Architecture:
 * Client (HTTP) → Worker → DurableObject (PkgContainer) → Container (DuckDB) → R2 Data Catalog
 *
 * Environment variables:
 * - R2_TOKEN: Cloudflare API token with R2 + Data Catalog permissions
 * - R2_ENDPOINT: R2 catalog URI
 * - R2_CATALOG: Warehouse name (e.g., icelight-data)
 * - API_TOKEN: (optional) Bearer token for API auth
 */

import { Container as PkgContainer } from '@cloudflare/containers';
import { Hono, type Context, type Next } from 'hono';
import { cors } from 'hono/cors';

/**
 * Environment bindings
 */
interface Env {
  // Durable Object namespace for container management
  CONTAINER: DurableObjectNamespace;

  // R2 Data Catalog configuration
  R2_TOKEN: string;
  R2_ENDPOINT: string;
  R2_CATALOG: string;

  // Optional API authentication
  API_TOKEN?: string;

  // Optional CORS origins
  ALLOWED_ORIGINS?: string;
}

/**
 * DuckDB Container Durable Object
 *
 * Extends PkgContainer from @cloudflare/containers to handle container lifecycle
 * and request proxying automatically.
 */
export class DuckDBContainer extends PkgContainer<Env> {
  constructor(ctx: DurableObjectState<Env>, env: Env) {
    super(ctx, env);

    const envConfig: Record<string, string> = {};

    // Add R2 Data Catalog credentials for Iceberg to work
    if (env.R2_TOKEN) {
      envConfig.R2_TOKEN = env.R2_TOKEN;
    }
    if (env.R2_ENDPOINT) {
      envConfig.R2_ENDPOINT = env.R2_ENDPOINT;
    }
    if (env.R2_CATALOG) {
      envConfig.R2_CATALOG = env.R2_CATALOG;
    }

    // Configure container settings
    this.defaultPort = 3000;
    this.sleepAfter = '3m';
    this.enableInternet = true;
    this.envVars = envConfig;
  }

  /**
   * Override fetch to ensure container is started and ready before proxying.
   * Includes retry logic to handle cold start race conditions.
   */
  override async fetch(request: Request): Promise<Response> {
    const maxRetries = 5;
    const baseDelay = 1000; // 1 second

    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        // Start container and wait for port 3000 to be ready
        await this.startAndWaitForPorts(3000);

        // Clone request for potential retry (body can only be read once)
        const clonedRequest = request.clone();

        // Let the base class handle proxying to the container
        const response = await super.fetch(clonedRequest);

        // Check if response indicates container not ready (returns plain text error)
        if (!response.ok) {
          const text = await response.clone().text();
          if (text.includes('not running') && attempt < maxRetries - 1) {
            const delay = baseDelay * Math.pow(2, attempt);
            console.log(`Container not ready (response), retrying in ${delay}ms (attempt ${attempt + 1}/${maxRetries})`);
            await new Promise((resolve) => setTimeout(resolve, delay));
            continue;
          }
        }

        return response;
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);

        // If it's a "container not running" error, retry
        if (errorMessage.includes('not running') && attempt < maxRetries - 1) {
          const delay = baseDelay * Math.pow(2, attempt);
          console.log(`Container not ready (error), retrying in ${delay}ms (attempt ${attempt + 1}/${maxRetries})`);
          await new Promise((resolve) => setTimeout(resolve, delay));
          continue;
        }

        // For other errors or final attempt, rethrow
        throw error;
      }
    }

    // Should never reach here, but TypeScript needs this
    throw new Error('Failed to start container after maximum retries');
  }
}

// Create Hono app for the worker
const app = new Hono<{ Bindings: Env }>();

// CORS middleware
app.use('*', async (c: Context<{ Bindings: Env }>, next: Next) => {
  const allowedOrigins = c.env.ALLOWED_ORIGINS?.split(',').map((o: string) => o.trim()) || ['*'];

  return cors({
    origin: allowedOrigins.includes('*') ? '*' : allowedOrigins,
    allowMethods: ['GET', 'POST', 'OPTIONS'],
    allowHeaders: ['Content-Type', 'Authorization'],
  })(c, next);
});

// Optional authentication middleware
app.use('*', async (c: Context<{ Bindings: Env }>, next: Next) => {
  // Skip auth for health check
  if (c.req.path === '/_health' || c.req.path === '/') {
    return next();
  }

  // Check if auth is required
  const apiToken = c.env.API_TOKEN;
  if (!apiToken) {
    return next();
  }

  // Validate Bearer token
  const authHeader = c.req.header('Authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return c.json({ success: false, error: 'Missing or invalid Authorization header' }, 401);
  }

  const token = authHeader.slice(7);
  if (token !== apiToken) {
    return c.json({ success: false, error: 'Invalid API token' }, 401);
  }

  return next();
});

// Health check (doesn't require container)
app.get('/_health', (c: Context<{ Bindings: Env }>) => {
  return c.json({
    status: 'ok',
    service: 'icelight-duckdb-api',
    timestamp: new Date().toISOString(),
  });
});

// Welcome endpoint
app.get('/', (c: Context<{ Bindings: Env }>) => {
  return c.json({
    name: 'icelight-duckdb-api',
    version: '0.1.0',
    description: 'DuckDB-powered query API for R2 Data Catalog',
    endpoints: {
      '/': 'This welcome message',
      '/_health': 'Health check',
      '/query': 'POST - Execute SQL query',
      '/streaming-query': 'POST - Execute SQL query with streaming response',
    },
    usage: {
      query: 'POST /query with body: { "query": "SELECT ..." }',
      catalog: 'R2 catalog available as: r2_datalake',
      example: 'SELECT * FROM r2_datalake.analytics.events LIMIT 10',
    },
    advantages: [
      'Full DuckDB SQL support (JOINs, aggregations, window functions)',
      'Queries R2 Data Catalog Iceberg tables',
      'Streaming support for large result sets',
    ],
  });
});

// Forward all other requests to the container
app.all('*', async (c: Context<{ Bindings: Env }>) => {
  try {
    // Forward request to container
    return await c.env.CONTAINER.get(c.env.CONTAINER.idFromName('icelight-duckdb')).fetch(c.req.raw);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error('Worker error:', errorMessage);

    return c.json({ success: false, error: errorMessage }, 500);
  }
});

// Export Durable Object class and default handler
export default app;
