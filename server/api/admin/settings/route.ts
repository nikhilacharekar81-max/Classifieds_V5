import { NextRequest, NextResponse } from '@/src/shims/next-server';
import { adminService } from '@/server/services/admin.service';
import { getAuthenticatedUser } from '@/lib/auth/session';

export async function GET(req: NextRequest) {
  const authContext = await getAuthenticatedUser(req);
  if (!authContext) {
    return NextResponse.json({ error: 'Unauthorized: Authentication required' }, { status: 401 });
  }
  if (!authContext.isAdmin) {
    return NextResponse.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
  }
  const settings = await adminService.getSettings();
  return NextResponse.json(settings);
}

export async function PUT(req: NextRequest) {
  try {
    const authContext = await getAuthenticatedUser(req);
    if (!authContext) {
      return NextResponse.json({ error: 'Unauthorized: Authentication required' }, { status: 401 });
    }
    if (!authContext.isSuperAdmin && !authContext.isAdmin) {
      return NextResponse.json({ error: 'Forbidden: Admin permission required' }, { status: 403 });
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
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
