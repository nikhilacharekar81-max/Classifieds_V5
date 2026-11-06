import { db } from '@/src/db/index';
import * as schema from '@/src/db/schema';
import { eq } from '@/src/db/pg-orm';
import { CmsPage } from '@/lib/types';

export class CmsRepository {
  private mapRowToPage(row: typeof schema.cmsPages.$inferSelect): CmsPage {
    return {
      id: row.id,
      slug: row.slug,
      title: row.title,
      category: (row.slug.includes('terms') || row.slug.includes('privacy') ? 'Legal' : 'About') as any,
      content: row.content,
      status: row.isActive ? 'published' : 'draft',
      updatedAt: row.updatedAt.toISOString().split('T')[0],
    };
  }

  public async findById(id: string): Promise<CmsPage | null> {
    try {
      const rows = await db.select().from(schema.cmsPages).where(eq(schema.cmsPages.id, id)).limit(1);
      return rows[0] ? this.mapRowToPage(rows[0]) : null;
    } catch (error) {
      console.error(`CmsRepository.findById error for ${id}:`, error);
      return null;
    }
  }

  public async findAllPages(): Promise<CmsPage[]> {
    try {
      const rows = await db.select().from(schema.cmsPages);
      return rows.map((r) => this.mapRowToPage(r));
    } catch (error) {
      console.error('CmsRepository.findAllPages error:', error);
      return [];
    }
  }

  public async findBySlug(slug: string): Promise<CmsPage | null> {
    try {
      const rows = await db.select().from(schema.cmsPages).where(eq(schema.cmsPages.slug, slug)).limit(1);
      return rows[0] ? this.mapRowToPage(rows[0]) : null;
    } catch (error) {
      console.error(`CmsRepository.findBySlug error for ${slug}:`, error);
      return null;
    }
  }

  public async createPage(data: {
    id: string;
    slug: string;
    title: string;
    content: string;
    seoTitle?: string;
    seoDescription?: string;
  }): Promise<CmsPage> {
    try {
      const inserted = await db
        .insert(schema.cmsPages)
        .values({
          id: data.id,
          slug: data.slug,
          title: data.title,
          content: data.content,
          seoTitle: data.seoTitle || null,
          seoDescription: data.seoDescription || null,
          isActive: true,
        })
        .returning();

      return this.mapRowToPage(inserted[0]);
    } catch (error) {
      console.error('CmsRepository.createPage error:', error);
      throw new Error('Failed to create CMS page in PostgreSQL', { cause: error });
    }
  }

  public async updatePage(id: string, data: Partial<typeof schema.cmsPages.$inferInsert>): Promise<CmsPage | null> {
    try {
      const updated = await db
        .update(schema.cmsPages)
        .set({
          ...data,
          updatedAt: new Date(),
        })
        .where(eq(schema.cmsPages.id, id))
        .returning();

      return updated[0] ? this.mapRowToPage(updated[0]) : null;
    } catch (error) {
      console.error(`CmsRepository.updatePage error for ${id}:`, error);
      throw new Error(`Failed to update CMS page ${id}`, { cause: error });
    }
  }

  public async deletePage(id: string): Promise<boolean> {
    try {
      const res = await db.delete(schema.cmsPages).where(eq(schema.cmsPages.id, id)).returning({ id: schema.cmsPages.id });
      return res.length > 0;
    } catch (error) {
      console.error(`CmsRepository.deletePage error for ${id}:`, error);
      throw new Error(`Failed to delete CMS page ${id}`, { cause: error });
    }
  }
}

export const cmsRepository = new CmsRepository();
