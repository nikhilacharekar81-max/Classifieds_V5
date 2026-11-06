import { NextRequest, NextResponse } from '@/src/shims/next-server';
import { adminService } from '@/server/services/admin.service';
import { categoryRepository } from '@/server/repositories/category.repository';
import { getAuthenticatedUser } from '@/lib/auth/session';
import { hasPermission } from '@/lib/auth/roles';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const categoryId = searchParams.get('categoryId') || undefined;
    const fields = await adminService.getCustomFields(categoryId);
    return NextResponse.json(fields);
  } catch (error: any) {
    console.error('API /api/admin/attributes GET error:', error);
    return NextResponse.json({ error: error.message || 'Failed to fetch custom fields' }, { status: 500 });
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
    if (!body.categoryId || !body.name || !body.label || !body.type) {
      return NextResponse.json({ error: 'categoryId, name, label, and type are required' }, { status: 400 });
    }

    const created = await adminService.addCustomField(
      {
        categoryId: body.categoryId,
        name: body.name,
        label: body.label,
        type: body.type,
        options: body.options,
        unit: body.unit,
        required: body.required ?? false,
        filterable: body.filterable ?? true,
        orderIndex: body.orderIndex || 0,
      },
      { id: authContext.userId, name: authContext.user.name, ipAddress: authContext.ipAddress }
    );

    return NextResponse.json(created, { status: 201 });
  } catch (error: any) {
    console.error('API /api/admin/attributes POST error:', error);
    return NextResponse.json({ error: error.message || 'Failed to create custom field' }, { status: 500 });
  }
}
