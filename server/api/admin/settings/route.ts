import { NextRequest, NextResponse } from '@/src/shims/next-server';
import { adminService } from '@/server/services/admin.service';

export async function GET(req: NextRequest) {
  const authContext = req.auth;
  if (!authContext) {
    return NextResponse.json({ error: 'Unauthorized: Authentication required' }, { status: 401 });
  }
  const settings = await adminService.getSettings();
  return NextResponse.json(settings);
}

export async function PUT(req: NextRequest) {
  try {
    const authContext = req.auth;
    if (!authContext) {
      return NextResponse.json({ error: 'Unauthorized: Authentication required' }, { status: 401 });
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
