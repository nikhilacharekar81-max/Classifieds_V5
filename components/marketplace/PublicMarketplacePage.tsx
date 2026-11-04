import React from 'react';
import { Category, Listing, LocationItem } from '@/lib/types';
import { MarketplaceHeader } from './MarketplaceHeader';
import { CategorySubNavbar } from './CategorySubNavbar';
import { MarketplaceHeroBanner } from './MarketplaceHeroBanner';
import { CategoryDirectoryGrid } from './CategoryDirectoryGrid';
import { LatestAdsSection } from './LatestAdsSection';
import { CategoryTreeSidebar } from './CategoryTreeSidebar';
import { PublicListingsCatalogClient } from './PublicListingsCatalogClient';
import { SeoContentBlock } from './SeoContentBlock';
import { getSeoContent } from '@/lib/data/seoContentData';
import { Footer } from '@/components/common/Footer';

export interface PublicMarketplacePageProps {
  mode: 'directory' | 'listings';
  effectiveCity: string;
  effectiveCategory?: string;
  effectiveSubcategory?: string;
  effectiveSearch?: string;
  isSearchRoute?: boolean;
  query?: Record<string, string>;
  categories: Category[];
  locations: LocationItem[];
  listings: Listing[];
  totalListings: number;
  currentPage?: number;
  isLoading?: boolean;
  isCountsLoading?: boolean;
  enablePrivacyChoices?: boolean;
}

const ITEMS_PER_PAGE = 50;

export const PublicMarketplacePage: React.FC<PublicMarketplacePageProps> = ({
  mode,
  effectiveCity,
  effectiveCategory = 'all',
  effectiveSubcategory = 'all',
  effectiveSearch = '',
  isSearchRoute = false,
  query = {},
  categories: rawCategories,
  locations,
  listings,
  totalListings,
  currentPage = 1,
  isLoading = false,
  isCountsLoading = false,
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

  const rootCategories = categories.filter((c) => !c.parentId && c.isActive);

  const totalDirectoryListings =
    totalListings > 0
      ? totalListings
      : rootCategories.reduce((sum, c) => sum + (c.listingCount || 0), 0) || listings.length;

  const seoCategoryName =
    effectiveSubcategory !== 'all'
      ? categories.find((c) => c.id === effectiveSubcategory)?.name || 'Directory'
      : effectiveCategory !== 'all'
      ? categories.find((c) => c.id === effectiveCategory)?.name || 'Directory'
      : 'Classifieds';

  const seoCategoryId =
    effectiveSubcategory !== 'all'
      ? effectiveSubcategory
      : effectiveCategory !== 'all'
      ? effectiveCategory
      : 'home';

  const seoData = getSeoContent(effectiveCity || 'All India', seoCategoryName, seoCategoryId);

  // For catalog pages, pass only the categories referenced by the active route and listings
  // (plus their parent categories) so the client catalog island RSC payload stays lean.
  const catalogCategories: Category[] = (() => {
    if (mode !== 'listings') return [];
    const neededIds = new Set<string>();
    if (effectiveCategory && effectiveCategory !== 'all') neededIds.add(effectiveCategory);
    if (effectiveSubcategory && effectiveSubcategory !== 'all') neededIds.add(effectiveSubcategory);
    for (const l of listings) {
      if (l.categoryId) neededIds.add(l.categoryId);
      if (l.subcategoryId) neededIds.add(l.subcategoryId);
    }
    for (const c of categories) {
      if (neededIds.has(c.id) && c.parentId) {
        neededIds.add(c.parentId);
      }
    }
    return categories.filter((c) => neededIds.has(c.id));
  })();

  return (
    <div className="min-h-screen bg-[#f8f9fa] text-[#202124] flex flex-col font-sans overflow-x-hidden">
      <MarketplaceHeader
        effectiveCity={effectiveCity}
        effectiveSearch={effectiveSearch}
        categories={categories}
        locations={locations}
        activeCategoryId={effectiveCategory}
        activeSubcategoryId={effectiveSubcategory}
      />

      <CategorySubNavbar
        currentCity={effectiveCity}
        activeCategoryId={effectiveCategory}
        activeSubcategoryId={effectiveSubcategory}
        categories={categories}
      />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6 flex-1 space-y-6 w-full">
        {mode === 'directory' ? (
          <div className="space-y-8">
            <MarketplaceHeroBanner
              effectiveCity={effectiveCity}
              effectiveSearch={effectiveSearch}
              categories={categories}
              totalDirectoryListings={totalDirectoryListings}
              rootCategoriesCount={rootCategories.length}
              isCountsLoading={isCountsLoading}
            />

            <CategoryDirectoryGrid
              categories={categories}
              currentCity={effectiveCity}
              selectedCategoryId={effectiveCategory}
              selectedSubcategoryId={effectiveSubcategory}
              isCountsLoading={isCountsLoading}
            />

            <LatestAdsSection
              latestAds={listings}
              effectiveCity={effectiveCity}
              categories={categories}
              isLoading={isLoading}
            />
          </div>
        ) : (
          <PublicListingsCatalogClient
            effectiveCity={effectiveCity}
            effectiveCategory={effectiveCategory}
            effectiveSubcategory={effectiveSubcategory}
            effectiveSearch={effectiveSearch}
            isSearchRoute={isSearchRoute}
            categories={catalogCategories}
            listings={listings}
            totalMatchingListings={totalListings}
            currentPage={currentPage}
            itemsPerPage={ITEMS_PER_PAGE}
            initialQuery={query}
            isLoading={isLoading}
            categorySidebarNode={
              <CategoryTreeSidebar
                categories={categories}
                rootCategories={rootCategories}
                effectiveCity={effectiveCity}
                effectiveCategory={effectiveCategory}
                effectiveSubcategory={effectiveSubcategory}
              />
            }
          />
        )}
      </main>

      <SeoContentBlock
        locationName={effectiveCity || 'All India'}
        categoryName={seoCategoryName}
        categoryId={seoCategoryId}
        seoData={seoData}
      />

      <Footer
        categories={categories}
        enablePrivacyChoices={enablePrivacyChoices}
      />
    </div>
  );
};
