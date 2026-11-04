import { NextRequest, NextResponse } from '@/src/shims/next-server';
import { listingService } from '@/server/services/listing.service';
import { getAuthenticatedUser } from '@/lib/auth/session';

export async function POST(req: NextRequest) {
  try {
    const authContext = await getAuthenticatedUser(req);
    if (!authContext) {
      return NextResponse.json({ error: 'Unauthorized: Authentication required' }, { status: 401 });
    }

    const { title, excludeListingId, sellerId: bodySellerId } = await req.json();
    if (!title || typeof title !== 'string' || !title.trim()) {
      return NextResponse.json(
        { isDuplicate: false, error: 'title is required' },
        { status: 400 }
      );
    }

    // Derive sellerId strictly from verified session (unless caller is admin)
    const effectiveSellerId = authContext.isAdmin && bodySellerId ? bodySellerId : authContext.userId;

    const result = await listingService.checkDuplicateTitle(effectiveSellerId, title.trim(), excludeListingId);
    return NextResponse.json(result);
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Error checking title' }, { status: 500 });
  }
}
