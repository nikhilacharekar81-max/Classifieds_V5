import { boostRepository } from '@/server/repositories/boost.repository';
import { paymentRepository } from '@/server/repositories/payment.repository';
import { listingRepository } from '@/server/repositories/listing.repository';
import { adminRepository } from '@/server/repositories/admin.repository';
import { invalidateLiveListingCountsCache } from '@/server/cache/reference-data.cache';
import { PromotionalPackage, OrderTransaction, BoostAnalyticsSummary, Listing } from '@/lib/types';
import crypto from 'node:crypto';
import { db } from '@/src/db/index';
import * as schema from '@/src/db/schema';
import { sql } from '@/src/db/pg-orm';


export function getRazorpayConfig() {
  const keyId = (process.env.RAZORPAY_KEY_ID || process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID)?.trim();
  const keySecret = (process.env.RAZORPAY_KEY_SECRET || process.env.PAYMENT_GATEWAY_SECRET)?.trim();
  const webhookSecret = (process.env.RAZORPAY_WEBHOOK_SECRET || process.env.PAYMENT_WEBHOOK_SECRET || keySecret)?.trim();

  const isConfigured = Boolean(keyId && keySecret);
  return {
    keyId: keyId || '',
    keySecret: keySecret || '',
    webhookSecret: webhookSecret || keySecret || '',
    isConfigured,
  };
}

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

  public getRazorpayConfig() {
    return getRazorpayConfig();
  }

  /**
   * Checks whether a real payment gateway secret (and optional provider constraint) is configured.
   * Fail-closed: returns false whenever gateway credentials are missing.
   */
  public isGatewayConfigured(paymentGateway?: string): boolean {
    const config = this.getRazorpayConfig();
    if (!config.isConfigured) {
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
    if (process.env.BOOST_ENABLED !== 'true') {
      return { success: false, error: 'Boost and Featured ads are currently disabled', status: 503 };
    }
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
    
    // Automatically expire any "pending" boost order for this listing that is older than 30 minutes
    await boostRepository.expireStalePendingOrdersForListing(listingId, 30 * 60 * 1000);

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
   * Cryptographically verifies HMAC-SHA256 signature from Razorpay provider.
   * HMAC-SHA256(razorpay_order_id + "|" + razorpay_payment_id, RAZORPAY_KEY_SECRET)
   * Strictly fail-closed: returns false if secret or signature is missing or invalid.
   */
  public verifyPaymentSignature(params: {
    orderId: string;
    paymentId: string;
    signature?: string;
    secret?: string;
  }): boolean {
    const config = this.getRazorpayConfig();
    const secret = (params.secret ?? config.keySecret)?.trim();
    if (!secret || !params.signature || !params.orderId || !params.paymentId) {
      return false;
    }

    const expected = crypto
      .createHmac('sha256', secret)
      .update(`${params.orderId.trim()}|${params.paymentId.trim()}`)
      .digest('hex');

    const expectedBuf = Buffer.from(expected, 'utf8');
    const providedBuf = Buffer.from(params.signature.trim(), 'utf8');
    if (expectedBuf.length !== providedBuf.length) {
      return false;
    }

    return crypto.timingSafeEqual(expectedBuf, providedBuf);
  }

  /**
   * Cryptographically verifies HMAC-SHA256 Razorpay webhook signature against raw body.
   * Strictly fail-closed: returns false if webhook secret or signature is missing or invalid.
   */
  public verifyWebhookSignature(params: {
    rawBody: string;
    signature?: string | null;
    secret?: string;
  }): boolean {
    const config = this.getRazorpayConfig();
    const secret = (params.secret ?? config.webhookSecret ?? config.keySecret)?.trim();
    if (!secret || !params.signature || !params.rawBody) {
      return false;
    }

    const expected = crypto
      .createHmac('sha256', secret)
      .update(params.rawBody)
      .digest('hex');

    const expectedBuf = Buffer.from(expected, 'utf8');
    const providedBuf = Buffer.from(params.signature.trim(), 'utf8');
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
    if (process.env.BOOST_ENABLED !== 'true') {
      return { success: false, error: 'Boost and Featured ads are currently disabled', status: 503 };
    }
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
      providerOrderId?: string;
      paymentId: string;
      paymentGateway?: string;
      expectedAmount: number;
      expectedCurrency: string;
    },
    txOrDb?: any
  ): Promise<{ verified: boolean; reason?: string }> {
    const schema = await import('@/src/db/schema');
    const { eq, or } = await import('@/src/db/pg-orm');
    const queryDb = txOrDb || db;

    const events = await queryDb
      .select()
      .from(schema.paymentWebhookEvents)
      .where(
        or(
          eq(schema.paymentWebhookEvents.orderId, params.orderId),
          params.providerOrderId ? eq(schema.paymentWebhookEvents.orderId, params.providerOrderId) : eq(schema.paymentWebhookEvents.orderId, params.orderId)
        )
      );

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
      if (expectedGw && evGw && evGw !== expectedGw && !evGw.includes('razorpay')) {
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
        payload.providerOrderId ??
        payload.orderId ??
        payload?.payload?.payment?.entity?.order_id ??
        payload?.data?.object?.client_reference_id ??
        ev.orderId ??
        ''
      ).trim();

      const matchesOrder =
        recordedOrderId === params.orderId.trim() ||
        (params.providerOrderId && recordedOrderId === params.providerOrderId.trim());

      if (!matchesOrder) {
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
   * Durable, atomically idempotent native Razorpay webhook handler backed by PostgreSQL.
   * Uses database-enforced ON CONFLICT DO NOTHING and row-level locking.
   */
  public async handleWebhook(params: {
    eventId?: string;
    eventType?: string;
    orderId?: string;
    paymentId?: string;
    paymentGateway?: string;
    amount?: number;
    currency?: string;
    payload?: any;
  }): Promise<{ success: boolean; message: string; duplicate?: boolean; status?: number }> {
    const body = params.payload || {};
    const eventType = String(params.eventType || body.event || body.eventType || '').trim();
    const paymentEntity = body.payload?.payment?.entity || body.payload?.payment || body;

    const paymentId = String(
      params.paymentId || paymentEntity.id || body.paymentId || ''
    ).trim();

    const providerOrderId = String(
      paymentEntity.order_id || params.orderId || body.orderId || ''
    ).trim();

    const internalOrderId = String(
      paymentEntity.notes?.internal_order_id || body.notes?.internal_order_id || ''
    ).trim();

    const eventId = String(
      params.eventId ||
      body.event_id ||
      body.id ||
      (paymentId && (providerOrderId || internalOrderId)
        ? `razorpay_${eventType || 'capture'}_${providerOrderId || internalOrderId}_${paymentId}`
        : '')
    ).trim();

    if (!eventId) {
      return { success: false, message: 'Missing stable event identifier for idempotency', status: 400 };
    }

    const gateway = String(params.paymentGateway || 'Razorpay').trim();

    if (!paymentId || (!providerOrderId && !internalOrderId)) {
      return { success: false, message: 'Missing required Razorpay paymentId or orderId in webhook payload', status: 400 };
    }

    // Razorpay payment entity amounts are always in paise (divide by 100 to get INR rupees)
    let verifiedAmount: number | undefined = undefined;
    if (typeof paymentEntity.amount === 'number' && paymentEntity.amount > 0) {
      verifiedAmount = paymentEntity.amount / 100;
    } else if (typeof params.amount === 'number') {
      verifiedAmount = params.amount;
    } else if (typeof body.amount === 'number') {
      verifiedAmount = body.amount;
    }

    const verifiedCurrency = String(
      paymentEntity.currency || params.currency || body.currency || 'INR'
    ).trim().toUpperCase();

    const paymentStatus = String(
      paymentEntity.status || body.status || ''
    ).trim().toLowerCase();

    const isCaptured =
      eventType === 'payment.captured' ||
      eventType === 'checkout.session.completed' ||
      paymentStatus === 'captured' ||
      paymentStatus === 'paid';

    if (!isCaptured) {
      return { success: true, message: `Ignored non-capture event: ${eventType}`, status: 200 };
    }

    if (verifiedAmount === undefined || isNaN(verifiedAmount) || verifiedAmount <= 0) {
      return { success: false, message: 'Invalid or missing payment amount in webhook payload', status: 400 };
    }

    const { db } = await import('@/src/db/index');
    const { eq, or, sql } = await import('@/src/db/pg-orm');
    const schema = await import('@/src/db/schema');

    // 1. Check posting_orders table first
    const postingOrderRows = await db
      .select()
      .from(schema.postingOrders)
      .where(
        or(
          providerOrderId ? eq(schema.postingOrders.providerOrderId, providerOrderId) : sql`1=0`,
          internalOrderId ? eq(schema.postingOrders.orderId, internalOrderId) : sql`1=0`,
          providerOrderId ? eq(schema.postingOrders.orderId, providerOrderId) : sql`1=0`
        )
      )
      .limit(1);

    const postingOrder = postingOrderRows[0];
    if (postingOrder) {
      const expectedTotal = Number(postingOrder.amount);
      if (Math.abs(verifiedAmount - expectedTotal) >= 0.01) {
        return {
          success: false,
          message: `Payment amount mismatch for posting order: expected ₹${expectedTotal.toFixed(2)}, got ₹${verifiedAmount.toFixed(2)}`,
          status: 400,
        };
      }

      if (verifiedCurrency !== postingOrder.currency.toUpperCase()) {
        return {
          success: false,
          message: `Payment currency mismatch: expected ${postingOrder.currency}, got ${verifiedCurrency}`,
          status: 400,
        };
      }

      const newlyRecorded = await paymentRepository.recordWebhookEvent(
        eventId,
        gateway,
        postingOrder.orderId,
        {
          eventType,
          orderId: postingOrder.orderId,
          providerOrderId: postingOrder.providerOrderId || providerOrderId,
          paymentId,
          amount: verifiedAmount,
          currency: verifiedCurrency,
          status: paymentStatus || 'captured',
          payload: body,
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
        message: 'Posting fee payment capture recorded via Razorpay webhook',
        status: 200,
      };
    }

    // 2. Check boost_orders table
    const boostOrderRows = await db
      .select()
      .from(schema.boostOrders)
      .where(
        or(
          providerOrderId ? eq(schema.boostOrders.orderId, providerOrderId) : sql`1=0`,
          internalOrderId ? eq(schema.boostOrders.orderId, internalOrderId) : sql`1=0`
        )
      )
      .limit(1);

    const boostOrder = boostOrderRows[0];
    if (boostOrder) {
      const expectedTotal = Number(boostOrder.totalAmount);
      if (Math.abs(verifiedAmount - expectedTotal) >= 0.01) {
        return {
          success: false,
          message: `Payment amount mismatch for boost order: expected ₹${expectedTotal.toFixed(2)}, got ₹${verifiedAmount.toFixed(2)}`,
          status: 400,
        };
      }

      if (verifiedCurrency !== boostOrder.currency.toUpperCase()) {
        return {
          success: false,
          message: `Payment currency mismatch: expected ${boostOrder.currency}, got ${verifiedCurrency}`,
          status: 400,
        };
      }

      const invoiceNumber = `INV-${crypto.randomUUID().slice(0, 8).toUpperCase()}`;
      const txResult = await paymentRepository.activateBoostInTransaction({
        orderId: boostOrder.orderId,
        paymentId,
        paymentGateway: gateway,
        invoiceNumber,
        eventId,
        webhookPayload: body,
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
        message: 'Boost activated via Razorpay webhook',
        status: 200,
      };
    }

    return { success: false, message: `Order '${providerOrderId || internalOrderId}' not found in database`, status: 404 };
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
    // Compute analytics directly via SQL aggregate queries across the full tables (#17)
    // instead of summing truncated 500/1000-row slices in memory.
    const [txAggRows, listingAggRows] = await Promise.all([
      db
        .select({
          totalTxCount: sql<number>`count(*)::int`,
          totalRevenue: sql<number>`coalesce(sum(case when ${schema.boostTransactions.status} = 'completed' then coalesce(${schema.boostTransactions.totalAmount}, ${schema.boostTransactions.amount}, 0) else 0 end), 0)::float`,
        })
        .from(schema.boostTransactions),
      db
        .select({
          activeBoostsCount: sql<number>`coalesce(sum(case when ${schema.listings.isBoosted} = true and (${schema.listings.boostExpiresAt} is null or ${schema.listings.boostExpiresAt} > now()) then 1 else 0 end), 0)::int`,
          expiredBoostsCount: sql<number>`coalesce(sum(case when ${schema.listings.boostStatus} = 'expired' or (${schema.listings.isBoosted} = true and ${schema.listings.boostExpiresAt} <= now()) then 1 else 0 end), 0)::int`,
          totalDurationHours: sql<number>`coalesce(sum(coalesce(${schema.listings.boostDurationHours}, 0)), 0)::int`,
          boostedAdViews: sql<number>`coalesce(sum(coalesce(${schema.listings.boostViews}, 0)), 0)::int`,
          boostedAdImpressions: sql<number>`coalesce(sum(coalesce(${schema.listings.boostImpressions}, 0)), 0)::int`,
          boostedAdClicks: sql<number>`coalesce(sum(coalesce(${schema.listings.boostClicks}, 0)), 0)::int`,
        })
        .from(schema.listings),
    ]);

    const txAgg = (txAggRows as any[])[0] || {};
    const listingAgg = (listingAggRows as any[])[0] || {};

    const totalRevenue = Number(txAgg.totalRevenue) || 0;
    const totalTxCount = Number(txAgg.totalTxCount) || 0;
    const activeBoostsCount = Number(listingAgg.activeBoostsCount) || 0;
    const expiredBoostsCount = Number(listingAgg.expiredBoostsCount) || 0;
    const totalDurationHours = Number(listingAgg.totalDurationHours) || 0;
    const boostedAdViews = Number(listingAgg.boostedAdViews) || 0;
    const boostedAdImpressions = Number(listingAgg.boostedAdImpressions) || 0;
    const boostedAdClicks = Number(listingAgg.boostedAdClicks) || 0;

    const totalBoosts = Math.max(activeBoostsCount + expiredBoostsCount, totalTxCount);
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

  public async getAllTransactions(limit = 500, offset = 0): Promise<OrderTransaction[]> {
    return await boostRepository.findAllTransactions(limit, offset);
  }

  public async cancelBoostOrder(orderId: string, userId: string): Promise<{ success: boolean; error?: string; status: number }> {
    const success = await boostRepository.cancelOrder(orderId, userId);
    if (!success) {
      return {
        success: false,
        error: 'Could not cancel order. It may have already been processed or does not belong to you.',
        status: 400,
      };
    }
    return { success: true, status: 200 };
  }
}

export const boostService = new BoostService();
