'use client';

import React, { useState, useRef } from 'react';
import { Search } from 'lucide-react';
import { Category, Listing } from '@/lib/types';
import { NavLink } from '@/components/common/NavLink';
import { navigateTo } from '@/lib/router/useRouter';
import { buildChillyUrl } from '@/lib/utils/seoAndUrlHelper';
import { MarketplaceListingsToolbar } from './MarketplaceListingsToolbar';
import { ListingGridCard } from './ListingGridCard';
import { ListingListicleCard } from './ListingListicleCard';
import { MarketplacePagination } from './MarketplacePagination';
import { PropertyFiltersSidebar } from './PropertyFiltersSidebar';

export interface PublicListingsCatalogClientProps {
  effectiveCity: string;
  effectiveCategory: string;
  effectiveSubcategory: string;
  effectiveSearch: string;
  isSearchRoute: boolean;
  categories: Category[];
  listings: Listing[];
  totalMatchingListings: number;
  currentPage: number;
  itemsPerPage?: number;
  initialQuery?: Record<string, string>;
  isLoading?: boolean;
  categorySidebarNode: React.ReactNode;
}

export const PublicListingsCatalogClient: React.FC<PublicListingsCatalogClientProps> = ({
  effectiveCity,
  effectiveCategory,
  effectiveSubcategory,
  effectiveSearch,
  isSearchRoute,
  categories,
  listings,
  totalMatchingListings,
  currentPage,
  itemsPerPage = 50,
  initialQuery = {},
  isLoading = false,
  categorySidebarNode,
}) => {
  const [listingsLayout, setListingsLayout] = useState<'grid' | 'listicle'>('grid');

  const sortBy = initialQuery.sort || 'newest';
  const propTypeFilter = initialQuery.propertyType || 'all';
  const propConfigFilter = initialQuery.configuration || 'all';
  const propStatusFilter = initialQuery.propertyStatus || 'all';
  const propListedByFilter = initialQuery.listedBy || 'all';
  const propFurnishingFilter = initialQuery.furnishing || 'all';
  const [propMinPriceFilter, setPropMinPriceFilterState] = useState<string>(
    initialQuery.minPrice || ''
  );
  const [propMaxPriceFilter, setPropMaxPriceFilterState] = useState<string>(
    initialQuery.maxPrice || ''
  );
  const [propMinAreaFilter, setPropMinAreaFilterState] = useState<string>(
    initialQuery.minArea || ''
  );
  const [propMaxAreaFilter, setPropMaxAreaFilterState] = useState<string>(
    initialQuery.maxArea || ''
  );
  const [rentDepositMaxFilter, setRentDepositMaxFilterState] = useState<string>(
    initialQuery.maxDeposit || ''
  );
  const rentBrokerageFilter = initialQuery.brokerage || 'all';
  const rentTenantPrefFilter = initialQuery.tenantPreference || 'all';
  const rentAvailabilityFilter = initialQuery.availableFrom || 'all';
  const rentPetsFilter = initialQuery.petsAllowed || 'all';

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const activeMainCat = categories.find((c) => c.id === effectiveCategory);
  const totalPages = Math.max(1, Math.ceil(totalMatchingListings / itemsPerPage));

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

  const applyFilterUpdate = (key: string, value: string, debounce = false) => {
    if (debounce) {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => {
        navigateTo(buildFilterAndPageHref(1, { [key]: value }));
      }, 400);
    } else {
      navigateTo(buildFilterAndPageHref(1, { [key]: value }));
    }
  };

  const resetPropertyFilters = () => {
    setPropMinPriceFilterState('');
    setPropMaxPriceFilterState('');
    setPropMinAreaFilterState('');
    setPropMaxAreaFilterState('');
    setRentDepositMaxFilterState('');
    navigateTo(
      buildFilterAndPageHref(1, {
        propertyType: 'all',
        configuration: 'all',
        propertyStatus: 'all',
        listedBy: 'all',
        furnishing: 'all',
        minPrice: '',
        maxPrice: '',
        minArea: '',
        maxArea: '',
        maxDeposit: '',
        brokerage: 'all',
        tenantPreference: 'all',
        availableFrom: 'all',
        petsAllowed: 'all',
      })
    );
  };

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

  const propertyFilterProps = {
    propTypeFilter,
    setPropTypeFilter: (v: string) => applyFilterUpdate('propertyType', v),
    propConfigFilter,
    setPropConfigFilter: (v: string) => applyFilterUpdate('configuration', v),
    propStatusFilter,
    setPropStatusFilter: (v: string) => applyFilterUpdate('propertyStatus', v),
    propListedByFilter,
    setPropListedByFilter: (v: string) => applyFilterUpdate('listedBy', v),
    propFurnishingFilter,
    setPropFurnishingFilter: (v: string) => applyFilterUpdate('furnishing', v),
    propMinPriceFilter,
    setPropMinPriceFilter: (v: string) => {
      setPropMinPriceFilterState(v);
      applyFilterUpdate('minPrice', v, true);
    },
    propMaxPriceFilter,
    setPropMaxPriceFilter: (v: string) => {
      setPropMaxPriceFilterState(v);
      applyFilterUpdate('maxPrice', v, true);
    },
    propMinAreaFilter,
    setPropMinAreaFilter: (v: string) => {
      setPropMinAreaFilterState(v);
      applyFilterUpdate('minArea', v, true);
    },
    propMaxAreaFilter,
    setPropMaxAreaFilter: (v: string) => {
      setPropMaxAreaFilterState(v);
      applyFilterUpdate('maxArea', v, true);
    },
    rentDepositMaxFilter,
    setRentDepositMaxFilter: (v: string) => {
      setRentDepositMaxFilterState(v);
      applyFilterUpdate('maxDeposit', v, true);
    },
    rentBrokerageFilter,
    setRentBrokerageFilter: (v: string) => applyFilterUpdate('brokerage', v),
    rentTenantPrefFilter,
    setRentTenantPrefFilter: (v: string) => applyFilterUpdate('tenantPreference', v),
    rentAvailabilityFilter,
    setRentAvailabilityFilter: (v: string) => applyFilterUpdate('availableFrom', v),
    rentPetsFilter,
    setRentPetsFilter: (v: string) => applyFilterUpdate('petsAllowed', v),
    onResetAll: resetPropertyFilters,
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
      {/* Desktop Sidebar: Server-Rendered CategoryTreeSidebar + Optional PropertyFiltersSidebar */}
      <div className="hidden md:block md:col-span-1 space-y-4 self-start">
        {categorySidebarNode}

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
          paginatedCount={listings.length}
          totalMatchingListings={totalMatchingListings}
          currentPage={currentPage}
          totalPages={totalPages}
          itemsPerPage={itemsPerPage}
          listingsLayout={listingsLayout}
          onChangeLayout={setListingsLayout}
          sortBy={sortBy}
          onChangeSort={(newSort) => {
            navigateTo(buildFilterAndPageHref(1, { sort: newSort }));
          }}
          isLoading={isLoading}
        />

        {isLoading ? (
          listingsLayout === 'grid' ? (
            <div
              className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4"
              aria-busy="true"
            >
              {Array.from({ length: 8 }).map((_, idx) => (
                <div
                  key={idx}
                  className="bg-white rounded-2xl border border-slate-200 overflow-hidden animate-pulse"
                >
                  <div className="aspect-4/3 bg-slate-100" />
                  <div className="p-3.5 space-y-2.5">
                    <div className="h-4 bg-slate-200 rounded w-1/2" />
                    <div className="h-3.5 bg-slate-100 rounded w-5/6" />
                    <div className="h-3 bg-slate-100 rounded w-2/3" />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="space-y-3" aria-busy="true">
              {Array.from({ length: 5 }).map((_, idx) => (
                <div
                  key={idx}
                  className="bg-white rounded-2xl border border-slate-200 p-4 flex gap-4 animate-pulse"
                >
                  <div className="w-32 h-24 bg-slate-100 rounded-xl shrink-0" />
                  <div className="flex-1 space-y-2.5 py-1">
                    <div className="h-4 bg-slate-200 rounded w-1/3" />
                    <div className="h-3.5 bg-slate-100 rounded w-3/4" />
                    <div className="h-3 bg-slate-100 rounded w-1/2" />
                  </div>
                </div>
              ))}
            </div>
          )
        ) : listings.length === 0 ? (
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
                {listings.map((listing, idx) => (
                  <ListingGridCard
                    key={listing.id}
                    listing={listing}
                    categories={categories}
                    subName={getCategoryName(listing.categoryId, listing.subcategoryId)}
                    variant="catalog"
                    priority={idx < 8}
                  />
                ))}
              </div>
            ) : (
              <div className="space-y-3">
                {listings.map((listing, idx) => (
                  <ListingListicleCard
                    key={listing.id}
                    listing={listing}
                    rankNumber={(currentPage - 1) * itemsPerPage + idx + 1}
                    categories={categories}
                    subName={getCategoryName(listing.categoryId, listing.subcategoryId)}
                    variant="catalog"
                    priority={idx < 4}
                  />
                ))}
              </div>
            )}

            <MarketplacePagination
              currentPage={currentPage}
              totalPages={totalPages}
              totalMatchingListings={totalMatchingListings}
              itemsPerPage={itemsPerPage}
              buildPageHref={(pageNum) => buildFilterAndPageHref(pageNum)}
            />
          </>
        )}
      </div>
    </div>
  );
};
