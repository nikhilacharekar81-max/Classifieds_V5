import { NextRequest, NextResponse } from '@/src/shims/next-server';
import { userRepository } from '@/server/repositories/user.repository';
import { verifyPassword } from '@/lib/auth/password';
import { getRequestIp } from '@/lib/auth/session';
import { safeErrorResponse, addSecurityHeaders, DUMMY_PASSWORD_HASH } from '@/lib/auth/security';
import crypto from 'node:crypto';

export async function POST(req: NextRequest) {
  try {
    const { email, password } = await req.json().catch(() => ({}));
    if (!email || !password) {
      return addSecurityHeaders(
        NextResponse.json({ error: 'Email and password are required' }, { status: 400 })
      );
    }

    const cleanEmail = String(email).toLowerCase().trim();
    const ipAddress = getRequestIp(req);

    const userRow = await userRepository.findByEmail(cleanEmail);

    // Timing-Safe Password Verification to prevent account enumeration
    if (!userRow || !userRow.passwordHash) {
      await verifyPassword(String(password), DUMMY_PASSWORD_HASH);
      return addSecurityHeaders(
        NextResponse.json({ error: 'Invalid email or password' }, { status: 401 })
      );
    }

    const isValid = await verifyPassword(String(password), userRow.passwordHash);

    if (!isValid) {
      return addSecurityHeaders(
        NextResponse.json({ error: 'Invalid email or password' }, { status: 401 })
      );
    }

    // Banned / suspended accounts
    if (userRow.status === 'banned' || userRow.status === 'suspended') {
      return addSecurityHeaders(
        NextResponse.json(
          {
            error: 'Your account has been suspended.',
            isBanned: true,
            banReason: (userRow as any).banReason || 'Violated terms of service',
            userId: userRow.id,
            email: userRow.email,
          },
          { status: 403 }
        )
      );
    }

    if (userRow.status !== 'active') {
      return addSecurityHeaders(
        NextResponse.json({ error: 'Account is not active' }, { status: 401 })
      );
    }

    if (!userRow.emailVerified) {
      return addSecurityHeaders(
        NextResponse.json(
          { error: 'Email verification is required to log in. Please check your email for the verification link.' },
          { status: 401 }
        )
      );
    }

    // Successful Authentication
    const sessionId = `sess_${crypto.randomUUID()}`;
    const userAgent = req.headers.get('user-agent') || undefined;

    const { expiresAt } = await userRepository.createSession(sessionId, userRow.id, ipAddress, userAgent);
    const userObj = await userRepository.findById(userRow.id);

    const response = NextResponse.json({
      success: true,
      user: userObj,
    });

    response.cookies.set('chillyads_session', sessionId, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      expires: expiresAt,
      path: '/',
    });

    return addSecurityHeaders(response);
  } catch (error: any) {
    return safeErrorResponse(error, 'Unable to complete login request. Please try again.');
  }
}
