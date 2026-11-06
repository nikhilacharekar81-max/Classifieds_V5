import { NextRequest, NextResponse } from '@/src/shims/next-server';
import { getAuthenticatedUser } from '@/lib/auth/session';
import { listingService } from '@/server/services/listing.service';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const authContext = await getAuthenticatedUser(req);
  const noCacheHeaders = {
    'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
    Pragma: 'no-cache',
    Expires: '0',
  };

  if (!authContext) {
    return NextResponse.json(
      { authenticated: false, user: null },
      { status: 200, headers: noCacheHeaders }
    );
  }

  const favoriteListingIds = await listingService.getFavoriteListingIds(authContext.userId);

  return NextResponse.json(
    {
      authenticated: true,
      user: authContext.user,
      adminRole: authContext.adminRole,
      isAdmin: authContext.isAdmin,
      isModerator: authContext.isModerator,
      isFinance: authContext.isFinance,
      impersonatedBy: authContext.impersonatedBy || null,
      favoriteListingIds,
    },
    { status: 200, headers: noCacheHeaders }
  );
}
