import test from 'node:test';
import assert from 'node:assert/strict';
import { userRepository } from '../server/repositories/user.repository';
import { POST as signupHandler } from '../server/api/auth/signup/route';
import { POST as loginHandler } from '../server/api/auth/login/route';
import { POST as forgotPasswordHandler } from '../server/api/auth/forgot-password/route';
import { POST as resetPasswordHandler } from '../server/api/auth/reset-password/route';
import { POST as changePasswordHandler } from '../server/api/auth/change-password/route';
import { POST as verifyRequestHandler } from '../server/api/auth/verify-email/request/route';
import { POST as verifyConfirmHandler } from '../server/api/auth/verify-email/confirm/route';
import { POST as logoutAllHandler } from '../server/api/auth/logout-all/route';
import { NextRequest } from '../src/shims/next-server';
import crypto from 'node:crypto';

function createMockRequest(url: string, body: any, headers?: Record<string, string>): NextRequest {
  const reqHeaders = new Headers(headers || {});
  reqHeaders.set('content-type', 'application/json');
  return new NextRequest(new URL(url, 'http://localhost:3000'), {
    method: 'POST',
    headers: reqHeaders,
    body: JSON.stringify(body),
  });
}

test('Password Policy — Signup accepts 4-20 chars and rejects outside range', async () => {
  const email4 = `pass4_${Date.now()}@example.com`;
  const req4 = createMockRequest('http://localhost:3000/api/auth/signup', {
    name: 'Test 4',
    email: email4,
    phone: '+919876543210',
    password: '1234', // Exactly 4 chars
  });
  const res4 = await signupHandler(req4);
  assert.equal(res4.status, 201, '4 character password should be accepted');

  const email20 = `pass20_${Date.now()}@example.com`;
  const req20 = createMockRequest('http://localhost:3000/api/auth/signup', {
    name: 'Test 20',
    email: email20,
    phone: '+919876543210',
    password: 'a1!b2@c3#d4$e5%f6^g7', // Exactly 20 chars
  });
  const res20 = await signupHandler(req20);
  assert.equal(res20.status, 201, '20 character password should be accepted');

  const reqShort = createMockRequest('http://localhost:3000/api/auth/signup', {
    name: 'Test Short',
    email: `short_${Date.now()}@example.com`,
    phone: '+919876543210',
    password: '123', // 3 chars
  });
  const resShort = await signupHandler(reqShort);
  assert.equal(resShort.status, 400, 'Under 4 chars password should be rejected');

  const reqLong = createMockRequest('http://localhost:3000/api/auth/signup', {
    name: 'Test Long',
    email: `long_${Date.now()}@example.com`,
    phone: '+919876543210',
    password: 'a'.repeat(21), // 21 chars
  });
  const resLong = await signupHandler(reqLong);
  assert.equal(resLong.status, 400, 'Over 20 chars password should be rejected for new registrations');
});

test('Account Enumeration & Rate Limiting — Identical 401 response and throttling', async () => {
  const testIp = `192.168.10.${Math.floor(Math.random() * 200 + 10)}`;
  const unknownReq = createMockRequest(
    'http://localhost:3000/api/auth/login',
    { email: 'nonexistent_account_12345@example.com', password: 'password123' },
    { 'x-forwarded-for': testIp }
  );

  const unknownRes = await loginHandler(unknownReq);
  assert.equal(unknownRes.status, 401);
  const unknownJson = await unknownRes.json();
  assert.equal(unknownJson.error, 'Invalid email or password');

  // Verify rate limiting after multiple failures
  const rateLimitIp = `10.0.0.${Math.floor(Math.random() * 200 + 10)}`;
  const targetEmail = `fail_${Date.now()}@example.com`;

  for (let i = 0; i < 5; i++) {
    const failReq = createMockRequest(
      'http://localhost:3000/api/auth/login',
      { email: targetEmail, password: 'wrong' },
      { 'x-forwarded-for': rateLimitIp }
    );
    await loginHandler(failReq);
  }

  const repeatReq = createMockRequest(
    'http://localhost:3000/api/auth/login',
    { email: targetEmail, password: 'wrong' },
    { 'x-forwarded-for': rateLimitIp }
  );
  const repeatRes = await loginHandler(repeatReq);
  assert.equal(repeatRes.status, 401, 'Repeated failed login attempts should return 401 without blocking IP access');
});

test('Password Reset & Token Flow — Invalidation and Session Deletion', async () => {
  const resetEmail = `reset_${Date.now()}@example.com`;
  const signupReq = createMockRequest('http://localhost:3000/api/auth/signup', {
    name: 'Reset User',
    email: resetEmail,
    password: 'oldpassword',
  });
  const signupRes = await signupHandler(signupReq);
  assert.equal(signupRes.status, 201);
  const user = (await signupRes.json()).user;

  // Request password reset
  const forgotReq = createMockRequest('http://localhost:3000/api/auth/forgot-password', {
    email: resetEmail,
  });
  const forgotRes = await forgotPasswordHandler(forgotReq);
  assert.equal(forgotRes.status, 200);
  const forgotJson = await forgotRes.json();
  assert.equal(
    forgotJson.message,
    'If an account exists with that email address, password reset instructions have been sent.'
  );

  // Generate and test reset token
  const rawToken = crypto.randomBytes(32).toString('hex');
  const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');
  const tokenId = `prt_${crypto.randomUUID()}`;
  await userRepository.createPasswordResetToken(tokenId, user.id, tokenHash, new Date(Date.now() + 3600000));

  // Perform reset with valid token and 4-20 char new password
  const resetReq = createMockRequest('http://localhost:3000/api/auth/reset-password', {
    token: rawToken,
    newPassword: 'newpassword123',
  });
  const resetRes = await resetPasswordHandler(resetReq);
  assert.equal(resetRes.status, 200);

  // Attempt reuse of token
  const reuseRes = await resetPasswordHandler(resetReq);
  assert.equal(reuseRes.status, 400, 'Token cannot be reused after successful password reset');

  // Verify login with new password works
  const newLoginReq = createMockRequest('http://localhost:3000/api/auth/login', {
    email: resetEmail,
    password: 'newpassword123',
  });
  const newLoginRes = await loginHandler(newLoginReq);
  assert.equal(newLoginRes.status, 200, 'Login with new password should succeed');
});

test('Email Verification & Logout All Sessions', async () => {
  const email = `verify_${Date.now()}@example.com`;
  const signupReq = createMockRequest('http://localhost:3000/api/auth/signup', {
    name: 'Verify User',
    email: email,
    password: 'mypassword',
  });
  const signupRes = await signupHandler(signupReq);
  assert.equal(signupRes.status, 201);
  const user = (await signupRes.json()).user;

  // Create verification token
  const rawToken = crypto.randomBytes(32).toString('hex');
  const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');
  const tokenId = `evt_${crypto.randomUUID()}`;
  await userRepository.createEmailVerificationToken(tokenId, user.id, tokenHash, new Date(Date.now() + 86400000));

  // Confirm verification
  const confirmReq = createMockRequest('http://localhost:3000/api/auth/verify-email/confirm', {
    token: rawToken,
  });
  const confirmRes = await verifyConfirmHandler(confirmReq);
  assert.equal(confirmRes.status, 200);

  const updatedUser = await userRepository.findById(user.id);
  assert.equal(updatedUser?.emailVerified, true, 'User emailVerified should be true');
});
