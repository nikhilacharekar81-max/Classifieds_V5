import { NextRequest, NextResponse } from '@/src/shims/next-server';
import { listingService } from '@/server/services/listing.service';
import { getAuthenticatedUser } from '@/lib/auth/session';

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const authContext = await getAuthenticatedUser(req);
    if (!authContext) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const { id } = params;
    const result = await listingService.toggleFavorite(id, authContext.userId);
    return NextResponse.json(result);
  } catch (error: any) {
    console.error('API /api/listings/:id/favorite POST error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
