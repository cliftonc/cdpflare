/**
 * Cron handler for scheduled event generation
 *
 * Triggered at 2 AM UTC daily to:
 * 1. Generate ~5,000 realistic analytics events for the prior 24 hours
 * 2. Send them to the ingest API via service binding
 * 3. Reset the default dashboard to its original configuration
 */
import { eq } from 'drizzle-orm';
import { generateDailyEvents } from '../event-generator/index.js';
import { createDb, schema } from '../db/index.js';
import { defaultDashboardConfig, DEFAULT_DASHBOARD_ID } from '../dashboards/default-dashboard.js';
import type { AnalyticsEvent } from '@icelight/core';

/**
 * Environment bindings for the cron handler
 */
export interface CronEnv {
  /** Service binding to the ingest API worker */
  INGEST_API?: Fetcher;
  /** URL fallback for ingest API (for testing) */
  INGEST_API_URL?: string;
  /** D1 database for dashboard storage */
  DB?: D1Database;
}

/**
 * Split an array into chunks of a specified size
 */
function chunk<T>(array: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < array.length; i += size) {
    chunks.push(array.slice(i, i + size));
  }
  return chunks;
}

/**
 * Send events to the ingest API
 */
async function sendEvents(
  events: AnalyticsEvent[],
  env: CronEnv
): Promise<{ success: boolean; sent: number; errors: string[] }> {
  const fetcher = env.INGEST_API;
  const url = env.INGEST_API_URL;

  if (!fetcher && !url) {
    return {
      success: false,
      sent: 0,
      errors: ['No INGEST_API service binding or INGEST_API_URL configured'],
    };
  }

  const errors: string[] = [];
  let sent = 0;

  // Send in batches of 100 events
  const batches = chunk(events, 100);

  for (let i = 0; i < batches.length; i++) {
    const batch = batches[i];
    try {
      const body = JSON.stringify({ batch });
      let response: Response;

      if (fetcher) {
        // Use service binding (preferred)
        response = await fetcher.fetch('https://ingest/v1/batch', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body,
        });
      } else {
        // Fallback to URL
        response = await fetch(`${url}/v1/batch`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body,
        });
      }

      if (!response.ok) {
        const text = await response.text();
        errors.push(`Batch ${i + 1}/${batches.length} failed: ${response.status} ${text}`);
      } else {
        sent += batch.length;
      }
    } catch (error) {
      errors.push(`Batch ${i + 1}/${batches.length} error: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  return {
    success: errors.length === 0,
    sent,
    errors,
  };
}

/**
 * Reset the default dashboard to its original configuration
 */
async function resetDefaultDashboard(env: CronEnv): Promise<{ success: boolean; error?: string }> {
  if (!env.DB) {
    return { success: false, error: 'No DB binding configured' };
  }

  try {
    const db = createDb(env.DB);
    const now = new Date().toISOString();

    await db
      .update(schema.dashboards)
      .set({
        config: JSON.stringify(defaultDashboardConfig),
        updatedAt: now,
      })
      .where(eq(schema.dashboards.id, DEFAULT_DASHBOARD_ID));

    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

/**
 * Handle scheduled cron trigger
 *
 * @param controller - ScheduledController with cron info
 * @param env - Worker environment bindings
 * @param ctx - ExecutionContext for waitUntil
 */
export async function handleScheduled(
  controller: ScheduledController,
  env: CronEnv,
  _ctx: ExecutionContext
): Promise<void> {
  console.log(`Cron triggered at ${new Date().toISOString()}, cron: ${controller.cron}`);

  // 1. Generate events for the prior 24 hours
  console.log('Generating daily events...');
  const result = generateDailyEvents(75, 66); // ~5,000 events
  console.log(`Generated ${result.events.length} events for ${result.userCount} users across ${result.sessionCount} sessions`);
  console.log(`Event breakdown: track=${result.eventCounts.track}, identify=${result.eventCounts.identify}, page=${result.eventCounts.page}, screen=${result.eventCounts.screen}, group=${result.eventCounts.group}`);

  // 2. Send events to ingest API
  console.log('Sending events to ingest API...');
  const sendResult = await sendEvents(result.events, env);

  if (sendResult.success) {
    console.log(`Successfully sent ${sendResult.sent} events`);
  } else {
    console.error(`Failed to send some events. Sent: ${sendResult.sent}, Errors: ${sendResult.errors.join('; ')}`);
  }

  // 3. Reset default dashboard
  console.log('Resetting default dashboard...');
  const resetResult = await resetDefaultDashboard(env);

  if (resetResult.success) {
    console.log('Dashboard reset successfully');
  } else {
    console.error(`Dashboard reset failed: ${resetResult.error}`);
  }

  console.log('Cron job completed');
}
