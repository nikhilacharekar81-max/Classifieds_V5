import { NextRequest, NextResponse } from '@/src/shims/next-server';
import { emailService } from '@/server/services/email.service';
import { adminRepository } from '@/server/repositories/admin.repository';
import { getAuthenticatedUser } from '@/lib/auth/session';

export async function POST(req: NextRequest) {
  try {
    const authContext = req.auth || (await getAuthenticatedUser(req));
    if (!authContext) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const role = authContext.adminRole || authContext.user?.adminRole;
    const isAuthorized = Boolean(
      authContext.isSuperAdmin ||
      role === 'admin' ||
      role === 'super_admin' ||
      role === 'marketing_manager'
    );

    if (!isAuthorized) {
      return NextResponse.json({ error: 'Forbidden: Insufficient permissions to send custom emails.' }, { status: 403 });
    }

    const body = await req.json();
    const result = await emailService.sendEmail(body);

    if (result && result.status !== 'failed') {
      await adminRepository.createAuditLog({
        adminId: authContext.userId,
        adminName: authContext.user.name,
        action: 'EMAIL_CUSTOM_SENT',
        module: 'Email',
        targetId: result.id,
        targetSummary: result.toEmail,
        details: `Custom email sent to ${result.toEmail} with subject "${result.subject}" (status: ${result.status})`,
        ipAddress: authContext.ipAddress,
      });
    }

    return NextResponse.json(result);
  } catch (error: any) {
    console.error('API /api/admin/email/custom-send POST error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
