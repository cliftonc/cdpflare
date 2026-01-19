/**
 * User journey simulation - generates realistic session patterns
 */
import type { AnalyticsEvent } from '@icelight/core';
import type { SimulatedUser, UserSession, GeneratorConfig, GenerationResult } from './types.js';
import {
  createRng,
  randomInt,
  randomTimestamp,
  generateUser,
  generateTrackEvent,
  generateIdentifyEvent,
  generatePageEvent,
  generateScreenEvent,
  generateGroupEvent,
} from './generator.js';

/**
 * Generate sessions for a single user across the time range
 */
function generateUserSessions(
  user: SimulatedUser,
  config: GeneratorConfig,
  random: () => number
): UserSession[] {
  const sessions: UserSession[] = [];
  const { startDate, endDate, eventsPerUser } = config;

  // Each user has 1-5 sessions
  const sessionCount = randomInt(1, 5, random);
  const eventsPerSession = Math.ceil(eventsPerUser / sessionCount);

  // Spread sessions across the time range
  const timeRange = endDate.getTime() - startDate.getTime();
  const sessionGap = timeRange / (sessionCount + 1);

  for (let i = 0; i < sessionCount; i++) {
    const sessionStartMs = startDate.getTime() + sessionGap * (i + 0.5 + random() * 0.5);
    const sessionStart = new Date(sessionStartMs);

    // Sessions last 5-60 minutes
    const sessionDuration = randomInt(5, 60, random) * 60 * 1000;
    const sessionEnd = new Date(Math.min(sessionStartMs + sessionDuration, endDate.getTime()));

    const events = generateSessionEvents(user, sessionStart, sessionEnd, eventsPerSession, i === 0, random);

    sessions.push({
      user,
      startTime: sessionStart,
      endTime: sessionEnd,
      events,
    });
  }

  return sessions;
}

/**
 * Generate events within a single session
 */
function generateSessionEvents(
  user: SimulatedUser,
  sessionStart: Date,
  sessionEnd: Date,
  targetEventCount: number,
  isFirstSession: boolean,
  random: () => number
): AnalyticsEvent[] {
  const events: AnalyticsEvent[] = [];
  let currentTime = new Date(sessionStart);

  // First session always starts with identify
  if (isFirstSession) {
    events.push(generateIdentifyEvent(user, currentTime, random));
    currentTime = addTimeGap(currentTime, random);
  }

  // Generate remaining events
  const remainingEvents = targetEventCount - events.length;
  for (let i = 0; i < remainingEvents && currentTime < sessionEnd; i++) {
    const event = generateRandomEvent(user, currentTime, random);
    events.push(event);
    currentTime = addTimeGap(currentTime, random);
  }

  return events;
}

/**
 * Add a realistic time gap (5 seconds to 5 minutes)
 */
function addTimeGap(currentTime: Date, random: () => number): Date {
  // Time gaps: 5s to 5min, weighted toward shorter gaps
  const minGap = 5 * 1000; // 5 seconds
  const maxGap = 5 * 60 * 1000; // 5 minutes
  const gap = minGap + Math.pow(random(), 2) * (maxGap - minGap); // Weighted toward shorter gaps
  return new Date(currentTime.getTime() + gap);
}

/**
 * Generate a random event type based on distribution:
 * - page views: 40%
 * - track events: 50%
 * - screen events: 10%
 */
function generateRandomEvent(
  user: SimulatedUser,
  timestamp: Date,
  random: () => number
): AnalyticsEvent {
  const roll = random();

  if (roll < 0.4) {
    return generatePageEvent(user, timestamp, random);
  } else if (roll < 0.9) {
    return generateTrackEvent(user, timestamp, random);
  } else {
    return generateScreenEvent(user, timestamp, random);
  }
}

/**
 * Main function to generate events based on configuration
 */
export function generateEvents(config: GeneratorConfig): GenerationResult {
  const seed = config.seed ?? Date.now();
  const random = createRng(seed);

  const allEvents: AnalyticsEvent[] = [];
  const eventCounts: Record<'track' | 'identify' | 'page' | 'screen' | 'group' | 'alias', number> = {
    track: 0,
    identify: 0,
    page: 0,
    screen: 0,
    group: 0,
    alias: 0,
  };

  let totalSessions = 0;

  // Generate users and their sessions
  for (let i = 0; i < config.userCount; i++) {
    const userCreatedAt = randomTimestamp(config.startDate, config.endDate, random);
    const user = generateUser(random, userCreatedAt);

    const sessions = generateUserSessions(user, config, random);
    totalSessions += sessions.length;

    // Optionally add a group event for ~30% of users
    if (random() < 0.3 && sessions.length > 0) {
      const groupTime = new Date(sessions[0].startTime.getTime() + 60000); // 1 min after first session
      const groupEvent = generateGroupEvent(user, groupTime, random);
      allEvents.push(groupEvent);
      eventCounts.group++;
    }

    // Collect all session events
    for (const session of sessions) {
      for (const event of session.events) {
        allEvents.push(event);
        const eventType = event.type as keyof typeof eventCounts;
        eventCounts[eventType]++;
      }
    }
  }

  // Sort all events by timestamp
  allEvents.sort((a, b) => {
    const timeA = a.timestamp ? new Date(a.timestamp).getTime() : 0;
    const timeB = b.timestamp ? new Date(b.timestamp).getTime() : 0;
    return timeA - timeB;
  });

  return {
    events: allEvents,
    userCount: config.userCount,
    sessionCount: totalSessions,
    eventCounts,
  };
}

/**
 * Generate events for the previous 24 hours (for cron job)
 */
export function generateDailyEvents(userCount: number = 75, eventsPerUser: number = 66): GenerationResult {
  const now = new Date();
  const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);

  return generateEvents({
    userCount,
    eventsPerUser,
    startDate: yesterday,
    endDate: now,
  });
}

/**
 * Generate events for N days of history (for CLI script)
 */
export function generateHistoricalEvents(
  days: number,
  userCountPerDay: number = 75,
  eventsPerUserPerDay: number = 66
): GenerationResult {
  const now = new Date();
  const startDate = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);

  // Scale up users for multi-day generation
  const totalUsers = userCountPerDay * days;
  const eventsPerUser = eventsPerUserPerDay;

  return generateEvents({
    userCount: totalUsers,
    eventsPerUser,
    startDate,
    endDate: now,
  });
}
