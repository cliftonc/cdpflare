-- Seed the default events dashboard
INSERT INTO dashboards (id, name, description, config, display_order, is_active, is_default, created_at, updated_at)
VALUES (
  'default-events-dashboard',
  'Events Overview',
  'Default analytics dashboard showing key event metrics and trends',
  '{
    "layoutMode": "grid",
    "grid": { "cols": 12, "rowHeight": 90, "minW": 3, "minH": 3 },
    "portlets": [
      {
        "id": "kpi-total-events",
        "title": "Total Events",
        "w": 4,
        "h": 3,
        "x": 0,
        "y": 0,
        "analysisConfig": {
          "version": 1,
          "analysisType": "query",
          "activeView": "chart",
          "charts": {
            "query": {
              "chartType": "kpiNumber",
              "chartConfig": { "yAxis": ["Events.count"] },
              "displayConfig": { "decimals": 0, "suffix": " events" }
            }
          },
          "query": {
            "measures": ["Events.count"],
            "timeDimensions": [{
              "dimension": "Events.timestamp",
              "granularity": "day",
              "dateRange": "last 30 days"
            }]
          }
        }
      },
      {
        "id": "kpi-unique-users",
        "title": "Unique Users",
        "w": 4,
        "h": 3,
        "x": 4,
        "y": 0,
        "analysisConfig": {
          "version": 1,
          "analysisType": "query",
          "activeView": "chart",
          "charts": {
            "query": {
              "chartType": "kpiNumber",
              "chartConfig": { "yAxis": ["Events.uniqueUsers"] },
              "displayConfig": { "decimals": 0, "suffix": " users" }
            }
          },
          "query": {
            "measures": ["Events.uniqueUsers"],
            "timeDimensions": [{
              "dimension": "Events.timestamp",
              "granularity": "day",
              "dateRange": "last 30 days"
            }]
          }
        }
      },
      {
        "id": "kpi-anonymous-users",
        "title": "Anonymous Users",
        "w": 4,
        "h": 3,
        "x": 8,
        "y": 0,
        "analysisConfig": {
          "version": 1,
          "analysisType": "query",
          "activeView": "chart",
          "charts": {
            "query": {
              "chartType": "kpiNumber",
              "chartConfig": { "yAxis": ["Events.uniqueAnonymous"] },
              "displayConfig": { "decimals": 0, "suffix": " visitors" }
            }
          },
          "query": {
            "measures": ["Events.uniqueAnonymous"],
            "timeDimensions": [{
              "dimension": "Events.timestamp",
              "granularity": "day",
              "dateRange": "last 30 days"
            }]
          }
        }
      },
      {
        "id": "chart-events-over-time",
        "title": "Events Over Time",
        "w": 8,
        "h": 6,
        "x": 0,
        "y": 3,
        "analysisConfig": {
          "version": 1,
          "analysisType": "query",
          "activeView": "chart",
          "charts": {
            "query": {
              "chartType": "line",
              "chartConfig": {
                "xAxis": ["Events.timestamp"],
                "yAxis": ["Events.count"]
              },
              "displayConfig": { "showLegend": false, "showGrid": true }
            }
          },
          "query": {
            "measures": ["Events.count"],
            "timeDimensions": [{
              "dimension": "Events.timestamp",
              "granularity": "day",
              "dateRange": "last 30 days"
            }]
          }
        }
      },
      {
        "id": "chart-events-by-type",
        "title": "Events by Type",
        "w": 4,
        "h": 6,
        "x": 8,
        "y": 3,
        "analysisConfig": {
          "version": 1,
          "analysisType": "query",
          "activeView": "chart",
          "charts": {
            "query": {
              "chartType": "bar",
              "chartConfig": {
                "xAxis": ["Events.type"],
                "yAxis": ["Events.count"]
              },
              "displayConfig": { "showLegend": false, "stacked": false, "showGrid": true }
            }
          },
          "query": {
            "measures": ["Events.count"],
            "dimensions": ["Events.type"],
            "order": { "Events.count": "desc" }
          }
        }
      },
      {
        "id": "grid-top-events",
        "title": "Top Event Names",
        "w": 12,
        "h": 6,
        "x": 0,
        "y": 9,
        "analysisConfig": {
          "version": 1,
          "analysisType": "query",
          "activeView": "chart",
          "charts": {
            "query": {
              "chartType": "table",
              "chartConfig": {},
              "displayConfig": {}
            }
          },
          "query": {
            "measures": ["Events.count"],
            "dimensions": ["Events.event"],
            "order": { "Events.count": "desc" },
            "limit": 10
          }
        }
      }
    ]
  }',
  0,
  1,
  1,
  datetime('now'),
  datetime('now')
)
ON CONFLICT(id) DO UPDATE SET
  name = excluded.name,
  description = excluded.description,
  config = excluded.config,
  updated_at = datetime('now');
