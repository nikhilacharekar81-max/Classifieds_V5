import { Category, LocationItem, Listing } from '../types';

/**
 * Utility to convert arbitrary string to SEO-friendly URL slug
 */
export function slugify(text: string): string {
  if (!text) return '';
  return text
    .toLowerCase()
    .trim()
    .replace(/&/g, 'and')
    .replace(/[^\p{L}\p{N}\s-]/gu, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/**
 * Custom Sequential Geo Location IDs starting from 1 (e.g. mumbai_g1)
 */
const CITY_GEO_IDS: Record<string, string> = {
  mumbai: 'g1',
  pune: 'g2',
  'new-delhi': 'g3',
  delhi: 'g3',
  gurugram: 'g4',
  bengaluru: 'g5',
  bangalore: 'g5',
  hyderabad: 'g6',
  chennai: 'g7',
  kolkata: 'g8',
  ahmedabad: 'g9',
  jaipur: 'g10',
  lucknow: 'g11',
  chandigarh: 'g12',
  'all-india': 'g0',
  india: 'g0',
};

/**
 * Custom Sequential Category Code IDs starting from 1 (e.g. cars_c1)
 */
const CATEGORY_CODES: Record<string, string> = {
  vehicles: 'c1',
  cars: 'c2',
  mobiles: 'c3',
  'mobile-phones': 'c3',
  properties: 'c4',
  'real-estate': 'c4',
  apartments: 'c5',
  electronics: 'c6',
  'commercial-machinery': 'c7',
  jobs: 'c8',
  services: 'c9',
  furniture: 'c10',
  fashion: 'c11',
  sports: 'c12',
  pets: 'c13',
};

/**
 * Helper to get or generate Geo ID for a city
 */
export function getCityGeoId(citySlug: string): string {
  const clean = slugify(citySlug);
  if (CITY_GEO_IDS[clean]) {
    return CITY_GEO_IDS[clean];
  }
  let hash = 0;
  for (let i = 0; i < clean.length; i++) {
    hash = (hash << 5) - hash + clean.charCodeAt(i);
    hash |= 0;
  }
  const posHash = (Math.abs(hash) % 900) + 100;
  return `g${posHash}`;
}

/**
 * Helper to get or generate Category Code (e.g. c1)
 */
export function getCategoryCode(catSlug: string, catId?: string): string {
  const clean = slugify(catSlug);
  if (CATEGORY_CODES[clean]) {
    return CATEGORY_CODES[clean];
  }
  if (catId) {
    const digits = catId.replace(/\D/g, '');
    if (digits) return `c${digits}`;
  }
  let hash = 0;
  for (let i = 0; i < clean.length; i++) {
    hash = (hash << 5) - hash + clean.charCodeAt(i);
    hash |= 0;
  }
  return `c${(Math.abs(hash) % 100) + 50}`;
}

/**
 * Formats template SEO text by replacing 'India' or '$xcityname' with the current city/location name
 */
export function formatLocationSeoText(text: string, locationLabel: string): string {
  if (!text) return '';
  const isDefaultIndia = !locationLabel || locationLabel === 'India' || locationLabel === 'All India';
  const targetLocation = isDefaultIndia ? 'India' : locationLabel;

  if (isDefaultIndia) {
    return text.replace(/\$xcityname/gi, 'India');
  }

  return text
    .replace(/anywhere in India/gi, `anywhere in ${targetLocation}`)
    .replace(/across India/gi, `across ${targetLocation}`)
    .replace(/in India/gi, `in ${targetLocation}`)
    .replace(/\bIndia\b/g, targetLocation)
    .replace(/\$xcityname/gi, targetLocation);
}

/**
 * Generates concise, search-engine friendly title slug (e.g. "iphone-14-pro" from "Apple iPhone 14 Pro Max 256GB Gold (99% BH)")
 */
export function getCleanSeoTitleSlug(title: string): string {
  if (!title) return 'ad';
  let text = title.replace(/\([^)]*\)/g, ' ');
  text = text.replace(/(\b\d+gb\b|\b\d+tb\b|\b99% bh\b|\b100% bh\b)/gi, ' ');
  text = text.replace(/^apple\s+iphone/i, 'iphone');
  const fullSlug = slugify(text);
  const parts = fullSlug.split('-').filter(Boolean);
  const shortSlug = parts.slice(0, 4).join('-');
  return shortSlug || fullSlug || 'ad';
}

/**
 * Returns exact primary key listing ID to guarantee 100% resolution accuracy for URLs, share links, sitemaps, and emails
 */
export function getShortListingId(id: string): string {
  return id ? id.trim() : '';
}

/**
 * Helper to robustly find a listing by exact or normalized ID
 */
export function findListingById(listings: Listing[], targetId: string): Listing | undefined {
  if (!targetId) return undefined;
  const cleanTarget = targetId.trim();
  const lowerTarget = cleanTarget.toLowerCase();

  return listings.find((l) => {
    if (l.id === cleanTarget) return true;
    if (l.id.toLowerCase() === lowerTarget) return true;
    if (l.id.replace(/^lst_/, '') === cleanTarget.replace(/^lst_/, '')) return true;
    return false;
  });
}

/**
 * Strips Chillyads URL suffixes like _g4058997, _c84, -iid-lst_1001
 */
export function stripChillySuffixes(part: string): {
  cleanSlug: string;
  geoId?: string;
  categoryCode?: string;
  itemId?: string;
} {
  if (!part) return { cleanSlug: '' };

  let cleanSlug = part;
  let geoId: string | undefined;
  let categoryCode: string | undefined;
  let itemId: string | undefined;

  const itemMatch = part.match(/(?:-iid-|-item-)(.+)$/i);
  if (itemMatch) {
    itemId = itemMatch[1];
    cleanSlug = part.replace(/(?:-iid-|-item-).+$/i, '');
  } else {
    const lstMatch = part.match(/-(lst_[a-zA-Z0-9_-]+)$/i);
    if (lstMatch) {
      itemId = lstMatch[1];
      cleanSlug = part.replace(/-(lst_[a-zA-Z0-9_-]+)$/i, '');
    } else if (/^lst_[a-zA-Z0-9_-]+$/i.test(part)) {
      itemId = part;
    }
  }

  const geoMatch = cleanSlug.match(/_g(\d+)$/i);
  if (geoMatch) {
    geoId = `g${geoMatch[1]}`;
    cleanSlug = cleanSlug.replace(/_g\d+$/i, '');
  }

  const catMatch = cleanSlug.match(/_c(\d+)$/i);
  if (catMatch) {
    categoryCode = `c${catMatch[1]}`;
    cleanSlug = cleanSlug.replace(/_c\d+$/i, '');
  }

  return { cleanSlug, geoId, categoryCode, itemId };
}

export interface ParsedRoute {
  routeType: 'home' | 'city' | 'category' | 'listing' | 'post' | 'search' | 'admin' | 'user-panel' | 'cms' | 'not-found';
  city: string;
  citySlug: string;
  geoId: string;
  categoryId: string;
  categorySlug?: string;
  subcategoryId: string;
  subcategorySlug?: string;
  listingId: string | null;
  cmsSlug?: string;
  adminPath?: string;
  rawPath: string;
}

/**
 * Unslugify city name by matching against locations dataset with strict validation
 */
export function unslugifyCity(
  inputSlug: string,
  locations: LocationItem[] = []
): { cityName: string; citySlug: string; geoId: string; isValid: boolean } {
  const { cleanSlug, geoId: extractedGeoId } = stripChillySuffixes(inputSlug);
  const decodedSlug = decodeURIComponent(cleanSlug || '').trim();

  if (!decodedSlug || decodedSlug === 'all-india' || decodedSlug === 'all-cities' || decodedSlug === 'india' || decodedSlug === 'all') {
    return {
      cityName: 'All India',
      citySlug: 'all-india',
      geoId: extractedGeoId || 'g0',
      isValid: true,
    };
  }

  const normalized = decodedSlug.toLowerCase().replace(/-/g, ' ');
  const cityObj = locations.find(
    (l) =>
      (l.type === 'city' || l.type === 'state') &&
      (l.slug === decodedSlug ||
        slugify(l.name) === decodedSlug ||
        l.name.toLowerCase() === normalized ||
        l.name.toLowerCase() === decodedSlug)
  );

  if (cityObj) {
    return {
      cityName: cityObj.name,
      citySlug: cityObj.slug || slugify(cityObj.name),
      geoId: extractedGeoId || getCityGeoId(cityObj.name),
      isValid: true,
    };
  }

  return {
    cityName: '',
    citySlug: '',
    geoId: '',
    isValid: false,
  };
}

/**
 * Match category or subcategory slug against categories dataset
 */
export function unslugifyCategory(
  inputSlug: string,
  categories: Category[]
): { categoryId: string; subcategoryId: string; categoryObj?: Category } {
  const { cleanSlug } = stripChillySuffixes(inputSlug);

  if (!cleanSlug || cleanSlug === 'all') {
    return { categoryId: 'all', subcategoryId: 'all' };
  }

  // 1. Try matching main category by slug or name
  const mainCat = categories.find(
    (c) => c.parentId === null && (c.slug === cleanSlug || slugify(c.name) === cleanSlug)
  );
  if (mainCat) {
    return { categoryId: mainCat.id, subcategoryId: 'all', categoryObj: mainCat };
  }

  // 2. Try matching subcategory
  const subCat = categories.find(
    (c) => c.parentId !== null && (c.slug === cleanSlug || slugify(c.name) === cleanSlug)
  );
  if (subCat) {
    return {
      categoryId: subCat.parentId || 'all',
      subcategoryId: subCat.id,
      categoryObj: subCat,
    };
  }

  return { categoryId: 'all', subcategoryId: 'all' };
}

/**
 * Parse any URL path into a structured Chillyads route format (e.g. /mumbai_g4058997/cars_c84)
 */
export function parseChillyPath(
  pathStr: string,
  locations: LocationItem[],
  categories: Category[],
  cmsSlugs: string[] = []
): ParsedRoute {
  let clean = pathStr.replace(/^#\/?/, '/');
  if (!clean || clean === '') clean = '/';
  if (!clean.startsWith('/')) clean = '/' + clean;

  const parts = clean.split('?')[0].split('/').filter(Boolean);

  const notFoundRoute = (): ParsedRoute => ({
    routeType: 'not-found',
    city: 'All India',
    citySlug: 'all-india',
    geoId: 'g0',
    categoryId: 'all',
    subcategoryId: 'all',
    listingId: null,
    rawPath: clean,
  });

  const isKnownCitySlug = (segment: string): boolean => {
    const { cleanSlug } = stripChillySuffixes(segment);
    if (!cleanSlug) return false;
    if (cleanSlug === 'all-india' || cleanSlug === 'india') return true;
    const normalized = cleanSlug.toLowerCase().replace(/-/g, ' ');
    return locations.some(
      (l) =>
        (l.type === 'city' || l.type === 'state') &&
        (l.slug === cleanSlug || slugify(l.name) === cleanSlug || l.name.toLowerCase() === normalized)
    );
  };

  // Default Route
  if (parts.length === 0) {
    return {
      routeType: 'home',
      city: 'All India',
      citySlug: 'all-india',
      geoId: 'g0',
      categoryId: 'all',
      subcategoryId: 'all',
      listingId: null,
      rawPath: clean,
    };
  }

  // 1. Admin Routes (/admin/*)
  if (parts[0] === 'admin') {
    return {
      routeType: 'admin',
      city: 'All India',
      citySlug: 'all-india',
      geoId: 'g0',
      categoryId: 'all',
      subcategoryId: 'all',
      listingId: null,
      adminPath: clean,
      rawPath: clean,
    };
  }

  // 2. User Panel Route (/my-account, /user, /user/panel, /my-ads, /account, /unsubscribe)
  if (
    (parts[0] === 'my-account' ||
      parts[0] === 'user' ||
      parts[0] === 'my-ads' ||
      parts[0] === 'account' ||
      parts[0] === 'unsubscribe') &&
    parts.length <= 2
  ) {
    return {
      routeType: 'user-panel',
      city: 'All India',
      citySlug: 'all-india',
      geoId: 'g0',
      categoryId: 'all',
      subcategoryId: 'all',
      listingId: null,
      rawPath: clean,
    };
  }

  // 3. Post / Sell Route (/post, /sell)
  if ((parts[0] === 'post' || parts[0] === 'sell') && parts.length === 1) {
    return {
      routeType: 'post',
      city: 'All India',
      citySlug: 'all-india',
      geoId: 'g0',
      categoryId: 'all',
      subcategoryId: 'all',
      listingId: null,
      rawPath: clean,
    };
  }

  // 3b. Search Route (/search)
  if (parts[0] === 'search' && parts.length === 1) {
    return {
      routeType: 'search',
      city: 'All India',
      citySlug: 'all-india',
      geoId: 'g0',
      categoryId: 'all',
      subcategoryId: 'all',
      listingId: null,
      rawPath: clean,
    };
  }

  // 3c. Explicit CMS Page Route (/p/:slug or /pages/:slug)
  if ((parts[0] === 'p' || parts[0] === 'pages' || parts[0] === 'page') && parts.length === 2) {
    const slug = parts[1].toLowerCase();
    if (cmsSlugs.includes(slug)) {
      return {
        routeType: 'cms',
        city: 'All India',
        citySlug: 'all-india',
        geoId: 'g0',
        categoryId: 'all',
        subcategoryId: 'all',
        listingId: null,
        cmsSlug: slug,
        rawPath: clean,
      };
    }
    return notFoundRoute();
  }

  // Helper to extract listing ID from slug
  const extractListingIdFromSegment = (seg: string): string | null => {
    if (!seg) return null;
    const { itemId } = stripChillySuffixes(seg);
    if (itemId) return itemId;
    const lstMatch = seg.match(/(lst_[a-zA-Z0-9_-]+)$/i);
    if (lstMatch) return lstMatch[1];
    if (seg.startsWith('lst_')) return seg;
    return null;
  };

  // 4. Check if the last path part is a listing ID / slug
  const lastPart = parts[parts.length - 1] || '';
  const detectedListingId = extractListingIdFromSegment(lastPart);

  // 4a. Direct /ad/* or /item/* route
  if (parts[0] === 'item' || parts[0] === 'ad') {
    if (parts.length !== 2 || !parts[1]) {
      return notFoundRoute();
    }
    const rawIdPart = parts[1];
    const listingId = extractListingIdFromSegment(rawIdPart) || rawIdPart.split('-')[0];
    if (!listingId) {
      return notFoundRoute();
    }
    return {
      routeType: 'listing',
      city: 'All India',
      citySlug: 'all-india',
      geoId: 'g0',
      categoryId: 'all',
      subcategoryId: 'all',
      listingId,
      rawPath: clean,
    };
  }

  // 4b. City prefix with /item/ or /ad/ (e.g. /mumbai/ad/:id)
  if (parts.length >= 2 && (parts[1] === 'item' || parts[1] === 'ad')) {
    if (parts.length !== 3 || !parts[2] || !isKnownCitySlug(parts[0])) {
      return notFoundRoute();
    }
    const { cityName, citySlug, geoId, isValid } = unslugifyCity(parts[0], locations);
    if (!isValid) return notFoundRoute();
    const rawIdPart = parts[2];
    const listingId = extractListingIdFromSegment(rawIdPart) || rawIdPart.split('-')[0];
    if (!listingId) {
      return notFoundRoute();
    }
    return {
      routeType: 'listing',
      city: cityName,
      citySlug,
      geoId,
      categoryId: 'all',
      subcategoryId: 'all',
      listingId,
      rawPath: clean,
    };
  }

  // 4c. Hierarchical listing route (e.g. /mumbai_g1/mobiles_c3/apple-iphone-14-lst_1001 or /mumbai_g1/cars_c2/used-cars_c201/bmw-lst_1001)
  if (parts.length >= 2 && parts.length <= 4 && detectedListingId) {
    if (!isKnownCitySlug(parts[0])) {
      return notFoundRoute();
    }
    const { cityName, citySlug, geoId, isValid } = unslugifyCity(parts[0], locations);
    if (!isValid) return notFoundRoute();
    const mainCatInfo = parts.length >= 3 ? unslugifyCategory(parts[1], categories) : { categoryId: 'all', subcategoryId: 'all' };
    if (parts.length >= 3 && mainCatInfo.categoryId === 'all' && mainCatInfo.subcategoryId === 'all') {
      return notFoundRoute();
    }
    let subCatInfo = { categoryId: 'all', subcategoryId: 'all' };
    if (parts.length === 4) {
      subCatInfo = unslugifyCategory(parts[2], categories);
      if (subCatInfo.categoryId === 'all' && subCatInfo.subcategoryId === 'all') {
        return notFoundRoute();
      }
    }
    return {
      routeType: 'listing',
      city: cityName,
      citySlug,
      geoId,
      categoryId: mainCatInfo.categoryId,
      subcategoryId: subCatInfo.subcategoryId !== 'all' ? subCatInfo.subcategoryId : mainCatInfo.subcategoryId,
      listingId: detectedListingId,
      rawPath: clean,
    };
  }

  // 5. Check if first part is a known city (e.g. mumbai_g1 or mumbai or all-india)
  const { cleanSlug: firstCleanSlug } = stripChillySuffixes(parts[0]);
  const firstPartIsCity = isKnownCitySlug(parts[0]);

  if (firstPartIsCity) {
    const { cityName, citySlug, geoId, isValid } = unslugifyCity(parts[0], locations);
    if (!isValid) return notFoundRoute();

    if (parts.length === 1) {
      return {
        routeType: 'city',
        city: cityName,
        citySlug,
        geoId,
        categoryId: 'all',
        subcategoryId: 'all',
        listingId: null,
        rawPath: clean,
      };
    }

    if (parts.length === 2) {
      if (parts[1] === 'post' || parts[1] === 'sell') {
        return {
          routeType: 'post',
          city: cityName,
          citySlug,
          geoId,
          categoryId: 'all',
          subcategoryId: 'all',
          listingId: null,
          rawPath: clean,
        };
      }

      const catInfo = unslugifyCategory(parts[1], categories);
      if (catInfo.categoryId === 'all' && catInfo.subcategoryId === 'all') {
        return notFoundRoute();
      }
      return {
        routeType: 'category',
        city: cityName,
        citySlug,
        geoId,
        categoryId: catInfo.categoryId,
        categorySlug: parts[1],
        subcategoryId: catInfo.subcategoryId,
        listingId: null,
        rawPath: clean,
      };
    }

    if (parts.length === 3) {
      const mainCatInfo = unslugifyCategory(parts[1], categories);
      const subCatInfo = unslugifyCategory(parts[2], categories);

      if (
        mainCatInfo.categoryId === 'all' ||
        (subCatInfo.subcategoryId === 'all' && subCatInfo.categoryId === 'all') ||
        (subCatInfo.categoryObj?.parentId && subCatInfo.categoryObj.parentId !== mainCatInfo.categoryId)
      ) {
        return notFoundRoute();
      }

      return {
        routeType: 'category',
        city: cityName,
        citySlug,
        geoId,
        categoryId: mainCatInfo.categoryId !== 'all' ? mainCatInfo.categoryId : subCatInfo.categoryId,
        categorySlug: parts[1],
        subcategoryId: subCatInfo.subcategoryId !== 'all' ? subCatInfo.subcategoryId : subCatInfo.categoryId,
        subcategorySlug: parts[2],
        listingId: null,
        rawPath: clean,
      };
    }

    return notFoundRoute();
  } else {
    // First part is category slug across All India (e.g. /cars_c2) or published CMS page slug
    if (parts.length === 1) {
      const catInfo = unslugifyCategory(parts[0], categories);
      if (catInfo.categoryId !== 'all' || catInfo.subcategoryId !== 'all') {
        return {
          routeType: 'category',
          city: 'All India',
          citySlug: 'all-india',
          geoId: 'g0',
          categoryId: catInfo.categoryId,
          categorySlug: parts[0],
          subcategoryId: catInfo.subcategoryId,
          listingId: null,
          rawPath: clean,
        };
      }

      if (cmsSlugs.includes(firstCleanSlug)) {
        return {
          routeType: 'cms',
          city: 'All India',
          citySlug: 'all-india',
          geoId: 'g0',
          categoryId: 'all',
          subcategoryId: 'all',
          listingId: null,
          cmsSlug: firstCleanSlug,
          rawPath: clean,
        };
      }

      return notFoundRoute();
    }

    if (parts.length === 2) {
      const catInfo = unslugifyCategory(parts[0], categories);
      const subCatInfo = unslugifyCategory(parts[1], categories);

      if (
        catInfo.categoryId === 'all' ||
        (subCatInfo.subcategoryId === 'all' && subCatInfo.categoryId === 'all') ||
        (subCatInfo.categoryObj?.parentId && subCatInfo.categoryObj.parentId !== catInfo.categoryId)
      ) {
        return notFoundRoute();
      }

      return {
        routeType: 'category',
        city: 'All India',
        citySlug: 'all-india',
        geoId: 'g0',
        categoryId: catInfo.categoryId !== 'all' ? catInfo.categoryId : subCatInfo.categoryId,
        categorySlug: parts[0],
        subcategoryId: subCatInfo.subcategoryId !== 'all' ? subCatInfo.subcategoryId : subCatInfo.categoryId,
        subcategorySlug: parts[1],
        listingId: null,
        rawPath: clean,
      };
    }

    return notFoundRoute();
  }
}

/**
 * Builds authentic Chillyads.in formatted URLs (e.g. https://www.chillyads.in/mumbai_g4058997)
 */
export function buildChillyUrl(options: {
  city?: string;
  categoryId?: string;
  subcategoryId?: string;
  listing?: Listing | null;
  action?: 'post' | 'search' | 'admin';
  adminSubPath?: string;
  categories?: Category[];
}): string {
  const { city, categoryId, subcategoryId, listing, action, adminSubPath, categories = [] } = options;

  // 1. Admin Urls
  if (action === 'admin') {
    return adminSubPath ? `/admin/${adminSubPath.replace(/^\/admin\/?/, '')}` : '/admin';
  }

  // 2. Post / Sell Urls
  if (action === 'post') {
    if (city && city !== 'All India') {
      const citySlug = slugify(city);
      return `/${citySlug}/post`;
    }
    return '/post';
  }

  // 3. Search Urls
  if (action === 'search') {
    return '/search';
  }

  // 4. Master SEO URL: /{city}/{category}/{sub-category}/{title-slug}-{id}
  // (e.g. /mumbai/mobiles/mobile-phones/iphone-14-pro-lst_2041)
  if (listing) {
    const rawCity = listing.location?.city || city || 'All India';
    const citySegment = rawCity !== 'All India' ? slugify(rawCity) : 'all-india';

    const mainCatObj = categories.find((c) => c.id === listing.categoryId);
    const subCatObj = categories.find((c) => c.id === listing.subcategoryId);

    const catSlug = mainCatObj ? (mainCatObj.slug || slugify(mainCatObj.name)) : 'classifieds';
    const subCatSlug = subCatObj ? (subCatObj.slug || slugify(subCatObj.name)) : catSlug;

    const shortTitleSlug = getCleanSeoTitleSlug(listing.title);
    const shortId = getShortListingId(listing.id);
    return `/${citySegment}/${catSlug}/${subCatSlug}/${shortTitleSlug}-${shortId}`;
  }

  // 5. City & Category Urls (e.g. /mumbai or /mumbai/mobiles or /mumbai/mobiles/mobile-phones)
  const cityName = city && city !== 'All India' ? city : 'All India';
  const citySlug = slugify(cityName);
  const locationSegment = cityName !== 'All India' ? citySlug : '';

  let catSegment = '';
  let subCatSegment = '';

  if (categoryId && categoryId !== 'all') {
    const catObj = categories.find((c) => c.id === categoryId);
    if (catObj) {
      catSegment = catObj.slug || slugify(catObj.name);
    }
  }

  if (subcategoryId && subcategoryId !== 'all') {
    const subCatObj = categories.find((c) => c.id === subcategoryId);
    if (subCatObj) {
      subCatSegment = subCatObj.slug || slugify(subCatObj.name);
    }
  }

  if (!locationSegment) {
    if (catSegment && subCatSegment) {
      return `/${catSegment}/${subCatSegment}`;
    }
    if (catSegment) {
      return `/${catSegment}`;
    }
    if (subCatSegment) {
      return `/${subCatSegment}`;
    }
    return '/';
  }

  if (catSegment && subCatSegment) {
    return `/${locationSegment}/${catSegment}/${subCatSegment}`;
  }
  if (catSegment) {
    return `/${locationSegment}/${catSegment}`;
  }
  if (subCatSegment) {
    return `/${locationSegment}/${subCatSegment}`;
  }

  return `/${locationSegment}`;
}

/**
 * Dynamically updates document canonical link tag, title, and OpenGraph SEO meta tags
 */
export function updateSeoAndCanonical(
  parsedRoute: ParsedRoute,
  options: {
    listing?: Listing | null;
    categories?: Category[];
    siteName?: string;
  }
): void {
  const { listing, categories = [], siteName = 'Chillyads' } = options;

  // 1. Build canonical absolute URL without hash
  const origin = window.location.origin;
  const pathName = window.location.pathname;
  const canonicalUrl = `${origin}${pathName === '/' ? '' : pathName}${window.location.search}`;

  // Update or inject <link rel="canonical"> tag
  let canonicalEl = document.querySelector<HTMLLinkElement>('link[rel="canonical"]');
  if (!canonicalEl) {
    canonicalEl = document.createElement('link');
    canonicalEl.setAttribute('rel', 'canonical');
    document.head.appendChild(canonicalEl);
  }
  canonicalEl.setAttribute('href', canonicalUrl);

  // 2. Construct Page Title and Meta Description
  let pageTitle = `${siteName} - Buy & Sell Second Hand Items`;
  let metaDesc = `Commercial-grade Chillyads classifieds marketplace. Find cars, mobile phones, real estate, electronics, jobs and services.`;

  const cityLabel = parsedRoute.city && parsedRoute.city !== 'All India' ? parsedRoute.city : 'India';

  if (parsedRoute.routeType === 'listing' && listing) {
    const priceFormatted =
      listing.price !== null && listing.price !== undefined
        ? new Intl.NumberFormat('en-IN', {
            style: 'currency',
            currency: 'INR',
            maximumFractionDigits: 0,
          }).format(listing.price)
        : 'Price on request';

    pageTitle = `${listing.title} in ${listing.location.locality ? `${listing.location.locality}, ` : ''}${listing.location.city} | ${priceFormatted} - ${siteName}`;
    metaDesc = `${listing.description.substring(0, 150)}... ${listing.title} (${priceFormatted}) in ${listing.location.city}. Direct contact with verified seller ${listing.sellerName}.`;
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
      pageTitle = formatLocationSeoText(matchedCategory.seoTitle, cityLabel);
    } else {
      pageTitle = `${catName} in ${cityLabel} - Buy & Sell Second Hand ${catName} | ${siteName}`;
    }

    if (matchedCategory?.seoDescription) {
      metaDesc = formatLocationSeoText(matchedCategory.seoDescription, cityLabel);
    } else {
      metaDesc = `Find the best deals on ${catName} in ${cityLabel}. Browse thousands of verified ads, compare prices, and connect with local buyers & sellers on ${siteName}.`;
    }
  } else if (parsedRoute.routeType === 'city') {
    pageTitle = `Chillyads ${parsedRoute.city} - Buy & Sell Cars, Mobiles, Apartments & Services in ${parsedRoute.city}`;
    metaDesc = `Discover local classified ads in ${parsedRoute.city}. Buy and sell second hand cars, mobile phones, laptops, homes, jobs and services in ${parsedRoute.city} on ${siteName}.`;
  } else if (parsedRoute.routeType === 'post') {
    pageTitle = `Post Free Ad in ${cityLabel} - Sell Quickly on ${siteName}`;
    metaDesc = `Post a free classified ad in ${cityLabel}. Reach millions of interested local buyers for cars, mobiles, real estate, electronics and services.`;
  } else if (parsedRoute.routeType === 'admin') {
    pageTitle = `Admin Workspace - ${siteName} Control Panel`;
    metaDesc = `Administrative dashboard for managing marketplace listings, user KYC verifications, category hierarchies, and monetization.`;
  }

  // Set document title
  document.title = pageTitle;

  // Helper to set or update meta tag
  const setMetaTag = (selector: string, attrName: string, attrVal: string, content: string) => {
    let el = document.querySelector<HTMLMetaElement>(selector);
    if (!el) {
      el = document.createElement('meta');
      el.setAttribute(attrName, attrVal);
      document.head.appendChild(el);
    }
    el.setAttribute('content', content);
  };

  const primaryImage = listing?.images?.[0] || `${origin}/favicon.ico`;
  const searchParams = new URLSearchParams(window.location.search);
  const hasSearchQuery = Boolean(searchParams.get('q') || searchParams.get('search'));
  const shouldNoIndex =
    parsedRoute.routeType === 'not-found' ||
    parsedRoute.routeType === 'admin' ||
    parsedRoute.routeType === 'user-panel' ||
    parsedRoute.routeType === 'post' ||
    parsedRoute.routeType === 'search' ||
    hasSearchQuery ||
    (parsedRoute.routeType === 'listing' && !listing);

  setMetaTag('meta[name="description"]', 'name', 'description', metaDesc);
  setMetaTag(
    'meta[name="robots"]',
    'name',
    'robots',
    shouldNoIndex
      ? 'noindex, nofollow'
      : 'index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1'
  );
  setMetaTag('meta[property="og:title"]', 'property', 'og:title', pageTitle);
  setMetaTag('meta[property="og:description"]', 'property', 'og:description', metaDesc);
  setMetaTag('meta[property="og:url"]', 'property', 'og:url', canonicalUrl);
  setMetaTag('meta[property="og:type"]', 'property', 'og:type', listing ? 'product' : 'website');
  setMetaTag('meta[property="og:image"]', 'property', 'og:image', primaryImage);
  setMetaTag('meta[property="og:site_name"]', 'property', 'og:site_name', siteName);
  setMetaTag('meta[name="twitter:card"]', 'name', 'twitter:card', 'summary_large_image');
  setMetaTag('meta[name="twitter:title"]', 'name', 'twitter:title', pageTitle);
  setMetaTag('meta[name="twitter:description"]', 'name', 'twitter:description', metaDesc);
  setMetaTag('meta[name="twitter:image"]', 'name', 'twitter:image', primaryImage);

  if (listing && listing.price !== null && listing.price !== undefined) {
    setMetaTag('meta[property="product:price:amount"]', 'property', 'product:price:amount', listing.price.toString());
    setMetaTag('meta[property="product:price:currency"]', 'property', 'product:price:currency', 'INR');
  }

  // 3. Inject Schema.org JSON-LD structured data
  let schemaData: object[] = [
    {
      '@context': 'https://schema.org',
      '@type': 'WebSite',
      name: siteName,
      url: origin,
      potentialAction: {
        '@type': 'SearchAction',
        target: `${origin}/search?q={search_term_string}`,
        'query-input': 'required name=search_term_string',
      },
    },
  ];

  if (parsedRoute.routeType === 'listing' && listing) {
    const isVehicle = listing.categoryId === 'cat_cars' || listing.categoryId === 'cat_bikes';
    const isRealEstate = listing.categoryId === 'cat_housing_realestate';

    let itemSchema: Record<string, any> = {
      '@context': 'https://schema.org',
      '@type': isVehicle ? 'Vehicle' : isRealEstate ? 'SingleFamilyResidence' : 'Product',
      name: listing.title,
      description: listing.description,
      image: listing.images,
      sku: listing.id,
      offers: {
        '@type': 'Offer',
        url: canonicalUrl,
        price: listing.price !== null && listing.price !== undefined ? listing.price : undefined,
        priceCurrency: 'INR',
        itemCondition: 'https://schema.org/UsedCondition',
        availability: listing.status === 'sold' ? 'https://schema.org/OutOfStock' : 'https://schema.org/InStock',
        seller: {
          '@type': 'Person',
          name: listing.sellerName,
        },
      },
    };

    if (listing.location?.locality || listing.location?.city) {
      itemSchema.locationCreated = {
        '@type': 'Place',
        address: {
          '@type': 'PostalAddress',
          addressLocality: listing.location.locality || listing.location.city,
          addressRegion: listing.location.state,
          addressCountry: 'IN',
        },
        ...(listing.location.latitude && listing.location.longitude
          ? {
              geo: {
                '@type': 'GeoCoordinates',
                latitude: listing.location.latitude,
                longitude: listing.location.longitude,
              },
            }
          : {}),
      };
    }

    // BreadcrumbList Schema for Google Rich Search Results
    const breadcrumbSchema = {
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      itemListElement: [
        {
          '@type': 'ListItem',
          position: 1,
          name: 'Home',
          item: origin,
        },
        ...(listing.location?.city
          ? [
              {
                '@type': 'ListItem',
                position: 2,
                name: listing.location.city,
                item: `${origin}/${slugify(listing.location.city)}_${getCityGeoId(slugify(listing.location.city))}`,
              },
            ]
          : []),
        {
          '@type': 'ListItem',
          position: listing.location?.city ? 3 : 2,
          name: listing.title,
          item: canonicalUrl,
        },
      ],
    };

    schemaData = [itemSchema, breadcrumbSchema];
  }

  let scriptEl = document.getElementById('schema-jsonld') as HTMLScriptElement | null;
  if (!scriptEl) {
    scriptEl = document.createElement('script');
    scriptEl.id = 'schema-jsonld';
    scriptEl.type = 'application/ld+json';
    document.head.appendChild(scriptEl);
  }
  scriptEl.textContent = serializeJsonLd(schemaData);
}

/**
 * Safely serializes data for embedding inside HTML <script type="application/ld+json">
 * to prevent stored XSS vulnerabilities.
 */
export function serializeJsonLd(data: unknown): string {
  return JSON.stringify(data)
    .replace(/</g, '\\u003c')
    .replace(/>/g, '\\u003e')
    .replace(/&/g, '\\u0026')
    .replace(/\u2028/g, '\\u2028')
    .replace(/\u2029/g, '\\u2029');
}

/**
 * Strips internal moderation, seller phone, and financial/analytics fields for public API responses
 */
export function toPublicListingDTO(listing: Listing): Partial<Listing> {
  const {
    spamScore,
    boostPaymentId,
    rejectionReason,
    sellerPhone,
    boostViews,
    boostImpressions,
    boostClicks,
    ...publicDTO
  } = listing;
  return publicDTO;
}
