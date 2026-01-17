/**
 * Analytics event types compatible with RudderStack/Segment SDKs
 */

export type EventType = 'track' | 'identify' | 'page' | 'screen' | 'group' | 'alias';

export interface PageContext {
  url?: string;
  path?: string;
  title?: string;
  search?: string;
  referrer?: string;
}

export interface LibraryContext {
  name: string;
  version: string;
}

export interface EventContext {
  ip?: string;
  userAgent?: string;
  locale?: string;
  timezone?: string;
  page?: PageContext;
  library?: LibraryContext;
  traits?: Record<string, unknown>;
  campaign?: {
    name?: string;
    source?: string;
    medium?: string;
    term?: string;
    content?: string;
  };
  device?: {
    id?: string;
    manufacturer?: string;
    model?: string;
    name?: string;
    type?: string;
  };
  os?: {
    name?: string;
    version?: string;
  };
  screen?: {
    width?: number;
    height?: number;
    density?: number;
  };
}

export interface BaseEvent {
  /** User ID (required if anonymousId not present) */
  userId?: string;
  /** Anonymous ID (required if userId not present) */
  anonymousId?: string;
  /** Event type */
  type: EventType;
  /** Context information (auto-populated by SDK) */
  context?: EventContext;
  /** When the event occurred (ISO 8601) */
  timestamp?: string;
  /** When the SDK sent it (ISO 8601) */
  sentAt?: string;
  /** Original timestamp from client */
  originalTimestamp?: string;
  /** Control which integrations receive this event */
  integrations?: Record<string, boolean>;
  /** Unique message ID (auto-generated) */
  messageId?: string;
}

export interface TrackEvent extends BaseEvent {
  type: 'track';
  /** Event name (e.g., "Order Completed") */
  event: string;
  /** Event properties */
  properties?: Record<string, unknown>;
}

export interface IdentifyEvent extends BaseEvent {
  type: 'identify';
  /** User traits */
  traits?: Record<string, unknown>;
}

export interface PageEvent extends BaseEvent {
  type: 'page';
  /** Page name */
  name?: string;
  /** Page category */
  category?: string;
  /** Page properties */
  properties?: Record<string, unknown>;
}

export interface ScreenEvent extends BaseEvent {
  type: 'screen';
  /** Screen name */
  name: string;
  /** Screen category */
  category?: string;
  /** Screen properties */
  properties?: Record<string, unknown>;
}

export interface GroupEvent extends BaseEvent {
  type: 'group';
  /** Group ID */
  groupId: string;
  /** Group traits */
  traits?: Record<string, unknown>;
}

export interface AliasEvent extends BaseEvent {
  type: 'alias';
  /** Previous user ID */
  previousId: string;
}

export type AnalyticsEvent =
  | TrackEvent
  | IdentifyEvent
  | PageEvent
  | ScreenEvent
  | GroupEvent
  | AliasEvent;

export interface AnalyticsBatch {
  batch: AnalyticsEvent[];
  sentAt?: string;
}

/**
 * Flattened event structure for Iceberg storage
 * All fields use snake_case for SQL compatibility
 * Timestamps are Unix milliseconds for Cloudflare Pipelines
 */
export interface FlattenedEvent {
  message_id: string;
  type: EventType;
  user_id: string | null;
  anonymous_id: string | null;
  event: string | null;
  name: string | null;
  properties: Record<string, unknown> | null;
  traits: Record<string, unknown> | null;
  context: EventContext | null;
  timestamp: number;
  sent_at: number | null;
  received_at: number;
}
