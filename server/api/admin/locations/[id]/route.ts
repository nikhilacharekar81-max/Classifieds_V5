import { NextRequest, NextResponse } from '@/src/shims/next-server';
import { adminService } from '@/server/services/admin.service';
import { getAuthenticatedUser } from '@/lib/auth/session';
import { hasPermission } from '@/lib/auth/roles';
import { slugify } from '@/lib/utils/seoAndUrlHelper';

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
    if (!hasPermission(authContext.adminRole, 'canManageSettings')) {
      return NextResponse.json({ error: 'Forbidden: Insufficient role permissions' }, { status: 403 });
    }

    const { name, type, slug, code, parentId, popular, latitude, longitude, orderIndex } = body;

    const lat = latitude !== undefined && latitude !== null ? Number(latitude) : undefined;
    const lon = longitude !== undefined && longitude !== null ? Number(longitude) : undefined;
    
    if (lat !== undefined && (isNaN(lat) || !isFinite(lat) || lat < -90 || lat > 90)) {
        return NextResponse.json({ error: 'Invalid latitude' }, { status: 400 });
    }
    if (lon !== undefined && (isNaN(lon) || !isFinite(lon) || lon < -180 || lon > 180)) {
        return NextResponse.json({ error: 'Invalid longitude' }, { status: 400 });
    }

    const updateData: any = {};
    if (name !== undefined) updateData.name = name.trim();
    if (slug !== undefined) updateData.slug = slugify(slug);
    else if (name !== undefined) updateData.slug = slugify(name);
    if (type !== undefined) updateData.type = type;
    if (parentId !== undefined) updateData.parentId = parentId;
    if (code !== undefined) updateData.code = code;
    if (popular !== undefined) updateData.popular = popular;
    if (lat !== undefined) updateData.latitude = lat;
    if (lon !== undefined) updateData.longitude = lon;
    if (orderIndex !== undefined) updateData.orderIndex = orderIndex;

    const updated = await adminService.updateLocation(
      id, 
      updateData,
      { id: authContext.userId, name: authContext.user.name, ipAddress: authContext.ipAddress }
    );
    if (!updated) {
      return NextResponse.json({ error: 'Location not found' }, { status: 404 });
    }

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
    const authContext = req.auth || (await getAuthenticatedUser(req));
    if (!authContext) {
      return NextResponse.json({ error: 'Unauthorized: Authentication required' }, { status: 401 });
    }
    if (!hasPermission(authContext.adminRole, 'canManageSettings')) {
      return NextResponse.json({ error: 'Forbidden: Insufficient role permissions' }, { status: 403 });
    }

    const success = await adminService.deleteLocation(
      id,
      { id: authContext.userId, name: authContext.user.name, ipAddress: authContext.ipAddress }
    );
    if (!success) {
      return NextResponse.json({ error: 'Location not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true, message: 'Location deleted' });
  } catch (error: any) {
    console.error(`API /api/admin/locations/${id} DELETE error:`, error);
    return NextResponse.json({ error: error.message || 'Failed to delete location' }, { status: 500 });
  }
}
