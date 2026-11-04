import { NextRequest, NextResponse } from '@/src/shims/next-server';
import { listingService } from '@/server/services/listing.service';

export const dynamic = 'force-dynamic';

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  if (!id) {
    return NextResponse.json({ error: 'Listing ID is required' }, { status: 400 });
  }

  const phone = await listingService.getSellerPhoneForListing(id);
  if (!phone) {
    return NextResponse.json(
      { error: 'Listing not found, expired, or phone not available' },
      {
        status: 404,
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate',
        },
      }
    );
  }

  return NextResponse.json(
    { phone },
    {
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate',
      },
    }
  );
}
