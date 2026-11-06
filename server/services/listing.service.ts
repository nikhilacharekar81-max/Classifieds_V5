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
import { userRepository } from '@/server/repositories/user.repository';
import { categoryRepository } from '@/server/repositories/category.repository';
import {
  invalidateLiveListingCountsCache,
  REFERENCE_CACHE_TAGS,
  isListingCacheBypassed,
} from '@/server/cache/reference-data.cache';
import { locationRepository } from '@/server/repositories/location.repository';
import { Listing } from '@/lib/types';
import { normalizeAdTitle, DUPLICATE_TITLE_ERROR_MESSAGE } from '@/lib/utils/adTitleValidation';

export interface ListingFilterOptions extends ListingFilterQuery {
  userCoords?: { latitude: number; longitude: number } | null;
}

/**
 * Validates that an image URL is structured correctly:
 * supports standard http/https URLs and base64 data URLs.
 */
export function isValidListingImageUrl(url: unknown): boolean {
  if (typeof url !== 'string') return false;
  const trimmed = url.trim();
  if (!trimmed) return false;

  if (trimmed.startsWith('data:image/')) {
    return /^data:image\/(jpeg|jpg|png|webp|gif|svg\+xml);base64,[A-Za-z0-9+/=]+$/.test(trimmed);
  }

  try {
    const parsed = new URL(trimmed);
    return (parsed.protocol === 'http:' || parsed.protocol === 'https:') && Boolean(parsed.hostname);
  } catch {
    return false;
  }
}

/**
 * Compares two coordinate values to detect meaningful geographic shifts (> ~11 meters).
 */
export function areCoordinatesDifferent(newVal: any, oldVal: any): boolean {
  const isNewEmpty = newVal === undefined || newVal === null || String(newVal).trim() === '';
  const isOldEmpty = oldVal === undefined || oldVal === null || String(oldVal).trim() === '';

  if (isNewEmpty && isOldEmpty) return false;
  if (isNewEmpty !== isOldEmpty) return true;

  const n1 = Number(newVal);
  const n2 = Number(oldVal);
  if (isNaN(n1) && isNaN(n2)) return false;
  if (isNaN(n1) !== isNaN(n2)) return true;

  return Math.abs(n1 - n2) > 0.0001;
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
  private async validateAndNormalizeCity(city?: string): Promise<string | undefined> {
    if (!city || city === 'all' || city === 'all-india' || city === 'All India') {
      return undefined;
    }
    const clean = city.trim();
    if (!clean) return undefined;

    const locations = await locationRepository.findAll();
    const match = locations.find(l => 
      l.type === 'city' && 
      (l.name.toLowerCase() === clean.toLowerCase() || l.slug === clean.toLowerCase())
    );
    
    return match ? match.slug : undefined;
  }
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
      city: await this.validateAndNormalizeCity(params.city || q.city || undefined),
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
    const validatedCity = await this.validateAndNormalizeCity(city);
    const cityKey = validatedCity || '__ALL_INDIA__';

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

    // Validate category existence
    if (!data.categoryId || typeof data.categoryId !== 'string' || !data.categoryId.trim()) {
      return { success: false, error: 'Category ID is required', status: 400 };
    }
    const cleanCategoryId = data.categoryId.trim();
    const existingCategory = await categoryRepository.findById(cleanCategoryId);
    if (!existingCategory) {
      return { success: false, error: `Category '${data.categoryId}' does not exist`, status: 400 };
    }

    let cleanSubcategoryId: string | null = null;
    if (data.subcategoryId) {
      cleanSubcategoryId = String(data.subcategoryId).trim();
      const existingSubcategory = await categoryRepository.findById(cleanSubcategoryId);
      if (!existingSubcategory || existingSubcategory.parentId !== cleanCategoryId) {
        return {
          success: false,
          error: `Subcategory '${data.subcategoryId}' does not exist or does not belong to category '${data.categoryId}'`,
          status: 400,
        };
      }
    }

    // Validate images if provided
    let validImages: string[] = [];
    if (data.images !== undefined) {
      if (!Array.isArray(data.images)) {
        return { success: false, error: 'Images must be an array of URLs', status: 400 };
      }
      if (data.images.length > 5) {
        return { success: false, error: 'A maximum of 5 images is allowed per listing', status: 400 };
      }
      for (const img of data.images) {
        if (!isValidListingImageUrl(img)) {
          return {
            success: false,
            error: `Invalid or malformed image URL: ${typeof img === 'string' ? img.slice(0, 50) : 'not a string'}`,
            status: 400,
          };
        }
      }
      validImages = data.images.map((s: any) => String(s).trim());
    }

    // Validate price (optional: missing/empty price becomes null; zero is preserved)
    let priceNum: number | null = null;
    if (data.price !== undefined && data.price !== null && String(data.price).trim() !== '') {
      const parsed = Number(data.price);
      if (isNaN(parsed) || !isFinite(parsed) || parsed < 0) {
        return { success: false, error: 'Price must be a non-negative number', status: 400 };
      }
      priceNum = parsed;
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

    // Collision-resistant ID
    const id = `lst_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    const expiresAt = new Date(Date.now() + 30 * 24 * 3600 * 1000);

    try {
    // Perform duplicate title check and stale ad expiration in the same transaction
    const created = await listingRepository.createWithDuplicateCheck({
      id,
      sellerId,
      sellerName: actorMeta?.name || data.sellerName || 'Authenticated User',
      sellerPhone: data.sellerPhone || '',
      categoryId: cleanCategoryId,
      subcategoryId: cleanSubcategoryId || undefined,
      title: data.title,
      description: data.description,
      price: priceNum,
      state: data.location?.state || 'Maharashtra',
      city: data.location?.city || 'Mumbai',
      locality: data.location?.locality || 'Locality',
      latitude: data.location?.latitude,
      longitude: data.location?.longitude,
      images: validImages,
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
      if (err.message === 'DUPLICATE_TITLE') {
        return { success: false, error: DUPLICATE_TITLE_ERROR_MESSAGE, status: 409 };
      }
      return { success: false, error: err.message || 'Failed to save listing', status: 500 };
    }
  }

  public async updateListing(
    id: string,
    updatedData: Partial<Listing>,
    authenticatedUserId?: string,
    isAdmin?: boolean,
    isModerator?: boolean
  ): Promise<{ success: boolean; listing?: Listing; error?: string; status: number }> {
    const existing = await listingRepository.findById(id);
    if (!existing) {
      return { success: false, error: 'Listing not found', status: 404 };
    }

    const isPrivileged = Boolean(isAdmin || isModerator);

    // Authorization & Ownership Verification
    if (authenticatedUserId && existing.sellerId !== authenticatedUserId && !isPrivileged) {
      return { success: false, error: 'Unauthorized: You do not own this listing', status: 403 };
    }

    // Status validation
    if (updatedData.status !== undefined) {
      const allowedStatuses = ['pending', 'approved', 'rejected', 'sold', 'expired'];
      if (!allowedStatuses.includes(updatedData.status)) {
        return { success: false, error: `Invalid status: ${updatedData.status}`, status: 400 };
      }
    }

    // Role-based authorization for moderation fields
    if (updatedData.status !== undefined && (updatedData.status === 'approved' || updatedData.status === 'rejected')) {
      if (!isPrivileged) {
        return {
          success: false,
          error: 'Forbidden: Moderator or Admin permission required to approve or reject listings',
          status: 403,
        };
      }
    }

    if (updatedData.rejectionReason !== undefined && !isPrivileged) {
      return {
        success: false,
        error: 'Forbidden: Moderator or Admin permission required to set rejection reason',
        status: 403,
      };
    }

    // Expiry date protection: ordinary sellers cannot modify expiresAt directly.
    // If sent by an ordinary seller during ordinary edits, we safely ignore it rather than erroring or shortening expiry.

    const targetTitle = updatedData.title !== undefined ? updatedData.title : existing.title;
    const sellerId = existing.sellerId;

    const safeFields: any = {};

    // Validate title if updated
    if (updatedData.title !== undefined) {
      if (typeof updatedData.title !== 'string' || updatedData.title.trim().length < 3) {
        return { success: false, error: 'Title is required and must be at least 3 characters long', status: 400 };
      }
      if (updatedData.title.trim().length > 120) {
        return { success: false, error: 'Title cannot exceed 120 characters', status: 400 };
      }
      safeFields.title = updatedData.title.trim();
    }

    // Validate description if updated
    if (updatedData.description !== undefined) {
      if (typeof updatedData.description !== 'string' || updatedData.description.length > 5000) {
        return { success: false, error: 'Description cannot exceed 5000 characters', status: 400 };
      }
      safeFields.description = updatedData.description.trim();
    }

    // Validate categoryId if updated
    if (updatedData.categoryId !== undefined) {
      if (typeof updatedData.categoryId !== 'string' || !updatedData.categoryId.trim()) {
        return { success: false, error: 'Category ID cannot be empty', status: 400 };
      }
      const cleanCategoryId = updatedData.categoryId.trim();
      if (cleanCategoryId !== existing.categoryId) {
        const cat = await categoryRepository.findById(cleanCategoryId);
        if (!cat) {
          return { success: false, error: `Category '${updatedData.categoryId}' does not exist`, status: 400 };
        }
      }
      safeFields.categoryId = cleanCategoryId;
    }

    const effectiveCategoryId = safeFields.categoryId || existing.categoryId;

    if (updatedData.subcategoryId !== undefined) {
      if (updatedData.subcategoryId === null || String(updatedData.subcategoryId).trim() === '') {
        safeFields.subcategoryId = null;
      } else {
        const cleanSubcategoryId = String(updatedData.subcategoryId).trim();
        if (cleanSubcategoryId !== existing.subcategoryId || safeFields.categoryId !== undefined) {
          const sub = await categoryRepository.findById(cleanSubcategoryId);
          if (!sub || sub.parentId !== effectiveCategoryId) {
            return {
              success: false,
              error: `Subcategory '${updatedData.subcategoryId}' does not exist or does not belong to category '${effectiveCategoryId}'`,
              status: 400,
            };
          }
        }
        safeFields.subcategoryId = cleanSubcategoryId;
      }
    }

    // Validate images if updated
    if (updatedData.images !== undefined) {
      if (!Array.isArray(updatedData.images)) {
        return { success: false, error: 'Images must be an array of URLs', status: 400 };
      }
      if (updatedData.images.length > 5) {
        return { success: false, error: 'A maximum of 5 images is allowed per listing', status: 400 };
      }
      for (const img of updatedData.images) {
        if (!isValidListingImageUrl(img)) {
          return {
            success: false,
            error: `Invalid or malformed image URL: ${typeof img === 'string' ? img.slice(0, 50) : 'not a string'}`,
            status: 400,
          };
        }
      }
      safeFields.images = updatedData.images.map((s: any) => String(s).trim());
    }

    // Validate price if updated
    if (updatedData.price !== undefined) {
      if (updatedData.price === null || String(updatedData.price).trim() === '') {
        safeFields.price = null;
      } else {
        const p = Number(updatedData.price);
        if (isNaN(p) || !isFinite(p) || p < 0) {
          return { success: false, error: 'Price must be a non-negative number', status: 400 };
        }
        safeFields.price = String(p);
      }
    }

    // Duplicate title check if title changed

    if (updatedData.customAttributes !== undefined) {
      safeFields.customAttributes = typeof updatedData.customAttributes === 'object' && updatedData.customAttributes !== null
        ? updatedData.customAttributes
        : {};
    }

    if (updatedData.location) {
      if (updatedData.location.city) safeFields.city = updatedData.location.city.trim();
      if (updatedData.location.state) safeFields.state = updatedData.location.state.trim();
      if (updatedData.location.locality) safeFields.locality = updatedData.location.locality.trim();
      if (updatedData.location.latitude !== undefined) {
        safeFields.latitude = updatedData.location.latitude !== null ? Number(updatedData.location.latitude) : null;
      }
      if (updatedData.location.longitude !== undefined) {
        safeFields.longitude = updatedData.location.longitude !== null ? Number(updatedData.location.longitude) : null;
      }
    }

    // Sellers can mark as sold; editing key fields resets approved status to pending
    if (!isPrivileged) {
      if (updatedData.status === 'sold') {
        safeFields.status = 'sold';
      } else if (existing.status === 'rejected') {
        // Corrected rejected listing resubmitted by seller for moderation
        safeFields.status = 'pending';
        safeFields.rejectionReason = null;
      } else if (existing.status === 'approved') {
        // Detect meaningful changes to content, price (supporting 0), attributes, and location
        const isTitleChanged = updatedData.title !== undefined && normalizeAdTitle(updatedData.title) !== normalizeAdTitle(existing.title);
        const isDescChanged = updatedData.description !== undefined && updatedData.description.trim() !== (existing.description || '').trim();
        const isPriceChanged = updatedData.price !== undefined && (
          (updatedData.price === null || String(updatedData.price).trim() === '')
            ? existing.price !== null
            : (existing.price === null || Number(updatedData.price) !== Number(existing.price))
        );
        const isImagesChanged = updatedData.images !== undefined && (
          JSON.stringify(safeFields.images || []) !== JSON.stringify(existing.images || [])
        );
        const isCategoryChanged = updatedData.categoryId !== undefined && updatedData.categoryId.trim() !== existing.categoryId;
        const isSubcategoryChanged = updatedData.subcategoryId !== undefined && (updatedData.subcategoryId || null) !== (existing.subcategoryId || null);
        const isCustomAttrsChanged = updatedData.customAttributes !== undefined && (
          JSON.stringify(updatedData.customAttributes) !== JSON.stringify(existing.customAttributes || {})
        );
        const isLatitudeChanged = updatedData.location?.latitude !== undefined && areCoordinatesDifferent(updatedData.location.latitude, existing.location?.latitude);
        const isLongitudeChanged = updatedData.location?.longitude !== undefined && areCoordinatesDifferent(updatedData.location.longitude, existing.location?.longitude);
        const isLocationChanged = Boolean(
          updatedData.location && (
            (updatedData.location.city && updatedData.location.city.trim() !== (existing.location?.city || '').trim()) ||
            (updatedData.location.state && updatedData.location.state.trim() !== (existing.location?.state || '').trim()) ||
            (updatedData.location.locality && updatedData.location.locality.trim() !== (existing.location?.locality || '').trim()) ||
            isLatitudeChanged ||
            isLongitudeChanged
          )
        );

        if (
          isTitleChanged ||
          isDescChanged ||
          isPriceChanged ||
          isImagesChanged ||
          isCategoryChanged ||
          isSubcategoryChanged ||
          isCustomAttrsChanged ||
          isLocationChanged
        ) {
          // Reset approved ad to pending when key content is edited by seller
          safeFields.status = 'pending';
        }
      }
    }

    // Privileged fields (Admin / Moderator)
    if (isPrivileged) {
      if (updatedData.status !== undefined) safeFields.status = updatedData.status;
      if (updatedData.rejectionReason !== undefined) safeFields.rejectionReason = updatedData.rejectionReason;
      if (updatedData.isFeatured !== undefined) safeFields.isFeatured = updatedData.isFeatured;
      if (updatedData.isBoosted !== undefined) safeFields.isBoosted = updatedData.isBoosted;

      // Legitimate admin expiry management with strict date input validation
      if (updatedData.expiresAt !== undefined) {
        if (!updatedData.expiresAt) {
          return { success: false, error: 'expiresAt cannot be empty', status: 400 };
        }
        let expDate: Date;
        if (typeof updatedData.expiresAt === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(updatedData.expiresAt.trim())) {
          expDate = new Date(`${updatedData.expiresAt.trim()}T23:59:59.999Z`);
        } else {
          expDate = new Date(updatedData.expiresAt);
        }
        if (isNaN(expDate.getTime())) {
          return { success: false, error: 'Invalid expiresAt date format', status: 400 };
        }
        safeFields.expiresAt = expDate;
      }

      if (updatedData.featuredUntil !== undefined) {
        if (updatedData.featuredUntil) {
          let featDate: Date;
          if (typeof updatedData.featuredUntil === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(updatedData.featuredUntil.trim())) {
            featDate = new Date(`${updatedData.featuredUntil.trim()}T23:59:59.999Z`);
          } else {
            featDate = new Date(updatedData.featuredUntil);
          }
          if (isNaN(featDate.getTime())) {
            return { success: false, error: 'Invalid featuredUntil date format', status: 400 };
          }
          safeFields.featuredUntil = featDate;
        } else {
          safeFields.featuredUntil = null;
        }
      }
    }

    try {
      const updated = await listingRepository.updateWithDuplicateCheck(id, safeFields, sellerId);
      if (!updated) {
        return { success: false, error: 'Failed to update listing', status: 500 };
      }
      return { success: true, listing: updated, status: 200 };
    } catch (err: any) {
      console.error('ListingService.updateListing error:', err);
      if (err.message === 'DUPLICATE_TITLE') {
        return { success: false, error: DUPLICATE_TITLE_ERROR_MESSAGE, status: 409 };
      }
      return { success: false, error: err.message || 'Failed to update listing', status: 500 };
    }
  }

  public async deleteListing(id: string, authenticatedUserId?: string, isPrivileged?: boolean): Promise<boolean> {
    const existing = await listingRepository.findById(id);
    if (!existing) return false;

    if (authenticatedUserId && existing.sellerId !== authenticatedUserId && !isPrivileged) {
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
    const seller = await userRepository.findById(listing.sellerId);
    return seller?.phone || null;
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

