import { NextRequest, NextResponse } from '@/src/shims/next-server';
import { locationRepository } from '@/server/repositories/location.repository';
import { invalidateLocationReferenceCache } from '@/server/cache/reference-data.cache';

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
    const authContext = req.auth;
    if (!authContext) {
      return NextResponse.json({ error: 'Unauthorized: Authentication required' }, { status: 401 });
    }

    const body = await req.json();
    if (!body.name) {
      return NextResponse.json({ error: 'Location name is required' }, { status: 400 });
    }

    const created = await adminService.addLocation(
      {
        type: body.type || 'city',
        name: body.name,
        slug: body.slug || body.name.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-'),
        code: body.code || null,
        geoId: body.geoId || `g${Math.floor(100 + Math.random() * 900)}`,
        parentId: body.parentId || null,
        latitude: body.latitude ? Number(body.latitude) : undefined,
        longitude: body.longitude ? Number(body.longitude) : undefined,
        popular: body.popular ?? false,
        orderIndex: body.orderIndex || 0,
        listingCount: 0,
      },
      { id: authContext.userId, name: authContext.user.name, ipAddress: authContext.ipAddress }
    );

    return NextResponse.json(created, { status: 201 });
  } catch (error: any) {
    console.error('API /api/admin/locations POST error:', error);
    return NextResponse.json({ error: error.message || 'Failed to create location' }, { status: 500 });
  }
}
