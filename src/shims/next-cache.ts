/**
 * Tag-aware data cache shim implementing unstable_cache, revalidateTag, and revalidatePath
 * for Vite + Express + PostgreSQL server runtime.
 */

import { db } from '@/src/db/index';
import * as schema from '@/src/db/schema';
import { eq } from '@/src/db/pg-orm';

interface CacheEntry {
  value: any;
  expiresAt: number | null;
  tags: string[];
  version: number;
}

const dataCacheStore = new Map<string, CacheEntry>();
const tagIndex = new Map<string, Set<string>>();
const tagVersions = new Map<string, number>();

async function ensureTagVersionsLoaded(tags: string[]): Promise<void> {
  for (const tag of tags) {
    if (!tagVersions.has(tag)) {
      const res = await db.select().from(schema.cacheVersions).where(eq(schema.cacheVersions.tag, tag)).limit(1);
      tagVersions.set(tag, res[0]?.version || 1);
    }
  }
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
    await ensureTagVersionsLoaded(tags);
    let serializedArgs = '';
    try {
      serializedArgs = JSON.stringify(args);
    } catch {
      serializedArgs = String(args.length);
    }
    const cacheKey = `${baseKey}::${serializedArgs}`;
    const now = Date.now();
    const existing = dataCacheStore.get(cacheKey);

    // Verify tag versions
    let isStale = false;
    if (existing) {
      for (const tag of existing.tags) {
        if (tagVersions.get(tag) !== existing.version) {
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

    const entryVersion = tags.length > 0 ? Math.max(...tags.map(t => tagVersions.get(t) || 1)) : 1;
    
    dataCacheStore.set(cacheKey, {
      value: result,
      expiresAt,
      tags,
      version: entryVersion,
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
  // Update version in DB
  await db
    .insert(schema.cacheVersions)
    .values({ tag, version: 1 })
    .onConflictDoUpdate({
      target: schema.cacheVersions.tag,
      set: { version: sql`version + 1`, updatedAt: new Date() }
    });
  
  // Refresh local version
  const res = await db.select().from(schema.cacheVersions).where(eq(schema.cacheVersions.tag, tag)).limit(1);
  tagVersions.set(tag, res[0]?.version || 1);

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
