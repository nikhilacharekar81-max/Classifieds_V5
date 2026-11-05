import { NextRequest, NextResponse } from '@/src/shims/next-server';
import { userRepository } from '@/server/repositories/user.repository';
import { emailService } from '@/server/services/email.service';
import { hashPassword } from '@/lib/auth/password';
import { getRequestIp } from '@/lib/auth/session';
import { safeErrorResponse, addSecurityHeaders } from '@/lib/auth/security';
import crypto from 'node:crypto';

export async function POST(req: NextRequest) {
  try {
    const { name, email, password, phone, city, state, type } = await req.json().catch(() => ({}));

    if (!name || !email || !password) {
      return addSecurityHeaders(
        NextResponse.json({ error: 'Name, email, and password are required' }, { status: 400 })
      );
    }

    const cleanEmail = String(email).toLowerCase().trim();

    // Password policy: exactly 4 to 20 characters, no complexity rules enforced
    if (typeof password !== 'string' || password.length < 4 || password.length > 20) {
      return addSecurityHeaders(
        NextResponse.json(
          { error: 'Password must be between 4 and 20 characters long' },
          { status: 400 }
        )
      );
    }

    const existing = await userRepository.findByEmail(cleanEmail);
    if (existing) {
      return addSecurityHeaders(
        NextResponse.json({ error: 'An account with this email already exists' }, { status: 409 })
      );
    }

    const passwordHash = await hashPassword(String(password));
    const userId = `usr_${crypto.randomUUID().replace(/-/g, '').slice(0, 16)}`;

    const userObj = await userRepository.create({
      id: userId,
      name: String(name).trim(),
      email: cleanEmail,
      phone: phone ? String(phone).trim() : '',
      passwordHash,
      type: type || 'user',
      city: city || 'Mumbai',
      state: state || 'Maharashtra',
    });

    // Verification token
    const token = crypto.randomBytes(32).toString('hex');
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours
    await userRepository.createEmailVerificationToken(`vet_${crypto.randomUUID()}`, userId, tokenHash, expiresAt);

    // Send email
    const verificationUrl = `${req.nextUrl.origin}/verify-email?token=${token}`;
    const emailResult = await emailService.sendCustomEmail({
      toEmail: cleanEmail,
      toName: userObj.name,
      subject: 'Verify your Chillyads account',
      body: `Welcome to Chillyads! Please click the link below to verify your email address:\n\n${verificationUrl}`,
      type: 'verify_email',
      relatedUserId: userId,
    });

    const response = NextResponse.json(
      {
        success: true,
        user: userObj,
        emailSent: emailResult.status === 'delivered',
        message: emailResult.status === 'delivered'
          ? 'Account created. Check your email for verification.'
          : 'Account created, but verification email failed to send. Please request a new one.',
      },
      { status: 201 }
    );

    return addSecurityHeaders(response);
  } catch (error: any) {
    return safeErrorResponse(error, 'Registration failed. Please try again.');
  }
}
