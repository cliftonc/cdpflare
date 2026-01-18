/**
 * Type definitions for the DuckDB HTTP adapter
 *
 * These types define the interfaces that drizzle-duckdb expects,
 * allowing the HTTP adapter to be used as a drop-in replacement
 * for the native @duckdb/node-api connection.
 */

/**
 * DuckDB primitive value types
 */
export type DuckDBPrimitive =
  | null
  | boolean
  | number
  | bigint
  | string
  | Date
  | Uint8Array;

/**
 * DuckDB value types that can be used in queries
 */
export type DuckDBValue =
  | DuckDBPrimitive
  | DuckDBValue[]
  | { [key: string]: DuckDBValue };

/**
 * Configuration options for the HTTP connection
 */
export interface HttpConnectionOptions {
  /**
   * Base URL of the DuckDB API endpoint
   * @example "https://icelight-duckdb-api.example.workers.dev"
   */
  endpoint: string;

  /**
   * Optional Bearer token for API authentication
   */
  token?: string;

  /**
   * Request timeout in milliseconds
   * @default 30000
   */
  timeout?: number;

  /**
   * Custom fetch function (for testing or environments without global fetch)
   */
  fetch?: typeof fetch;
}

/**
 * Response from the DuckDB API /query endpoint
 */
export interface QueryApiResponse {
  success: boolean;
  data?: Record<string, unknown>[];
  columns?: string[];
  rowCount?: number;
  error?: string;
}

/**
 * Interface for query results (matches drizzle-duckdb expectations)
 */
export interface DuckDBQueryResult {
  /**
   * Get column names from the result
   */
  columnNames(): string[];

  /**
   * Get deduplicated column names (for duplicate column handling)
   */
  deduplicatedColumnNames(): string[];

  /**
   * Get all rows as JavaScript arrays
   */
  getRowsJS(): Promise<unknown[][]>;
}

/**
 * Interface for prepared statements (matches drizzle-duckdb expectations)
 */
export interface DuckDBPreparedStatement {
  /**
   * Bind values to the prepared statement
   */
  bind(...values: DuckDBValue[]): void;

  /**
   * Execute the prepared statement and return results
   */
  run(): Promise<DuckDBQueryResult>;

  /**
   * Synchronously destroy the prepared statement
   */
  destroySync(): void;
}

/**
 * Interface for stream results
 * Minimal implementation - returns all rows at once
 */
export interface DuckDBStreamResult extends AsyncIterable<unknown[]> {
  /**
   * Get column names from the result
   */
  columnNames(): string[];
}

/**
 * Interface for the connection (matches drizzle-duckdb expectations)
 */
export interface DuckDBConnection {
  /**
   * Execute a query and return results
   */
  run(query: string, params?: DuckDBValue[]): Promise<DuckDBQueryResult>;

  /**
   * Execute a query and stream results
   */
  stream(query: string, params?: DuckDBValue[]): Promise<DuckDBStreamResult>;

  /**
   * Prepare a statement for later execution
   */
  prepare(query: string): Promise<DuckDBPreparedStatement>;
}
