import { NextRequest, NextResponse } from '@/src/shims/next-server';
import { adminService } from '@/server/services/admin.service';
import { getAuthenticatedUser } from '@/lib/auth/session';
import { hasPermission } from '@/lib/auth/roles';

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const authContext = req.auth || (await getAuthenticatedUser(req));
    if (!authContext) {
      return NextResponse.json({ error: 'Unauthorized: Authentication required' }, { status: 401 });
    }
    if (!hasPermission(authContext.adminRole, 'canManageCategories')) {
      return NextResponse.json({ error: 'Forbidden: Insufficient role permissions' }, { status: 403 });
    }

    const { id } = params;
    const body = await req.json();

    const updated = await adminService.updateCustomField(
      id,
      body,
      { id: authContext.userId, name: authContext.user.name, ipAddress: authContext.ipAddress }
    );

    if (!updated) {
      return NextResponse.json({ error: 'Custom field not found' }, { status: 404 });
    }

    return NextResponse.json(updated);
  } catch (error: any) {
    console.error(`API /api/admin/attributes/${params.id} PUT error:`, error);
    return NextResponse.json({ error: error.message || 'Failed to update custom field' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const authContext = req.auth || (await getAuthenticatedUser(req));
    if (!authContext) {
      return NextResponse.json({ error: 'Unauthorized: Authentication required' }, { status: 401 });
    }
    if (!hasPermission(authContext.adminRole, 'canManageCategories')) {
      return NextResponse.json({ error: 'Forbidden: Insufficient role permissions' }, { status: 403 });
    }

    const { id } = params;
    const success = await adminService.deleteCustomField(
      id,
      { id: authContext.userId, name: authContext.user.name, ipAddress: authContext.ipAddress }
    );

    if (!success) {
      return NextResponse.json({ error: 'Custom field not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error(`API /api/admin/attributes/${params.id} DELETE error:`, error);
    return NextResponse.json({ error: error.message || 'Failed to delete custom field' }, { status: 500 });
  }
}
