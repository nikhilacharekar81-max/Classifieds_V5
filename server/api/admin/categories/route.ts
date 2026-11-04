import { NextRequest, NextResponse } from '@/src/shims/next-server';
import { categoryRepository } from '@/server/repositories/category.repository';
import { invalidateCategoryReferenceCache } from '@/server/cache/reference-data.cache';
import { getAuthenticatedUser } from '@/lib/auth/session';

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
    const authContext = await getAuthenticatedUser(req);
    if (!authContext) {
      return NextResponse.json({ error: 'Unauthorized: Authentication required' }, { status: 401 });
    }
    if (!authContext.isAdmin && !authContext.isModerator) {
      return NextResponse.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    const body = await req.json();
    if (!body.name) {
      return NextResponse.json({ error: 'Category name is required' }, { status: 400 });
    }

    const slug = body.slug || body.name.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-');
    const prefix = body.parentId ? 'sub_' : 'cat_';
    const id = body.id || `${prefix}${slug.replace(/[^a-z0-9]/g, '_')}_${Date.now().toString(36)}`;

    const created = await categoryRepository.create({
      id,
      name: body.name,
      slug,
      icon: body.icon || 'Package',
      parentId: body.parentId || null,
      orderIndex: body.order || 0,
      isActive: body.isActive ?? true,
      seoTitle: body.seoTitle || null,
      seoDescription: body.seoDescription || null,
      isPaid: body.isPaid ?? false,
      postingFee: body.postingFee ? Number(body.postingFee) : 0,
      freeListingsQuota: body.freeListingsQuota ?? 3,
    });

    await invalidateCategoryReferenceCache();

    return NextResponse.json(created, { status: 201 });
  } catch (error: any) {
    console.error('API /api/admin/categories POST error:', error);
    return NextResponse.json({ error: error.message || 'Failed to create category' }, { status: 500 });
  }
}
