import { NextRequest, NextResponse } from '@/src/shims/next-server';
import { adminService } from '@/server/services/admin.service';
import { getAuthenticatedUser } from '@/lib/auth/session';
import { canAccessAdmin, hasPermission } from '@/lib/auth/roles';

export async function GET(req: NextRequest) {
  const authContext = req.auth || await getAuthenticatedUser(req);
  if (!authContext) {
    return NextResponse.json({ error: 'Unauthorized: Authentication required' }, { status: 401 });
  }
  if (!canAccessAdmin(authContext.adminRole)) {
    return NextResponse.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
  }
  const settings = await adminService.getSettings();
  return NextResponse.json(settings);
}

export async function PUT(req: NextRequest) {
  try {
    const authContext = req.auth || await getAuthenticatedUser(req);
    if (!authContext) {
      return NextResponse.json({ error: 'Unauthorized: Authentication required' }, { status: 401 });
    }
    if (!hasPermission(authContext.adminRole, 'canManageSettings')) {
      return NextResponse.json({ error: 'Forbidden: Settings management permission required' }, { status: 403 });
    }

    const body = await req.json();
    const updated = await adminService.updateSettings(body, {
      id: authContext.userId,
      name: authContext.user.name,
      ipAddress: authContext.ipAddress,
    });
    return NextResponse.json(updated);
  } catch (error: any) {
    console.error('API /api/admin/settings PUT error:', error);
    const status = error?.code === 'VALIDATION_ERROR' ? 400 : 500;
    return NextResponse.json({ error: error.message || 'Failed to update settings' }, { status });
  }
}
