import { db, withDbRetry } from '@/src/db/index';
import * as schema from '@/src/db/schema';
import { eq, asc, and, gte, ilike, sql } from '@/src/db/pg-orm';
import { Category, CustomFieldDefinition } from '@/lib/types';
import { ensureDatabaseSeeded, isDatabaseInitialized } from '@/server/seed-postgres';
import { getCategoriesWithLiveCounts } from '@/server/cache/reference-data.cache';

export class CategoryRepository {
  private mapRowToCategory(row: typeof schema.categories.$inferSelect, listingCount = 0): Category {
    return {
      id: row.id,
      name: row.name,
      slug: row.slug,
      icon: row.icon,
      parentId: row.parentId,
      order: row.orderIndex,
      isActive: row.isActive,
      listingCount,
      seoTitle: row.seoTitle || undefined,
      seoDescription: row.seoDescription || undefined,
      isPaid: row.isPaid,
      postingFee: Number(row.postingFee),
      freeListingsQuota: row.freeListingsQuota,
    };
  }

  /**
   * Fetches only the static category and subcategory hierarchy rows from PostgreSQL
   * without dynamic listing counts. Used as the source for the shared reference-data cache.
   * Once essential production initialization is verified once per process, normal visitor requests
   * query categories directly without checking initialization markers or running seeding.
   */
  public async findAllHierarchy(): Promise<Category[]> {
    try {
      if (!isDatabaseInitialized()) {
        await ensureDatabaseSeeded();
      }

      let rows = await withDbRetry(() =>
        db
          .select()
          .from(schema.categories)
          .orderBy(asc(schema.categories.orderIndex))
      );

      if (rows.length === 0) {
        await ensureDatabaseSeeded();
        rows = await withDbRetry(() =>
          db
            .select()
            .from(schema.categories)
            .orderBy(asc(schema.categories.orderIndex))
        );
      }

      if (rows.length === 0) {
        throw new Error('Category hierarchy is empty after database initialization');
      }

      return rows.map((r) => this.mapRowToCategory(r, 0));
    } catch (error) {
      console.error('CategoryRepository.findAllHierarchy error:', error);
      throw new Error('Failed to find category hierarchy', { cause: error });
    }
  }

  /**
   * Computes live approved, non-expired listing counts grouped by category and subcategory
   * in a single SQL query (optionally scoped to a specific city) to minimize connection pool pressure.
   */
  public async findLiveListingCounts(city?: string): Promise<{
    parentCountMap: Record<string, number>;
    subCountMap: Record<string, number>;
    rows: Array<{ categoryId: string | null; subcategoryId: string | null; count: number }>;
  }> {
    try {
      const now = new Date();
      const conditions: any[] = [
        eq(schema.listings.status, 'approved'),
        gte(schema.listings.expiresAt, now),
      ];

      if (city && city !== 'All India' && city !== 'all-india' && city !== 'all') {
        const cleanCity = city.replace(/[-_]/g, ' ').trim();
        if (cleanCity) {
          conditions.push(ilike(schema.listings.city, `%${cleanCity}%`));
        }
      }

      const rawRows = await withDbRetry(() =>
        db
          .select({
            categoryId: schema.listings.categoryId,
            subcategoryId: schema.listings.subcategoryId,
            count: sql<number>`count(*)::int`,
          })
          .from(schema.listings)
          .where(and(...conditions))
          .groupBy(schema.listings.categoryId, schema.listings.subcategoryId)
      );

      const parentCountMap: Record<string, number> = {};
      const subCountMap: Record<string, number> = {};
      const rows: Array<{ categoryId: string | null; subcategoryId: string | null; count: number }> = [];

      for (const r of rawRows) {
        const cnt = Number(r.count) || 0;
        rows.push({
          categoryId: r.categoryId || null,
          subcategoryId: r.subcategoryId || null,
          count: cnt,
        });
        if (r.categoryId) {
          parentCountMap[r.categoryId] = (parentCountMap[r.categoryId] || 0) + cnt;
        }
        if (r.subcategoryId) {
          subCountMap[r.subcategoryId] = (subCountMap[r.subcategoryId] || 0) + cnt;
        }
      }

      return { parentCountMap, subCountMap, rows };
    } catch (error) {
      console.error('CategoryRepository.findLiveListingCounts error:', error);
      throw new Error('Failed to compute live category listing counts', { cause: error });
    }
  }

  /**
   * Returns categories combining cached category/subcategory reference data with live listing counts.
   */
  public async findAll(city?: string): Promise<Category[]> {
    try {
      return await getCategoriesWithLiveCounts(city);
    } catch (error) {
      console.error('CategoryRepository.findAll error:', error);
      throw new Error('Failed to find categories', { cause: error });
    }
  }

  public async findById(id: string): Promise<Category | null> {
    try {
      const rows = await db.select().from(schema.categories).where(eq(schema.categories.id, id)).limit(1);
      return rows[0] ? this.mapRowToCategory(rows[0]) : null;
    } catch (error) {
      console.error(`CategoryRepository.findById error for ${id}:`, error);
      throw new Error(`Failed to find category with id ${id}`, { cause: error });
    }
  }

  public async findBySlug(slug: string): Promise<Category | null> {
    try {
      const rows = await db.select().from(schema.categories).where(eq(schema.categories.slug, slug)).limit(1);
      return rows[0] ? this.mapRowToCategory(rows[0]) : null;
    } catch (error) {
      console.error(`CategoryRepository.findBySlug error for ${slug}:`, error);
      throw new Error(`Failed to find category with slug ${slug}`, { cause: error });
    }
  }

  public async create(data: {
    id: string;
    name: string;
    slug: string;
    icon?: string;
    parentId?: string | null;
    orderIndex?: number;
    isActive?: boolean;
    seoTitle?: string;
    seoDescription?: string;
    isPaid?: boolean;
    postingFee?: number;
    freeListingsQuota?: number;
  }): Promise<Category> {
    try {
      const inserted = await db
        .insert(schema.categories)
        .values({
          id: data.id,
          name: data.name,
          slug: data.slug,
          icon: data.icon || 'Package',
          parentId: data.parentId || null,
          orderIndex: data.orderIndex || 0,
          isActive: data.isActive ?? true,
          seoTitle: data.seoTitle || null,
          seoDescription: data.seoDescription || null,
          isPaid: data.isPaid ?? false,
          postingFee: String(data.postingFee || 0),
          freeListingsQuota: data.freeListingsQuota ?? 3,
        })
        .returning();

      return this.mapRowToCategory(inserted[0]);
    } catch (error) {
      console.error('CategoryRepository.create error:', error);
      throw new Error('Failed to create category', { cause: error });
    }
  }

  public async update(id: string, data: Partial<typeof schema.categories.$inferInsert>): Promise<Category | null> {
    try {
      const updated = await db
        .update(schema.categories)
        .set(data)
        .where(eq(schema.categories.id, id))
        .returning();

      return updated[0] ? this.mapRowToCategory(updated[0]) : null;
    } catch (error) {
      console.error(`CategoryRepository.update error for ${id}:`, error);
      throw new Error(`Failed to update category ${id}`, { cause: error });
    }
  }

  public async delete(id: string): Promise<boolean> {
    try {
      const res = await db.delete(schema.categories).where(eq(schema.categories.id, id)).returning({ id: schema.categories.id });
      return res.length > 0;
    } catch (error) {
      console.error(`CategoryRepository.delete error for ${id}:`, error);
      throw new Error(`Failed to delete category ${id}`, { cause: error });
    }
  }

  // Custom Fields (EAV)
  public async findCustomFieldsByCategory(categoryId: string): Promise<CustomFieldDefinition[]> {
    try {
      const rows = await db
        .select()
        .from(schema.categoryCustomFields)
        .where(eq(schema.categoryCustomFields.categoryId, categoryId))
        .orderBy(asc(schema.categoryCustomFields.orderIndex));

      return rows.map((r) => ({
        id: r.id,
        categoryId: r.categoryId,
        name: r.name,
        label: r.label,
        type: r.type as any,
        options: (r.options as string[]) || undefined,
        unit: r.unit || undefined,
        required: r.required,
        filterable: r.filterable,
        orderIndex: r.orderIndex,
      }));
    } catch (error) {
      console.error(`CategoryRepository.findCustomFieldsByCategory error:`, error);
      return [];
    }
  }

  public async findAllCustomFields(): Promise<CustomFieldDefinition[]> {
    try {
      const rows = await db
        .select()
        .from(schema.categoryCustomFields)
        .orderBy(asc(schema.categoryCustomFields.orderIndex));

      return rows.map((r) => ({
        id: r.id,
        categoryId: r.categoryId,
        name: r.name,
        label: r.label,
        type: r.type as any,
        options: (r.options as string[]) || undefined,
        unit: r.unit || undefined,
        required: r.required,
        filterable: r.filterable,
        orderIndex: r.orderIndex,
      }));
    } catch (error) {
      console.error('CategoryRepository.findAllCustomFields error:', error);
      return [];
    }
  }

  public async createCustomField(data: {
    id: string;
    categoryId: string;
    name: string;
    label: string;
    type: string;
    options?: string[];
    unit?: string;
    required?: boolean;
    filterable?: boolean;
    orderIndex?: number;
  }): Promise<CustomFieldDefinition> {
    try {
      const inserted = await db
        .insert(schema.categoryCustomFields)
        .values({
          id: data.id,
          categoryId: data.categoryId,
          name: data.name,
          label: data.label,
          type: data.type,
          options: data.options || [],
          unit: data.unit || null,
          required: data.required ?? false,
          filterable: data.filterable ?? true,
          orderIndex: data.orderIndex || 0,
        })
        .returning();

      const r = inserted[0];
      return {
        id: r.id,
        categoryId: r.categoryId,
        name: r.name,
        label: r.label,
        type: r.type as any,
        options: (r.options as string[]) || undefined,
        unit: r.unit || undefined,
        required: r.required,
        filterable: r.filterable,
        orderIndex: r.orderIndex,
      };
    } catch (error) {
      console.error('CategoryRepository.createCustomField error:', error);
      throw new Error('Failed to create custom field', { cause: error });
    }
  }
}

export const categoryRepository = new CategoryRepository();
