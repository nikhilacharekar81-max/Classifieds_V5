import test from 'node:test';
import assert from 'node:assert/strict';
import { userRepository } from '../server/repositories/user.repository';
import { POST as listingHandler } from '../server/api/listings/route';
import { NextRequest } from '../src/shims/next-server';

function createMockRequest(url: string, body: any, cookie?: string): NextRequest {
  const reqHeaders = new Headers();
  reqHeaders.set('content-type', 'application/json');
  if (cookie) {
    reqHeaders.set('cookie', cookie);
  }
  return new NextRequest(new URL(url, 'http://localhost:3000'), {
    method: 'POST',
    headers: reqHeaders,
    body: JSON.stringify(body),
  });
}

test('POST /api/listings — Optional Price and Photos', async () => {
  const { pool } = await import('../src/db/index.ts');
  await pool.query(`
    INSERT INTO users (id, name, email, phone, type, status, email_verified)
    VALUES ('usr_101', 'Test User', 'usr_101@example.com', '+919876543210', 'user', 'active', TRUE)
    ON CONFLICT (id) DO UPDATE SET email_verified = TRUE, phone = '+919876543210', status = 'active'
  `);
  const sessionId = `sess_${Date.now()}`;
  await userRepository.createSession(sessionId, 'usr_101', '127.0.0.1');
  const cookie = `chillyads_session=${sessionId}`;

  // Test Case 1: No price, No photos
  const req1 = createMockRequest('http://localhost:3000/api/listings', {
    title: `Item no price ${Date.now()}`,
    description: 'No price or photos.',
    categoryId: 'cat_services',
    location: { city: 'Mumbai', state: 'Maharashtra', locality: 'Bandra' },
  }, cookie);
  const res1 = await listingHandler(req1);
  assert.equal(res1.status, 201, 'Should create listing with no price/photos');
  const listing1 = await res1.json();
  assert.equal(listing1.price, null, 'Price should be null');

  // Test Case 2: Explicit 0
  const req2 = createMockRequest('http://localhost:3000/api/listings', {
    title: `Item free ${Date.now()}`,
    description: 'Free item.',
    categoryId: 'cat_services',
    price: 0,
    location: { city: 'Mumbai', state: 'Maharashtra', locality: 'Bandra' },
  }, cookie);
  const res2 = await listingHandler(req2);
  assert.equal(res2.status, 201, 'Should create listing with 0 price');
  const listing2 = await res2.json();
  assert.equal(listing2.price, 0, 'Price should be 0');

  // Test Case 3: Valid Price
  const req3 = createMockRequest('http://localhost:3000/api/listings', {
    title: `Item valid ${Date.now()}`,
    description: 'Valid priced item.',
    categoryId: 'cat_services',
    price: 1000,
    location: { city: 'Mumbai', state: 'Maharashtra', locality: 'Bandra' },
  }, cookie);
  const res3 = await listingHandler(req3);
  assert.equal(res3.status, 201, 'Should create listing with valid price');
  const listing3 = await res3.json();
  assert.equal(listing3.price, 1000, 'Price should be 1000');

  // Test Case 4: Invalid negative price
  const req4 = createMockRequest('http://localhost:3000/api/listings', {
    title: `Item invalid ${Date.now()}`,
    description: 'Invalid price.',
    categoryId: 'cat_services',
    price: -10,
    location: { city: 'Mumbai', state: 'Maharashtra', locality: 'Bandra' },
  }, cookie);
  const res4 = await listingHandler(req4);
  assert.equal(res4.status, 400, 'Should reject negative price');
});
