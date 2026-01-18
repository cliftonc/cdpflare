import { useMutation, useQuery } from '@tanstack/react-query';

export interface QueryResult {
  success: boolean;
  data: Record<string, unknown>[];
  columns: string[];
}

interface QueryRequest {
  sql: string;
  format?: 'json' | 'csv';
}

async function executeQuery(request: QueryRequest): Promise<QueryResult> {
  const token = localStorage.getItem('icelight_api_token');

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch('/query', {
    method: 'POST',
    headers,
    body: JSON.stringify(request),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(
      (errorData as { error?: string }).error ||
        `Query failed: ${response.status}`
    );
  }

  const result = (await response.json()) as {
    success: boolean;
    data: Record<string, unknown>[];
  };

  if (!result.success) {
    throw new Error('Query failed');
  }

  // Extract column names from the first row if data exists
  const columns = result.data.length > 0 ? Object.keys(result.data[0]) : [];

  return {
    success: result.success,
    data: result.data,
    columns,
  };
}

export function useExecuteQuery() {
  return useMutation({
    mutationFn: executeQuery,
  });
}

// Schema types
export interface TableInfo {
  table_name: string;
}

export interface ColumnInfo {
  column_name: string;
  type: string;
  required: string;
}

interface TablesResponse {
  success: boolean;
  data: TableInfo[];
}

interface SchemaResponse {
  success: boolean;
  data: ColumnInfo[];
}

function getAuthHeaders(): Record<string, string> {
  const token = localStorage.getItem('icelight_api_token');
  const headers: Record<string, string> = {};
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  return headers;
}

async function fetchTables(namespace: string): Promise<TableInfo[]> {
  const response = await fetch(`/tables/${namespace}`, {
    headers: getAuthHeaders(),
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch tables: ${response.status}`);
  }

  const result = (await response.json()) as TablesResponse;
  if (!result.success) {
    throw new Error('Failed to fetch tables');
  }

  return result.data;
}

async function fetchTableSchema(namespace: string, table: string): Promise<ColumnInfo[]> {
  const response = await fetch(`/tables/${namespace}/${table}`, {
    headers: getAuthHeaders(),
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch schema: ${response.status}`);
  }

  const result = (await response.json()) as SchemaResponse;
  if (!result.success) {
    throw new Error('Failed to fetch schema');
  }

  return result.data;
}

export function useTables(namespace: string) {
  return useQuery({
    queryKey: ['tables', namespace],
    queryFn: () => fetchTables(namespace),
    enabled: !!namespace,
  });
}

export function useTableSchema(namespace: string, table: string) {
  return useQuery({
    queryKey: ['schema', namespace, table],
    queryFn: () => fetchTableSchema(namespace, table),
    enabled: !!namespace && !!table,
  });
}
