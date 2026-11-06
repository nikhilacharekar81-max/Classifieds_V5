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
    const authContext = req.auth || await getAuthenticatedUser(req);
    if (!authContext) {
      return NextResponse.json({ error: 'Unauthorized: Authentication required' }, { status: 401 });
    }
    if (!hasPermission(authContext.adminRole, 'canManageCategories')) {
      return NextResponse.json({ error: 'Forbidden: Category management permission required' }, { status: 403 });
    }

    const body = await req.json();
    const updateData: any = {};
    if (body.name !== undefined) updateData.name = body.name;
    if (body.slug !== undefined) updateData.slug = body.slug;
    if (body.icon !== undefined) updateData.icon = body.icon;
    if (body.parentId !== undefined) updateData.parentId = body.parentId;
    if (body.order !== undefined) updateData.orderIndex = body.order;
    if (body.isActive !== undefined) updateData.isActive = body.isActive;
    if (body.seoTitle !== undefined) updateData.seoTitle = body.seoTitle;
    if (body.seoDescription !== undefined) updateData.seoDescription = body.seoDescription;
    if (body.isPaid !== undefined) updateData.isPaid = body.isPaid;
    if (body.postingFee !== undefined) updateData.postingFee = String(body.postingFee);
    if (body.freeListingsQuota !== undefined) updateData.freeListingsQuota = body.freeListingsQuota;

    const updated = await adminService.updateCategory(
      id,
      updateData,
      { id: authContext.userId, name: authContext.user.name, ipAddress: authContext.ipAddress }
    );

    if (!updated) {
      return NextResponse.json({ error: 'Category not found' }, { status: 404 });
    }

    return NextResponse.json(updated);
  } catch (error: any) {
    console.error(`API /api/admin/categories/${id} PUT error:`, error);
    const status = String(error?.message || '').includes('cycle') ? 400 : 500;
    return NextResponse.json({ error: error.message || 'Failed to update category' }, { status });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    const authContext = req.auth || await getAuthenticatedUser(req);
    if (!authContext) {
      return NextResponse.json({ error: 'Unauthorized: Authentication required' }, { status: 401 });
    }
    if (!hasPermission(authContext.adminRole, 'canManageCategories')) {
      return NextResponse.json({ error: 'Forbidden: Category management permission required' }, { status: 403 });
    }

    const success = await adminService.deleteCategory(
      id,
      { id: authContext.userId, name: authContext.user.name, ipAddress: authContext.ipAddress }
    );

    if (!success) {
      return NextResponse.json({ error: 'Category not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true, message: 'Category deleted' });
  } catch (error: any) {
    console.error(`API /api/admin/categories/${id} DELETE error:`, error);
    const isConflict =
      error?.code === 'CATEGORY_HAS_LISTINGS' ||
      error?.code === '23503' ||
      error?.cause?.code === '23503' ||
      String(error?.message || '').includes('still contain listings');
    return NextResponse.json(
      { error: error.message || 'Failed to delete category' },
      { status: isConflict ? 409 : 500 }
    );
  }
}
