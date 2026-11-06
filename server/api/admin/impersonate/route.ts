import { NextRequest, NextResponse } from '@/src/shims/next-server';
import { userRepository } from '@/server/repositories/user.repository';
import { adminRepository } from '@/server/repositories/admin.repository';
import { db } from '@/src/db/index';
import * as schema from '@/src/db/schema';
import { eq } from '@/src/db/pg-orm';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const authContext = req.auth;
    if (!authContext) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const body = await req.json();
    const { action, userId } = body;

    if (action === 'start') {
      if (!userId || typeof userId !== 'string') {
        return NextResponse.json({ error: 'Target userId is required' }, { status: 400 });
      }

      const role = authContext.adminRole || authContext.user?.adminRole;
      const isActualAdmin = role === 'admin' || role === 'super_admin';

      if (!isActualAdmin) {
        return NextResponse.json({ error: 'Forbidden: Only administrators can initiate impersonation sessions' }, { status: 403 });
      }

      const targetUser = await userRepository.findById(userId);
      if (!targetUser) {
        return NextResponse.json({ error: 'Target user not found' }, { status: 404 });
      }

      if (targetUser.adminRole || targetUser.type === 'admin') {
        return NextResponse.json({ error: 'Cannot impersonate an administrator or staff member' }, { status: 403 });
      }

      const sessionId = `sess_imp_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
      await userRepository.createSession(
        sessionId,
        targetUser.id,
        authContext.ipAddress,
        req.headers.get('user-agent') || 'Browser',
        authContext.userId // Preserves real administrator identity in impersonated_by column
      );

      await adminRepository.createAuditLog({
        adminId: authContext.userId,
        adminName: authContext.user.name,
        action: 'IMPERSONATION_STARTED',
        module: 'Users / Impersonation',
        targetId: targetUser.id,
        targetSummary: targetUser.name,
        details: `Admin ${authContext.user.name} initiated server-side impersonation session for user ${targetUser.name}`,
        ipAddress: authContext.ipAddress,
      });

      const response = NextResponse.json({
        success: true,
        sessionToken: sessionId,
        user: targetUser,
        impersonatedBy: authContext.userId,
      });

      response.cookies.set('chillyads_session', sessionId, {
        path: '/',
        httpOnly: true,
        sameSite: 'lax',
        maxAge: 7200, // 2 hours
      });

      return response;
    }

    if (action === 'stop') {
      // Find the current session token
      const authHeader = req.headers.get('authorization');
      const bearerToken = authHeader?.startsWith('Bearer ') ? authHeader.slice(7).trim() : null;
      const cookieSession =
        req.cookies.get('chillyads_session')?.value ||
        req.cookies.get('session_token')?.value;
      const token = bearerToken || cookieSession;

      if (!token) {
        return NextResponse.json({ error: 'No active session to terminate' }, { status: 400 });
      }

      const currentSessionData = await userRepository.findSession(token);
      const realAdminId = currentSessionData?.session?.impersonatedBy;

      if (!realAdminId) {
        return NextResponse.json({ error: 'Current session is not an impersonated session' }, { status: 400 });
      }

      // Delete the temporary impersonation session
      await userRepository.deleteSession(token);

      // Create a fresh clean session for the original admin
      const adminSessionId = `sess_adm_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
      await userRepository.createSession(
        adminSessionId,
        realAdminId,
        authContext.ipAddress,
        req.headers.get('user-agent') || 'Browser'
      );

      const realAdmin = await userRepository.findById(realAdminId);

      await adminRepository.createAuditLog({
        adminId: realAdminId,
        adminName: realAdmin?.name || 'Administrator',
        action: 'IMPERSONATION_ENDED',
        module: 'Users / Impersonation',
        targetId: authContext.userId,
        targetSummary: authContext.user.name,
        details: `Admin terminated server-side impersonation session`,
        ipAddress: authContext.ipAddress,
      });

      const response = NextResponse.json({
        success: true,
        message: 'Impersonation ended. Administrator session restored.',
        adminUser: realAdmin,
        sessionToken: adminSessionId,
      });

      response.cookies.set('chillyads_session', adminSessionId, {
        path: '/',
        httpOnly: true,
        sameSite: 'lax',
        maxAge: 7 * 24 * 3600,
      });

      return response;
    }

    return NextResponse.json({ error: 'Invalid action. Supported: start, stop' }, { status: 400 });
  } catch (error: any) {
    console.error('API /api/admin/impersonate error:', error);
    return NextResponse.json({ error: error.message || 'Failed to process impersonation' }, { status: 500 });
  }
}
