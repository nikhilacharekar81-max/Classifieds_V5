import { db } from '@/src/db/index';
import * as schema from '@/src/db/schema';
import { eq, sql } from '@/src/db/pg-orm';
import crypto from 'node:crypto';

export class PaymentRepository {
  /**
   * Checks whether a webhook event has already been durably recorded and processed.
   */
  public async isEventProcessed(eventId: string): Promise<boolean> {
    try {
      const rows = await db
        .select({ id: schema.paymentWebhookEvents.id })
        .from(schema.paymentWebhookEvents)
        .where(eq(schema.paymentWebhookEvents.id, eventId))
        .limit(1);

      return rows.length > 0;
    } catch (error) {
      console.error('PaymentRepository.isEventProcessed error:', error);
      return false;
    }
  }

  /**
   * Atomically claims and records a non-payment webhook event using PostgreSQL ON CONFLICT DO NOTHING.
   * Returns true if newly recorded, false if already processed (idempotent duplicate).
   */
  public async recordWebhookEvent(eventId: string, gateway: string, orderId: string, payload: any): Promise<boolean> {
    try {
      const inserted = await db
        .insert(schema.paymentWebhookEvents)
        .values({
          id: eventId,
          gateway,
          orderId,
          payload,
        })
        .onConflictDoNothing()
        .returning({ id: schema.paymentWebhookEvents.id });

      return inserted.length > 0;
    } catch (error) {
      console.error('PaymentRepository.recordWebhookEvent error:', error);
      throw new Error(`Failed to record webhook event ${eventId}`, { cause: error });
    }
  }

  /**
   * Atomically executes the PostgreSQL transaction to activate boost upon verified payment.
   * Prevents race conditions and duplicate processing via ON CONFLICT DO NOTHING and SELECT ... FOR UPDATE.
   */
  public async activateBoostInTransaction(params: {
    orderId: string;
    paymentId: string;
    paymentGateway: string;
    invoiceNumber: string;
    eventId?: string;
    webhookPayload?: any;
    verifiedAmount?: number;
    verifiedCurrency?: string;
  }): Promise<{ success: boolean; duplicate?: boolean; listingId: string; invoiceNumber: string }> {
    return await db.transaction(async (tx) => {
      // 1. Atomic idempotency claim for webhook events inside the transaction
      if (params.eventId) {
        const claimed = await tx
          .insert(schema.paymentWebhookEvents)
          .values({
            id: params.eventId,
            gateway: params.paymentGateway,
            orderId: params.orderId,
            payload: params.webhookPayload || {},
          })
          .onConflictDoNothing()
          .returning({ id: schema.paymentWebhookEvents.id });

        if (claimed.length === 0) {
          // Concurrent or prior request already processed this eventId
          const existingOrder = await tx
            .select({ listingId: schema.boostOrders.listingId })
            .from(schema.boostOrders)
            .where(eq(schema.boostOrders.orderId, params.orderId))
            .limit(1);

          return {
            success: true,
            duplicate: true,
            listingId: existingOrder[0]?.listingId || '',
            invoiceNumber: params.invoiceNumber,
          };
        }
      }

      // 2. Row-level lock on boost_orders to prevent concurrent duplicate activations on the same order
      await tx.execute(
        sql`SELECT order_id FROM boost_orders WHERE order_id = ${params.orderId} FOR UPDATE`
      );

      const orderRows = await tx
        .select()
        .from(schema.boostOrders)
        .where(eq(schema.boostOrders.orderId, params.orderId))
        .limit(1);

      if (!orderRows.length) {
        throw new Error(`Order ${params.orderId} not found`);
      }
      const order = orderRows[0];

      if (order.status === 'completed') {
        return {
          success: true,
          duplicate: true,
          listingId: order.listingId,
          invoiceNumber: params.invoiceNumber,
        };
      }

      // 3. Authoritative amount and currency verification against stored pending order
      const expectedTotal = Number(order.totalAmount);
      if (
        params.verifiedAmount !== undefined &&
        Math.abs(Number(params.verifiedAmount) - expectedTotal) >= 0.01
      ) {
        throw new Error(
          `Payment amount mismatch: expected ${expectedTotal.toFixed(2)}, received ${Number(params.verifiedAmount).toFixed(2)}`
        );
      }

      if (
        params.verifiedCurrency !== undefined &&
        params.verifiedCurrency.toUpperCase() !== order.currency.toUpperCase()
      ) {
        throw new Error(
          `Payment currency mismatch: expected ${order.currency}, received ${params.verifiedCurrency}`
        );
      }

      // 4. Fetch Package
      const pkgRows = await tx
        .select()
        .from(schema.boostPackages)
        .where(eq(schema.boostPackages.id, order.packageId))
        .limit(1);

      const pkg = pkgRows[0];
      const pkgName = pkg ? pkg.name : 'Boost Package';
      const durationHours = order.durationHours || (pkg ? pkg.durationHours : 24);

      // 5. Update Order Status
      await tx
        .update(schema.boostOrders)
        .set({ status: 'completed' })
        .where(eq(schema.boostOrders.orderId, params.orderId));

      // 6. Update Listing: Activate Boost
      const now = new Date();
      const expiresAt = new Date(now.getTime() + durationHours * 60 * 60 * 1000);

      await tx
        .update(schema.listings)
        .set({
          isBoosted: true,
          boostStatus: 'active',
          boostStartedAt: now,
          boostExpiresAt: expiresAt,
          boostPackageId: order.packageId,
          boostPackageName: pkgName,
          boostPaymentId: params.paymentId,
          boostPrice: order.price,
          boostDurationHours: durationHours,
          updatedAt: now,
        })
        .where(eq(schema.listings.id, order.listingId));

      // 7. Update Package Sales Count
      await tx
        .update(schema.boostPackages)
        .set({ salesCount: sql`${schema.boostPackages.salesCount} + 1` })
        .where(eq(schema.boostPackages.id, order.packageId));

      // 8. Insert Transaction Record with collision-resistant UUID
      const txId = `tx_${crypto.randomUUID()}`;
      await tx.insert(schema.boostTransactions).values({
        id: txId,
        orderId: order.orderId,
        listingId: order.listingId,
        userId: order.userId,
        packageId: order.packageId,
        amount: order.price,
        taxAmount: order.taxAmount,
        totalAmount: order.totalAmount,
        paymentGateway: params.paymentGateway,
        paymentId: params.paymentId,
        invoiceNumber: params.invoiceNumber,
        status: 'completed',
      });

      return {
        success: true,
        duplicate: false,
        listingId: order.listingId,
        invoiceNumber: params.invoiceNumber,
      };
    });
  }
}

export const paymentRepository = new PaymentRepository();
