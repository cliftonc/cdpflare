/**
 * HttpQueryResult - Wraps HTTP API response in drizzle-duckdb expected format
 */

import type { DuckDBQueryResult, DuckDBStreamResult } from './types.js';

/**
 * Transform a single value from DuckDB's JSON format to JavaScript types.
 * - {micros: "..."} → Date object (timestamps)
 * - {days: ...} → Date object (dates)
 */
function transformValue(value: unknown): unknown {
  if (value && typeof value === 'object' && !Array.isArray(value)) {
    const obj = value as Record<string, unknown>;

    // DuckDB timestamp: {micros: "..."} → Date
    if ('micros' in obj && Object.keys(obj).length === 1) {
      const micros = BigInt(obj.micros as string | bigint);
      const millis = Number(micros / 1000n);
      return new Date(millis);
    }

    // DuckDB date: {days: ...} → Date
    if ('days' in obj && Object.keys(obj).length === 1) {
      const days = Number(obj.days);
      const millis = days * 24 * 60 * 60 * 1000;
      return new Date(millis);
    }
  }

  return value;
}

/**
 * Wraps query results from the HTTP API in the format drizzle-duckdb expects
 */
export class HttpQueryResult implements DuckDBQueryResult {
  private readonly columns: string[];
  private readonly rows: unknown[][];

  constructor(columns: string[], data: Record<string, unknown>[]) {
    this.columns = columns;

    // Transform array of objects to array of arrays (columnar format)
    // Also convert DuckDB special types (timestamps, dates) to JavaScript types
    this.rows = data.map((row) =>
      columns.map((col) => transformValue(row[col] ?? null))
    );
  }

  /**
   * Get column names from the result
   */
  columnNames(): string[] {
    return this.columns;
  }

  /**
   * Get deduplicated column names
   * Handles case where query returns duplicate column names
   */
  deduplicatedColumnNames(): string[] {
    const seen = new Map<string, number>();
    return this.columns.map((name) => {
      const count = seen.get(name) ?? 0;
      seen.set(name, count + 1);
      return count === 0 ? name : `${name}_${count}`;
    });
  }

  /**
   * Get all rows as JavaScript arrays
   */
  async getRowsJS(): Promise<unknown[][]> {
    return this.rows;
  }
}

/**
 * Wraps query results for streaming iteration
 * Note: This is a minimal implementation that returns all rows at once
 */
export class HttpStreamResult implements DuckDBStreamResult {
  private readonly columns: string[];
  private readonly rows: unknown[][];

  constructor(columns: string[], data: Record<string, unknown>[]) {
    this.columns = columns;
    // Transform values same as HttpQueryResult
    this.rows = data.map((row) =>
      columns.map((col) => transformValue(row[col] ?? null))
    );
  }

  /**
   * Get column names from the result
   */
  columnNames(): string[] {
    return this.columns;
  }

  /**
   * Iterate over rows asynchronously
   */
  async *[Symbol.asyncIterator](): AsyncIterator<unknown[]> {
    for (const row of this.rows) {
      yield row;
    }
  }
}
