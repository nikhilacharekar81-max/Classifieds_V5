/**
 * Tag-aware data cache shim implementing unstable_cache, revalidateTag, and revalidatePath
 * for Vite + Express + PostgreSQL server runtime.
 */

interface CacheEntry {
  value: any;
  expiresAt: number | null;
  tags: string[];
}

const dataCacheStore = new Map<string, CacheEntry>();
const tagIndex = new Map<string, Set<string>>();

export function unstable_cache<T extends (...args: any[]) => Promise<any>>(
  fn: T,
  keyParts?: string[],
  options?: { tags?: string[]; revalidate?: number | false }
): T {
  const baseKey = (keyParts && keyParts.length > 0 ? keyParts.join(':') : fn.name || 'anon_cache');
  const tags = options?.tags || [];
  const revalidateSeconds = options?.revalidate;

  const wrapped = async (...args: any[]) => {
    let serializedArgs = '';
    try {
      serializedArgs = JSON.stringify(args);
    } catch {
      serializedArgs = String(args.length);
    }
    const cacheKey = `${baseKey}::${serializedArgs}`;
    const now = Date.now();
    const existing = dataCacheStore.get(cacheKey);

    if (existing && (existing.expiresAt === null || existing.expiresAt > now)) {
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

export function revalidateTag(tag: string): void {
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
