import { NextRequest, NextResponse } from '@/src/shims/next-server';
import { getAuthenticatedUser } from '@/lib/auth/session';

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

  return NextResponse.json(
    {
      authenticated: true,
      user: authContext.user,
      adminRole: authContext.adminRole,
      isAdmin: authContext.isAdmin,
      isModerator: authContext.isModerator,
      isFinance: authContext.isFinance,
    },
    { status: 200, headers: noCacheHeaders }
  );
}
