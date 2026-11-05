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

    const targetUser = await userRepository.findById(id);
    if (!targetUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const isSelf = authContext.userId === id;
    const isSuperAdmin = Boolean(authContext.isSuperAdmin);
    const isAdmin = Boolean(authContext.isAdmin || isSuperAdmin);
    const isModerator = Boolean(authContext.isModerator);
    const isStaff = isAdmin || isModerator;

    if (!isSelf && !isStaff) {
      return NextResponse.json({ error: 'Forbidden: You can only edit your own account' }, { status: 403 });
    }

    // Role Hierarchy: Moderators cannot edit Admin or Super Admin accounts
    const targetHasAdminPrivileges = Boolean(
      (targetUser as any).adminRole || targetUser.type === 'business' && false // check adminRole
    );
    // Also check if targetUser has admin record in DB
    const targetRow = await userRepository.findByEmail(targetUser.email);
    if (!isSelf && !isAdmin && isModerator && targetRow?.adminRole) {
      return NextResponse.json(
        { error: 'Forbidden: Moderators cannot modify administrator accounts' },
        { status: 403 }
      );
    }

    const body = await req.json();
    const allowedFields: any = {};

    if (body.name !== undefined) {
      const nameStr = String(body.name).trim();
      if (!nameStr) {
        return NextResponse.json({ error: 'Name cannot be empty' }, { status: 400 });
      }
      allowedFields.name = nameStr;
    }

    // Email change integrity check
    if (body.email !== undefined) {
      const cleanEmail = String(body.email).toLowerCase().trim();
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(cleanEmail)) {
        return NextResponse.json({ error: 'Please enter a valid email address' }, { status: 400 });
      }

      if (cleanEmail !== targetUser.email.toLowerCase().trim()) {
        const existingWithEmail = await userRepository.findByEmail(cleanEmail);
        if (existingWithEmail && existingWithEmail.id !== id) {
          return NextResponse.json(
            { error: 'An account with this email address already exists' },
            { status: 409 }
          );
        }
        allowedFields.email = cleanEmail;
        // Reset email verification when email address is altered
        allowedFields.emailVerified = false;
        allowedFields.emailVerifiedAt = null;
      }
    }

    if (body.phone !== undefined) {
      const cleanPhone = String(body.phone).trim();
      if (cleanPhone) {
        const digits = cleanPhone.replace(/\D/g, '');
        if (digits.length < 10 || digits.length > 15) {
          return NextResponse.json({ error: 'Phone number must be between 10 and 15 digits' }, { status: 400 });
        }
      }
      allowedFields.phone = cleanPhone;
    }

    if (body.avatar !== undefined) allowedFields.avatarUrl = String(body.avatar);
    if (body.emailSubscribed !== undefined) allowedFields.emailSubscribed = Boolean(body.emailSubscribed);

    if (body.location) {
      if (body.location.city !== undefined) allowedFields.city = String(body.location.city).trim();
      if (body.location.state !== undefined) allowedFields.state = String(body.location.state).trim();
    }

    // Field-level role permissions:
    // KYC status can be updated by moderators or admins
    if (isStaff && body.kycStatus !== undefined) {
      allowedFields.kycStatus = body.kycStatus;
    }

    // Status and account type are administrator-only fields (moderators cannot alter them)
    if (body.status !== undefined) {
      if (!isAdmin) {
        return NextResponse.json(
          { error: 'Forbidden: Only administrators can modify user account status' },
          { status: 403 }
        );
      }
      allowedFields.status = body.status;
    }

    if (body.type !== undefined) {
      if (!isAdmin) {
        return NextResponse.json(
          { error: 'Forbidden: Only administrators can modify user account type' },
          { status: 403 }
        );
      }
      if (body.type !== 'user' && body.type !== 'business') {
        return NextResponse.json({ error: "Invalid type. Must be 'user' or 'business'" }, { status: 400 });
      }
      allowedFields.type = body.type;
    }

    // adminRole is strictly super-admin-only
    if (body.adminRole !== undefined) {
      if (!isSuperAdmin) {
        return NextResponse.json(
          { error: 'Forbidden: Only super administrators can modify administrator roles' },
          { status: 403 }
        );
      }
      allowedFields.adminRole = body.adminRole || null;
    }

    const updated = await userRepository.update(id, allowedFields);
    if (!updated) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    return NextResponse.json(updated);
  } catch (error: any) {
    console.error(`API /api/admin/users/${id} PUT error:`, error);
    const isDuplicate =
      error?.code === '23505' ||
      error?.cause?.code === '23505' ||
      String(error?.message || '').includes('23505') ||
      String(error?.message || '').toLowerCase().includes('duplicate') ||
      String(error?.message || '').toLowerCase().includes('unique');

    if (isDuplicate) {
      return NextResponse.json(
        { error: 'An account with this email address already exists' },
        { status: 409 }
      );
    }

    return NextResponse.json({ error: error.message || 'Failed to update user' }, { status: 500 });
  }
}
