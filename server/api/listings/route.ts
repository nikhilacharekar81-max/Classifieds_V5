import { NextRequest, NextResponse } from '@/src/shims/next-server';
import { listingService } from '@/server/services/listing.service';
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
  const isPrivileged = Boolean(authContext?.isAdmin || authContext?.isModerator || authContext?.isSuperAdmin);
  const isOwner = Boolean(authContext?.userId && sellerId && sellerId === authContext.userId);

  // Security Gate: Privileged roles and listing owners querying their own ads can view non-approved statuses
  let effectiveStatus: string | undefined = 'approved';
  if (isPrivileged) {
    effectiveStatus = requestedStatus || 'all';
  } else if (isOwner) {
    effectiveStatus = requestedStatus || 'all';
  } else {
    effectiveStatus = 'approved';
  }

  const [result, categories] = await Promise.all([
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
  ]);

  const noCacheHeaders = {
    'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
    Pragma: 'no-cache',
    Expires: '0',
  };

  // Strip internal fields for public DTO responses unless requested by owner or privileged admin
  if (!isPrivileged && !isOwner) {
    return NextResponse.json(
      {
        items: result.items.map((item) => toPublicListingDTO(item)),
        total: result.total,
        ...(categories ? { categories } : {}),
      },
      { headers: noCacheHeaders }
    );
  }

  return NextResponse.json(
    {
      ...result,
      ...(categories ? { categories } : {}),
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

    // Validate price
    const priceNum = Number(body.price);
    if (isNaN(priceNum) || !isFinite(priceNum) || priceNum < 0) {
      return NextResponse.json({ error: 'Price must be a valid non-negative number' }, { status: 400 });
    }

    // Sanitize image URLs array
    const validImages = Array.isArray(body.images)
      ? body.images.filter((img: any) => typeof img === 'string' && (img.startsWith('http://') || img.startsWith('https://'))).slice(0, 5)
      : [];

    // Strip sensitive fields that sellers cannot assign to themselves
    const safePayload: any = {
      title: body.title.trim(),
      description: rawDescription,
      price: priceNum,
      categoryId: body.categoryId.trim(),
      subcategoryId: body.subcategoryId ? String(body.subcategoryId).trim() : undefined,
      location: body.location || {
        city: body.city || 'Mumbai',
        state: body.state || 'Maharashtra',
        locality: body.locality || 'Locality',
      },
      images: validImages,
      customAttributes: body.customAttributes && typeof body.customAttributes === 'object' ? body.customAttributes : {},
      sellerName: authContext.user.name,
      sellerPhone: authContext.user.phone || body.sellerPhone || '',
      sellerId: authContext.userId, // Derived strictly from verified session
      // Moderation workflow: pending unless user is an authorized admin/moderator/super_admin
      status: authContext.isAdmin || authContext.isModerator || authContext.isSuperAdmin ? (body.status || 'approved') : 'pending',
      isFeatured: false,
      isBoosted: false,
    };

    const result = await listingService.createListing(safePayload, authContext.userId, {
      name: authContext.user.name,
      ipAddress: authContext.ipAddress,
      isAdminAction: authContext.isAdmin,
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
