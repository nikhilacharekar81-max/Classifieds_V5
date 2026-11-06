import { NextRequest, NextResponse } from '@/src/shims/next-server';
import { getAuthenticatedUser } from '@/lib/auth/session';
import { userRepository } from '@/server/repositories/user.repository';
import { userService } from '@/server/services/user.service';
import { emailService } from '@/server/services/email.service';
import crypto from 'node:crypto';

export async function PUT(req: NextRequest) {
  try {
    const authContext = req.auth || (await getAuthenticatedUser(req));
    if (!authContext) {
      return NextResponse.json({ error: 'Unauthorized: Authentication required' }, { status: 401 });
    }

    const userId = authContext.userId;
    const currentUser = await userRepository.findById(userId);
    if (!currentUser) {
      return NextResponse.json({ error: 'User account not found' }, { status: 404 });
    }

    let body: any;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: 'Invalid JSON request body' }, { status: 400 });
    }

    if (!body || typeof body !== 'object') {
      return NextResponse.json({ error: 'Profile update payload is required' }, { status: 400 });
    }

    // Reject attempts to modify another user's ID or escalate administrative/verification fields
    if (body.id !== undefined && String(body.id) !== userId) {
      return NextResponse.json(
        { error: 'Forbidden: You can only update your own profile' },
        { status: 403 }
      );
    }

    if (
      body.role !== undefined ||
      body.adminRole !== undefined ||
      body.permissions !== undefined ||
      (body.status !== undefined && body.status !== currentUser.status) ||
      (body.kycStatus !== undefined && body.kycStatus !== currentUser.kycStatus) ||
      (body.businessDetails?.verifiedBusiness !== undefined &&
        Boolean(body.businessDetails.verifiedBusiness) !== Boolean(currentUser.businessDetails?.verifiedBusiness)) ||
      (body.verifiedBusiness !== undefined &&
        Boolean(body.verifiedBusiness) !== Boolean(currentUser.businessDetails?.verifiedBusiness))
    ) {
      return NextResponse.json(
        { error: 'Forbidden: Cannot modify administrative roles, account status, or verification status' },
        { status: 403 }
      );
    }

    const allowedFields: any = {};

    if (body.name !== undefined) {
      if (typeof body.name !== 'string') {
        return NextResponse.json({ error: 'Name must be a string' }, { status: 400 });
      }
      const cleanName = body.name.trim();
      if (!cleanName || cleanName.length > 120) {
        return NextResponse.json({ error: 'Name is required and must be 120 characters or fewer' }, { status: 400 });
      }
      allowedFields.name = cleanName;
    }

    if (body.email !== undefined) {
      if (typeof body.email !== 'string') {
        return NextResponse.json({ error: 'Email must be a string' }, { status: 400 });
      }
      const cleanEmail = body.email.toLowerCase().trim();
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(cleanEmail)) {
        return NextResponse.json({ error: 'Please enter a valid email address' }, { status: 400 });
      }

      if (cleanEmail !== currentUser.email.toLowerCase().trim()) {
        const existingWithEmail = await userRepository.findByEmail(cleanEmail);
        if (existingWithEmail && existingWithEmail.id !== userId) {
          return NextResponse.json(
            { error: 'An account with this email address already exists' },
            { status: 409 }
          );
        }
        allowedFields.email = cleanEmail;
        allowedFields.emailVerified = false;
        allowedFields.emailVerifiedAt = null;

        try {
          const rawToken = crypto.randomBytes(32).toString('hex');
          const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');
          const tokenId = `evt_${crypto.randomUUID()}`;
          const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
          await userRepository.createEmailVerificationToken(tokenId, userId, tokenHash, expiresAt);

          const origin = req.nextUrl?.origin || 'http://localhost:3000';
          const verifyUrl = `${origin}/verify-email?token=${rawToken}`;
          await emailService.sendCustomEmail({
            toEmail: cleanEmail,
            toName: allowedFields.name || currentUser.name || 'User',
            subject: 'Verify Your New Email Address - Chillyads',
            body: `<p>Hello ${allowedFields.name || currentUser.name},</p><p>Your account email address was recently updated. Please verify your new email address by clicking the link below:</p><p><a href="${verifyUrl}">${verifyUrl}</a></p><p>This link expires in 24 hours.</p>`,
            type: 'email_verification',
            relatedUserId: userId,
          });
        } catch (emailErr) {
          console.error('[UserAccountAPI] Verification email dispatch warning:', emailErr);
        }
      }
    }

    if (body.phone !== undefined) {
      if (typeof body.phone !== 'string') {
        return NextResponse.json({ error: 'Phone number must be a string' }, { status: 400 });
      }
      const cleanPhone = body.phone.trim();
      if (!cleanPhone) {
        return NextResponse.json({ error: 'Phone number cannot be empty' }, { status: 400 });
      }
      const digits = cleanPhone.replace(/\D/g, '');
      if (digits.length < 10 || digits.length > 15) {
        return NextResponse.json({ error: 'Phone number must be between 10 and 15 digits' }, { status: 400 });
      }
      allowedFields.phone = cleanPhone.startsWith('+') ? `+${digits}` : digits;
    }

    if (body.avatar !== undefined) {
      if (typeof body.avatar !== 'string') {
        return NextResponse.json({ error: 'Avatar URL must be a string' }, { status: 400 });
      }
      allowedFields.avatarUrl = body.avatar.trim();
    }

    if (body.emailSubscribed !== undefined) {
      if (typeof body.emailSubscribed !== 'boolean') {
        return NextResponse.json({ error: 'emailSubscribed must be a boolean' }, { status: 400 });
      }
      allowedFields.emailSubscribed = body.emailSubscribed;
    }

    const cityVal = body.location?.city !== undefined ? body.location.city : body.city;
    const stateVal = body.location?.state !== undefined ? body.location.state : body.state;
    if (cityVal !== undefined) {
      if (typeof cityVal !== 'string' || cityVal.trim().length > 100) {
        return NextResponse.json({ error: 'City must be a valid string under 100 characters' }, { status: 400 });
      }
      allowedFields.city = cityVal.trim();
    }
    if (stateVal !== undefined) {
      if (typeof stateVal !== 'string' || stateVal.trim().length > 100) {
        return NextResponse.json({ error: 'State must be a valid string under 100 characters' }, { status: 400 });
      }
      allowedFields.state = stateVal.trim();
    }

    const companyNameVal =
      body.businessDetails?.companyName !== undefined ? body.businessDetails.companyName : body.businessName;
    const gstNumberVal =
      body.businessDetails?.gstNumber !== undefined ? body.businessDetails.gstNumber : body.gstNumber;

    if (companyNameVal !== undefined) {
      if (companyNameVal !== null && (typeof companyNameVal !== 'string' || companyNameVal.trim().length > 150)) {
        return NextResponse.json({ error: 'Company name must be 150 characters or fewer' }, { status: 400 });
      }
      const cleanCompany = companyNameVal ? companyNameVal.trim() : '';
      allowedFields.businessName = cleanCompany || null;
      allowedFields.type = cleanCompany ? 'business' : 'user';
    }

    if (gstNumberVal !== undefined) {
      if (gstNumberVal !== null && (typeof gstNumberVal !== 'string' || gstNumberVal.trim().length > 30)) {
        return NextResponse.json({ error: 'GST number must be 30 characters or fewer' }, { status: 400 });
      }
      allowedFields.gstNumber = gstNumberVal ? gstNumberVal.trim() : null;
    }

    const updated = await userService.updateUser(userId, allowedFields);
    if (!updated) {
      return NextResponse.json({ error: 'Failed to update profile' }, { status: 500 });
    }

    const enriched = await userRepository.findById(userId);
    return NextResponse.json(enriched || updated);
  } catch (error: any) {
    console.error('API /api/user/account PUT error:', error);
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
    return NextResponse.json({ error: error.message || 'Error updating profile' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const authContext = req.auth || (await getAuthenticatedUser(req));
    if (!authContext) {
      return NextResponse.json({ error: 'Unauthorized: Authentication required' }, { status: 401 });
    }

    const success = await userRepository.anonymizeAndDeleteUser(authContext.userId);
    if (!success) {
      return NextResponse.json({ error: 'Failed to delete account' }, { status: 500 });
    }

    const res = NextResponse.json({ success: true, message: 'Account successfully deleted' });
    res.cookies.delete('chillyads_session');
    return res;
  } catch (error: any) {
    console.error('API /api/user/account DELETE error:', error);
    return NextResponse.json({ error: error.message || 'Error deleting account' }, { status: 500 });
  }
}
