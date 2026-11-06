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
    const isAuthorized = Boolean(authContext.isSuperAdmin || role === 'admin' || role === 'super_admin');
    if (!isAuthorized) {
      return NextResponse.json({ error: 'Forbidden: Administrator privileges required to test SMTP connection.' }, { status: 403 });
    }

    const body = await req.json();
    const result = await emailService.testSmtpConnection(body);

    if (result.success) {
      await adminRepository.createAuditLog({
        adminId: authContext.userId,
        adminName: authContext.user.name,
        action: 'SMTP_TEST_SUCCESS',
        module: 'Email',
        targetId: 'smtp_config',
        targetSummary: 'SMTP Connection Test',
        details: `SMTP connection test succeeded (${result.latencyMs}ms): ${result.message}`,
        ipAddress: authContext.ipAddress,
      });
    } else {
      await adminRepository.createAuditLog({
        adminId: authContext.userId,
        adminName: authContext.user.name,
        action: 'SMTP_TEST_FAILED',
        module: 'Email',
        targetId: 'smtp_config',
        targetSummary: 'SMTP Connection Test',
        details: `SMTP connection test failed (${result.latencyMs}ms): ${result.message}`,
        ipAddress: authContext.ipAddress,
      });
    }

    return NextResponse.json(result);
  } catch (error: any) {
    console.error('API /api/admin/email/test-smtp POST error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
