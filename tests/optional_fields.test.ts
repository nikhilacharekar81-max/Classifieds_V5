import test from 'node:test';
import assert from 'node:assert/strict';
import { pool } from '../src/db/index.ts';
import { listingRepository } from '../server/repositories/listing.repository';
import { listingService } from '../server/services/listing.service';

test('Optional Price and Photos — Creating ad with no price and no photos', async () => {
  const sellerId = `test_seller_opt_1_${Date.now()}`;
  await pool.query(`
    INSERT INTO users (id, name, email, phone, type, status, email_verified)
    VALUES ($1, 'Test Seller', $2, '+919876543210', 'user', 'active', TRUE)
    ON CONFLICT (id) DO NOTHING
  `, [sellerId, `${sellerId}@example.com`]);

  try {
    const res = await listingService.createListing({
      title: `Unpriced Photo-less Item ${Date.now()}`,
      description: 'This listing has no price and no photos.',
      categoryId: 'cat_services',
      sellerId,
      sellerName: 'Rohit Verma',
      sellerPhone: '+91 98201 54321',
      location: {
        city: 'Mumbai',
        state: 'Maharashtra',
        locality: 'Bandra',
      },
      images: [],
      // price omitted / undefined
    } as any);

    assert.equal(res.success, true, `Listing creation should succeed without price or photos. Error: ${res.error}`);
    assert.ok(res.listing, 'Created listing data should be returned');
    assert.equal(res.listing?.price, null, 'Unspecified price should be stored as null');
    assert.deepEqual(res.listing?.images, [], 'No photos should yield an empty array');

    // Verify DB fetch
    const fetched = await listingRepository.findById(res.listing!.id);
    assert.ok(fetched, 'Listing should be fetchable from repository');
    assert.equal(fetched?.price, null, 'Repository must return price as null');
    assert.deepEqual(fetched?.images, [], 'Repository must return images as []');
  } finally {
    await pool.query('DELETE FROM listings WHERE seller_id = $1', [sellerId]);
    await pool.query('DELETE FROM users WHERE id = $1', [sellerId]);
  }
});

test('Optional Price and Photos — Explicit price 0 (Free items) is preserved as number 0', async () => {
  const sellerId = `test_seller_opt_2_${Date.now()}`;
  await pool.query(`
    INSERT INTO users (id, name, email, phone, type, status, email_verified)
    VALUES ($1, 'Test Seller', $2, '+919876543210', 'user', 'active', TRUE)
    ON CONFLICT (id) DO NOTHING
  `, [sellerId, `${sellerId}@example.com`]);

  try {
    const res = await listingService.createListing({
      title: `Free Item Giveaway ${Date.now()}`,
      description: 'Giving away free study table.',
      categoryId: 'cat_furniture',
      sellerId,
      price: 0,
      images: ['https://example.com/photo1.jpg'],
      location: {
        city: 'Delhi',
        state: 'Delhi',
        locality: 'Connaught Place',
      },
    } as any);

    assert.equal(res.success, true, 'Creating free item with price=0 should succeed');
    assert.equal(res.listing?.price, 0, 'Explicit price 0 must be preserved as number 0, not converted to null');
  } finally {
    await pool.query('DELETE FROM listings WHERE seller_id = $1', [sellerId]);
    await pool.query('DELETE FROM users WHERE id = $1', [sellerId]);
  }
});

test('Optional Price and Photos — Numeric price is stored and returned normally', async () => {
  const sellerId = `test_seller_opt_3_${Date.now()}`;
  await pool.query(`
    INSERT INTO users (id, name, email, phone, type, status, email_verified)
    VALUES ($1, 'Test Seller', $2, '+919876543210', 'user', 'active', TRUE)
    ON CONFLICT (id) DO NOTHING
  `, [sellerId, `${sellerId}@example.com`]);

  try {
    const res = await listingService.createListing({
      title: `Priced Laptop ${Date.now()}`,
      description: 'High performance laptop.',
      categoryId: 'cat_electronics',
      sellerId,
      price: 45000,
      images: ['https://example.com/laptop.jpg'],
      location: {
        city: 'Bengaluru',
        state: 'Karnataka',
        locality: 'Koramangala',
      },
    } as any);

    assert.equal(res.success, true, 'Creating listing with price 45000 should succeed');
    assert.equal(res.listing?.price, 45000, 'Numeric price 45000 should be stored and returned');
  } finally {
    await pool.query('DELETE FROM listings WHERE seller_id = $1', [sellerId]);
    await pool.query('DELETE FROM users WHERE id = $1', [sellerId]);
  }
});
