import { NextRequest, NextResponse } from '@/src/shims/next-server';
import { listingService } from '@/server/services/listing.service';
import { userRepository } from '@/server/repositories/user.repository';
import { getRequestIp, getAuthenticatedUser } from '@/lib/auth/session';
import { addSecurityHeaders } from '@/lib/auth/security';

export const dynamic = 'force-dynamic';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  if (!id || typeof id !== 'string' || !id.trim()) {
    return addSecurityHeaders(
      NextResponse.json({ error: 'Listing ID is required' }, { status: 400 })
    );
  }

  // 1. Scraper protection: Block empty User-Agent and automated scrapers
  const userAgent = req.headers.get('user-agent') || '';
  if (
    !userAgent.trim() ||
    /curl|wget|python|scrapy|httpclient|postman|aiohttp|urllib/i.test(userAgent)
  ) {
    return addSecurityHeaders(
      NextResponse.json(
        { error: 'Access denied: automated scraping detected' },
        {
          status: 403,
          headers: {
            'Cache-Control': 'no-store, no-cache, must-revalidate',
          },
        }
      )
    );
  }

  // 2. Differentiate authenticated vs guest rate limits
  const authContext = await getAuthenticatedUser(req);
  const isAuthenticated = Boolean(authContext?.user?.id);
  const clientIp = getRequestIp(req);

  const rateLimitKey = isAuthenticated
    ? `reveal_phone:user:${authContext!.user.id}`
    : `reveal_phone:ip:${clientIp}`;

  const maxAttempts = isAuthenticated ? 30 : 15;
  const windowMs = 15 * 60 * 1000; // 15 minutes
  const blockDurationMs = 15 * 60 * 1000;

  const rateLimit = await userRepository.checkRateLimit(
    rateLimitKey,
    maxAttempts,
    windowMs,
    blockDurationMs
  );

  if (!rateLimit.allowed) {
    return addSecurityHeaders(
      NextResponse.json(
        { error: 'Too many requests. Please try again later.' },
        {
          status: 429,
          headers: {
            'Retry-After': String(rateLimit.retryAfterSeconds),
            'Cache-Control': 'no-store, no-cache, must-revalidate',
          },
        }
      )
    );
  }

  // Record reveal attempt under designated rate limit key
  await userRepository.recordFailedAttempt(
    rateLimitKey,
    windowMs,
    blockDurationMs,
    maxAttempts
  );

  // 3. Fetch phone with public accessibility checks (approved, non-expired)
  const phone = await listingService.getSellerPhoneForListing(id);
  if (!phone) {
    return addSecurityHeaders(
      NextResponse.json(
        { error: 'Listing not found, expired, or phone not available' },
        {
          status: 404,
          headers: {
            'Cache-Control': 'no-store, no-cache, must-revalidate',
          },
        }
      )
    );
  }

  return addSecurityHeaders(
    NextResponse.json(
      { phone },
      {
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate',
        },
      }
    )
  );
}
