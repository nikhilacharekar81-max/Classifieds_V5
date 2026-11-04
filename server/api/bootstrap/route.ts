import { NextRequest, NextResponse } from '@/src/shims/next-server';
import { categoryRepository } from '@/server/repositories/category.repository';
import { locationRepository } from '@/server/repositories/location.repository';
import { boostRepository } from '@/server/repositories/boost.repository';
import { adminRepository } from '@/server/repositories/admin.repository';
import { cmsRepository } from '@/server/repositories/cms.repository';
import { listingRepository } from '@/server/repositories/listing.repository';
import { userRepository } from '@/server/repositories/user.repository';
import { getAuthenticatedUser } from '@/lib/auth/session';
import { toPublicListingDTO } from '@/lib/utils/seoAndUrlHelper';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const authContext = await getAuthenticatedUser(req);
    const isStaff = !!(authContext?.isAdmin || authContext?.isModerator);

    const [
      categories,
      customFields,
      locations,
      packages,
      settings,
      allCmsPages,
      listingsData,
      users,
    ] = await Promise.all([
      categoryRepository.findAll(),
      categoryRepository.findAllCustomFields(),
      locationRepository.findAll(),
      boostRepository.findAllPackages(),
      adminRepository.getSystemSettings(),
      cmsRepository.findAllPages(),
      listingRepository.findMarketplaceListings({ status: 'approved', limit: 500 }),
      authContext?.isAdmin ? userRepository.findAll() : Promise.resolve([]),
    ]);

    // Finding 40: Unauthenticated or regular users should only receive published CMS pages
    const cmsPages = isStaff ? allCmsPages : allCmsPages.filter((p) => p.status === 'published');

    // Strip sensitive internal fields for bootstrap listings if not admin/staff
    const publicListings = isStaff
      ? listingsData.items
      : listingsData.items.map((l) => toPublicListingDTO(l));

    return NextResponse.json(
      {
        categories,
        customFields,
        locations,
        packages,
        settings,
        cmsPages,
        listings: publicListings,
        totalListings: listingsData.total,
        users,
        currentUser: authContext?.user || null,
        adminRole: authContext?.adminRole || null,
      },
      {
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
          Pragma: 'no-cache',
          Expires: '0',
        },
      }
    );
  } catch (error: any) {
    console.error('API /api/bootstrap error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to bootstrap application data' },
      {
        status: 500,
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
        },
      }
    );
  }
}

