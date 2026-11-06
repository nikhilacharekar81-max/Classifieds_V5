import React from 'react';
import { renderToString } from 'react-dom/server';
import App from './App.tsx';
import type { AppClientRouterProps } from '@/components/AppClientRouter';
import { cmsRepository } from '@/server/repositories/cms.repository';
import {
  getCachedCategoryHierarchy,
  getCategoriesWithLiveCounts,
  getCachedLocations,
  getCachedSystemSettings,
} from '@/server/cache/reference-data.cache';
import {
  listingService,
  getCachedPublicListingById,
  isListingPubliclyAccessible,
} from '@/server/services/listing.service';
import {
  parseChillyPath,
  formatLocationSeoText,
  serializeJsonLd,
  slugify,
  getCityGeoId,
} from '@/lib/utils/seoAndUrlHelper';
import type { Category, Listing } from '@/lib/types';

function escapeHtmlAttr(str: string): string {
  return String(str || '')
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

export interface SsrRenderResult {
  appHtml: string;
  headTagsHtml: string;
  pageTitle: string;
  metaDescription: string;
  ssrProps: AppClientRouterProps;
  statusCode?: number;
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

import { runWithRequestCache } from '@/src/shims/next-cache';

export async function renderSsrPage(
  urlPath: string,
  queryObj: Record<string, string> = {},
  origin = 'http://localhost:3000'
): Promise<SsrRenderResult> {
  return runWithRequestCache(async () => {
    const [baseCategories, locations, settings, allCmsPages] = await Promise.all([
      getCachedCategoryHierarchy(),
      getCachedLocations(),
      getCachedSystemSettings(),
      cmsRepository.findAllPages(),
    ]);

    const publishedCmsPages = allCmsPages.filter((p) => p.status === 'published' || p.isActive);
    const cmsSlugs = publishedCmsPages.map((p) => p.slug.toLowerCase());
    const parsedRoute = parseChillyPath(urlPath, locations, baseCategories, cmsSlugs);
    const siteName = settings?.siteName || 'Chillyads';
    const cleanOrigin = origin.replace(/\/$/, '');
    const queryString = new URLSearchParams(queryObj).toString();
    const canonicalUrl = `${cleanOrigin}${urlPath === '/' ? '' : urlPath}${queryString ? `?${queryString}` : ''}`;

    const effectiveCityForCounts =
      (parsedRoute.routeType === 'search' ? queryObj.city : parsedRoute.city) ||
      queryObj.city ||
      'All India';
    const categories = await getCategoriesWithLiveCounts(effectiveCityForCounts);

    // 1. Unknown route -> 404 with noindex
    if (parsedRoute.routeType === 'not-found') {
      const ssrProps: AppClientRouterProps = {
        initialPath: urlPath,
        initialQuery: queryObj,
        initialServerData: {
          categories,
          locations,
          settings,
          cmsPages: publishedCmsPages,
          listings: [],
        },
      };
      const appHtml = renderToString(<App ssrProps={ssrProps} />);
      return {
        appHtml,
        headTagsHtml: [
          `<link rel="canonical" href="${escapeHtmlAttr(canonicalUrl)}" />`,
          `<meta name="robots" content="noindex, nofollow" />`,
        ].join('\n    '),
        pageTitle: `Page Not Found - ${siteName}`,
        metaDescription: 'The page you are looking for does not exist or has been moved.',
        ssrProps,
        statusCode: 404,
      };
    }

    let currentPage = Math.max(1, Number(queryObj.page) || 1);
    const itemsPerPage = 50;

    let initialListing: Listing | null = null;
    let initialListings: Listing[] = [];
    let initialTotalListings = 0;

    const hasCatalogQueryFilters = CITY_CATALOG_FILTER_KEYS.some((key) => {
      const val = queryObj[key];
      return typeof val === 'string' && val.trim() !== '' && val !== 'all';
    });

    if (parsedRoute.routeType === 'listing' && parsedRoute.listingId) {
      const rawListing = await getCachedPublicListingById(parsedRoute.listingId);
      if (isListingPubliclyAccessible(rawListing)) {
        initialListing = rawListing;
        // Increment views asynchronously (non-blocking for SSR performance)
        listingService.incrementViews(rawListing.id).catch(console.warn);

        const relatedItems = await listingService.getCachedRelatedListings(
          rawListing.categoryId,
          rawListing.id,
          4
        );
        initialListings = relatedItems;
        initialTotalListings = relatedItems.length;
      } else {
        // 410 Gone if listing existed and expired/sold; 404 Not Found if nonexistent or non-public
        const isExpiredOrGone =
          Boolean(rawListing) &&
          (rawListing!.status === 'expired' ||
            rawListing!.status === 'sold' ||
            Boolean(rawListing!.expiresAt && new Date(rawListing!.expiresAt).getTime() <= Date.now()));
        const statusCode = isExpiredOrGone ? 410 : 404;
        const pageTitle = isExpiredOrGone
          ? `Listing Expired - ${siteName}`
          : `Listing Not Found - ${siteName}`;
        const metaDescription = isExpiredOrGone
          ? 'This classified listing has expired or is no longer available.'
          : 'The requested classified listing could not be found or has been removed.';
        const ssrProps: AppClientRouterProps = {
          initialPath: urlPath,
          initialQuery: queryObj,
          initialServerData: {
            categories,
            locations,
            settings,
            cmsPages: publishedCmsPages,
            listings: [],
          },
        };
        const appHtml = renderToString(<App ssrProps={ssrProps} />);
        return {
          appHtml,
          headTagsHtml: [
            `<link rel="canonical" href="${escapeHtmlAttr(canonicalUrl)}" />`,
            `<meta name="robots" content="noindex, nofollow" />`,
          ].join('\n    '),
          pageTitle,
          metaDescription,
          ssrProps,
          statusCode,
        };
      }
    } else if (
      parsedRoute.routeType === 'home' ||
      parsedRoute.routeType === 'cms' ||
      (parsedRoute.routeType === 'city' && !hasCatalogQueryFilters)
    ) {
      // Directory mode (Home "/" or City "/:city"): fetch only 10 slim latest listing cards
      const targetCity =
        parsedRoute.city && parsedRoute.city !== 'All India' ? parsedRoute.city : 'All India';
      initialListings = await listingService.getCachedLatestListings(targetCity, 10);
      initialTotalListings = 0;
      currentPage = 1;
    } else if (
      parsedRoute.routeType === 'category' ||
      parsedRoute.routeType === 'search' ||
      (parsedRoute.routeType === 'city' && hasCatalogQueryFilters)
    ) {
      // Catalog mode: authoritative 50-items/page PostgreSQL LIMIT/OFFSET pagination
      const filterCity =
        parsedRoute.city && parsedRoute.city !== 'All India' ? parsedRoute.city : queryObj.city;
      const filterCat =
        parsedRoute.categoryId && parsedRoute.categoryId !== 'all'
          ? parsedRoute.categoryId
          : queryObj.category;
      const filterSub =
        parsedRoute.subcategoryId && parsedRoute.subcategoryId !== 'all'
          ? parsedRoute.subcategoryId
          : queryObj.subcategory;

      const paginated = await listingService.getPaginatedPageListings({
        city: filterCity,
        category: filterCat,
        subcategory: filterSub,
        query: queryObj,
        pageSize: itemsPerPage,
      });

      initialListings = paginated.items;
      initialTotalListings = paginated.total;
      currentPage = paginated.page;
    }

    const ssrProps: AppClientRouterProps = {
      initialPath: urlPath,
      initialQuery: queryObj,
      initialListing,
      initialListings,
      initialTotalListings,
      initialPage: currentPage,
      initialServerData: {
        categories,
        locations,
        settings,
        cmsPages: publishedCmsPages,
        listings: initialListings,
      },
    };

    // Render full React tree to HTML on the server
    const appHtml = renderToString(<App ssrProps={ssrProps} />);

    let pageTitle = `${siteName} - Buy & Sell Second Hand Items`;
    let metaDesc =
      'Commercial-grade Chillyads classifieds marketplace. Find cars, mobile phones, real estate, electronics, jobs and services.';
    const cityLabel = parsedRoute.city && parsedRoute.city !== 'All India' ? parsedRoute.city : 'India';
    const pageSuffix = currentPage > 1 ? ` (Page ${currentPage})` : '';

    if (parsedRoute.routeType === 'listing' && initialListing) {
      const priceFormatted =
        initialListing.price !== null && initialListing.price !== undefined
          ? new Intl.NumberFormat('en-IN', {
              style: 'currency',
              currency: 'INR',
              maximumFractionDigits: 0,
            }).format(initialListing.price)
          : 'Price on request';

      pageTitle = `${initialListing.title} in ${
        initialListing.location.locality ? `${initialListing.location.locality}, ` : ''
      }${initialListing.location.city} | ${priceFormatted} - ${siteName}`;
      metaDesc = `${initialListing.description.substring(0, 150)}... ${
        initialListing.title
      } (${priceFormatted}) in ${initialListing.location.city}. Direct contact with verified seller ${
        initialListing.sellerName
      }.`;
    } else if (parsedRoute.routeType === 'category') {
      let catName = 'Classifieds';
      let matchedCategory: Category | undefined;
      if (parsedRoute.subcategoryId !== 'all') {
        matchedCategory = categories.find((c) => c.id === parsedRoute.subcategoryId);
        if (matchedCategory) catName = matchedCategory.name;
      } else if (parsedRoute.categoryId !== 'all') {
        matchedCategory = categories.find((c) => c.id === parsedRoute.categoryId);
        if (matchedCategory) catName = matchedCategory.name;
      }

      if (matchedCategory?.seoTitle) {
        pageTitle = `${formatLocationSeoText(matchedCategory.seoTitle, cityLabel)}${pageSuffix}`;
      } else {
        pageTitle = `${catName} in ${cityLabel}${pageSuffix} - Buy & Sell Second Hand ${catName} | ${siteName}`;
      }

      if (matchedCategory?.seoDescription) {
        metaDesc = `${formatLocationSeoText(matchedCategory.seoDescription, cityLabel)}${pageSuffix}`;
      } else {
        metaDesc = `Find the best deals on ${catName} in ${cityLabel}${pageSuffix}. Browse thousands of verified ads, compare prices, and connect with local buyers & sellers on ${siteName}.`;
      }
    } else if (parsedRoute.routeType === 'city') {
      pageTitle = `Chillyads ${parsedRoute.city}${pageSuffix} - Buy & Sell Cars, Mobiles, Apartments & Services in ${parsedRoute.city}`;
      metaDesc = `Discover local classified ads in ${parsedRoute.city}${pageSuffix}. Buy and sell second hand cars, mobile phones, laptops, homes, jobs and services in ${parsedRoute.city} on ${siteName}.`;
    } else if (parsedRoute.routeType === 'post') {
      pageTitle = `Post Free Ad in ${cityLabel} - Sell Quickly on ${siteName}`;
      metaDesc = `Post a free classified ad in ${cityLabel}. Reach millions of interested local buyers for cars, mobiles, real estate, electronics and services.`;
    } else if (parsedRoute.routeType === 'admin') {
      pageTitle = `Admin Workspace - ${siteName} Control Panel`;
      metaDesc =
        'Administrative dashboard for managing marketplace listings, user KYC verifications, category hierarchies, and monetization.';
    } else if (parsedRoute.routeType === 'cms' && parsedRoute.cmsSlug) {
      const cmsPage = publishedCmsPages.find((p) => p.slug.toLowerCase() === parsedRoute.cmsSlug);
      if (cmsPage) {
        pageTitle = `${cmsPage.seoTitle || cmsPage.title} - ${siteName}`;
        metaDesc = cmsPage.seoDescription || metaDesc;
      }
    }

    const primaryImage = initialListing?.images?.[0] || `${cleanOrigin}/favicon.ico`;

    let schemaData: object[] = [
      {
        '@context': 'https://schema.org',
        '@type': 'WebSite',
        name: siteName,
        url: cleanOrigin,
        potentialAction: {
          '@type': 'SearchAction',
          target: `${cleanOrigin}/search?q={search_term_string}`,
          'query-input': 'required name=search_term_string',
        },
      },
    ];

    if (parsedRoute.routeType === 'listing' && initialListing) {
      const isVehicle = initialListing.categoryId === 'cat_cars' || initialListing.categoryId === 'cat_bikes';
      const isRealEstate =
        initialListing.categoryId === 'cat_properties' ||
        initialListing.categoryId === 'cat_housing_realestate';

      const itemSchema: Record<string, any> = {
        '@context': 'https://schema.org',
        '@type': isVehicle ? 'Vehicle' : isRealEstate ? 'SingleFamilyResidence' : 'Product',
        name: initialListing.title,
        description: initialListing.description,
        image: initialListing.images,
        sku: initialListing.id,
        offers: {
          '@type': 'Offer',
          url: canonicalUrl,
          price: initialListing.price !== null && initialListing.price !== undefined ? initialListing.price : undefined,
          priceCurrency: 'INR',
          itemCondition: 'https://schema.org/UsedCondition',
          availability:
            initialListing.status === 'sold'
              ? 'https://schema.org/OutOfStock'
              : 'https://schema.org/InStock',
          seller: {
            '@type': 'Person',
            name: initialListing.sellerName,
          },
        },
      };

      const breadcrumbSchema = {
        '@context': 'https://schema.org',
        '@type': 'BreadcrumbList',
        itemListElement: [
          {
            '@type': 'ListItem',
            position: 1,
            name: 'Home',
            item: cleanOrigin,
          },
          ...(initialListing.location?.city
            ? [
                {
                  '@type': 'ListItem',
                  position: 2,
                  name: initialListing.location.city,
                  item: `${cleanOrigin}/${slugify(initialListing.location.city)}_${getCityGeoId(
                    slugify(initialListing.location.city)
                  )}`,
                },
              ]
            : []),
          {
            '@type': 'ListItem',
            position: initialListing.location?.city ? 3 : 2,
            name: initialListing.title,
            item: canonicalUrl,
          },
        ],
      };

      schemaData = [itemSchema, breadcrumbSchema];
    }

    const shouldNoIndex =
      parsedRoute.routeType === 'admin' ||
      parsedRoute.routeType === 'user-panel' ||
      parsedRoute.routeType === 'post' ||
      parsedRoute.routeType === 'search' ||
      Boolean(queryObj.q || queryObj.search);

    const robotsContent = shouldNoIndex
      ? 'noindex, nofollow'
      : 'index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1';

    const headTagsHtml = [
      `<link rel="canonical" href="${escapeHtmlAttr(canonicalUrl)}" />`,
      `<meta name="robots" content="${robotsContent}" />`,
      `<meta property="og:url" content="${escapeHtmlAttr(canonicalUrl)}" />`,
      `<meta property="og:image" content="${escapeHtmlAttr(primaryImage)}" />`,
      `<meta property="og:site_name" content="${escapeHtmlAttr(siteName)}" />`,
      `<meta name="twitter:title" content="${escapeHtmlAttr(pageTitle)}" />`,
      `<meta name="twitter:description" content="${escapeHtmlAttr(metaDesc)}" />`,
      `<meta name="twitter:image" content="${escapeHtmlAttr(primaryImage)}" />`,
      `<script id="schema-jsonld" type="application/ld+json">${serializeJsonLd(schemaData)}</script>`,
    ].join('\n    ');

    return {
      appHtml,
      headTagsHtml,
      pageTitle,
      metaDescription: metaDesc,
      ssrProps,
      statusCode: 200,
    };
  });
}
