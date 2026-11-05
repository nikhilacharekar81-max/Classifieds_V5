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
    const ipKey = `ip:${ipAddress}`;
    const emailKey = `email:${cleanEmail}`;

    // 1. Rate Limiting Check
    const ipLimit = await userRepository.checkRateLimit(ipKey, 5, 15 * 60 * 1000, 15 * 60 * 1000);
    const emailLimit = await userRepository.checkRateLimit(emailKey, 5, 15 * 60 * 1000, 15 * 60 * 1000);

    if (!ipLimit.allowed || !emailLimit.allowed) {
      const retryAfter = Math.max(ipLimit.retryAfterSeconds, emailLimit.retryAfterSeconds) || 900;
      const res = NextResponse.json(
        { error: 'Too many failed login attempts. Please try again later in 15 minutes.' },
        { status: 429 }
      );
      res.headers.set('Retry-After', String(retryAfter));
      return addSecurityHeaders(res);
    }

    const userRow = await userRepository.findByEmail(cleanEmail);

    // 2. Account Enumeration & Timing-Safe Password Verification
    if (!userRow || !userRow.passwordHash) {
      await verifyPassword(String(password), DUMMY_PASSWORD_HASH);
      await userRepository.recordFailedAttempt(ipKey);
      await userRepository.recordFailedAttempt(emailKey);
      return addSecurityHeaders(
        NextResponse.json({ error: 'Invalid email or password' }, { status: 401 })
      );
    }

    const isValid = await verifyPassword(String(password), userRow.passwordHash);

    if (!isValid) {
      await userRepository.recordFailedAttempt(ipKey);
      await userRepository.recordFailedAttempt(emailKey);
      return addSecurityHeaders(
        NextResponse.json({ error: 'Invalid email or password' }, { status: 401 })
      );
    }

    // Preserve rule: inactive/suspended accounts cannot authenticate
    if (userRow.status !== 'active') {
      await userRepository.recordFailedAttempt(ipKey);
      await userRepository.recordFailedAttempt(emailKey);
      return addSecurityHeaders(
        NextResponse.json({ error: 'Invalid email or password' }, { status: 401 })
      );
    }

    // 3. Successful Authentication
    await userRepository.clearRateLimit(ipKey);
    await userRepository.clearRateLimit(emailKey);

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
