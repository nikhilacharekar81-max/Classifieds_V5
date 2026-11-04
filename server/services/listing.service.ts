import { cache } from 'react';
import { unstable_cache } from '@/src/shims/next-cache';
import {
  listingRepository,
  ListingFilterQuery,
  doesListingUpdateAffectCounts,
  toPublicListingCard,
  toPublicListingDetail,
} from '@/server/repositories/listing.repository';
import { adminRepository } from '@/server/repositories/admin.repository';
import {
  invalidateLiveListingCountsCache,
  REFERENCE_CACHE_TAGS,
  isListingCacheBypassed,
} from '@/server/cache/reference-data.cache';
import { Listing } from '@/lib/types';
import { normalizeAdTitle, DUPLICATE_TITLE_ERROR_MESSAGE } from '@/lib/utils/adTitleValidation';

export interface ListingFilterOptions extends ListingFilterQuery {
  userCoords?: { latitude: number; longitude: number } | null;
}

const fetchCachedLatestListingsInternal = unstable_cache(
  async (cityKey: string, limit: number): Promise<Listing[]> => {
    const res = await listingRepository.findMarketplaceListings({
      status: 'approved',
      city: cityKey === '__ALL_INDIA__' ? undefined : cityKey,
      limit,
      offset: 0,
      skipCount: true,
    });
    return res.items.map(toPublicListingCard);
  },
  ['marketplace-cached-latest-listings-v1'],
  {
    tags: [REFERENCE_CACHE_TAGS.LISTING_COUNTS],
    revalidate: 300,
  }
);

const fetchCachedListingByIdInternal = unstable_cache(
  async (cleanId: string): Promise<Listing | null> => {
    const item = await listingRepository.findById(cleanId);
    return item ? toPublicListingDetail(item) : null;
  },
  ['marketplace-cached-listing-detail-v1'],
  {
    tags: [REFERENCE_CACHE_TAGS.LISTING_COUNTS],
    revalidate: 300,
  }
);

const fetchCachedRelatedListingsInternal = unstable_cache(
  async (categoryId: string, limit: number): Promise<Listing[]> => {
    const res = await listingRepository.findMarketplaceListings({
      status: 'approved',
      category: categoryId,
      limit,
      offset: 0,
      skipCount: true,
    });
    return res.items.map(toPublicListingCard);
  },
  ['marketplace-cached-related-listings-v1'],
  {
    tags: [REFERENCE_CACHE_TAGS.LISTING_COUNTS],
    revalidate: 300,
  }
);

const fetchCachedPaginatedCatalogInternal = unstable_cache(
  async (
    serializedFilter: string,
    requestedPage: number,
    pageSize: number
  ): Promise<{
    items: Listing[];
    total: number;
    page: number;
    totalPages: number;
    pageSize: number;
  }> => {
    const filterOptions: ListingFilterQuery = JSON.parse(serializedFilter);
    let result = await listingRepository.findMarketplaceListings(filterOptions);
    const totalPages = Math.max(1, Math.ceil(result.total / pageSize));
    let validPage = requestedPage;

    if (requestedPage > totalPages && result.total > 0) {
      validPage = totalPages;
      result = await listingRepository.findMarketplaceListings({
        ...filterOptions,
        offset: (validPage - 1) * pageSize,
      });
    } else if (result.total === 0) {
      validPage = 1;
    }

    return {
      items: result.items.map(toPublicListingCard),
      total: result.total,
      page: validPage,
      totalPages,
      pageSize,
    };
  },
  ['marketplace-cached-paginated-catalog-v1'],
  {
    tags: [REFERENCE_CACHE_TAGS.LISTING_COUNTS],
    revalidate: 300,
  }
);

export class ListingService {
  /**
   * Retrieves listings from PostgreSQL with full marketplace priority sorting:
   * Boosted Ads First -> Featured Ads -> Distance / Chronological
   */
  public async getMarketplaceListings(options: ListingFilterOptions = {}): Promise<{
    items: Listing[];
    total: number;
  }> {
    return await listingRepository.findMarketplaceListings(options);
  }

  /**
   * Authoritative 50-listing server-side pagination helper for category, subcategory, and search pages.
   * Validates requested page number, applies filters and sort to both COUNT and SELECT queries in PostgreSQL,
   * and safely handles negative, non-numeric, or out-of-range page numbers.
   */
  public async getPaginatedPageListings(params: {
    city?: string;
    category?: string;
    subcategory?: string;
    query?: Record<string, string | undefined>;
    pageSize?: number;
  }): Promise<{
    items: Listing[];
    total: number;
    page: number;
    totalPages: number;
    pageSize: number;
  }> {
    const pageSize = params.pageSize || 50;
    const q = params.query || {};

    const rawPage = q.page !== undefined ? parseInt(String(q.page), 10) : 1;
    const requestedPage = !isNaN(rawPage) && isFinite(rawPage) && rawPage >= 1 ? rawPage : 1;

    const parsePositiveNumber = (val?: string): number | undefined => {
      if (val === undefined || val === '') return undefined;
      const n = Number(val);
      return !isNaN(n) && isFinite(n) && n >= 0 ? n : undefined;
    };

    const filterOptions: ListingFilterQuery = {
      status: 'approved',
      city: params.city || q.city || undefined,
      category: params.category || q.category || undefined,
      subcategory: params.subcategory || q.subcategory || undefined,
      search: q.q || q.search || undefined,
      minPrice: parsePositiveNumber(q.minPrice),
      maxPrice: parsePositiveNumber(q.maxPrice),
      propertyType: q.propertyType || undefined,
      configuration: q.configuration || undefined,
      propertyStatus: q.propertyStatus || undefined,
      listedBy: q.listedBy || undefined,
      furnishing: q.furnishing || undefined,
      minArea: parsePositiveNumber(q.minArea),
      maxArea: parsePositiveNumber(q.maxArea),
      maxDeposit: parsePositiveNumber(q.maxDeposit),
      brokerage: q.brokerage || undefined,
      tenantPreference: q.tenantPreference || undefined,
      availableFrom: q.availableFrom || undefined,
      petsAllowed: q.petsAllowed || undefined,
      sort: q.sort || undefined,
      limit: pageSize,
      offset: (requestedPage - 1) * pageSize,
    };

    const serializedFilter = JSON.stringify(filterOptions);

    if (isListingCacheBypassed()) {
      let result = await listingRepository.findMarketplaceListings(filterOptions);
      const totalPages = Math.max(1, Math.ceil(result.total / pageSize));
      let validPage = requestedPage;

      if (requestedPage > totalPages && result.total > 0) {
        validPage = totalPages;
        result = await listingRepository.findMarketplaceListings({
          ...filterOptions,
          offset: (validPage - 1) * pageSize,
        });
      } else if (result.total === 0) {
        validPage = 1;
      }

      return {
        items: result.items.map(toPublicListingCard),
        total: result.total,
        page: validPage,
        totalPages,
        pageSize,
      };
    }

    return await fetchCachedPaginatedCatalogInternal(serializedFilter, requestedPage, pageSize);
  }

  public async getCachedLatestListings(city?: string, limit: number = 10): Promise<Listing[]> {
    const cityKey =
      city && city !== 'All India' && city !== 'all-india' && city !== 'all'
        ? city.trim()
        : '__ALL_INDIA__';

    if (isListingCacheBypassed()) {
      const res = await listingRepository.findMarketplaceListings({
        status: 'approved',
        city: cityKey === '__ALL_INDIA__' ? undefined : cityKey,
        limit,
        offset: 0,
        skipCount: true,
      });
      return res.items.map(toPublicListingCard);
    }

    return await fetchCachedLatestListingsInternal(cityKey, limit);
  }

  public async getCachedRelatedListings(
    categoryId: string,
    excludeId?: string,
    limit: number = 5
  ): Promise<Listing[]> {
    const items = isListingCacheBypassed()
      ? (
          await listingRepository.findMarketplaceListings({
            status: 'approved',
            category: categoryId,
            limit: limit + 1,
            offset: 0,
            skipCount: true,
          })
        ).items.map(toPublicListingCard)
      : await fetchCachedRelatedListingsInternal(categoryId, limit + 1);

    return excludeId ? items.filter((l) => l.id !== excludeId).slice(0, limit) : items.slice(0, limit);
  }

  public async getListingById(id: string): Promise<Listing | null> {
    if (!id) return null;
    const cleanId = id.trim();
    if (isListingCacheBypassed()) {
      const item = await listingRepository.findById(cleanId);
      return item ? toPublicListingDetail(item) : null;
    }
    return await fetchCachedListingByIdInternal(cleanId);
  }

  public async checkDuplicateTitle(sellerId: string, title: string, excludeListingId?: string) {
    return await listingRepository.checkDuplicateActiveTitle(sellerId, title, excludeListingId);
  }

  public async createListing(
    data: Omit<Listing, 'id' | 'createdAt' | 'views' | 'likes' | 'chatsCount'>,
    authenticatedUserId?: string,
    actorMeta?: { name?: string; ipAddress?: string; isAdminAction?: boolean }
  ): Promise<{ success: boolean; listing?: Listing; error?: string; status: number }> {
    const norm = normalizeAdTitle(data.title);
    if (!norm) {
      return { success: false, error: 'Title cannot be empty', status: 400 };
    }

    const sellerId = authenticatedUserId || data.sellerId;
    if (!sellerId) {
      return { success: false, error: 'Seller authentication required', status: 401 };
    }

    // Validate price
    const priceNum = Number(data.price);
    if (isNaN(priceNum) || !isFinite(priceNum) || priceNum < 0) {
      return { success: false, error: 'Price must be a non-negative number', status: 400 };
    }

    // Validate location coordinates if supplied
    if (data.location?.latitude !== undefined && data.location?.latitude !== null) {
      const lat = Number(data.location.latitude);
      if (isNaN(lat) || lat < -90 || lat > 90) {
        return { success: false, error: 'Invalid latitude coordinate (-90 to 90)', status: 400 };
      }
    }
    if (data.location?.longitude !== undefined && data.location?.longitude !== null) {
      const lng = Number(data.location.longitude);
      if (isNaN(lng) || lng < -180 || lng > 180) {
        return { success: false, error: 'Invalid longitude coordinate (-180 to 180)', status: 400 };
      }
    }

    // Enforce PostgreSQL partial unique index check
    const dupCheck = await listingRepository.checkDuplicateActiveTitle(sellerId, data.title);
    if (dupCheck.isDuplicate) {
      return {
        success: false,
        error: DUPLICATE_TITLE_ERROR_MESSAGE,
        status: 409,
      };
    }

    // Collision-resistant ID
    const id = `lst_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    const expiresAt = new Date(Date.now() + 30 * 24 * 3600 * 1000);

    try {
      const created = await listingRepository.create({
        id,
        sellerId,
        sellerName: actorMeta?.name || data.sellerName || 'Authenticated User',
        sellerPhone: data.sellerPhone || '',
        categoryId: data.categoryId,
        subcategoryId: data.subcategoryId,
        title: data.title,
        description: data.description,
        price: priceNum,
        state: data.location?.state || 'Maharashtra',
        city: data.location?.city || 'Mumbai',
        locality: data.location?.locality || 'Locality',
        latitude: data.location?.latitude,
        longitude: data.location?.longitude,
        images: data.images || [],
        customAttributes: data.customAttributes || {},
        status: data.status || 'pending',
        expiresAt,
      });

      // 1. Immediately trigger listing count invalidation right after successful database insert
      try {
        await invalidateLiveListingCountsCache();
      } catch (invalidationErr) {
        console.error('[ListingService] Cache invalidation warning in createListing:', invalidationErr);
      }

      // 2. Record audit log without allowing audit failure to disrupt creation response
      if (sellerId) {
        try {
          await adminRepository.createAuditLog({
            adminId: sellerId,
            adminName: actorMeta?.name || data.sellerName || 'Authenticated User',
            action: actorMeta?.isAdminAction ? 'ADMIN_LISTING_CREATED' : 'USER_LISTING_CREATED',
            module: 'Marketplace',
            targetId: id,
            targetSummary: created.title,
            details: `Created listing in ${created.location.city}`,
            ipAddress: actorMeta?.ipAddress || 'unknown',
          });
        } catch (auditErr) {
          console.error('[ListingService] Audit log warning in createListing:', auditErr);
        }
      }

      return { success: true, listing: created, status: 201 };
    } catch (err: any) {
      console.error('ListingService.createListing error:', err);
      return { success: false, error: err.message || 'Failed to save listing', status: 500 };
    }
  }

  public async updateListing(
    id: string,
    updatedData: Partial<Listing>,
    authenticatedUserId?: string,
    isAdmin?: boolean
  ): Promise<{ success: boolean; listing?: Listing; error?: string; status: number }> {
    const existing = await listingRepository.findById(id);
    if (!existing) {
      return { success: false, error: 'Listing not found', status: 404 };
    }

    // Authorization & Ownership Verification
    if (authenticatedUserId && existing.sellerId !== authenticatedUserId && !isAdmin) {
      return { success: false, error: 'Unauthorized: You do not own this listing', status: 403 };
    }

    const targetTitle = updatedData.title !== undefined ? updatedData.title : existing.title;
    const sellerId = existing.sellerId;

    // Validate price if updated
    if (updatedData.price !== undefined) {
      const p = Number(updatedData.price);
      if (isNaN(p) || !isFinite(p) || p < 0) {
        return { success: false, error: 'Price must be a non-negative number', status: 400 };
      }
    }

    // Duplicate title check if title changed
    if (normalizeAdTitle(targetTitle) !== normalizeAdTitle(existing.title)) {
      const dupCheck = await listingRepository.checkDuplicateActiveTitle(sellerId, targetTitle, id);
      if (dupCheck.isDuplicate) {
        return { success: false, error: DUPLICATE_TITLE_ERROR_MESSAGE, status: 409 };
      }
    }

    // Field allowlist: regular sellers can edit content, mark as sold, or renew
    const safeFields: any = {};
    if (updatedData.title !== undefined) safeFields.title = updatedData.title;
    if (updatedData.description !== undefined) safeFields.description = updatedData.description;
    if (updatedData.price !== undefined) safeFields.price = String(updatedData.price);
    if (updatedData.categoryId !== undefined) safeFields.categoryId = updatedData.categoryId;
    if (updatedData.subcategoryId !== undefined) safeFields.subcategoryId = updatedData.subcategoryId || null;
    if (updatedData.images !== undefined) safeFields.images = updatedData.images;
    if (updatedData.customAttributes !== undefined) safeFields.customAttributes = updatedData.customAttributes;
    if (updatedData.location) {
      if (updatedData.location.city) safeFields.city = updatedData.location.city;
      if (updatedData.location.state) safeFields.state = updatedData.location.state;
      if (updatedData.location.locality) safeFields.locality = updatedData.location.locality;
      if (updatedData.location.latitude !== undefined) {
        safeFields.latitude = updatedData.location.latitude !== null ? Number(updatedData.location.latitude) : null;
      }
      if (updatedData.location.longitude !== undefined) {
        safeFields.longitude = updatedData.location.longitude !== null ? Number(updatedData.location.longitude) : null;
      }
    }

    // Sellers can mark as sold or renew expiresAt
    if (!isAdmin) {
      if (updatedData.status === 'sold') {
        safeFields.status = 'sold';
      } else if (
        existing.status === 'approved' &&
        (updatedData.title ||
          updatedData.description ||
          updatedData.price ||
          updatedData.images ||
          updatedData.categoryId !== undefined ||
          updatedData.subcategoryId !== undefined)
      ) {
        // Reset approved ad to pending when key content is edited by seller
        safeFields.status = 'pending';
      }

      if (updatedData.expiresAt) {
        safeFields.expiresAt = new Date(updatedData.expiresAt);
      }
    }

    // Admin-only fields
    if (isAdmin) {
      if (updatedData.status !== undefined) safeFields.status = updatedData.status;
      if (updatedData.expiresAt !== undefined) safeFields.expiresAt = new Date(updatedData.expiresAt);
      if (updatedData.rejectionReason !== undefined) safeFields.rejectionReason = updatedData.rejectionReason;
      if (updatedData.isFeatured !== undefined) safeFields.isFeatured = updatedData.isFeatured;
      if (updatedData.isBoosted !== undefined) safeFields.isBoosted = updatedData.isBoosted;
    }

    try {
      const updated = await listingRepository.update(id, safeFields);
      if (!updated) {
        return { success: false, error: 'Failed to update listing', status: 500 };
      }

      if (doesListingUpdateAffectCounts(safeFields)) {
        await invalidateLiveListingCountsCache();
      }
      return { success: true, listing: updated, status: 200 };
    } catch (err: any) {
      console.error('ListingService.updateListing error:', err);
      return { success: false, error: err.message || 'Failed to update listing', status: 500 };
    }
  }

  public async deleteListing(id: string, authenticatedUserId?: string, isAdmin?: boolean): Promise<boolean> {
    const existing = await listingRepository.findById(id);
    if (!existing) return false;

    if (authenticatedUserId && existing.sellerId !== authenticatedUserId && !isAdmin) {
      throw new Error('Unauthorized: You do not own this listing');
    }

    const deleted = await listingRepository.delete(id);
    if (deleted) {
      await invalidateLiveListingCountsCache();
    }
    return deleted;
  }

  public async bulkApprove(ids: string[]): Promise<number> {
    const res = await listingRepository.bulkUpdateStatus(ids, 'approved');
    if (res.updatedCount > 0) {
      await invalidateLiveListingCountsCache();
    }
    return res.updatedCount;
  }

  public async bulkReject(ids: string[], reason: string): Promise<number> {
    const res = await listingRepository.bulkUpdateStatus(ids, 'rejected', reason);
    if (res.updatedCount > 0) {
      await invalidateLiveListingCountsCache();
    }
    return res.updatedCount;
  }

  public async bulkDelete(ids: string[]): Promise<number> {
    const res = await listingRepository.bulkDelete(ids);
    if (res.deletedCount > 0) {
      await invalidateLiveListingCountsCache();
    }
    return res.deletedCount;
  }

  public async bulkRenew(ids: string[], days: number = 30): Promise<number> {
    const res = await listingRepository.bulkRenew(ids, days);
    if (res.renewedCount > 0) {
      await invalidateLiveListingCountsCache();
    }
    return res.renewedCount;
  }

  public async markSold(id: string, authenticatedUserId?: string, isAdmin?: boolean): Promise<boolean> {
    const existing = await listingRepository.findById(id);
    if (!existing) return false;

    if (authenticatedUserId && existing.sellerId !== authenticatedUserId && !isAdmin) {
      throw new Error('Unauthorized');
    }

    const updated = await listingRepository.update(id, { status: 'sold' });
    if (updated !== null) {
      await invalidateLiveListingCountsCache();
    }
    return updated !== null;
  }

  public async featureListing(id: string, isFeatured: boolean, days: number = 30): Promise<boolean> {
    const until = isFeatured ? new Date(Date.now() + days * 24 * 3600 * 1000) : null;
    const updated = await listingRepository.update(id, {
      isFeatured,
      featuredUntil: until,
    });
    if (updated !== null) {
      await invalidateLiveListingCountsCache();
    }
    return updated !== null;
  }

  public async incrementViews(id: string): Promise<void> {
    await listingRepository.incrementViews(id);
  }

  public async getSellerPhoneForListing(id: string): Promise<string | null> {
    if (!id) return null;
    const cleanId = id.trim();
    const listing = await listingRepository.findById(cleanId);
    if (!listing) return null;
    if (!isListingPubliclyAccessible(listing)) {
      return null;
    }
    return listing.sellerPhone || null;
  }

  public async getSimilarListings(listingId: string, limit: number = 4): Promise<Listing[]> {
    const current = await listingRepository.findById(listingId);
    if (!current) return [];

    const res = await listingRepository.findMarketplaceListings({
      category: current.categoryId,
      city: current.location.city,
      limit: limit + 1,
      skipCount: true,
    });

    return res.items.filter((l) => l.id !== current.id).slice(0, limit);
  }
}

export const listingService = new ListingService();

/**
 * Validates that a listing is approved and unexpired for public visibility.
 */
export function isListingPubliclyAccessible(listing: Listing | null | undefined): listing is Listing {
  if (!listing) return false;
  if (listing.status !== 'approved') return false;
  if (listing.expiresAt) {
    const expTime = new Date(listing.expiresAt).getTime();
    if (!isNaN(expTime) && expTime <= Date.now()) {
      return false;
    }
  }
  return true;
}

/**
 * Per-request React.cache() deduplicated + cross-request unstable_cache listing lookup
 * for detail pages and generateMetadata(). Invalidated immediately on any ad change.
 */
export const getCachedPublicListingById = cache(async (id: string): Promise<Listing | null> => {
  return listingService.getListingById(id);
});

