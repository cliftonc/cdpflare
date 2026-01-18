/**
 * Drizzle schema for D1 database tables
 */
import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core';

/**
 * Dashboards table - stores dashboard configurations as JSON
 */
export const dashboards = sqliteTable('dashboards', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  description: text('description'),
  config: text('config').notNull(), // JSON string of DashboardConfig
  displayOrder: integer('display_order').notNull().default(0),
  isActive: integer('is_active', { mode: 'boolean' }).notNull().default(true),
  isDefault: integer('is_default', { mode: 'boolean' }).notNull().default(false),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
});

export type Dashboard = typeof dashboards.$inferSelect;
export type NewDashboard = typeof dashboards.$inferInsert;
