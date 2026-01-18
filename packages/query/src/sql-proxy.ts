/**
 * R2 SQL API proxy
 * Proxies SQL queries to Cloudflare's R2 SQL API
 */

import { validateNamespace, validateIdentifier } from '@icelight/sql-guard';

export interface R2SqlConfig {
  accountId: string;
  apiToken: string;
  warehouseName: string; // This is the R2 bucket name
}

export interface R2SqlResult {
  success: boolean;
  data?: unknown[];
  meta?: {
    columns?: Array<{ name: string; type: string }>;
    rowCount?: number;
    executionTime?: number;
  };
  error?: string;
}

/**
 * Execute a SQL query against R2 SQL
 */
export async function executeQuery(
  sql: string,
  config: R2SqlConfig
): Promise<R2SqlResult> {
  const url = `https://api.sql.cloudflarestorage.com/api/v1/accounts/${config.accountId}/r2-sql/query/${config.warehouseName}`;

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${config.apiToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ query: sql }),
    });

    if (!response.ok) {
      const errorBody = await response.text();
      let errorMessage = `R2 SQL API error: ${response.status}`;

      try {
        const errorJson = JSON.parse(errorBody);
        if (errorJson.errors?.[0]?.message) {
          errorMessage = errorJson.errors[0].message;
        }
      } catch {
        if (errorBody) {
          errorMessage = errorBody;
        }
      }

      return { success: false, error: errorMessage };
    }

    const result = await response.json() as {
      success: boolean;
      result?: {
        rows?: unknown[];
        schema?: Array<{ name: string; descriptor: { type: { name: string } } }>;
        metrics?: {
          bytes_scanned?: number;
          files_scanned?: number;
        };
      };
      errors?: Array<{ message: string }>;
    };

    if (!result.success) {
      return {
        success: false,
        error: result.errors?.[0]?.message || 'Unknown error',
      };
    }

    // Map schema to columns format
    const columns = result.result?.schema?.map(col => ({
      name: col.name,
      type: col.descriptor?.type?.name || 'unknown',
    }));

    return {
      success: true,
      data: result.result?.rows || [],
      meta: {
        columns,
        rowCount: result.result?.rows?.length,
      },
    };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Failed to execute query',
    };
  }
}

/**
 * List tables in a namespace
 */
export async function listTables(
  namespace: string,
  config: R2SqlConfig
): Promise<R2SqlResult> {
  const validation = validateNamespace(namespace);
  if (!validation.valid) {
    return { success: false, error: `Invalid namespace: ${validation.error}` };
  }
  const sql = `SHOW TABLES IN ${validation.sanitized}`;
  return executeQuery(sql, config);
}

/**
 * Describe a table schema
 */
export async function describeTable(
  namespace: string,
  tableName: string,
  config: R2SqlConfig
): Promise<R2SqlResult> {
  const nsValidation = validateNamespace(namespace);
  if (!nsValidation.valid) {
    return { success: false, error: `Invalid namespace: ${nsValidation.error}` };
  }
  const tableValidation = validateIdentifier(tableName);
  if (!tableValidation.valid) {
    return { success: false, error: `Invalid table name: ${tableValidation.error}` };
  }
  const sql = `DESCRIBE ${nsValidation.sanitized}.${tableValidation.sanitized}`;
  return executeQuery(sql, config);
}
