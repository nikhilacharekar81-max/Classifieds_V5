import { NextRequest, NextResponse } from '@/src/shims/next-server';
import { emailService } from '@/server/services/email.service';
import { getAuthenticatedUser } from '@/lib/auth/session';

export async function GET(req: NextRequest) {
  try {
    const authContext = await getAuthenticatedUser(req);
    if (!authContext) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    if (!authContext.isAdmin) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const logs = await emailService.getLogs();
    return NextResponse.json(logs);
  } catch (error: any) {
    console.error('API /api/admin/email/logs GET error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
