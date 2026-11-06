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
    const categoryId = body.categoryId?.trim();
    const subcategoryId = body.subcategoryId ? String(body.subcategoryId).trim() : undefined;
    const purpose = body.purpose ? String(body.purpose).trim() : 'posting_fee';
    const listingId = body.listingId ? String(body.listingId).trim() : undefined;
    const amount = body.amount !== undefined ? Number(body.amount) : undefined;
    if (!categoryId) {
      return NextResponse.json({ error: 'categoryId is required' }, { status: 400 });
    }

    const result = await listingService.createPostingOrder({
      categoryId,
      subcategoryId,
      userId: authContext.userId,
      purpose,
      listingId,
      amount,
    });

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: result.status });
    }

    return NextResponse.json({
      success: true,
      order: result.order,
      orderId: result.order?.orderId,
      providerOrderId: result.order?.providerOrderId,
      keyId: (result as any).keyId,
      amount: result.order?.amount,
      currency: result.order?.currency || 'INR',
    }, { status: 201 });
  } catch (err: any) {
    console.error('API /api/listings/create-order error:', err);
    return NextResponse.json({ error: err.message || 'Error creating posting order' }, { status: 500 });
  }
}
