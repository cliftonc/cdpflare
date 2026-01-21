/**
 * Resource ID lookup from Cloudflare
 */

import type { Config, ResourceIds } from '../core/index.js';
import { runQuietAsync } from '../core/index.js';

/**
 * Create empty ResourceIds object
 */
export function createEmptyResourceIds(): ResourceIds {
  return {
    streamId: null,
    sinkId: null,
    pipelineId: null,
    containerIds: new Map(),
    kvCacheId: null,
    kvCachePreviewId: null,
    d1DatabaseId: null,
    existingWorkers: new Set(),
  };
}

/**
 * Check if a single worker exists
 */
async function checkWorkerExists(workerName: string): Promise<boolean> {
  const output = await runQuietAsync(`wrangler deployments list --name "${workerName}"`);
  // If we get output with "Created:" it means the worker has deployments
  return output !== null && output.includes('Created:');
}

/**
 * Look up which workers exist from wrangler
 * Checks each worker individually in parallel
 */
export async function lookupExistingWorkers(workerNames: string[]): Promise<Set<string>> {
  const existing = new Set<string>();

  // Check all workers in parallel
  const results = await Promise.all(
    workerNames.map(async (name) => ({
      name,
      exists: await checkWorkerExists(name),
    }))
  );

  for (const { name, exists } of results) {
    if (exists) {
      existing.add(name);
    }
  }

  return existing;
}

/**
 * Look up container IDs from wrangler
 */
export async function lookupContainerIds(containerNames: string[]): Promise<Map<string, string>> {
  const ids = new Map<string, string>();
  const output = await runQuietAsync('wrangler containers list');

  if (output) {
    try {
      const containers = JSON.parse(output) as Array<{ id: string; name: string }>;
      for (const container of containers) {
        if (containerNames.includes(container.name)) {
          ids.set(container.name, container.id);
        }
      }
    } catch {
      // Failed to parse JSON
    }
  }

  return ids;
}

/**
 * Look up stream ID from wrangler
 */
export async function lookupStreamId(streamName: string): Promise<string | null> {
  const output = await runQuietAsync('wrangler pipelines streams list');

  if (output) {
    const lines = output.split('\n');
    for (const line of lines) {
      if (line.includes(streamName)) {
        const idMatch = line.match(/([a-f0-9]{32})/i);
        if (idMatch) {
          return idMatch[1];
        }
        break;
      }
    }
  }

  return null;
}

/**
 * Look up sink ID from wrangler
 */
export async function lookupSinkId(sinkName: string): Promise<string | null> {
  const output = await runQuietAsync('wrangler pipelines sinks list');

  if (output) {
    const lines = output.split('\n');
    for (const line of lines) {
      if (line.includes(sinkName)) {
        const idMatch = line.match(/([a-f0-9]{32})/i);
        if (idMatch) {
          return idMatch[1];
        }
        break;
      }
    }
  }

  return null;
}

/**
 * Look up pipeline ID from wrangler
 */
export async function lookupPipelineId(pipelineName: string): Promise<string | null> {
  const output = await runQuietAsync('wrangler pipelines list');

  if (output) {
    const lines = output.split('\n');
    for (const line of lines) {
      if (line.includes(pipelineName)) {
        const idMatch = line.match(/([a-f0-9]{32})/i);
        if (idMatch) {
          return idMatch[1];
        }
        break;
      }
    }
  }

  return null;
}

/**
 * Look up KV namespace IDs from wrangler
 */
export async function lookupKvIds(
  kvCacheName: string
): Promise<{ id: string | null; previewId: string | null }> {
  const result = { id: null as string | null, previewId: null as string | null };
  const output = await runQuietAsync('wrangler kv namespace list');

  if (output) {
    try {
      const namespaces = JSON.parse(output) as Array<{ id: string; title: string }>;
      for (const ns of namespaces) {
        if (ns.title === kvCacheName) {
          result.id = ns.id;
        } else if (ns.title === `${kvCacheName}_preview`) {
          result.previewId = ns.id;
        }
      }
    } catch {
      // Failed to parse JSON
    }
  }

  return result;
}

/**
 * Look up D1 database ID from wrangler
 */
export async function lookupD1Id(d1DatabaseName: string): Promise<string | null> {
  const output = await runQuietAsync('wrangler d1 list');

  if (output) {
    const lines = output.split('\n');
    for (const line of lines) {
      if (line.includes(d1DatabaseName)) {
        // D1 database IDs are UUIDs
        const idMatch = line.match(/([a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12})/i);
        if (idMatch) {
          return idMatch[1];
        }
        break;
      }
    }
  }

  return null;
}

/**
 * Look up all resource IDs
 */
export async function lookupAllResourceIds(
  config: Config,
  containerNames: string[],
  workerNames: string[]
): Promise<ResourceIds> {
  const ids = createEmptyResourceIds();

  // Run all lookups in parallel for speed
  const [containerIds, existingWorkers, streamId, sinkId, pipelineId, kvIds, d1Id] = await Promise.all([
    lookupContainerIds(containerNames),
    lookupExistingWorkers(workerNames),
    lookupStreamId(config.streamName),
    lookupSinkId(config.sinkName),
    lookupPipelineId(config.pipelineName),
    lookupKvIds(config.kvCacheName),
    lookupD1Id(config.d1DatabaseName),
  ]);

  ids.containerIds = containerIds;
  ids.existingWorkers = existingWorkers;
  ids.streamId = streamId;
  ids.sinkId = sinkId;
  ids.pipelineId = pipelineId;
  ids.kvCacheId = kvIds.id;
  ids.kvCachePreviewId = kvIds.previewId;
  ids.d1DatabaseId = d1Id;

  return ids;
}
