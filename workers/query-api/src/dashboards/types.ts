// Import drizzle-cube client dashboard types for local use
import type {
  PortletConfig,
  ChartType,
  ChartAxisConfig,
  ChartDisplayConfig,
  DashboardConfig,
  CubeQuery,
} from 'drizzle-cube/client';

// Re-export for consumers
export type {
  PortletConfig,
  ChartType,
  ChartAxisConfig,
  ChartDisplayConfig,
  DashboardConfig,
  CubeQuery,
};

/**
 * Dashboard record as stored in the database
 */
export interface DashboardRecord {
  id: string;
  name: string;
  description?: string | null;
  config: DashboardConfig;
  displayOrder: number;
  isActive: boolean;
  isDefault: boolean;
  createdAt: string;
  updatedAt: string;
}

/**
 * Dashboard creation input
 */
export interface CreateDashboardInput {
  name: string;
  description?: string;
  config: DashboardConfig;
  displayOrder?: number;
  isDefault?: boolean;
}

/**
 * Dashboard update input
 */
export interface UpdateDashboardInput {
  name?: string;
  description?: string;
  config?: DashboardConfig;
  displayOrder?: number;
  isDefault?: boolean;
}

/**
 * API response types
 */
export interface DashboardListResponse {
  success: boolean;
  data: DashboardRecord[];
}

export interface DashboardResponse {
  success: boolean;
  data?: DashboardRecord;
  error?: string;
}
