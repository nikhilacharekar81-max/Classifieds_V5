import { NextRequest, NextResponse } from '@/src/shims/next-server';
import { boostService } from '@/server/services/boost.service';
import { getAuthenticatedUser } from '@/lib/auth/session';

export async function POST(req: NextRequest) {
  try {
    const authContext = await getAuthenticatedUser(req);
    if (!authContext) {
      return NextResponse.json({ error: 'Unauthorized: Authentication required to boost an ad' }, { status: 401 });
    }

    const { listingId, packageId } = await req.json();
    if (!listingId || !packageId) {
      return NextResponse.json(
        { error: 'listingId and packageId are required' },
        { status: 400 }
      );
    }

    // Derive userId strictly from verified server session
    const result = await boostService.createBoostOrder({
      listingId,
      packageId,
      userId: authContext.userId,
    });

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: result.status });
    }

    return NextResponse.json(result.order, { status: 201 });
  } catch (err: any) {
    console.error('API /api/boost/create-order error:', err);
    return NextResponse.json({ error: err.message || 'Error creating boost order' }, { status: 500 });
  }
}
