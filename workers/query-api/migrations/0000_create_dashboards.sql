-- Create dashboards table for storing dashboard configurations
CREATE TABLE IF NOT EXISTS dashboards (
  id TEXT PRIMARY KEY NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  config TEXT NOT NULL,
  display_order INTEGER NOT NULL DEFAULT 0,
  is_active INTEGER NOT NULL DEFAULT 1,
  is_default INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

-- Index for querying active dashboards sorted by display order
CREATE INDEX IF NOT EXISTS idx_dashboards_active_order ON dashboards (is_active, display_order);

-- Index for finding the default dashboard
CREATE INDEX IF NOT EXISTS idx_dashboards_default ON dashboards (is_default) WHERE is_default = 1;
