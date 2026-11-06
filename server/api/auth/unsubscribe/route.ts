import { NextRequest, NextResponse } from '@/src/shims/next-server';
import { userRepository } from '@/server/repositories/user.repository';
import * as schema from '@/src/db/schema';
import { db } from '@/src/db/index';
import { eq } from '@/src/db/pg-orm';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const token = searchParams.get('token');
    
    if (!token) {
      return new NextResponse('Invalid unsubscribe link.', { status: 400 });
    }

    const user = await userRepository.findByUnsubscribeToken(token);
    if (!user) {
      return new NextResponse('Unsubscribe link expired or invalid.', { status: 404 });
    }

    await db.update(schema.users)
      .set({ 
        emailSubscribed: false, 
        emailUnsubscribedAt: new Date(),
        unsubscribeToken: null // One-time use token for extra security if desired
      })
      .where(eq(schema.users.id, user.id));

    return new NextResponse('<h1>Successfully Unsubscribed</h1><p>You have been removed from our marketing mailing list. You will still receive transactional emails related to your account and listings.</p>', {
      headers: { 'Content-Type': 'text/html' }
    });
  } catch (error: any) {
    console.error('API /api/auth/unsubscribe GET error:', error);
    return new NextResponse('An error occurred during unsubscription.', { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const { getAuthenticatedUser } = await import('@/lib/auth/session');
    const authContext = req.auth || (await getAuthenticatedUser(req));
    if (!authContext) {
      return NextResponse.json({ error: 'Authentication required to unsubscribe via UI.' }, { status: 401 });
    }

    const body = await req.json();
    const email = body.email?.toLowerCase().trim();
    
    if (!email) {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 });
    }

    const user = await userRepository.findByEmail(email);
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Authorization: User can unsubscribe themselves, or an admin/moderator can unsubscribe anyone
    const isOwner = authContext.userId === user.id || authContext.user?.id === user.id;
    const isPrivileged = Boolean(authContext.isAdmin || authContext.isModerator || authContext.isSuperAdmin);

    if (!isOwner && !isPrivileged) {
      return NextResponse.json({ error: 'Forbidden: You can only unsubscribe your own account.' }, { status: 403 });
    }

    await db.update(schema.users)
      .set({ emailSubscribed: false, emailUnsubscribedAt: new Date() })
      .where(eq(schema.users.id, user.id));

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('API /api/auth/unsubscribe POST error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
