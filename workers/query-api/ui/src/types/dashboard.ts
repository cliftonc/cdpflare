// Re-export types from drizzle-cube client
export type {
  PortletConfig,
  ChartType,
  ChartAxisConfig,
  ChartDisplayConfig,
  DashboardConfig,
  CubeQuery
} from 'drizzle-cube/client'

// Import DashboardConfig for use in interfaces
import type { DashboardConfig } from 'drizzle-cube/client'

// Dashboard record as returned by the API
export interface DashboardRecord {
  id: string
  name: string
  description?: string | null
  config: DashboardConfig
  displayOrder: number
  isActive: boolean
  isDefault: boolean
  createdAt: string
  updatedAt: string
}

// API request types
export interface CreateDashboardRequest {
  name: string
  description?: string
  config: DashboardConfig
  displayOrder?: number
  isDefault?: boolean
}

export interface UpdateDashboardRequest {
  name?: string
  description?: string
  config?: DashboardConfig
  displayOrder?: number
  isDefault?: boolean
}

// API response types
export interface DashboardListResponse {
  success: boolean
  data: DashboardRecord[]
}

export interface DashboardResponse {
  success: boolean
  data?: DashboardRecord
  error?: string
}
