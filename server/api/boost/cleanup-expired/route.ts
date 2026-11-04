import { NextRequest, NextResponse } from '@/src/shims/next-server';
import { boostService } from '@/server/services/boost.service';
import { getAuthenticatedUser } from '@/lib/auth/session';

export const dynamic = 'force-dynamic';

export async function POST(_req: NextRequest) {
  try {
    // Time is calculated strictly on the server in PostgreSQL (no caller-supplied nowMs)
    const count = await boostService.cleanupExpiredBoosts();
    return NextResponse.json({ success: true, expiredCount: count });
  } catch (err: any) {
    console.error('API /api/boost/cleanup-expired error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
