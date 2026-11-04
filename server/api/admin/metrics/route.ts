import { NextRequest, NextResponse } from '@/src/shims/next-server';
import { adminService } from '@/server/services/admin.service';
import { getAuthenticatedUser } from '@/lib/auth/session';

export async function GET(req: NextRequest) {
  try {
    const authContext = await getAuthenticatedUser(req);
    if (!authContext) {
      return NextResponse.json({ error: 'Unauthorized: Authentication required' }, { status: 401 });
    }
    if (!authContext.isAdmin && !authContext.isModerator && !authContext.isFinance) {
      return NextResponse.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    const metrics = await adminService.getDashboardMetrics();
    return NextResponse.json(metrics);
  } catch (error: any) {
    console.error('API /api/admin/metrics error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
