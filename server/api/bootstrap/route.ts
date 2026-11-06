import { NextRequest, NextResponse } from '@/src/shims/next-server';
import { categoryRepository } from '@/server/repositories/category.repository';
import { locationRepository } from '@/server/repositories/location.repository';
import { boostRepository } from '@/server/repositories/boost.repository';
import { adminRepository } from '@/server/repositories/admin.repository';
import { cmsRepository } from '@/server/repositories/cms.repository';
import { listingRepository } from '@/server/repositories/listing.repository';
import { userRepository } from '@/server/repositories/user.repository';
import { getAuthenticatedUser } from '@/lib/auth/session';
import { hasPermission } from '@/lib/auth/roles';
import { toPublicListingDTO } from '@/lib/utils/seoAndUrlHelper';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const authContext = await getAuthenticatedUser(req);
    const role = authContext?.adminRole || authContext?.user?.adminRole;
    const isActualAdmin = Boolean(
      authContext?.isSuperAdmin || role === 'super_admin' || role === 'admin'
    );
    const canManageUsers = Boolean(authContext && hasPermission(role, 'canManageUsers'));
    const canManageCms = Boolean(authContext && hasPermission(role, 'canManageCms'));

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
      canManageUsers
        ? userRepository.findAllForAdmin({ includeKycDocuments: isActualAdmin })
        : Promise.resolve([]),
    ]);

    // Unauthenticated or non-CMS roles only receive published CMS pages
    const cmsPages = canManageCms ? allCmsPages : allCmsPages.filter((p) => p.status === 'published');

    // Strip internal fields for bootstrap listings unless actual administrator
    const publicListings = isActualAdmin
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

