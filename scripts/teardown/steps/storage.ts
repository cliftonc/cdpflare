/**
 * Storage resource deletion operations (KV, D1, R2)
 */

import { runCommandWithOutputAsync, runQuietAsync } from '../core/index.js';
import type { DeletionResult } from './workers.js';

/**
 * Check if an error indicates "not found" (already deleted)
 */
function isNotFoundError(output: string): boolean {
  const lowerOutput = output.toLowerCase();
  return (
    lowerOutput.includes('not found') ||
    lowerOutput.includes('does not exist') ||
    lowerOutput.includes('could not be found')
  );
}

/**
 * Delete a KV namespace by ID
 */
export async function deleteKvNamespace(namespaceId: string): Promise<DeletionResult> {
  const result = await runCommandWithOutputAsync(
    `wrangler kv namespace delete --namespace-id ${namespaceId}`
  );

  if (result.success) {
    return { success: true, notFound: false };
  }

  if (isNotFoundError(result.output)) {
    return { success: true, notFound: true };
  }

  return { success: false, notFound: false, error: result.output };
}

/**
 * Delete a D1 database by name
 */
export async function deleteD1Database(databaseName: string): Promise<DeletionResult> {
  const result = await runCommandWithOutputAsync(
    `wrangler d1 delete ${databaseName} --skip-confirmation`
  );

  if (result.success) {
    return { success: true, notFound: false };
  }

  if (isNotFoundError(result.output)) {
    return { success: true, notFound: true };
  }

  return { success: false, notFound: false, error: result.output };
}

/**
 * List all objects in an R2 bucket using Cloudflare API
 */
export async function listBucketObjects(
  bucketName: string,
  apiToken: string,
  accountId: string
): Promise<string[]> {
  const objects: string[] = [];
  let cursor: string | undefined;

  do {
    const url = `https://api.cloudflare.com/client/v4/accounts/${accountId}/r2/buckets/${bucketName}/objects${cursor ? `?cursor=${cursor}` : ''}`;

    try {
      const response = await fetch(url, {
        headers: {
          Authorization: `Bearer ${apiToken}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        break;
      }

      const data = (await response.json()) as {
        success: boolean;
        result: { objects: Array<{ key: string }>; cursor?: string; truncated?: boolean };
      };

      if (!data.success || !data.result) {
        break;
      }

      for (const obj of data.result.objects || []) {
        objects.push(obj.key);
      }

      cursor = data.result.truncated ? data.result.cursor : undefined;
    } catch {
      break;
    }
  } while (cursor);

  return objects;
}

/**
 * Progress callback for bucket emptying
 */
export type EmptyBucketProgressCallback = (deleted: number, total: number) => void;

/**
 * Delete objects in bulk using Cloudflare API (up to 1000 at a time)
 */
async function bulkDeleteObjects(
  bucketName: string,
  keys: string[],
  apiToken: string,
  accountId: string
): Promise<{ deleted: number; failed: number }> {
  // R2 bulk delete supports up to 1000 objects per request
  const batchSize = 1000;
  let deleted = 0;
  let failed = 0;

  for (let i = 0; i < keys.length; i += batchSize) {
    const batch = keys.slice(i, i + batchSize);
    const url = `https://api.cloudflare.com/client/v4/accounts/${accountId}/r2/buckets/${bucketName}/objects`;

    try {
      const response = await fetch(url, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${apiToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ keys: batch }),
      });

      if (response.ok) {
        deleted += batch.length;
      } else {
        // Fallback to individual deletion if bulk fails
        for (const key of batch) {
          const output = await runQuietAsync(`wrangler r2 object delete "${bucketName}/${key}"`);
          if (output !== null) {
            deleted++;
          } else {
            failed++;
          }
        }
      }
    } catch {
      // Fallback to individual deletion
      for (const key of batch) {
        const output = await runQuietAsync(`wrangler r2 object delete "${bucketName}/${key}"`);
        if (output !== null) {
          deleted++;
        } else {
          failed++;
        }
      }
    }
  }

  return { deleted, failed };
}

/**
 * Empty an R2 bucket by deleting all objects
 */
export async function emptyBucket(
  bucketName: string,
  apiToken: string,
  accountId: string,
  onProgress?: EmptyBucketProgressCallback
): Promise<{ success: boolean; deletedCount: number; failedCount: number }> {
  const objects = await listBucketObjects(bucketName, apiToken, accountId);

  if (objects.length === 0) {
    return { success: true, deletedCount: 0, failedCount: 0 };
  }

  // Use bulk delete for efficiency
  const { deleted, failed } = await bulkDeleteObjects(bucketName, objects, apiToken, accountId);

  if (onProgress) {
    onProgress(deleted, objects.length);
  }

  // If bulk delete didn't work well, objects might still exist - try listing again
  if (failed > 0) {
    const remaining = await listBucketObjects(bucketName, apiToken, accountId);
    if (remaining.length > 0) {
      // Try individual deletion for remaining objects
      for (const key of remaining) {
        await runQuietAsync(`wrangler r2 object delete "${bucketName}/${key}"`);
      }
    }
  }

  return {
    success: failed < objects.length / 2,
    deletedCount: deleted,
    failedCount: failed,
  };
}

/**
 * Delete an R2 bucket
 */
export async function deleteBucket(bucketName: string): Promise<DeletionResult> {
  const result = await runCommandWithOutputAsync(
    `wrangler r2 bucket delete ${bucketName}`
  );

  if (result.success) {
    return { success: true, notFound: false };
  }

  if (isNotFoundError(result.output)) {
    return { success: true, notFound: true };
  }

  return { success: false, notFound: false, error: result.output };
}
