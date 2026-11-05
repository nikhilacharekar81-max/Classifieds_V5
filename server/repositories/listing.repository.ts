import { db, withDbRetry } from '@/src/db/index';
import * as schema from '@/src/db/schema';
import { eq, and, notInArray, sql, desc, asc, or, ilike, gte, lte, inArray } from '@/src/db/pg-orm';
import { Listing } from '@/lib/types';
import { normalizeAdTitle, DUPLICATE_TITLE_ERROR_MESSAGE } from '@/lib/utils/adTitleValidation';
import {
  getCachedCategoryHierarchy,
  enqueueDurableInvalidation,
  REFERENCE_CACHE_TAGS,
} from '@/server/cache/reference-data.cache';

export function doesListingUpdateAffectCounts(
  fields: Partial<typeof schema.listings.$inferInsert>
): boolean {
  return (
    fields.status !== undefined ||
    fields.categoryId !== undefined ||
    fields.subcategoryId !== undefined ||
    fields.expiresAt !== undefined ||
    fields.title !== undefined ||
    fields.description !== undefined ||
    fields.price !== undefined ||
    fields.images !== undefined ||
    fields.city !== undefined ||
    fields.state !== undefined ||
    fields.locality !== undefined ||
    fields.customAttributes !== undefined ||
    fields.isFeatured !== undefined ||
    fields.featuredUntil !== undefined ||
    fields.isBoosted !== undefined ||
    fields.boostStatus !== undefined ||
    fields.boostExpiresAt !== undefined
  );
}

const CARD_ATTRIBUTE_KEYS = [
  'year',
  'km_driven',
  'fuel',
  'storage',
  'bhk',
  'configuration',
  'property_type',
  'furnishing',
] as const;

export function toPublicListingCard(listing: Listing): Listing {
  const slimAttributes: Record<string, any> = {};
  if (listing.customAttributes) {
    for (const key of CARD_ATTRIBUTE_KEYS) {
      if (listing.customAttributes[key] !== undefined && listing.customAttributes[key] !== '') {
        slimAttributes[key] = listing.customAttributes[key];
      }
    }
  }

  return {
    ...listing,
    sellerPhone: '',
    description: listing.description ? listing.description.slice(0, 160) : '',
    images: listing.images && listing.images.length > 0 ? [listing.images[0]] : [],
    customAttributes: slimAttributes,
    rejectionReason: undefined,
    boostPaymentId: undefined,
    boostPackageId: undefined,
    boostPackageName: undefined,
    boostStartedAt: undefined,
    boostPrice: undefined,
    boostDurationHours: undefined,
    featuredUntil: undefined,
    spamScore: 0,
  };
}

export function toPublicListingDetail(listing: Listing): Listing {
  return {
    ...listing,
    sellerPhone: '',
    rejectionReason: undefined,
    boostPaymentId: undefined,
    spamScore: 0,
  };
}

export interface ListingFilterQuery {
  city?: string;
  category?: string;
  subcategory?: string;
  search?: string;
  minPrice?: number;
  maxPrice?: number;
  status?: string;
  sellerId?: string;
  propertyType?: string;
  configuration?: string;
  propertyStatus?: string;
  listedBy?: string;
  furnishing?: string;
  minArea?: number;
  maxArea?: number;
  maxDeposit?: number;
  brokerage?: string;
  tenantPreference?: string;
  availableFrom?: string;
  petsAllowed?: string;
  sort?: string;
  limit?: number;
  offset?: number;
  skipCount?: boolean;
}

export class ListingRepository {
  /**
   * Maps a Drizzle database row to the application's Listing domain type
   */
  private mapRowToListing(row: typeof schema.listings.$inferSelect): Listing {
    return {
      id: row.id,
      sellerId: row.sellerId,
      sellerName: row.sellerName,
      sellerType: 'user' as const,
      sellerPhone: row.sellerPhone,
      sellerAvatar: '',
      categoryId: row.categoryId,
      subcategoryId: row.subcategoryId || undefined,
      title: row.title,
      description: row.description,
      price: row.price !== null && row.price !== undefined ? Number(row.price) : null,
      location: {
        city: row.city,
        state: row.state,
        locality: row.locality,
        latitude: row.latitude || undefined,
        longitude: row.longitude || undefined,
      },
      images: (row.images as string[]) || [],
      customAttributes: (row.customAttributes as Record<string, any>) || {},
      status: (row.status === 'approved' || row.status === 'pending') && row.expiresAt && row.expiresAt <= new Date()
        ? ('expired' as const)
        : (row.status as any),
      rejectionReason: row.rejectionReason || undefined,
      isFeatured: Boolean(row.isFeatured && (!row.featuredUntil || row.featuredUntil > new Date())),
      featuredUntil: row.featuredUntil ? row.featuredUntil.toISOString() : undefined,
      isBoosted: row.isBoosted && row.boostStatus === 'active' && (!row.boostExpiresAt || row.boostExpiresAt > new Date()),
      boostStatus: row.boostStatus as any,
      boostStartedAt: row.boostStartedAt ? row.boostStartedAt.toISOString() : undefined,
      boostExpiresAt: row.boostExpiresAt ? row.boostExpiresAt.toISOString() : undefined,
      boostPackageId: row.boostPackageId || undefined,
      boostPackageName: row.boostPackageName || undefined,
      boostPaymentId: row.boostPaymentId || undefined,
      boostPrice: row.boostPrice ? Number(row.boostPrice) : undefined,
      boostDurationHours: row.boostDurationHours || undefined,
      boostViews: row.boostViews,
      boostImpressions: row.boostImpressions,
      boostClicks: row.boostClicks,
      views: row.views,
      likes: row.likes,
      chatsCount: row.chatsCount,
      spamScore: row.spamScore,
      createdAt: row.createdAt.toISOString(),
      expiresAt: row.expiresAt.toISOString(),
    };
  }

  public async findById(id: string): Promise<Listing | null> {
    try {
      const cleanId = id.trim();

      // 1. Always attempt an exact B-tree primary key lookup first (O(1) index seek)
      const exactRows = await withDbRetry(() =>
        db
          .select()
          .from(schema.listings)
          .where(eq(schema.listings.id, cleanId))
          .limit(1)
      );

      if (exactRows.length > 0) {
        return this.mapRowToListing(exactRows[0]);
      }

      // 2. Fallback to suffix matching only if cleanId is a short lst_<digits> slug and exact match wasn't found
      const digitsMatch = cleanId.match(/^lst_(\d+)$/i);
      if (digitsMatch) {
        const suffix = `_${digitsMatch[1]}`;
        const suffixRows = await withDbRetry(() =>
          db
            .select()
            .from(schema.listings)
            .where(sql`${schema.listings.id} LIKE ${'%' + suffix}`)
            .limit(1)
        );
        return suffixRows.length > 0 ? this.mapRowToListing(suffixRows[0]) : null;
      }

      return null;
    } catch (error) {
      console.error(`ListingRepository.findById error for ${id}:`, error);
      throw new Error(`Failed to find listing with id ${id}`, { cause: error });
    }
  }

  public async checkDuplicateActiveTitle(
    sellerId: string,
    title: string,
    excludeListingId?: string
  ): Promise<{ isDuplicate: boolean; message?: string; conflictingListingId?: string; normalizedTitle: string }> {
    const normalized = normalizeAdTitle(title);
    if (!sellerId || !normalized) {
      return { isDuplicate: false, normalizedTitle: normalized };
    }

    try {
      const conditions = [
        eq(schema.listings.sellerId, sellerId),
        sql`LOWER(REGEXP_REPLACE(TRIM(${schema.listings.title}), '\\s+', ' ', 'g')) = ${normalized}`,
        inArray(schema.listings.status, ['approved', 'pending']),
        gte(schema.listings.expiresAt, new Date()),
      ];

      if (excludeListingId) {
        conditions.push(sql`${schema.listings.id} != ${excludeListingId}`);
      }

      const conflicts = await db
        .select({ id: schema.listings.id })
        .from(schema.listings)
        .where(and(...conditions))
        .limit(1);

      if (conflicts.length > 0) {
        return {
          isDuplicate: true,
          message: DUPLICATE_TITLE_ERROR_MESSAGE,
          conflictingListingId: conflicts[0].id,
          normalizedTitle: normalized,
        };
      }

      return { isDuplicate: false, normalizedTitle: normalized };
    } catch (error) {
      console.error('ListingRepository.checkDuplicateActiveTitle error:', error);
      return { isDuplicate: false, normalizedTitle: normalized };
    }
  }

  public async findMarketplaceListings(options: ListingFilterQuery = {}): Promise<{
    items: Listing[];
    total: number;
  }> {
    try {
      const conditions: any[] = [];

      // Status & Expiration filtering: Public marketplace shows ONLY non-expired approved listings
      if (options.status && options.status !== 'all') {
        conditions.push(eq(schema.listings.status, options.status));
        if (options.status === 'approved') {
          conditions.push(gte(schema.listings.expiresAt, new Date()));
        }
      } else if (!options.status) {
        // Public marketplace default: only approved AND non-expired listings
        conditions.push(eq(schema.listings.status, 'approved'));
        conditions.push(gte(schema.listings.expiresAt, new Date()));
      }

      // Seller filter
      if (options.sellerId) {
        conditions.push(eq(schema.listings.sellerId, options.sellerId));
      }

      // City filter (Strict city matching, excluding state to prevent Mumbai from matching entire Maharashtra)
      if (options.city && options.city !== 'All India' && options.city !== 'all-india' && options.city !== 'all') {
        const cleanCity = options.city.replace(/[-_]/g, ' ').trim().toLowerCase();
        conditions.push(sql`LOWER(${schema.listings.city}) = ${cleanCity}`);
      }

      // Category filter (resolves child subcategory IDs in-memory from cached category hierarchy)
      if (options.category && options.category !== 'all') {
        const allCategories = await getCachedCategoryHierarchy();
        const childSubcategoryIds = allCategories
          .filter((c) => c.parentId === options.category)
          .map((c) => c.id);

        if (childSubcategoryIds.length > 0) {
          conditions.push(
            or(
              eq(schema.listings.categoryId, options.category),
              eq(schema.listings.subcategoryId, options.category),
              inArray(schema.listings.subcategoryId, childSubcategoryIds)
            )
          );
        } else {
          conditions.push(
            or(
              eq(schema.listings.categoryId, options.category),
              eq(schema.listings.subcategoryId, options.category)
            )
          );
        }
      }

      // Subcategory filter
      if (options.subcategory && options.subcategory !== 'all') {
        conditions.push(
          or(
            eq(schema.listings.subcategoryId, options.subcategory),
            eq(schema.listings.categoryId, options.subcategory)
          )
        );
      }

      // Search query (Sanitize % and _ wildcards to prevent query abuse)
      if (options.search && options.search.trim()) {
        const sanitizedTerm = options.search.trim().replace(/[%_\\]/g, '\\$&');
        const q = `%${sanitizedTerm}%`;
        conditions.push(
          or(
            ilike(schema.listings.title, q),
            ilike(schema.listings.description, q),
            ilike(schema.listings.city, q),
            ilike(schema.listings.locality, q)
          )
        );
      }

      // Price bounds (Validate non-NaN positive numbers)
      if (options.minPrice !== undefined && !isNaN(Number(options.minPrice)) && isFinite(Number(options.minPrice)) && Number(options.minPrice) >= 0) {
        conditions.push(gte(schema.listings.price, String(options.minPrice)));
      }
      if (options.maxPrice !== undefined && !isNaN(Number(options.maxPrice)) && isFinite(Number(options.maxPrice)) && Number(options.maxPrice) >= 0) {
        conditions.push(lte(schema.listings.price, String(options.maxPrice)));
      }

      // Dynamic customAttributes filters
      if (options.propertyType && options.propertyType !== 'all') {
        conditions.push(sql`${schema.listings.customAttributes}->>'property_type' = ${options.propertyType}`);
      }
      if (options.configuration && options.configuration !== 'all') {
        conditions.push(sql`${schema.listings.customAttributes}->>'configuration' = ${options.configuration}`);
      }
      if (options.propertyStatus && options.propertyStatus !== 'all') {
        conditions.push(sql`${schema.listings.customAttributes}->>'property_status' = ${options.propertyStatus}`);
      }
      if (options.listedBy && options.listedBy !== 'all') {
        conditions.push(sql`${schema.listings.customAttributes}->>'listed_by' = ${options.listedBy}`);
      }
      if (options.furnishing && options.furnishing !== 'all') {
        conditions.push(sql`${schema.listings.customAttributes}->>'furnishing' = ${options.furnishing}`);
      }
      if (options.minArea !== undefined && !isNaN(Number(options.minArea)) && isFinite(Number(options.minArea)) && Number(options.minArea) > 0) {
        conditions.push(
          sql`COALESCE(
            CASE WHEN regexp_replace(${schema.listings.customAttributes}->>'carpet_area', '[^0-9.]', '', 'g') ~ '^[0-9]+(\\.[0-9]+)?$' THEN regexp_replace(${schema.listings.customAttributes}->>'carpet_area', '[^0-9.]', '', 'g')::numeric ELSE NULL END,
            CASE WHEN regexp_replace(${schema.listings.customAttributes}->>'built_up_area', '[^0-9.]', '', 'g') ~ '^[0-9]+(\\.[0-9]+)?$' THEN regexp_replace(${schema.listings.customAttributes}->>'built_up_area', '[^0-9.]', '', 'g')::numeric ELSE NULL END,
            CASE WHEN regexp_replace(${schema.listings.customAttributes}->>'plot_area', '[^0-9.]', '', 'g') ~ '^[0-9]+(\\.[0-9]+)?$' THEN regexp_replace(${schema.listings.customAttributes}->>'plot_area', '[^0-9.]', '', 'g')::numeric ELSE NULL END,
            0
          ) >= ${Number(options.minArea)}`
        );
      }
      if (options.maxArea !== undefined && !isNaN(Number(options.maxArea)) && isFinite(Number(options.maxArea)) && Number(options.maxArea) > 0) {
        conditions.push(
          sql`COALESCE(
            CASE WHEN regexp_replace(${schema.listings.customAttributes}->>'carpet_area', '[^0-9.]', '', 'g') ~ '^[0-9]+(\\.[0-9]+)?$' THEN regexp_replace(${schema.listings.customAttributes}->>'carpet_area', '[^0-9.]', '', 'g')::numeric ELSE NULL END,
            CASE WHEN regexp_replace(${schema.listings.customAttributes}->>'built_up_area', '[^0-9.]', '', 'g') ~ '^[0-9]+(\\.[0-9]+)?$' THEN regexp_replace(${schema.listings.customAttributes}->>'built_up_area', '[^0-9.]', '', 'g')::numeric ELSE NULL END,
            CASE WHEN regexp_replace(${schema.listings.customAttributes}->>'plot_area', '[^0-9.]', '', 'g') ~ '^[0-9]+(\\.[0-9]+)?$' THEN regexp_replace(${schema.listings.customAttributes}->>'plot_area', '[^0-9.]', '', 'g')::numeric ELSE NULL END,
            0
          ) <= ${Number(options.maxArea)}`
        );
      }
      if (options.maxDeposit !== undefined && !isNaN(Number(options.maxDeposit)) && isFinite(Number(options.maxDeposit)) && Number(options.maxDeposit) > 0) {
        conditions.push(
          sql`COALESCE(
            CASE WHEN regexp_replace(${schema.listings.customAttributes}->>'security_deposit', '[^0-9.]', '', 'g') ~ '^[0-9]+(\\.[0-9]+)?$' THEN regexp_replace(${schema.listings.customAttributes}->>'security_deposit', '[^0-9.]', '', 'g')::numeric ELSE NULL END,
            0
          ) <= ${Number(options.maxDeposit)}`
        );
      }
      if (options.brokerage && options.brokerage !== 'all') {
        conditions.push(sql`${schema.listings.customAttributes}->>'brokerage' = ${options.brokerage}`);
      }
      if (options.tenantPreference && options.tenantPreference !== 'all') {
        conditions.push(sql`${schema.listings.customAttributes}->>'tenant_preference' = ${options.tenantPreference}`);
      }
      if (options.availableFrom && options.availableFrom !== 'all') {
        conditions.push(sql`${schema.listings.customAttributes}->>'available_from' = ${options.availableFrom}`);
      }
      if (options.petsAllowed && options.petsAllowed !== 'all') {
        conditions.push(sql`${schema.listings.customAttributes}->>'pets_allowed' = ${options.petsAllowed}`);
      }

      const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

      // Deterministic ordering: Boosted -> Featured -> Requested sort -> Tie-breaker by ID
      const boostOrder = sql`CASE WHEN ${schema.listings.boostStatus} = 'active' AND ${schema.listings.boostExpiresAt} > NOW() THEN 1 ELSE 0 END DESC`;
      const featuredOrder = sql`CASE WHEN ${schema.listings.isFeatured} = true AND (${schema.listings.featuredUntil} IS NULL OR ${schema.listings.featuredUntil} > NOW()) THEN 1 ELSE 0 END DESC`;

      const orderClauses: any[] = [boostOrder, featuredOrder];
      if (options.sort === 'price_low' || options.sort === 'price_asc') {
        orderClauses.push(asc(schema.listings.price), desc(schema.listings.createdAt), desc(schema.listings.id));
      } else if (options.sort === 'price_high' || options.sort === 'price_desc') {
        orderClauses.push(desc(schema.listings.price), desc(schema.listings.createdAt), desc(schema.listings.id));
      } else if (options.sort === 'oldest') {
        orderClauses.push(asc(schema.listings.createdAt), asc(schema.listings.id));
      } else {
        orderClauses.push(desc(schema.listings.createdAt), desc(schema.listings.id));
      }

      const query = db
        .select()
        .from(schema.listings)
        .where(whereClause)
        .orderBy(...orderClauses);

      // Numeric bounds: Default 50 per page, Limit capped at [1, 500], Offset >= 0
      const limitVal = options.limit !== undefined && !isNaN(Number(options.limit))
        ? Math.min(Math.max(Number(options.limit) || 50, 1), 500)
        : 50;
      const offsetVal = options.offset !== undefined && !isNaN(Number(options.offset))
        ? Math.max(Number(options.offset) || 0, 0)
        : 0;

      query.limit(limitVal);
      if (offsetVal > 0) {
        query.offset(offsetVal);
      }

      if (options.skipCount) {
        const rows = await withDbRetry(() => query);
        const items = rows.map((r) => this.mapRowToListing(r));
        return {
          items,
          total: items.length,
        };
      }

      if (offsetVal === 0) {
        const rows = await withDbRetry(() => query);
        const items = rows.map((r) => this.mapRowToListing(r));
        if (rows.length < limitVal) {
          return {
            items,
            total: items.length,
          };
        }
        const countRes = await withDbRetry(() =>
          db
            .select({ count: sql<number>`count(*)::int` })
            .from(schema.listings)
            .where(whereClause)
        );
        return {
          items,
          total: countRes[0]?.count || items.length,
        };
      }

      const [countRes, rows] = await withDbRetry(() =>
        Promise.all([
          db
            .select({ count: sql<number>`count(*)::int` })
            .from(schema.listings)
            .where(whereClause),
          query,
        ])
      );

      const total = countRes[0]?.count || 0;
      return {
        items: rows.map((r) => this.mapRowToListing(r)),
        total,
      };
    } catch (error) {
      console.error('ListingRepository.findMarketplaceListings error:', error);
      throw new Error('Failed to fetch marketplace listings from PostgreSQL', { cause: error });
    }
  }

  public async create(data: {
    id: string;
    sellerId: string;
    sellerName: string;
    sellerPhone: string;
    categoryId: string;
    subcategoryId?: string;
    title: string;
    description: string;
    price?: number | null;
    state: string;
    city: string;
    locality: string;
    latitude?: number;
    longitude?: number;
    images?: string[];
    customAttributes?: Record<string, any>;
    status?: string;
    expiresAt?: Date;
  }): Promise<Listing> {
    try {
      const exp = data.expiresAt || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

      const insertedRow = await db.transaction(async (tx) => {
        const inserted = await tx
          .insert(schema.listings)
          .values({
            id: data.id,
            sellerId: data.sellerId,
            sellerName: data.sellerName,
            sellerPhone: data.sellerPhone,
            categoryId: data.categoryId,
            subcategoryId: data.subcategoryId || null,
            title: data.title,
            description: data.description,
            price: data.price !== undefined && data.price !== null ? String(data.price) : null,
            state: data.state,
            city: data.city,
            locality: data.locality,
            latitude: data.latitude || null,
            longitude: data.longitude || null,
            images: data.images || [],
            customAttributes: data.customAttributes || {},
            status: data.status || 'pending',
            expiresAt: exp,
          })
          .returning();

        await enqueueDurableInvalidation(REFERENCE_CACHE_TAGS.LISTING_COUNTS, tx);
        return inserted[0];
      });

      return this.mapRowToListing(insertedRow);
    } catch (error) {
      console.error('ListingRepository.create error:', error);
      throw new Error('Failed to create listing in PostgreSQL', { cause: error });
    }
  }

  public async update(id: string, fields: Partial<typeof schema.listings.$inferInsert>): Promise<Listing | null> {
    try {
      if (doesListingUpdateAffectCounts(fields)) {
        const updatedRow = await db.transaction(async (tx) => {
          const updated = await tx
            .update(schema.listings)
            .set({
              ...fields,
              updatedAt: new Date(),
            })
            .where(eq(schema.listings.id, id))
            .returning();

          if (!updated.length) return null;
          await enqueueDurableInvalidation(REFERENCE_CACHE_TAGS.LISTING_COUNTS, tx);
          return updated[0];
        });

        return updatedRow ? this.mapRowToListing(updatedRow) : null;
      }

      const updated = await db
        .update(schema.listings)
        .set({
          ...fields,
          updatedAt: new Date(),
        })
        .where(eq(schema.listings.id, id))
        .returning();

      if (!updated.length) return null;
      return this.mapRowToListing(updated[0]);
    } catch (error) {
      console.error(`ListingRepository.update error for ${id}:`, error);
      throw new Error(`Failed to update listing ${id}`, { cause: error });
    }
  }

  public async delete(id: string): Promise<boolean> {
    try {
      return await db.transaction(async (tx) => {
        const res = await tx
          .delete(schema.listings)
          .where(eq(schema.listings.id, id))
          .returning({ id: schema.listings.id });

        if (res.length > 0) {
          await enqueueDurableInvalidation(REFERENCE_CACHE_TAGS.LISTING_COUNTS, tx);
        }
        return res.length > 0;
      });
    } catch (error) {
      console.error(`ListingRepository.delete error for ${id}:`, error);
      throw new Error(`Failed to delete listing ${id}`, { cause: error });
    }
  }

  public async incrementViews(id: string): Promise<void> {
    try {
      await db
        .update(schema.listings)
        .set({ views: sql`${schema.listings.views} + 1` })
        .where(eq(schema.listings.id, id));
    } catch (error) {
      // Non-blocking view increment
      console.warn('Failed to increment listing views:', error);
    }
  }

  public async bulkUpdateStatus(ids: string[], status: string, rejectionReason?: string): Promise<{ updatedCount: number }> {
    try {
      return await db.transaction(async (tx) => {
        const res = await tx
          .update(schema.listings)
          .set({
            status,
            rejectionReason: rejectionReason || null,
            updatedAt: new Date(),
          })
          .where(inArray(schema.listings.id, ids))
          .returning({ id: schema.listings.id });

        if (res.length > 0) {
          await enqueueDurableInvalidation(REFERENCE_CACHE_TAGS.LISTING_COUNTS, tx);
        }
        return { updatedCount: res.length };
      });
    } catch (error) {
      console.error('ListingRepository.bulkUpdateStatus error:', error);
      throw new Error('Bulk update failed in PostgreSQL', { cause: error });
    }
  }

  public async bulkDelete(ids: string[]): Promise<{ deletedCount: number }> {
    try {
      return await db.transaction(async (tx) => {
        const res = await tx
          .delete(schema.listings)
          .where(inArray(schema.listings.id, ids))
          .returning({ id: schema.listings.id });

        if (res.length > 0) {
          await enqueueDurableInvalidation(REFERENCE_CACHE_TAGS.LISTING_COUNTS, tx);
        }
        return { deletedCount: res.length };
      });
    } catch (error) {
      console.error('ListingRepository.bulkDelete error:', error);
      throw new Error('Bulk delete failed in PostgreSQL', { cause: error });
    }
  }

  public async getSellerStatusCounts(sellerId: string): Promise<{
    all: number;
    approved: number;
    pending: number;
    expired: number;
    sold: number;
    rejected: number;
  }> {
    const counts = {
      all: 0,
      approved: 0,
      pending: 0,
      expired: 0,
      sold: 0,
      rejected: 0,
    };
    try {
      const rows = await withDbRetry(() =>
        db
          .select({
            status: schema.listings.status,
            count: sql<number>`count(*)::int`,
          })
          .from(schema.listings)
          .where(eq(schema.listings.sellerId, sellerId))
          .groupBy(schema.listings.status)
      );

      for (const row of rows) {
        const c = Number(row.count) || 0;
        if (row.status in counts && row.status !== 'all') {
          counts[row.status as keyof typeof counts] = c;
        }
        counts.all += c;
      }
      return counts;
    } catch (error) {
      console.error('ListingRepository.getSellerStatusCounts error:', error);
      return counts;
    }
  }

  public async bulkRenew(ids: string[], days = 30): Promise<{ renewedCount: number }> {
    try {
      const validDays = typeof days === 'number' && Number.isFinite(days) && days > 0 ? Math.floor(days) : 30;
      const newExpiry = new Date(Date.now() + validDays * 24 * 60 * 60 * 1000);
      return await db.transaction(async (tx) => {
        const res = await tx
          .update(schema.listings)
          .set({
            status: 'approved',
            expiresAt: newExpiry,
            rejectionReason: null,
            updatedAt: new Date(),
          })
          .where(and(
            inArray(schema.listings.id, ids),
            notInArray(schema.listings.status, ['sold', 'pending', 'rejected']),
            or(
              eq(schema.listings.status, 'expired'),
              and(
                eq(schema.listings.status, 'approved'),
                lte(schema.listings.expiresAt, new Date())
              )
            )
          ))
          .returning({ id: schema.listings.id });

        if (res.length > 0) {
          await enqueueDurableInvalidation(REFERENCE_CACHE_TAGS.LISTING_COUNTS, tx);
        }
        return { renewedCount: res.length };
      });
    } catch (error) {
      console.error('ListingRepository.bulkRenew error:', error);
      throw new Error('Bulk renewal failed in PostgreSQL', { cause: error });
    }
  }
}

export const listingRepository = new ListingRepository();

