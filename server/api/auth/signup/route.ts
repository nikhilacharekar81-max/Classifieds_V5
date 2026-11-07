import { NextRequest, NextResponse } from '@/src/shims/next-server';
import { userRepository } from '@/server/repositories/user.repository';
import { emailService } from '@/server/services/email.service';
import { hashPassword } from '@/lib/auth/password';
import { getRequestIp } from '@/lib/auth/session';
import { safeErrorResponse, addSecurityHeaders } from '@/lib/auth/security';
import { getPublicBaseUrl } from '@/lib/publicUrl';
import crypto from 'node:crypto';

function escapeHtml(str: string): string {
  return String(str || '')
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

export async function POST(req: NextRequest) {
  try {
    const { name, email, password, phone, city, state, type, emailSubscribed } = await req.json().catch(() => ({}));

    if (!name || typeof name !== 'string' || !name.trim()) {
      return addSecurityHeaders(
        NextResponse.json({ error: 'Name is required' }, { status: 400 })
      );
    }

    if (!email || typeof email !== 'string' || !email.trim()) {
      return addSecurityHeaders(
        NextResponse.json({ error: 'Email address is required' }, { status: 400 })
      );
    }

    const cleanEmail = String(email).toLowerCase().trim();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(cleanEmail) || cleanEmail.length > 100) {
      return addSecurityHeaders(
        NextResponse.json({ error: 'Please enter a valid email address' }, { status: 400 })
      );
    }

    // Phone number is compulsory during signup
    if (!phone || typeof phone !== 'string' || !phone.trim()) {
      return addSecurityHeaders(
        NextResponse.json({ error: 'Phone number is required' }, { status: 400 })
      );
    }

    const rawPhone = phone.trim();
    const digitsOnly = rawPhone.replace(/\D/g, '');
    if (!/^\+?[0-9\s-]{10,15}$/.test(rawPhone) || digitsOnly.length < 10 || digitsOnly.length > 15) {
      return addSecurityHeaders(
        NextResponse.json({ error: 'Please enter a valid phone number (10 to 15 digits)' }, { status: 400 })
      );
    }
    const cleanPhone = rawPhone.startsWith('+') ? `+${digitsOnly}` : digitsOnly;

    // Account type validation (allowlist: 'user' or 'business' only)
    let accountType: 'user' | 'business' = 'user';
    if (type !== undefined && type !== null && type !== '') {
      if (type !== 'user' && type !== 'business') {
        return addSecurityHeaders(
          NextResponse.json({ error: "Invalid account type. Allowed types are 'user' or 'business'" }, { status: 400 })
        );
      }
      accountType = type;
    }

    // Password policy: exactly 4 to 20 characters, no complexity rules enforced
    if (typeof password !== 'string' || password.length < 4 || password.length > 20) {
      return addSecurityHeaders(
        NextResponse.json(
          { error: 'Password must be between 4 and 20 characters long' },
          { status: 400 }
        )
      );
    }

    const existing = await userRepository.findByEmail(cleanEmail);
    if (existing) {
      return addSecurityHeaders(
        NextResponse.json({ error: 'An account with this email already exists' }, { status: 409 })
      );
    }

    const passwordHash = await hashPassword(String(password));
    const userId = `usr_${crypto.randomUUID().replace(/-/g, '').slice(0, 16)}`;

    // Do not fabricate or default city/state to 'Mumbai'/'Maharashtra'
    const cleanCity = city && typeof city === 'string' ? city.trim() : '';
    const cleanState = state && typeof state === 'string' ? state.trim() : '';

    const userObj = await userRepository.create({
      id: userId,
      name: String(name).trim(),
      email: cleanEmail,
      phone: cleanPhone,
      passwordHash,
      type: accountType,
      city: cleanCity,
      state: cleanState,
      emailSubscribed: Boolean(emailSubscribed),
    });

    // Verification token
    const token = crypto.randomBytes(32).toString('hex');
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours
    await userRepository.createEmailVerificationToken(`vet_${crypto.randomUUID()}`, userId, tokenHash, expiresAt);

    // Send email
    const verificationUrl = `${getPublicBaseUrl()}/verify-email?token=${token}`;
    const emailResult = await emailService.sendCustomEmail({
      toEmail: cleanEmail,
      toName: userObj.name,
      subject: 'Verify your Chillyads account',
      body: `Welcome to ${escapeHtml(userObj.name || 'User')}! Please click the link below to verify your email address:\n\n${verificationUrl}`,
      type: 'verify_email',
      relatedUserId: userId,
    });

    const response = NextResponse.json(
      {
        success: true,
        user: userObj,
        emailSent: emailResult.status === 'delivered',
        message: emailResult.status === 'delivered'
          ? 'Account created. Check your email for verification.'
          : 'Account created, but verification email failed to send. Please request a new one.',
      },
      { status: 201 }
    );

    return addSecurityHeaders(response);
  } catch (error: any) {
    return safeErrorResponse(error, 'Registration failed. Please try again.');
  }
}
