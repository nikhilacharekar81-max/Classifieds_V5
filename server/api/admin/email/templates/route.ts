import { NextRequest, NextResponse } from '@/src/shims/next-server';
import { emailService } from '@/server/services/email.service';

export async function GET(req: NextRequest) {
  try {
    const authContext = req.auth;
    if (!authContext) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const templates = await emailService.getTemplates();
    return NextResponse.json(templates);
  } catch (error: any) {
    console.error('API /api/admin/email/templates GET error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const authContext = req.auth;
    if (!authContext) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { id, ...data } = body;
    if (!id) {
      return NextResponse.json({ error: 'Template ID is required' }, { status: 400 });
    }

    const updated = await emailService.updateTemplate(id, data, {
      id: authContext.user.id,
      name: authContext.user.name,
      ipAddress: req.ip || 'unknown'
    });
    return NextResponse.json(updated);
  } catch (error: any) {
    console.error('API /api/admin/email/templates PUT error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
