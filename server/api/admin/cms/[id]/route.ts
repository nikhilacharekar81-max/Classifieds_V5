import { NextRequest, NextResponse } from '@/src/shims/next-server';
import { adminService } from '@/server/services/admin.service';
import { getAuthenticatedUser } from '@/lib/auth/session';
import { hasPermission } from '@/lib/auth/roles';

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    const authContext = req.auth || (await getAuthenticatedUser(req));
    if (!authContext) {
      return NextResponse.json({ error: 'Unauthorized: Authentication required' }, { status: 401 });
    }
    if (!hasPermission(authContext.adminRole, 'canManageCms')) {
      return NextResponse.json({ error: 'Forbidden: Insufficient role permissions' }, { status: 403 });
    }

    const body = await req.json();
    const updateFields: any = {};
    if (body.title !== undefined) updateFields.title = body.title;
    if (body.slug !== undefined) updateFields.slug = body.slug;
    if (body.content !== undefined) updateFields.content = body.content;
    if (body.seoTitle !== undefined) updateFields.seoTitle = body.seoTitle;
    if (body.seoDescription !== undefined) updateFields.seoDescription = body.seoDescription;
    if (body.status !== undefined) updateFields.isActive = body.status === 'published';
    if (body.isActive !== undefined) updateFields.isActive = Boolean(body.isActive);

    const updated = await adminService.updateCmsPage(
      id, 
      updateFields,
      { id: authContext.userId, name: authContext.user.name, ipAddress: authContext.ipAddress }
    );

    if (!updated) {
      return NextResponse.json({ error: 'CMS page not found' }, { status: 404 });
    }

    return NextResponse.json(updated);
  } catch (error: any) {
    console.error(`API /api/admin/cms/${id} PUT error:`, error);
    return NextResponse.json({ error: error.message || 'Failed to update CMS page' }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    const authContext = req.auth || (await getAuthenticatedUser(req));
    if (!authContext) {
      return NextResponse.json({ error: 'Unauthorized: Authentication required' }, { status: 401 });
    }
    if (!hasPermission(authContext.adminRole, 'canManageCms')) {
      return NextResponse.json({ error: 'Forbidden: Insufficient role permissions' }, { status: 403 });
    }

    const success = await adminService.deleteCmsPage(
      id,
      { id: authContext.userId, name: authContext.user.name, ipAddress: authContext.ipAddress }
    );
    if (!success) {
      return NextResponse.json({ error: 'CMS page not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true, message: 'CMS page deleted' });
  } catch (error: any) {
    console.error(`API /api/admin/cms/${id} DELETE error:`, error);
    return NextResponse.json({ error: error.message || 'Failed to delete CMS page' }, { status: 500 });
  }
}
