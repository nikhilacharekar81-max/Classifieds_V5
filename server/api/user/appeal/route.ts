import { NextRequest, NextResponse } from '@/src/shims/next-server';
import { userRepository } from '@/server/repositories/user.repository';
import { verifyPassword } from '@/lib/auth/password';
import { db } from '@/src/db';
import * as schema from '@/src/db/schema';
import { eq, desc } from '@/src/db/pg-orm';

async function authenticateBannedUser(req: NextRequest, body: any) {
  // 1. Check session token first
  const authHeader = req.headers.get('authorization');
  const bearerToken = authHeader?.startsWith('Bearer ') ? authHeader.slice(7).trim() : null;
  const cookieSession =
    req.cookies.get('chillyads_session')?.value ||
    req.cookies.get('session_token')?.value ||
    req.cookies.get('session')?.value;
  const token = bearerToken || cookieSession;

  if (token) {
    const dbSession = await userRepository.findSession(token);
    if (dbSession && dbSession.user) {
      return dbSession.user;
    }
  }

  // 2. Check password credentials
  const email = String(body.email || body.userEmail || '').trim();
  const password = String(body.password || '').trim();

  if (email && password) {
    const user = await userRepository.findByEmail(email);
    if (user && user.passwordHash) {
      const isValid = await verifyPassword(password, user.passwordHash);
      if (isValid) {
        return user;
      }
    }
  }

  return null;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const appealReason = String(body.appealReason || body.reason || '').trim();

    if (!appealReason) {
      return NextResponse.json({ error: 'Appeal reason is required' }, { status: 400 });
    }

    const targetUser = await authenticateBannedUser(req, body);
    if (!targetUser) {
      return NextResponse.json(
        { error: 'Authentication failed: Invalid credentials or session token for account' },
        { status: 401 }
      );
    }

    if (targetUser.status !== 'banned' && targetUser.status !== 'suspended') {
      return NextResponse.json(
        { error: 'Account is not currently suspended or banned' },
        { status: 400 }
      );
    }

    const id = `appeal_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    await db.insert(schema.banAppeals).values({
      id,
      userId: targetUser.id,
      userEmail: targetUser.email,
      appealReason,
      status: 'pending',
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    return NextResponse.json(
      { success: true, message: 'Ban appeal submitted successfully for moderation review' },
      { status: 201 }
    );
  } catch (error: any) {
    console.error('API /api/user/appeal POST error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to submit ban appeal' },
      { status: 500 }
    );
  }
}

export async function GET(req: NextRequest) {
  try {
    const body = {};
    const targetUser = await authenticateBannedUser(req, body);
    if (!targetUser) {
      return NextResponse.json(
        { error: 'Authentication required to view appeals' },
        { status: 401 }
      );
    }

    const appeals = await db
      .select({
        id: schema.banAppeals.id,
        status: schema.banAppeals.status,
        appealReason: schema.banAppeals.appealReason,
        createdAt: schema.banAppeals.createdAt,
        updatedAt: schema.banAppeals.updatedAt,
      })
      .from(schema.banAppeals)
      .where(eq(schema.banAppeals.userId, targetUser.id))
      .orderBy(desc(schema.banAppeals.createdAt));

    return NextResponse.json({ appeals });
  } catch (error: any) {
    console.error('API /api/user/appeal GET error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch appeals' },
      { status: 500 }
    );
  }
}
