import { useQuery } from '@tanstack/react-query';

export interface DuckDbHealthResponse {
  status: 'ok' | 'error';
  service: string;
  container: Record<string, unknown> | null;
  error?: string;
  timestamp: string;
}

export type ContainerStatus = 'running' | 'starting' | 'error' | 'unknown';

export function getContainerStatus(
  health: DuckDbHealthResponse | null | undefined
): ContainerStatus {
  if (!health) return 'unknown';
  if (health.status === 'error') return 'error';
  if (health.container === null) return 'starting';
  return 'running';
}

export function useDuckDbHealth() {
  return useQuery({
    queryKey: ['duckdb-health'],
    queryFn: async (): Promise<DuckDbHealthResponse> => {
      const token = localStorage.getItem('icelight_api_token');

      const headers: Record<string, string> = {};
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const response = await fetch('/api/duckdb/_health', { headers });
      if (!response.ok) {
        throw new Error(`Health check failed: ${response.status}`);
      }
      return response.json();
    },
    refetchInterval: 30000,
    refetchIntervalInBackground: false,
    retry: 1,
    staleTime: 15000,
  });
}
