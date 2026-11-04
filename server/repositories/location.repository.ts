import { db, withDbRetry } from '@/src/db/index';
import * as schema from '@/src/db/schema';
import { eq, asc } from '@/src/db/pg-orm';
import { LocationItem } from '@/lib/types';
import { ensureDatabaseSeeded, isDatabaseInitialized } from '@/server/seed-postgres';
import { getCachedLocations } from '@/server/cache/reference-data.cache';

export class LocationRepository {
  private mapRowToLocation(row: typeof schema.locations.$inferSelect): LocationItem {
    return {
      id: row.id,
      type: row.type as any,
      name: row.name,
      slug: row.slug,
      geoId: row.geoId,
      code: row.code || undefined,
      parentId: row.parentId || null,
      latitude: row.latitude || undefined,
      longitude: row.longitude || undefined,
      popular: row.popular,
      listingCount: 0,
    };
  }

  public async findAllDirect(): Promise<LocationItem[]> {
    try {
      if (!isDatabaseInitialized()) {
        await ensureDatabaseSeeded();
      }

      let rows = await withDbRetry(() =>
        db.select().from(schema.locations).orderBy(asc(schema.locations.orderIndex))
      );

      if (rows.length === 0) {
        await ensureDatabaseSeeded();
        rows = await withDbRetry(() =>
          db.select().from(schema.locations).orderBy(asc(schema.locations.orderIndex))
        );
      }

      if (rows.length === 0) {
        throw new Error('Locations table is empty after database initialization');
      }

      return rows.map((r) => this.mapRowToLocation(r));
    } catch (error) {
      console.error('LocationRepository.findAllDirect error:', error);
      throw new Error('Failed to find locations', { cause: error });
    }
  }

  public async findAll(): Promise<LocationItem[]> {
    try {
      return await getCachedLocations();
    } catch (error) {
      console.error('LocationRepository.findAll error:', error);
      throw new Error('Failed to find locations', { cause: error });
    }
  }

  public async findById(id: string): Promise<LocationItem | null> {
    try {
      const rows = await db.select().from(schema.locations).where(eq(schema.locations.id, id)).limit(1);
      return rows[0] ? this.mapRowToLocation(rows[0]) : null;
    } catch (error) {
      console.error(`LocationRepository.findById error for ${id}:`, error);
      throw new Error(`Failed to find location with id ${id}`, { cause: error });
    }
  }

  public async findBySlug(slug: string): Promise<LocationItem | null> {
    try {
      const rows = await db.select().from(schema.locations).where(eq(schema.locations.slug, slug)).limit(1);
      return rows[0] ? this.mapRowToLocation(rows[0]) : null;
    } catch (error) {
      console.error(`LocationRepository.findBySlug error for ${slug}:`, error);
      throw new Error(`Failed to find location with slug ${slug}`, { cause: error });
    }
  }

  public async create(data: {
    id: string;
    type: string;
    name: string;
    slug: string;
    code?: string;
    geoId: string;
    parentId?: string | null;
    latitude?: number;
    longitude?: number;
    popular?: boolean;
    orderIndex?: number;
  }): Promise<LocationItem> {
    try {
      const inserted = await db
        .insert(schema.locations)
        .values({
          id: data.id,
          type: data.type,
          name: data.name,
          slug: data.slug,
          code: data.code || null,
          geoId: data.geoId,
          parentId: data.parentId || null,
          latitude: data.latitude || null,
          longitude: data.longitude || null,
          popular: data.popular ?? false,
          orderIndex: data.orderIndex || 0,
        })
        .returning();

      return this.mapRowToLocation(inserted[0]);
    } catch (error) {
      console.error('LocationRepository.create error:', error);
      throw new Error('Failed to create location', { cause: error });
    }
  }

  public async update(id: string, data: Partial<typeof schema.locations.$inferInsert>): Promise<LocationItem | null> {
    try {
      const updated = await db
        .update(schema.locations)
        .set(data)
        .where(eq(schema.locations.id, id))
        .returning();

      return updated[0] ? this.mapRowToLocation(updated[0]) : null;
    } catch (error) {
      console.error(`LocationRepository.update error for ${id}:`, error);
      throw new Error(`Failed to update location ${id}`, { cause: error });
    }
  }

  public async delete(id: string): Promise<boolean> {
    try {
      const res = await db.delete(schema.locations).where(eq(schema.locations.id, id)).returning({ id: schema.locations.id });
      return res.length > 0;
    } catch (error) {
      console.error(`LocationRepository.delete error for ${id}:`, error);
      throw new Error(`Failed to delete location ${id}`, { cause: error });
    }
  }
}

export const locationRepository = new LocationRepository();
