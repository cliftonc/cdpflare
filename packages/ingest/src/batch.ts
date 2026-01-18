import {
  type AnalyticsEvent,
  type AnalyticsBatch,
  type FlattenedEvent,
  validateEvent,
  validateBatch,
  flattenEvent,
  generateMessageId,
} from '@icelight/core';

export interface BatchResult {
  success: boolean;
  events: FlattenedEvent[];
  errors: string[];
}

/**
 * Process a single event from a direct endpoint (track, identify, page, etc.)
 */
export function processSingleEvent(data: unknown, eventType?: string): BatchResult {
  if (!data || typeof data !== 'object') {
    return { success: false, events: [], errors: ['Request body must be a JSON object'] };
  }

  const event = data as Record<string, unknown>;

  // Set type if provided (for typed endpoints like /v1/track)
  if (eventType && !event.type) {
    event.type = eventType;
  }

  // Generate messageId if not present
  if (!event.messageId) {
    event.messageId = generateMessageId();
  }

  const validation = validateEvent(event);
  if (!validation.valid) {
    return { success: false, events: [], errors: validation.errors };
  }

  const receivedAt = new Date().toISOString();
  const flattened = flattenEvent(event as unknown as AnalyticsEvent, receivedAt);

  return { success: true, events: [flattened], errors: [] };
}

/**
 * Process a batch of events
 */
export function processBatch(data: unknown): BatchResult {
  if (!data || typeof data !== 'object') {
    return { success: false, events: [], errors: ['Request body must be a JSON object'] };
  }

  const validation = validateBatch(data);
  if (!validation.valid) {
    return { success: false, events: [], errors: validation.errors };
  }

  const batch = data as AnalyticsBatch;
  const receivedAt = new Date().toISOString();

  const events = batch.batch.map(event => {
    // Generate messageId if not present
    if (!event.messageId) {
      event.messageId = generateMessageId();
    }
    return flattenEvent(event, receivedAt);
  });

  return { success: true, events, errors: [] };
}

/**
 * Determine if request is a batch or single event based on URL path
 */
export type EndpointType = 'batch' | 'track' | 'identify' | 'page' | 'screen' | 'group' | 'alias';

export function getEndpointType(pathname: string): EndpointType | null {
  // Normalize path
  const path = pathname.toLowerCase().replace(/\/+$/, '');

  // Support both /v1/batch and /batch patterns
  if (path.endsWith('/batch')) return 'batch';
  if (path.endsWith('/track')) return 'track';
  if (path.endsWith('/identify')) return 'identify';
  if (path.endsWith('/page')) return 'page';
  if (path.endsWith('/screen')) return 'screen';
  if (path.endsWith('/group')) return 'group';
  if (path.endsWith('/alias')) return 'alias';

  return null;
}
