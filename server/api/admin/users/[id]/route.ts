import { NextRequest, NextResponse } from '@/src/shims/next-server';
import { userRepository } from '@/server/repositories/user.repository';
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

    const isSelf = authContext.userId === id;
    const isStaff = authContext.isAdmin || authContext.isModerator;

    if (!isSelf && !isStaff) {
      return NextResponse.json({ error: 'Forbidden: You can only edit your own account' }, { status: 403 });
    }

    const body = await req.json();
    const allowedFields: any = {};

    if (body.name !== undefined) allowedFields.name = String(body.name).trim();
    if (body.email !== undefined) allowedFields.email = String(body.email).toLowerCase().trim();
    if (body.phone !== undefined) allowedFields.phone = String(body.phone).trim();
    if (body.avatar !== undefined) allowedFields.avatarUrl = String(body.avatar);
    if (body.emailSubscribed !== undefined) allowedFields.emailSubscribed = Boolean(body.emailSubscribed);

    if (body.location) {
      if (body.location.city) allowedFields.city = body.location.city;
      if (body.location.state) allowedFields.state = body.location.state;
    }

    if (isStaff) {
      if (body.status !== undefined) allowedFields.status = body.status;
      if (body.kycStatus !== undefined) allowedFields.kycStatus = body.kycStatus;
      if (body.type !== undefined) allowedFields.type = body.type;
      if (body.adminRole !== undefined && authContext.isSuperAdmin) allowedFields.adminRole = body.adminRole;
    }

    const updated = await userRepository.update(id, allowedFields);
    if (!updated) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    return NextResponse.json(updated);
  } catch (error: any) {
    console.error(`API /api/admin/users/${id} PUT error:`, error);
    return NextResponse.json({ error: error.message || 'Failed to update user' }, { status: 500 });
  }
}
