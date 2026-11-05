import { NextRequest, NextResponse } from '@/src/shims/next-server';
import { getAuthenticatedUser } from '@/lib/auth/session';
import { userRepository } from '@/server/repositories/user.repository';
import { verifyPassword, hashPassword } from '@/lib/auth/password';
import { safeErrorResponse, addSecurityHeaders } from '@/lib/auth/security';

export async function POST(req: NextRequest) {
  try {
    const authContext = await getAuthenticatedUser(req);
    if (!authContext) {
      return addSecurityHeaders(
        NextResponse.json({ error: 'Unauthorized: Authentication required' }, { status: 401 })
      );
    }

    const { currentPassword, newPassword } = await req.json().catch(() => ({}));

    if (!currentPassword || !newPassword) {
      return addSecurityHeaders(
        NextResponse.json(
          { error: 'Current password and new password are required' },
          { status: 400 }
        )
      );
    }

    if (typeof newPassword !== 'string' || newPassword.length < 4 || newPassword.length > 20) {
      return addSecurityHeaders(
        NextResponse.json(
          { error: 'New password must be between 4 and 20 characters long' },
          { status: 400 }
        )
      );
    }

    const userRow = await userRepository.findByEmail(authContext.user.email);
    if (!userRow || !userRow.passwordHash) {
      return addSecurityHeaders(
        NextResponse.json({ error: 'Current password is incorrect' }, { status: 400 })
      );
    }

    const isCurrentValid = await verifyPassword(String(currentPassword), userRow.passwordHash);
    if (!isCurrentValid) {
      return addSecurityHeaders(
        NextResponse.json({ error: 'Current password is incorrect' }, { status: 400 })
      );
    }

    const newPasswordHash = await hashPassword(String(newPassword));
    const result = await userRepository.changePasswordAndInvalidateOtherSessions(
      authContext.userId,
      newPasswordHash,
      authContext.sessionId
    );

    if (!result.success) {
      return addSecurityHeaders(
        NextResponse.json({ error: result.error || 'Failed to change password' }, { status: 400 })
      );
    }

    return addSecurityHeaders(
      NextResponse.json({
        success: true,
        message: 'Password changed successfully. Other active sessions have been invalidated.',
      })
    );
  } catch (error: any) {
    return safeErrorResponse(error, 'Unable to change password. Please try again.');
  }
}
