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
  '00112233445566778899aabbccddeeff:2f8b0994c8a19b84196df62d1b75f8920ceac228e32627f7a4febe90a5492c5f2c82e3398d17b69db7dd38e28e2bab003a8b8ec59350981e93fcfe01f525188f';
