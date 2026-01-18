/**
 * Default dashboard configuration for icelight analytics events
 */
import type { DashboardConfig } from './types.js';

/**
 * Default dashboard ID (used for seeding)
 */
export const DEFAULT_DASHBOARD_ID = 'default-events-dashboard';

/**
 * Default dashboard using drizzle-cube AnalysisConfig-based portlets
 */
export const defaultDashboardConfig: DashboardConfig = {
  layoutMode: 'rows',
  grid: {
    cols: 12,
    rowHeight: 90,
    minW: 3,
    minH: 2,
  },
  portlets: [
    {
      id: 'kpi-total-events',
      title: 'Total Events',
      w: 4,
      h: 2,
      x: 0,
      y: 0,
      analysisConfig: {
        version: 1,
        analysisType: 'query',
        activeView: 'chart',
        charts: {
          query: {
            chartType: 'kpiNumber',
            chartConfig: {
              yAxis: ['Events.count'],
            },
            displayConfig: {
              decimals: 0,
              suffix: ' events',
            },
          },
        },
        query: {
          measures: ['Events.count'],
          timeDimensions: [
            {
              dimension: 'Events.timestamp',
              granularity: 'day',
              dateRange: 'last 30 days',
            },
          ],
        },
      },
    },
    {
      id: 'kpi-unique-users',
      title: 'Unique Users',
      w: 4,
      h: 2,
      x: 4,
      y: 0,
      analysisConfig: {
        version: 1,
        analysisType: 'query',
        activeView: 'chart',
        charts: {
          query: {
            chartType: 'kpiNumber',
            chartConfig: {
              yAxis: ['Events.uniqueUsers'],
            },
            displayConfig: {
              decimals: 0,
              suffix: ' users',
            },
          },
        },
        query: {
          measures: ['Events.uniqueUsers'],
          timeDimensions: [
            {
              dimension: 'Events.timestamp',
              granularity: 'day',
              dateRange: 'last 30 days',
            },
          ],
        },
      },
    },
    {
      id: 'kpi-anonymous-users',
      title: 'Anonymous Users',
      w: 4,
      h: 2,
      x: 8,
      y: 0,
      analysisConfig: {
        version: 1,
        analysisType: 'query',
        activeView: 'chart',
        charts: {
          query: {
            chartType: 'kpiNumber',
            chartConfig: {
              yAxis: ['Events.uniqueAnonymous'],
            },
            displayConfig: {
              decimals: 0,
              suffix: ' visitors',
            },
          },
        },
        query: {
          measures: ['Events.uniqueAnonymous'],
          timeDimensions: [
            {
              dimension: 'Events.timestamp',
              granularity: 'day',
              dateRange: 'last 30 days',
            },
          ],
        },
      },
    },
    {
      id: 'chart-events-over-time',
      title: 'Events Over Time',
      w: 12,
      h: 3,
      x: 0,
      y: 2,
      analysisConfig: {
        version: 1,
        analysisType: 'query',
        activeView: 'chart',
        charts: {
          query: {
            chartType: 'activityGrid',
            chartConfig: {
              dateField: ['Events.timestamp'],
              valueField: ['Events.count'],
            },
            displayConfig: {
              showLegend: false,
            },
          },
        },
        query: {
          measures: ['Events.count'],
          timeDimensions: [
            {
              dimension: 'Events.timestamp',
              granularity: 'day',
              dateRange: 'last 90 days',
            },
          ],
        },
      },
    },
    {
      id: 'chart-events-by-type',
      title: 'Events by Type',
      w: 6,
      h: 4,
      x: 0,
      y: 5,
      analysisConfig: {
        version: 1,
        analysisType: 'query',
        activeView: 'chart',
        charts: {
          query: {
            chartType: 'radialBar',
            chartConfig: {
              xAxis: ['Events.type'],
              yAxis: ['Events.count'],
            },
            displayConfig: {
              showLegend: true,
            },
          },
        },
        query: {
          measures: ['Events.count'],
          dimensions: ['Events.type'],
          order: {
            'Events.count': 'desc',
          },
        },
      },
    },
    {
      id: 'grid-top-events',
      title: 'Top Event Names',
      w: 6,
      h: 4,
      x: 6,
      y: 5,
      analysisConfig: {
        version: 1,
        analysisType: 'query',
        activeView: 'chart',
        charts: {
          query: {
            chartType: 'table',
            chartConfig: {},
            displayConfig: {},
          },
        },
        query: {
          measures: ['Events.count'],
          dimensions: ['Events.event'],
          order: {
            'Events.count': 'desc',
          },
          limit: 10,
        },
      },
    },
  ],
};

/**
 * Default dashboard record for database seeding
 */
export const defaultDashboardRecord = {
  id: DEFAULT_DASHBOARD_ID,
  name: 'Events Overview',
  description: 'Default analytics dashboard showing key event metrics and trends',
  config: defaultDashboardConfig,
  displayOrder: 0,
  isActive: true,
  isDefault: true,
};
