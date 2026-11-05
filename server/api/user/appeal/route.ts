import { NextRequest, NextResponse } from '@/src/shims/next-server';
import { getAuthenticatedUser } from '@/lib/auth/session';
import { db } from '@/src/db';
import * as schema from '@/src/db/schema';
import { eq } from '@/src/db/pg-orm';

export async function POST(req: NextRequest) {
  try {
    const authContext = await getAuthenticatedUser(req);
    const body = await req.json().catch(() => ({}));

    const appealReason = String(body.appealReason || body.reason || '').trim();
    if (!appealReason) {
      return NextResponse.json({ error: 'Appeal reason is required' }, { status: 400 });
    }

    let userId = authContext?.userId;
    let userEmail = authContext?.email;

    if (!userId) {
      userId = String(body.userId || '').trim();
      userEmail = String(body.userEmail || body.email || '').trim();
    }

    if (!userId || !userEmail) {
      return NextResponse.json(
        { error: 'User identifier and email are required to submit an appeal' },
        { status: 400 }
      );
    }

    const id = `appeal_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    await db.insert(schema.banAppeals).values({
      id,
      userId,
      userEmail,
      appealReason,
      status: 'pending',
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    return NextResponse.json(
      { success: true, message: 'Ban appeal submitted successfully for review' },
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
