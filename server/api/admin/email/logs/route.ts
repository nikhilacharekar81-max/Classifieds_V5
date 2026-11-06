import { NextRequest, NextResponse } from '@/src/shims/next-server';
import { emailService } from '@/server/services/email.service';

export async function GET(req: NextRequest) {
  try {
    const authContext = req.auth;
    if (!authContext) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const logs = await emailService.getLogs();
    return NextResponse.json(logs);
  } catch (error: any) {
    console.error('API /api/admin/email/logs GET error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
