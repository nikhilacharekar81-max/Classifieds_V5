'use client';

import React, { useEffect, useMemo, useState, useRef } from 'react';
import { useApp, AppProvider, InitialServerData, useAppOptional } from '@/context/AppContext';
import { GlobalOverlays } from '@/components/common/GlobalOverlays';
import { useRouter } from '@/lib/router/useRouter';
import { parseChillyPath, updateSeoAndCanonical } from '@/lib/utils/seoAndUrlHelper';
import { Category, Listing } from '@/lib/types';
import { PublicMarketplacePage } from '@/components/marketplace/PublicMarketplacePage';
import { PublicListingDetailPage } from '@/components/marketplace/PublicListingDetailPage';
import { PostAdPage } from '@/components/marketplace/PostAdPage';
import { UserPanelPage } from '@/components/user/UserPanelPage';
import { AdminWorkspaceRouter } from '@/components/admin/AdminWorkspaceRouter';
import { INITIAL_CATEGORIES, INITIAL_LOCATIONS, INITIAL_SETTINGS } from '@/lib/data/initialData';

export interface AppClientRouterProps {
  initialPath?: string;
  initialQuery?: Record<string, string>;
  initialListing?: Listing | null;
  initialListings?: Listing[];
  initialTotalListings?: number;
  initialPage?: number;
  initialServerData?: InitialServerData;
}

const CITY_CATALOG_FILTER_KEYS = [
  'q',
  'search',
  'category',
  'subcategory',
  'minPrice',
  'maxPrice',
  'propertyType',
  'configuration',
  'propertyStatus',
  'listedBy',
  'furnishing',
  'minArea',
  'maxArea',
  'maxDeposit',
  'brokerage',
  'tenantPreference',
  'availableFrom',
  'petsAllowed',
  'sort',
  'page',
];

function WorkspaceRouterInner({
  path,
  query,
}: {
  path: string;
  query: Record<string, string>;
}) {
  const {
    activeSidebarTab,
    setActiveSidebarTab,
    theme,
    locations,
    categories,
    settings,
    selectedMarketplaceCity,
    setSelectedMarketplaceCity,
    selectedMarketplaceCategory,
    setSelectedMarketplaceCategory,
    selectedMarketplaceSubcategory,
    setSelectedMarketplaceSubcategory,
    marketplaceSearch,
    setMarketplaceSearch,
  } = useApp();

  const parsedRoute = useMemo(() => {
    return parseChillyPath(path, locations, categories);
  }, [path, locations, categories]);

  useEffect(() => {
    if (parsedRoute.city && parsedRoute.city !== selectedMarketplaceCity) {
      setSelectedMarketplaceCity(parsedRoute.city);
    }

    if (parsedRoute.routeType !== 'admin') {
      if (parsedRoute.categoryId !== selectedMarketplaceCategory) {
        setSelectedMarketplaceCategory(parsedRoute.categoryId);
      }
      if (parsedRoute.subcategoryId !== selectedMarketplaceSubcategory) {
        setSelectedMarketplaceSubcategory(parsedRoute.subcategoryId);
      }
    }

    if (query.q !== undefined && query.q !== marketplaceSearch) {
      setMarketplaceSearch(query.q);
    }

    updateSeoAndCanonical(parsedRoute, {
      listing: null,
      categories,
      siteName: settings?.siteName || 'Chillyads',
    });
  }, [
    parsedRoute,
    query.q,
    categories,
    settings,
    selectedMarketplaceCity,
    selectedMarketplaceCategory,
    selectedMarketplaceSubcategory,
    marketplaceSearch,
    setSelectedMarketplaceCity,
    setSelectedMarketplaceCategory,
    setSelectedMarketplaceSubcategory,
    setMarketplaceSearch,
  ]);

  useEffect(() => {
    if (path.startsWith('/admin')) {
      const sub = path.replace(/^\/admin\/?/, '');
      if (
        sub &&
        !sub.startsWith('users/kyc') &&
        !sub.startsWith('search') &&
        !sub.startsWith('laravel')
      ) {
        const parts = sub.split('/');
        let targetTab = sub;
        if (parts.length >= 3 && (parts[2] === 'new' || parts[2] === 'edit')) {
          targetTab = `${parts[0]}/${parts[1]}`;
        }
        if (targetTab && targetTab !== activeSidebarTab) {
          setActiveSidebarTab(targetTab);
        }
      }
    }
  }, [path, activeSidebarTab, setActiveSidebarTab]);

  if (parsedRoute.routeType === 'user-panel') {
    return (
      <div className={theme === 'dark' ? 'dark' : ''}>
        <UserPanelPage />
        <GlobalOverlays />
      </div>
    );
  }

  if (parsedRoute.routeType === 'post') {
    return (
      <div className={theme === 'dark' ? 'dark' : ''}>
        <PostAdPage />
        <GlobalOverlays />
      </div>
    );
  }

  return (
    <div className={theme === 'dark' ? 'dark' : ''}>
      <AdminWorkspaceRouter path={path} activeSidebarTab={activeSidebarTab} theme={theme} />
      <GlobalOverlays />
    </div>
  );
}

function normalizeCityKey(city?: string): string {
  if (!city) return '__ALL_INDIA__';
  const clean = city.replace(/[-_]/g, ' ').trim().toLowerCase();
  if (!clean || clean === 'all india' || clean === 'all' || clean === 'all cities') {
    return '__ALL_INDIA__';
  }
  return clean;
}

export function AppClientRouter(props: AppClientRouterProps = {}) {
  const { initialServerData } = props;
  return (
    <AppProvider initialServerData={initialServerData}>
      <AppClientRouterInner {...props} />
    </AppProvider>
  );
}

function AppClientRouterInner(props: AppClientRouterProps = {}) {
  const {
    initialPath,
    initialQuery,
    initialListing = null,
    initialListings = [],
    initialTotalListings = 0,
    initialPage = 1,
    initialServerData,
  } = props;

  const { path, query } = useRouter(initialPath, initialQuery);
  const initialCategories = initialServerData?.categories || INITIAL_CATEGORIES;
  const locations = initialServerData?.locations || INITIAL_LOCATIONS;
  const settings = initialServerData?.settings || INITIAL_SETTINGS;

  const cmsSlugs = useMemo(
    () => (initialServerData?.cmsPages || []).map((p) => p.slug.toLowerCase()),
    [initialServerData?.cmsPages]
  );

  const initialParsedRoute = parseChillyPath(
    initialPath || '/',
    locations,
    initialCategories,
    cmsSlugs
  );
  const initialIsSearch =
    initialParsedRoute.routeType === 'search' ||
    Boolean(initialQuery?.q || initialQuery?.search);
  const initialEffectiveCity =
    (initialIsSearch && initialQuery?.city) ||
    (!initialIsSearch && initialParsedRoute.city ? initialParsedRoute.city : '') ||
    'All India';

  const [scopedCategories, setScopedCategories] = useState<Category[]>(initialCategories);
  const [scopedCategoriesCity, setScopedCategoriesCity] = useState<string>(initialEffectiveCity);

  const parsedRoute = useMemo(() => {
    return parseChillyPath(path, locations, scopedCategories, cmsSlugs);
  }, [path, locations, scopedCategories, cmsSlugs]);

  const isWorkspaceRoute =
    parsedRoute.routeType === 'post' ||
    parsedRoute.routeType === 'user-panel' ||
    parsedRoute.routeType === 'admin';

  const initialRouteSignature = `${initialPath || '/'}?${new URLSearchParams(initialQuery || {}).toString()}`;
  const currentRouteSignature = `${path}?${new URLSearchParams(query || {}).toString()}`;
  const lastFetchedSignatureRef = useRef<string>(initialRouteSignature);

  // Scoped state for public pages (holds ONLY 10 directory cards, <=50 paginated catalog cards, or 1+4 detail cards)
  const [scopedListing, setScopedListing] = useState<Listing | null>(initialListing);
  const [scopedListings, setScopedListings] = useState<Listing[]>(initialListings);
  const [scopedTotal, setScopedTotal] = useState<number>(initialTotalListings);
  const [scopedPage, setScopedPage] = useState<number>(initialPage);
  const [scopedRouteSignature, setScopedRouteSignature] = useState<string>(initialRouteSignature);

  useEffect(() => {
    if (isWorkspaceRoute) return;
    if (currentRouteSignature === lastFetchedSignatureRef.current) return;
    lastFetchedSignatureRef.current = currentRouteSignature;

    let cancelled = false;
    const hasCatalogQueryFilters = CITY_CATALOG_FILTER_KEYS.some((key) => {
      const val = query[key];
      return typeof val === 'string' && val.trim() !== '' && val !== 'all';
    });

    async function fetchScopedPublicRouteData() {
      try {
        if (parsedRoute.routeType === 'listing' && parsedRoute.listingId) {
          const detailRes = await fetch(`/api/listings/${encodeURIComponent(parsedRoute.listingId)}`);
          if (!detailRes.ok || cancelled) return;
          const detailItem: Listing = await detailRes.json();
          const relRes = await fetch(
            `/api/listings?status=approved&category=${encodeURIComponent(detailItem.categoryId)}&limit=5`
          );
          const relData = relRes.ok ? await relRes.json() : { items: [] };
          const relatedItems = Array.isArray(relData.items)
            ? relData.items.filter((l: Listing) => l.id !== detailItem.id).slice(0, 4)
            : [];
          if (!cancelled) {
            setScopedListing(detailItem);
            setScopedListings(relatedItems);
            setScopedTotal(relatedItems.length);
            setScopedRouteSignature(currentRouteSignature);
            updateSeoAndCanonical(parsedRoute, {
              listing: detailItem,
              categories: scopedCategories,
              siteName: settings?.siteName || 'Chillyads',
            });
          }
          return;
        }

        if (
          parsedRoute.routeType === 'home' ||
          (parsedRoute.routeType === 'city' && !hasCatalogQueryFilters)
        ) {
          // Directory mode: fetch only 10 latest cards and city-scoped category counts
          const dirCity =
            parsedRoute.city && parsedRoute.city !== 'All India' ? parsedRoute.city : 'All India';
          const params = new URLSearchParams({
            status: 'approved',
            limit: '10',
            offset: '0',
            includeCategories: '1',
          });
          if (dirCity !== 'All India') {
            params.set('city', dirCity);
          }
          const res = await fetch(`/api/listings?${params.toString()}`);
          if (!res.ok || cancelled) return;
          const data = await res.json();
          if (!cancelled) {
            const nextCategories = Array.isArray(data.categories)
              ? data.categories
              : scopedCategories;
            if (Array.isArray(data.categories)) {
              setScopedCategories(data.categories);
              setScopedCategoriesCity(dirCity);
            }
            setScopedListing(null);
            setScopedListings(Array.isArray(data.items) ? data.items.slice(0, 10) : []);
            setScopedTotal(0);
            setScopedPage(1);
            setScopedRouteSignature(currentRouteSignature);
            updateSeoAndCanonical(parsedRoute, {
              listing: null,
              categories: nextCategories,
              siteName: settings?.siteName || 'Chillyads',
            });
          }
          return;
        }

        // Catalog / Category / Subcategory / Search mode: fetch 50 paginated items for current page
        const reqPage = Math.max(1, Number(query.page) || 1);
        const pageSize = 50;
        const params = new URLSearchParams({
          status: 'approved',
          limit: String(pageSize),
          offset: String((reqPage - 1) * pageSize),
          includeCategories: '1',
        });
        const filterCity =
          parsedRoute.city && parsedRoute.city !== 'All India' ? parsedRoute.city : query.city;
        const targetCity = filterCity && filterCity !== 'All India' ? filterCity : 'All India';
        const filterCat =
          parsedRoute.categoryId && parsedRoute.categoryId !== 'all'
            ? parsedRoute.categoryId
            : query.category;
        const filterSub =
          parsedRoute.subcategoryId && parsedRoute.subcategoryId !== 'all'
            ? parsedRoute.subcategoryId
            : query.subcategory;

        if (targetCity !== 'All India') params.set('city', targetCity);
        if (filterCat && filterCat !== 'all') params.set('category', filterCat);
        if (filterSub && filterSub !== 'all') params.set('subcategory', filterSub);
        if (query.q || query.search) params.set('search', query.q || query.search);

        for (const key of [
          'minPrice',
          'maxPrice',
          'propertyType',
          'configuration',
          'propertyStatus',
          'listedBy',
          'furnishing',
          'minArea',
          'maxArea',
          'maxDeposit',
          'brokerage',
          'tenantPreference',
          'availableFrom',
          'petsAllowed',
          'sort',
        ]) {
          if (query[key] && query[key] !== 'all') {
            params.set(key, query[key]);
          }
        }

        const res = await fetch(`/api/listings?${params.toString()}`);
        if (!res.ok || cancelled) return;
        const data = await res.json();
        if (!cancelled) {
          const nextCategories = Array.isArray(data.categories)
            ? data.categories
            : scopedCategories;
          if (Array.isArray(data.categories)) {
            setScopedCategories(data.categories);
            setScopedCategoriesCity(targetCity);
          }
          setScopedListing(null);
          setScopedListings(Array.isArray(data.items) ? data.items : []);
          setScopedTotal(Number(data.total) || 0);
          setScopedPage(reqPage);
          setScopedRouteSignature(currentRouteSignature);
          updateSeoAndCanonical(parsedRoute, {
            listing: null,
            categories: nextCategories,
            siteName: settings?.siteName || 'Chillyads',
          });
        }
      } catch (err) {
        console.error('Failed to fetch scoped route listings:', err);
      }
    }

    fetchScopedPublicRouteData();
    return () => {
      cancelled = true;
    };
  }, [currentRouteSignature, isWorkspaceRoute, parsedRoute, query, settings]);

  const existingContext = useAppOptional();

  // Workspace routes (/post, /my-account, /admin/*) mount AppProvider
  if (isWorkspaceRoute) {
    if (!existingContext) {
      return (
        <AppProvider initialServerData={initialServerData}>
          <WorkspaceRouterInner path={path} query={query} />
        </AppProvider>
      );
    }
    return <WorkspaceRouterInner path={path} query={query} />;
  }

  const isRouteDataCurrent = scopedRouteSignature === currentRouteSignature;

  if (parsedRoute.routeType === 'not-found') {
    return (
      <div className="min-h-screen bg-[#f8f9fa] flex flex-col items-center justify-center p-8 text-center">
        <div className="max-w-md bg-white rounded-2xl border border-slate-200 p-8 shadow-sm space-y-4">
          <div className="text-5xl font-extrabold text-slate-900">404</div>
          <h1 className="text-xl font-bold text-slate-800">Page Not Found</h1>
          <p className="text-sm text-slate-600">
            The page or category you are looking for does not exist or has been removed.
          </p>
          <a
            href="/"
            className="inline-flex items-center justify-center px-5 py-2.5 rounded-xl bg-red-600 text-white text-sm font-semibold hover:bg-red-700 transition-colors"
          >
            Back to Home
          </a>
        </div>
      </div>
    );
  }

  // Public Route: Listing Detail View (/ad/:id or /item/:id or /:city/:cat/:sub/:slug)
  if (parsedRoute.routeType === 'listing') {
    if (scopedListing && (isRouteDataCurrent || scopedListing.id === parsedRoute.listingId)) {
      return (
        <PublicListingDetailPage
          listing={scopedListing}
          relatedListings={isRouteDataCurrent ? scopedListings : []}
          categories={scopedCategories}
          locations={locations}
          enablePrivacyChoices={Boolean(settings?.enablePrivacyChoices)}
        />
      );
    }
    return (
      <div className="min-h-screen bg-[#f8f9fa] flex items-center justify-center p-8">
        <div className="w-full max-w-5xl bg-white rounded-2xl border border-slate-200 p-8 space-y-6 animate-pulse">
          <div className="h-6 bg-slate-200 rounded w-1/3" />
          <div className="aspect-video bg-slate-100 rounded-xl" />
          <div className="space-y-3">
            <div className="h-5 bg-slate-200 rounded w-1/2" />
            <div className="h-4 bg-slate-100 rounded w-3/4" />
            <div className="h-4 bg-slate-100 rounded w-2/3" />
          </div>
        </div>
      </div>
    );
  }

  // Public Route: Home / City Directory / Category / Subcategory / Search
  const hasCatalogQueryFilters = CITY_CATALOG_FILTER_KEYS.some((key) => {
    const val = query[key];
    return typeof val === 'string' && val.trim() !== '' && val !== 'all';
  });
  const isSearchRoute = parsedRoute.routeType === 'search' || Boolean(query.q || query.search);
  const effectiveCity =
    (isSearchRoute && query.city) ||
    (!isSearchRoute && parsedRoute.city ? parsedRoute.city : '') ||
    'All India';
  const effectiveCategory =
    (isSearchRoute && query.category) ||
    (!isSearchRoute && parsedRoute.categoryId ? parsedRoute.categoryId : '') ||
    'all';
  const effectiveSubcategory =
    (isSearchRoute && query.subcategory) ||
    (!isSearchRoute && parsedRoute.subcategoryId ? parsedRoute.subcategoryId : '') ||
    'all';
  const effectiveSearch = query.q || query.search || '';
  const mode =
    effectiveCategory !== 'all' || isSearchRoute || hasCatalogQueryFilters ? 'listings' : 'directory';

  const areCategoryCountsCurrentForCity =
    normalizeCityKey(scopedCategoriesCity) === normalizeCityKey(effectiveCity);

  const visibleCategories = areCategoryCountsCurrentForCity
    ? scopedCategories
    : scopedCategories.map((c) => ({ ...c, listingCount: undefined }));

  const visibleListings = isRouteDataCurrent ? scopedListings : [];
  const visibleTotal = isRouteDataCurrent ? scopedTotal : 0;
  const visiblePage = isRouteDataCurrent ? scopedPage : Math.max(1, Number(query.page) || 1);

  return (
    <PublicMarketplacePage
      mode={mode}
      effectiveCity={effectiveCity}
      effectiveCategory={effectiveCategory}
      effectiveSubcategory={effectiveSubcategory}
      effectiveSearch={effectiveSearch}
      isSearchRoute={isSearchRoute}
      query={query}
      categories={visibleCategories}
      locations={locations}
      listings={visibleListings}
      totalListings={visibleTotal}
      currentPage={visiblePage}
      isLoading={!isRouteDataCurrent}
      isCountsLoading={!areCategoryCountsCurrentForCity}
      enablePrivacyChoices={Boolean(settings?.enablePrivacyChoices)}
    />
  );
}
