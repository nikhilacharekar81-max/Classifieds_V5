import { NextRequest, NextResponse } from '@/src/shims/next-server';
import { userService } from '@/server/services/user.service';
import { getAuthenticatedUser } from '@/lib/auth/session';
import { hasPermission, canModifyTarget } from '@/lib/auth/roles';

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
    const search = searchParams.get('search') || undefined;
    const roleFilter = searchParams.get('role') || undefined;
    const statusFilter = searchParams.get('status') || undefined;
    const kycStatusFilter = searchParams.get('kycStatus') || undefined;

    if ((filter === 'verification' || kycStatusFilter) && !isActualAdmin) {
      return NextResponse.json(
        { error: 'Forbidden: Only administrators can inspect KYC verification requests' },
        { status: 403 }
      );
    }

    const hasPaginationParams =
      searchParams.has('limit') ||
      searchParams.has('offset') ||
      searchParams.has('page') ||
      searchParams.has('search') ||
      searchParams.has('role') ||
      searchParams.has('status') ||
      searchParams.has('kycStatus') ||
      searchParams.get('paginated') === '1' ||
      searchParams.get('paginated') === 'true';

    const rawLimit = Number(searchParams.get('limit'));
    const limit = Number.isFinite(rawLimit) && rawLimit > 0 ? Math.min(rawLimit, 200) : hasPaginationParams ? 50 : 500;
    const rawPage = Number(searchParams.get('page'));
    const rawOffset = Number(searchParams.get('offset'));
    const offset =
      searchParams.has('offset') && Number.isFinite(rawOffset) && rawOffset >= 0
        ? Math.floor(rawOffset)
        : searchParams.has('page') && Number.isFinite(rawPage) && rawPage >= 1
        ? (Math.floor(rawPage) - 1) * limit
        : 0;

    const result = await userService.getPaginatedUsers({
      filter,
      search,
      role: roleFilter,
      status: statusFilter,
      kycStatus: kycStatusFilter,
      includeKycDocuments: isActualAdmin,
      limit,
      offset,
    });

    if (hasPaginationParams) {
      return NextResponse.json(
        {
          users: result.users,
          items: result.users,
          total: result.total,
          limit: result.limit,
          offset: result.offset,
          page: Math.floor(result.offset / result.limit) + 1,
          counts: result.counts,
        },
        {
          headers: { 'X-Total-Count': String(result.total) },
        }
      );
    }

    return NextResponse.json(result.users, {
      headers: { 'X-Total-Count': String(result.total) },
    });
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
    
    // Fetch target user for rank check
    const targetUser = await userService.getUserById(userId);
    if (!targetUser) {
        return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }
    
    // Role Hierarchy check
    if (authContext.userId === userId || !canModifyTarget(role, targetUser.adminRole || 'user')) {
        return NextResponse.json(
            { error: 'Forbidden: Insufficient rank to modify this account' },
            { status: 403 }
        );
    }

    if (action === 'ban' && userId) {
      if (!isActualAdmin) {
        return NextResponse.json(
          { error: 'Forbidden: Only administrators can ban user accounts' },
          { status: 403 }
        );
      }
      
      // Block banning last active super_admin
      if (targetUser.adminRole === 'super_admin' && targetUser.status === 'active') {
          const superAdminCount = await import('@/server/repositories/user.repository').then(m => m.userRepository.countSuperAdmins());
          if (superAdminCount <= 1) {
              return NextResponse.json(
                  { error: 'Forbidden: Cannot ban the last active super administrator' },
                  { status: 403 }
              );
          }
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
