import { NextRequest, NextResponse } from '@/src/shims/next-server';
import crypto from 'node:crypto';
import { slugify } from '@/lib/utils/seoAndUrlHelper';
import { adminService } from '@/server/services/admin.service';
import { locationRepository } from '@/server/repositories/location.repository';
import { getAuthenticatedUser } from '@/lib/auth/session';
import { hasPermission } from '@/lib/auth/roles';

export async function GET() {
  try {
    const locations = await locationRepository.findAll();
    return NextResponse.json(locations);
  } catch (error: any) {
    console.error('API /api/admin/locations GET error:', error);
    return NextResponse.json({ error: error.message || 'Failed to fetch locations' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const authContext = req.auth || (await getAuthenticatedUser(req));
    if (!authContext) {
      return NextResponse.json({ error: 'Unauthorized: Authentication required' }, { status: 401 });
    }
    if (!hasPermission(authContext.adminRole, 'canManageSettings')) {
      return NextResponse.json({ error: 'Forbidden: Insufficient role permissions' }, { status: 403 });
    }

    const body = await req.json();
    const { name, type, slug, code, geoId, parentId, latitude, longitude, popular, orderIndex } = body;
    if (typeof name !== 'string' || !name.trim()) {
      return NextResponse.json({ error: 'Valid location name is required' }, { status: 400 });
    }
    const locationType = type || 'city';
    if (!['city', 'state', 'locality'].includes(locationType)) {
      return NextResponse.json({ error: 'Invalid location type' }, { status: 400 });
    }

    const lat = latitude !== undefined && latitude !== null ? Number(latitude) : undefined;
    const lon = longitude !== undefined && longitude !== null ? Number(longitude) : undefined;
    
    if (lat !== undefined && (isNaN(lat) || !isFinite(lat) || lat < -90 || lat > 90)) {
        return NextResponse.json({ error: 'Invalid latitude' }, { status: 400 });
    }
    if (lon !== undefined && (isNaN(lon) || !isFinite(lon) || lon < -180 || lon > 180)) {
        return NextResponse.json({ error: 'Invalid longitude' }, { status: 400 });
    }

    const created = await adminService.addLocation(
      {
        type: locationType,
        name: name.trim(),
        slug: slugify(slug || name),
        code: code || null,
        geoId: geoId || `g${crypto.randomUUID().replace(/-/g, '').slice(0, 31)}`,
        parentId: parentId || null,
        latitude: lat,
        longitude: lon,
        popular: popular ?? false,
        orderIndex: orderIndex || 0,
      },
      { id: authContext.userId, name: authContext.user.name, ipAddress: authContext.ipAddress }
    );

    return NextResponse.json(created, { status: 201 });
  } catch (error: any) {
    console.error('API /api/admin/locations POST error:', error);
    return NextResponse.json({ error: error.message || 'Failed to create location' }, { status: 500 });
  }
}
