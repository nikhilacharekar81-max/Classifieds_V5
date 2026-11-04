import { NextRequest, NextResponse } from '@/src/shims/next-server';
import { userRepository } from '@/server/repositories/user.repository';
import { hashPassword } from '@/lib/auth/password';
import crypto from 'node:crypto';

export async function POST(req: NextRequest) {
  try {
    const { name, email, password, phone, city, state, type } = await req.json();

    if (!name || !email || !password) {
      return NextResponse.json({ error: 'Name, email, and password are required' }, { status: 400 });
    }

    const cleanEmail = String(email).toLowerCase().trim();
    if (typeof password !== 'string' || password.length < 6) {
      return NextResponse.json({ error: 'Password must be a string and at least 6 characters long' }, { status: 400 });
    }

    const existing = await userRepository.findByEmail(cleanEmail);
    if (existing) {
      return NextResponse.json({ error: 'An account with this email already exists' }, { status: 409 });
    }

    const passwordHash = await hashPassword(String(password));
    const userId = `usr_${crypto.randomUUID().replace(/-/g, '').slice(0, 16)}`;

    const userObj = await userRepository.create({
      id: userId,
      name: String(name).trim(),
      email: cleanEmail,
      phone: phone ? String(phone).trim() : '',
      passwordHash,
      type: type || 'user',
      city: city || 'Mumbai',
      state: state || 'Maharashtra',
    });

    const sessionId = `sess_${crypto.randomUUID()}`;
    const ipAddress = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';
    const userAgent = req.headers.get('user-agent') || undefined;

    const { expiresAt } = await userRepository.createSession(sessionId, userObj.id, ipAddress, userAgent);

    const response = NextResponse.json(
      {
        success: true,
        user: userObj,
      },
      { status: 201 }
    );

    response.cookies.set('chillyads_session', sessionId, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      expires: expiresAt,
      path: '/',
    });

    return response;
  } catch (error: any) {
    console.error('API /api/auth/signup error:', error);
    return NextResponse.json({ error: error.message || 'Registration failed' }, { status: 500 });
  }
}
