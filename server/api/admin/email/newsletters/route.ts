import { NextRequest, NextResponse } from '@/src/shims/next-server';
import { emailService } from '@/server/services/email.service';

export async function GET(req: NextRequest) {
  try {
    const authContext = req.auth;
    if (!authContext) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const campaigns = await emailService.getNewsletters();
    return NextResponse.json(campaigns);
  } catch (error: any) {
    console.error('API /api/admin/email/newsletters GET error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const authContext = req.auth;
    if (!authContext) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const created = await emailService.createNewsletterCampaign({
      ...body,
      createdBy: authContext.userId,
    });
    return NextResponse.json(created);
  } catch (error: any) {
    console.error('API /api/admin/email/newsletters POST error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
