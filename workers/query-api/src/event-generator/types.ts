/**
 * Types for the event generator module
 */
import type { AnalyticsEvent } from '@icelight/core';

/**
 * Configuration for event generation
 */
export interface GeneratorConfig {
  /** Number of unique users to simulate */
  userCount: number;
  /** Approximate number of events per user */
  eventsPerUser: number;
  /** Start date for event timestamps */
  startDate: Date;
  /** End date for event timestamps */
  endDate: Date;
  /** Optional seed for reproducible random generation */
  seed?: number;
}

/**
 * A simulated user with associated data
 */
export interface SimulatedUser {
  userId: string;
  anonymousId: string;
  name: string;
  email: string;
  plan: string;
  company: string;
  industry: string;
  createdAt: Date;
}

/**
 * A user session with start/end times and events
 */
export interface UserSession {
  user: SimulatedUser;
  startTime: Date;
  endTime: Date;
  events: AnalyticsEvent[];
}

/**
 * Result from event generation
 */
export interface GenerationResult {
  events: AnalyticsEvent[];
  userCount: number;
  sessionCount: number;
  eventCounts: {
    track: number;
    identify: number;
    page: number;
    screen: number;
    group: number;
    alias: number;
  };
}
