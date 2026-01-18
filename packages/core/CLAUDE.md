# @icelight/core

Shared types and validation utilities for icelight.

## Purpose

This package provides:
- RudderStack/Segment-compatible event type definitions
- Event validation functions
- Event flattening for Iceberg storage
- Configuration type definitions

## Files

| File | Description |
|------|-------------|
| `event-schema.ts` | TypeScript interfaces for all event types |
| `validation.ts` | Validation functions and event transformation |
| `config.ts` | Configuration interfaces |
| `index.ts` | Public exports |

## Key Types

### Event Types

```typescript
type EventType = 'track' | 'identify' | 'page' | 'screen' | 'group' | 'alias';

interface BaseEvent {
  userId?: string;
  anonymousId?: string;
  type: EventType;
  context?: EventContext;
  timestamp?: string;
  messageId?: string;
}

// Specific event types extend BaseEvent
interface TrackEvent extends BaseEvent { type: 'track'; event: string; properties?: Record<string, unknown>; }
interface IdentifyEvent extends BaseEvent { type: 'identify'; traits?: Record<string, unknown>; }
// ... etc
```

### Flattened Event (for Iceberg)

```typescript
interface FlattenedEvent {
  message_id: string;
  type: EventType;
  user_id: string | null;
  anonymous_id: string | null;
  event: string | null;
  name: string | null;
  properties: Record<string, unknown> | null;
  traits: Record<string, unknown> | null;
  context: EventContext | null;
  timestamp: string;
  sent_at: string | null;
  received_at: string;
}
```

## Key Functions

### validateEvent(event: unknown): ValidationResult

Validates a single event object. Checks:
- Has userId or anonymousId
- Has valid type
- Type-specific required fields (e.g., track needs `event`, group needs `groupId`)

### validateBatch(batch: unknown): ValidationResult

Validates a batch of events. Returns aggregated errors with indices.

### flattenEvent(event: AnalyticsEvent, receivedAt: string): FlattenedEvent

Transforms a camelCase SDK event into snake_case for Iceberg storage.

### generateMessageId(): string

Creates a unique message ID using timestamp + random.

## Usage

```typescript
import {
  type AnalyticsEvent,
  type FlattenedEvent,
  validateEvent,
  flattenEvent,
  generateMessageId,
} from '@icelight/core';

// Validate incoming event
const result = validateEvent(data);
if (!result.valid) {
  console.error(result.errors);
}

// Transform for storage
const flat = flattenEvent(event, new Date().toISOString());
```

## Build

```bash
pnpm build      # Compile TypeScript
pnpm typecheck  # Type check without emitting
pnpm clean      # Remove dist/
```

## Notes

- No runtime dependencies - types and pure functions only
- Uses `.js` extension in imports for ESM compatibility
- Exports both types and runtime functions
