import { NextRequest, NextResponse } from '@/src/shims/next-server';
import { emailService } from '@/server/services/email.service';

export async function POST(req: NextRequest) {
  try {
    const authContext = req.auth;
    if (!authContext) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const result = await emailService.testSmtpConnection(body);
    return NextResponse.json(result);
  } catch (error: any) {
    console.error('API /api/admin/email/test-smtp POST error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
