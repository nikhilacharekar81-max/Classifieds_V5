import { NextRequest, NextResponse } from '@/src/shims/next-server';
import { getAuthenticatedUser } from '@/lib/auth/session';
import { listingService } from '@/server/services/listing.service';

export async function POST(req: NextRequest) {
  try {
    const authContext = await getAuthenticatedUser(req);
    if (!authContext) {
      return NextResponse.json({ error: 'Unauthorized: Authentication required' }, { status: 401 });
    }

    const body = await req.json();
    const orderId = body.orderId ? String(body.orderId).trim() : undefined;
    const paymentGateway = body.paymentGateway ? String(body.paymentGateway).trim() : 'Razorpay';

    if (!orderId) {
      return NextResponse.json({ error: 'orderId is required' }, { status: 400 });
    }

    const result = await listingService.payPostingOrder({
      orderId,
      paymentGateway,
      userId: authContext.userId,
    });

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: result.status });
    }

    return NextResponse.json(result, { status: 200 });
  } catch (err: any) {
    console.error('API /api/listings/pay-order error:', err);
    return NextResponse.json({ error: err.message || 'Error executing posting checkout' }, { status: 500 });
  }
}
