import { useCallback, useMemo, useState } from 'react'
import { CubeProvider, AnalyticsDashboard } from 'drizzle-cube/client'
import { useDefaultDashboard, useUpdateDashboard, useResetDashboard } from '../hooks/useDashboards'
import type { DashboardConfig } from '../types/dashboard'

const apiOptions = { apiUrl: '/cubejs-api/v1' }
const features = { useAnalysisBuilder: true }

export default function DashboardPage() {
  const { data: dashboard, isLoading, error } = useDefaultDashboard()
  const { mutateAsync: updateDashboard } = useUpdateDashboard()
  const { mutateAsync: resetDashboard, isPending: isResetting } = useResetDashboard()
  const [showResetConfirm, setShowResetConfirm] = useState(false)

  const dashboardId = dashboard?.id

  const handleReset = useCallback(async () => {
    try {
      await resetDashboard()
      setShowResetConfirm(false)
    } catch (err) {
      console.error('Failed to reset dashboard:', err)
    }
  }, [resetDashboard])

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
        <div className="mb-6 flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold">{dashboard.name}</h1>
            {dashboard.description && (
              <p className="mt-1 text-base-content/60">{dashboard.description}</p>
            )}
          </div>
          <button
            className="btn btn-outline btn-sm"
            onClick={() => setShowResetConfirm(true)}
            disabled={isResetting}
          >
            {isResetting ? (
              <span className="loading loading-spinner loading-xs"></span>
            ) : (
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-4 w-4"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                />
              </svg>
            )}
            Reset Dashboard
          </button>
        </div>

        <AnalyticsDashboard
          config={dashboard.config}
          editable={true}
          onSave={handleSave}
        />

        {/* Reset Confirmation Modal */}
        {showResetConfirm && (
          <div className="modal modal-open">
            <div className="modal-box">
              <h3 className="font-bold text-lg">Reset Dashboard?</h3>
              <p className="py-4">
                This will restore the dashboard to its default configuration. Any
                customizations you've made will be lost.
              </p>
              <div className="modal-action">
                <button
                  className="btn btn-ghost"
                  onClick={() => setShowResetConfirm(false)}
                  disabled={isResetting}
                >
                  Cancel
                </button>
                <button
                  className="btn btn-primary"
                  onClick={handleReset}
                  disabled={isResetting}
                >
                  {isResetting ? (
                    <span className="loading loading-spinner loading-xs"></span>
                  ) : null}
                  Reset
                </button>
              </div>
            </div>
            <div
              className="modal-backdrop"
              onClick={() => setShowResetConfirm(false)}
            ></div>
          </div>
        )}
      </div>
    </CubeProvider>
  )
}
