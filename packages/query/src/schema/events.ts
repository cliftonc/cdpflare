/**
 * Drizzle schema for analytics events stored in R2 Data Catalog
 *
 * This schema matches the FlattenedEvent structure from @icelight/core
 * as stored in the Iceberg table via Cloudflare Pipelines.
 */

import { pgTable, text, timestamp } from 'drizzle-orm/pg-core';

/**
 * Events table schema
 *
 * Note: The DuckDB container sets `USE r2_datalake.analytics;` so we can
 * reference the table directly without catalog/schema prefix.
 */
export const events = pgTable('events', {
  // Pipeline-added timestamp
  __ingest_ts: timestamp('__ingest_ts', { mode: 'date' }),

  // Event identification
  messageId: text('message_id').notNull(),
  type: text('type').notNull(), // 'track' | 'identify' | 'page' | 'screen' | 'group' | 'alias'

  // User identification
  userId: text('user_id'),
  anonymousId: text('anonymous_id'),

  // Event data
  event: text('event'), // For track events
  name: text('name'), // For page/screen events

  // JSON fields (stored as text in Iceberg)
  properties: text('properties'), // JSON string
  traits: text('traits'), // JSON string
  context: text('context'), // JSON string

  // Timestamps (stored as microseconds in Iceberg)
  timestamp: timestamp('timestamp', { mode: 'date' }),
  sentAt: timestamp('sent_at', { mode: 'date' }),
  receivedAt: timestamp('received_at', { mode: 'date' }),
});

/**
 * Type inference for events table
 */
export type Event = typeof events.$inferSelect;
export type NewEvent = typeof events.$inferInsert;
