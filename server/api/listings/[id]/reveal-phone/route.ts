import { NextRequest, NextResponse } from '@/src/shims/next-server';
import { listingService } from '@/server/services/listing.service';
import { userRepository } from '@/server/repositories/user.repository';
import { getRequestIp } from '@/lib/auth/session';
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

  const clientIp = getRequestIp(req);
  const rateLimitKey = `reveal_phone:${clientIp}`;

  // Rate limit: max 30 reveals per 15-minute window per IP to prevent bulk scraping
  const rateLimit = await userRepository.checkRateLimit(rateLimitKey, 30, 15 * 60 * 1000, 15 * 60 * 1000);
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

  // Record attempt
  await userRepository.recordFailedAttempt(rateLimitKey, 15 * 60 * 1000, 15 * 60 * 1000);

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
