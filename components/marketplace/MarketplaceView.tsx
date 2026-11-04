'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { Search } from 'lucide-react';
import { NavLink } from '@/components/common/NavLink';
import { useApp } from '@/context/AppContext';
import { Listing } from '@/lib/types';
import { calculateDistanceKm } from '@/lib/utils/distanceUtils';
import { isListingBoosted } from '@/lib/utils/boostHelper';
import { navigateTo } from '@/lib/router/useRouter';
import { buildChillyUrl, ParsedRoute } from '@/lib/utils/seoAndUrlHelper';
import { CategoryDirectoryGrid } from './CategoryDirectoryGrid';
import { CategorySubNavbar } from './CategorySubNavbar';
import { SeoContentBlock } from './SeoContentBlock';
import { Footer } from '@/components/common/Footer';
import { MarketplaceHeader } from './MarketplaceHeader';
import { MarketplaceMobileDrawer } from './MarketplaceMobileDrawer';
import { MarketplaceHeroBanner } from './MarketplaceHeroBanner';
import { LatestAdsSection } from './LatestAdsSection';
import { CategoryTreeSidebar } from './CategoryTreeSidebar';
import { PropertyFiltersSidebar } from './PropertyFiltersSidebar';
import { MarketplaceListingsToolbar } from './MarketplaceListingsToolbar';
import { ListingGridCard } from './ListingGridCard';
import { ListingListicleCard } from './ListingListicleCard';
import { MarketplacePagination } from './MarketplacePagination';

export interface MarketplaceViewProps {
  initialRoute?: ParsedRoute;
  initialQuery?: Record<string, string>;
  initialListings?: Listing[];
  initialTotalListings?: number;
  initialPage?: number;
}

const ITEMS_PER_PAGE = 50;

export const MarketplaceView: React.FC<MarketplaceViewProps> = ({
  initialRoute,
  initialQuery,
  initialListings,
  initialTotalListings,
  initialPage,
}) => {
  const {
    listings,
    categories,
    selectedMarketplaceCity,
    setSelectedMarketplaceCategory,
    selectedMarketplaceSubcategory,
    setSelectedMarketplaceSubcategory,
    selectedMarketplaceCategory,
    marketplaceSearch,
    setMarketplaceSearch,
    addToast,
    userLocation,
    signOut,
  } = useApp();

  const isSearchRoute = initialRoute?.routeType === 'search' || Boolean(initialQuery?.q);
  const effectiveCity =
    (isSearchRoute && initialQuery?.city) ||
    (!isSearchRoute && initialRoute?.city ? initialRoute.city : '') ||
    selectedMarketplaceCity ||
    'All India';

  const effectiveCategory =
    (isSearchRoute && initialQuery?.category) ||
    (!isSearchRoute && initialRoute?.categoryId ? initialRoute.categoryId : '') ||
    selectedMarketplaceCategory ||
    'all';

  const effectiveSubcategory =
    (isSearchRoute && initialQuery?.subcategory) ||
    (!isSearchRoute && initialRoute?.subcategoryId ? initialRoute.subcategoryId : '') ||
    selectedMarketplaceSubcategory ||
    'all';

  const effectiveSearch = marketplaceSearch || initialQuery?.q || '';

  const [activeViewMode, setActiveViewMode] = useState<'listings' | 'directory'>(() =>
    effectiveCategory !== 'all' || isSearchRoute ? 'listings' : 'directory'
  );
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [latestAdsLayout, setLatestAdsLayout] = useState<'grid' | 'listicle'>('grid');
  const [listingsLayout, setListingsLayout] = useState<'grid' | 'listicle'>('grid');

  // Sort & Property filter states
  const [sortBy, setSortBy] = useState<string>(() => initialQuery?.sort || 'newest');
  const [propTypeFilter, setPropTypeFilter] = useState<string>(
    () => initialQuery?.propertyType || 'all'
  );
  const [propConfigFilter, setPropConfigFilter] = useState<string>(
    () => initialQuery?.configuration || 'all'
  );
  const [propStatusFilter, setPropStatusFilter] = useState<string>(
    () => initialQuery?.propertyStatus || 'all'
  );
  const [propListedByFilter, setPropListedByFilter] = useState<string>(
    () => initialQuery?.listedBy || 'all'
  );
  const [propFurnishingFilter, setPropFurnishingFilter] = useState<string>(
    () => initialQuery?.furnishing || 'all'
  );
  const [propMinPriceFilter, setPropMinPriceFilter] = useState<string>(
    () => initialQuery?.minPrice || ''
  );
  const [propMaxPriceFilter, setPropMaxPriceFilter] = useState<string>(
    () => initialQuery?.maxPrice || ''
  );
  const [propMinAreaFilter, setPropMinAreaFilter] = useState<string>(
    () => initialQuery?.minArea || ''
  );
  const [propMaxAreaFilter, setPropMaxAreaFilter] = useState<string>(
    () => initialQuery?.maxArea || ''
  );

  // Rental specific filter states
  const [rentDepositMaxFilter, setRentDepositMaxFilter] = useState<string>(
    () => initialQuery?.maxDeposit || ''
  );
  const [rentBrokerageFilter, setRentBrokerageFilter] = useState<string>(
    () => initialQuery?.brokerage || 'all'
  );
  const [rentTenantPrefFilter, setRentTenantPrefFilter] = useState<string>(
    () => initialQuery?.tenantPreference || 'all'
  );
  const [rentAvailabilityFilter, setRentAvailabilityFilter] = useState<string>(
    () => initialQuery?.availableFrom || 'all'
  );
  const [rentPetsFilter, setRentPetsFilter] = useState<string>(
    () => initialQuery?.petsAllowed || 'all'
  );

  useEffect(() => {
    setSortBy(initialQuery?.sort || 'newest');
  }, [initialQuery?.sort]);

  useEffect(() => {
    const targetMode = effectiveCategory !== 'all' || isSearchRoute ? 'listings' : 'directory';
    if (activeViewMode !== targetMode) {
      setActiveViewMode(targetMode);
    }
  }, [effectiveCategory, effectiveSubcategory, isSearchRoute, activeViewMode]);

  const resetPropertyFilters = () => {
    setPropTypeFilter('all');
    setPropConfigFilter('all');
    setPropStatusFilter('all');
    setPropListedByFilter('all');
    setPropFurnishingFilter('all');
    setPropMinPriceFilter('');
    setPropMaxPriceFilter('');
    setPropMinAreaFilter('');
    setPropMaxAreaFilter('');
    setRentDepositMaxFilter('');
    setRentBrokerageFilter('all');
    setRentTenantPrefFilter('all');
    setRentAvailabilityFilter('all');
    setRentPetsFilter('all');
  };

  const rootCategories = useMemo(
    () => categories.filter((c) => !c.parentId && c.isActive),
    [categories]
  );
  const activeMainCat = useMemo(
    () => categories.find((c) => c.id === effectiveCategory),
    [categories, effectiveCategory]
  );

  const sourceListings = initialListings !== undefined ? initialListings : listings;

  const sortedMarketplaceListings = useMemo(() => {
    const filtered = sourceListings.filter((l) => {
      if (l.status !== 'approved' && !l.isFeatured) return false;

      if (effectiveCategory !== 'all') {
        if (effectiveSubcategory !== 'all') {
          if (l.subcategoryId !== effectiveSubcategory && l.categoryId !== effectiveSubcategory) {
            return false;
          }
        } else {
          const childSubIds = categories
            .filter((c) => c.parentId === effectiveCategory)
            .map((c) => c.id);
          const matchesMain = l.categoryId === effectiveCategory;
          const matchesSub = l.subcategoryId ? childSubIds.includes(l.subcategoryId) : false;
          if (!matchesMain && !matchesSub) return false;
        }
      }

      if (effectiveCategory === 'cat_housing_realestate') {
        const attrs = l.customAttributes || {};
        if (propTypeFilter !== 'all' && attrs.property_type !== propTypeFilter) return false;
        if (propConfigFilter !== 'all' && attrs.configuration !== propConfigFilter) return false;
        if (propStatusFilter !== 'all' && attrs.property_status !== propStatusFilter) return false;
        if (propListedByFilter !== 'all' && attrs.listed_by !== propListedByFilter) return false;
        if (propFurnishingFilter !== 'all' && attrs.furnishing !== propFurnishingFilter)
          return false;
        if (propMinPriceFilter && l.price < Number(propMinPriceFilter)) return false;
        if (propMaxPriceFilter && l.price > Number(propMaxPriceFilter)) return false;
        if (propMinAreaFilter) {
          const area = Number(attrs.carpet_area || attrs.built_up_area || attrs.plot_area || 0);
          if (area < Number(propMinAreaFilter)) return false;
        }
        if (propMaxAreaFilter) {
          const area = Number(attrs.carpet_area || attrs.built_up_area || attrs.plot_area || 0);
          if (area > Number(propMaxAreaFilter)) return false;
        }

        if (effectiveSubcategory === 'sub_house_apt_rent') {
          if (rentDepositMaxFilter && Number(attrs.security_deposit || 0) > Number(rentDepositMaxFilter))
            return false;
          if (rentBrokerageFilter !== 'all' && attrs.brokerage !== rentBrokerageFilter)
            return false;
          if (rentTenantPrefFilter !== 'all' && attrs.tenant_preference !== rentTenantPrefFilter)
            return false;
          if (rentAvailabilityFilter !== 'all' && attrs.available_from !== rentAvailabilityFilter)
            return false;
          if (rentPetsFilter !== 'all' && attrs.pets_allowed !== rentPetsFilter) return false;
        }
      }

      if (effectiveCity !== 'All India' && effectiveCity !== 'All Cities') {
        const locCity = effectiveCity.toLowerCase();
        if (!l.location.city.toLowerCase().includes(locCity)) return false;
      }

      if (effectiveSearch.trim()) {
        const q = effectiveSearch.toLowerCase();
        const matchTitle = l.title.toLowerCase().includes(q);
        const matchDesc = l.description.toLowerCase().includes(q);
        const matchCity = l.location.city.toLowerCase().includes(q);
        const matchLocality = l.location.locality?.toLowerCase().includes(q);
        if (!matchTitle && !matchDesc && !matchCity && !matchLocality) return false;
      }

      return true;
    });

    return filtered.sort((a, b) => {
      const aBoosted = isListingBoosted(a);
      const bBoosted = isListingBoosted(b);
      if (aBoosted && !bBoosted) return -1;
      if (!aBoosted && bBoosted) return 1;

      if (a.isFeatured && !b.isFeatured) return -1;
      if (!a.isFeatured && b.isFeatured) return 1;

      if (userLocation) {
        const distA =
          a.location.latitude && a.location.longitude
            ? calculateDistanceKm(
                userLocation.latitude,
                userLocation.longitude,
                a.location.latitude,
                a.location.longitude
              )
            : 9999;
        const distB =
          b.location.latitude && b.location.longitude
            ? calculateDistanceKm(
                userLocation.latitude,
                userLocation.longitude,
                b.location.latitude,
                b.location.longitude
              )
            : 9999;
        return distA - distB;
      }

      if (sortBy === 'price_low' || sortBy === 'price_asc') {
        if (a.price !== b.price) return a.price - b.price;
      } else if (sortBy === 'price_high' || sortBy === 'price_desc') {
        if (b.price !== a.price) return b.price - a.price;
      } else if (sortBy === 'oldest') {
        return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      }

      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });
  }, [
    sourceListings,
    effectiveCategory,
    effectiveSubcategory,
    categories,
    propTypeFilter,
    propConfigFilter,
    propStatusFilter,
    propListedByFilter,
    propFurnishingFilter,
    propMinPriceFilter,
    propMaxPriceFilter,
    propMinAreaFilter,
    propMaxAreaFilter,
    rentDepositMaxFilter,
    rentBrokerageFilter,
    rentTenantPrefFilter,
    rentAvailabilityFilter,
    rentPetsFilter,
    effectiveCity,
    effectiveSearch,
    userLocation,
    sortBy,
  ]);

  const hasClientFilterDiverged =
    sortBy !== (initialQuery?.sort || 'newest') ||
    propTypeFilter !== (initialQuery?.propertyType || 'all') ||
    propConfigFilter !== (initialQuery?.configuration || 'all') ||
    propStatusFilter !== (initialQuery?.propertyStatus || 'all') ||
    propListedByFilter !== (initialQuery?.listedBy || 'all') ||
    propFurnishingFilter !== (initialQuery?.furnishing || 'all') ||
    propMinPriceFilter !== (initialQuery?.minPrice || '') ||
    propMaxPriceFilter !== (initialQuery?.maxPrice || '') ||
    propMinAreaFilter !== (initialQuery?.minArea || '') ||
    propMaxAreaFilter !== (initialQuery?.maxArea || '') ||
    rentDepositMaxFilter !== (initialQuery?.maxDeposit || '') ||
    rentBrokerageFilter !== (initialQuery?.brokerage || 'all') ||
    rentTenantPrefFilter !== (initialQuery?.tenantPreference || 'all') ||
    rentAvailabilityFilter !== (initialQuery?.availableFrom || 'all') ||
    rentPetsFilter !== (initialQuery?.petsAllowed || 'all');

  const isServerPaginated = initialTotalListings !== undefined && !hasClientFilterDiverged;
  const totalMatchingListings = isServerPaginated
    ? initialTotalListings
    : sortedMarketplaceListings.length;
  const totalPages = Math.max(1, Math.ceil(totalMatchingListings / ITEMS_PER_PAGE));
  const rawPage = initialPage || Math.max(1, Number(initialQuery?.page) || 1);
  const currentPage = Math.min(Math.max(1, rawPage), totalPages);

  const paginatedMarketplaceListings = isServerPaginated
    ? sortedMarketplaceListings
    : sortedMarketplaceListings.slice(
        (currentPage - 1) * ITEMS_PER_PAGE,
        currentPage * ITEMS_PER_PAGE
      );

  const totalDirectoryListings =
    initialTotalListings !== undefined
      ? initialTotalListings
      : rootCategories.reduce((sum, c) => sum + (c.listingCount || 0), 0) ||
        sortedMarketplaceListings.length;

  const latestAds = useMemo(() => {
    let filtered = sourceListings.filter((l) => l.status === 'approved' || l.isFeatured);
    if (effectiveCity !== 'All India' && effectiveCity !== 'All Cities') {
      const locCity = effectiveCity.toLowerCase();
      filtered = filtered.filter((l) => l.location.city.toLowerCase().includes(locCity));
    }
    return filtered
      .sort((a, b) => {
        if (a.isFeatured && !b.isFeatured) return -1;
        if (!a.isFeatured && b.isFeatured) return 1;
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      })
      .slice(0, 10);
  }, [sourceListings, effectiveCity]);

  const getCategoryName = (catId?: string, subId?: string) => {
    if (subId) {
      const sub = categories.find((c) => c.id === subId);
      if (sub) return sub.name;
    }
    if (catId) {
      const cat = categories.find((c) => c.id === catId);
      if (cat) return cat.name;
    }
    return '';
  };

  const handleDirectorySelectCategory = (catId: string) => {
    setSelectedMarketplaceCategory(catId);
    setSelectedMarketplaceSubcategory('all');
    setActiveViewMode('listings');
    const cat = categories.find((c) => c.id === catId);
    const targetUrl = buildChillyUrl({
      city: effectiveCity,
      categoryId: catId,
      subcategoryId: 'all',
      categories,
    });
    navigateTo(targetUrl);
    addToast({
      type: 'info',
      title: `${cat?.name || 'Category'} Selected`,
      message: `Browsing listings under ${cat?.name}.`,
    });
  };

  const handleDirectorySelectSubcategory = (catId: string, subId: string) => {
    setSelectedMarketplaceCategory(catId);
    setSelectedMarketplaceSubcategory(subId);
    setActiveViewMode('listings');
    const sub = categories.find((c) => c.id === subId);
    const targetUrl = buildChillyUrl({
      city: effectiveCity,
      categoryId: catId,
      subcategoryId: subId,
      categories,
    });
    navigateTo(targetUrl);
    addToast({
      type: 'success',
      title: `${sub?.name || 'Subcategory'} Selected`,
      message: `Filtering listings by ${sub?.name}.`,
    });
  };

  const baseListingPath = isSearchRoute
    ? '/search'
    : buildChillyUrl({
        city: effectiveCity,
        categoryId: effectiveCategory,
        subcategoryId: effectiveSubcategory,
        categories,
      });

  const buildFilterAndPageHref = (
    pageNum: number,
    overrides?: Record<string, string | undefined>
  ) => {
    const params = new URLSearchParams();
    if (isSearchRoute && effectiveSearch) params.set('q', effectiveSearch);
    if (isSearchRoute && effectiveCity && effectiveCity !== 'All India')
      params.set('city', effectiveCity);
    if (isSearchRoute && effectiveCategory && effectiveCategory !== 'all')
      params.set('category', effectiveCategory);
    if (isSearchRoute && effectiveSubcategory && effectiveSubcategory !== 'all')
      params.set('subcategory', effectiveSubcategory);

    const activeSort = overrides && 'sort' in overrides ? overrides.sort : sortBy;
    if (activeSort && activeSort !== 'newest') params.set('sort', activeSort);
    if (propTypeFilter !== 'all') params.set('propertyType', propTypeFilter);
    if (propConfigFilter !== 'all') params.set('configuration', propConfigFilter);
    if (propStatusFilter !== 'all') params.set('propertyStatus', propStatusFilter);
    if (propListedByFilter !== 'all') params.set('listedBy', propListedByFilter);
    if (propFurnishingFilter !== 'all') params.set('furnishing', propFurnishingFilter);
    if (propMinPriceFilter) params.set('minPrice', propMinPriceFilter);
    if (propMaxPriceFilter) params.set('maxPrice', propMaxPriceFilter);
    if (propMinAreaFilter) params.set('minArea', propMinAreaFilter);
    if (propMaxAreaFilter) params.set('maxArea', propMaxAreaFilter);
    if (rentDepositMaxFilter) params.set('maxDeposit', rentDepositMaxFilter);
    if (rentBrokerageFilter !== 'all') params.set('brokerage', rentBrokerageFilter);
    if (rentTenantPrefFilter !== 'all') params.set('tenantPreference', rentTenantPrefFilter);
    if (rentAvailabilityFilter !== 'all') params.set('availableFrom', rentAvailabilityFilter);
    if (rentPetsFilter !== 'all') params.set('petsAllowed', rentPetsFilter);

    if (overrides) {
      for (const [k, v] of Object.entries(overrides)) {
        if (k === 'sort') continue;
        if (v && v !== 'all') {
          params.set(k, v);
        } else {
          params.delete(k);
        }
      }
    }

    if (pageNum > 1) {
      params.set('page', String(pageNum));
    } else {
      params.delete('page');
    }

    const qs = params.toString();
    return qs ? `${baseListingPath}?${qs}` : baseListingPath;
  };

  const handleSaveWatchlist = (listing: Listing) => {
    addToast({
      type: 'info',
      title: 'Saved to Watchlist',
      message: `"${listing.title}" saved to your watchlist.`,
    });
  };

  const propertyFilterProps = {
    propTypeFilter,
    setPropTypeFilter,
    propConfigFilter,
    setPropConfigFilter,
    propStatusFilter,
    setPropStatusFilter,
    propListedByFilter,
    setPropListedByFilter,
    propFurnishingFilter,
    setPropFurnishingFilter,
    propMinPriceFilter,
    setPropMinPriceFilter,
    propMaxPriceFilter,
    setPropMaxPriceFilter,
    propMinAreaFilter,
    setPropMinAreaFilter,
    propMaxAreaFilter,
    setPropMaxAreaFilter,
    rentDepositMaxFilter,
    setRentDepositMaxFilter,
    rentBrokerageFilter,
    setRentBrokerageFilter,
    rentTenantPrefFilter,
    setRentTenantPrefFilter,
    rentAvailabilityFilter,
    setRentAvailabilityFilter,
    rentPetsFilter,
    setRentPetsFilter,
    onResetAll: resetPropertyFilters,
  };

  return (
    <div className="min-h-screen bg-[#f8f9fa] text-[#202124] flex flex-col font-sans overflow-x-hidden">
      <MarketplaceHeader
        effectiveCity={effectiveCity}
        effectiveSearch={effectiveSearch}
        onSearchChange={setMarketplaceSearch}
        onOpenMobileMenu={() => setMobileMenuOpen(true)}
      />

      <CategorySubNavbar
        currentCity={effectiveCity}
        activeCategoryId={effectiveCategory}
        activeSubcategoryId={effectiveSubcategory}
        categories={categories}
      />

      <MarketplaceMobileDrawer
        isOpen={mobileMenuOpen}
        onClose={() => setMobileMenuOpen(false)}
        categories={categories}
        rootCategories={rootCategories}
        selectedMarketplaceCity={selectedMarketplaceCity}
        selectedMarketplaceCategory={selectedMarketplaceCategory}
        selectedMarketplaceSubcategory={selectedMarketplaceSubcategory}
        onSelectCategory={(catId) => {
          setSelectedMarketplaceCategory(catId);
          setSelectedMarketplaceSubcategory('all');
          setActiveViewMode('listings');
        }}
        onResetToDirectory={() => {
          setSelectedMarketplaceCategory('all');
          setSelectedMarketplaceSubcategory('all');
          setActiveViewMode('directory');
        }}
        onSignOut={signOut}
        {...propertyFilterProps}
      />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6 flex-1 space-y-6 w-full">
        {activeViewMode === 'directory' ? (
          <div className="space-y-8 animate-in fade-in duration-200">
            <MarketplaceHeroBanner
              effectiveCity={effectiveCity}
              effectiveSearch={effectiveSearch}
              onSearchChange={setMarketplaceSearch}
              categories={categories}
              totalDirectoryListings={totalDirectoryListings}
              rootCategoriesCount={rootCategories.length}
            />

            <CategoryDirectoryGrid
              categories={categories}
              currentCity={effectiveCity}
              selectedCategoryId={effectiveCategory}
              selectedSubcategoryId={effectiveSubcategory}
              onSelectCategory={handleDirectorySelectCategory}
              onSelectSubcategory={handleDirectorySelectSubcategory}
            />

            <LatestAdsSection
              latestAds={latestAds}
              effectiveCity={effectiveCity}
              categories={categories}
              latestAdsLayout={latestAdsLayout}
              onChangeLayout={setLatestAdsLayout}
              getCategoryName={getCategoryName}
            />
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 animate-in fade-in duration-200">
            {/* Desktop Sidebar */}
            <div className="hidden md:block md:col-span-1 space-y-4 self-start">
              <CategoryTreeSidebar
                categories={categories}
                rootCategories={rootCategories}
                effectiveCity={effectiveCity}
                effectiveCategory={effectiveCategory}
                effectiveSubcategory={effectiveSubcategory}
              />

              {effectiveCategory === 'cat_housing_realestate' && (
                <PropertyFiltersSidebar
                  {...propertyFilterProps}
                  effectiveSubcategory={effectiveSubcategory}
                />
              )}
            </div>

            {/* Main Listings Column */}
            <div className="md:col-span-3 space-y-6">
              <MarketplaceListingsToolbar
                effectiveCity={effectiveCity}
                effectiveCategory={effectiveCategory}
                effectiveSubcategory={effectiveSubcategory}
                effectiveSearch={effectiveSearch}
                isSearchRoute={isSearchRoute}
                activeMainCat={activeMainCat}
                categories={categories}
                paginatedCount={paginatedMarketplaceListings.length}
                totalMatchingListings={totalMatchingListings}
                currentPage={currentPage}
                totalPages={totalPages}
                itemsPerPage={ITEMS_PER_PAGE}
                listingsLayout={listingsLayout}
                onChangeLayout={setListingsLayout}
                sortBy={sortBy}
                onChangeSort={(newSort) => {
                  setSortBy(newSort);
                  navigateTo(buildFilterAndPageHref(1, { sort: newSort }));
                }}
              />

              {paginatedMarketplaceListings.length === 0 ? (
                <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center space-y-3">
                  <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center mx-auto text-slate-400">
                    <Search className="w-6 h-6" />
                  </div>
                  <h3 className="font-bold text-slate-900">No Listings Found</h3>
                  <p className="text-xs text-slate-500 max-w-md mx-auto">
                    No ads matched your active subcategory or search filters in {effectiveCity}. Try
                    selecting a different subcategory or post the first ad!
                  </p>
                  <NavLink
                    href="/post"
                    className="inline-block px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-lg shadow cursor-pointer transition-colors"
                  >
                    Post an Ad in this Subcategory
                  </NavLink>
                </div>
              ) : (
                <>
                  {listingsLayout === 'grid' ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                      {paginatedMarketplaceListings.map((listing) => (
                        <ListingGridCard
                          key={listing.id}
                          listing={listing}
                          categories={categories}
                          subName={getCategoryName(listing.categoryId, listing.subcategoryId)}
                          userLocation={userLocation}
                          onSaveWatchlist={handleSaveWatchlist}
                          variant="catalog"
                        />
                      ))}
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {paginatedMarketplaceListings.map((listing, idx) => (
                        <ListingListicleCard
                          key={listing.id}
                          listing={listing}
                          rankNumber={(currentPage - 1) * ITEMS_PER_PAGE + idx + 1}
                          categories={categories}
                          subName={getCategoryName(listing.categoryId, listing.subcategoryId)}
                          userLocation={userLocation}
                          onSaveWatchlist={handleSaveWatchlist}
                          variant="catalog"
                        />
                      ))}
                    </div>
                  )}

                  <MarketplacePagination
                    currentPage={currentPage}
                    totalPages={totalPages}
                    totalMatchingListings={totalMatchingListings}
                    itemsPerPage={ITEMS_PER_PAGE}
                    buildPageHref={(pageNum) => buildFilterAndPageHref(pageNum)}
                  />
                </>
              )}
            </div>
          </div>
        )}
      </main>

      <SeoContentBlock
        locationName={effectiveCity || 'All India'}
        categoryName={
          effectiveSubcategory !== 'all'
            ? categories.find((c) => c.id === effectiveSubcategory)?.name || 'Directory'
            : effectiveCategory !== 'all'
            ? categories.find((c) => c.id === effectiveCategory)?.name || 'Directory'
            : 'Classifieds'
        }
        categoryId={
          effectiveSubcategory !== 'all'
            ? effectiveSubcategory
            : effectiveCategory !== 'all'
            ? effectiveCategory
            : 'home'
        }
      />
      <Footer />
    </div>
  );
};
