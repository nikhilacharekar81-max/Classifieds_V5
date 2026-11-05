import { NextRequest, NextResponse } from '@/src/shims/next-server';
import { userRepository } from '@/server/repositories/user.repository';
import { safeErrorResponse, addSecurityHeaders } from '@/lib/auth/security';
import crypto from 'node:crypto';

export async function POST(req: NextRequest) {
  try {
    const { token } = await req.json().catch(() => ({}));

    if (!token || typeof token !== 'string') {
      return addSecurityHeaders(
        NextResponse.json({ error: 'Verification token is required' }, { status: 400 })
      );
    }

    const tokenHash = crypto.createHash('sha256').update(token.trim()).digest('hex');
    const result = await userRepository.consumeEmailVerificationToken(tokenHash);

    if (!result.success) {
      return addSecurityHeaders(
        NextResponse.json(
          { error: result.error || 'Invalid or expired email verification token' },
          { status: 400 }
        )
      );
    }

    return addSecurityHeaders(
      NextResponse.json({
        success: true,
        message: 'Your email address has been successfully verified!',
      })
    );
  } catch (error: any) {
    return safeErrorResponse(error, 'Unable to verify email address. Please try again.');
  }
}
