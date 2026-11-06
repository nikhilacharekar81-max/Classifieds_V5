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
    if (!categoryId) {
      return NextResponse.json({ error: 'categoryId is required' }, { status: 400 });
    }

    const result = await listingService.createPostingOrder({
      categoryId,
      userId: authContext.userId,
    });

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: result.status });
    }

    return NextResponse.json(result.order, { status: 201 });
  } catch (err: any) {
    console.error('API /api/listings/create-order error:', err);
    return NextResponse.json({ error: err.message || 'Error creating posting order' }, { status: 500 });
  }
}
