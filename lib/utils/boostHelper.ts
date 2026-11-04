import { Listing } from '../types';

/**
 * Checks if a listing currently has an active boost.
 *
 * Enforces the critical rule:
 * An ad is considered boosted ONLY when boostStatus === 'active' AND boostExpiresAt > current_time.
 * Once boostExpiresAt has passed, the ad is immediately treated as a normal listing,
 * without depending solely on background cleanup jobs.
 */
export function isListingBoosted(
  listing: Partial<Listing> | null | undefined,
  nowMs: number = Date.now()
): boolean {
  if (!listing) return false;
  if (!listing.isBoosted) return false;
  if (listing.boostStatus !== 'active') return false;
  if (!listing.boostExpiresAt) return false;

  const expiryTime = new Date(listing.boostExpiresAt).getTime();
  if (isNaN(expiryTime)) return false;

  return expiryTime > nowMs;
}

/**
 * Computes remaining boost time in a human-friendly format.
 */
export function formatRemainingBoostTime(
  expiresAt?: string,
  nowMs: number = Date.now()
): {
  isExpired: boolean;
  days: number;
  hours: number;
  minutes: number;
  totalHoursRemaining: number;
  label: string;
} {
  if (!expiresAt) {
    return {
      isExpired: true,
      days: 0,
      hours: 0,
      minutes: 0,
      totalHoursRemaining: 0,
      label: 'Expired',
    };
  }

  const expiryMs = new Date(expiresAt).getTime();
  const diffMs = expiryMs - nowMs;

  if (diffMs <= 0 || isNaN(diffMs)) {
    return {
      isExpired: true,
      days: 0,
      hours: 0,
      minutes: 0,
      totalHoursRemaining: 0,
      label: 'Boost Expired',
    };
  }

  const totalMinutes = Math.floor(diffMs / 60000);
  const totalHours = Math.floor(totalMinutes / 60);
  const days = Math.floor(totalHours / 24);
  const hours = totalHours % 24;
  const minutes = totalMinutes % 60;

  let label = '';
  if (days > 0) {
    label = `${days}d ${hours}h left`;
  } else if (hours > 0) {
    label = `${hours}h ${minutes}m left`;
  } else {
    label = `${minutes}m left`;
  }

  return {
    isExpired: false,
    days,
    hours,
    minutes,
    totalHoursRemaining: totalHours,
    label,
  };
}

/**
 * Convenient string formatter returning human-readable time remaining string (e.g. "2d 5h left")
 */
export function formatBoostTimeRemaining(
  expiresAt?: string,
  nowMs: number = Date.now()
): string {
  return formatRemainingBoostTime(expiresAt, nowMs).label;
}

/**
 * Formats date and time in Indian Standard Time (IST) / standard format:
 * e.g., "28 Sep 2026, 6:30 PM"
 */
export function formatBoostDateTime(isoString?: string): string {
  if (!isoString) return 'N/A';
  try {
    const d = new Date(isoString);
    if (isNaN(d.getTime())) return isoString;

    return d.toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
  } catch {
    return isoString;
  }
}

/**
 * Haversine distance calculator for local proximity sorting.
 */
function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; // Earth radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c);
}

/**
 * Ranking Logic Comparator:
 *
 *   Active Boosted Ads (highest priority placement)
 *        ↓
 *   Featured Ads
 *        ↓
 *   Normal Ads
 *        ↓
 *   Existing sorting/ranking rules (Distance or Chronological)
 *
 * Within the boosted group, preserves existing sorting rules.
 * Does not permanently change the ad's creation date.
 */
export function compareListingsWithBoost(
  a: Listing,
  b: Listing,
  userLocation?: { latitude?: number; longitude?: number } | null,
  nowMs: number = Date.now()
): number {
  const aBoosted = isListingBoosted(a, nowMs);
  const bBoosted = isListingBoosted(b, nowMs);

  // 1. Active boosted ads receive highest placement
  if (aBoosted && !bBoosted) return -1;
  if (!aBoosted && bBoosted) return 1;

  // 2. Featured ads priority
  if (a.isFeatured && !b.isFeatured) return -1;
  if (!a.isFeatured && b.isFeatured) return 1;

  // 3. Location distance if user coordinates are provided
  if (userLocation && userLocation.latitude && userLocation.longitude) {
    const distA =
      a.location.latitude && a.location.longitude
        ? calculateDistance(
            userLocation.latitude,
            userLocation.longitude,
            a.location.latitude,
            a.location.longitude
          )
        : 99999;
    const distB =
      b.location.latitude && b.location.longitude
        ? calculateDistance(
            userLocation.latitude,
            userLocation.longitude,
            b.location.latitude,
            b.location.longitude
          )
        : 99999;

    if (distA !== distB) {
      return distA - distB;
    }
  }

  // 4. Chronological sorting (newest first)
  const timeA = new Date(a.createdAt).getTime();
  const timeB = new Date(b.createdAt).getTime();
  return (isNaN(timeB) ? 0 : timeB) - (isNaN(timeA) ? 0 : timeA);
}
