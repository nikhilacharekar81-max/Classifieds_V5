import { NextResponse } from '@/src/shims/next-server';

/**
 * Standard Security Headers applied to API responses.
 */
export function addSecurityHeaders(response: NextResponse): NextResponse {
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('X-Frame-Options', 'SAMEORIGIN');
  response.headers.set('X-XSS-Protection', '1; mode=block');
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  return response;
}

/**
 * Creates a safe JSON error response that does not reveal SQL details, stack traces, or internal server paths.
 */
export function safeErrorResponse(
  error: any,
  userMessage = 'An unexpected server error occurred. Please try again later.',
  status = 500
): NextResponse {
  console.error('[ServerError]', error);
  const response = NextResponse.json({ error: userMessage }, { status });
  return addSecurityHeaders(response);
}

/**
 * Pre-computed dummy password hash used to perform constant-time verification for nonexistent accounts,
 * preventing email enumeration through timing attacks.
 */
export const DUMMY_PASSWORD_HASH =
  'a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6:e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2c3d4e5f6a7b8c9d0e1f2a3b4';
