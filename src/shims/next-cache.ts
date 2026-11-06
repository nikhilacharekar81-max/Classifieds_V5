/**
 * Tag-aware data cache shim implementing unstable_cache, revalidateTag, and revalidatePath
 * for Vite + Express + PostgreSQL server runtime.
 */

import { AsyncLocalStorage } from 'node:async_hooks';
import { db } from '@/src/db/index';
import * as schema from '@/src/db/schema';
import { eq, inArray, sql } from '@/src/db/pg-orm';

const requestCacheStorage = new AsyncLocalStorage<Map<Function, Map<string, any>>>();

/**
 * Runs `fn` within an AsyncLocalStorage context for per-request memoisation.
 */
export function runWithRequestCache<T>(fn: () => T): T {
  if (requestCacheStorage.getStore()) {
    return fn();
  }
  return requestCacheStorage.run(new Map(), fn);
}

/**
 * Request-scoped memoisation backed by Node.js AsyncLocalStorage.
 * Deduplicates calls with identical arguments within the same request context.
 */
export function requestCache<T extends (...args: any[]) => any>(fn: T): T {
  const wrapped = (...args: any[]) => {
    const store = requestCacheStorage.getStore();
    if (!store) {
      return fn(...args);
    }
    let fnMap = store.get(fn);
    if (!fnMap) {
      fnMap = new Map<string, any>();
      store.set(fn, fnMap);
    }
    let key = '';
    try {
      key = JSON.stringify(args);
    } catch {
      key = args.map(String).join(':');
    }
    if (fnMap.has(key)) {
      return fnMap.get(key);
    }
    const result = fn(...args);
    if (result && typeof result.then === 'function') {
      const promise = result.catch((err: any) => {
        fnMap?.delete(key);
        throw err;
      });
      fnMap.set(key, promise);
      return promise;
    }
    fnMap.set(key, result);
    return result;
  };
  return wrapped as T;
}

interface CacheEntry {
  value: any;
  expiresAt: number | null;
  tags: string[];
  tagVersions: Record<string, number>;
}

import { LRUCache } from 'lru-cache';

const dataCacheStore = new LRUCache<string, CacheEntry>({
  max: 5000,
  ttl: 1000 * 60 * 60, // 1 hour default TTL
});

const tagIndex = new LRUCache<string, Set<string>>({
  max: 1000,
});

// Batching mechanism for tag version fetches in the same execution tick
let pendingTags = new Set<string>();
let batchPromise: Promise<Record<string, number>> | null = null;

async function getTagVersions(tags: string[]): Promise<Record<string, number>> {
  if (tags.length === 0) return {};

  for (const tag of tags) pendingTags.add(tag);

  if (!batchPromise) {
    batchPromise = (async () => {
      await new Promise(resolve => process.nextTick(resolve));
      const tagsToFetch = Array.from(pendingTags);
      pendingTags = new Set();
      batchPromise = null;

      const results: Record<string, number> = {};
      if (tagsToFetch.length === 0) return results;

      const dbVersions = await db
        .select({ tag: schema.cacheVersions.tag, version: schema.cacheVersions.version })
        .from(schema.cacheVersions)
        .where(inArray(schema.cacheVersions.tag, tagsToFetch));

      const foundTags = new Set<string>();
      for (const row of dbVersions) {
        results[row.tag] = row.version;
        foundTags.add(row.tag);
      }

      // Tags not in DB are treated as version 0. First revalidateTag will set to 1.
      for (const tag of tagsToFetch) {
        if (!foundTags.has(tag)) {
          results[tag] = 0;
        }
      }
      return results;
    })();
  }

  const allResults = await batchPromise;
  const requestedResults: Record<string, number> = {};
  for (const tag of tags) {
    requestedResults[tag] = allResults[tag] ?? 0;
  }
  return requestedResults;
}

export function unstable_cache<T extends (...args: any[]) => Promise<any>>(
  fn: T,
  keyParts?: string[],
  options?: { tags?: string[]; revalidate?: number | false }
): T {
  const baseKey = (keyParts && keyParts.length > 0 ? keyParts.join(':') : fn.name || 'anon_cache');
  const tags = options?.tags || [];
  const revalidateSeconds = options?.revalidate;

  const wrapped = async (...args: any[]) => {
    // 1. Fetch current tag versions from DB (shared source of truth)
    const currentTagVersions = await getTagVersions(tags);
    
    let serializedArgs = '';
    try {
      serializedArgs = JSON.stringify(args);
    } catch {
      serializedArgs = String(args.length);
    }
    const cacheKey = `${baseKey}::${serializedArgs}`;
    const now = Date.now();
    const existing = dataCacheStore.get(cacheKey);

    // 2. Verify every tag's version independently
    let isStale = false;
    if (existing) {
      for (const tag of existing.tags) {
        const currentVersion = currentTagVersions[tag] ?? 0;
        const recordedVersion = existing.tagVersions[tag] ?? 0;
        if (currentVersion !== recordedVersion) {
          isStale = true;
          break;
        }
      }
    }

    if (existing && !isStale && (existing.expiresAt === null || existing.expiresAt > now)) {
      return existing.value;
    }

    const result = await fn(...args);
    const expiresAt =
      typeof revalidateSeconds === 'number' && revalidateSeconds > 0
        ? now + revalidateSeconds * 1000
        : null;

    dataCacheStore.set(cacheKey, {
      value: result,
      expiresAt,
      tags,
      tagVersions: { ...currentTagVersions },
    });

    for (const tag of tags) {
      let keysForTag = tagIndex.get(tag);
      if (!keysForTag) {
        keysForTag = new Set<string>();
        tagIndex.set(tag, keysForTag);
      }
      keysForTag.add(cacheKey);
    }

    return result;
  };

  return wrapped as T;
}

export async function revalidateTag(tag: string): Promise<void> {
  // Update version in DB: start at 1 if missing (differs from initial 0), or increment
  await db
    .insert(schema.cacheVersions)
    .values({ tag, version: 1 })
    .onConflictDoUpdate({
      target: schema.cacheVersions.tag,
      set: { version: sql`cache_versions.version + 1`, updatedAt: new Date() }
    });
  
  // Clear local cache entries
  const keys = tagIndex.get(tag);
  if (keys) {
    for (const key of keys) {
      dataCacheStore.delete(key);
    }
    tagIndex.delete(tag);
  }
}

export function revalidatePath(_originalPath: string, _type?: 'layout' | 'page'): void {
  // Evict layout-level navigation/count caches on path revalidation if needed
}

export function getCacheStats(): { entries: number; tags: string[] } {
  return {
    entries: dataCacheStore.size,
    tags: Array.from(tagIndex.keys()),
  };
}
