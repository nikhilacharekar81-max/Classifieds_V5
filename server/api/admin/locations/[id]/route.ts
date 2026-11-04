import { NextRequest, NextResponse } from '@/src/shims/next-server';
import { locationRepository } from '@/server/repositories/location.repository';
import { invalidateLocationReferenceCache } from '@/server/cache/reference-data.cache';
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
    if (body.type !== undefined) updateData.type = body.type;
    if (body.parentId !== undefined) updateData.parentId = body.parentId;
    if (body.code !== undefined) updateData.code = body.code;
    if (body.popular !== undefined) updateData.popular = body.popular;
    if (body.latitude !== undefined) updateData.latitude = body.latitude;
    if (body.longitude !== undefined) updateData.longitude = body.longitude;
    if (body.orderIndex !== undefined) updateData.orderIndex = body.orderIndex;

    const updated = await locationRepository.update(id, updateData);
    if (!updated) {
      return NextResponse.json({ error: 'Location not found' }, { status: 404 });
    }

    await invalidateLocationReferenceCache();

    return NextResponse.json(updated);
  } catch (error: any) {
    console.error(`API /api/admin/locations/${id} PUT error:`, error);
    return NextResponse.json({ error: error.message || 'Failed to update location' }, { status: 500 });
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

    const success = await locationRepository.delete(id);
    if (!success) {
      return NextResponse.json({ error: 'Location not found' }, { status: 404 });
    }

    await invalidateLocationReferenceCache();

    return NextResponse.json({ success: true, message: 'Location deleted' });
  } catch (error: any) {
    console.error(`API /api/admin/locations/${id} DELETE error:`, error);
    return NextResponse.json({ error: error.message || 'Failed to delete location' }, { status: 500 });
  }
}
