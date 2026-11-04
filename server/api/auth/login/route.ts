import { NextRequest, NextResponse } from '@/src/shims/next-server';
import { userRepository } from '@/server/repositories/user.repository';
import { verifyPassword } from '@/lib/auth/password';
import crypto from 'node:crypto';

export async function POST(req: NextRequest) {
  try {
    const { email, password } = await req.json();
    if (!email || !password) {
      return NextResponse.json({ error: 'Email and password are required' }, { status: 400 });
    }

    const cleanEmail = String(email).toLowerCase().trim();
    const userRow = await userRepository.findByEmail(cleanEmail);

    if (!userRow || !userRow.passwordHash) {
      return NextResponse.json({ error: 'Invalid email or password' }, { status: 401 });
    }

    if (userRow.status !== 'active') {
      return NextResponse.json({ error: 'Account suspended or inactive' }, { status: 403 });
    }

    const isValid = await verifyPassword(String(password), userRow.passwordHash);
    if (!isValid) {
      return NextResponse.json({ error: 'Invalid email or password' }, { status: 401 });
    }

    const sessionId = `sess_${crypto.randomUUID()}`;
    const ipAddress = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';
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

    return response;
  } catch (error: any) {
    console.error('API /api/auth/login error:', error);
    return NextResponse.json({ error: error.message || 'Login failed' }, { status: 500 });
  }
}
