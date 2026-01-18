/**
 * HttpDuckDBConnection - HTTP adapter for drizzle-duckdb
 *
 * Translates drizzle-duckdb connection calls to HTTP requests
 * against the cdpflare DuckDB API worker.
 */

import type {
  DuckDBConnection,
  DuckDBQueryResult,
  DuckDBStreamResult,
  DuckDBValue,
  HttpConnectionOptions,
  QueryApiResponse,
} from './types.js';
import { HttpQueryResult, HttpStreamResult } from './result.js';
import { HttpPreparedStatement } from './prepared.js';

/**
 * Default request timeout in milliseconds
 */
const DEFAULT_TIMEOUT = 30000;

/**
 * HTTP-based DuckDB connection for use with drizzle-duckdb
 *
 * @example
 * ```typescript
 * import { drizzle } from 'drizzle-duckdb';
 * import { HttpDuckDBConnection } from '@cdpflare/duckdb-http-adapter';
 *
 * const connection = new HttpDuckDBConnection({
 *   endpoint: 'https://cdpflare-duckdb-api.example.workers.dev',
 *   token: process.env.API_TOKEN,
 * });
 *
 * const db = drizzle(connection);
 * const events = await db.execute(sql`SELECT * FROM r2_datalake.analytics.events LIMIT 10`);
 * ```
 */
export class HttpDuckDBConnection implements DuckDBConnection {
  private readonly endpoint: string;
  private readonly token?: string;
  private readonly timeout: number;
  private readonly customFetch?: typeof fetch;

  constructor(options: HttpConnectionOptions) {
    // Normalize endpoint - remove trailing slash
    this.endpoint = options.endpoint.replace(/\/$/, '');
    this.token = options.token;
    this.timeout = options.timeout ?? DEFAULT_TIMEOUT;
    // Only store custom fetch if provided - otherwise use global fetch directly
    this.customFetch = options.fetch;
  }

  /**
   * Execute a query and return results
   */
  async run(query: string, params?: DuckDBValue[]): Promise<DuckDBQueryResult> {
    return this.executeQuery(query, params ?? []);
  }

  /**
   * Execute a query and stream results
   * Note: This implementation returns all results at once (no true streaming)
   */
  async stream(query: string, params?: DuckDBValue[]): Promise<DuckDBStreamResult> {
    const response = await this.fetchQuery(query, params ?? []);
    return new HttpStreamResult(response.columns ?? [], response.data ?? []);
  }

  /**
   * Prepare a statement for later execution
   */
  async prepare(query: string): Promise<HttpPreparedStatement> {
    return new HttpPreparedStatement(query, (q, p) => this.executeQuery(q, p));
  }

  /**
   * Internal: Execute query and wrap in HttpQueryResult
   */
  private async executeQuery(
    query: string,
    params: DuckDBValue[]
  ): Promise<DuckDBQueryResult> {
    const response = await this.fetchQuery(query, params);
    return new HttpQueryResult(response.columns ?? [], response.data ?? []);
  }

  /**
   * Internal: Make HTTP request to the DuckDB API
   */
  private async fetchQuery(
    query: string,
    params: DuckDBValue[]
  ): Promise<QueryApiResponse> {
    const url = `${this.endpoint}/query`;

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }

    // Apply parameter substitution if needed
    let finalQuery = this.substituteParams(query, params);

    // Fix drizzle-neo-duckdb bug: LIMIT/OFFSET values sometimes appear as [N] arrays
    // Replace patterns like "limit [25]" or "offset [10]" with "limit 25" or "offset 10"
    finalQuery = finalQuery.replace(/\b(limit|offset)\s+\[(\d+)\]/gi, '$1 $2');

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeout);

    try {
      // Use custom fetch if provided, otherwise use global fetch directly
      // (storing globalThis.fetch in a variable causes "Illegal invocation" in Workers)
      const fetchFn = this.customFetch ?? fetch;
      const response = await fetchFn(url, {
        method: 'POST',
        headers,
        body: JSON.stringify({ query: finalQuery }),
        signal: controller.signal,
      });

      if (!response.ok) {
        const errorBody = await response.text();
        throw new Error(
          `HTTP ${response.status}: ${errorBody || response.statusText}`
        );
      }

      const result = (await response.json()) as QueryApiResponse;

      if (!result.success) {
        throw new Error(result.error ?? 'Query execution failed');
      }

      return result;
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        throw new Error(`Query timeout after ${this.timeout}ms`);
      }
      throw error;
    } finally {
      clearTimeout(timeoutId);
    }
  }

  /**
   * Substitute positional parameters ($1, $2, etc.) in query string
   *
   * Note: This is a simple string substitution. For production use,
   * the server should support parameterized queries to prevent SQL injection.
   */
  private substituteParams(query: string, params: DuckDBValue[]): string {
    if (params.length === 0) {
      return query;
    }

    let result = query;
    for (let i = 0; i < params.length; i++) {
      const placeholder = `$${i + 1}`;
      const value = this.formatValue(params[i]);
      result = result.split(placeholder).join(value);
    }

    return result;
  }

  /**
   * Format a value for SQL string interpolation
   */
  private formatValue(value: DuckDBValue): string {
    if (value === null) {
      return 'NULL';
    }

    if (typeof value === 'boolean') {
      return value ? 'TRUE' : 'FALSE';
    }

    if (typeof value === 'number') {
      return String(value);
    }

    if (typeof value === 'bigint') {
      return String(value);
    }

    if (typeof value === 'string') {
      // Escape single quotes by doubling them
      return `'${value.replace(/'/g, "''")}'`;
    }

    if (value instanceof Date) {
      return `'${value.toISOString()}'`;
    }

    if (value instanceof Uint8Array) {
      // Convert to hex string for blob values
      const hex = Array.from(value)
        .map((b) => b.toString(16).padStart(2, '0'))
        .join('');
      return `'\\x${hex}'::BLOB`;
    }

    if (Array.isArray(value)) {
      // Handle single-element numeric arrays specially (often LIMIT/OFFSET values)
      // drizzle-neo-duckdb sometimes passes these as [25] instead of 25
      if (value.length === 1 && typeof value[0] === 'number') {
        return String(value[0]);
      }
      const formatted = value.map((v) => this.formatValue(v)).join(', ');
      return `[${formatted}]`;
    }

    if (typeof value === 'object') {
      // For objects, convert to JSON string
      return `'${JSON.stringify(value).replace(/'/g, "''")}'::JSON`;
    }

    return String(value);
  }
}
