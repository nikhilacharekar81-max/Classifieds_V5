import crypto from 'node:crypto';
import { unstable_cache, requestCache } from '@/src/shims/next-cache';
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
  getCachedSystemSettings,
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

    const paginatedResult = await fetchCachedPaginatedCatalogInternal(serializedFilter, requestedPage, pageSize);
    
    // Record boost impressions asynchronously
    const boostedIds = paginatedResult.items.filter(l => l.isBoosted).map(l => l.id);
    if (boostedIds.length > 0) {
      this.incrementBoostImpressions(boostedIds).catch(console.warn);
    }

    return paginatedResult;
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

    const latestListings = await fetchCachedLatestListingsInternal(cityKey, limit);
    
    // Record boost impressions asynchronously
    const boostedIds = latestListings.filter(l => l.isBoosted).map(l => l.id);
    if (boostedIds.length > 0) {
      this.incrementBoostImpressions(boostedIds).catch(console.warn);
    }

    return latestListings;
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
      if (item && item.isBoosted) {
        this.incrementBoostClick(item.id).catch(console.warn);
        this.incrementBoostViews([item.id]).catch(console.warn);
      }
      return item ? toPublicListingDetail(item) : null;
    }
    const cachedItem = await fetchCachedListingByIdInternal(cleanId);
    if (cachedItem && cachedItem.isBoosted) {
      this.incrementBoostClick(cachedItem.id).catch(console.warn);
      this.incrementBoostViews([cachedItem.id]).catch(console.warn);
    }
    return cachedItem;
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

    // Validate category existence and active status
    if (!data.categoryId || typeof data.categoryId !== 'string' || !data.categoryId.trim()) {
      return { success: false, error: 'Category ID is required', status: 400 };
    }
    const cleanCategoryId = data.categoryId.trim();
    const existingCategory = await categoryRepository.findById(cleanCategoryId);
    if (!existingCategory) {
      return { success: false, error: `Category '${data.categoryId}' does not exist`, status: 400 };
    }
    if (!existingCategory.isActive) {
      return { success: false, error: `Category '${existingCategory.name || data.categoryId}' is inactive and cannot accept listings`, status: 400 };
    }

    let cleanSubcategoryId: string | null = null;
    let existingSubcategory: Awaited<ReturnType<typeof categoryRepository.findById>> = null;
    if (data.subcategoryId) {
      cleanSubcategoryId = String(data.subcategoryId).trim();
      existingSubcategory = await categoryRepository.findById(cleanSubcategoryId);
      if (!existingSubcategory || existingSubcategory.parentId !== cleanCategoryId) {
        return {
          success: false,
          error: `Subcategory '${data.subcategoryId}' does not exist or does not belong to category '${data.categoryId}'`,
          status: 400,
        };
      }
      if (!existingSubcategory.isActive) {
        return {
          success: false,
          error: `Subcategory '${existingSubcategory.name || data.subcategoryId}' is inactive and cannot accept listings`,
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
    
    const settings = await getCachedSystemSettings();
    const durationDays = settings.listingDurationDays || 30;
    const expiresAt = new Date(Date.now() + durationDays * 24 * 3600 * 1000);

    // Validate city (if provided)
    if (data.location?.city) {
      const allLocations = await locationRepository.findAll();
      const cityLoc = allLocations.find(loc => 
        loc.type === 'city' && 
        (loc.name.toLowerCase() === data.location!.city!.toLowerCase() || 
         loc.slug === data.location!.city!.toLowerCase())
      );
      if (!cityLoc) {
          throw new Error('INVALID_CITY:The provided city is not supported');
      }
    }

    // Enforce Quota and Fees (Integrity check) with row-level locking to prevent parallel bypass
    const { db } = await import('@/src/db/index');
    const { sql, eq, or, and, inArray } = await import('@/src/db/pg-orm');
    const schema = await import('@/src/db/schema');

    let parentCategoryFee: number | undefined = undefined;
    if (existingCategory.parentId) {
      const parentCat = await categoryRepository.findById(existingCategory.parentId);
      if (parentCat && parentCat.postingFee !== undefined && parentCat.postingFee !== null) {
        parentCategoryFee = Number(parentCat.postingFee);
      }
    }

    // Priority: Subcategory -> Category -> Parent Category -> System default. Use ?? to preserve 0 as free.
    const quotaLimit =
      existingSubcategory?.freeListingsQuota ??
      existingCategory.freeListingsQuota ??
      settings.paidFeatures?.freeListingsLimit ??
      settings.freeListingsLimit ??
      3;
    const rawCategoryFee =
      existingSubcategory?.postingFee ??
      existingCategory.postingFee ??
      parentCategoryFee;
    const hasConfiguredCategoryFee =
      rawCategoryFee !== undefined && rawCategoryFee !== null && Number(rawCategoryFee) > 0;
    const rawPostingFee =
      existingSubcategory?.postingFee ??
      existingCategory.postingFee ??
      parentCategoryFee ??
      settings.paidFeatures?.extraListingFee ??
      settings.extraListingFee ??
      0;
    const postingFee = Math.max(0, Number(rawPostingFee) || 0);

    const paidCfg = settings.paidFeatures as any;
    const featuredDurationDays = paidCfg?.featuredAdDurationDays || 30;
    const canSetFeaturedDirectly = Boolean(actorMeta?.isAdminAction);
    const effectiveIsFeatured = canSetFeaturedDirectly ? Boolean(data.isFeatured) : false;
    const effectiveIsBoosted = canSetFeaturedDirectly
      ? Boolean((data as any).isBoosted ?? data.isFeatured)
      : false;
    const featuredUntil = effectiveIsFeatured
      ? new Date(Date.now() + featuredDurationDays * 24 * 3600 * 1000)
      : null;

    const rawCustomAttrs =
      data.customAttributes && typeof data.customAttributes === 'object' && !Array.isArray(data.customAttributes)
        ? { ...data.customAttributes }
        : {};
    const sellerRequestedFeatured =
      !canSetFeaturedDirectly &&
      Boolean(
        data.isFeatured ||
          (data as any).isBoosted ||
          (data as any).requestedFeatured ||
          rawCustomAttrs.requestedFeatured
      );

    try {
      // Execute quota count verification, seller row lock, payment verification and listing insertion in ONE single database transaction
      const created = await db.transaction(async (tx) => {
        // 1. Seller row-level FOR UPDATE lock INSIDE the transaction
        await tx.execute(sql`SELECT id FROM users WHERE id = ${sellerId} FOR UPDATE`);

        // 2. Authoritative active listing count inside the transaction lock
        const activeCountRes = await tx
          .select({ count: sql<number>`count(*)::int` })
          .from(schema.listings)
          .where(
            and(
              eq(schema.listings.sellerId, sellerId),
              inArray(schema.listings.status, ['approved', 'pending']),
              sql`${schema.listings.expiresAt} >= NOW()`
            )
          );
        const activeCount = Number(activeCountRes[0]?.count || 0);

        let paymentRecordToPersist: { amount: number; paymentGateway: string; paymentId: string } | undefined = undefined;

        // Enforce configured category/subcategory posting fee independently of free quota,
        // and enforce extra listing fee when free quota is exceeded and postingFee > 0.
        const isQuotaExceeded = activeCount >= quotaLimit;
        const requiresFee =
          (hasConfiguredCategoryFee || (isQuotaExceeded && postingFee > 0)) &&
          !actorMeta?.isAdminAction;

        if (requiresFee) {
          const { boostService } = await import('@/server/services/boost.service');
          const paymentId = (data as any).postingFeePaymentId?.trim();
          const paymentGateway = (data as any).paymentGateway?.trim() || '';
          const orderId = (data as any).postingFeeOrderId?.trim();
          const signature = (data as any).postingFeeSignature?.trim();

          if (!orderId || !paymentId) {
            throw new Error(
              hasConfiguredCategoryFee
                ? `POSTING_FEE_REQUIRED:₹${postingFee}`
                : `QUOTA_EXCEEDED_FEE_REQUIRED:₹${postingFee}`
            );
          }

          // Fail closed: payment gateway must be configured for paid postings
          if (!boostService.isGatewayConfigured(paymentGateway)) {
            throw new Error(`GATEWAY_NOT_CONFIGURED:₹${postingFee}`);
          }

          // Verify server-side posting order exists and belongs to seller
          await tx.execute(
            sql`SELECT order_id FROM posting_orders WHERE order_id = ${orderId} OR provider_order_id = ${orderId} FOR UPDATE`
          );
          const orderRows = await tx
            .select()
            .from(schema.postingOrders)
            .where(
              or(
                eq(schema.postingOrders.orderId, orderId),
                eq(schema.postingOrders.providerOrderId, orderId)
              )
            )
            .limit(1);

          const postingOrder = orderRows[0];
          if (!postingOrder) {
            throw new Error('INVALID_POSTING_ORDER:Server-side posting order not found');
          }
          if (postingOrder.userId !== sellerId) {
            throw new Error('UNAUTHORIZED_ORDER:Posting order belongs to a different user');
          }
          if (postingOrder.purpose !== 'posting_fee') {
            throw new Error('INVALID_ORDER_PURPOSE:Order purpose must be posting_fee');
          }
          if (
            postingOrder.categoryId !== cleanCategoryId &&
            (!cleanSubcategoryId || postingOrder.categoryId !== cleanSubcategoryId)
          ) {
            throw new Error('CATEGORY_MISMATCH:Posting order category does not match submitted listing category');
          }
          if (postingOrder.currency !== 'INR') {
            throw new Error('CURRENCY_MISMATCH:Only INR currency is accepted for posting fee');
          }
          if (postingOrder.status !== 'pending') {
            throw new Error('ORDER_ALREADY_USED:Posting order is no longer in pending status');
          }
          if (Number(postingOrder.amount) !== postingFee) {
            throw new Error(`AMOUNT_MISMATCH:Order amount ₹${postingOrder.amount} does not match required fee ₹${postingFee}`);
          }

          // Cryptographic signature verification against Razorpay provider order ID
          const razorpayOrderIdForSignature = postingOrder.providerOrderId || postingOrder.orderId;
          const isSignatureValid = boostService.verifyPaymentSignature({
            orderId: razorpayOrderIdForSignature,
            paymentId,
            signature,
          });
          if (!isSignatureValid) {
            throw new Error('PAYMENT_SIGNATURE_INVALID');
          }

          // Independent payment-provider capture verification (valid signature alone is not proof of capture)
          const captureVerification = await boostService.verifyCapturedPaymentEvent(
            {
              orderId: postingOrder.orderId,
              providerOrderId: postingOrder.providerOrderId || undefined,
              paymentId,
              paymentGateway,
              expectedAmount: postingFee,
              expectedCurrency: 'INR',
            },
            tx
          );
          if (!captureVerification.verified) {
            throw new Error(`PAYMENT_NOT_CAPTURED:${captureVerification.reason || 'Payment capture could not be confirmed with payment provider'}`);
          }

          // Verify paymentId has not already been used
          const existingPayment = await tx
            .select({ id: schema.listingPayments.id })
            .from(schema.listingPayments)
            .where(eq(schema.listingPayments.paymentId, paymentId))
            .limit(1);

          if (existingPayment.length > 0) {
            throw new Error('PAYMENT_ALREADY_USED');
          }

          // Mark order as completed
          await tx
            .update(schema.postingOrders)
            .set({ status: 'completed' })
            .where(eq(schema.postingOrders.orderId, orderId));

          paymentRecordToPersist = {
            amount: postingFee,
            paymentGateway: paymentGateway || 'razorpay',
            paymentId,
          };
        }

        // Preserve seller's selected featured upgrade as a pending order/request without activating it for free
        if (sellerRequestedFeatured) {
          let pendingFeaturedOrderId: string | undefined = typeof rawCustomAttrs.pendingFeaturedOrderId === 'string' ? rawCustomAttrs.pendingFeaturedOrderId : undefined;
          const featuredPrice = Math.max(0, Number(paidCfg?.featuredAdPrice ?? 100) || 100);
          if (!pendingFeaturedOrderId) {
            const crypto = await import('node:crypto');
            pendingFeaturedOrderId = `ORD-FEAT-${crypto.randomUUID()}`;
            await tx.insert(schema.postingOrders).values({
              orderId: pendingFeaturedOrderId,
              userId: sellerId,
              categoryId: cleanSubcategoryId || cleanCategoryId,
              amount: String(featuredPrice),
              currency: 'INR',
              purpose: 'featured_ad',
              status: 'pending',
            });
          }
          rawCustomAttrs.requestedFeatured = true;
          rawCustomAttrs.featuredPaymentStatus = 'pending';
          rawCustomAttrs.requestedFeaturedPrice = featuredPrice;
          rawCustomAttrs.requestedFeaturedDurationDays = featuredDurationDays;
          rawCustomAttrs.pendingFeaturedOrderId = pendingFeaturedOrderId;
        }

        // 3. Atomically insert payment record (if required) and create listing with duplicate check
        return await listingRepository.createWithDuplicateCheck({
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
          customAttributes: rawCustomAttrs,
          status: data.status || 'pending',
          expiresAt,
          isFeatured: effectiveIsFeatured,
          featuredUntil: featuredUntil || undefined,
          isBoosted: effectiveIsBoosted,
          paymentRecord: paymentRecordToPersist,
        }, tx);
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
      if (err.message === 'PAYMENT_ALREADY_USED') {
        return { success: false, error: 'This payment has already been used for another listing.', status: 409 };
      }
      if (err.message === 'PAYMENT_SIGNATURE_INVALID') {
        return { success: false, error: 'Payment verification failed: Invalid payment signature from payment provider.', status: 400 };
      }
      if (err.message?.startsWith('GATEWAY_NOT_CONFIGURED:')) {
        const feeStr = err.message.split(':')[1] || '';
        return {
          success: false,
          error: `Payment gateway is not configured for paid posting fee (${feeStr}). Cannot accept unverified payment.`,
          status: 503,
        };
      }
      if (err.message?.startsWith('POSTING_FEE_REQUIRED:')) {
        const feeStr = err.message.split(':')[1] || '';
        return {
          success: false,
          error: `A posting fee of ${feeStr} is required for this category. Please complete payment first.`,
          status: 402,
        };
      }
      if (err.message?.startsWith('QUOTA_EXCEEDED_FEE_REQUIRED:')) {
        const feeStr = err.message.split(':')[1] || '';
        return {
          success: false,
          error: `Listing quota exceeded. A posting fee of ${feeStr} is required for additional listings. Please complete payment first.`,
          status: 402,
        };
      }
      if (
        err.message?.startsWith('INVALID_POSTING_ORDER:') ||
        err.message?.startsWith('UNAUTHORIZED_ORDER:') ||
        err.message?.startsWith('INVALID_ORDER_PURPOSE:') ||
        err.message?.startsWith('CATEGORY_MISMATCH:') ||
        err.message?.startsWith('CURRENCY_MISMATCH:') ||
        err.message?.startsWith('AMOUNT_MISMATCH:') ||
        err.message?.startsWith('ORDER_ALREADY_USED:') ||
        err.message?.startsWith('PAYMENT_NOT_CAPTURED:') ||
        err.message?.startsWith('INVALID_CITY:')
      ) {
        return { success: false, error: err.message.split(':')[1] || err.message, status: 400 };
      }
      return { success: false, error: err.message || 'Failed to save listing', status: 500 };
    }
  }

  public async createPostingOrder(params: {
    categoryId: string;
    subcategoryId?: string;
    userId: string;
    purpose?: string;
    listingId?: string;
    amount?: number;
  }): Promise<{ success: boolean; order?: any; keyId?: string; error?: string; status: number }> {
    const { categoryId, subcategoryId, userId, purpose = 'posting_fee', amount: reqAmount } = params;
    const category = await categoryRepository.findById(categoryId);
    if (!category) {
      return { success: false, error: 'Category not found', status: 404 };
    }
    if (!category.isActive) {
      return { success: false, error: 'Category is inactive and cannot accept listings', status: 400 };
    }

    let subcategory: Awaited<ReturnType<typeof categoryRepository.findById>> = null;
    if (subcategoryId) {
      subcategory = await categoryRepository.findById(subcategoryId);
      if (!subcategory || subcategory.parentId !== category.id) {
        return {
          success: false,
          error: 'Subcategory not found or does not belong to the specified category',
          status: 400,
        };
      }
      if (!subcategory.isActive) {
        return { success: false, error: 'Subcategory is inactive and cannot accept listings', status: 400 };
      }
    }

    const settings = await getCachedSystemSettings();
    let parentCategoryFee: number | undefined = undefined;
    if (category.parentId) {
      const parentCat = await categoryRepository.findById(category.parentId);
      if (parentCat && parentCat.postingFee !== undefined && parentCat.postingFee !== null) {
        parentCategoryFee = Number(parentCat.postingFee);
      }
    }

    let postingFee = 0;
    if (purpose === 'featured_ad') {
      postingFee = Math.max(0, reqAmount !== undefined ? reqAmount : (settings.paidFeatures?.featuredAdPrice ?? 100));
    } else {
      const rawPostingFee =
        subcategory?.postingFee ??
        category.postingFee ??
        parentCategoryFee ??
        settings.paidFeatures?.extraListingFee ??
        settings.extraListingFee ??
        0;
      postingFee = Math.max(0, Number(rawPostingFee) || 0);
    }

    if (postingFee <= 0 && purpose === 'posting_fee') {
      return { success: false, error: 'No posting fee is required for this category', status: 400 };
    }

    const { getRazorpayConfig } = await import('@/server/services/boost.service');
    const rzpConfig = getRazorpayConfig();

    if (!rzpConfig.isConfigured) {
      return {
        success: false,
        error: 'Razorpay payment gateway credentials (RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET) are not configured on the server. Paid listings cannot be created without a configured payment gateway.',
        status: 503,
      };
    }

    const { db } = await import('@/src/db/index');
    const schema = await import('@/src/db/schema');
    const crypto = await import('node:crypto');
    const prefix = purpose === 'featured_ad' ? 'ORD-FEAT-' : 'ORD-POST-';
    const orderId = `${prefix}${crypto.randomUUID()}`;

    let providerOrderId: string | undefined = undefined;
    try {
      const authHeader = 'Basic ' + Buffer.from(`${rzpConfig.keyId}:${rzpConfig.keySecret}`).toString('base64');
      const rzpRes = await fetch('https://api.razorpay.com/v1/orders', {
        method: 'POST',
        headers: {
          Authorization: authHeader,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          amount: Math.round(postingFee * 100), // amount in paise
          currency: 'INR',
          receipt: orderId,
          notes: {
            internal_order_id: orderId,
            user_id: userId,
            purpose,
          },
        }),
      });

      const rzpData = await rzpRes.json();
      if (!rzpRes.ok || !rzpData.id) {
        console.error('Razorpay Orders API error:', rzpData);
        return {
          success: false,
          error: rzpData.error?.description || 'Failed to create genuine Razorpay provider order.',
          status: rzpRes.status || 500,
        };
      }
      providerOrderId = rzpData.id;
    } catch (rzpErr: any) {
      console.error('Razorpay API connection error:', rzpErr);
      return {
        success: false,
        error: 'Could not connect to Razorpay Orders API: ' + (rzpErr.message || 'Network error'),
        status: 500,
      };
    }

    await db.insert(schema.postingOrders).values({
      orderId,
      providerOrderId,
      userId,
      categoryId: subcategoryId || categoryId,
      amount: String(postingFee),
      currency: 'INR',
      purpose,
      status: 'pending',
    });

    return {
      success: true,
      order: {
        orderId,
        providerOrderId,
        amount: postingFee,
        currency: 'INR',
        purpose,
      },
      keyId: rzpConfig.keyId,
      status: 201,
    };
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

    // Administrator-only field protection: moderators and non-admins must not control featured status, boosted status, or featured expiry
    const isOwner = Boolean(authenticatedUserId && existing.sellerId === authenticatedUserId);
    if (!isAdmin) {
      const hasUnauthorizedAdminFieldChange =
        (updatedData.isFeatured !== undefined && (!isOwner || Boolean(updatedData.isFeatured) !== Boolean(existing.isFeatured))) ||
        (updatedData.isBoosted !== undefined && (!isOwner || Boolean(updatedData.isBoosted) !== Boolean(existing.isBoosted))) ||
        (updatedData.featuredUntil !== undefined && (!isOwner || String(updatedData.featuredUntil || '') !== String(existing.featuredUntil || '')));

      if (hasUnauthorizedAdminFieldChange) {
        return {
          success: false,
          error: 'Forbidden: Administrator permission required to modify featured status, boosted status, or featured expiry',
          status: 403,
        };
      }
    }

    // Expiry date protection: only actual administrators can modify expiresAt directly.
    if (!isAdmin && updatedData.expiresAt !== undefined) {
      return {
        success: false,
        error: 'Forbidden: Only administrators can modify the ad expiration date directly. Use the renew flow.',
        status: isModerator ? 403 : 400,
      };
    }

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
      const cat = await categoryRepository.findById(cleanCategoryId);
      if (!cat) {
        return { success: false, error: `Category '${updatedData.categoryId}' does not exist`, status: 400 };
      }
      if (!cat.isActive) {
        return { success: false, error: `Category '${cat.name || updatedData.categoryId}' is inactive and cannot accept listings`, status: 400 };
      }
      safeFields.categoryId = cleanCategoryId;
    }

    const effectiveCategoryId = safeFields.categoryId || existing.categoryId;

    if (updatedData.subcategoryId !== undefined) {
      if (updatedData.subcategoryId === null || String(updatedData.subcategoryId).trim() === '') {
        safeFields.subcategoryId = null;
      } else {
        const cleanSubcategoryId = String(updatedData.subcategoryId).trim();
        const sub = await categoryRepository.findById(cleanSubcategoryId);
        if (!sub || sub.parentId !== effectiveCategoryId) {
          return {
            success: false,
            error: `Subcategory '${updatedData.subcategoryId}' does not exist or does not belong to category '${effectiveCategoryId}'`,
            status: 400,
          };
        }
        if (!sub.isActive) {
          return {
            success: false,
            error: `Subcategory '${sub.name || updatedData.subcategoryId}' is inactive and cannot accept listings`,
            status: 400,
          };
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

    // Moderation fields (Admin / Moderator)
    if (isPrivileged) {
      if (updatedData.status !== undefined) safeFields.status = updatedData.status;
      if (updatedData.rejectionReason !== undefined) safeFields.rejectionReason = updatedData.rejectionReason;
    }

    // Administrator-only fields (strictly restricted to admin / super_admin)
    if (isAdmin) {
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

      // Record audit log for update
      if (authenticatedUserId) {
        try {
          await adminRepository.createAuditLog({
            adminId: authenticatedUserId,
            adminName: (updatedData as any).actorName || 'Authenticated User',
            action: isAdmin || isModerator ? 'ADMIN_LISTING_UPDATED' : 'USER_LISTING_UPDATED',
            module: 'Marketplace',
            targetId: id,
            targetSummary: updated.title,
            details: `Updated listing fields: ${Object.keys(safeFields).join(', ')}`,
            ipAddress: (updatedData as any).ipAddress || 'unknown',
          });
        } catch (auditErr) {
          console.error('[ListingService] Audit log warning in updateListing:', auditErr);
        }
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

  public async incrementBoostImpressions(ids: string[]): Promise<void> {
    if (!ids.length) return;
    try {
      const { db } = await import('@/src/db/index');
      const { inArray, and, eq, sql, gt } = await import('@/src/db/pg-orm');
      const schema = await import('@/src/db/schema');

      await db
        .update(schema.listings)
        .set({ boostImpressions: sql`${schema.listings.boostImpressions} + 1` })
        .where(
          and(
            inArray(schema.listings.id, ids),
            eq(schema.listings.boostStatus, 'active'),
            gt(schema.listings.boostExpiresAt, new Date())
          )
        );
    } catch (error) {
      console.warn('Failed to increment boost impressions:', error);
    }
  }

  public async incrementBoostViews(ids: string[]): Promise<void> {
    if (!ids.length) return;
    try {
      const { db } = await import('@/src/db/index');
      const { inArray, and, eq, sql, gt } = await import('@/src/db/pg-orm');
      const schema = await import('@/src/db/schema');

      await db
        .update(schema.listings)
        .set({ boostViews: sql`${schema.listings.boostViews} + 1` })
        .where(
          and(
            inArray(schema.listings.id, ids),
            eq(schema.listings.boostStatus, 'active'),
            gt(schema.listings.boostExpiresAt, new Date())
          )
        );
    } catch (error) {
      console.warn('Failed to increment boost views:', error);
    }
  }

  public async incrementBoostClick(id: string): Promise<void> {
    try {
      const { db } = await import('@/src/db/index');
      const { and, eq, sql, gt } = await import('@/src/db/pg-orm');
      const schema = await import('@/src/db/schema');

      await db
        .update(schema.listings)
        .set({ boostClicks: sql`${schema.listings.boostClicks} + 1` })
        .where(
          and(
            eq(schema.listings.id, id),
            eq(schema.listings.boostStatus, 'active'),
            gt(schema.listings.boostExpiresAt, new Date())
          )
        );
    } catch (error) {
      console.warn('Failed to increment boost click:', error);
    }
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

  public async toggleFavorite(listingId: string, userId: string): Promise<{ isFavorited: boolean; count: number }> {
    const { db } = await import('@/src/db/index');
    const { and, eq, sql } = await import('@/src/db/pg-orm');
    const schema = await import('@/src/db/schema');

    return await db.transaction(async (tx) => {
      const existing = await tx
        .select()
        .from(schema.userFavorites)
        .where(and(eq(schema.userFavorites.listingId, listingId), eq(schema.userFavorites.userId, userId)))
        .limit(1);

      let isFavorited = false;
      if (existing.length > 0) {
        await tx
          .delete(schema.userFavorites)
          .where(and(eq(schema.userFavorites.listingId, listingId), eq(schema.userFavorites.userId, userId)));
        
        await tx
          .update(schema.listings)
          .set({ likes: sql`${schema.listings.likes} - 1` })
          .where(eq(schema.listings.id, listingId));
        isFavorited = false;
      } else {
        await tx
          .insert(schema.userFavorites)
          .values({ listingId, userId });
        
        await tx
          .update(schema.listings)
          .set({ likes: sql`${schema.listings.likes} + 1` })
          .where(eq(schema.listings.id, listingId));
        isFavorited = true;
      }

      const listing = await tx
        .select({ likes: schema.listings.likes })
        .from(schema.listings)
        .where(eq(schema.listings.id, listingId))
        .limit(1);

      return { isFavorited, count: listing[0]?.likes || 0 };
    });
  }

  public async getFavoriteListingIds(userId: string): Promise<string[]> {
    const { db } = await import('@/src/db/index');
    const { eq } = await import('@/src/db/pg-orm');
    const schema = await import('@/src/db/schema');

    const rows = await db
      .select({ listingId: schema.userFavorites.listingId })
      .from(schema.userFavorites)
      .where(eq(schema.userFavorites.userId, userId));
    return rows.map(r => r.listingId);
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
 * Request-scoped (AsyncLocalStorage) + cross-request unstable_cache listing lookup
 * for detail pages. Invalidated immediately on any ad change.
 */
export const getCachedPublicListingById = requestCache(async (id: string): Promise<Listing | null> => {
  return listingService.getListingById(id);
});

