import { NextRequest, NextResponse } from '@/src/shims/next-server';
import { userService } from '@/server/services/user.service';
import { getAuthenticatedUser } from '@/lib/auth/session';
import { hasPermission } from '@/lib/auth/roles';

export async function GET(req: NextRequest) {
  try {
    const authContext = req.auth || (await getAuthenticatedUser(req));
    if (!authContext) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    if (!hasPermission(authContext.adminRole, 'canManageUsers')) {
      return NextResponse.json({ error: 'Forbidden: Insufficient role permissions' }, { status: 403 });
    }

    const role = authContext.adminRole || authContext.user?.adminRole;
    const isActualAdmin = Boolean(
      authContext.isSuperAdmin || role === 'super_admin' || role === 'admin'
    );

    const { searchParams } = new URL(req.url);
    const filter = searchParams.get('filter') || 'all';

    if (filter === 'verification' && !isActualAdmin) {
      return NextResponse.json(
        { error: 'Forbidden: Only administrators can inspect KYC verification requests' },
        { status: 403 }
      );
    }

    const users = await userService.getUsers(filter, {
      includeKycDocuments: isActualAdmin,
    });
    return NextResponse.json(users);
  } catch (error: any) {
    console.error('API /api/admin/users GET error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const authContext = req.auth || (await getAuthenticatedUser(req));
    if (!authContext) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    if (!hasPermission(authContext.adminRole, 'canManageUsers')) {
      return NextResponse.json({ error: 'Forbidden: Insufficient role permissions' }, { status: 403 });
    }

    const role = authContext.adminRole || authContext.user?.adminRole;
    const isActualAdmin = Boolean(
      authContext.isSuperAdmin || role === 'super_admin' || role === 'admin'
    );

    const { action, userId, reason, status, kycStatus, notes } = await req.json();
    const actor = {
      id: authContext.userId,
      name: authContext.user.name,
      ipAddress: authContext.ipAddress,
    };

    if (action === 'ban' && userId) {
      if (!isActualAdmin) {
        return NextResponse.json(
          { error: 'Forbidden: Only administrators can ban user accounts' },
          { status: 403 }
        );
      }
      const success = await userService.banUser(userId, reason || 'Violated terms of service', actor);
      return NextResponse.json({ success });
    }

    if (action === 'unban' && userId) {
      if (!isActualAdmin) {
        return NextResponse.json(
          { error: 'Forbidden: Only administrators can unban user accounts' },
          { status: 403 }
        );
      }
      const success = await userService.unbanUser(userId, actor);
      return NextResponse.json({ success });
    }

    if (action === 'verify_kyc' && userId) {
      if (!isActualAdmin) {
        return NextResponse.json(
          { error: 'Forbidden: Only administrators can review and verify KYC documents' },
          { status: 403 }
        );
      }
      const resolvedDecision = kycStatus || status || 'verified';
      if (resolvedDecision !== 'verified' && resolvedDecision !== 'rejected') {
        return NextResponse.json(
          { error: "Invalid KYC decision. Must be 'verified' or 'rejected'" },
          { status: 400 }
        );
      }
      const resolvedNotes = notes !== undefined ? notes : reason;
      const success = await userService.verifyKyc(userId, resolvedDecision, resolvedNotes, actor);
      if (!success) {
        return NextResponse.json({ error: 'User not found' }, { status: 404 });
      }
      return NextResponse.json({ success, kycStatus: resolvedDecision });
    }

    return NextResponse.json({ error: 'Unsupported user action' }, { status: 400 });
  } catch (error: any) {
    console.error('API /api/admin/users POST error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
