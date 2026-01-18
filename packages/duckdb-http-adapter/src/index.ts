/**
 * @icelight/duckdb-http-adapter
 *
 * HTTP adapter for drizzle-duckdb to query icelight DuckDB API.
 *
 * This package provides an HTTP-based implementation of the DuckDB connection
 * interface expected by drizzle-duckdb, allowing you to use drizzle with
 * a remote DuckDB instance accessed via HTTP.
 *
 * @example
 * ```typescript
 * import { drizzle } from 'drizzle-duckdb';
 * import { HttpDuckDBConnection } from '@icelight/duckdb-http-adapter';
 *
 * // Create connection to your DuckDB API worker
 * const connection = new HttpDuckDBConnection({
 *   endpoint: 'https://icelight-duckdb-api.example.workers.dev',
 *   token: process.env.API_TOKEN, // optional
 * });
 *
 * // Use with drizzle
 * const db = drizzle(connection);
 *
 * // Execute queries
 * const events = await db.execute(sql`
 *   SELECT * FROM r2_datalake.analytics.events LIMIT 10
 * `);
 * ```
 */

// Main connection class
export { HttpDuckDBConnection } from './connection.js';

// Result wrappers
export { HttpQueryResult, HttpStreamResult } from './result.js';

// Prepared statement
export { HttpPreparedStatement } from './prepared.js';

// Type exports
export type {
  DuckDBConnection,
  DuckDBPreparedStatement,
  DuckDBQueryResult,
  DuckDBStreamResult,
  DuckDBValue,
  DuckDBPrimitive,
  HttpConnectionOptions,
  QueryApiResponse,
} from './types.js';
