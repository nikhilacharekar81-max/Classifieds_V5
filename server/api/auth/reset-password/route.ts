import { NextRequest, NextResponse } from '@/src/shims/next-server';
import { userRepository } from '@/server/repositories/user.repository';
import { hashPassword } from '@/lib/auth/password';
import { safeErrorResponse, addSecurityHeaders } from '@/lib/auth/security';
import crypto from 'node:crypto';

export async function POST(req: NextRequest) {
  try {
    const { token, newPassword } = await req.json().catch(() => ({}));

    if (!token || typeof token !== 'string' || !newPassword || typeof newPassword !== 'string') {
      return addSecurityHeaders(
        NextResponse.json({ error: 'Token and new password are required' }, { status: 400 })
      );
    }

    if (newPassword.length < 4 || newPassword.length > 20) {
      return addSecurityHeaders(
        NextResponse.json(
          { error: 'New password must be between 4 and 20 characters long' },
          { status: 400 }
        )
      );
    }

    const tokenHash = crypto.createHash('sha256').update(token.trim()).digest('hex');
    const newPasswordHash = await hashPassword(newPassword);

    // Atomic transaction: locks token, marks used, updates password, and deletes active sessions
    const result = await userRepository.consumePasswordResetTokenAndSetPassword(tokenHash, newPasswordHash);

    if (!result.success) {
      return addSecurityHeaders(
        NextResponse.json(
          { error: result.error || 'Invalid or expired password reset token' },
          { status: 400 }
        )
      );
    }

    return addSecurityHeaders(
      NextResponse.json({
        success: true,
        message: 'Password has been reset successfully. Please log in with your new password.',
      })
    );
  } catch (error: any) {
    return safeErrorResponse(error, 'Unable to reset password. Please try again.');
  }
}
