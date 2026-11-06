import { NextRequest, NextResponse } from '@/src/shims/next-server';
import { boostService, getRazorpayConfig } from '@/server/services/boost.service';

export async function POST(req: NextRequest) {
  try {
    const config = getRazorpayConfig();
    const secret = config.webhookSecret || config.keySecret;
    if (!secret) {
      return NextResponse.json(
        { error: 'Razorpay webhook secret is not configured on the server' },
        { status: 503 }
      );
    }

    // Require signature header
    const signature =
      req.headers.get('x-razorpay-signature') ||
      req.headers.get('x-webhook-signature') ||
      req.headers.get('stripe-signature');

    if (!signature) {
      return NextResponse.json(
        { error: 'Missing required webhook signature header (x-razorpay-signature)' },
        { status: 401 }
      );
    }

    const rawBody = await req.text();

    // Cryptographically verify webhook signature before parsing or processing
    if (!boostService.verifyWebhookSignature({ rawBody, signature, secret })) {
      return NextResponse.json({ error: 'Invalid webhook signature' }, { status: 401 });
    }

    let body: any;
    try {
      body = JSON.parse(rawBody);
    } catch {
      return NextResponse.json({ error: 'Invalid JSON payload' }, { status: 400 });
    }

    const eventId = req.headers.get('x-razorpay-event-id') || body.event_id || body.id;

    const result = await boostService.handleWebhook({
      eventId: eventId || undefined,
      payload: body,
      paymentGateway: 'Razorpay',
    });

    if (!result.success) {
      return NextResponse.json({ error: result.message }, { status: result.status || 400 });
    }

    return NextResponse.json(result, { status: result.status || 200 });
  } catch (err: any) {
    console.error('API /api/boost/webhook error:', err);
    return NextResponse.json({ error: err.message || 'Error processing Razorpay webhook' }, { status: 500 });
  }
}
