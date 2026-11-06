import { NextRequest, NextResponse } from '@/src/shims/next-server';
import { adminService } from '@/server/services/admin.service';

export async function GET(req: NextRequest) {
  try {
    const authContext = req.auth;
    if (!authContext) {
      return NextResponse.json({ error: 'Unauthorized: Authentication required' }, { status: 401 });
    }

    const metrics = await adminService.getDashboardMetrics();
    return NextResponse.json(metrics);
  } catch (error: any) {
    console.error('API /api/admin/metrics error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
