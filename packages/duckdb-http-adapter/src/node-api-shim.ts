/**
 * Shim for @duckdb/node-api
 *
 * This module provides stub exports for @duckdb/node-api to prevent
 * bundling of native bindings in Cloudflare Workers. The HTTP adapter
 * doesn't use native DuckDB - it makes HTTP requests to a DuckDB API.
 *
 * Usage in wrangler.jsonc:
 * {
 *   "alias": {
 *     "@duckdb/node-api": "@cdpflare/duckdb-http-adapter/node-api-shim"
 *   }
 * }
 */

// Value constructors used by drizzle-neo-duckdb
export function listValue(values: unknown[]): unknown {
  return { type: 'list', values };
}

export function arrayValue(values: unknown[]): unknown {
  return { type: 'array', values };
}

export function structValue(fields: Record<string, unknown>): unknown {
  return { type: 'struct', fields };
}

export function mapValue(entries: Map<unknown, unknown>): unknown {
  return { type: 'map', entries };
}

export function blobValue(data: Uint8Array): unknown {
  return { type: 'blob', data };
}

export function timestampValue(micros: bigint): unknown {
  return { type: 'timestamp', micros };
}

export function timestampTZValue(micros: bigint): unknown {
  return { type: 'timestamptz', micros };
}

// Class stubs - these should never be instantiated when using HTTP adapter
export class DuckDBInstance {
  static create(): Promise<DuckDBInstance> {
    throw new Error('Native DuckDB not available in Workers - use HttpDuckDBConnection instead');
  }
}

export class DuckDBConnection {
  constructor() {
    throw new Error('Native DuckDB not available in Workers - use HttpDuckDBConnection instead');
  }
}

export class DuckDBPreparedStatement {
  constructor() {
    throw new Error('Native DuckDB not available in Workers - use HttpDuckDBConnection instead');
  }
}

// Type exports (these are just for TypeScript, no runtime value)
export type DuckDBValue = unknown;
export type DuckDBResult = unknown;
