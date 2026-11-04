import { db } from '@/src/db/index';
import * as schema from '@/src/db/schema';
import { eq, and } from '@/src/db/pg-orm';

export class FavoriteRepository {
  public async getUserFavorites(userId: string): Promise<string[]> {
    try {
      const rows = await db
        .select({ listingId: schema.userFavorites.listingId })
        .from(schema.userFavorites)
        .where(eq(schema.userFavorites.userId, userId));

      return rows.map((r) => r.listingId);
    } catch (error) {
      console.error('FavoriteRepository.getUserFavorites error:', error);
      return [];
    }
  }

  public async toggleFavorite(userId: string, listingId: string): Promise<{ isFavorited: boolean }> {
    try {
      const existing = await db
        .select()
        .from(schema.userFavorites)
        .where(and(eq(schema.userFavorites.userId, userId), eq(schema.userFavorites.listingId, listingId)))
        .limit(1);

      if (existing.length > 0) {
        await db
          .delete(schema.userFavorites)
          .where(and(eq(schema.userFavorites.userId, userId), eq(schema.userFavorites.listingId, listingId)));
        return { isFavorited: false };
      } else {
        await db.insert(schema.userFavorites).values({
          userId,
          listingId,
        });
        return { isFavorited: true };
      }
    } catch (error) {
      console.error('FavoriteRepository.toggleFavorite error:', error);
      throw new Error('Failed to toggle favorite in PostgreSQL', { cause: error });
    }
  }
}

export const favoriteRepository = new FavoriteRepository();
