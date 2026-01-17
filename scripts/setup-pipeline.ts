#!/usr/bin/env tsx
/**
 * Setup script for cdpflare infrastructure
 * Creates R2 bucket, Data Catalog, Stream, Sink, and Pipeline
 *
 * Usage: pnpm launch
 *
 * Environment variables (optional, defaults provided):
 * - BUCKET_NAME: R2 bucket name (default: cdpflare-data)
 * - STREAM_NAME: Stream name (default: cdpflare_events_stream)
 * - SINK_NAME: Sink name (default: cdpflare_events_sink)
 * - PIPELINE_NAME: Pipeline name (default: cdpflare_events_pipeline)
 */

import { execSync } from 'child_process';
import { existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

// Configuration with defaults
// Note: Names must use underscores, not hyphens, for pipelines resources
const config = {
  bucketName: process.env.BUCKET_NAME || 'cdpflare-data',
  streamName: process.env.STREAM_NAME || 'cdpflare_events_stream',
  sinkName: process.env.SINK_NAME || 'cdpflare_events_sink',
  pipelineName: process.env.PIPELINE_NAME || 'cdpflare_events_pipeline',
};

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

function runQuiet(command: string): string | null {
  try {
    return execSync(command, {
      encoding: 'utf-8',
      stdio: ['pipe', 'pipe', 'pipe'],
    });
  } catch {
    return null;
  }
}

function runCommand(command: string, _description?: string): boolean {
  log(`  ${colors.dim}$ ${command}${colors.reset}`);
  try {
    execSync(command, {
      encoding: 'utf-8',
      stdio: ['pipe', 'pipe', 'pipe'],
    });
    return true;
  } catch (error) {
    const err = error as { stderr?: string; message?: string };
    const stderr = err.stderr || err.message || 'Unknown error';
    log(`  ✗ Failed: ${stderr}`, 'red');
    return false;
  }
}

function getSchemaPath(): string {
  const schemaPath = join(__dirname, '..', 'templates', 'schema.events.json');
  if (!existsSync(schemaPath)) {
    throw new Error(`Schema file not found: ${schemaPath}`);
  }
  return schemaPath;
}

// Resource checking functions
interface ExistingResources {
  bucket: boolean;
  catalogEnabled: boolean;
  stream: { exists: boolean; id: string | null };
  sink: { exists: boolean; id: string | null };
  pipeline: { exists: boolean; id: string | null };
}

function checkExistingResources(): ExistingResources {
  const resources: ExistingResources = {
    bucket: false,
    catalogEnabled: false,
    stream: { exists: false, id: null },
    sink: { exists: false, id: null },
    pipeline: { exists: false, id: null },
  };

  // Check R2 bucket
  const bucketsOutput = runQuiet('npx wrangler r2 bucket list');
  if (bucketsOutput && bucketsOutput.includes(config.bucketName)) {
    resources.bucket = true;

    // Check if catalog is enabled (status shows as "active")
    const catalogOutput = runQuiet(`npx wrangler r2 bucket catalog get ${config.bucketName}`);
    if (catalogOutput && (catalogOutput.includes('active') || catalogOutput.includes('enabled'))) {
      resources.catalogEnabled = true;
    }
  }

  // Check streams
  const streamsOutput = runQuiet('npx wrangler pipelines streams list');
  if (streamsOutput) {
    const lines = streamsOutput.split('\n');
    for (const line of lines) {
      if (line.includes(config.streamName)) {
        resources.stream.exists = true;
        const idMatch = line.match(/([a-f0-9]{32})/i);
        if (idMatch) {
          resources.stream.id = idMatch[1];
        }
        break;
      }
    }
  }

  // Check sinks
  const sinksOutput = runQuiet('npx wrangler pipelines sinks list');
  if (sinksOutput) {
    const lines = sinksOutput.split('\n');
    for (const line of lines) {
      if (line.includes(config.sinkName)) {
        resources.sink.exists = true;
        const idMatch = line.match(/([a-f0-9]{32})/i);
        if (idMatch) {
          resources.sink.id = idMatch[1];
        }
        break;
      }
    }
  }

  // Check pipelines
  const pipelinesOutput = runQuiet('npx wrangler pipelines list');
  if (pipelinesOutput) {
    const lines = pipelinesOutput.split('\n');
    for (const line of lines) {
      if (line.includes(config.pipelineName)) {
        resources.pipeline.exists = true;
        const idMatch = line.match(/([a-f0-9]{32})/i);
        if (idMatch) {
          resources.pipeline.id = idMatch[1];
        }
        break;
      }
    }
  }

  return resources;
}

function checkWranglerAuth(): boolean {
  log('\n> Checking Cloudflare authentication...', 'cyan');
  try {
    const output = execSync('npx wrangler whoami', {
      encoding: 'utf-8',
      stdio: ['pipe', 'pipe', 'pipe'],
    });

    if (output.includes('You are not authenticated')) {
      return false;
    }

    const emailMatch = output.match(/associated with the email ([^\s]+)/);
    if (emailMatch) {
      log(`  ✓ Logged in as: ${emailMatch[1]}`, 'green');
    } else {
      log(`  ✓ Authenticated with Cloudflare`, 'green');
    }
    return true;
  } catch {
    return false;
  }
}

async function main() {
  log('\n╔════════════════════════════════════════════════════════════╗', 'cyan');
  log('║           cdpflare Infrastructure Setup                     ║', 'cyan');
  log('╚════════════════════════════════════════════════════════════╝', 'cyan');

  // Check authentication first
  if (!checkWranglerAuth()) {
    log('\n  ✗ Not logged in to Cloudflare', 'red');
    log('\n  Please run the following command to authenticate:', 'yellow');
    log('    npx wrangler login', 'cyan');
    log('\n  This will open a browser window to authorize wrangler.', 'yellow');
    log('  After logging in, run this setup script again.\n', 'yellow');
    process.exit(1);
  }

  log('\n> Checking existing resources...', 'cyan');
  const existing = checkExistingResources();

  const schemaPath = getSchemaPath();

  // Show what exists and what needs to be created
  log('\n┌────────────────────────────────────────────────────────────┐', 'cyan');
  log('│                    Resource Status                          │', 'cyan');
  log('└────────────────────────────────────────────────────────────┘', 'cyan');

  log(`\n  R2 Bucket (${config.bucketName}):`, 'reset');
  if (existing.bucket) {
    log(`    ✓ Exists`, 'green');
    log(`    ${existing.catalogEnabled ? '✓ Data Catalog enabled' : '○ Data Catalog not enabled'}`,
      existing.catalogEnabled ? 'green' : 'yellow');
  } else {
    log(`    ○ Not created`, 'yellow');
  }

  log(`\n  Stream (${config.streamName}):`, 'reset');
  if (existing.stream.exists) {
    log(`    ✓ Exists (ID: ${existing.stream.id})`, 'green');
  } else {
    log(`    ○ Not created`, 'yellow');
  }

  log(`\n  Sink (${config.sinkName}):`, 'reset');
  if (existing.sink.exists) {
    log(`    ✓ Exists (ID: ${existing.sink.id})`, 'green');
  } else {
    log(`    ○ Not created`, 'yellow');
  }

  log(`\n  Pipeline (${config.pipelineName}):`, 'reset');
  if (existing.pipeline.exists) {
    log(`    ✓ Exists (ID: ${existing.pipeline.id})`, 'green');
  } else {
    log(`    ○ Not created`, 'yellow');
  }

  // Determine what needs to be created
  const needsBucket = !existing.bucket;
  const needsCatalog = !existing.catalogEnabled;
  const needsStream = !existing.stream.exists;
  const needsSink = !existing.sink.exists;
  const needsPipeline = !existing.pipeline.exists;

  const allExist = !needsBucket && !needsCatalog && !needsStream && !needsSink && !needsPipeline;

  if (allExist) {
    log('\n> All resources already exist!', 'green');
  } else {
    log('\n> Creating missing resources...', 'cyan');

    // Step 1: Create R2 bucket if needed
    if (needsBucket) {
      log('\n  Creating R2 bucket...', 'cyan');
      if (!runCommand(`npx wrangler r2 bucket create ${config.bucketName}`, 'Create bucket')) {
        log('\nFailed to create R2 bucket. Aborting.', 'red');
        process.exit(1);
      }
      log(`    ✓ Created ${config.bucketName}`, 'green');
    }

    // Step 2: Enable Data Catalog if needed
    if (needsCatalog) {
      log('\n  Enabling Data Catalog...', 'cyan');
      if (!runCommand(`npx wrangler r2 bucket catalog enable ${config.bucketName}`, 'Enable catalog')) {
        log('\nFailed to enable Data Catalog. Aborting.', 'red');
        process.exit(1);
      }
      log(`    ✓ Data Catalog enabled`, 'green');
    }

    // Step 3: Create stream if needed
    if (needsStream) {
      log('\n  Creating stream...', 'cyan');
      const streamCmd = `npx wrangler pipelines streams create ${config.streamName} ` +
        `--schema-file "${schemaPath}" ` +
        `--http-enabled true ` +
        `--http-auth false`;
      if (!runCommand(streamCmd, 'Create stream')) {
        log('\nFailed to create stream. Aborting.', 'red');
        process.exit(1);
      }
      log(`    ✓ Created ${config.streamName}`, 'green');
    }

    // Step 4: Create sink if needed
    if (needsSink) {
      log('\n  Creating sink...', 'cyan');
      const sinkCmd = `npx wrangler pipelines sinks create ${config.sinkName} ` +
        `--type r2 ` +
        `--bucket ${config.bucketName} ` +
        `--format parquet ` +
        `--compression zstd ` +
        `--path "events/" ` +
        `--roll-interval 60`;
      if (!runCommand(sinkCmd, 'Create sink')) {
        log('\nFailed to create sink. Aborting.', 'red');
        process.exit(1);
      }
      log(`    ✓ Created ${config.sinkName}`, 'green');
    }

    // Step 5: Create pipeline if needed
    if (needsPipeline) {
      log('\n  Creating pipeline...', 'cyan');
      const pipelineCmd = `npx wrangler pipelines create ${config.pipelineName} ` +
        `--sql "INSERT INTO ${config.sinkName} SELECT * FROM ${config.streamName}"`;
      if (!runCommand(pipelineCmd, 'Create pipeline')) {
        log('\nFailed to create pipeline. Aborting.', 'red');
        process.exit(1);
      }
      log(`    ✓ Created ${config.pipelineName}`, 'green');
    }
  }

  // Refresh resource info after any creations
  log('\n> Fetching final resource details...', 'cyan');
  const finalResources = checkExistingResources();

  // Success!
  log('\n╔════════════════════════════════════════════════════════════╗', 'green');
  log('║           Setup Complete!                                   ║', 'green');
  log('╚════════════════════════════════════════════════════════════╝', 'green');

  // Show resource summary
  log('\n┌────────────────────────────────────────────────────────────┐', 'cyan');
  log('│                    Resource Summary                         │', 'cyan');
  log('└────────────────────────────────────────────────────────────┘', 'cyan');

  log('\n  R2 Bucket:', 'cyan');
  log(`    Name: ${config.bucketName}`, 'reset');

  log('\n  Stream:', 'cyan');
  log(`    Name: ${config.streamName}`, 'reset');
  if (finalResources.stream.id) {
    log(`    ID:   ${colors.bold}${finalResources.stream.id}${colors.reset}`, 'green');
    log(`    HTTP: https://${finalResources.stream.id}.ingest.cloudflare.com`, 'reset');
  }

  log('\n  Sink:', 'cyan');
  log(`    Name: ${config.sinkName}`, 'reset');
  if (finalResources.sink.id) {
    log(`    ID:   ${finalResources.sink.id}`, 'reset');
  }
  log(`    Path: ${config.bucketName}/events/`, 'reset');

  log('\n  Pipeline:', 'cyan');
  log(`    Name: ${config.pipelineName}`, 'reset');
  if (finalResources.pipeline.id) {
    log(`    ID:   ${finalResources.pipeline.id}`, 'reset');
  }
  log(`    SQL:  INSERT INTO ${config.sinkName} SELECT * FROM ${config.streamName}`, 'dim');

  // Worker configuration instructions
  if (finalResources.stream.id) {
    log('\n┌────────────────────────────────────────────────────────────┐', 'green');
    log('│     Copy this to workers/event-ingest/wrangler.jsonc      │', 'green');
    log('└────────────────────────────────────────────────────────────┘', 'green');
    log(`
  "pipelines": [
    {
      "pipeline": "${finalResources.stream.id}",
      "binding": "PIPELINE"
    }
  ]
`, 'yellow');
  } else {
    log('\n  ⚠ Could not fetch Stream ID automatically.', 'yellow');
    log('  Run: npx wrangler pipelines streams list', 'yellow');
    log('  And copy the ID for your stream to wrangler.jsonc', 'yellow');
  }

  log('┌────────────────────────────────────────────────────────────┐', 'cyan');
  log('│                      Next Steps                            │', 'cyan');
  log('└────────────────────────────────────────────────────────────┘', 'cyan');
  log('\n  1. Update workers/event-ingest/wrangler.jsonc with the pipeline config above');
  log('  2. Deploy: pnpm deploy:ingest');
  log('  3. Test:');
  log(`     curl -X POST https://cdpflare-event-ingest.YOUR-SUBDOMAIN.workers.dev/v1/track \\`);
  log(`       -H "Content-Type: application/json" \\`);
  log(`       -d '{"userId":"test","event":"Test Event"}'`);
  log('\n  See README.md for full documentation.\n');
}

main().catch((error) => {
  log(`\nSetup failed: ${error.message}`, 'red');
  process.exit(1);
});
