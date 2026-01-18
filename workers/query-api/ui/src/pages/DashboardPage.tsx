import { useCallback, useMemo } from 'react'
import { CubeProvider, AnalyticsDashboard } from 'drizzle-cube/client'
import { useDefaultDashboard, useUpdateDashboard } from '../hooks/useDashboards'
import type { DashboardConfig } from '../types/dashboard'

const apiOptions = { apiUrl: '/cubejs-api/v1' }
const features = { useAnalysisBuilder: true }

export default function DashboardPage() {
  const { data: dashboard, isLoading, error } = useDefaultDashboard()
  const { mutateAsync: updateDashboard } = useUpdateDashboard()

  const dashboardId = dashboard?.id

  const handleSave = useCallback(
    async (config: DashboardConfig) => {
      if (!dashboardId || !dashboard) return
      await updateDashboard({
        id: dashboardId,
        name: dashboard.name,
        description: dashboard.description ?? undefined,
        displayOrder: dashboard.displayOrder,
        isDefault: dashboard.isDefault,
        config
      })
    },
    [dashboard, dashboardId, updateDashboard]
  )

  const resolvedFeatures = useMemo(
    () => ({ ...features, dashboardModes: ['rows', 'grid'] }),
    []
  )

  if (isLoading) {
    return (
      <div className="container mx-auto p-4 max-w-7xl">
        <div className="text-center py-8">
          <span className="loading loading-spinner loading-lg"></span>
          <p className="mt-2 text-base-content/60">Loading dashboard...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="container mx-auto p-4 max-w-7xl">
        <div className="text-center py-8">
          <p className="text-error">Failed to load dashboard</p>
          <p className="text-sm text-base-content/60 mt-1">
            {error instanceof Error ? error.message : 'Unknown error'}
          </p>
        </div>
      </div>
    )
  }

  if (!dashboard) {
    return (
      <div className="container mx-auto p-4 max-w-7xl">
        <div className="text-center py-12">
          <svg
            className="mx-auto h-12 w-12 text-base-content/40"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            aria-hidden="true"
          >
            <path
              vectorEffect="non-scaling-stroke"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
            />
          </svg>
          <h3 className="mt-2 text-lg font-medium">No Dashboard Configured</h3>
          <p className="mt-1 text-sm text-base-content/60">
            No default dashboard has been set up yet.
          </p>
          <p className="mt-4 text-sm text-base-content/60">
            Run database migrations to create the default dashboard.
          </p>
        </div>
      </div>
    )
  }

  return (
    <CubeProvider apiOptions={apiOptions} features={resolvedFeatures}>
      <div className="container mx-auto p-4 max-w-7xl">
        <div className="mb-6">
          <h1 className="text-2xl font-bold">{dashboard.name}</h1>
          {dashboard.description && (
            <p className="mt-1 text-base-content/60">{dashboard.description}</p>
          )}
        </div>

        <AnalyticsDashboard
          config={dashboard.config}
          editable={true}
          onSave={handleSave}
        />
      </div>
    </CubeProvider>
  )
}
