import { NextRequest, NextResponse } from '@/src/shims/next-server';
import { getAuthenticatedUser, getRequestIp } from '@/lib/auth/session';
import { userRepository } from '@/server/repositories/user.repository';
import { safeErrorResponse, addSecurityHeaders } from '@/lib/auth/security';
import { emailService } from '@/server/services/email.service';
import crypto from 'node:crypto';

export async function POST(req: NextRequest) {
  try {
    const authContext = await getAuthenticatedUser(req);
    const body = await req.json().catch(() => ({}));
    const targetEmail = authContext?.user?.email || body?.email;

    if (!targetEmail || typeof targetEmail !== 'string') {
      return addSecurityHeaders(
        NextResponse.json({ error: 'Email address is required' }, { status: 400 })
      );
    }

    const cleanEmail = targetEmail.toLowerCase().trim();
    const ipAddress = getRequestIp(req);
    const rateKey = `verify_email_request:${ipAddress}:${cleanEmail}`;

    const rateCheck = await userRepository.checkRateLimit(rateKey, 5, 15 * 60 * 1000, 15 * 60 * 1000);
    if (!rateCheck.allowed) {
      return addSecurityHeaders(
        NextResponse.json(
          { error: 'Too many verification email requests. Please try again later.' },
          { status: 429 }
        )
      );
    }
    await userRepository.recordFailedAttempt(rateKey);

    const genericSuccess = {
      success: true,
      message: 'If an account exists with that email address, a verification link has been sent.',
    };

    const userRow = await userRepository.findByEmail(cleanEmail);
    if (userRow) {
      const rawToken = crypto.randomBytes(32).toString('hex');
      const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');
      const tokenId = `evt_${crypto.randomUUID()}`;
      const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

      await userRepository.createEmailVerificationToken(tokenId, userRow.id, tokenHash, expiresAt);

      const emailResult = await emailService.sendCustomEmail({
        toEmail: cleanEmail,
        toName: userRow.name || 'User',
        subject: 'Verify Your Email Address - Chillyads',
        body: `<p>Hello ${userRow.name},</p><p>Please verify your email address by clicking the link below:</p><p><a href="${verifyUrl}">${verifyUrl}</a></p><p>This link expires in 24 hours.</p>`,
        type: 'email_verification',
      });

      if (emailResult.status !== 'delivered') {
        throw new Error('Failed to send verification email');
      }
    }

    return addSecurityHeaders(NextResponse.json(genericSuccess));
  } catch (error: any) {
    return safeErrorResponse(error, 'Unable to send verification email. Please try again.');
  }
}
