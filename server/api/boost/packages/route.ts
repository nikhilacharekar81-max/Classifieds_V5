import { NextRequest, NextResponse } from '@/src/shims/next-server';
import { boostService } from '@/server/services/boost.service';
import { getAuthenticatedUser } from '@/lib/auth/session';

export async function GET() {
  const packages = await boostService.getPackages();
  return NextResponse.json(packages);
}

export async function POST(req: NextRequest) {
  try {
    const authContext = await getAuthenticatedUser(req);
    if (!authContext) {
      return NextResponse.json({ error: 'Unauthorized: Authentication required' }, { status: 401 });
    }
    if (!authContext.isAdmin) {
      return NextResponse.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    const body = await req.json();
    if (!body.name || typeof body.price !== 'number' || body.price < 0) {
      return NextResponse.json(
        { error: 'Invalid package details: name and valid non-negative price required' },
        { status: 400 }
      );
    }

    const pkg = await boostService.createPackage({
      name: String(body.name).trim(),
      badge: body.badge ? String(body.badge).trim() : 'Standard',
      type: body.type || 'bump',
      price: Number(body.price),
      discountPrice: body.discountPrice ? Number(body.discountPrice) : undefined,
      durationDays: Number(body.durationDays) || 7,
      durationHours: Number(body.durationHours) || Number(body.durationDays || 7) * 24,
      features: Array.isArray(body.features) ? body.features : [],
      isActive: body.isActive ?? true,
    });
    return NextResponse.json(pkg, { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Error creating package' }, { status: 500 });
  }
}
