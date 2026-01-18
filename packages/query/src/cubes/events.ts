import { sql } from 'drizzle-orm';
import { defineCube } from 'drizzle-cube/server';
import type { Cube } from 'drizzle-cube/server';
import { events } from '../schema/events.js';
import { buildJsonDimensions } from './json-helpers.js';
import { DEFAULT_CUBE_CONFIG, type CubeJsonConfig } from './json-config.js';

// Note: Type assertions needed due to drizzle-orm version mismatch
// drizzle-cube expects ^0.45.0, we're using 0.44.x
// TODO: Remove assertions after drizzle-cube is updated
/* eslint-disable @typescript-eslint/no-explicit-any */

/**
 * Create the events cube with JSON dimensions from configuration
 */
export function createEventsCube(config: CubeJsonConfig = DEFAULT_CUBE_CONFIG): Cube {
  // Build dynamic JSON dimensions from config
  const propertiesDimensions = buildJsonDimensions('properties', config.properties ?? []);
  const traitsDimensions = buildJsonDimensions('traits', config.traits ?? []);
  const contextDimensions = buildJsonDimensions('context', config.context ?? []);

  // Check if revenue field is configured for the measure
  const hasRevenue = config.properties?.some(f => f.name === 'revenue') ?? false;

  return defineCube('Events', {
    title: 'Analytics Events',
    description: 'RudderStack/Segment compatible analytics events',

    meta: {
      eventStream: {
        bindingKey: 'Events.userId',
        timeDimension: 'Events.timestamp',
      },
    },

    sql: () => ({
      from: events as any,
    }),

    dimensions: {
      // === Core Dimensions ===
      messageId: {
        name: 'messageId',
        title: 'Message ID',
        type: 'string',
        sql: events.messageId as any,
        primaryKey: true,
      },
      type: {
        name: 'type',
        title: 'Event Type',
        type: 'string',
        sql: events.type as any,
      },
      event: {
        name: 'event',
        title: 'Event Name',
        type: 'string',
        sql: events.event as any,
      },
      name: {
        name: 'name',
        title: 'Page/Screen Name',
        type: 'string',
        sql: events.name as any,
      },
      userId: {
        name: 'userId',
        title: 'User ID',
        type: 'string',
        sql: events.userId as any,
      },
      anonymousId: {
        name: 'anonymousId',
        title: 'Anonymous ID',
        type: 'string',
        sql: events.anonymousId as any,
      },
      timestamp: {
        name: 'timestamp',
        title: 'Event Timestamp',
        type: 'time',
        sql: events.timestamp as any,
      },
      receivedAt: {
        name: 'receivedAt',
        title: 'Received At',
        type: 'time',
        sql: events.receivedAt as any,
      },

      // === Raw JSON Dimensions (for debugging/exploration) ===
      propertiesRaw: {
        name: 'propertiesRaw',
        title: 'Properties (Raw JSON)',
        type: 'string',
        sql: events.properties as any,
        shown: false,
      },
      traitsRaw: {
        name: 'traitsRaw',
        title: 'Traits (Raw JSON)',
        type: 'string',
        sql: events.traits as any,
        shown: false,
      },
      contextRaw: {
        name: 'contextRaw',
        title: 'Context (Raw JSON)',
        type: 'string',
        sql: events.context as any,
        shown: false,
      },

      // === Dynamic JSON Dimensions from Config ===
      ...propertiesDimensions,
      ...traitsDimensions,
      ...contextDimensions,
    } as any,

    measures: {
      count: {
        name: 'count',
        title: 'Total Events',
        type: 'count',
        sql: events.messageId as any,
      },
      uniqueUsers: {
        name: 'uniqueUsers',
        title: 'Unique Users',
        type: 'countDistinct',
        sql: events.userId as any,
      },
      uniqueAnonymous: {
        name: 'uniqueAnonymous',
        title: 'Unique Anonymous',
        type: 'countDistinct',
        sql: events.anonymousId as any,
      },
      // Revenue measures (only if revenue field is configured)
      ...(hasRevenue ? {
        totalRevenue: {
          name: 'totalRevenue',
          title: 'Total Revenue',
          type: 'sum',
          sql: sql<number>`CAST(json_extract(${events.properties}, '$.revenue') AS DOUBLE)` as any,
        },
        avgRevenue: {
          name: 'avgRevenue',
          title: 'Average Revenue',
          type: 'avg',
          sql: sql<number>`CAST(json_extract(${events.properties}, '$.revenue') AS DOUBLE)` as any,
        },
      } : {}),
    },
  }) as Cube;
}

/* eslint-enable @typescript-eslint/no-explicit-any */

// Default export using default config (for backward compatibility)
export const eventsCube = createEventsCube();
export const allCubes = [eventsCube];
