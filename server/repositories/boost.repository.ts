import { db } from '@/src/db/index';
import * as schema from '@/src/db/schema';
import { eq, desc, sql, and } from '@/src/db/pg-orm';
import { PromotionalPackage, OrderTransaction } from '@/lib/types';

export class BoostRepository {
  private mapRowToPackage(row: typeof schema.boostPackages.$inferSelect): PromotionalPackage {
    return {
      id: row.id,
      name: row.name,
      badge: row.badge,
      type: row.type as any,
      durationDays: row.durationDays,
      durationHours: row.durationHours,
      price: Number(row.price),
      discountPrice: row.discountPrice ? Number(row.discountPrice) : undefined,
      currency: row.currency,
      features: (row.features as string[]) || [],
      isActive: row.isActive,
      salesCount: row.salesCount,
    };
  }

  private mapRowToTransaction(row: typeof schema.boostTransactions.$inferSelect): OrderTransaction {
    return {
      id: row.id,
      orderId: row.orderId,
      userId: row.userId,
      userName: 'Verified User',
      packageId: row.packageId,
      packageName: 'Boost Package',
      amount: Number(row.amount),
      taxAmount: Number(row.taxAmount),
      totalAmount: Number(row.totalAmount),
      paymentGateway: row.paymentGateway as any,
      paymentId: row.paymentId,
      invoiceNumber: row.invoiceNumber,
      status: row.status as any,
      createdAt: row.createdAt.toISOString(),
    };
  }

  public async findAllPackages(limit = 100, offset = 0): Promise<PromotionalPackage[]> {
    try {
      const safeLimit = Math.min(Math.max(1, Number(limit) || 100), 500);
      const safeOffset = Math.max(0, Number(offset) || 0);
      const rows = await db
        .select()
        .from(schema.boostPackages)
        .orderBy(desc(schema.boostPackages.createdAt))
        .limit(safeLimit)
        .offset(safeOffset);
      return rows.map((r) => this.mapRowToPackage(r));
    } catch (error) {
      console.error('BoostRepository.findAllPackages error:', error);
      throw new Error('Failed to find boost packages', { cause: error });
    }
  }

  public async findPackageById(id: string): Promise<PromotionalPackage | null> {
    try {
      const rows = await db.select().from(schema.boostPackages).where(eq(schema.boostPackages.id, id)).limit(1);
      return rows[0] ? this.mapRowToPackage(rows[0]) : null;
    } catch (error) {
      console.error(`BoostRepository.findPackageById error for ${id}:`, error);
      throw new Error(`Failed to find boost package ${id}`, { cause: error });
    }
  }

  public async createPackage(data: {
    id: string;
    name: string;
    badge: string;
    durationDays?: number;
    durationHours?: number;
    price: number;
    discountPrice?: number;
    features?: string[];
  }): Promise<PromotionalPackage> {
    try {
      const inserted = await db
        .insert(schema.boostPackages)
        .values({
          id: data.id,
          name: data.name,
          badge: data.badge,
          durationDays: data.durationDays || 1,
          durationHours: data.durationHours || 24,
          price: String(data.price),
          discountPrice: data.discountPrice ? String(data.discountPrice) : null,
          features: data.features || [],
          isActive: true,
        })
        .returning();

      return this.mapRowToPackage(inserted[0]);
    } catch (error) {
      console.error('BoostRepository.createPackage error:', error);
      throw new Error('Failed to create boost package', { cause: error });
    }
  }

  public async updatePackage(id: string, data: Partial<typeof schema.boostPackages.$inferInsert>): Promise<PromotionalPackage | null> {
    try {
      const updated = await db
        .update(schema.boostPackages)
        .set({
          ...data,
          updatedAt: new Date(),
        })
        .where(eq(schema.boostPackages.id, id))
        .returning();

      return updated[0] ? this.mapRowToPackage(updated[0]) : null;
    } catch (error) {
      console.error(`BoostRepository.updatePackage error for ${id}:`, error);
      throw new Error(`Failed to update boost package ${id}`, { cause: error });
    }
  }

  public async createOrder(data: {
    orderId: string;
    listingId: string;
    packageId: string;
    userId: string;
    price: number;
    taxAmount: number;
    totalAmount: number;
    durationHours: number;
  }): Promise<typeof schema.boostOrders.$inferSelect> {
    try {
      const inserted = await db
        .insert(schema.boostOrders)
        .values({
          orderId: data.orderId,
          listingId: data.listingId,
          packageId: data.packageId,
          userId: data.userId,
          price: String(data.price),
          taxAmount: String(data.taxAmount),
          totalAmount: String(data.totalAmount),
          durationHours: data.durationHours,
          currency: 'INR',
          status: 'pending',
        })
        .returning();

      return inserted[0];
    } catch (error) {
      console.error('BoostRepository.createOrder error:', error);
      throw new Error('Failed to create boost order in PostgreSQL', { cause: error });
    }
  }

  public async findOrderById(orderId: string): Promise<typeof schema.boostOrders.$inferSelect | null> {
    try {
      const rows = await db.select().from(schema.boostOrders).where(eq(schema.boostOrders.orderId, orderId)).limit(1);
      return rows[0] || null;
    } catch (error) {
      console.error(`BoostRepository.findOrderById error for ${orderId}:`, error);
      throw new Error(`Failed to find boost order ${orderId}`, { cause: error });
    }
  }

  public async findPendingOrderByListingId(listingId: string): Promise<typeof schema.boostOrders.$inferSelect | null> {
    try {
      const rows = await db
        .select()
        .from(schema.boostOrders)
        .where(
          and(
            eq(schema.boostOrders.listingId, listingId),
            eq(schema.boostOrders.status, 'pending')
          )
        )
        .orderBy(desc(schema.boostOrders.createdAt))
        .limit(1);

      return rows[0] || null;
    } catch (error) {
      console.error(`BoostRepository.findPendingOrderByListingId error:`, error);
      return null;
    }
  }

  public async expireStalePendingOrdersForListing(listingId: string, olderThanMs: number = 30 * 60 * 1000): Promise<number> {
    try {
      const cutoff = new Date(Date.now() - olderThanMs);
      const res = await db
        .update(schema.boostOrders)
        .set({ status: 'expired' })
        .where(
          and(
            eq(schema.boostOrders.listingId, listingId),
            eq(schema.boostOrders.status, 'pending'),
            sql`${schema.boostOrders.createdAt} < ${cutoff}`
          )
        )
        .returning({ orderId: schema.boostOrders.orderId });

      return res.length;
    } catch (error) {
      console.error(`BoostRepository.expireStalePendingOrdersForListing error:`, error);
      return 0;
    }
  }

  public async cancelOrder(orderId: string, userId: string): Promise<boolean> {
    try {
      const res = await db
        .update(schema.boostOrders)
        .set({ status: 'cancelled' })
        .where(
          and(
            eq(schema.boostOrders.orderId, orderId),
            eq(schema.boostOrders.userId, userId),
            eq(schema.boostOrders.status, 'pending')
          )
        )
        .returning({ orderId: schema.boostOrders.orderId });
      return res.length > 0;
    } catch (error) {
      console.error(`BoostRepository.cancelOrder error for ${orderId}:`, error);
      return false;
    }
  }

  public async findAllTransactions(limit = 500, offset = 0): Promise<OrderTransaction[]> {
    try {
      const safeLimit = Math.min(Math.max(1, Number(limit) || 500), 1000);
      const safeOffset = Math.max(0, Number(offset) || 0);
      const rows = await db
        .select()
        .from(schema.boostTransactions)
        .orderBy(desc(schema.boostTransactions.createdAt))
        .limit(safeLimit)
        .offset(safeOffset);
      return rows.map((r) => this.mapRowToTransaction(r));
    } catch (error) {
      console.error('BoostRepository.findAllTransactions error:', error);
      throw new Error('Failed to find transactions', { cause: error });
    }
  }

  public async cleanupExpiredBoosts(): Promise<{ expiredCount: number }> {
    try {
      const res = await db
        .update(schema.listings)
        .set({
          isBoosted: false,
          boostStatus: 'expired',
          updatedAt: new Date(),
        })
        .where(
          and(
            eq(schema.listings.boostStatus, 'active'),
            sql`${schema.listings.boostExpiresAt} <= NOW()`
          )
        )
        .returning({ id: schema.listings.id });

      return { expiredCount: res.length };
    } catch (error) {
      console.error('BoostRepository.cleanupExpiredBoosts error:', error);
      throw new Error('Failed to clean up expired boosts', { cause: error });
    }
  }
}

export const boostRepository = new BoostRepository();
