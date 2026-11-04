import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizeAdTitle, checkDuplicateAdTitle } from '../lib/utils/adTitleValidation.ts';
import {
  slugify,
  buildChillyUrl,
  parseChillyPath,
  toPublicListingDTO,
} from '../lib/utils/seoAndUrlHelper.ts';
import { isListingBoosted } from '../lib/utils/boostHelper.ts';
import { calculateDistanceKm } from '../lib/utils/distanceUtils.ts';
import { INITIAL_CATEGORIES, INITIAL_LOCATIONS } from '../lib/data/initialData.ts';

test('normalizeAdTitle collapses whitespace and lowercases cleanly', () => {
  assert.equal(normalizeAdTitle('  iPhone   15   Pro  Max '), 'iphone 15 pro max');
  assert.equal(normalizeAdTitle('Honda City 2022'), 'honda city 2022');
});

test('checkDuplicateAdTitle detects active duplicate titles for the same seller', () => {
  const existingListings = [
    {
      id: 'lst_1',
      sellerId: 'usr_1',
      title: 'MacBook Pro M3 Max 16-inch',
      status: 'approved',
    },
    {
      id: 'lst_2',
      sellerId: 'usr_1',
      title: 'Old Sold Bike',
      status: 'sold',
    },
  ];

  const dup = checkDuplicateAdTitle({
    title: '  macbook   pro m3 max 16-inch ',
    sellerId: 'usr_1',
    existingListings,
  });
  assert.equal(dup.isDuplicate, true);
  assert.equal(dup.conflictingListingId, 'lst_1');

  const diffSeller = checkDuplicateAdTitle({
    title: 'MacBook Pro M3 Max 16-inch',
    sellerId: 'usr_2',
    existingListings,
  });
  assert.equal(diffSeller.isDuplicate, false);

  const soldTitle = checkDuplicateAdTitle({
    title: 'Old Sold Bike',
    sellerId: 'usr_1',
    existingListings,
  });
  assert.equal(soldTitle.isDuplicate, false);
});

test('buildChillyUrl and parseChillyPath round-trip hierarchical SEO URLs', () => {
  assert.equal(slugify('Used Cars & SUVs!'), 'used-cars-and-suvs');

  const cityCatUrl = buildChillyUrl({
    city: 'Mumbai',
    categoryId: 'cat_cars',
    categories: INITIAL_CATEGORIES,
  });
  assert.equal(cityCatUrl, '/mumbai/cars');

  const parsedCityCat = parseChillyPath('/mumbai/cars', INITIAL_LOCATIONS, INITIAL_CATEGORIES);
  assert.equal(parsedCityCat.routeType, 'category');
  assert.equal(parsedCityCat.city, 'Mumbai');
  assert.equal(parsedCityCat.categoryId, 'cat_cars');

  const parsedAdmin = parseChillyPath('/admin/listings/moderation', INITIAL_LOCATIONS, INITIAL_CATEGORIES);
  assert.equal(parsedAdmin.routeType, 'admin');

  const parsedPost = parseChillyPath('/post', INITIAL_LOCATIONS, INITIAL_CATEGORIES);
  assert.equal(parsedPost.routeType, 'post');
});

test('toPublicListingDTO strips private sellerPhone and internal moderation fields', () => {
  const rawListing: any = {
    id: 'lst_99',
    sellerId: 'usr_1',
    sellerName: 'Aarav Sharma',
    sellerPhone: '+91 9876543210',
    categoryId: 'cat_cars',
    title: 'Hyundai Creta SX 2023',
    description: 'Mint condition SUV',
    price: 1450000,
    location: { city: 'Mumbai', state: 'Maharashtra', locality: 'Bandra' },
    images: [],
    customAttributes: {},
    status: 'approved',
    rejectionReason: 'Internal note',
    boostPaymentId: 'pay_secret_123',
    spamScore: 42,
    isFeatured: false,
    isBoosted: false,
    views: 10,
    likes: 2,
    chatsCount: 1,
    createdAt: new Date().toISOString(),
    expiresAt: new Date(Date.now() + 86400000).toISOString(),
  };

  const dto = toPublicListingDTO(rawListing);
  assert.ok(!dto.sellerPhone);
  assert.equal(dto.rejectionReason, undefined);
  assert.equal(dto.boostPaymentId, undefined);
});

test('isListingBoosted and calculateDistanceKm compute expected values', () => {
  const future = new Date(Date.now() + 3600_000).toISOString();
  const past = new Date(Date.now() - 3600_000).toISOString();

  assert.equal(
    isListingBoosted({ isBoosted: true, boostStatus: 'active', boostExpiresAt: future } as any),
    true
  );
  assert.equal(
    isListingBoosted({ isBoosted: true, boostStatus: 'active', boostExpiresAt: past } as any),
    false
  );

  // Distance between Mumbai (19.0760, 72.8777) and Pune (18.5204, 73.8567) is ~118-120 km
  const distKm = calculateDistanceKm(19.076, 72.8777, 18.5204, 73.8567);
  assert.ok(distKm > 110 && distKm < 130);
});

test('seedCategoriesWithTenAds strictly returns no demo data on empty categories in production', async () => {
  const { seedCategoriesWithTenAds } = await import('../lib/data/listingsSeeder.ts');
  const prevEnv = process.env.NODE_ENV;
  try {
    process.env.NODE_ENV = 'production';
    const result = seedCategoriesWithTenAds([]);
    assert.deepEqual(result, []);
  } finally {
    process.env.NODE_ENV = prevEnv;
  }
});
