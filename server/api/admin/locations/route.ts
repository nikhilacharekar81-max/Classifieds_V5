import { NextRequest, NextResponse } from '@/src/shims/next-server';
import { locationRepository } from '@/server/repositories/location.repository';
import { invalidateLocationReferenceCache } from '@/server/cache/reference-data.cache';
import { getAuthenticatedUser } from '@/lib/auth/session';

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
    const authContext = await getAuthenticatedUser(req);
    if (!authContext) {
      return NextResponse.json({ error: 'Unauthorized: Authentication required' }, { status: 401 });
    }
    if (!authContext.isAdmin && !authContext.isModerator) {
      return NextResponse.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    const body = await req.json();
    if (!body.name) {
      return NextResponse.json({ error: 'Location name is required' }, { status: 400 });
    }

    const slug = body.slug || body.name.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-');
    const geoId = body.geoId || `g${Math.floor(100 + Math.random() * 900)}`;
    const id = body.id || `loc_${slug.replace(/[^a-z0-9]/g, '_')}_${Date.now().toString(36)}`;

    const created = await locationRepository.create({
      id,
      name: body.name,
      slug,
      geoId,
      type: body.type || 'city',
      parentId: body.parentId || null,
      code: body.code || null,
      popular: body.popular ?? false,
      latitude: body.latitude ? Number(body.latitude) : undefined,
      longitude: body.longitude ? Number(body.longitude) : undefined,
      orderIndex: body.orderIndex || 0,
    });

    await invalidateLocationReferenceCache();

    return NextResponse.json(created, { status: 201 });
  } catch (error: any) {
    console.error('API /api/admin/locations POST error:', error);
    return NextResponse.json({ error: error.message || 'Failed to create location' }, { status: 500 });
  }
}
