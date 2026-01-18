import type { AnalyticsEvent, AnalyticsBatch, EventType, FlattenedEvent } from './event-schema.js';

const VALID_EVENT_TYPES: EventType[] = ['track', 'identify', 'page', 'screen', 'group', 'alias'];

export interface ValidationResult {
  valid: boolean;
  errors: string[];
}

/**
 * Validate a single analytics event
 */
export function validateEvent(event: unknown): ValidationResult {
  const errors: string[] = [];

  if (!event || typeof event !== 'object') {
    return { valid: false, errors: ['Event must be an object'] };
  }

  const e = event as Record<string, unknown>;

  // Must have userId or anonymousId
  if (!e.userId && !e.anonymousId) {
    errors.push('Event must have either userId or anonymousId');
  }

  // Must have valid type
  if (!e.type) {
    errors.push('Event must have a type');
  } else if (!VALID_EVENT_TYPES.includes(e.type as EventType)) {
    errors.push(`Invalid event type: ${e.type}. Must be one of: ${VALID_EVENT_TYPES.join(', ')}`);
  }

  // Type-specific validation
  if (e.type === 'track' && !e.event) {
    errors.push('Track events must have an event name');
  }

  if (e.type === 'group' && !e.groupId) {
    errors.push('Group events must have a groupId');
  }

  if (e.type === 'alias' && !e.previousId) {
    errors.push('Alias events must have a previousId');
  }

  if (e.type === 'screen' && !e.name) {
    errors.push('Screen events must have a name');
  }

  return { valid: errors.length === 0, errors };
}

/**
 * Validate a batch of events
 */
export function validateBatch(batch: unknown): ValidationResult {
  const errors: string[] = [];

  if (!batch || typeof batch !== 'object') {
    return { valid: false, errors: ['Batch must be an object'] };
  }

  const b = batch as Record<string, unknown>;

  if (!Array.isArray(b.batch)) {
    return { valid: false, errors: ['Batch must have a batch array'] };
  }

  if (b.batch.length === 0) {
    return { valid: false, errors: ['Batch cannot be empty'] };
  }

  for (let i = 0; i < b.batch.length; i++) {
    const result = validateEvent(b.batch[i]);
    if (!result.valid) {
      errors.push(...result.errors.map(err => `batch[${i}]: ${err}`));
    }
  }

  return { valid: errors.length === 0, errors };
}

/**
 * Generate a unique message ID
 */
export function generateMessageId(): string {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 10);
  return `${timestamp}-${random}`;
}

/**
 * Convert camelCase to snake_case
 */
export function toSnakeCase(str: string): string {
  return str.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
}

/**
 * Convert a timestamp to ISO 8601 string
 * Accepts ISO strings, Date objects, or Unix ms numbers
 */
export function toIsoString(value: string | number | Date | undefined | null): string | null {
  if (value === undefined || value === null) {
    return null;
  }
  if (typeof value === 'number') {
    // Convert Unix milliseconds to ISO string
    return new Date(value).toISOString();
  }
  if (value instanceof Date) {
    return value.toISOString();
  }
  // Validate and normalize ISO string
  const parsed = Date.parse(value);
  if (isNaN(parsed)) {
    return null;
  }
  // Return normalized ISO string
  return new Date(parsed).toISOString();
}

/**
 * Flatten an analytics event for Iceberg storage
 * Timestamps are converted to ISO 8601 strings for Cloudflare Pipelines
 */
export function flattenEvent(event: AnalyticsEvent, receivedAt: string): FlattenedEvent {
  const receivedAtIso = toIsoString(receivedAt) || new Date().toISOString();

  return {
    message_id: event.messageId || generateMessageId(),
    type: event.type,
    user_id: event.userId || null,
    anonymous_id: event.anonymousId || null,
    event: 'event' in event ? event.event : null,
    name: 'name' in event ? event.name || null : null,
    properties: 'properties' in event ? event.properties || null : null,
    traits: 'traits' in event ? event.traits || null : null,
    context: event.context || null,
    timestamp: toIsoString(event.timestamp) || receivedAtIso,
    sent_at: toIsoString(event.sentAt),
    received_at: receivedAtIso,
  };
}

/**
 * Flatten a batch of events
 */
export function flattenBatch(batch: AnalyticsBatch): FlattenedEvent[] {
  const receivedAt = new Date().toISOString();
  return batch.batch.map(event => flattenEvent(event, receivedAt));
}
