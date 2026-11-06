import { NextRequest, NextResponse } from '@/src/shims/next-server';
import { listingService } from '@/server/services/listing.service';
import { getAuthenticatedUser } from '@/lib/auth/session';
import { toPublicListingDTO } from '@/lib/utils/seoAndUrlHelper';

export const dynamic = 'force-dynamic';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const noCacheHeaders = {
    'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
    Pragma: 'no-cache',
    Expires: '0',
  };

  const listing = await listingService.getListingById(id);
  if (!listing) {
    return NextResponse.json({ error: 'Listing not found' }, { status: 404, headers: noCacheHeaders });
  }

  const authContext = await getAuthenticatedUser(req);
  const isOwner = Boolean(authContext?.userId && authContext.userId === listing.sellerId);
  const isActualAdmin = Boolean(
    authContext?.isSuperAdmin ||
    authContext?.adminRole === 'admin' ||
    authContext?.adminRole === 'super_admin'
  );
  const isModerator = Boolean(
    authContext?.isModerator ||
    authContext?.adminRole === 'moderator'
  );

  // Expiration Check: If listing is expired, only owner or actual admin can view it
  const isExpired = listing.expiresAt && new Date(listing.expiresAt) <= new Date();

  if (isExpired) {
    if (!isOwner && !isActualAdmin) {
      return NextResponse.json({ error: 'Listing not found or expired' }, { status: 404, headers: noCacheHeaders });
    }
  } else if (listing.status !== 'approved') {
    if (!isOwner && !isActualAdmin && !isModerator) {
      return NextResponse.json({ error: 'Listing not found or expired' }, { status: 404, headers: noCacheHeaders });
    }
  }

  // Strip internal/administrator-only fields unless caller is owner or actual administrator (admin / super_admin)
  if (!isOwner && !isActualAdmin) {
    return NextResponse.json(toPublicListingDTO(listing), { headers: noCacheHeaders });
  }

  return NextResponse.json(listing, { headers: noCacheHeaders });
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    const authContext = await getAuthenticatedUser(req);
    if (!authContext) {
      return NextResponse.json({ error: 'Unauthorized: Authentication required' }, { status: 401 });
    }

    const isActualAdmin = Boolean(authContext.isSuperAdmin || authContext.adminRole === 'admin' || authContext.adminRole === 'super_admin');
    const isModerator = Boolean(authContext.isModerator || authContext.adminRole === 'moderator' || isActualAdmin);

    const body = await req.json();
    const result = await listingService.updateListing(id, body, authContext.userId, isActualAdmin, isModerator);
    if (!result.success) {
      return NextResponse.json(
        { error: result.error, code: result.status === 409 ? 'DUPLICATE_TITLE' : 'VALIDATION_ERROR' },
        { status: result.status }
      );
    }
    return NextResponse.json(result.listing);
  } catch (err: any) {
    console.error(`API /api/listings/${id} PUT error:`, err);
    return NextResponse.json({ error: err.message || 'Internal Server Error' }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    const authContext = await getAuthenticatedUser(req);
    if (!authContext) {
      return NextResponse.json({ error: 'Unauthorized: Authentication required' }, { status: 401 });
    }

    const isActualAdmin = Boolean(authContext.isSuperAdmin || authContext.adminRole === 'admin' || authContext.adminRole === 'super_admin');
    const isPrivileged = Boolean(isActualAdmin || authContext.isModerator);
    const success = await listingService.deleteListing(id, authContext.userId, isPrivileged);
    if (!success) {
      return NextResponse.json({ error: 'Listing not found or could not be deleted' }, { status: 404 });
    }
    return NextResponse.json({ success: true, message: 'Listing deleted successfully' });
  } catch (err: any) {
    console.error(`API /api/listings/${id} DELETE error:`, err);
    const status = err.message?.includes('Unauthorized') ? 403 : 500;
    return NextResponse.json({ error: err.message || 'Internal Server Error' }, { status });
  }
}
