/**
 * Event generator module - exports all public APIs
 */
export type {
  GeneratorConfig,
  SimulatedUser,
  UserSession,
  GenerationResult,
} from './types.js';

export {
  generateEvents,
  generateDailyEvents,
  generateHistoricalEvents,
} from './user-journey.js';

export {
  createRng,
  randomChoice,
  randomId,
  randomRevenue,
  randomInt,
  randomTimestamp,
  generateUser,
  generateContext,
  generateTrackEvent,
  generateIdentifyEvent,
  generatePageEvent,
  generateScreenEvent,
  generateGroupEvent,
} from './generator.js';

export * from './data.js';
