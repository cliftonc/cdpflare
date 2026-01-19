#!/usr/bin/env tsx
/**
 * Generate historical analytics events and send them to the ingest API
 *
 * Usage:
 *   pnpm generate-events           # Generate 30 days of data (default)
 *   pnpm generate-events 90        # Generate 90 days of data
 *
 * Environment variables:
 *   INGEST_API_URL - URL to the ingest API (default: http://localhost:8787)
 */

// Dynamic import for the event generator module (TypeScript in worker)

// Colors for output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  cyan: '\x1b[36m',
  bold: '\x1b[1m',
  dim: '\x1b[2m',
};

function log(message: string, color: keyof typeof colors = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
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
 * Sleep for a specified number of milliseconds
 */
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function main() {
  // Parse command line arguments
  const args = process.argv.slice(2);
  const days = args[0] ? parseInt(args[0], 10) : 30;

  if (isNaN(days) || days < 1 || days > 365) {
    log('Error: Days must be a number between 1 and 365', 'red');
    process.exit(1);
  }

  const ingestApiUrl = process.env.INGEST_API_URL || 'http://localhost:8787';

  log(`\n${'='.repeat(60)}`, 'cyan');
  log('  Event Generator - Historical Data', 'bold');
  log('='.repeat(60), 'cyan');
  log(`\nGenerating ${days} days of historical events...`, 'yellow');
  log(`Target ingest API: ${ingestApiUrl}\n`, 'dim');

  // Import the event generator module
  const { generateHistoricalEvents } = await import(
    '../workers/query-api/src/event-generator/index.js'
  );

  // Generate events
  const startTime = Date.now();
  const result = generateHistoricalEvents(days, 75, 66);
  const generationTime = ((Date.now() - startTime) / 1000).toFixed(2);

  log(`\nGenerated ${result.events.length.toLocaleString()} events in ${generationTime}s`, 'green');
  log(`  Users: ${result.userCount}`, 'dim');
  log(`  Sessions: ${result.sessionCount}`, 'dim');
  log(`  Event breakdown:`, 'dim');
  log(`    track: ${result.eventCounts.track}`, 'dim');
  log(`    identify: ${result.eventCounts.identify}`, 'dim');
  log(`    page: ${result.eventCounts.page}`, 'dim');
  log(`    screen: ${result.eventCounts.screen}`, 'dim');
  log(`    group: ${result.eventCounts.group}`, 'dim');

  // Send events to the ingest API
  log(`\nSending events to ingest API...`, 'yellow');

  const batches = chunk(result.events, 100);
  let sent = 0;
  let errors = 0;

  for (let i = 0; i < batches.length; i++) {
    const batch = batches[i];
    const progress = `[${i + 1}/${batches.length}]`;

    try {
      const response = await fetch(`${ingestApiUrl}/v1/batch`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ batch }),
      });

      if (!response.ok) {
        const text = await response.text();
        log(`${progress} Failed: ${response.status} ${text}`, 'red');
        errors++;
      } else {
        sent += batch.length;
        // Show progress every 10 batches or on last batch
        if ((i + 1) % 10 === 0 || i === batches.length - 1) {
          log(`${progress} Sent ${sent.toLocaleString()} events...`, 'dim');
        }
      }
    } catch (error) {
      log(`${progress} Error: ${error instanceof Error ? error.message : String(error)}`, 'red');
      errors++;
    }

    // Small delay between batches to avoid overwhelming the API
    if (i < batches.length - 1) {
      await sleep(50);
    }
  }

  const totalTime = ((Date.now() - startTime) / 1000).toFixed(2);

  log(`\n${'='.repeat(60)}`, 'cyan');
  if (errors === 0) {
    log(`  Successfully sent ${sent.toLocaleString()} events in ${totalTime}s`, 'green');
  } else {
    log(`  Sent ${sent.toLocaleString()} events with ${errors} batch errors in ${totalTime}s`, 'yellow');
  }
  log('='.repeat(60), 'cyan');
}

main().catch(error => {
  log(`\nFatal error: ${error instanceof Error ? error.message : String(error)}`, 'red');
  process.exit(1);
});
