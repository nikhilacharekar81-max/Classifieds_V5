import { NextRequest, NextResponse } from '@/src/shims/next-server';
import { categoryRepository } from '@/server/repositories/category.repository';
import { invalidateCategoryReferenceCache } from '@/server/cache/reference-data.cache';
import { getAuthenticatedUser } from '@/lib/auth/session';

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    const authContext = await getAuthenticatedUser(req);
    if (!authContext) {
      return NextResponse.json({ error: 'Unauthorized: Authentication required' }, { status: 401 });
    }
    if (!authContext.isAdmin && !authContext.isModerator) {
      return NextResponse.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
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

    const updated = await categoryRepository.update(id, updateData);
    if (!updated) {
      return NextResponse.json({ error: 'Category not found' }, { status: 404 });
    }

    await invalidateCategoryReferenceCache();

    return NextResponse.json(updated);
  } catch (error: any) {
    console.error(`API /api/admin/categories/${id} PUT error:`, error);
    return NextResponse.json({ error: error.message || 'Failed to update category' }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    const authContext = await getAuthenticatedUser(req);
    if (!authContext) {
      return NextResponse.json({ error: 'Unauthorized: Authentication required' }, { status: 401 });
    }
    if (!authContext.isAdmin) {
      return NextResponse.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    const success = await categoryRepository.delete(id);
    if (!success) {
      return NextResponse.json({ error: 'Category not found' }, { status: 404 });
    }

    await invalidateCategoryReferenceCache();

    return NextResponse.json({ success: true, message: 'Category deleted' });
  } catch (error: any) {
    console.error(`API /api/admin/categories/${id} DELETE error:`, error);
    return NextResponse.json({ error: error.message || 'Failed to delete category' }, { status: 500 });
  }
}
