import { boostRepository } from '@/server/repositories/boost.repository';
import { paymentRepository } from '@/server/repositories/payment.repository';
import { listingRepository } from '@/server/repositories/listing.repository';
import { adminRepository } from '@/server/repositories/admin.repository';
import { invalidateLiveListingCountsCache } from '@/server/cache/reference-data.cache';
import { PromotionalPackage, OrderTransaction, BoostAnalyticsSummary, Listing } from '@/lib/types';
import crypto from 'node:crypto';
import { db } from '@/src/db/index';
import { sql } from '@/src/db/pg-orm';


export class BoostService {
  public async getPackages(): Promise<PromotionalPackage[]> {
    return await boostRepository.findAllPackages();
  }

  public async getPackageById(id: string): Promise<PromotionalPackage | null> {
    return await boostRepository.findPackageById(id);
  }

  public async createPackage(pkgData: Omit<PromotionalPackage, 'id' | 'salesCount'>): Promise<PromotionalPackage> {
    const id = `pkg_${crypto.randomUUID()}`;
    return await boostRepository.createPackage({
      ...pkgData,
      id,
    });
  }

  public async updatePackage(id: string, updatedData: Partial<PromotionalPackage>): Promise<PromotionalPackage | null> {
    const updateFields: any = {};
    if (updatedData.name !== undefined) updateFields.name = updatedData.name;
    if (updatedData.badge !== undefined) updateFields.badge = updatedData.badge;
    if (updatedData.price !== undefined) updateFields.price = String(updatedData.price);
    if (updatedData.discountPrice !== undefined) updateFields.discountPrice = String(updatedData.discountPrice);
    if (updatedData.durationDays !== undefined) updateFields.durationDays = updatedData.durationDays;
    if (updatedData.durationHours !== undefined) updateFields.durationHours = updatedData.durationHours;
    if (updatedData.features !== undefined) updateFields.features = updatedData.features;
    if (updatedData.isActive !== undefined) updateFields.isActive = updatedData.isActive;

    return await boostRepository.updatePackage(id, updateFields);
  }

  public async togglePackageStatus(id: string): Promise<PromotionalPackage | null> {
    const pkg = await boostRepository.findPackageById(id);
    if (!pkg) return null;
    return await boostRepository.updatePackage(id, { isActive: !pkg.isActive });
  }

  /**
   * Checks whether a real payment gateway secret (and optional provider constraint) is configured.
   * Fail-closed: returns false whenever PAYMENT_GATEWAY_SECRET is absent or blank.
   */
  public isGatewayConfigured(paymentGateway?: string): boolean {
    const secret = process.env.PAYMENT_GATEWAY_SECRET?.trim();
    if (!secret) {
      return false;
    }
    const configuredProvider = process.env.PAYMENT_GATEWAY_PROVIDER?.trim();
    if (configuredProvider && paymentGateway) {
      return configuredProvider.toLowerCase() === paymentGateway.trim().toLowerCase();
    }
    return true;
  }

  /**
   * Server-authoritative order creation.
   * NEVER trusts client price or duration!
   * Creates a PENDING internal order even if no external payment gateway is configured yet.
   */
  public async createBoostOrder(params: {
    listingId: string;
    packageId: string;
    userId: string;
  }): Promise<{ success: boolean; order?: any; error?: string; status: number }> {
    const { listingId, packageId, userId } = params;

    // 1. Verify listing exists
    const listing = await listingRepository.findById(listingId);
    if (!listing) {
      return { success: false, error: 'Listing not found', status: 404 };
    }

    // 2. Verify user ownership
    if (listing.sellerId !== userId) {
      return {
        success: false,
        error: 'Unauthorized: You can only boost your own listings',
        status: 403,
      };
    }

    // 3. Verify listing is approved
    if (listing.status !== 'approved') {
      return {
        success: false,
        error: `Only approved live listings can be boosted (Current status: ${listing.status})`,
        status: 400,
      };
    }

    // 4. Verify ad is not already actively boosted
    if (listing.isBoosted) {
      return {
        success: false,
        error: 'This ad is currently boosted. You can boost it again after current boost expires.',
        status: 400,
      };
    }

    // 5. Check for existing pending order on this listing to prevent concurrent pending orders
    // Use FOR UPDATE to lock the listing row and prevent concurrent checkouts
    await db.execute(sql`SELECT id FROM listings WHERE id = ${listingId} FOR UPDATE`);
    const existingPending = await boostRepository.findPendingOrderByListingId(listingId);
    if (existingPending) {
      return {
        success: false,
        error: 'A pending boost order already exists for this listing. Please complete or cancel existing checkout.',
        status: 409,
      };
    }

    // 5. Look up package in database (never from client)
    const pkg = await boostRepository.findPackageById(packageId);
    if (!pkg || !pkg.isActive) {
      return {
        success: false,
        error: 'Selected boost package is invalid or currently disabled',
        status: 400,
      };
    }

    const durationHours = pkg.durationHours || pkg.durationDays * 24;
    const price = pkg.price;
    const taxAmount = Math.round(price * 0.18 * 100) / 100; // 18% GST standard
    const totalAmount = Math.round((price + taxAmount) * 100) / 100;
    const orderId = `ORD-BOOST-${crypto.randomUUID()}`;

    const orderRecord = await boostRepository.createOrder({
      orderId,
      listingId,
      packageId: pkg.id,
      userId,
      price,
      taxAmount,
      totalAmount,
      durationHours,
    });

    return {
      success: true,
      order: orderRecord,
      status: 201,
    };
  }

  /**
   * Cryptographically verifies HMAC-SHA256 signature from payment gateway.
   * Strictly fail-closed: returns false if secret or signature is missing or invalid.
   */
  public verifyPaymentSignature(params: {
    orderId: string;
    paymentId: string;
    signature?: string;
    secret?: string;
  }): boolean {
    const secret = (params.secret ?? process.env.PAYMENT_GATEWAY_SECRET)?.trim();
    if (!secret || !params.signature || !params.orderId || !params.paymentId) {
      return false;
    }

    const expected = crypto
      .createHmac('sha256', secret)
      .update(`${params.orderId}|${params.paymentId}`)
      .digest('hex');

    const expectedBuf = Buffer.from(expected, 'utf8');
    const providedBuf = Buffer.from(params.signature, 'utf8');
    if (expectedBuf.length !== providedBuf.length) {
      return false;
    }

    return crypto.timingSafeEqual(expectedBuf, providedBuf);
  }

  /**
   * Cryptographically verifies HMAC-SHA256 webhook signature.
   * Strictly fail-closed: returns false if webhook secret or signature is missing or invalid.
   */
  public verifyWebhookSignature(params: {
    rawBody: string;
    signature?: string | null;
    secret?: string;
  }): boolean {
    const secret = (params.secret ?? process.env.PAYMENT_WEBHOOK_SECRET)?.trim();
    if (!secret || !params.signature || !params.rawBody) {
      return false;
    }

    const expected = crypto
      .createHmac('sha256', secret)
      .update(params.rawBody)
      .digest('hex');

    const expectedBuf = Buffer.from(expected, 'utf8');
    const providedBuf = Buffer.from(params.signature, 'utf8');
    if (expectedBuf.length !== providedBuf.length) {
      return false;
    }

    return crypto.timingSafeEqual(expectedBuf, providedBuf);
  }

  /**
   * Fail-closed payment verification and atomic PostgreSQL boost activation.
   * Requires a configured gateway, valid cryptographic signature, matching order/amount/currency,
   * and unprocessed PENDING status before activating boost.
   */
  public async verifyAndApplyBoost(params: {
    orderId: string;
    paymentId: string;
    paymentGateway?: string;
    signature?: string;
    amount?: number;
    currency?: string;
    userId: string;
    userName?: string;
    ipAddress?: string;
  }): Promise<{ success: boolean; listingId?: string; invoiceNumber?: string; error?: string; status: number }> {
    const { orderId, paymentId, paymentGateway, signature, amount, currency, userId, userName, ipAddress } = params;

    // 1. Fail closed if no real payment gateway is configured
    const secret = process.env.PAYMENT_GATEWAY_SECRET?.trim();
    if (!secret) {
      return {
        success: false,
        error: 'Payment gateway not configured. Boost order remains pending.',
        status: 503,
      };
    }

    if (!paymentGateway || !paymentGateway.trim()) {
      return {
        success: false,
        error: 'Payment gateway identifier is required',
        status: 400,
      };
    }

    const configuredProvider = process.env.PAYMENT_GATEWAY_PROVIDER?.trim();
    if (configuredProvider && configuredProvider.toLowerCase() !== paymentGateway.trim().toLowerCase()) {
      return {
        success: false,
        error: `Unrecognized or unconfigured payment gateway: ${paymentGateway}`,
        status: 400,
      };
    }

    // 2. Require cryptographic signature
    if (!signature || !signature.trim()) {
      return {
        success: false,
        error: 'Payment signature is required for verification',
        status: 400,
      };
    }

    // 3. Look up internal pending order
    const order = await boostRepository.findOrderById(orderId);
    if (!order) {
      return { success: false, error: 'Boost order not found', status: 404 };
    }

    // 4. Verify ownership
    if (order.userId !== userId) {
      return { success: false, error: 'Unauthorized: User does not match order', status: 403 };
    }

    // 5. Reject non-pending orders (must be 'pending')
    if (order.status !== 'pending') {
      if (order.status === 'completed') {
        return {
          success: false,
          error: 'Boost order has already been processed',
          status: 409,
        };
      }
      return {
        success: false,
        error: `Boost order status is '${order.status}' and cannot be activated`,
        status: 400,
      };
    }

    // 6. Verify amount and currency correspondence against authoritative order
    if (amount === undefined || typeof amount !== 'number' || isNaN(amount)) {
      return {
        success: false,
        error: 'Verified payment amount is required for verification',
        status: 400,
      };
    }

    if (!currency || typeof currency !== 'string' || !currency.trim()) {
      return {
        success: false,
        error: 'Verified payment currency is required for verification',
        status: 400,
      };
    }

    const expectedTotal = Number(order.totalAmount);
    if (Math.abs(Number(amount) - expectedTotal) >= 0.01) {
      return {
        success: false,
        error: `Payment amount mismatch: expected ${expectedTotal.toFixed(2)}, got ${Number(amount).toFixed(2)}`,
        status: 400,
      };
    }

    if (currency.trim().toUpperCase() !== order.currency.toUpperCase()) {
      return {
        success: false,
        error: `Payment currency mismatch: expected ${order.currency}, got ${currency}`,
        status: 400,
      };
    }

    // 7. Cryptographic signature verification
    if (!this.verifyPaymentSignature({ orderId, paymentId, signature, secret })) {
      return { success: false, error: 'Invalid payment signature from gateway', status: 400 };
    }

    const invoiceNumber = `INV-${crypto.randomUUID().slice(0, 8).toUpperCase()}`;

    try {
      const result = await paymentRepository.activateBoostInTransaction({
        orderId,
        paymentId,
        paymentGateway: paymentGateway.trim(),
        invoiceNumber,
        verifiedAmount: Number(amount),
        verifiedCurrency: currency.trim().toUpperCase(),
      });

      if (result.duplicate) {
        return {
          success: false,
          error: 'Boost order has already been processed',
          status: 409,
        };
      }

      try {
        await invalidateLiveListingCountsCache();
      } catch (cacheErr) {
        console.error('[BoostService] Cache invalidation warning after boost activation:', cacheErr);
      }

      // Audit log in PostgreSQL with real authenticated actor and IP metadata
      await adminRepository.createAuditLog({
        adminId: userId,
        adminName: userName || 'Authenticated User',
        action: 'BOOST_ACTIVATED',
        module: 'Commerce',
        targetId: order.listingId,
        targetSummary: `Boosted Ad (${order.packageId})`,
        details: `Activated boost via ${paymentGateway} (${paymentId}). Total ₹${order.totalAmount}`,
        ipAddress: ipAddress || 'unknown',
      });

      return {
        success: true,
        listingId: result.listingId,
        invoiceNumber: result.invoiceNumber,
        status: 200,
      };
    } catch (err: any) {
      console.error('BoostService.verifyAndApplyBoost error:', err);
      return { success: false, error: err.message || 'Payment activation failed', status: 500 };
    }
  }

  private parseProviderAmountAndCurrency(
    gateway: string,
    payload: any,
    topAmount?: number,
    topCurrency?: string
  ): { amount?: number; currency?: string } {
    let rawAmount = topAmount;
    let rawCurrency = topCurrency;
    const gw = (gateway || '').toLowerCase();

    if (gw.includes('stripe')) {
      const obj = payload?.data?.object || payload;
      if (rawAmount === undefined) {
        const val = obj?.amount_total ?? obj?.amount;
        if (typeof val === 'number' && val > 0) {
          rawAmount = val / 100; // Stripe uses cents/minor units
        }
      }
      if (!rawCurrency) {
        rawCurrency = obj?.currency;
      }
    } else if (gw.includes('razorpay')) {
      const entity = payload?.payload?.payment?.entity || payload;
      if (rawAmount === undefined) {
        const val = entity?.amount;
        if (typeof val === 'number' && val > 0) {
          rawAmount = val / 100; // Razorpay uses paise/minor units
        }
      }
      if (!rawCurrency) {
        rawCurrency = entity?.currency;
      }
    } else {
      if (rawAmount === undefined) {
        rawAmount = payload?.amount;
      }
      if (!rawCurrency) {
        rawCurrency = payload?.currency;
      }
    }

    return {
      amount: typeof rawAmount === 'number' && !isNaN(rawAmount) ? rawAmount : undefined,
      currency: typeof rawCurrency === 'string' && rawCurrency.trim() ? rawCurrency.trim().toUpperCase() : undefined,
    };
  }

  /**
   * Independently verifies that a payment was actually captured/completed by the payment provider
   * by checking recorded, signature-verified provider webhook events in payment_webhook_events.
   * A client-supplied HMAC signature alone is never treated as proof of capture.
   */
  public async verifyCapturedPaymentEvent(
    params: {
      orderId: string;
      paymentId: string;
      paymentGateway?: string;
      expectedAmount: number;
      expectedCurrency: string;
    },
    txOrDb?: any
  ): Promise<{ verified: boolean; reason?: string }> {
    const schema = await import('@/src/db/schema');
    const { eq } = await import('@/src/db/pg-orm');
    const queryDb = txOrDb || db;

    const events = await queryDb
      .select()
      .from(schema.paymentWebhookEvents)
      .where(eq(schema.paymentWebhookEvents.orderId, params.orderId));

    if (!events || events.length === 0) {
      return {
        verified: false,
        reason: 'Payment capture has not been confirmed by the payment provider',
      };
    }

    const expectedGw = params.paymentGateway?.trim().toLowerCase();
    const expectedCurr = params.expectedCurrency.trim().toUpperCase();

    for (const ev of events) {
      const evGw = String(ev.gateway || '').trim().toLowerCase();
      if (expectedGw && evGw && evGw !== expectedGw) {
        continue;
      }

      const payload: any = ev.payload || {};
      const eventType = String(
        payload.eventType || payload.event || payload.type || ''
      ).trim();

      if (eventType !== 'payment.captured' && eventType !== 'checkout.session.completed') {
        continue;
      }

      const entityStatus = String(
        payload?.payload?.payment?.entity?.status ??
        payload?.data?.object?.payment_status ??
        payload?.status ??
        ''
      )
        .trim()
        .toLowerCase();

      if (
        entityStatus &&
        entityStatus !== 'captured' &&
        entityStatus !== 'paid' &&
        entityStatus !== 'succeeded' &&
        entityStatus !== 'completed'
      ) {
        continue;
      }

      const recordedPaymentId = String(
        payload.paymentId ??
        payload?.payload?.payment?.entity?.id ??
        payload?.data?.object?.payment_intent ??
        payload?.data?.object?.id ??
        ''
      ).trim();

      if (!recordedPaymentId || recordedPaymentId !== params.paymentId.trim()) {
        continue;
      }

      const recordedOrderId = String(
        payload.orderId ??
        payload?.payload?.payment?.entity?.order_id ??
        payload?.data?.object?.client_reference_id ??
        ev.orderId ??
        ''
      ).trim();

      if (recordedOrderId !== params.orderId.trim()) {
        continue;
      }

      const { amount: verifiedAmount, currency: verifiedCurrency } =
        this.parseProviderAmountAndCurrency(
          ev.gateway,
          payload,
          typeof payload.amount === 'number' ? payload.amount : undefined,
          typeof payload.currency === 'string' ? payload.currency : undefined
        );

      if (verifiedAmount === undefined || verifiedCurrency === undefined) {
        continue;
      }

      if (Math.abs(verifiedAmount - Number(params.expectedAmount)) >= 0.01) {
        continue;
      }

      if (verifiedCurrency.toUpperCase() !== expectedCurr) {
        continue;
      }

      return { verified: true };
    }

    return {
      verified: false,
      reason: 'No matching captured payment confirmation found for this order and payment ID',
    };
  }

  /**
   * Durable, atomically idempotent webhook handler backed by PostgreSQL.
   * Uses database-enforced ON CONFLICT DO NOTHING and row-level locking inside activateBoostInTransaction.
   */
  public async handleWebhook(event: {
    eventId: string;
    eventType: string;
    orderId: string;
    paymentId: string;
    paymentGateway: string;
    amount?: number;
    currency?: string;
    payload?: any;
  }): Promise<{ success: boolean; message: string; duplicate?: boolean; status?: number }> {
    const { eventId, eventType, orderId, paymentId, paymentGateway, amount, currency, payload } = event;

    if (!eventId || !orderId || !paymentId || !paymentGateway) {
      return { success: false, message: 'Missing required webhook fields', status: 400 };
    }

    const configuredProvider = process.env.PAYMENT_GATEWAY_PROVIDER?.trim();
    if (configuredProvider && configuredProvider.toLowerCase() !== paymentGateway.trim().toLowerCase()) {
      return {
        success: false,
        message: `Unrecognized payment gateway provider: ${paymentGateway}`,
        status: 400,
      };
    }

    if (eventType === 'payment.captured' || eventType === 'checkout.session.completed') {
      const order = await boostRepository.findOrderById(orderId);
      if (!order) {
        const schema = await import('@/src/db/schema');
        const { eq } = await import('@/src/db/pg-orm');
        const postingOrderRows = await db
          .select()
          .from(schema.postingOrders)
          .where(eq(schema.postingOrders.orderId, orderId))
          .limit(1);

        const postingOrder = postingOrderRows[0];
        if (!postingOrder) {
          return { success: false, message: `Order ${orderId} not found`, status: 404 };
        }

        const { amount: verifiedAmount, currency: verifiedCurrency } = this.parseProviderAmountAndCurrency(
          paymentGateway,
          payload,
          amount,
          currency
        );

        if (verifiedAmount === undefined || verifiedCurrency === undefined) {
          return {
            success: false,
            message: 'Missing or unverifiable payment amount or currency in provider payload',
            status: 400,
          };
        }

        const expectedTotal = Number(postingOrder.amount);
        if (Math.abs(verifiedAmount - expectedTotal) >= 0.01) {
          return {
            success: false,
            message: `Payment amount mismatch: expected ${expectedTotal.toFixed(2)}, got ${verifiedAmount.toFixed(2)}`,
            status: 400,
          };
        }

        if (verifiedCurrency.toUpperCase() !== postingOrder.currency.toUpperCase()) {
          return {
            success: false,
            message: `Payment currency mismatch: expected ${postingOrder.currency}, got ${verifiedCurrency}`,
            status: 400,
          };
        }

        const newlyRecorded = await paymentRepository.recordWebhookEvent(
          eventId,
          paymentGateway.trim(),
          orderId,
          {
            ...(payload || {}),
            eventType,
            orderId,
            paymentId,
            amount: verifiedAmount,
            currency: verifiedCurrency,
          }
        );

        if (!newlyRecorded) {
          return {
            success: true,
            duplicate: true,
            message: `Webhook event ${eventId} already processed (idempotent skipped)`,
            status: 200,
          };
        }

        return {
          success: true,
          duplicate: false,
          message: 'Posting fee payment capture recorded via webhook',
          status: 200,
        };
      }

      const { amount: verifiedAmount, currency: verifiedCurrency } = this.parseProviderAmountAndCurrency(
        paymentGateway,
        payload,
        amount,
        currency
      );

      if (verifiedAmount === undefined || verifiedCurrency === undefined) {
        return {
          success: false,
          message: 'Missing or unverifiable payment amount or currency in provider payload',
          status: 400,
        };
      }

      const expectedTotal = Number(order.totalAmount);

      if (Math.abs(verifiedAmount - expectedTotal) >= 0.01) {
        return {
          success: false,
          message: `Payment amount mismatch: expected ${expectedTotal.toFixed(2)}, got ${verifiedAmount.toFixed(2)}`,
          status: 400,
        };
      }

      if (verifiedCurrency.toUpperCase() !== order.currency.toUpperCase()) {
        return {
          success: false,
          message: `Payment currency mismatch: expected ${order.currency}, got ${verifiedCurrency}`,
          status: 400,
        };
      }

      const invoiceNumber = `INV-${crypto.randomUUID().slice(0, 8).toUpperCase()}`;
      const txResult = await paymentRepository.activateBoostInTransaction({
        orderId,
        paymentId,
        paymentGateway: paymentGateway.trim(),
        invoiceNumber,
        eventId,
        webhookPayload: payload || {},
        verifiedAmount,
        verifiedCurrency,
      });

      if (txResult.duplicate) {
        return {
          success: true,
          duplicate: true,
          message: `Webhook event ${eventId} already processed (idempotent skipped)`,
          status: 200,
        };
      }

      try {
        await invalidateLiveListingCountsCache();
      } catch (cacheErr) {
        console.error('[BoostService] Cache invalidation warning after webhook boost activation:', cacheErr);
      }

      return {
        success: true,
        duplicate: false,
        message: 'Boost activated via webhook',
        status: 200,
      };
    }

    // Atomically record non-payment webhook event via ON CONFLICT DO NOTHING
    const newlyRecorded = await paymentRepository.recordWebhookEvent(eventId, paymentGateway, orderId, payload || {});
    if (!newlyRecorded) {
      return {
        success: true,
        duplicate: true,
        message: `Webhook event ${eventId} already processed (idempotent skipped)`,
        status: 200,
      };
    }
    return { success: true, duplicate: false, message: 'Webhook event processed', status: 200 };
  }

  /**
   * Server-time authoritative cleanup of expired boosts in PostgreSQL
   */
  public async cleanupExpiredBoosts(): Promise<number> {
    const res = await boostRepository.cleanupExpiredBoosts();
    if (res.expiredCount > 0) {
      try {
        await invalidateLiveListingCountsCache();
      } catch (cacheErr) {
        console.error('[BoostService] Cache invalidation warning after expired boost cleanup:', cacheErr);
      }
    }
    return res.expiredCount;
  }

  public async getBoostAnalytics(): Promise<BoostAnalyticsSummary> {
    const allTransactions = await boostRepository.findAllTransactions();
    const allListingsRes = await listingRepository.findMarketplaceListings({ limit: 1000 });
    const allListings = allListingsRes.items;

    let totalRevenue = 0;
    for (const tx of allTransactions) {
      if (tx.status === 'completed') {
        totalRevenue += tx.totalAmount || tx.amount || 0;
      }
    }

    let activeBoostsCount = 0;
    let expiredBoostsCount = 0;
    let totalDurationHours = 0;
    let boostedAdViews = 0;
    let boostedAdImpressions = 0;
    let boostedAdClicks = 0;

    for (const listing of allListings) {
      if (listing.isBoosted) {
        activeBoostsCount++;
      } else if (listing.boostStatus === 'expired') {
        expiredBoostsCount++;
      }
      totalDurationHours += listing.boostDurationHours || 0;
      boostedAdViews += listing.boostViews || 0;
      boostedAdImpressions += listing.boostImpressions || 0;
      boostedAdClicks += listing.boostClicks || 0;
    }

    const totalBoosts = activeBoostsCount + expiredBoostsCount || allTransactions.length;
    const avgDurationHours = totalBoosts > 0 ? Math.round(totalDurationHours / totalBoosts) : 24;

    return {
      totalBoostsPurchased: totalBoosts,
      totalBoostRevenue: totalRevenue,
      activeBoostsCount,
      expiredBoostsCount,
      avgDurationHours,
      boostedAdViews,
      boostedAdImpressions,
      boostedAdClicks,
    };
  }

  public async getAllTransactions(): Promise<OrderTransaction[]> {
    return await boostRepository.findAllTransactions();
  }
}

export const boostService = new BoostService();
