import { NextRequest, NextResponse } from '@/src/shims/next-server';
import { userRepository } from '@/server/repositories/user.repository';
import { getRequestIp } from '@/lib/auth/session';
import { safeErrorResponse, addSecurityHeaders } from '@/lib/auth/security';
import { emailService } from '@/server/services/email.service';
import crypto from 'node:crypto';

export async function POST(req: NextRequest) {
  try {
    const { email } = await req.json().catch(() => ({}));
    if (!email || typeof email !== 'string') {
      return addSecurityHeaders(
        NextResponse.json({ error: 'Email address is required' }, { status: 400 })
      );
    }

    const cleanEmail = email.toLowerCase().trim();
    const ipAddress = getRequestIp(req);
    const rateKey = `forgot_password:${ipAddress}:${cleanEmail}`;

    // Rate limit: max 5 requests per 15 minutes
    const rateCheck = await userRepository.checkRateLimit(rateKey, 5, 15 * 60 * 1000, 15 * 60 * 1000);
    if (!rateCheck.allowed) {
      return addSecurityHeaders(
        NextResponse.json(
          { error: 'Too many password reset requests. Please try again later.' },
          { status: 429 }
        )
      );
    }
    await userRepository.recordFailedAttempt(rateKey);

    const genericSuccess = {
      success: true,
      message: 'If an account exists with that email address, password reset instructions have been sent.',
    };

    const userRow = await userRepository.findByEmail(cleanEmail);
    if (userRow) {
      const rawToken = crypto.randomBytes(32).toString('hex');
      const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');
      const tokenId = `prt_${crypto.randomUUID()}`;
      const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

      await userRepository.createPasswordResetToken(tokenId, userRow.id, tokenHash, expiresAt);

      // Attempt to send email via emailService
      try {
        const resetUrl = `${req.nextUrl.origin}/my-account?tab=reset-password&token=${rawToken}`;
        await emailService.sendCustomEmail({
          toEmail: cleanEmail,
          toName: userRow.name || 'User',
          subject: 'Reset Your Chillyads Password',
          body: `<p>Hello ${userRow.name},</p><p>You requested a password reset. Click the link below or copy it to reset your password:</p><p><a href="${resetUrl}">${resetUrl}</a></p><p>This link expires in 1 hour.</p>`,
          type: 'password_reset',
        });
      } catch (emailErr) {
        console.warn('[ForgotPassword] Email delivery skipped or unconfigured. Reset Token generated:', {
          email: cleanEmail,
          rawToken,
        });
      }
    }

    return addSecurityHeaders(NextResponse.json(genericSuccess));
  } catch (error: any) {
    return safeErrorResponse(error, 'Unable to process password reset request. Please try again.');
  }
}
