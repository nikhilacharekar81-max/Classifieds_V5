import { NextRequest, NextResponse } from '@/src/shims/next-server';
import { adminService } from '@/server/services/admin.service';
import { categoryRepository } from '@/server/repositories/category.repository';
import { getAuthenticatedUser } from '@/lib/auth/session';
import { hasPermission } from '@/lib/auth/roles';

export async function GET() {
  try {
    const categories = await categoryRepository.findAll();
    const customFields = await categoryRepository.findAllCustomFields();
    return NextResponse.json({ categories, customFields });
  } catch (error: any) {
    console.error('API /api/admin/categories GET error:', error);
    return NextResponse.json({ error: error.message || 'Failed to fetch categories' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const authContext = req.auth || (await getAuthenticatedUser(req));
    if (!authContext) {
      return NextResponse.json({ error: 'Unauthorized: Authentication required' }, { status: 401 });
    }
    if (!hasPermission(authContext.adminRole, 'canManageCategories')) {
      return NextResponse.json({ error: 'Forbidden: Insufficient role permissions' }, { status: 403 });
    }

    const body = await req.json();
    if (!body.name) {
      return NextResponse.json({ error: 'Category name is required' }, { status: 400 });
    }

    const created = await adminService.addCategory(
      {
        name: body.name,
        slug: body.slug || body.name.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-'),
        icon: body.icon || 'Package',
        parentId: body.parentId || null,
        orderIndex: body.order || body.orderIndex || 0,
        order: body.order || body.orderIndex || 0,
        isActive: body.isActive ?? true,
        seoTitle: body.seoTitle || null,
        seoDescription: body.seoDescription || null,
        isPaid: body.isPaid ?? false,
        postingFee: body.postingFee !== undefined && body.postingFee !== null ? Number(body.postingFee) : 0,
        freeListingsQuota: body.freeListingsQuota ?? 3,
      },
      { id: authContext.userId, name: authContext.user.name, ipAddress: authContext.ipAddress }
    );

    return NextResponse.json(created, { status: 201 });
  } catch (error: any) {
    console.error('API /api/admin/categories POST error:', error);
    return NextResponse.json({ error: error.message || 'Failed to create category' }, { status: 500 });
  }
}
