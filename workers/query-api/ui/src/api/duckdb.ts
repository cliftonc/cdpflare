import { useMutation } from '@tanstack/react-query';

export interface DuckDbQueryResult {
  success: boolean;
  data: Record<string, unknown>[];
  columns: string[];
}

interface DuckDbQueryRequest {
  sql: string;
  format?: 'json' | 'csv';
}

async function executeDuckDbQuery(request: DuckDbQueryRequest): Promise<DuckDbQueryResult> {
  const token = localStorage.getItem('cdpflare_api_token');

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch('/duckdb', {
    method: 'POST',
    headers,
    body: JSON.stringify(request),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(
      (errorData as { error?: string }).error ||
        `DuckDB query failed: ${response.status}`
    );
  }

  const result = (await response.json()) as {
    success: boolean;
    data: Record<string, unknown>[];
  };

  if (!result.success) {
    throw new Error('DuckDB query failed');
  }

  // Extract column names from the first row if data exists
  const columns = result.data.length > 0 ? Object.keys(result.data[0]) : [];

  return {
    success: result.success,
    data: result.data,
    columns,
  };
}

export function useExecuteDuckDbQuery() {
  return useMutation({
    mutationFn: executeDuckDbQuery,
  });
}

/**
 * Export CSV from DuckDB query
 */
export async function exportDuckDbCsv(sql: string): Promise<Blob> {
  const token = localStorage.getItem('cdpflare_api_token');

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch('/duckdb', {
    method: 'POST',
    headers,
    body: JSON.stringify({ sql, format: 'csv' }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(
      (errorData as { error?: string }).error ||
        `DuckDB CSV export failed: ${response.status}`
    );
  }

  return response.blob();
}
