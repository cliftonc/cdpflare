import { defineCube } from 'drizzle-cube/server';
import type { Cube } from 'drizzle-cube/server';
import { events } from '../schema/events.js';

// Note: Type assertions needed due to drizzle-orm version mismatch
// drizzle-cube expects ^0.45.0, we're using 0.44.x
// TODO: Remove assertions after drizzle-cube is updated
/* eslint-disable @typescript-eslint/no-explicit-any */

export const eventsCube = defineCube('Events', {
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
  },

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
  },
}) as Cube;

/* eslint-enable @typescript-eslint/no-explicit-any */

export const allCubes = [eventsCube];
