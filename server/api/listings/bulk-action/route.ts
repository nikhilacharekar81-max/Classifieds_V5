import { NextRequest, NextResponse } from '@/src/shims/next-server';
import { listingService } from '@/server/services/listing.service';
import { listingRepository } from '@/server/repositories/listing.repository';
import { getAuthenticatedUser } from '@/lib/auth/session';

export async function POST(req: NextRequest) {
  try {
    const authContext = await getAuthenticatedUser(req);
    if (!authContext) {
      return NextResponse.json({ error: 'Unauthorized: Authentication required' }, { status: 401 });
    }

    const { action, ids, data } = await req.json();
    if (!action || !Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json(
        { error: 'action and non-empty ids array are required' },
        { status: 400 }
      );
    }

    if (ids.length > 100) {
      return NextResponse.json(
        { error: 'Bulk operations are capped at a maximum of 100 items per request' },
        { status: 400 }
      );
    }

    const isPrivileged = Boolean(authContext.isAdmin || authContext.isModerator || authContext.isSuperAdmin);

    const isApproving = action === 'approve' || data?.status === 'approved';
    const isRejecting = action === 'reject' || data?.status === 'rejected';

    // Admin/Moderator permissions required for approving or rejecting listings
    if ((isApproving || isRejecting) && !isPrivileged) {
      return NextResponse.json({ error: 'Forbidden: Moderator or Admin permission required' }, { status: 403 });
    }

    // Ownership verification for non-privileged user bulk operations
    if (!isPrivileged) {
      for (const id of ids) {
        const item = await listingRepository.findById(id);
        if (!item || item.sellerId !== authContext.userId) {
          return NextResponse.json(
            { error: `Unauthorized: You do not own listing ${id}` },
            { status: 403 }
          );
        }
      }
    }

    if (isApproving) {
      const count = await listingService.bulkApprove(ids);
      return NextResponse.json({ success: true, count });
    }

    if (isRejecting) {
      const reason = data?.reason || data?.rejectionReason || 'Violates community marketplace guidelines';
      const count = await listingService.bulkReject(ids, reason);
      return NextResponse.json({ success: true, count });
    }

    if (action === 'delete') {
      const count = await listingService.bulkDelete(ids);
      return NextResponse.json({ success: true, count });
    }

    if (action === 'renew' || (action === 'update' && (data?.renew || data?.action === 'renew'))) {
      // Validate all listings before renewing
      for (const id of ids) {
        const item = await listingRepository.findById(id);
        if (!item) {
          return NextResponse.json({ error: `Listing ${id} not found` }, { status: 404 });
        }

        // Ordinary seller renewal checks
        if (!isPrivileged) {
          if (item.sellerId !== authContext.userId) {
            return NextResponse.json(
              { error: `Unauthorized: You do not own listing ${id}` },
              { status: 403 }
            );
          }
          if (item.status === 'pending') {
            return NextResponse.json(
              { error: `Cannot renew listing ${id}: Pending listings must undergo moderation and cannot be renewed directly.` },
              { status: 400 }
            );
          }
          if (item.status === 'rejected') {
            return NextResponse.json(
              { error: `Cannot renew listing ${id}: Rejected listings cannot be renewed.` },
              { status: 400 }
            );
          }
        }

        // For both seller and admin: renewal is strictly for expired listings
        const isExpired =
          item.status === 'expired' ||
          (Boolean(item.expiresAt) && new Date(item.expiresAt).getTime() <= Date.now());

        if (!isExpired) {
          return NextResponse.json(
            { error: `Cannot renew listing ${id}: Listing is currently active and not expired.` },
            { status: 400 }
          );
        }
      }

      // Renewal strictly enforces a 30-day period from the renewal time
      const count = await listingService.bulkRenew(ids, 30);
      return NextResponse.json({ success: true, count, renewedDurationDays: 30 });
    }

    return NextResponse.json({ error: `Unsupported bulk action: ${action}` }, { status: 400 });
  } catch (err: any) {
    console.error('API /api/listings/bulk-action error:', err);
    return NextResponse.json({ error: err.message || 'Error processing bulk action' }, { status: 500 });
  }
}
