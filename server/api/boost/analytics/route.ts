import { NextRequest, NextResponse } from '@/src/shims/next-server';
import { boostService } from '@/server/services/boost.service';
import { getAuthenticatedUser } from '@/lib/auth/session';

export async function GET(req: NextRequest) {
  const authContext = await getAuthenticatedUser(req);
  if (!authContext) {
    return NextResponse.json({ error: 'Unauthorized: Authentication required' }, { status: 401 });
  }
  if (!authContext.isAdmin && !authContext.isFinance) {
    return NextResponse.json({ error: 'Forbidden: Admin or Finance permission required' }, { status: 403 });
  }

  const analytics = await boostService.getBoostAnalytics();
  return NextResponse.json(analytics);
}
