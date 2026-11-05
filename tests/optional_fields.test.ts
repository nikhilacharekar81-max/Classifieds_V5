import test from 'node:test';
import assert from 'node:assert/strict';
import { listingRepository } from '../server/repositories/listing.repository';
import { listingService } from '../server/services/listing.service';

test('Optional Price and Photos — Creating ad with no price and no photos', async () => {
  const adId = `test_no_price_${Date.now()}`;
  const res = await listingService.createListing({
    title: `Unpriced Photo-less Item ${Date.now()}`,
    description: 'This listing has no price and no photos.',
    categoryId: 'cat_services',
    sellerId: 'usr_101',
    sellerName: 'Rohit Verma',
    sellerPhone: '+91 98201 54321',
    location: {
      city: 'Mumbai',
      state: 'Maharashtra',
      locality: 'Bandra',
    },
    images: [],
    // price omitted / undefined
  });

  assert.equal(res.success, true, 'Listing creation should succeed without price or photos');
  assert.ok(res.listing, 'Created listing data should be returned');
  assert.equal(res.listing?.price, null, 'Unspecified price should be stored as null');
  assert.deepEqual(res.listing?.images, [], 'No photos should yield an empty array');

  // Verify DB fetch
  const fetched = await listingRepository.findById(res.listing!.id);
  assert.ok(fetched, 'Listing should be fetchable from repository');
  assert.equal(fetched?.price, null, 'Repository must return price as null');
  assert.deepEqual(fetched?.images, [], 'Repository must return images as []');
});

test('Optional Price and Photos — Explicit price 0 (Free items) is preserved as number 0', async () => {
  const res = await listingService.createListing({
    title: `Free Item Giveaway ${Date.now()}`,
    description: 'Giving away free study table.',
    categoryId: 'cat_furniture',
    sellerId: 'usr_101',
    price: 0,
    images: ['https://example.com/photo1.jpg'],
    location: {
      city: 'Delhi',
      state: 'Delhi',
      locality: 'Connaught Place',
    },
  });

  assert.equal(res.success, true, 'Creating free item with price=0 should succeed');
  assert.equal(res.listing?.price, 0, 'Explicit price 0 must be preserved as number 0, not converted to null');
});

test('Optional Price and Photos — Numeric price is stored and returned normally', async () => {
  const res = await listingService.createListing({
    title: `Priced Laptop ${Date.now()}`,
    description: 'High performance laptop.',
    categoryId: 'cat_electronics',
    sellerId: 'usr_101',
    price: 45000,
    images: ['https://example.com/laptop.jpg'],
    location: {
      city: 'Bengaluru',
      state: 'Karnataka',
      locality: 'Koramangala',
    },
  });

  assert.equal(res.success, true, 'Creating listing with price 45000 should succeed');
  assert.equal(res.listing?.price, 45000, 'Numeric price 45000 should be stored and returned');
});
