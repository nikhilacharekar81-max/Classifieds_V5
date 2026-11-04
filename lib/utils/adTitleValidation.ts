/**
 * Title normalization and duplicate detection utilities.
 * Ensures consistent comparison across frontend, backend API, and database layers.
 */

export const DUPLICATE_TITLE_ERROR_MESSAGE =
  'You have already posted an ad with this title. Please use a different title or edit your existing ad.';

/**
 * Normalizes an ad title:
 * 1. Trims leading and trailing whitespace
 * 2. Replaces multiple consecutive whitespace characters with a single space
 * 3. Converts to lowercase for case-insensitive matching
 *
 * Example: "   iPhone   15    Pro  " -> "iphone 15 pro"
 */
export function normalizeAdTitle(title: string | null | undefined): string {
  if (!title) return '';
  return title
    .trim()
    .replace(/\s+/g, ' ')
    .toLowerCase();
}

export interface DuplicateCheckOptions {
  title: string;
  sellerId: string;
  existingListings: Array<{
    id: string;
    sellerId: string;
    title: string;
    status?: string;
  }>;
  excludeListingId?: string;
}

export interface DuplicateCheckResult {
  isDuplicate: boolean;
  message?: string;
  conflictingListingId?: string;
  normalizedTitle: string;
}

/**
 * Checks whether an ad title is already used by the specified user.
 * - Compares normalized titles (case-insensitive, trimmed, normalized whitespace).
 * - Only checks ads belonging to the same sellerId.
 * - When editing, ignores the ad with ID matching excludeListingId.
 * - Ignores sold or deleted ads (active and pending ads are protected).
 */
export function checkDuplicateAdTitle({
  title,
  sellerId,
  existingListings,
  excludeListingId,
}: DuplicateCheckOptions): DuplicateCheckResult {
  const normalizedTitle = normalizeAdTitle(title);

  if (!normalizedTitle || !sellerId) {
    return { isDuplicate: false, normalizedTitle };
  }

  const conflictingListing = existingListings.find((listing) => {
    // Exclude the listing currently being edited
    if (excludeListingId && listing.id === excludeListingId) {
      return false;
    }

    // Only compare ads belonging to the exact same seller
    if (listing.sellerId !== sellerId) {
      return false;
    }

    // Ignore sold or deleted ads
    if (listing.status === 'sold') {
      return false;
    }

    // Compare normalized titles
    return normalizeAdTitle(listing.title) === normalizedTitle;
  });

  if (conflictingListing) {
    return {
      isDuplicate: true,
      message: DUPLICATE_TITLE_ERROR_MESSAGE,
      conflictingListingId: conflictingListing.id,
      normalizedTitle,
    };
  }

  return {
    isDuplicate: false,
    normalizedTitle,
  };
}
