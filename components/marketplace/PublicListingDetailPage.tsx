import React from 'react';
import { Category, Listing, LocationItem } from '@/lib/types';
import { NavLink } from '@/components/common/NavLink';
import { Footer } from '@/components/common/Footer';
import { buildChillyUrl } from '@/lib/utils/seoAndUrlHelper';
import { MarketplaceHeader } from './MarketplaceHeader';
import { CategorySubNavbar } from './CategorySubNavbar';
import { ListingSpecsAndDescription } from './detail/ListingSpecsAndDescription';
import { SellerLiveChatBox, BuyerSafetyBanner } from './detail/SellerLiveChatBox';
import { SimilarListingsSection } from './detail/SimilarListingsSection';
import { ListingMapWidget } from './ListingMapWidget';
import {
  PublicListingShareButton,
  PublicListingGalleryIsland,
  PublicListingOfferIsland,
} from './PublicListingDetailClient';

export interface PublicListingDetailPageProps {
  listing: Listing;
  relatedListings: Listing[];
  categories: Category[];
  locations: LocationItem[];
  enablePrivacyChoices?: boolean;
}

export const PublicListingDetailPage: React.FC<PublicListingDetailPageProps> = ({
  listing,
  relatedListings,
  categories: rawCategories,
  locations,
  enablePrivacyChoices = false,
}) => {
  const categories: Category[] = rawCategories.map((c) => ({
    id: c.id,
    name: c.name,
    slug: c.slug,
    icon: c.icon,
    parentId: c.parentId,
    order: c.order,
    isActive: c.isActive,
    listingCount: c.listingCount,
  }));

  const category = categories.find((c) => c.id === listing.categoryId);
  const subcategory = listing.subcategoryId
    ? categories.find((c) => c.id === listing.subcategoryId)
    : null;

  const filteredRelated = relatedListings
    .filter((l) => l.id !== listing.id && l.status === 'approved')
    .slice(0, 4);

  const cityUrl = buildChillyUrl({
    city: listing.location.city || 'All India',
    categories,
  });

  const categoryUrl = buildChillyUrl({
    city: listing.location.city || 'All India',
    categoryId: listing.categoryId,
    subcategoryId: 'all',
    categories,
  });

  const subcategoryUrl = subcategory
    ? buildChillyUrl({
        city: listing.location.city || 'All India',
        categoryId: listing.categoryId,
        subcategoryId: subcategory.id,
        categories,
      })
    : '';

  return (
    <div className="min-h-screen bg-[#f8f9fa] text-[#202124] pb-20">
      <MarketplaceHeader
        effectiveCity={listing.location?.city || 'All India'}
        categories={categories}
        locations={locations}
        activeCategoryId={listing.categoryId}
        activeSubcategoryId={listing.subcategoryId}
      />

      <CategorySubNavbar
        currentCity={listing.location?.city}
        activeCategoryId={listing.categoryId}
        activeSubcategoryId={listing.subcategoryId}
        categories={categories}
      />

      {/* Top Breadcrumb Bar */}
      <nav
        aria-label="Breadcrumb"
        className="bg-white border-b border-slate-200 listing-breadcrumb text-slate-500"
      >
        <div className="max-w-7xl mx-auto px-4 py-2.5 flex items-center justify-between text-xs overflow-x-auto whitespace-nowrap scrollbar-none">
          <div className="flex items-center gap-2">
            <NavLink
              href="/"
              className="hover:text-blue-600 font-medium flex items-center gap-1 shrink-0"
            >
              Home
            </NavLink>
            {listing.location?.city && (
              <>
                <span className="text-slate-300">/</span>
                <NavLink
                  href={cityUrl}
                  className="hover:text-blue-600 font-medium transition-colors cursor-pointer shrink-0"
                >
                  {listing.location.city}
                </NavLink>
              </>
            )}
            <span className="text-slate-300">/</span>
            {category && (
              <>
                <NavLink
                  href={categoryUrl}
                  className="hover:text-blue-600 font-medium transition-colors cursor-pointer shrink-0"
                >
                  {category.name}
                </NavLink>
                <span className="text-slate-300">/</span>
              </>
            )}
            {subcategory && (
              <>
                <NavLink
                  href={subcategoryUrl}
                  className="hover:text-blue-600 font-medium transition-colors cursor-pointer shrink-0"
                >
                  {subcategory.name}
                </NavLink>
                <span className="text-slate-300">/</span>
              </>
            )}
            <span className="text-slate-900 font-semibold truncate max-w-xs sm:max-w-md">
              {listing.title}{' '}
              {listing.location.locality ? `in ${listing.location.locality}` : ''}{' '}
              {listing.location.city ? `, ${listing.location.city}` : ''}
            </span>
          </div>

          <div className="hidden sm:flex items-center gap-3 text-slate-400 shrink-0 pl-4">
            <span>AD ID: #{listing.id}</span>
            <PublicListingShareButton />
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 py-6">
        <article
          itemScope
          itemType="https://schema.org/Product"
          className="grid grid-cols-1 lg:grid-cols-12 gap-6"
        >
          <meta itemProp="name" content={listing.title} />
          <meta itemProp="description" content={listing.description} />
          <meta itemProp="image" content={listing.images[0]} />
          <div
            itemProp="offers"
            itemScope
            itemType="https://schema.org/Offer"
            className="hidden"
          >
            {listing.price !== null && listing.price !== undefined && (
              <meta itemProp="price" content={String(listing.price)} />
            )}
            <meta itemProp="priceCurrency" content="INR" />
            <meta
              itemProp="availability"
              content={
                listing.status === 'sold'
                  ? 'https://schema.org/OutOfStock'
                  : 'https://schema.org/InStock'
              }
            />
            <meta itemProp="itemCondition" content="https://schema.org/UsedCondition" />
          </div>

          {/* Left Column (7 cols): Images & Full Specs */}
          <div className="lg:col-span-7 space-y-6">
            <PublicListingGalleryIsland listing={listing} />
            <ListingSpecsAndDescription listing={listing} />
          </div>

          {/* Right Column (5 cols): Price, Seller & Interactive Chat */}
          <div className="lg:col-span-5 space-y-6">
            <PublicListingOfferIsland listing={listing} />

            <SellerLiveChatBox listing={listing} />

            <ListingMapWidget
              cityName={listing.location.city}
              locality={listing.location.locality}
              state={listing.location.state}
              title={listing.title}
              priceFormatted={listing.price !== null && listing.price !== undefined ? `₹${listing.price.toLocaleString('en-IN')}` : 'Price on request'}
            />

            <BuyerSafetyBanner />
          </div>
        </article>

        <SimilarListingsSection
          relatedListings={filteredRelated}
          cityName={listing.location.city}
          categories={categories}
        />
      </main>

      <Footer
        categories={categories}
        enablePrivacyChoices={enablePrivacyChoices}
      />
    </div>
  );
};
