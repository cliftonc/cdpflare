/**
 * Core event generation logic
 */
import type { AnalyticsEvent, EventContext } from '@icelight/core';
import type { SimulatedUser } from './types.js';
import {
  FIRST_NAMES, LAST_NAMES, PLANS, COMPANIES, INDUSTRIES,
  USER_AGENTS, LOCALES, TIMEZONES, REFERRERS,
  CAMPAIGN_SOURCES, CAMPAIGN_MEDIUMS, CAMPAIGN_NAMES,
  PRODUCTS, TRACK_EVENTS, PAGE_NAMES, SCREEN_NAMES,
  DEVICE_TYPES, PLATFORMS
} from './data.js';

/**
 * Simple seeded random number generator (mulberry32)
 */
export function createRng(seed: number): () => number {
  let state = seed;
  return () => {
    state |= 0;
    state = (state + 0x6D2B79F5) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Utility to pick a random item from an array
 */
export function randomChoice<T>(arr: readonly T[], random: () => number): T {
  return arr[Math.floor(random() * arr.length)];
}

/**
 * Generate a random ID
 */
export function randomId(random: () => number): string {
  return Math.floor(random() * 0xffffffff).toString(36);
}

/**
 * Generate a random revenue amount between $10 and $510
 */
export function randomRevenue(random: () => number): number {
  return Math.round((random() * 500 + 10) * 100) / 100;
}

/**
 * Generate a random integer in range [min, max]
 */
export function randomInt(min: number, max: number, random: () => number): number {
  return Math.floor(random() * (max - min + 1)) + min;
}

/**
 * Generate a random timestamp between two dates
 */
export function randomTimestamp(start: Date, end: Date, random: () => number): Date {
  const startMs = start.getTime();
  const endMs = end.getTime();
  return new Date(startMs + random() * (endMs - startMs));
}

/**
 * Generate a simulated user
 */
export function generateUser(random: () => number, createdAt: Date): SimulatedUser {
  const firstName = randomChoice(FIRST_NAMES, random);
  const lastName = randomChoice(LAST_NAMES, random);
  const name = `${firstName} ${lastName}`;
  const email = `${firstName.toLowerCase()}.${lastName.toLowerCase()}@example.com`;

  return {
    userId: `user-${randomId(random)}`,
    anonymousId: `anon-${randomId(random)}`,
    name,
    email,
    plan: randomChoice(PLANS, random),
    company: randomChoice(COMPANIES, random),
    industry: randomChoice(INDUSTRIES, random),
    createdAt,
  };
}

/**
 * Generate event context with realistic browser/device data
 */
export function generateContext(_user: SimulatedUser, random: () => number): EventContext {
  const userAgent = randomChoice(USER_AGENTS, random);
  const isMobile = userAgent.includes('Mobile') || userAgent.includes('iPhone') || userAgent.includes('Android');

  const context: EventContext = {
    userAgent,
    locale: randomChoice(LOCALES, random),
    timezone: randomChoice(TIMEZONES, random),
    library: {
      name: 'analytics.js',
      version: '2.1.0',
    },
    page: {
      url: `https://app.example.com/${randomChoice(PAGE_NAMES, random).toLowerCase()}`,
      path: `/${randomChoice(PAGE_NAMES, random).toLowerCase()}`,
      title: `${randomChoice(PAGE_NAMES, random)} | Example App`,
      referrer: randomChoice(REFERRERS, random),
    },
  };

  // Add campaign data ~20% of the time
  if (random() < 0.2) {
    context.campaign = {
      source: randomChoice(CAMPAIGN_SOURCES, random),
      medium: randomChoice(CAMPAIGN_MEDIUMS, random),
      name: randomChoice(CAMPAIGN_NAMES, random),
    };
  }

  // Add device info for mobile users
  if (isMobile) {
    context.device = {
      type: userAgent.includes('iPhone') || userAgent.includes('Android Phone') ? 'mobile' : 'tablet',
      manufacturer: userAgent.includes('iPhone') || userAgent.includes('iPad') ? 'Apple' : 'Google',
      model: userAgent.includes('iPhone') ? 'iPhone' : userAgent.includes('iPad') ? 'iPad' : 'Pixel 8',
    };
    context.os = {
      name: userAgent.includes('iPhone') || userAgent.includes('iPad') ? 'iOS' : 'Android',
      version: userAgent.includes('iPhone') || userAgent.includes('iPad') ? '17.2' : '14',
    };
  }

  // Add screen info ~50% of the time
  if (random() < 0.5) {
    const widths = isMobile ? [375, 390, 414, 428] : [1920, 2560, 1440, 1680];
    const heights = isMobile ? [812, 844, 896, 926] : [1080, 1440, 900, 1050];
    context.screen = {
      width: randomChoice(widths, random),
      height: randomChoice(heights, random),
      density: isMobile ? randomChoice([2, 3], random) : 1,
    };
  }

  return context;
}

/**
 * Generate a track event
 */
export function generateTrackEvent(
  user: SimulatedUser,
  timestamp: Date,
  random: () => number
): AnalyticsEvent {
  const eventName = randomChoice(TRACK_EVENTS, random);
  const context = generateContext(user, random);

  const baseProperties: Record<string, unknown> = {};

  // Add event-specific properties
  switch (eventName) {
    case 'Purchase Completed':
      Object.assign(baseProperties, {
        orderId: `order-${randomId(random)}`,
        revenue: randomRevenue(random),
        currency: 'USD',
        products: [
          { name: randomChoice(PRODUCTS, random), price: randomRevenue(random), quantity: randomInt(1, 3, random) }
        ],
      });
      break;
    case 'Item Added to Cart':
    case 'Item Removed from Cart':
      Object.assign(baseProperties, {
        product: randomChoice(PRODUCTS, random),
        price: randomRevenue(random),
        quantity: randomInt(1, 5, random),
      });
      break;
    case 'Search Performed':
      Object.assign(baseProperties, {
        query: randomChoice(['dashboard', 'analytics', 'reports', 'settings', 'integration'], random),
        resultsCount: randomInt(0, 50, random),
      });
      break;
    case 'Plan Upgraded':
      Object.assign(baseProperties, {
        previousPlan: randomChoice(PLANS, random),
        newPlan: randomChoice(PLANS, random),
        mrr: randomRevenue(random),
      });
      break;
    case 'Feature Used':
      Object.assign(baseProperties, {
        featureName: randomChoice(['export', 'filter', 'share', 'customize', 'automate'], random),
        usageCount: randomInt(1, 10, random),
      });
      break;
    default:
      Object.assign(baseProperties, {
        source: randomChoice(['web', 'mobile', 'api'], random),
      });
  }

  return {
    type: 'track',
    userId: user.userId,
    anonymousId: user.anonymousId,
    event: eventName,
    properties: baseProperties,
    context,
    timestamp: timestamp.toISOString(),
    messageId: `msg-${randomId(random)}-${Date.now()}`,
  };
}

/**
 * Generate an identify event
 */
export function generateIdentifyEvent(
  user: SimulatedUser,
  timestamp: Date,
  random: () => number
): AnalyticsEvent {
  const context = generateContext(user, random);

  return {
    type: 'identify',
    userId: user.userId,
    anonymousId: user.anonymousId,
    traits: {
      email: user.email,
      name: user.name,
      plan: user.plan,
      company: user.company,
      industry: user.industry,
      createdAt: user.createdAt.toISOString(),
    },
    context,
    timestamp: timestamp.toISOString(),
    messageId: `msg-${randomId(random)}-${Date.now()}`,
  };
}

/**
 * Generate a page event
 */
export function generatePageEvent(
  user: SimulatedUser,
  timestamp: Date,
  random: () => number
): AnalyticsEvent {
  const pageName = randomChoice(PAGE_NAMES, random);
  const context = generateContext(user, random);

  return {
    type: 'page',
    userId: user.userId,
    anonymousId: user.anonymousId,
    name: pageName,
    category: 'App',
    properties: {
      url: `https://app.example.com/${pageName.toLowerCase()}`,
      path: `/${pageName.toLowerCase()}`,
      title: `${pageName} | Example App`,
      referrer: context.page?.referrer || 'direct',
    },
    context,
    timestamp: timestamp.toISOString(),
    messageId: `msg-${randomId(random)}-${Date.now()}`,
  };
}

/**
 * Generate a screen event
 */
export function generateScreenEvent(
  user: SimulatedUser,
  timestamp: Date,
  random: () => number
): AnalyticsEvent {
  const screenName = randomChoice(SCREEN_NAMES, random);
  const context = generateContext(user, random);
  const platform = randomChoice(PLATFORMS.filter(p => p === 'iOS' || p === 'Android'), random);

  return {
    type: 'screen',
    userId: user.userId,
    anonymousId: user.anonymousId,
    name: screenName,
    category: 'Mobile',
    properties: {
      app_version: '2.1.0',
      platform,
      device_type: randomChoice(DEVICE_TYPES.filter(d => d !== 'desktop'), random),
    },
    context,
    timestamp: timestamp.toISOString(),
    messageId: `msg-${randomId(random)}-${Date.now()}`,
  };
}

/**
 * Generate a group event
 */
export function generateGroupEvent(
  user: SimulatedUser,
  timestamp: Date,
  random: () => number
): AnalyticsEvent {
  const context = generateContext(user, random);

  return {
    type: 'group',
    userId: user.userId,
    anonymousId: user.anonymousId,
    groupId: `group-${randomId(random)}`,
    traits: {
      name: user.company,
      industry: user.industry,
      employees: randomInt(10, 10000, random),
      plan: user.plan,
    },
    context,
    timestamp: timestamp.toISOString(),
    messageId: `msg-${randomId(random)}-${Date.now()}`,
  };
}
