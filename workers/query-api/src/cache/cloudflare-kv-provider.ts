/**
 * Cloudflare KV cache provider for Drizzle Cube
 * Implements the CacheProvider interface for edge caching on Cloudflare Workers
 */

import type { CacheProvider, CacheGetResult } from 'drizzle-cube/server'

/**
 * Internal structure for storing cache entries with metadata
 * KV doesn't track TTL natively, so we store metadata alongside the value
 */
interface KVCacheEntry<T> {
  value: T
  cachedAt: number  // Unix timestamp in ms when cached
  ttlMs: number     // Original TTL in milliseconds
}

/**
 * Options for CloudflareKVProvider
 */
export interface CloudflareKVProviderOptions {
  /**
   * Default TTL in milliseconds
   * @default 3600000 (60 minutes)
   */
  defaultTtlMs?: number
}

/**
 * Cloudflare KV cache provider implementing the CacheProvider interface
 *
 * Features:
 * - Globally distributed caching via Cloudflare's edge network
 * - TTL support with automatic expiration
 * - Full metadata support for TTL tracking
 * - Pattern-based deletion for cache invalidation
 *
 * Limitations:
 * - Eventually consistent (~60 seconds for global propagation)
 * - 1 write per key per second rate limit
 * - 25 MiB max value size
 * - Minimum TTL is 60 seconds (KV enforced)
 */
export class CloudflareKVProvider implements CacheProvider {
  private kv: KVNamespace
  private defaultTtlMs: number

  constructor(kv: KVNamespace, options: CloudflareKVProviderOptions = {}) {
    this.kv = kv
    this.defaultTtlMs = options.defaultTtlMs ?? 3600000 // 60 minutes
  }

  /**
   * Get a cached value by key
   * Returns null if not found or expired
   */
  async get<T>(key: string): Promise<CacheGetResult<T> | null> {
    const entry = await this.kv.get<KVCacheEntry<T>>(key, 'json')
    if (!entry) return null

    const now = Date.now()
    const ttlRemainingMs = entry.cachedAt + entry.ttlMs - now

    // KV handles expiration automatically, but check for edge cases
    // where our stored TTL differs from KV's (e.g., minimum 60s enforcement)
    if (ttlRemainingMs <= 0) return null

    return {
      value: entry.value,
      metadata: {
        cachedAt: entry.cachedAt,
        ttlMs: entry.ttlMs,
        ttlRemainingMs
      }
    }
  }

  /**
   * Set a value in the cache
   * TTL is converted from milliseconds to seconds (KV requirement)
   * Minimum TTL is 60 seconds (KV enforced)
   */
  async set<T>(key: string, value: T, ttlMs?: number): Promise<void> {
    const ttl = ttlMs ?? this.defaultTtlMs
    // KV requires TTL in seconds, minimum 60
    const ttlSeconds = Math.max(60, Math.ceil(ttl / 1000))

    const entry: KVCacheEntry<T> = {
      value,
      cachedAt: Date.now(),
      ttlMs: ttl
    }

    await this.kv.put(key, JSON.stringify(entry), {
      expirationTtl: ttlSeconds
    })
  }

  /**
   * Delete a specific key from the cache
   * Returns true if key existed and was deleted
   */
  async delete(key: string): Promise<boolean> {
    const exists = await this.has(key)
    await this.kv.delete(key)
    return exists
  }

  /**
   * Delete all keys matching a pattern
   * Supports glob-style patterns: 'prefix*', '*suffix', 'prefix*suffix'
   * Uses KV list() with prefix filtering + pattern matching
   *
   * Note: This may be slow for large numbers of matching keys
   * due to KV's list pagination and eventual consistency
   */
  async deletePattern(pattern: string): Promise<number> {
    // KV uses prefix-based listing, not glob patterns
    // Extract the prefix from the pattern for efficient listing
    let prefix = pattern
    if (pattern.endsWith('*')) {
      prefix = pattern.slice(0, -1)
    } else if (pattern.includes('*')) {
      // For middle wildcards like 'prefix*suffix', use the part before *
      prefix = pattern.split('*')[0]
    }

    let deleted = 0
    let cursor: string | undefined

    do {
      const result = await this.kv.list({ prefix, cursor })

      for (const key of result.keys) {
        // Verify the key matches the full pattern (not just prefix)
        if (this.matchesPattern(key.name, pattern)) {
          await this.kv.delete(key.name)
          deleted++
        }
      }

      cursor = result.list_complete ? undefined : result.cursor
    } while (cursor)

    return deleted
  }

  /**
   * Check if a key exists in the cache
   */
  async has(key: string): Promise<boolean> {
    const entry = await this.kv.get(key, 'json')
    return entry !== null
  }

  // KV doesn't require cleanup - no close() method needed

  /**
   * Match a key against a glob-style pattern
   * Supports: 'prefix*', '*suffix', 'prefix*suffix', exact match
   */
  private matchesPattern(key: string, pattern: string): boolean {
    if (pattern.endsWith('*') && !pattern.slice(0, -1).includes('*')) {
      // Simple prefix match: 'prefix*'
      return key.startsWith(pattern.slice(0, -1))
    } else if (pattern.startsWith('*') && !pattern.slice(1).includes('*')) {
      // Simple suffix match: '*suffix'
      return key.endsWith(pattern.slice(1))
    } else if (pattern.includes('*')) {
      // Middle wildcard: 'prefix*suffix'
      const [prefix, suffix] = pattern.split('*')
      return key.startsWith(prefix) && key.endsWith(suffix) && key.length >= prefix.length + suffix.length
    }
    // Exact match
    return key === pattern
  }
}
