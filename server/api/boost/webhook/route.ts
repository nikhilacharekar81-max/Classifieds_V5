import { NextRequest, NextResponse } from '@/src/shims/next-server';
import { boostService } from '@/server/services/boost.service';
import crypto from 'node:crypto';

export async function POST(req: NextRequest) {
  try {
    // 1. Fail closed if webhook secret is not configured
    const secret = process.env.PAYMENT_WEBHOOK_SECRET?.trim();
    if (!secret) {
      return NextResponse.json(
        { error: 'Payment webhook secret is not configured' },
        { status: 503 }
      );
    }

    // 2. Require signature header
    const signature =
      req.headers.get('x-razorpay-signature') ||
      req.headers.get('stripe-signature') ||
      req.headers.get('x-webhook-signature');

    if (!signature) {
      return NextResponse.json(
        { error: 'Missing required webhook signature header' },
        { status: 401 }
      );
    }

    const rawBody = await req.text();

    // 3. Cryptographically verify webhook signature before parsing or processing
    if (!boostService.verifyWebhookSignature({ rawBody, signature, secret })) {
      return NextResponse.json({ error: 'Invalid webhook signature' }, { status: 401 });
    }

    let body: any;
    try {
      body = JSON.parse(rawBody);
    } catch {
      return NextResponse.json({ error: 'Invalid JSON payload' }, { status: 400 });
    }

    const { eventId, eventType, orderId, paymentId, paymentGateway, amount, currency } = body;
    if (!eventId || !orderId || !paymentId || !paymentGateway) {
      return NextResponse.json(
        { error: 'eventId, orderId, paymentId, and paymentGateway are required' },
        { status: 400 }
      );
    }

    const result = await boostService.handleWebhook({
      eventId,
      eventType: eventType || 'payment.captured',
      orderId,
      paymentId,
      paymentGateway,
      amount,
      currency,
      payload: body,
    });

    if (!result.success) {
      return NextResponse.json({ error: result.message }, { status: result.status || 400 });
    }

    return NextResponse.json(result, { status: result.status || 200 });
  } catch (err: any) {
    console.error('API /api/boost/webhook error:', err);
    return NextResponse.json({ error: err.message || 'Error processing webhook' }, { status: 500 });
  }
}
