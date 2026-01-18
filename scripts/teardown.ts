#!/usr/bin/env tsx
/**
 * Teardown script for icelight infrastructure
 * Deletes all resources created by setup-pipeline.ts
 *
 * Usage: pnpm teardown
 *
 * Options:
 * - --confirm: Skip confirmation prompt
 * - --keep-bucket: Don't delete the R2 bucket (preserves data)
 *
 * Reads PROJECT_NAME from .env file to determine resource names.
 */

import { execSync } from 'child_process';
import { existsSync, readFileSync, unlinkSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import * as readline from 'readline';

const __dirname = dirname(fileURLToPath(import.meta.url));

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

// Path to .env file
const envFilePath = join(__dirname, '..', '.env');

/**
 * Load environment variables from .env file
 */
function loadEnvFile(): Record<string, string> {
  const env: Record<string, string> = {};
  if (existsSync(envFilePath)) {
    const content = readFileSync(envFilePath, 'utf-8');
    for (const line of content.split('\n')) {
      const trimmed = line.trim();
      if (trimmed && !trimmed.startsWith('#')) {
        const eqIndex = trimmed.indexOf('=');
        if (eqIndex > 0) {
          const key = trimmed.slice(0, eqIndex).trim();
          let value = trimmed.slice(eqIndex + 1).trim();
          // Remove surrounding quotes if present
          if ((value.startsWith('"') && value.endsWith('"')) ||
              (value.startsWith("'") && value.endsWith("'"))) {
            value = value.slice(1, -1);
          }
          env[key] = value;
        }
      }
    }
  }
  return env;
}

// Parse CLI args
const args = process.argv.slice(2);
const keepBucket = args.includes('--keep-bucket');
const confirmed = args.includes('--confirm');

// Load saved environment variables
const savedEnv = loadEnvFile();
const projectName = savedEnv.CDPFLARE_PROJECT_NAME || 'icelight';

// Derive all names from project name (matching setup-pipeline.ts)
const underscoreName = projectName.replace(/-/g, '_');
const config = {
  bucketName: `${projectName}-data`,
  streamName: `${underscoreName}_events_stream`,
  sinkName: `${underscoreName}_events_sink`,
  pipelineName: `${underscoreName}_events_pipeline`,
};

// Worker configs to delete
const workerLocalConfigs = [
  join(__dirname, '..', 'workers', 'event-ingest', 'wrangler.local.jsonc'),
  join(__dirname, '..', 'workers', 'duckdb-api', 'wrangler.local.jsonc'),
  join(__dirname, '..', 'workers', 'query-api', 'wrangler.local.jsonc'),
];

// Worker names (derived from wrangler.jsonc files)
const workerNames = [
  'icelight-event-ingest',
  'icelight-duckdb-api',
  'icelight-query-api',
];

// Container names (derived from worker name + container binding name)
const containerNames = [
  'icelight-duckdb-api-duckdbcontainer',
];

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

/**
 * Look up resource IDs from their names
 */
interface ResourceIds {
  streamId: string | null;
  sinkId: string | null;
  pipelineId: string | null;
  containerIds: Map<string, string>;
}

function lookupResourceIds(): ResourceIds {
  const ids: ResourceIds = {
    streamId: null,
    sinkId: null,
    pipelineId: null,
    containerIds: new Map(),
  };

  // Look up container IDs
  const containersOutput = runQuiet('npx wrangler containers list');
  if (containersOutput) {
    try {
      const containers = JSON.parse(containersOutput) as Array<{ id: string; name: string }>;
      for (const container of containers) {
        if (containerNames.includes(container.name)) {
          ids.containerIds.set(container.name, container.id);
        }
      }
    } catch {
      // Failed to parse JSON, try line-by-line
    }
  }

  // Look up stream ID
  const streamsOutput = runQuiet('npx wrangler pipelines streams list');
  if (streamsOutput) {
    const lines = streamsOutput.split('\n');
    for (const line of lines) {
      if (line.includes(config.streamName)) {
        const idMatch = line.match(/([a-f0-9]{32})/i);
        if (idMatch) {
          ids.streamId = idMatch[1];
        }
        break;
      }
    }
  }

  // Look up sink ID
  const sinksOutput = runQuiet('npx wrangler pipelines sinks list');
  if (sinksOutput) {
    const lines = sinksOutput.split('\n');
    for (const line of lines) {
      if (line.includes(config.sinkName)) {
        const idMatch = line.match(/([a-f0-9]{32})/i);
        if (idMatch) {
          ids.sinkId = idMatch[1];
        }
        break;
      }
    }
  }

  // Look up pipeline ID
  const pipelinesOutput = runQuiet('npx wrangler pipelines list');
  if (pipelinesOutput) {
    const lines = pipelinesOutput.split('\n');
    for (const line of lines) {
      if (line.includes(config.pipelineName)) {
        const idMatch = line.match(/([a-f0-9]{32})/i);
        if (idMatch) {
          ids.pipelineId = idMatch[1];
        }
        break;
      }
    }
  }

  return ids;
}

function run(command: string, description: string): boolean {
  log(`\n> ${description}`, 'cyan');
  log(`  ${colors.dim}$ ${command}${colors.reset}`);

  try {
    const output = execSync(command, {
      encoding: 'utf-8',
      stdio: ['pipe', 'pipe', 'pipe'],
    });
    if (output.trim()) {
      console.log(output);
    }
    log(`  ✓ Success`, 'green');
    return true;
  } catch (error) {
    const err = error as { stderr?: string; message?: string };
    const stderr = err.stderr || err.message || 'Unknown error';

    // Check if it's a "not found" error (already deleted)
    if (stderr.includes('not found') || stderr.includes('does not exist') || stderr.includes('could not be found')) {
      log(`  ⚠ Not found (skipping)`, 'yellow');
      return true;
    }

    log(`  ✗ Failed: ${stderr}`, 'red');
    return false;
  }
}

async function confirm(message: string): Promise<boolean> {
  if (confirmed) return true;

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  return new Promise((resolve) => {
    rl.question(`${colors.yellow}${message} (y/N): ${colors.reset}`, (answer) => {
      rl.close();
      resolve(answer.toLowerCase() === 'y' || answer.toLowerCase() === 'yes');
    });
  });
}

/**
 * Get account ID from wrangler whoami
 */
function getAccountId(): string | null {
  const output = runQuiet('npx wrangler whoami');
  if (!output) return null;

  // Try to extract account ID from the output
  const match = output.match(/Account ID[:\s]+([a-f0-9]{32})/i);
  return match ? match[1] : null;
}

/**
 * List all objects in an R2 bucket using Cloudflare API
 */
async function listBucketObjects(bucketName: string, apiToken: string, accountId: string): Promise<string[]> {
  const objects: string[] = [];
  let cursor: string | undefined;

  do {
    const url = `https://api.cloudflare.com/client/v4/accounts/${accountId}/r2/buckets/${bucketName}/objects${cursor ? `?cursor=${cursor}` : ''}`;

    try {
      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${apiToken}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const error = await response.text();
        log(`  ⚠ Failed to list objects: ${error}`, 'yellow');
        break;
      }

      const data = await response.json() as {
        success: boolean;
        result: { objects: Array<{ key: string }>, cursor?: string, truncated?: boolean };
      };

      if (!data.success || !data.result) {
        break;
      }

      for (const obj of data.result.objects || []) {
        objects.push(obj.key);
      }

      cursor = data.result.truncated ? data.result.cursor : undefined;
    } catch (error) {
      log(`  ⚠ Error listing objects: ${error}`, 'yellow');
      break;
    }
  } while (cursor);

  return objects;
}

/**
 * Delete all objects from an R2 bucket using Cloudflare API
 */
async function emptyBucket(bucketName: string, apiToken: string, accountId: string): Promise<boolean> {
  log(`\n> Emptying R2 bucket: ${bucketName}`, 'cyan');

  const objects = await listBucketObjects(bucketName, apiToken, accountId);
  if (objects.length === 0) {
    log(`  ✓ Bucket is already empty`, 'green');
    return true;
  }

  log(`  Found ${objects.length} objects to delete`, 'yellow');

  let deletedCount = 0;
  let failedCount = 0;

  // Delete objects in batches using wrangler (which handles individual deletes)
  for (const key of objects) {
    // Use wrangler to delete individual objects
    const deleteOutput = runQuiet(`npx wrangler r2 object delete "${bucketName}/${key}"`);
    if (deleteOutput !== null || deleteOutput === '') {
      deletedCount++;
      // Show progress every 10 objects
      if (deletedCount % 10 === 0) {
        log(`  Deleted ${deletedCount}/${objects.length} objects...`, 'dim');
      }
    } else {
      failedCount++;
      if (failedCount <= 5) {
        log(`  ⚠ Failed to delete: ${key}`, 'yellow');
      }
    }
  }

  if (failedCount === 0) {
    log(`  ✓ Deleted ${deletedCount} objects`, 'green');
    return true;
  } else {
    log(`  ⚠ Deleted ${deletedCount} objects, failed to delete ${failedCount}`, 'yellow');
    return failedCount < objects.length / 2; // Consider partial success if less than half failed
  }
}

/**
 * Delete local wrangler config files
 */
function deleteLocalConfigs(): void {
  log(`\n> Deleting local wrangler config files`, 'cyan');

  for (const configPath of workerLocalConfigs) {
    if (existsSync(configPath)) {
      try {
        unlinkSync(configPath);
        log(`  ✓ Deleted: ${configPath.replace(join(__dirname, '..') + '/', '')}`, 'green');
      } catch (error) {
        log(`  ✗ Failed to delete: ${configPath}`, 'red');
      }
    } else {
      log(`  ⚠ Not found: ${configPath.replace(join(__dirname, '..') + '/', '')}`, 'yellow');
    }
  }
}

async function main() {
  log('\n╔════════════════════════════════════════════════════════════╗', 'red');
  log('║           icelight Infrastructure Teardown                  ║', 'red');
  log('╚════════════════════════════════════════════════════════════╝', 'red');

  log(`\n  Project name: ${projectName} (from .env)`, 'cyan');

  log('\n┌────────────────────────────────────────────────────────────┐', 'yellow');
  log('│                 Resources to be Deleted                    │', 'yellow');
  log('└────────────────────────────────────────────────────────────┘', 'yellow');

  log('\n  Cloudflare Resources:', 'yellow');
  log(`    • Workers:    ${workerNames.join(', ')}`);
  log(`    • Containers: ${containerNames.join(', ')}`);
  log(`    • Pipeline:   ${config.pipelineName}`);
  log(`    • Sink:       ${config.sinkName}`);
  log(`    • Stream:     ${config.streamName}`);
  if (!keepBucket) {
    log(`    • Bucket:     ${config.bucketName} ${colors.red}(and ALL data!)${colors.reset}`);
  } else {
    log(`    • Bucket:     ${colors.green}(KEEPING - data preserved)${colors.reset}`);
  }

  log('\n  Local Files:', 'yellow');
  for (const configPath of workerLocalConfigs) {
    const relativePath = configPath.replace(join(__dirname, '..') + '/', '');
    if (existsSync(configPath)) {
      log(`    • ${relativePath}`);
    } else {
      log(`    • ${relativePath} (not found)`);
    }
  }

  log('\n  Preserved:', 'green');
  log(`    • .env (contains project name and API token)`);

  const shouldProceed = await confirm('\nAre you sure you want to proceed?');
  if (!shouldProceed) {
    log('\nTeardown cancelled.', 'yellow');
    process.exit(0);
  }

  log('\n╔════════════════════════════════════════════════════════════╗', 'cyan');
  log('║                 Starting Teardown...                        ║', 'cyan');
  log('╚════════════════════════════════════════════════════════════╝', 'cyan');

  // Look up resource IDs first
  log('\n> Looking up resource IDs...', 'cyan');
  const resourceIds = lookupResourceIds();

  // Step 1: Delete workers
  log('\n┌────────────────────────────────────────────────────────────┐', 'cyan');
  log('│                  Deleting Workers                          │', 'cyan');
  log('└────────────────────────────────────────────────────────────┘', 'cyan');

  for (const workerName of workerNames) {
    run(`npx wrangler delete --name ${workerName} --force`, `Deleting worker: ${workerName}`);
  }

  // Step 2: Delete containers
  log('\n┌────────────────────────────────────────────────────────────┐', 'cyan');
  log('│                 Deleting Containers                        │', 'cyan');
  log('└────────────────────────────────────────────────────────────┘', 'cyan');

  for (const containerName of containerNames) {
    const containerId = resourceIds.containerIds.get(containerName);
    if (containerId) {
      run(`npx wrangler containers delete ${containerId}`, `Deleting container: ${containerName} (${containerId})`);
    } else {
      log(`\n> Deleting container: ${containerName}`, 'cyan');
      log(`  ⚠ Not found (skipping)`, 'yellow');
    }
  }

  // Step 3: Delete pipeline
  log('\n┌────────────────────────────────────────────────────────────┐', 'cyan');
  log('│                Deleting Pipeline Resources                 │', 'cyan');
  log('└────────────────────────────────────────────────────────────┘', 'cyan');

  if (resourceIds.pipelineId) {
    run(
      `npx wrangler pipelines delete ${resourceIds.pipelineId} --force`,
      `Deleting Pipeline: ${config.pipelineName} (${resourceIds.pipelineId})`
    );
  } else {
    log(`\n> Deleting Pipeline: ${config.pipelineName}`, 'cyan');
    log(`  ⚠ Not found (skipping)`, 'yellow');
  }

  // Step 3: Delete sink
  if (resourceIds.sinkId) {
    run(
      `npx wrangler pipelines sinks delete ${resourceIds.sinkId} --force`,
      `Deleting Sink: ${config.sinkName} (${resourceIds.sinkId})`
    );
  } else {
    log(`\n> Deleting Sink: ${config.sinkName}`, 'cyan');
    log(`  ⚠ Not found (skipping)`, 'yellow');
  }

  // Step 4: Delete stream
  if (resourceIds.streamId) {
    run(
      `npx wrangler pipelines streams delete ${resourceIds.streamId} --force`,
      `Deleting Stream: ${config.streamName} (${resourceIds.streamId})`
    );
  } else {
    log(`\n> Deleting Stream: ${config.streamName}`, 'cyan');
    log(`  ⚠ Not found (skipping)`, 'yellow');
  }

  // Step 5: Delete bucket (if not keeping)
  if (!keepBucket) {
    log('\n┌────────────────────────────────────────────────────────────┐', 'cyan');
    log('│                  Deleting R2 Bucket                        │', 'cyan');
    log('└────────────────────────────────────────────────────────────┘', 'cyan');

    // Get API token and account ID for bucket operations
    const apiToken = savedEnv.ICELIGHT_API_TOKEN || savedEnv.CDPFLARE_API_TOKEN;
    const accountId = getAccountId();

    if (!apiToken || !accountId) {
      log(`  ⚠ Cannot empty bucket: missing API token or account ID`, 'yellow');
      log(`    API Token: ${apiToken ? 'found' : 'missing (set ICELIGHT_API_TOKEN in .env)'}`, 'yellow');
      log(`    Account ID: ${accountId ? 'found' : 'missing (run wrangler login)'}`, 'yellow');
      log(`    Attempting to delete bucket anyway...`, 'yellow');
    } else {
      // First, empty the bucket (must delete all objects before deleting bucket)
      await emptyBucket(config.bucketName, apiToken, accountId);
    }

    // Then delete the bucket
    run(
      `npx wrangler r2 bucket delete ${config.bucketName}`,
      `Deleting R2 bucket: ${config.bucketName}`
    );
  }

  // Step 6: Delete local config files
  log('\n┌────────────────────────────────────────────────────────────┐', 'cyan');
  log('│               Deleting Local Config Files                  │', 'cyan');
  log('└────────────────────────────────────────────────────────────┘', 'cyan');

  deleteLocalConfigs();

  // Complete!
  log('\n╔════════════════════════════════════════════════════════════╗', 'green');
  log('║              Teardown Complete!                             ║', 'green');
  log('╚════════════════════════════════════════════════════════════╝', 'green');

  log('\n  Summary:', 'cyan');
  log('    ✓ Deleted Cloudflare workers');
  log('    ✓ Deleted Cloudflare containers');
  log('    ✓ Deleted pipeline, sink, and stream');
  if (!keepBucket) {
    log('    ✓ Emptied and deleted R2 bucket');
  } else {
    log(`    ⚠ R2 bucket "${config.bucketName}" was preserved`, 'yellow');
    log('      To delete it manually:', 'yellow');
    log(`        npx wrangler r2 bucket delete ${config.bucketName}`);
  }
  log('    ✓ Deleted wrangler.local.jsonc files');
  log('    ✓ Preserved .env file');

  log('\n  To recreate the infrastructure, run:', 'cyan');
  log('    pnpm launch\n');
}

main().catch((error) => {
  log(`\nTeardown failed: ${error.message}`, 'red');
  process.exit(1);
});
