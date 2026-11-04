import {
  getCategoriesWithLiveCounts,
  getCachedLocations,
  getCachedSystemSettings,
} from '@/server/cache/reference-data.cache';
import type { InitialServerData } from '@/context/AppContext';

export async function getInitialServerDataForAppRouter(): Promise<InitialServerData | undefined> {
  try {
    const [categories, locations, settings] = await Promise.all([
      getCategoriesWithLiveCounts().catch(() => undefined),
      getCachedLocations().catch(() => undefined),
      getCachedSystemSettings().catch(() => undefined),
    ]);
    return {
      categories,
      locations,
      settings,
    };
  } catch {
    return undefined;
  }
}
