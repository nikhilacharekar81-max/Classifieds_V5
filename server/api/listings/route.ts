import { NextRequest, NextResponse } from '@/src/shims/next-server';
import { listingService } from '@/server/services/listing.service';
import { listingRepository } from '@/server/repositories/listing.repository';
import { getCategoriesWithLiveCounts } from '@/server/cache/reference-data.cache';
import { getAuthenticatedUser } from '@/lib/auth/session';
import { toPublicListingDTO } from '@/lib/utils/seoAndUrlHelper';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const city = searchParams.get('city') || undefined;
  const category = searchParams.get('category') || undefined;
  const subcategory = searchParams.get('subcategory') || undefined;
  const search = searchParams.get('search') || undefined;
  const requestedStatus = searchParams.get('status') || undefined;
  const sellerId = searchParams.get('sellerId') || undefined;
  const includeCategories =
    searchParams.get('includeCategories') === '1' ||
    searchParams.get('includeCategories') === 'true';

  const sort = searchParams.get('sort') || undefined;
  const propertyType = searchParams.get('propertyType') || undefined;
  const configuration = searchParams.get('configuration') || undefined;
  const propertyStatus = searchParams.get('propertyStatus') || undefined;
  const listedBy = searchParams.get('listedBy') || undefined;
  const furnishing = searchParams.get('furnishing') || undefined;
  const brokerage = searchParams.get('brokerage') || undefined;
  const tenantPreference = searchParams.get('tenantPreference') || undefined;
  const availableFrom = searchParams.get('availableFrom') || undefined;
  const petsAllowed = searchParams.get('petsAllowed') || undefined;

  // Validate and clamp numeric bounds
  const parsePos = (raw: string | null) =>
    raw !== null && raw !== '' && !isNaN(Number(raw)) && isFinite(Number(raw)) && Number(raw) >= 0 ? Number(raw) : undefined;

  const minPrice = parsePos(searchParams.get('minPrice'));
  const maxPrice = parsePos(searchParams.get('maxPrice'));
  const minArea = parsePos(searchParams.get('minArea'));
  const maxArea = parsePos(searchParams.get('maxArea'));
  const maxDeposit = parsePos(searchParams.get('maxDeposit'));

  const rawLimit = searchParams.get('limit');
  const limit = rawLimit !== null && !isNaN(Number(rawLimit)) ? Math.min(Math.max(Number(rawLimit) || 50, 1), 500) : 50;

  const rawOffset = searchParams.get('offset');
  const offset = rawOffset !== null && !isNaN(Number(rawOffset)) ? Math.max(Number(rawOffset) || 0, 0) : 0;

  const authContext = await getAuthenticatedUser(req);
  const isActualAdmin = Boolean(
    authContext?.isSuperAdmin ||
    authContext?.adminRole === 'admin' ||
    authContext?.adminRole === 'super_admin'
  );
  const isModerator = Boolean(
    authContext?.isModerator ||
    authContext?.adminRole === 'moderator'
  );
  const isOwner = Boolean(authContext?.userId && sellerId && sellerId === authContext.userId);

  // Security Gate: Only actual administrators, moderators, and listing owners querying their own ads can view non-approved statuses
  let effectiveStatus: string | undefined = 'approved';
  if (isActualAdmin || isModerator || isOwner) {
    effectiveStatus = requestedStatus || 'all';
  } else {
    effectiveStatus = 'approved';
  }

  const [result, categories, statusCounts] = await Promise.all([
    listingService.getMarketplaceListings({
      city,
      category,
      subcategory,
      search,
      status: effectiveStatus,
      sellerId,
      minPrice,
      maxPrice,
      propertyType,
      configuration,
      propertyStatus,
      listedBy,
      furnishing,
      minArea,
      maxArea,
      maxDeposit,
      brokerage,
      tenantPreference,
      availableFrom,
      petsAllowed,
      sort,
      limit,
      offset,
    }),
    includeCategories ? getCategoriesWithLiveCounts(city) : Promise.resolve(undefined),
    sellerId && (isOwner || isActualAdmin || isModerator) ? listingRepository.getSellerStatusCounts(sellerId) : Promise.resolve(undefined),
  ]);

  const noCacheHeaders = {
    'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
    Pragma: 'no-cache',
    Expires: '0',
  };

  // Strip administrator-only/internal fields unless requested by the listing owner or an actual administrator (admin / super_admin)
  if (!isActualAdmin && !isOwner) {
    return NextResponse.json(
      {
        items: result.items.map((item) => toPublicListingDTO(item)),
        total: result.total,
        ...(categories ? { categories } : {}),
        ...(statusCounts ? { statusCounts } : {}),
      },
      { headers: noCacheHeaders }
    );
  }

  return NextResponse.json(
    {
      ...result,
      ...(categories ? { categories } : {}),
      ...(statusCounts ? { statusCounts } : {}),
    },
    { headers: noCacheHeaders }
  );
}

export async function POST(req: NextRequest) {
  try {
    const authContext = await getAuthenticatedUser(req);
    if (!authContext) {
      return NextResponse.json({ error: 'Authentication required to post an ad' }, { status: 401 });
    }

    const isActualAdmin = Boolean(authContext.isSuperAdmin || authContext.adminRole === 'admin' || authContext.adminRole === 'super_admin');

    const body = await req.json();

    // Validate title
    if (!body.title || typeof body.title !== 'string' || body.title.trim().length < 3) {
      return NextResponse.json({ error: 'Title is required and must be at least 3 characters long' }, { status: 400 });
    }
    if (body.title.trim().length > 120) {
      return NextResponse.json({ error: 'Title cannot exceed 120 characters' }, { status: 400 });
    }

    // Validate categoryId
    if (!body.categoryId || typeof body.categoryId !== 'string') {
      return NextResponse.json({ error: 'Category ID is required' }, { status: 400 });
    }

    // Validate description
    const rawDescription = String(body.description || '').trim();
    if (rawDescription.length > 5000) {
      return NextResponse.json({ error: 'Description cannot exceed 5000 characters' }, { status: 400 });
    }

    // Validate price (optional: missing/empty price becomes null; zero is preserved)
    let priceNum: number | null = null;
    if (body.price !== undefined && body.price !== null && String(body.price).trim() !== '') {
      const p = Number(body.price);
      if (isNaN(p) || !isFinite(p) || p < 0) {
        return NextResponse.json(
          { error: 'Price must be a valid non-negative number' },
          { status: 400 }
        );
      }
      priceNum = p;
    }

    // Require authenticated seller account phone; do not accept arbitrary body.sellerPhone override
    const sellerAccountPhone = authContext.user.phone ? authContext.user.phone.trim() : '';
    if (!sellerAccountPhone) {
      return NextResponse.json(
        { error: 'A phone number is required on your account to post listings. Please add your phone number in your account settings.' },
        { status: 400 }
      );
    }

    const rawCustomAttrs =
      body.customAttributes && typeof body.customAttributes === 'object' ? { ...body.customAttributes } : {};
    const sellerRequestedFeatured =
      !isActualAdmin &&
      Boolean(body.requestedFeatured || body.isFeatured || body.isBoosted || rawCustomAttrs.requestedFeatured);
    if (sellerRequestedFeatured) {
      rawCustomAttrs.requestedFeatured = true;
    }

    // Strip sensitive fields that sellers cannot assign to themselves
    const safePayload: any = {
      title: body.title.trim(),
      description: rawDescription,
      price: priceNum,
      categoryId: body.categoryId.trim(),
      subcategoryId: body.subcategoryId ? String(body.subcategoryId).trim() : undefined,
      location: body.location || {
        city: body.city ? String(body.city).trim() : (authContext.user.location?.city || ''),
        state: body.state ? String(body.state).trim() : (authContext.user.location?.state || ''),
        locality: body.locality ? String(body.locality).trim() : '',
      },
      images: body.images,
      customAttributes: rawCustomAttrs,
      sellerName: authContext.user.name,
      sellerPhone: sellerAccountPhone,
      sellerId: authContext.userId, // Derived strictly from verified session
      // Moderation workflow: only actual admins or moderators can bypass 'pending' status
      status: (isActualAdmin || authContext.isModerator) ? (body.status || 'approved') : 'pending',
      // Only actual admin/super_admin can set featured/boosted for free on creation
      isFeatured: isActualAdmin ? Boolean(body.isFeatured) : false,
      isBoosted: isActualAdmin ? Boolean(body.isBoosted) : false,
      postingFeePaymentId: body.postingFeePaymentId,
      postingFeeOrderId: body.postingFeeOrderId,
      postingFeeSignature: body.postingFeeSignature,
      paymentGateway: body.paymentGateway,
    };

    const result = await listingService.createListing(safePayload, authContext.userId, {
      name: authContext.user.name,
      ipAddress: authContext.ipAddress,
      isAdminAction: isActualAdmin,
    });

    if (!result.success) {
      return NextResponse.json(
        { error: result.error, code: result.status === 409 ? 'DUPLICATE_TITLE' : 'VALIDATION_ERROR' },
        { status: result.status }
      );
    }

    return NextResponse.json(result.listing, { status: 201 });
  } catch (err: any) {
    console.error('API /api/listings POST error:', err);
    return NextResponse.json({ error: err.message || 'Internal Server Error' }, { status: 500 });
  }
}
