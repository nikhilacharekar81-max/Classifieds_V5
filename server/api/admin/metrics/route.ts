import { NextRequest, NextResponse } from '@/src/shims/next-server';
import { adminService } from '@/server/services/admin.service';
import { getAuthenticatedUser } from '@/lib/auth/session';
import { hasPermission } from '@/lib/auth/roles';

export async function GET(req: NextRequest) {
  try {
    const authContext = req.auth || (await getAuthenticatedUser(req));
    if (!authContext) {
      return NextResponse.json({ error: 'Unauthorized: Authentication required' }, { status: 401 });
    }
    if (!hasPermission(authContext.adminRole, 'canManageSettings')) {
      return NextResponse.json({ error: 'Forbidden: Insufficient role permissions' }, { status: 403 });
    }

    const metrics = await adminService.getDashboardMetrics();
    return NextResponse.json(metrics);
  } catch (error: any) {
    console.error('API /api/admin/metrics error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
