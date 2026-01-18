import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import type {
  DashboardRecord,
  DashboardListResponse,
  DashboardResponse,
  CreateDashboardRequest,
  UpdateDashboardRequest
} from '../types/dashboard'

const API_BASE = '/api/dashboards'

// Fetch all dashboards
export function useDashboards() {
  return useQuery({
    queryKey: ['dashboards'],
    queryFn: async (): Promise<DashboardRecord[]> => {
      const response = await fetch(API_BASE)
      if (!response.ok) {
        throw new Error('Failed to fetch dashboards')
      }
      const data: DashboardListResponse = await response.json()
      if (!data.success) {
        throw new Error('Failed to fetch dashboards')
      }
      return data.data
    }
  })
}

// Fetch default dashboard
export function useDefaultDashboard() {
  return useQuery({
    queryKey: ['dashboards', 'default'],
    queryFn: async (): Promise<DashboardRecord | null> => {
      const response = await fetch(`${API_BASE}/default`)
      if (response.status === 404) {
        return null
      }
      if (!response.ok) {
        throw new Error('Failed to fetch default dashboard')
      }
      const data: DashboardResponse = await response.json()
      if (!data.success || !data.data) {
        return null
      }
      return data.data
    }
  })
}

// Fetch single dashboard
export function useDashboard(id: string | undefined) {
  return useQuery({
    queryKey: ['dashboards', id],
    queryFn: async (): Promise<DashboardRecord> => {
      const response = await fetch(`${API_BASE}/${id}`)
      if (!response.ok) {
        throw new Error('Failed to fetch dashboard')
      }
      const data: DashboardResponse = await response.json()
      if (!data.success || !data.data) {
        throw new Error(data.error || 'Dashboard not found')
      }
      return data.data
    },
    enabled: !!id
  })
}

// Create dashboard
export function useCreateDashboard() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (dashboardData: CreateDashboardRequest): Promise<DashboardRecord> => {
      const response = await fetch(API_BASE, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(dashboardData)
      })

      if (!response.ok) {
        throw new Error('Failed to create dashboard')
      }

      const data: DashboardResponse = await response.json()
      if (!data.success || !data.data) {
        throw new Error(data.error || 'Failed to create dashboard')
      }
      return data.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dashboards'] })
    }
  })
}

// Update dashboard
export function useUpdateDashboard() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      id,
      ...dashboardData
    }: UpdateDashboardRequest & { id: string }): Promise<DashboardRecord> => {
      const response = await fetch(`${API_BASE}/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(dashboardData)
      })

      if (!response.ok) {
        throw new Error('Failed to update dashboard')
      }

      const data: DashboardResponse = await response.json()
      if (!data.success || !data.data) {
        throw new Error(data.error || 'Failed to update dashboard')
      }
      return data.data
    },
    onSuccess: (updatedDashboard, variables) => {
      // Update the cache directly with the mutation result
      queryClient.setQueryData(['dashboards', variables.id], updatedDashboard)
      // Invalidate the list and default to refresh
      queryClient.invalidateQueries({ queryKey: ['dashboards'], exact: true })
      queryClient.invalidateQueries({ queryKey: ['dashboards', 'default'] })
    }
  })
}

// Delete dashboard
export function useDeleteDashboard() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (id: string): Promise<void> => {
      const response = await fetch(`${API_BASE}/${id}`, {
        method: 'DELETE'
      })

      if (!response.ok) {
        throw new Error('Failed to delete dashboard')
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dashboards'] })
    }
  })
}

// Set dashboard as default
export function useSetDefaultDashboard() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (id: string): Promise<DashboardRecord> => {
      const response = await fetch(`${API_BASE}/${id}/set-default`, {
        method: 'POST'
      })

      if (!response.ok) {
        throw new Error('Failed to set default dashboard')
      }

      const data: DashboardResponse = await response.json()
      if (!data.success || !data.data) {
        throw new Error(data.error || 'Failed to set default dashboard')
      }
      return data.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dashboards'] })
    }
  })
}

// Reset default dashboard to original config
export function useResetDashboard() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (): Promise<DashboardRecord> => {
      const response = await fetch(`${API_BASE}/default/reset`, {
        method: 'POST'
      })

      if (!response.ok) {
        throw new Error('Failed to reset dashboard')
      }

      const data: DashboardResponse = await response.json()
      if (!data.success || !data.data) {
        throw new Error(data.error || 'Failed to reset dashboard')
      }
      return data.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dashboards'] })
    }
  })
}
