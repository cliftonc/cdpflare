import { Hono, Context } from 'hono';
import { cors } from 'hono/cors';
import type { FlattenedEvent } from '@icelight/core';
import { authMiddleware } from './auth.js';
import { processBatch, processSingleEvent } from './batch.js';

/**
 * Pipeline binding interface
 * This matches the Cloudflare Pipelines binding
 */
export interface PipelineBinding {
  send(messages: unknown[]): Promise<void>;
}

export interface IngestEnv {
  PIPELINE?: PipelineBinding;
  STREAM_HTTP_ENDPOINT?: string;  // HTTP endpoint for stream ingestion
  AUTH_ENABLED?: string;
  AUTH_TOKEN?: string;
  ALLOWED_ORIGINS?: string;
}

export interface IngestResponse {
  success: boolean;
  message?: string;
  count?: number;
  errors?: string[];
}

type IngestContext = Context<{ Bindings: IngestEnv }>;

/**
 * Create the Hono app for event ingestion
 */
export function createIngestApp() {
  const app = new Hono<{ Bindings: IngestEnv }>();

  // CORS middleware
  app.use('*', async (c, next) => {
    const origins = c.env.ALLOWED_ORIGINS?.split(',').map((o: string) => o.trim()) || ['*'];
    const corsMiddleware = cors({
      origin: origins.includes('*') ? '*' : origins,
      allowMethods: ['POST', 'OPTIONS'],
      allowHeaders: ['Content-Type', 'Authorization', 'X-API-Key'],
      maxAge: 86400,
    });
    return corsMiddleware(c, next);
  });

  // Auth middleware
  app.use('*', authMiddleware((c) => ({
    enabled: c.env?.AUTH_ENABLED === 'true',
    token: c.env?.AUTH_TOKEN,
  })));

  // Health check
  app.get('/health', (c) => c.json({ status: 'ok' }));

  // Batch endpoint
  app.post('/v1/batch', async (c) => {
    return handleBatchRequest(c);
  });

  // Also support /batch without v1 prefix
  app.post('/batch', async (c) => {
    return handleBatchRequest(c);
  });

  // Single event endpoints
  const singleEventTypes = ['track', 'identify', 'page', 'screen', 'group', 'alias'] as const;

  for (const eventType of singleEventTypes) {
    app.post(`/v1/${eventType}`, async (c) => {
      return handleSingleEventRequest(c, eventType);
    });

    // Also support without v1 prefix
    app.post(`/${eventType}`, async (c) => {
      return handleSingleEventRequest(c, eventType);
    });
  }

  return app;
}

/**
 * Handle batch request
 */
async function handleBatchRequest(c: IngestContext) {
  let body: unknown;
  try {
    body = await c.req.json();
  } catch {
    return c.json({ success: false, message: 'Invalid JSON body' } satisfies IngestResponse, 400);
  }

  const result = processBatch(body);
  if (!result.success) {
    return c.json({ success: false, errors: result.errors } satisfies IngestResponse, 400);
  }

  return sendToPipeline(c, result.events);
}

/**
 * Handle single event request
 */
async function handleSingleEventRequest(c: IngestContext, eventType: string) {
  let body: unknown;
  try {
    body = await c.req.json();
  } catch {
    return c.json({ success: false, message: 'Invalid JSON body' } satisfies IngestResponse, 400);
  }

  const result = processSingleEvent(body, eventType);
  if (!result.success) {
    return c.json({ success: false, errors: result.errors } satisfies IngestResponse, 400);
  }

  return sendToPipeline(c, result.events);
}

/**
 * Send events to pipeline
 */
async function sendToPipeline(c: IngestContext, events: FlattenedEvent[]) {
  // Check if pipeline binding exists
  if (!c.env.PIPELINE) {
    console.error('PIPELINE binding is not configured');
    return c.json(
      { success: false, message: 'Pipeline not configured' } satisfies IngestResponse,
      500
    );
  }

  console.log(`[ingest] Sending ${events.length} events to pipeline`);
  console.log(`[ingest] First event:`, JSON.stringify(events[0]));

  try {
    await c.env.PIPELINE.send(events);
    console.log(`[ingest] Successfully sent ${events.length} events to pipeline`);
  } catch (err) {
    const error = err as Error;
    console.error('[ingest] Pipeline send error:', error.message, error.stack);
    return c.json(
      { success: false, message: 'Failed to send events to pipeline' } satisfies IngestResponse,
      500
    );
  }

  return c.json({ success: true, count: events.length } satisfies IngestResponse);
}

/**
 * Default export for direct use as a Worker
 */
export default createIngestApp();
