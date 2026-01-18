#!/usr/bin/env tsx
/**
 * Setup script for icelight infrastructure
 * Creates R2 bucket, Data Catalog, Stream, Sink, and Pipeline
 *
 * Usage: pnpm launch
 *
 * Environment variables (optional, defaults provided):
 * - BUCKET_NAME: R2 bucket name (default: icelight-data)
 * - STREAM_NAME: Stream name (default: icelight_events_stream)
 * - SINK_NAME: Sink name (default: icelight_events_sink)
 * - PIPELINE_NAME: Pipeline name (default: icelight_events_pipeline)
 */

import { execSync, spawnSync } from 'child_process';
import { existsSync, readFileSync, writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { createInterface } from 'readline';

const __dirname = dirname(fileURLToPath(import.meta.url));

// Default project name - all resource names are derived from this
const defaultProjectName = process.env.PROJECT_NAME || 'icelight';

// Configuration - populated after prompting user
interface Config {
  bucketName: string;
  streamName: string;
  sinkName: string;
  pipelineName: string;
}
let config: Config;

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

// Path to .env file for storing API token
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

/**
 * Save or update a value in .env file
 */
function saveToEnvFile(key: string, value: string): void {
  let content = '';
  let found = false;

  if (existsSync(envFilePath)) {
    const lines = readFileSync(envFilePath, 'utf-8').split('\n');
    const newLines = lines.map(line => {
      const trimmed = line.trim();
      if (trimmed.startsWith(`${key}=`)) {
        found = true;
        return `${key}="${value}"`;
      }
      return line;
    });
    content = newLines.join('\n');
  }

  if (!found) {
    // Add new entry
    if (content && !content.endsWith('\n')) {
      content += '\n';
    }
    content += `${key}="${value}"\n`;
  }

  writeFileSync(envFilePath, content);
}

// Load saved environment variables
const savedEnv = loadEnvFile();

// API token - loaded from .env or collected during setup
let apiToken = savedEnv.CDPFLARE_API_TOKEN || '';

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

/**
 * Run a command and return the output (for capturing deploy URLs)
 */
function runCommandWithOutput(command: string): { success: boolean; output: string } {
  log(`  ${colors.dim}$ ${command}${colors.reset}`);
  try {
    const output = execSync(command, {
      encoding: 'utf-8',
      stdio: ['pipe', 'pipe', 'pipe'],
    });
    return { success: true, output };
  } catch (error) {
    const err = error as { stderr?: string; stdout?: string; message?: string };
    const stderr = err.stderr || err.message || 'Unknown error';
    log(`  ✗ Failed: ${stderr}`, 'red');
    return { success: false, output: err.stdout || '' };
  }
}

/**
 * Extract worker URL from wrangler deploy output
 */
function extractWorkerUrl(output: string): string | null {
  // Look for pattern like "https://worker-name.subdomain.workers.dev"
  const match = output.match(/https:\/\/[a-z0-9-]+\.[a-z0-9-]+\.workers\.dev/i);
  return match ? match[0] : null;
}

// Store deployed worker URLs
const deployedUrls: {
  ingest?: string;
  duckdb?: string;
  query?: string;
} = {};

function getSchemaPath(): string {
  const schemaPath = join(__dirname, '..', 'templates', 'schema.events.json');
  if (!existsSync(schemaPath)) {
    throw new Error(`Schema file not found: ${schemaPath}`);
  }
  return schemaPath;
}

function prompt(question: string): Promise<string> {
  const rl = createInterface({
    input: process.stdin,
    output: process.stdout,
  });
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      rl.close();
      resolve(answer.trim());
    });
  });
}

/**
 * Strip JSON comments and trailing commas to parse JSONC
 */
function parseJsonc(content: string): unknown {
  // Remove single-line comments
  let stripped = content.replace(/\/\/.*$/gm, '');
  // Remove multi-line comments
  stripped = stripped.replace(/\/\*[\s\S]*?\*\//g, '');
  // Remove trailing commas before } or ]
  stripped = stripped.replace(/,(\s*[}\]])/g, '$1');
  return JSON.parse(stripped);
}

/**
 * Create wrangler.local.jsonc for query-api worker
 */
function createQueryApiLocalConfig(warehouseName: string): boolean {
  const basePath = join(__dirname, '..', 'workers', 'query-api', 'wrangler.jsonc');
  const localPath = join(__dirname, '..', 'workers', 'query-api', 'wrangler.local.jsonc');

  if (!existsSync(basePath)) {
    log(`  ⚠ Query API config not found: ${basePath}`, 'yellow');
    return false;
  }

  try {
    const baseContent = readFileSync(basePath, 'utf-8');
    const config = parseJsonc(baseContent) as Record<string, unknown>;

    // Add or update WAREHOUSE_NAME in vars
    const vars = (config.vars as Record<string, unknown>) || {};
    vars.WAREHOUSE_NAME = warehouseName;
    config.vars = vars;

    // Write local config with comment header
    const localContent = `// Local wrangler config - DO NOT COMMIT
// Generated by: pnpm launch
// Contains environment-specific values for your Cloudflare account
${JSON.stringify(config, null, 2)}
`;

    writeFileSync(localPath, localContent);
    log(`  ✓ Created wrangler.local.jsonc with WAREHOUSE_NAME`, 'green');
    return true;
  } catch (error) {
    log(`  ✗ Failed to create local config: ${error}`, 'red');
    return false;
  }
}

/**
 * Create wrangler.local.jsonc for event-ingest worker
 */
function createEventIngestLocalConfig(streamId: string): boolean {
  const basePath = join(__dirname, '..', 'workers', 'event-ingest', 'wrangler.jsonc');
  const localPath = join(__dirname, '..', 'workers', 'event-ingest', 'wrangler.local.jsonc');

  if (!existsSync(basePath)) {
    log(`  ⚠ Event Ingest config not found: ${basePath}`, 'yellow');
    return false;
  }

  try {
    const baseContent = readFileSync(basePath, 'utf-8');
    const config = parseJsonc(baseContent) as Record<string, unknown>;

    // Add pipeline binding
    config.pipelines = [
      {
        pipeline: streamId,
        binding: 'PIPELINE',
      },
    ];

    // Write local config with comment header
    const localContent = `// Local wrangler config - DO NOT COMMIT
// Generated by: pnpm launch
// Contains environment-specific values for your Cloudflare account
${JSON.stringify(config, null, 2)}
`;

    writeFileSync(localPath, localContent);
    log(`  ✓ Created wrangler.local.jsonc with pipeline binding`, 'green');
    return true;
  } catch (error) {
    log(`  ✗ Failed to create local config: ${error}`, 'red');
    return false;
  }
}

/**
 * Create wrangler.local.jsonc for duckdb-api worker
 */
function createDuckDbApiLocalConfig(bucketName: string, catalogUri: string): boolean {
  const basePath = join(__dirname, '..', 'workers', 'duckdb-api', 'wrangler.jsonc');
  const localPath = join(__dirname, '..', 'workers', 'duckdb-api', 'wrangler.local.jsonc');

  if (!existsSync(basePath)) {
    log(`  ⚠ DuckDB API config not found: ${basePath}`, 'yellow');
    return false;
  }

  try {
    const baseContent = readFileSync(basePath, 'utf-8');
    const config = parseJsonc(baseContent) as Record<string, unknown>;

    // Add R2 catalog configuration to vars
    // bucketName here is actually the warehouse name (account_bucket format)
    const vars = (config.vars as Record<string, unknown>) || {};
    vars.R2_CATALOG = bucketName; // warehouse name e.g. "accountId_bucketName"
    vars.R2_ENDPOINT = catalogUri;
    config.vars = vars;

    // Add observability
    config.observability = { enabled: true };

    // Write local config with comment header
    const localContent = `// Local wrangler config - DO NOT COMMIT
// Generated by: pnpm launch
// Contains environment-specific values for your Cloudflare account
${JSON.stringify(config, null, 2)}
`;

    writeFileSync(localPath, localContent);
    log(`  ✓ Created wrangler.local.jsonc with R2 catalog config`, 'green');
    return true;
  } catch (error) {
    log(`  ✗ Failed to create local config: ${error}`, 'red');
    return false;
  }
}

function setSecret(name: string, value: string, configPath: string): boolean {
  try {
    // Use spawn with input to set secret non-interactively
    const result = spawnSync('npx', ['wrangler', 'secret', 'put', name, '--config', configPath], {
      input: value,
      encoding: 'utf-8',
      stdio: ['pipe', 'pipe', 'pipe'],
    });

    if (result.status === 0) {
      log(`  ✓ Set ${name} secret`, 'green');
      return true;
    } else {
      log(`  ✗ Failed to set ${name}: ${result.stderr}`, 'red');
      return false;
    }
  } catch (error) {
    log(`  ✗ Failed to set ${name}: ${error}`, 'red');
    return false;
  }
}

interface SecretStatus {
  CF_ACCOUNT_ID: boolean;
  CF_API_TOKEN: boolean;
}

function checkSecrets(configPath: string): SecretStatus {
  const status: SecretStatus = {
    CF_ACCOUNT_ID: false,
    CF_API_TOKEN: false,
  };

  try {
    const output = execSync(`npx wrangler secret list --config "${configPath}"`, {
      encoding: 'utf-8',
      stdio: ['pipe', 'pipe', 'pipe'],
    });

    if (output.includes('CF_ACCOUNT_ID')) {
      status.CF_ACCOUNT_ID = true;
    }
    if (output.includes('CF_API_TOKEN')) {
      status.CF_API_TOKEN = true;
    }
  } catch {
    // Secrets list may fail if worker not deployed yet - that's ok
  }

  return status;
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

interface AuthInfo {
  authenticated: boolean;
  email?: string;
  accountId?: string;
}

function checkWranglerAuth(): AuthInfo {
  log('\n> Checking Cloudflare authentication...', 'cyan');
  try {
    const output = execSync('npx wrangler whoami', {
      encoding: 'utf-8',
      stdio: ['pipe', 'pipe', 'pipe'],
    });

    if (output.includes('You are not authenticated')) {
      return { authenticated: false };
    }

    const result: AuthInfo = { authenticated: true };

    const emailMatch = output.match(/associated with the email ([^\s]+)/);
    if (emailMatch) {
      result.email = emailMatch[1];
      log(`  ✓ Logged in as: ${emailMatch[1]}`, 'green');
    } else {
      log(`  ✓ Authenticated with Cloudflare`, 'green');
    }

    // Try to extract account ID
    const accountMatch = output.match(/Account ID[:\s]+([a-f0-9]{32})/i);
    if (accountMatch) {
      result.accountId = accountMatch[1];
    } else {
      // Try alternative: get from wrangler config or API
      const accountsOutput = runQuiet('npx wrangler whoami --account');
      if (accountsOutput) {
        const idMatch = accountsOutput.match(/([a-f0-9]{32})/i);
        if (idMatch) {
          result.accountId = idMatch[1];
        }
      }
    }

    if (result.accountId) {
      log(`  ✓ Account ID: ${result.accountId}`, 'green');
    }

    return result;
  } catch {
    return { authenticated: false };
  }
}

async function main() {
  log('\n╔════════════════════════════════════════════════════════════╗', 'cyan');
  log('║           icelight Infrastructure Setup                     ║', 'cyan');
  log('╚════════════════════════════════════════════════════════════╝', 'cyan');

  // Prompt for project name first (use saved value from .env if available)
  const savedProjectName = savedEnv.CDPFLARE_PROJECT_NAME || defaultProjectName;
  log('\n┌────────────────────────────────────────────────────────────┐', 'cyan');
  log('│                    Configuration                           │', 'cyan');
  log('└────────────────────────────────────────────────────────────┘', 'cyan');
  log('\n  All resource names are derived from the project name.', 'reset');
  const projectInput = await prompt(`\n  Project name [${savedProjectName}]: `);
  const projectName = projectInput || savedProjectName;

  // Save project name for future runs
  if (projectName !== savedEnv.CDPFLARE_PROJECT_NAME) {
    saveToEnvFile('CDPFLARE_PROJECT_NAME', projectName);
  }

  // Derive all names from project name
  // Bucket uses hyphens (R2 requirement), pipeline resources use underscores (stream requirement)
  const underscoreName = projectName.replace(/-/g, '_');
  config = {
    bucketName: `${projectName}-data`,
    streamName: `${underscoreName}_events_stream`,
    sinkName: `${underscoreName}_events_sink`,
    pipelineName: `${underscoreName}_events_pipeline`,
  };

  log(`\n  Using configuration:`, 'cyan');
  log(`    Bucket:   ${config.bucketName}`, 'reset');
  log(`    Stream:   ${config.streamName}`, 'reset');
  log(`    Sink:     ${config.sinkName}`, 'reset');
  log(`    Pipeline: ${config.pipelineName}`, 'reset');

  // Check authentication first
  const authInfo = checkWranglerAuth();
  if (!authInfo.authenticated) {
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

  // If we need to create sink (or deploy workers), we need an API token
  if (needsSink || !apiToken) {
    if (apiToken) {
      log('\n> Using API token from .env file', 'green');
    } else {
      log('\n┌────────────────────────────────────────────────────────────┐', 'yellow');
      log('│              API Token Required                            │', 'yellow');
      log('└────────────────────────────────────────────────────────────┘', 'yellow');
      log('\n  An API token is needed for Data Catalog and worker secrets.', 'reset');
      log('  Required permissions:', 'reset');
      log('    • Account → Workers R2 Storage → Edit', 'reset');
      log('    • Account → Workers R2 Data Catalog → Edit', 'reset');
      log('    • Account → Workers R2 SQL → Read', 'reset');
      log('\n  Create a token at: https://dash.cloudflare.com/profile/api-tokens', 'cyan');
      log('\n  Paste your API token below:', 'yellow');
      apiToken = await prompt('  API Token: ');
      if (!apiToken) {
        log('\n  ✗ API token is required.', 'red');
        process.exit(1);
      }
      // Save to .env for future runs
      saveToEnvFile('CDPFLARE_API_TOKEN', apiToken);
      log('    ✓ Token saved to .env file', 'green');
    }
  }

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
      // Use r2-data-catalog sink type for Iceberg tables queryable by R2 SQL
      const sinkCmd = `npx wrangler pipelines sinks create ${config.sinkName} ` +
        `--type r2-data-catalog ` +
        `--bucket ${config.bucketName} ` +
        `--namespace analytics ` +
        `--table events ` +
        `--roll-interval 60 ` +
        `--catalog-token "${apiToken}"`;
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

  // Create and deploy event-ingest worker
  if (finalResources.stream.id) {
    log('\n┌────────────────────────────────────────────────────────────┐', 'cyan');
    log('│            Event Ingest Worker Configuration               │', 'cyan');
    log('└────────────────────────────────────────────────────────────┘', 'cyan');

    log('\n  1. Creating local config...', 'cyan');
    createEventIngestLocalConfig(finalResources.stream.id);

    log('\n  2. Deploying Event Ingest worker...', 'cyan');
    const ingestConfigPath = join(__dirname, '..', 'workers', 'event-ingest', 'wrangler.local.jsonc');
    const ingestResult = runCommandWithOutput(`npx wrangler deploy --config "${ingestConfigPath}"`);
    if (!ingestResult.success) {
      log('    ⚠ Deploy failed - you can retry with: pnpm deploy:ingest', 'yellow');
    } else {
      deployedUrls.ingest = extractWorkerUrl(ingestResult.output) || undefined;
      log('    ✓ Event Ingest deployed', 'green');
      if (deployedUrls.ingest) {
        log(`    ✓ URL: ${deployedUrls.ingest}`, 'green');
      }
    }

    log('\n┌────────────────────────────────────────────────────────────┐', 'green');
    log('│            Event Ingest Configuration Complete!            │', 'green');
    log('└────────────────────────────────────────────────────────────┘', 'green');
  } else {
    log('\n  ⚠ Could not fetch Stream ID automatically.', 'yellow');
    log('  Run: npx wrangler pipelines streams list', 'yellow');
    log('  Then manually create workers/event-ingest/wrangler.local.jsonc', 'yellow');
  }

  if (!authInfo.accountId) {
    log('\n  ⚠ Could not detect Account ID automatically.', 'yellow');
    log('  Cannot proceed with remaining worker deployments. See README.md\n', 'yellow');
    return;
  }

  // DuckDB API configuration (required - deployed first as Query API depends on it)
  log('\n┌────────────────────────────────────────────────────────────┐', 'cyan');
  log('│              DuckDB API Configuration                      │', 'cyan');
  log('└────────────────────────────────────────────────────────────┘', 'cyan');

  log('\n  The DuckDB API provides full SQL support (JOINs, aggregations,');
  log('  window functions) by running DuckDB on Cloudflare Containers.');
  log('\n  Note: Cloudflare Containers is currently in public beta.', 'dim');

  log('\n  Configuring DuckDB API...', 'cyan');

  // Get the R2 Data Catalog URI from Cloudflare
  log('\n  1. Getting R2 Data Catalog endpoint...', 'cyan');
  const duckdbCatalogOutput = runQuiet(`npx wrangler r2 bucket catalog get ${config.bucketName}`);
  let catalogUri = '';

  let warehouseName = '';

  if (duckdbCatalogOutput) {
    // Try to extract the catalog URI from the output
    // Format: "Catalog URI:  https://catalog.cloudflarestorage.com/<account>/<bucket>"
    const uriMatch = duckdbCatalogOutput.match(/Catalog URI:\s+(https:\/\/[^\s]+)/);
    if (uriMatch) {
      catalogUri = uriMatch[1];
      log(`    ✓ Found catalog URI: ${catalogUri}`, 'green');
    }
    // Extract warehouse name (format: "Warehouse:    <account>_<bucket>")
    const warehouseMatch = duckdbCatalogOutput.match(/Warehouse:\s+(\S+)/);
    if (warehouseMatch) {
      warehouseName = warehouseMatch[1];
      log(`    ✓ Found warehouse name: ${warehouseName}`, 'green');
    }
  }

  if (!catalogUri || !warehouseName) {
    log('    ⚠ Could not detect catalog configuration automatically', 'yellow');
    log('    Set R2_ENDPOINT and R2_CATALOG manually in workers/duckdb-api/wrangler.local.jsonc', 'yellow');
  }

  // Create local config with all the values we have
  log('\n  2. Creating local config...', 'cyan');
  createDuckDbApiLocalConfig(warehouseName || config.bucketName, catalogUri);

  // Step 3: Download DuckDB extensions
  log('\n  3. Downloading DuckDB extensions...', 'cyan');
  const extensionsScriptPath = join(__dirname, 'download-extensions.sh');
  if (existsSync(extensionsScriptPath)) {
    if (!runCommand(`bash "${extensionsScriptPath}"`, 'Download extensions')) {
      log('    ⚠ Extension download failed - container may not work correctly', 'yellow');
    } else {
      log('    ✓ DuckDB extensions downloaded', 'green');
    }
  } else {
    log('    ⚠ Extension download script not found at: ' + extensionsScriptPath, 'yellow');
  }

  // Step 4: Deploy the worker
  log('\n  4. Deploying DuckDB API worker...', 'cyan');
  const duckdbConfigPath = join(__dirname, '..', 'workers', 'duckdb-api', 'wrangler.local.jsonc');
  const duckdbResult = runCommandWithOutput(`npx wrangler deploy --config "${duckdbConfigPath}" --containers-rollout=immediate`);
  if (!duckdbResult.success) {
    log('    ⚠ Deploy failed - you can retry with: pnpm deploy:duckdb', 'yellow');
  } else {
    deployedUrls.duckdb = extractWorkerUrl(duckdbResult.output) || undefined;
    log('    ✓ DuckDB API deployed', 'green');
    if (deployedUrls.duckdb) {
      log(`    ✓ URL: ${deployedUrls.duckdb}`, 'green');
    }

    // Step 5: Set secrets (only after successful deploy)
    log('\n  5. Setting secrets...', 'cyan');
    if (apiToken) {
      setSecret('R2_TOKEN', apiToken, duckdbConfigPath);
    } else {
      log('    ⚠ No API token available - set manually:', 'yellow');
      log('      npx wrangler secret put R2_TOKEN --config workers/duckdb-api/wrangler.local.jsonc', 'yellow');
    }
  }

  log('\n┌────────────────────────────────────────────────────────────┐', 'green');
  log('│             DuckDB API Configuration Complete!             │', 'green');
  log('└────────────────────────────────────────────────────────────┘', 'green');

  // Query API configuration (deployed after DuckDB since it may use DuckDB service binding)
  log('\n┌────────────────────────────────────────────────────────────┐', 'cyan');
  log('│              Query API Configuration                       │', 'cyan');
  log('└────────────────────────────────────────────────────────────┘', 'cyan');

  log('\n  The Query API provides a web UI and HTTP endpoints for querying data.');
  log('\n  Configuring Query API...', 'cyan');

  // Step 1: Create local config with bucket name (R2 SQL uses bucket name as warehouse)
  log('\n  1. Creating local config...', 'cyan');
  createQueryApiLocalConfig(config.bucketName);

  // Step 2: Deploy the worker
  log('\n  2. Deploying Query API worker...', 'cyan');
  const queryConfigPath = join(__dirname, '..', 'workers', 'query-api', 'wrangler.local.jsonc');
  const queryResult = runCommandWithOutput(`npx wrangler deploy --config "${queryConfigPath}"`);
  if (!queryResult.success) {
    log('    ⚠ Deploy failed - you can retry with: pnpm deploy:query', 'yellow');
  } else {
    deployedUrls.query = extractWorkerUrl(queryResult.output) || undefined;
    log('    ✓ Query API deployed', 'green');
    if (deployedUrls.query) {
      log(`    ✓ URL: ${deployedUrls.query}`, 'green');
    }

    // Step 3: Set secrets (only after successful deploy)
    log('\n  3. Setting secrets...', 'cyan');
    setSecret('CF_ACCOUNT_ID', authInfo.accountId!, queryConfigPath);
    if (apiToken) {
      setSecret('CF_API_TOKEN', apiToken, queryConfigPath);
    } else {
      log('    ⚠ No API token available - set manually:', 'yellow');
      log('      npx wrangler secret put CF_API_TOKEN --config workers/query-api/wrangler.local.jsonc', 'yellow');
    }
  }

  log('\n┌────────────────────────────────────────────────────────────┐', 'green');
  log('│              Query API Configuration Complete!             │', 'green');
  log('└────────────────────────────────────────────────────────────┘', 'green');

  // Final summary
  log('\n╔════════════════════════════════════════════════════════════╗', 'green');
  log('║           All Workers Deployed Successfully!               ║', 'green');
  log('╚════════════════════════════════════════════════════════════╝', 'green');

  log('\n  Deployed workers:');
  log(`    • Event Ingest: ${deployedUrls.ingest || '(deploy failed)'}`);
  log(`    • DuckDB API:   ${deployedUrls.duckdb || '(deploy failed)'}`);
  log(`    • Query API:    ${deployedUrls.query || '(deploy failed)'}`);

  if (deployedUrls.ingest) {
    log('\n  Test event ingestion:');
    log(`    curl -X POST ${deployedUrls.ingest}/v1/track \\`);
    log(`      -H "Content-Type: application/json" \\`);
    log(`      -d '{"userId":"test","event":"Test Event"}'`);
  }

  if (deployedUrls.duckdb) {
    log('\n  Query data (via DuckDB):');
    log(`    curl -X POST ${deployedUrls.duckdb}/query \\`);
    log('      -H "Content-Type: application/json" \\');
    log('      -d \'{"query": "SELECT * FROM r2_datalake.analytics.events LIMIT 5"}\'');
  }

  if (deployedUrls.query) {
    log('\n  Open Query UI:');
    log(`    ${deployedUrls.query}`);
  }

  log('\n  See README.md for full documentation.\n');
}

main().catch((error) => {
  log(`\nSetup failed: ${error.message}`, 'red');
  process.exit(1);
});
