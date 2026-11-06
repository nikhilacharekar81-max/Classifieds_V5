/**
 * Tag-aware data cache shim implementing unstable_cache, revalidateTag, and revalidatePath
 * for Vite + Express + PostgreSQL server runtime.
 */

import { db } from '@/src/db/index';
import * as schema from '@/src/db/schema';
import { eq, inArray, sql } from '@/src/db/pg-orm';

interface CacheEntry {
  value: any;
  expiresAt: number | null;
  tags: string[];
  tagVersions: Record<string, number>;
}

const dataCacheStore = new Map<string, CacheEntry>();
const tagIndex = new Map<string, Set<string>>();
const tagVersions = new Map<string, { version: number; loadedAt: number }>();

const VERSION_CACHE_TTL_MS = 2000; // Cache versions for 2 seconds to reduce DB load while staying responsive

async function getTagVersions(tags: string[]): Promise<Record<string, number>> {
  const now = Date.now();
  const results: Record<string, number> = {};
  const tagsToFetch: string[] = [];

  for (const tag of tags) {
    const cached = tagVersions.get(tag);
    if (cached && now - cached.loadedAt < VERSION_CACHE_TTL_MS) {
      results[tag] = cached.version;
    } else {
      tagsToFetch.push(tag);
    }
  }

  if (tagsToFetch.length > 0) {
    const dbVersions = await db
      .select()
      .from(schema.cacheVersions)
      .where(inArray(schema.cacheVersions.tag, tagsToFetch));

    const foundTags = new Set<string>();
    for (const row of dbVersions) {
      tagVersions.set(row.tag, { version: row.version, loadedAt: now });
      results[row.tag] = row.version;
      foundTags.add(row.tag);
    }

    // Tags not in DB are treated as version 0
    for (const tag of tagsToFetch) {
      if (!foundTags.has(tag)) {
        tagVersions.set(tag, { version: 0, loadedAt: now });
        results[tag] = 0;
      }
    }
  }

  return results;
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

    // Verify tag versions independently
    let isStale = false;
    if (existing) {
      for (const tag of existing.tags) {
        if ((currentTagVersions[tag] ?? 0) !== (existing.tagVersions[tag] ?? 0)) {
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
  // Update version in DB: start at 1 if missing, or increment
  await db
    .insert(schema.cacheVersions)
    .values({ tag, version: 1 })
    .onConflictDoUpdate({
      target: schema.cacheVersions.tag,
      set: { version: sql`cache_versions.version + 1`, updatedAt: new Date() }
    });
  
  // Force refresh of local version next time it is read
  tagVersions.delete(tag);

  // Clear local cache
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
