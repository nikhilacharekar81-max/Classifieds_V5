import { NextRequest, NextResponse } from '@/src/shims/next-server';
import { emailService } from '@/server/services/email.service';
import { getAuthenticatedUser } from '@/lib/auth/session';

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const authContext = await getAuthenticatedUser(req);
    if (!authContext) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    if (!authContext.isAdmin) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { id } = params;
    if (!id) {
      return NextResponse.json({ error: 'Campaign ID is required' }, { status: 400 });
    }

    const result = await emailService.sendNewsletterCampaign(id);
    return NextResponse.json(result);
  } catch (error: any) {
    console.error('API /api/admin/email/newsletters/[id]/send POST error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
