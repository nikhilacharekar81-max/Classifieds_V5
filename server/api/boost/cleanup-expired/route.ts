import { NextRequest, NextResponse } from '@/src/shims/next-server';
import { boostService } from '@/server/services/boost.service';
import { getAuthenticatedUser } from '@/lib/auth/session';
import { addSecurityHeaders } from '@/lib/auth/security';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const authContext = await getAuthenticatedUser(req);
    const isPrivileged = Boolean(authContext?.isAdmin || authContext?.isSuperAdmin);

    // Also support external cron trigger via secret header
    const cronSecret = process.env.CRON_SECRET || process.env.INTERNAL_API_SECRET;
    const authHeader = req.headers.get('authorization');
    const cronHeader = req.headers.get('x-cron-secret');
    const hasValidCronSecret = Boolean(
      cronSecret && (cronHeader === cronSecret || authHeader === `Bearer ${cronSecret}`)
    );

    if (!isPrivileged && !hasValidCronSecret) {
      return addSecurityHeaders(
        NextResponse.json(
          { error: 'Unauthorized: Administrator privileges or valid cron secret required' },
          { status: 401 }
        )
      );
    }

    // Time is calculated strictly on the server in PostgreSQL (no caller-supplied nowMs)
    const count = await boostService.cleanupExpiredBoosts();
    return addSecurityHeaders(
      NextResponse.json({ success: true, expiredCount: count })
    );
  } catch (err: any) {
    console.error('API /api/boost/cleanup-expired error:', err);
    return addSecurityHeaders(
      NextResponse.json({ error: err.message }, { status: 500 })
    );
  }
}
