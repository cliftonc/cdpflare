/**
 * DuckDB API Server for Cloudflare Container
 * With detailed error logging to debug startup issues
 */

import { serve } from '@hono/node-server';
import { Hono } from 'hono';
import { cors } from 'hono/cors';

console.log('[STARTUP] Container starting...');

// Fix BigInt serialization
(BigInt.prototype as any).toJSON = function () {
  return this.toString();
};

const app = new Hono();

// Track initialization status
let initError: string | null = null;
let duckdbReady = false;
let connection: any = null;

// Promise that resolves when DuckDB is ready
let duckdbReadyResolve: () => void;
const duckdbReadyPromise = new Promise<void>((resolve) => {
  duckdbReadyResolve = resolve;
});

// Wait for DuckDB with timeout
async function waitForDuckDB(timeoutMs: number = 30000): Promise<boolean> {
  if (duckdbReady) return true;
  if (initError) return false;

  const timeout = new Promise<boolean>((resolve) =>
    setTimeout(() => resolve(false), timeoutMs)
  );

  const ready = duckdbReadyPromise.then(() => true);

  return Promise.race([ready, timeout]);
}

// Try to load DuckDB - catch any import errors
async function initDuckDB() {
  console.log('[DUCKDB] Starting initialization...');

  try {
    console.log('[DUCKDB] Importing @duckdb/node-api...');
    const { DuckDBInstance } = await import('@duckdb/node-api');
    console.log('[DUCKDB] Import successful');

    console.log('[DUCKDB] Creating instance...');
    const instance = await DuckDBInstance.create(':memory:', {});
    console.log('[DUCKDB] Instance created');

    console.log('[DUCKDB] Connecting...');
    connection = await instance.connect();
    console.log('[DUCKDB] Connected');

    console.log('[DUCKDB] Setting home directory...');
    await connection.run(`SET home_directory='/tmp';`);
    console.log('[DUCKDB] Home directory set');

    console.log('[DUCKDB] Loading httpfs extension...');
    await connection.run(`LOAD '/app/extensions/httpfs.duckdb_extension';`);
    console.log('[DUCKDB] httpfs loaded');

    console.log('[DUCKDB] Loading avro extension...');
    await connection.run(`LOAD '/app/extensions/avro.duckdb_extension';`);
    console.log('[DUCKDB] avro loaded');

    console.log('[DUCKDB] Loading iceberg extension...');
    await connection.run(`LOAD '/app/extensions/iceberg.duckdb_extension';`);
    console.log('[DUCKDB] iceberg loaded');

    console.log('[DUCKDB] Extensions loaded, configuring R2 catalog...');

    // Configure R2 catalog if credentials are provided
    const { R2_TOKEN, R2_ENDPOINT, R2_CATALOG } = process.env;

    if (R2_TOKEN && R2_ENDPOINT && R2_CATALOG) {
      try {
        console.log(`[DUCKDB] Creating secret for R2 catalog...`);
        await connection.run(`
          CREATE OR REPLACE SECRET r2_catalog_secret (
            TYPE ICEBERG,
            TOKEN '${R2_TOKEN}',
            ENDPOINT '${R2_ENDPOINT}'
          );
        `);
        console.log('[DUCKDB] Secret created');

        console.log(`[DUCKDB] Attaching R2 catalog: ${R2_CATALOG}`);
        await connection.run(`
          ATTACH '${R2_CATALOG}' AS r2_datalake (
            TYPE ICEBERG,
            ENDPOINT '${R2_ENDPOINT}'
          );
        `);
        console.log('[DUCKDB] R2 catalog attached as r2_datalake');

        // Set r2_datalake.analytics as default catalog+schema so queries can use just table names
        // instead of r2_datalake.analytics.events
        await connection.run(`USE r2_datalake.analytics;`);
        console.log('[DUCKDB] Default catalog+schema set to r2_datalake.analytics');
      } catch (catalogError) {
        const msg = catalogError instanceof Error ? catalogError.message : String(catalogError);
        console.error('[DUCKDB] R2 catalog attachment failed:', msg);
        initError = `R2 catalog unavailable: ${msg}`;
      }
    } else {
      console.log('[DUCKDB] R2 credentials not configured - running without catalog');
    }

    // Mark DuckDB as ready AFTER catalog attachment attempt
    duckdbReady = true;
    duckdbReadyResolve(); // Signal waiting requests
    console.log('[DUCKDB] Initialization complete!');
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error('[DUCKDB] Initialization failed:', msg);
    initError = msg;
  }
}

// CORS middleware
app.use('*', cors({
  origin: '*',
  allowMethods: ['GET', 'POST', 'OPTIONS'],
  allowHeaders: ['Content-Type', 'Authorization'],
}));

// Health check endpoint
app.get('/_health', (c) => {
  return c.json({
    status: 'ok',
    duckdb: duckdbReady ? 'ready' : (initError || 'initializing'),
    timestamp: new Date().toISOString(),
  });
});

// Welcome endpoint
app.get('/', (c) => {
  return c.json({
    name: 'cdpflare-duckdb-api',
    version: '0.1.0',
    duckdb: duckdbReady ? 'ready' : (initError || 'initializing'),
  });
});

// Debug endpoint to check env vars (remove in production)
app.get('/_debug', (c) => {
  return c.json({
    r2_token: process.env.R2_TOKEN ? 'SET' : 'NOT SET',
    r2_endpoint: process.env.R2_ENDPOINT || 'NOT SET',
    r2_catalog: process.env.R2_CATALOG || 'NOT SET',
    duckdb_ready: duckdbReady,
    init_error: initError,
  });
});

// Query endpoint
app.post('/query', async (c) => {
  // Wait for DuckDB to be ready (up to 30 seconds)
  const ready = await waitForDuckDB(30000);

  if (!ready) {
    return c.json({
      success: false,
      error: initError || 'DuckDB initialization timed out'
    }, 503);
  }

  try {
    const body = await c.req.json();
    const reader = await connection.runAndReadAll(body.query);
    return c.json({
      success: true,
      data: reader.getRowObjects(),
      columns: reader.columnNames(),
      rowCount: reader.getRowObjects().length,
    });
  } catch (error) {
    return c.json({
      success: false,
      error: error instanceof Error ? error.message : String(error),
    }, 400);
  }
});

// Start server first, then init DuckDB (so health check works during init)
const port = 3000;

console.log('[STARTUP] Starting HTTP server...');

const server = serve({
  fetch: app.fetch,
  port,
}, (info) => {
  console.log(`[STARTUP] Server running on http://localhost:${info.port}`);

  // Initialize DuckDB after server is listening
  initDuckDB().catch(err => {
    console.error('[STARTUP] DuckDB init error:', err);
  });
});

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('[SHUTDOWN] SIGINT received');
  server.close();
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('[SHUTDOWN] SIGTERM received');
  server.close();
  process.exit(0);
});

process.on('uncaughtException', (err) => {
  console.error('[FATAL] Uncaught exception:', err);
  process.exit(1);
});

process.on('unhandledRejection', (reason) => {
  console.error('[FATAL] Unhandled rejection:', reason);
});
