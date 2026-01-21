/**
 * Deletion phase component
 * Handles resource deletion using StepFlow for visual grouping
 */

import React, { useEffect, useState, useCallback, useRef, useMemo } from 'react';
import { Box, Text } from 'ink';
import Spinner from 'ink-spinner';
import { StepFlow, FlowTaskDefinition, FlowGroupDefinition } from '../../shared/components/index.js';
import type { Config, AuthInfo, TeardownOptions, DeletedResources, ResourceIds } from '../core/types.js';
import { lookupAllResourceIds, createEmptyResourceIds } from '../steps/lookup.js';
import { getWorkerNamesList, getContainerNamesList, getLocalConfigPathsList } from '../steps/config.js';
import { deleteWorker } from '../steps/workers.js';
import { deleteContainer } from '../steps/containers.js';
import { deletePipeline, deleteSink, deleteStream } from '../steps/pipeline.js';
import { deleteKvNamespace, deleteD1Database, emptyBucket, deleteBucket } from '../steps/storage.js';
import { deleteLocalConfigs } from '../steps/local-files.js';

/**
 * Group definitions for visual flow
 */
const DELETION_GROUPS: FlowGroupDefinition[] = [
  { key: 'workers', title: 'Workers' },
  { key: 'containers', title: 'Containers' },
  { key: 'pipeline', title: 'Pipeline' },
  { key: 'storage', title: 'Storage' },
  { key: 'cleanup', title: 'Cleanup' },
];

interface DeletionContext {
  config: Config;
  authInfo: AuthInfo;
  apiToken: string;
  options: TeardownOptions;
  resourceIds: ResourceIds;
  updateDeleted: (updater: (prev: DeletedResources) => Partial<DeletedResources>) => void;
}

interface DeletionPhaseProps {
  projectName: string;
  config: Config;
  authInfo: AuthInfo;
  apiToken: string;
  options: TeardownOptions;
  onComplete: (deletedResources: DeletedResources) => void;
  onError: (error: Error) => void;
}

type Phase = 'lookup' | 'deleting' | 'done';

export function DeletionPhase({
  projectName,
  config,
  authInfo,
  apiToken,
  options,
  onComplete,
  onError,
}: DeletionPhaseProps): React.ReactElement {
  const [phase, setPhase] = useState<Phase>('lookup');
  const [resourceIds, setResourceIds] = useState<ResourceIds>(createEmptyResourceIds());
  const [deletionTasks, setDeletionTasks] = useState<FlowTaskDefinition<DeletionContext>[]>([]);
  const [foundCount, setFoundCount] = useState(0);

  // Use ref for deletedResources to avoid render loops - no state, just ref
  const deletedResourcesRef = useRef<DeletedResources>({
    workers: [],
    containers: [],
    pipeline: false,
    sink: false,
    stream: false,
    kvCache: false,
    kvCachePreview: false,
    d1Database: false,
    bucket: false,
    localConfigs: [],
  });

  // Track if completion has already been called
  const completionCalledRef = useRef(false);

  // Memoize name lists to prevent effect re-runs on every render
  const workerNames = useMemo(() => getWorkerNamesList(projectName), [projectName]);
  const containerNames = useMemo(() => getContainerNamesList(projectName), [projectName]);

  // Update function for tasks to call - modifies ref directly (no re-renders)
  const updateDeleted = useCallback((updater: (prev: DeletedResources) => Partial<DeletedResources>) => {
    deletedResourcesRef.current = {
      ...deletedResourcesRef.current,
      ...updater(deletedResourcesRef.current),
    };
  }, []);

  // Lookup resource IDs
  useEffect(() => {
    const lookup = async () => {
      try {
        const ids = await lookupAllResourceIds(config, containerNames, workerNames);
        setResourceIds(ids);

        // Count found resources
        let count = 0;
        if (ids.streamId) count++;
        if (ids.sinkId) count++;
        if (ids.pipelineId) count++;
        if (ids.kvCacheId) count++;
        if (ids.kvCachePreviewId) count++;
        if (ids.d1DatabaseId) count++;
        count += ids.containerIds.size;
        count += ids.existingWorkers.size;
        setFoundCount(count);

        // Build deletion task list
        const tasks = buildDeletionTasks(
          config,
          workerNames,
          containerNames,
          ids,
          options
        );
        setDeletionTasks(tasks);
        setPhase('deleting');
      } catch (err) {
        onError(err instanceof Error ? err : new Error(String(err)));
      }
    };

    lookup();
  }, [config, containerNames, workerNames, options, onError]);

  const handleDeletionComplete = useCallback(
    (error?: Error) => {
      // Prevent double-calling completion
      if (completionCalledRef.current) {
        return;
      }

      if (error && !options.keepBucket) {
        // Only fatal if we care about the error
        completionCalledRef.current = true;
        onError(error);
        return;
      }

      completionCalledRef.current = true;
      setPhase('done');
      // Use ref to get latest deleted resources
      onComplete(deletedResourcesRef.current);
    },
    [options.keepBucket, onComplete, onError]
  );

  // Memoize context to prevent unnecessary effect re-runs in StepFlow
  // Note: deletedResources is NOT included - tasks use updateDeleted callback instead
  const stableContext = useMemo<DeletionContext>(
    () => ({
      config,
      authInfo,
      apiToken,
      options,
      resourceIds,
      updateDeleted,
    }),
    [config, authInfo, apiToken, options, resourceIds, updateDeleted]
  );

  return (
    <Box flexDirection="column">
      {phase === 'lookup' && (
        <Box>
          <Text color="cyan">
            <Spinner type="dots" />
          </Text>
          <Text> Looking up resource IDs...</Text>
        </Box>
      )}

      {phase === 'deleting' && (
        <Box flexDirection="column">
          <Box marginBottom={1}>
            <Text color="gray">Found {foundCount} resource ID(s)</Text>
          </Box>
          <StepFlow<DeletionContext>
            groups={DELETION_GROUPS}
            tasks={deletionTasks}
            context={stableContext}
            onComplete={handleDeletionComplete}
            exitOnError={false}
            showCompletedGroups={true}
          />
        </Box>
      )}
    </Box>
  );
}

/**
 * Build deletion task list with groups
 */
function buildDeletionTasks(
  config: Config,
  workerNames: string[],
  containerNames: string[],
  _resourceIds: ResourceIds,
  options: TeardownOptions
): FlowTaskDefinition<DeletionContext>[] {
  const tasks: FlowTaskDefinition<DeletionContext>[] = [];

  // Worker deletion tasks (group: workers)
  for (const name of workerNames) {
    tasks.push({
      key: `worker-${name}`,
      title: `Delete ${name}`,
      group: 'workers',
      skip: (ctx: DeletionContext) => {
        if (!ctx.resourceIds.existingWorkers.has(name)) return 'Not found';
        return false;
      },
      task: async (ctx: DeletionContext) => {
        const result = await deleteWorker(name);
        if (result.success && !result.notFound) {
          ctx.updateDeleted(prev => ({ workers: [...prev.workers, name] }));
        }
      },
    });
  }

  // Container deletion tasks (group: containers)
  for (const name of containerNames) {
    tasks.push({
      key: `container-${name}`,
      title: `Delete ${name}`,
      group: 'containers',
      skip: (ctx: DeletionContext) => {
        const containerId = ctx.resourceIds.containerIds.get(name);
        if (!containerId) return 'Not found';
        return false;
      },
      task: async (ctx: DeletionContext) => {
        const containerId = ctx.resourceIds.containerIds.get(name);
        if (containerId) {
          const result = await deleteContainer(containerId);
          if (result.success && !result.notFound) {
            ctx.updateDeleted(prev => ({ containers: [...prev.containers, name] }));
          }
        }
      },
    });
  }

  // Pipeline deletion (group: pipeline)
  tasks.push({
    key: 'pipeline',
    title: `Delete ${config.pipelineName}`,
    group: 'pipeline',
    skip: (ctx: DeletionContext) => (!ctx.resourceIds.pipelineId ? 'Not found' : false),
    task: async (ctx: DeletionContext) => {
      if (ctx.resourceIds.pipelineId) {
        const result = await deletePipeline(ctx.resourceIds.pipelineId);
        if (result.success && !result.notFound) {
          ctx.updateDeleted(() => ({ pipeline: true }));
        }
      }
    },
  });

  // Sink deletion (group: pipeline)
  tasks.push({
    key: 'sink',
    title: `Delete ${config.sinkName}`,
    group: 'pipeline',
    skip: (ctx: DeletionContext) => (!ctx.resourceIds.sinkId ? 'Not found' : false),
    task: async (ctx: DeletionContext) => {
      if (ctx.resourceIds.sinkId) {
        const result = await deleteSink(ctx.resourceIds.sinkId);
        if (result.success && !result.notFound) {
          ctx.updateDeleted(() => ({ sink: true }));
        }
      }
    },
  });

  // Stream deletion (group: pipeline)
  tasks.push({
    key: 'stream',
    title: `Delete ${config.streamName}`,
    group: 'pipeline',
    skip: (ctx: DeletionContext) => (!ctx.resourceIds.streamId ? 'Not found' : false),
    task: async (ctx: DeletionContext) => {
      if (ctx.resourceIds.streamId) {
        const result = await deleteStream(ctx.resourceIds.streamId);
        if (result.success && !result.notFound) {
          ctx.updateDeleted(() => ({ stream: true }));
        }
      }
    },
  });

  // KV namespace deletion (group: storage)
  tasks.push({
    key: 'kv-cache',
    title: `Delete ${config.kvCacheName}`,
    group: 'storage',
    skip: (ctx: DeletionContext) => (!ctx.resourceIds.kvCacheId ? 'Not found' : false),
    task: async (ctx: DeletionContext) => {
      if (ctx.resourceIds.kvCacheId) {
        const result = await deleteKvNamespace(ctx.resourceIds.kvCacheId);
        if (result.success && !result.notFound) {
          ctx.updateDeleted(() => ({ kvCache: true }));
        }
      }
    },
  });

  // KV preview namespace deletion (group: storage)
  tasks.push({
    key: 'kv-cache-preview',
    title: 'Delete KV preview namespace',
    group: 'storage',
    skip: (ctx: DeletionContext) => (!ctx.resourceIds.kvCachePreviewId ? 'Not found' : false),
    task: async (ctx: DeletionContext) => {
      if (ctx.resourceIds.kvCachePreviewId) {
        const result = await deleteKvNamespace(ctx.resourceIds.kvCachePreviewId);
        if (result.success && !result.notFound) {
          ctx.updateDeleted(() => ({ kvCachePreview: true }));
        }
      }
    },
  });

  // D1 database deletion (group: storage)
  tasks.push({
    key: 'd1-database',
    title: `Delete ${config.d1DatabaseName}`,
    group: 'storage',
    skip: (ctx: DeletionContext) => (!ctx.resourceIds.d1DatabaseId ? 'Not found' : false),
    task: async (ctx: DeletionContext) => {
      if (ctx.resourceIds.d1DatabaseId) {
        const result = await deleteD1Database(config.d1DatabaseName);
        if (result.success && !result.notFound) {
          ctx.updateDeleted(() => ({ d1Database: true }));
        }
      }
    },
  });

  // Bucket deletion (group: storage)
  tasks.push({
    key: 'bucket',
    title: `Delete ${config.bucketName}`,
    group: 'storage',
    skip: () => (options.keepBucket ? 'Bucket preserved (--keep-bucket)' : false),
    task: async (ctx: DeletionContext) => {
      // Empty bucket first (required before deletion)
      if (ctx.apiToken && ctx.authInfo.accountId) {
        await emptyBucket(ctx.config.bucketName, ctx.apiToken, ctx.authInfo.accountId);
      }

      // Try to delete bucket, retry if still has content
      let attempts = 0;
      const maxAttempts = 3;

      while (attempts < maxAttempts) {
        const result = await deleteBucket(ctx.config.bucketName);

        if (result.success) {
          if (!result.notFound) {
            ctx.updateDeleted(() => ({ bucket: true }));
          }
          return;
        }

        // Check if error is due to bucket not being empty
        if (result.error?.includes('not empty') || result.error?.includes('BucketNotEmpty')) {
          attempts++;
          if (attempts < maxAttempts && ctx.apiToken && ctx.authInfo.accountId) {
            // Try emptying again
            await emptyBucket(ctx.config.bucketName, ctx.apiToken, ctx.authInfo.accountId);
          }
        } else {
          // Different error, don't retry
          throw new Error(result.error || 'Failed to delete bucket');
        }
      }

      throw new Error('Bucket still not empty after multiple attempts');
    },
  });

  // Local config deletion (group: cleanup)
  tasks.push({
    key: 'local-configs',
    title: 'Clean up local configs',
    group: 'cleanup',
    task: async (ctx: DeletionContext) => {
      const configPaths = getLocalConfigPathsList();
      const results = deleteLocalConfigs(configPaths);

      const deletedPaths: string[] = [];
      for (const [path, result] of results) {
        if (result.deleted) {
          deletedPaths.push(path);
        }
      }
      if (deletedPaths.length > 0) {
        ctx.updateDeleted(prev => ({ localConfigs: [...prev.localConfigs, ...deletedPaths] }));
      }
    },
  });

  return tasks;
}
