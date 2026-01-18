/**
 * HttpPreparedStatement - Minimal prepared statement implementation
 *
 * Note: This is a minimal implementation that executes the query
 * each time run() is called. There is no server-side statement caching.
 */

import type {
  DuckDBPreparedStatement,
  DuckDBQueryResult,
  DuckDBValue,
} from './types.js';

/**
 * Function type for executing queries
 */
export type QueryExecutor = (
  query: string,
  params: DuckDBValue[]
) => Promise<DuckDBQueryResult>;

/**
 * Minimal prepared statement that executes query per call
 */
export class HttpPreparedStatement implements DuckDBPreparedStatement {
  private readonly query: string;
  private readonly executor: QueryExecutor;
  private boundValues: DuckDBValue[] = [];
  private destroyed = false;

  constructor(query: string, executor: QueryExecutor) {
    this.query = query;
    this.executor = executor;
  }

  /**
   * Bind values to the prepared statement
   */
  bind(...values: DuckDBValue[]): void {
    if (this.destroyed) {
      throw new Error('Cannot bind to destroyed prepared statement');
    }
    this.boundValues = values;
  }

  /**
   * Execute the prepared statement and return results
   */
  async run(): Promise<DuckDBQueryResult> {
    if (this.destroyed) {
      throw new Error('Cannot run destroyed prepared statement');
    }
    return this.executor(this.query, this.boundValues);
  }

  /**
   * Synchronously destroy the prepared statement
   * (No-op for HTTP adapter since there's nothing to clean up)
   */
  destroySync(): void {
    this.destroyed = true;
    this.boundValues = [];
  }
}
