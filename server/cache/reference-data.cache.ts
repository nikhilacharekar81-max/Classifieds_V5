import { cache } from 'react';
import { unstable_cache, revalidateTag, revalidatePath } from '@/src/shims/next-cache';
import { categoryRepository } from '@/server/repositories/category.repository';
import { locationRepository } from '@/server/repositories/location.repository';
import { adminRepository } from '@/server/repositories/admin.repository';
import { db, withDbRetry } from '@/src/db/index';
import { cacheInvalidationOutbox } from '@/src/db/schema';
import { eq, and, lte, inArray, sql } from '@/src/db/pg-orm';
import type { Category, LocationItem, SystemSettings } from '@/lib/types';

export type DbExecutor = Pick<typeof db, 'insert' | 'update' | 'select' | 'delete'>;

declare global {
  var _outboxRetryWorkerTimer: ReturnType<typeof setInterval> | undefined;
  var _outboxRetryWorkerRunning: boolean | undefined;
}

const PROCESSING_LEASE_MS = 60_000;
const OUTBOX_WORKER_INTERVAL_MS = 30_000;

export const REFERENCE_CACHE_TAGS = {
  CATEGORIES: 'marketplace-categories',
  SUBCATEGORIES: 'marketplace-subcategories',
  NAVIGATION: 'marketplace-navigation',
  LOCATIONS: 'marketplace-locations',
  SETTINGS: 'marketplace-settings',
  LISTING_COUNTS: 'marketplace-live-counts',
} as const;

/**
 * Tracks tags whose last invalidation attempt failed so subsequent reads
 * bypass potentially stale Data Cache entries and attempt self-healing.
 */
const failedInvalidationTags = new Set<string>();
let hasKnownPendingOutboxEntries = true;

function tryHealInvalidationTag(tag: string): void {
  if (!failedInvalidationTags.has(tag)) return;
  try {
    revalidateTag(tag);
    failedInvalidationTags.delete(tag);
    recordDurableInvalidation(tag, true).catch(() => {});
  } catch (err) {
    console.error(`[ReferenceCache] Deferred revalidation retry failed for tag "${tag}":`, err);
  }
}

export function isListingCacheBypassed(): boolean {
  if (!failedInvalidationTags.has(REFERENCE_CACHE_TAGS.LISTING_COUNTS)) {
    return false;
  }
  tryHealInvalidationTag(REFERENCE_CACHE_TAGS.LISTING_COUNTS);
  return failedInvalidationTags.has(REFERENCE_CACHE_TAGS.LISTING_COUNTS);
}

/**
 * Enqueues a durable 'pending' cache invalidation outbox entry in PostgreSQL.
 * When called with a transaction executor `tx`, uses the exact same transaction connection
 * and propagates errors so the mutation and outbox record commit or roll back atomically.
 * Increments generation `attempts` on conflict so any in-flight workers know a newer event occurred.
 */
export async function enqueueDurableInvalidation(
  tag: string = REFERENCE_CACHE_TAGS.LISTING_COUNTS,
  tx?: DbExecutor
): Promise<{ id: string; generation?: number }> {
  hasKnownPendingOutboxEntries = true;
  const now = new Date();
  const id = `outbox_${tag}`;
  const executor = tx ?? db;

  const performUpsert = () =>
    executor
      .insert(cacheInvalidationOutbox)
      .values({
        id,
        tag,
        status: 'pending',
        attempts: 1,
        lastError: null,
        nextRetryAt: now,
        completedAt: null,
      })
      .onConflictDoUpdate({
        target: cacheInvalidationOutbox.tag,
        set: {
          status: 'pending',
          attempts: sql`${cacheInvalidationOutbox.attempts} + 1`,
          lastError: null,
          nextRetryAt: now,
          completedAt: null,
        },
      })
      .returning({
        id: cacheInvalidationOutbox.id,
        generation: cacheInvalidationOutbox.attempts,
      });

  let res: { id: string; generation: number }[];
  if (tx) {
    res = await performUpsert();
  } else {
    res = await withDbRetry(performUpsert);
  }

  ensureOutboxRetryWorkerStarted();
  return { id, generation: res?.[0]?.generation };
}

/**
 * Records or completes a durable cache invalidation entry in PostgreSQL.
 * Generation-aware: never overwrites a newer pending invalidation or a leased worker claim.
 */
export async function recordDurableInvalidation(
  tag: string,
  success: boolean,
  errMessage?: string,
  tx?: DbExecutor,
  expectedGeneration?: number
): Promise<void> {
  try {
    const now = new Date();
    const id = `outbox_${tag}`;
    const executor = tx ?? db;

    const performRecord = async () => {
      if (success) {
        const updated = await executor
          .update(cacheInvalidationOutbox)
          .set({
            status: 'completed',
            lastError: null,
            completedAt: now,
          })
          .where(
            and(
              eq(cacheInvalidationOutbox.tag, tag),
              expectedGeneration !== undefined
                ? eq(cacheInvalidationOutbox.attempts, expectedGeneration)
                : eq(cacheInvalidationOutbox.status, 'pending')
            )
          )
          .returning({ id: cacheInvalidationOutbox.id });

        if (updated.length === 0 && expectedGeneration === undefined) {
          await executor
            .insert(cacheInvalidationOutbox)
            .values({
              id,
              tag,
              status: 'completed',
              attempts: 1,
              lastError: null,
              nextRetryAt: now,
              completedAt: now,
            })
            .onConflictDoNothing();
        }
      } else {
        await executor
          .insert(cacheInvalidationOutbox)
          .values({
            id,
            tag,
            status: 'pending',
            attempts: 1,
            lastError: errMessage || 'Failed to revalidate cache tag',
            nextRetryAt: new Date(Date.now() + 30000),
          })
          .onConflictDoUpdate({
            target: cacheInvalidationOutbox.tag,
            set: {
              status: 'pending',
              attempts: sql`${cacheInvalidationOutbox.attempts} + 1`,
              lastError: errMessage || 'Failed to revalidate cache tag',
              nextRetryAt: new Date(Date.now() + 30000),
            },
          });
      }
    };

    if (tx) {
      await performRecord();
    } else {
      await withDbRetry(performRecord);
    }

    if (!success) {
      hasKnownPendingOutboxEntries = true;
      ensureOutboxRetryWorkerStarted();
    }
  } catch (dbErr) {
    console.error(`[ReferenceCache] Failed to record durable outbox entry for tag "${tag}":`, dbErr);
    if (tx) {
      throw dbErr;
    }
  }
}

/**
 * Processes pending and stale-leased 'processing' cache invalidations in PostgreSQL outbox.
 * Safe against concurrent workers via atomic conditional claim with unique lease token.
 */
export async function processPendingInvalidations(): Promise<void> {
  if (globalThis._outboxRetryWorkerRunning || !hasKnownPendingOutboxEntries) return;
  globalThis._outboxRetryWorkerRunning = true;

  try {
    const now = new Date();
    const eligible = await withDbRetry(() =>
      db
        .select()
        .from(cacheInvalidationOutbox)
        .where(
          and(
            inArray(cacheInvalidationOutbox.status, ['pending', 'processing']),
            lte(cacheInvalidationOutbox.nextRetryAt, now)
          )
        )
        .limit(5)
    );

    if (eligible.length === 0) {
      hasKnownPendingOutboxEntries = false;
      return;
    }

    for (const entry of eligible) {
      const claimNow = new Date();
      const leaseUntil = new Date(claimNow.getTime() + PROCESSING_LEASE_MS);
      const wasStaleProcessing = entry.status === 'processing';
      const claimToken = `lease_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

      const lockResult = await withDbRetry(() =>
        db
          .update(cacheInvalidationOutbox)
          .set({
            status: 'processing',
            nextRetryAt: leaseUntil,
            lastError: claimToken,
            ...(wasStaleProcessing
              ? { attempts: sql`${cacheInvalidationOutbox.attempts} + 1` }
              : {}),
          })
          .where(
            and(
              eq(cacheInvalidationOutbox.id, entry.id),
              eq(cacheInvalidationOutbox.status, entry.status),
              eq(cacheInvalidationOutbox.attempts, entry.attempts),
              lte(cacheInvalidationOutbox.nextRetryAt, claimNow)
            )
          )
          .returning({
            id: cacheInvalidationOutbox.id,
            attempts: cacheInvalidationOutbox.attempts,
          })
      );

      if (lockResult.length === 0) continue;

      const currentAttempts = lockResult[0].attempts;

      try {
        revalidateTag(entry.tag);
        failedInvalidationTags.delete(entry.tag);

        await withDbRetry(() =>
          db
            .update(cacheInvalidationOutbox)
            .set({
              status: 'completed',
              lastError: null,
              completedAt: new Date(),
            })
            .where(
              and(
                eq(cacheInvalidationOutbox.id, entry.id),
                eq(cacheInvalidationOutbox.status, 'processing'),
                eq(cacheInvalidationOutbox.attempts, currentAttempts),
                eq(cacheInvalidationOutbox.lastError, claimToken)
              )
            )
        );
      } catch (err: any) {
        const nextAttempts = currentAttempts + 1;
        const backoffMs = Math.min(300000, Math.pow(2, Math.min(nextAttempts, 6)) * 5000);
        failedInvalidationTags.add(entry.tag);

        await withDbRetry(() =>
          db
            .update(cacheInvalidationOutbox)
            .set({
              status: 'pending',
              attempts: nextAttempts,
              lastError: String(err?.message || err),
              nextRetryAt: new Date(Date.now() + backoffMs),
            })
            .where(
              and(
                eq(cacheInvalidationOutbox.id, entry.id),
                eq(cacheInvalidationOutbox.status, 'processing'),
                eq(cacheInvalidationOutbox.lastError, claimToken)
              )
            )
        );
      }
    }
  } catch (err) {
    console.error('[ReferenceCache] Failed to process pending invalidation outbox:', err);
  } finally {
    globalThis._outboxRetryWorkerRunning = false;
  }
}

export const processPendingInvalidationOutbox = processPendingInvalidations;

/**
 * Starts a singleton periodic server-side outbox retry worker independent of cache reads.
 */
export function ensureOutboxRetryWorkerStarted(): void {
  if (typeof setInterval === 'undefined' || globalThis._outboxRetryWorkerTimer) {
    return;
  }
  const timer = setInterval(() => {
    processPendingInvalidations().catch(() => {});
  }, OUTBOX_WORKER_INTERVAL_MS);

  if (typeof timer.unref === 'function') {
    timer.unref();
  }
  globalThis._outboxRetryWorkerTimer = timer;
}

ensureOutboxRetryWorkerStarted();

const fetchCachedCategoryHierarchyInternal = unstable_cache(
  async (): Promise<Category[]> => {
    return categoryRepository.findAllHierarchy();
  },
  ['marketplace-reference-category-hierarchy-v1'],
  {
    tags: [
      REFERENCE_CACHE_TAGS.CATEGORIES,
      REFERENCE_CACHE_TAGS.SUBCATEGORIES,
      REFERENCE_CACHE_TAGS.NAVIGATION,
    ],
    revalidate: false,
  }
);

const fetchCachedLocationsInternal = unstable_cache(
  async (): Promise<LocationItem[]> => {
    return locationRepository.findAllDirect();
  },
  ['marketplace-reference-locations-v1'],
  {
    tags: [REFERENCE_CACHE_TAGS.LOCATIONS, REFERENCE_CACHE_TAGS.NAVIGATION],
    revalidate: false,
  }
);

const fetchCachedSystemSettingsInternal = unstable_cache(
  async (): Promise<SystemSettings> => {
    return adminRepository.getSystemSettingsDirect();
  },
  ['marketplace-reference-system-settings-v1'],
  {
    tags: [REFERENCE_CACHE_TAGS.SETTINGS],
    revalidate: false,
  }
);

type LiveListingCountsResult = {
  parentCountMap: Record<string, number>;
  subCountMap: Record<string, number>;
  rows?: Array<{ categoryId: string | null; subcategoryId: string | null; count: number }>;
};

function normalizeCityCacheKey(city?: string): string {
  if (!city) return '__ALL_INDIA__';
  const clean = city.replace(/[-_]/g, ' ').trim();
  if (!clean) return '__ALL_INDIA__';
  const lower = clean.toLowerCase();
  if (lower === 'all india' || lower === 'all') {
    return '__ALL_INDIA__';
  }
  return clean;
}

const fetchCachedLiveListingCountsInternal = unstable_cache(
  async (cityKey = '__ALL_INDIA__'): Promise<LiveListingCountsResult> => {
    const cityFilter = cityKey === '__ALL_INDIA__' ? undefined : cityKey;
    return categoryRepository.findLiveListingCounts(cityFilter);
  },
  ['marketplace-reference-live-listing-counts-v4'],
  {
    tags: [REFERENCE_CACHE_TAGS.LISTING_COUNTS],
    revalidate: 300,
  }
);

let lastOutboxCheckMs = 0;
const lastKnownGoodCountsByCity = new Map<string, LiveListingCountsResult>();
const lastKnownGoodCategoriesByCity = new Map<string, Category[]>();

export const getCachedCategoryHierarchy = cache(async (): Promise<Category[]> => {
  if (
    failedInvalidationTags.has(REFERENCE_CACHE_TAGS.CATEGORIES) ||
    failedInvalidationTags.has(REFERENCE_CACHE_TAGS.SUBCATEGORIES) ||
    failedInvalidationTags.has(REFERENCE_CACHE_TAGS.NAVIGATION)
  ) {
    tryHealInvalidationTag(REFERENCE_CACHE_TAGS.CATEGORIES);
    tryHealInvalidationTag(REFERENCE_CACHE_TAGS.SUBCATEGORIES);
    tryHealInvalidationTag(REFERENCE_CACHE_TAGS.NAVIGATION);
    return categoryRepository.findAllHierarchy();
  }
  return fetchCachedCategoryHierarchyInternal();
});

export const getCachedLiveListingCounts = cache(async (city?: string): Promise<LiveListingCountsResult> => {
  ensureOutboxRetryWorkerStarted();

  if (!globalThis._outboxRetryWorkerTimer) {
    const nowMs = Date.now();
    if (hasKnownPendingOutboxEntries && nowMs - lastOutboxCheckMs > 30_000) {
      lastOutboxCheckMs = nowMs;
      await processPendingInvalidations();
    }
  }

  const cityKey = normalizeCityCacheKey(city);
  const cityFilter = cityKey === '__ALL_INDIA__' ? undefined : cityKey;
  let result: LiveListingCountsResult;

  if (failedInvalidationTags.has(REFERENCE_CACHE_TAGS.LISTING_COUNTS)) {
    tryHealInvalidationTag(REFERENCE_CACHE_TAGS.LISTING_COUNTS);
    result = await categoryRepository.findLiveListingCounts(cityFilter);
  } else {
    result = await fetchCachedLiveListingCountsInternal(cityKey);
  }

  lastKnownGoodCountsByCity.set(cityKey, result);
  return result;
});

export const getCategoriesWithLiveCounts = cache(async (city?: string): Promise<Category[]> => {
  const cityKey = normalizeCityCacheKey(city);
  try {
    const [hierarchy, counts] = await Promise.all([
      getCachedCategoryHierarchy(),
      getCachedLiveListingCounts(city).catch((err) => {
        console.error('[ReferenceCache] getCachedLiveListingCounts fallback triggered:', err);
        return (
          lastKnownGoodCountsByCity.get(cityKey) || {
            parentCountMap: {},
            subCountMap: {},
            rows: [],
          }
        );
      }),
    ]);

    const groupedRows = Array.isArray(counts?.rows) ? counts.rows : null;

    if (groupedRows) {
      const childSubIdsByParent = new Map<string, Set<string>>();
      for (const cat of hierarchy) {
        if (cat.parentId) {
          let set = childSubIdsByParent.get(cat.parentId);
          if (!set) {
            set = new Set<string>();
            childSubIdsByParent.set(cat.parentId, set);
          }
          set.add(cat.id);
        }
      }

      const merged = hierarchy.map((cat) => {
        if (cat.parentId) {
          let subTotal = 0;
          for (const r of groupedRows) {
            if (r.subcategoryId === cat.id || r.categoryId === cat.id) {
              subTotal += Number(r.count) || 0;
            }
          }
          return {
            ...cat,
            listingCount: subTotal,
          };
        }

        const childSubIds = childSubIdsByParent.get(cat.id);
        let parentTotal = 0;
        for (const r of groupedRows) {
          if (
            r.categoryId === cat.id ||
            r.subcategoryId === cat.id ||
            (r.subcategoryId !== null && childSubIds !== undefined && childSubIds.has(r.subcategoryId))
          ) {
            parentTotal += Number(r.count) || 0;
          }
        }
        return {
          ...cat,
          listingCount: parentTotal,
        };
      });

      lastKnownGoodCategoriesByCity.set(cityKey, merged);
      return merged;
    }

    const parentCountMap = counts?.parentCountMap || {};
    const subCountMap = counts?.subCountMap || {};

    const childrenSumMap: Record<string, number> = {};
    for (const cat of hierarchy) {
      if (cat.parentId) {
        const subCount = subCountMap[cat.id] || 0;
        childrenSumMap[cat.parentId] = (childrenSumMap[cat.parentId] || 0) + subCount;
      }
    }

    const merged = hierarchy.map((cat) => {
      if (cat.parentId) {
        return {
          ...cat,
          listingCount: subCountMap[cat.id] || 0,
        };
      }
      const directCount = parentCountMap[cat.id] || 0;
      const childrenSum = childrenSumMap[cat.id] || 0;
      return {
        ...cat,
        listingCount: Math.max(directCount, childrenSum),
      };
    });

    lastKnownGoodCategoriesByCity.set(cityKey, merged);
    return merged;
  } catch (error) {
    console.error('[ReferenceCache] getCategoriesWithLiveCounts error:', error);
    const fallback = lastKnownGoodCategoriesByCity.get(cityKey);
    if (fallback) {
      return fallback;
    }
    return getCachedCategoryHierarchy();
  }
});

export async function getCachedCategories(city?: string): Promise<Category[]> {
  const all = await getCategoriesWithLiveCounts(city);
  return all.filter((c) => !c.parentId);
}

export async function getCachedSubcategories(city?: string): Promise<Category[]> {
  const all = await getCategoriesWithLiveCounts(city);
  return all.filter((c) => Boolean(c.parentId));
}

export async function getCachedNavigationHierarchy(city?: string): Promise<{
  categories: Category[];
  subcategoriesByParent: Record<string, Category[]>;
}> {
  const all = await getCategoriesWithLiveCounts(city);
  const categories = all.filter((c) => !c.parentId);
  const subcategoriesByParent: Record<string, Category[]> = {};
  for (const cat of all) {
    if (cat.parentId) {
      if (!subcategoriesByParent[cat.parentId]) {
        subcategoriesByParent[cat.parentId] = [];
      }
      subcategoriesByParent[cat.parentId].push(cat);
    }
  }
  return { categories, subcategoriesByParent };
}

export const getCachedLocations = cache(async (): Promise<LocationItem[]> => {
  if (
    failedInvalidationTags.has(REFERENCE_CACHE_TAGS.LOCATIONS) ||
    failedInvalidationTags.has(REFERENCE_CACHE_TAGS.NAVIGATION)
  ) {
    tryHealInvalidationTag(REFERENCE_CACHE_TAGS.LOCATIONS);
    tryHealInvalidationTag(REFERENCE_CACHE_TAGS.NAVIGATION);
    return locationRepository.findAllDirect();
  }
  return fetchCachedLocationsInternal();
});

export const getCachedSystemSettings = cache(async (): Promise<SystemSettings> => {
  if (failedInvalidationTags.has(REFERENCE_CACHE_TAGS.SETTINGS)) {
    tryHealInvalidationTag(REFERENCE_CACHE_TAGS.SETTINGS);
    return adminRepository.getSystemSettingsDirect();
  }
  return fetchCachedSystemSettingsInternal();
});

export async function invalidateCategoryReferenceCache(tx?: DbExecutor): Promise<void> {
  const tagsToInvalidate = [
    REFERENCE_CACHE_TAGS.CATEGORIES,
    REFERENCE_CACHE_TAGS.SUBCATEGORIES,
    REFERENCE_CACHE_TAGS.NAVIGATION,
  ];
  for (const tag of tagsToInvalidate) {
    let generation: number | undefined;
    try {
      const enqueueRes = await enqueueDurableInvalidation(tag, tx);
      generation = enqueueRes.generation;
    } catch (e) {
      console.error(`[ReferenceCache] Failed to enqueue durable outbox for tag "${tag}":`, e);
    }

    let success = false;
    let errStr: string | undefined;
    try {
      revalidateTag(tag);
      failedInvalidationTags.delete(tag);
      success = true;
    } catch (error: any) {
      console.error(`[ReferenceCache] Failed to revalidate tag "${tag}":`, error);
      failedInvalidationTags.add(tag);
      errStr = String(error?.message || error);
    }

    try {
      await recordDurableInvalidation(tag, success, errStr, tx, generation);
    } catch (outboxErr) {
      console.error(`[ReferenceCache] Error recording outbox completion for "${tag}":`, outboxErr);
    }
  }
  try {
    revalidatePath('/', 'layout');
  } catch (error) {
    console.error('[ReferenceCache] Failed to revalidate root layout path after category mutation:', error);
  }
}

export async function invalidateLocationReferenceCache(tx?: DbExecutor): Promise<void> {
  const tagsToInvalidate = [
    REFERENCE_CACHE_TAGS.LOCATIONS,
    REFERENCE_CACHE_TAGS.NAVIGATION,
  ];
  for (const tag of tagsToInvalidate) {
    let generation: number | undefined;
    try {
      const enqueueRes = await enqueueDurableInvalidation(tag, tx);
      generation = enqueueRes.generation;
    } catch (e) {
      console.error(`[ReferenceCache] Failed to enqueue durable outbox for tag "${tag}":`, e);
    }

    let success = false;
    let errStr: string | undefined;
    try {
      revalidateTag(tag);
      failedInvalidationTags.delete(tag);
      success = true;
    } catch (error: any) {
      console.error(`[ReferenceCache] Failed to revalidate tag "${tag}":`, error);
      failedInvalidationTags.add(tag);
      errStr = String(error?.message || error);
    }

    try {
      await recordDurableInvalidation(tag, success, errStr, tx, generation);
    } catch (outboxErr) {
      console.error(`[ReferenceCache] Error recording outbox completion for "${tag}":`, outboxErr);
    }
  }
  try {
    revalidatePath('/', 'layout');
  } catch (error) {
    console.error('[ReferenceCache] Failed to revalidate root layout path after location mutation:', error);
  }
}

export async function invalidateSettingsReferenceCache(tx?: DbExecutor): Promise<void> {
  let generation: number | undefined;
  try {
    const enqueueRes = await enqueueDurableInvalidation(REFERENCE_CACHE_TAGS.SETTINGS, tx);
    generation = enqueueRes.generation;
  } catch (e) {
    console.error(`[ReferenceCache] Failed to enqueue durable outbox for settings:`, e);
  }

  let success = false;
  let errStr: string | undefined;
  try {
    revalidateTag(REFERENCE_CACHE_TAGS.SETTINGS);
    failedInvalidationTags.delete(REFERENCE_CACHE_TAGS.SETTINGS);
    success = true;
  } catch (error: any) {
    console.error(`[ReferenceCache] Failed to revalidate tag "${REFERENCE_CACHE_TAGS.SETTINGS}":`, error);
    failedInvalidationTags.add(REFERENCE_CACHE_TAGS.SETTINGS);
    errStr = String(error?.message || error);
  }

  try {
    await recordDurableInvalidation(REFERENCE_CACHE_TAGS.SETTINGS, success, errStr, tx, generation);
  } catch (outboxErr) {
    console.error('[ReferenceCache] Error recording outbox for settings:', outboxErr);
  }
  try {
    revalidatePath('/', 'layout');
  } catch (error) {
    console.error('[ReferenceCache] Failed to revalidate root layout path after settings mutation:', error);
  }
}

export async function invalidateLiveListingCountsCache(): Promise<void> {
  let success = false;
  let errStr: string | undefined = undefined;
  try {
    revalidateTag(REFERENCE_CACHE_TAGS.LISTING_COUNTS);
    failedInvalidationTags.delete(REFERENCE_CACHE_TAGS.LISTING_COUNTS);
    success = true;
  } catch (error: any) {
    console.error(`[ReferenceCache] Failed to revalidate tag "${REFERENCE_CACHE_TAGS.LISTING_COUNTS}":`, error);
    failedInvalidationTags.add(REFERENCE_CACHE_TAGS.LISTING_COUNTS);
    errStr = String(error?.message || error);
  }
  try {
    revalidatePath('/', 'layout');
  } catch (error) {
    console.error('[ReferenceCache] Failed to revalidate root layout path after listing count mutation:', error);
  }
  try {
    await recordDurableInvalidation(REFERENCE_CACHE_TAGS.LISTING_COUNTS, success, errStr);
  } catch (outboxErr) {
    console.error('[ReferenceCache] Error recording outbox invalidation:', outboxErr);
  }
}
