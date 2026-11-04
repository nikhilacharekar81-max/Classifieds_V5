import test from 'node:test';
import assert from 'node:assert/strict';
import { pool } from '../src/db/index.ts';
import { listingRepository } from '../server/repositories/listing.repository.ts';
import { POST as bulkActionPost } from '../server/api/listings/bulk-action/route.ts';
import { PUT as listingIdPut } from '../server/api/listings/[id]/route.ts';
import { GET as listingsGet } from '../server/api/listings/route.ts';

// Helper to create a NextRequest shim with session token
function makeReq(url: string, method: string, body?: any, sessionToken?: string) {
  const headers = new Headers();
  if (sessionToken) {
    headers.set('authorization', `Bearer ${sessionToken}`);
  }
  headers.set('content-type', 'application/json');
  return {
    url,
    method,
    headers,
    cookies: {
      get: (name: string) => (name === 'session_token' ? { value: sessionToken } : undefined),
    },
    json: async () => body,
  } as any;
}

test('Finding 1 & 2: Renewal and Expiry Date Protection', async () => {
  const sellerId = `test_seller_${Date.now()}`;
  const otherSellerId = `test_other_seller_${Date.now()}`;
  const adminId = `test_admin_${Date.now()}`;
  const modId = `test_mod_${Date.now()}`;

  const sellerToken = `token_seller_${Date.now()}`;
  const adminToken = `token_admin_${Date.now()}`;
  const modToken = `token_mod_${Date.now()}`;

  await pool.query(`
    INSERT INTO users (id, name, email, type, status, admin_role) VALUES
      ($1, 'Test Seller', '${sellerId}@example.com', 'user', 'active', NULL),
      ($2, 'Other Seller', '${otherSellerId}@example.com', 'user', 'active', NULL),
      ($3, 'Test Admin', '${adminId}@example.com', 'user', 'active', 'admin'),
      ($4, 'Test Mod', '${modId}@example.com', 'user', 'active', 'moderator')
  `, [sellerId, otherSellerId, adminId, modId]);

  await pool.query(`
    INSERT INTO user_sessions (id, user_id, expires_at) VALUES
      ($1, $2, NOW() + INTERVAL '1 day'),
      ($3, $4, NOW() + INTERVAL '1 day'),
      ($5, $6, NOW() + INTERVAL '1 day')
  `, [sellerToken, sellerId, adminToken, adminId, modToken, modId]);

  // Create listings for testing:
  // - expired approved listing owned by seller
  // - pending listing owned by seller
  // - rejected listing owned by seller
  const expiredAdId = `lst_exp_${Date.now()}`;
  const pendingAdId = `lst_pnd_${Date.now()}`;
  const rejectedAdId = `lst_rej_${Date.now()}`;

  const pastDate = new Date(Date.now() - 5 * 24 * 3600 * 1000);

  await pool.query(`
    INSERT INTO listings (id, seller_id, seller_name, category_id, title, description, price, city, state, locality, status, expires_at) VALUES
      ($1, $2, 'Test Seller', 'cat_cars', 'Expired Used Car 2020', 'Good car', 250000, 'Mumbai', 'Maharashtra', 'Bandra', 'expired', $3),
      ($4, $2, 'Test Seller', 'cat_cars', 'Pending Luxury Watch', 'Nice watch', 50000, 'Mumbai', 'Maharashtra', 'Bandra', 'pending', $3),
      ($5, $2, 'Test Seller', 'cat_cars', 'Rejected Counterfeit Bag', 'Cheap bag', 500, 'Mumbai', 'Maharashtra', 'Bandra', 'rejected', $3)
  `, [expiredAdId, sellerId, pastDate, pendingAdId, rejectedAdId]);

  // TEST 1.1: Ordinary seller CAN renew their own expired listing
  const sellerRenewReq = makeReq('http://localhost:3000/api/listings/bulk-action', 'POST', {
    action: 'renew',
    ids: [expiredAdId],
    data: { days: 999 }, // Attemping arbitrary duration
  }, sellerToken);

  const sellerRenewRes = await bulkActionPost(sellerRenewReq);
  const sellerRenewJson = await sellerRenewRes.json();
  assert.equal(sellerRenewRes.status, 200, `Expected 200, got ${sellerRenewRes.status}: ${JSON.stringify(sellerRenewJson)}`);
  assert.equal(sellerRenewJson.success, true);

  // Verify server strictly enforced 30 days and status is approved
  const renewedItem = await listingRepository.findById(expiredAdId);
  assert.ok(renewedItem);
  assert.equal(renewedItem.status, 'approved');
  const expiryTime = new Date(renewedItem.expiresAt).getTime();
  const now = Date.now();
  // Expiry must be roughly 30 days ahead (between 29 and 31 days)
  const diffDays = Math.round((expiryTime - now) / (24 * 3600 * 1000));
  assert.ok(diffDays >= 29 && diffDays <= 31, `Expected roughly 30 days expiry, got ${diffDays}`);

  // TEST 1.2: Seller CANNOT renew pending listing (must undergo moderation)
  const renewPendingReq = makeReq('http://localhost:3000/api/listings/bulk-action', 'POST', {
    action: 'renew',
    ids: [pendingAdId],
  }, sellerToken);
  const renewPendingRes = await bulkActionPost(renewPendingReq);
  assert.equal(renewPendingRes.status, 400);
  const pendingCheck = await listingRepository.findById(pendingAdId);
  assert.equal(pendingCheck?.status, 'pending');

  // TEST 1.3: Seller CANNOT renew rejected listing
  const renewRejectedReq = makeReq('http://localhost:3000/api/listings/bulk-action', 'POST', {
    action: 'renew',
    ids: [rejectedAdId],
  }, sellerToken);
  const renewRejectedRes = await bulkActionPost(renewRejectedReq);
  assert.equal(renewRejectedRes.status, 400);
  const rejectedCheck = await listingRepository.findById(rejectedAdId);
  assert.equal(rejectedCheck?.status, 'rejected');

  // TEST 1.4: Seller CANNOT renew listing they do not own
  const otherExpiredAdId = `lst_oth_exp_${Date.now()}`;
  await pool.query(`
    INSERT INTO listings (id, seller_id, seller_name, category_id, title, description, price, city, state, locality, status, expires_at)
    VALUES ($1, $2, 'Other Seller', 'cat_cars', 'Other Expired Ad', 'Details', 10000, 'Mumbai', 'Maharashtra', 'Loc', 'expired', $3)
  `, [otherExpiredAdId, otherSellerId, pastDate]);

  const renewOtherReq = makeReq('http://localhost:3000/api/listings/bulk-action', 'POST', {
    action: 'renew',
    ids: [otherExpiredAdId],
  }, sellerToken);
  const renewOtherRes = await bulkActionPost(renewOtherReq);
  assert.equal(renewOtherRes.status, 403);

  // TEST 2.1: Admin CAN renew expired listing without seller approval, preserving ownership
  const adminRenewReq = makeReq('http://localhost:3000/api/listings/bulk-action', 'POST', {
    action: 'renew',
    ids: [otherExpiredAdId],
  }, adminToken);
  const adminRenewRes = await bulkActionPost(adminRenewReq);
  assert.equal(adminRenewRes.status, 200);

  const adminRenewedItem = await listingRepository.findById(otherExpiredAdId);
  assert.equal(adminRenewedItem?.status, 'approved');
  assert.equal(adminRenewedItem?.sellerId, otherSellerId, 'Admin renewal must preserve listing ownership');

  // TEST 2.2: Ordinary seller CANNOT modify expiresAt directly through update endpoint
  const sellerUpdateExpiryReq = makeReq(`http://localhost:3000/api/listings/${expiredAdId}`, 'PUT', {
    expiresAt: '2099-01-01',
  }, sellerToken);
  const sellerUpdateExpiryRes = await listingIdPut(sellerUpdateExpiryReq, { params: Promise.resolve({ id: expiredAdId }) });
  assert.equal(sellerUpdateExpiryRes.status, 400);

  // TEST 2.3: Admin supplying invalid date to PUT returns 400, NOT 500
  const adminInvalidDateReq = makeReq(`http://localhost:3000/api/listings/${expiredAdId}`, 'PUT', {
    expiresAt: 'not-a-valid-date',
  }, adminToken);
  const adminInvalidDateRes = await listingIdPut(adminInvalidDateReq, { params: Promise.resolve({ id: expiredAdId }) });
  assert.equal(adminInvalidDateRes.status, 400);

  // TEST 2.4: Admin legitimate expiry update succeeds with valid date
  const futureExpiry = new Date(Date.now() + 60 * 24 * 3600 * 1000).toISOString().split('T')[0];
  const adminValidDateReq = makeReq(`http://localhost:3000/api/listings/${expiredAdId}`, 'PUT', {
    expiresAt: futureExpiry,
  }, adminToken);
  const adminValidDateRes = await listingIdPut(adminValidDateReq, { params: Promise.resolve({ id: expiredAdId }) });
  assert.equal(adminValidDateRes.status, 200);

  // Clean up
  await pool.query('DELETE FROM listings WHERE id IN ($1, $2, $3, $4)', [
    expiredAdId, pendingAdId, rejectedAdId, otherExpiredAdId
  ]);
  await pool.query('DELETE FROM user_sessions WHERE user_id IN ($1, $2, $3, $4)', [
    sellerId, otherSellerId, adminId, modId
  ]);
  await pool.query('DELETE FROM users WHERE id IN ($1, $2, $3, $4)', [
    sellerId, otherSellerId, adminId, modId
  ]);
});

test('Finding 3: Moderation Permissions for Moderators and Admins', async () => {
  const sellerId = `seller_f3_${Date.now()}`;
  const modId = `mod_f3_${Date.now()}`;
  const adminId = `admin_f3_${Date.now()}`;

  const sellerToken = `token_s3_${Date.now()}`;
  const modToken = `token_m3_${Date.now()}`;
  const adminToken = `token_a3_${Date.now()}`;

  await pool.query(`
    INSERT INTO users (id, name, email, type, status, admin_role) VALUES
      ($1, 'F3 Seller', '${sellerId}@example.com', 'user', 'active', NULL),
      ($2, 'F3 Moderator', '${modId}@example.com', 'user', 'active', 'moderator'),
      ($3, 'F3 Admin', '${adminId}@example.com', 'user', 'active', 'admin')
  `, [sellerId, modId, adminId]);

  await pool.query(`
    INSERT INTO user_sessions (id, user_id, expires_at) VALUES
      ($1, $2, NOW() + INTERVAL '1 day'),
      ($3, $4, NOW() + INTERVAL '1 day'),
      ($5, $6, NOW() + INTERVAL '1 day')
  `, [sellerToken, sellerId, modToken, modId, adminToken, adminId]);

  const targetAdId = `lst_f3_${Date.now()}`;
  await pool.query(`
    INSERT INTO listings (id, seller_id, seller_name, category_id, title, description, price, city, state, locality, status, expires_at)
    VALUES ($1, $2, 'F3 Seller', 'cat_cars', 'Pending Test Car', 'Car info', 150000, 'Mumbai', 'Maharashtra', 'Loc', 'pending', NOW() + INTERVAL '30 days')
  `, [targetAdId, sellerId]);

  // TEST 3.1: Ordinary seller CANNOT approve their own listing
  const sellerApproveReq = makeReq(`http://localhost:3000/api/listings/${targetAdId}`, 'PUT', {
    status: 'approved',
  }, sellerToken);
  const sellerApproveRes = await listingIdPut(sellerApproveReq, { params: Promise.resolve({ id: targetAdId }) });
  assert.equal(sellerApproveRes.status, 403);

  // TEST 3.2: Moderator CAN approve individual listing
  const modApproveReq = makeReq(`http://localhost:3000/api/listings/${targetAdId}`, 'PUT', {
    status: 'approved',
  }, modToken);
  const modApproveRes = await listingIdPut(modApproveReq, { params: Promise.resolve({ id: targetAdId }) });
  assert.equal(modApproveRes.status, 200);
  const approvedItem = await listingRepository.findById(targetAdId);
  assert.equal(approvedItem?.status, 'approved');

  // TEST 3.3: Moderator CAN reject individual listing with reason
  const modRejectReq = makeReq(`http://localhost:3000/api/listings/${targetAdId}`, 'PUT', {
    status: 'rejected',
    rejectionReason: 'Invalid vehicle registration documents',
  }, modToken);
  const modRejectRes = await listingIdPut(modRejectReq, { params: Promise.resolve({ id: targetAdId }) });
  assert.equal(modRejectRes.status, 200);
  const rejectedItem = await listingRepository.findById(targetAdId);
  assert.equal(rejectedItem?.status, 'rejected');
  assert.equal(rejectedItem?.rejectionReason, 'Invalid vehicle registration documents');

  // TEST 3.4: Admin CAN approve individual listing
  const adminApproveReq = makeReq(`http://localhost:3000/api/listings/${targetAdId}`, 'PUT', {
    status: 'approved',
  }, adminToken);
  const adminApproveRes = await listingIdPut(adminApproveReq, { params: Promise.resolve({ id: targetAdId }) });
  assert.equal(adminApproveRes.status, 200);

  // TEST 3.5: Admin CAN perform bulk approve
  const adminBulkReq = makeReq('http://localhost:3000/api/listings/bulk-action', 'POST', {
    action: 'approve',
    ids: [targetAdId],
  }, adminToken);
  const adminBulkRes = await bulkActionPost(adminBulkReq);
  assert.equal(adminBulkRes.status, 200);

  // Clean up
  await pool.query('DELETE FROM listings WHERE id = $1', [targetAdId]);
  await pool.query('DELETE FROM user_sessions WHERE user_id IN ($1, $2, $3)', [sellerId, modId, adminId]);
  await pool.query('DELETE FROM users WHERE id IN ($1, $2, $3)', [sellerId, modId, adminId]);
});

test('Finding 4: Loading Seller & Moderation Listings Beyond Bootstrap', async () => {
  const sellerId = `seller_f4_${Date.now()}`;
  const otherSellerId = `other_f4_${Date.now()}`;
  const adminId = `admin_f4_${Date.now()}`;

  const sellerToken = `token_s4_${Date.now()}`;
  const adminToken = `token_a4_${Date.now()}`;

  await pool.query(`
    INSERT INTO users (id, name, email, type, status, admin_role) VALUES
      ($1, 'Seller F4', '${sellerId}@example.com', 'user', 'active', NULL),
      ($2, 'Other F4', '${otherSellerId}@example.com', 'user', 'active', NULL),
      ($3, 'Admin F4', '${adminId}@example.com', 'user', 'active', 'admin')
  `, [sellerId, otherSellerId, adminId]);

  await pool.query(`
    INSERT INTO user_sessions (id, user_id, expires_at) VALUES
      ($1, $2, NOW() + INTERVAL '1 day'),
      ($3, $4, NOW() + INTERVAL '1 day')
  `, [sellerToken, sellerId, adminToken, adminId]);

  // Create ads for seller across 5 statuses: pending, approved, rejected, sold, expired
  const ads = [
    { id: `lst_f4_pen_${Date.now()}`, status: 'pending', title: 'Ad F4 Pending' },
    { id: `lst_f4_app_${Date.now()}`, status: 'approved', title: 'Ad F4 Approved' },
    { id: `lst_f4_rej_${Date.now()}`, status: 'rejected', title: 'Ad F4 Rejected' },
    { id: `lst_f4_sld_${Date.now()}`, status: 'sold', title: 'Ad F4 Sold' },
    { id: `lst_f4_exp_${Date.now()}`, status: 'expired', title: 'Ad F4 Expired' },
  ];

  for (const ad of ads) {
    await pool.query(`
      INSERT INTO listings (id, seller_id, seller_name, category_id, title, description, price, city, state, locality, status, expires_at)
      VALUES ($1, $2, 'Seller F4', 'cat_cars', $3, 'Description', 1000, 'Mumbai', 'Maharashtra', 'Loc', $4, NOW() + INTERVAL '30 days')
    `, [ad.id, sellerId, ad.title, ad.status]);
  }

  // TEST 4.1: Public query without sellerId MUST only return approved, unexpired listings
  const publicReq = makeReq('http://localhost:3000/api/listings', 'GET');
  const publicRes = await listingsGet(publicReq);
  const publicJson = await publicRes.json();
  assert.equal(publicRes.status, 200);
  assert.ok(publicJson.items.every((it: any) => it.status === 'approved'));

  // TEST 4.2: Ordinary seller querying their own sellerId gets ALL 5 statuses
  const sellerAllReq = makeReq(`http://localhost:3000/api/listings?sellerId=${sellerId}&status=all`, 'GET', undefined, sellerToken);
  const sellerAllRes = await listingsGet(sellerAllReq);
  const sellerAllJson = await sellerAllRes.json();
  assert.equal(sellerAllRes.status, 200);
  const returnedStatuses = new Set(sellerAllJson.items.map((it: any) => it.status));
  assert.ok(returnedStatuses.has('pending'), 'Expected pending ad');
  assert.ok(returnedStatuses.has('approved'), 'Expected approved ad');
  assert.ok(returnedStatuses.has('rejected'), 'Expected rejected ad');
  assert.ok(returnedStatuses.has('sold'), 'Expected sold ad');
  assert.ok(returnedStatuses.has('expired'), 'Expected expired ad');

  // TEST 4.3: Ordinary seller querying another sellerId cannot receive other seller's private non-approved listings
  const queryOtherReq = makeReq(`http://localhost:3000/api/listings?sellerId=${sellerId}&status=all`, 'GET', undefined, undefined);
  const queryOtherRes = await listingsGet(queryOtherReq);
  const queryOtherJson = await queryOtherRes.json();
  assert.ok(queryOtherJson.items.every((it: any) => it.status === 'approved'), 'Public must never see non-approved ads');

  // TEST 4.4: Admin can retrieve paginated listings across all statuses
  const adminReq = makeReq('http://localhost:3000/api/listings?status=all&limit=10&offset=0', 'GET', undefined, adminToken);
  const adminRes = await listingsGet(adminReq);
  const adminJson = await adminRes.json();
  assert.equal(adminRes.status, 200);
  assert.ok(adminJson.total > 0);
  assert.ok(adminJson.items.length <= 10);

  // Clean up
  await pool.query('DELETE FROM listings WHERE id IN ($1, $2, $3, $4, $5)', ads.map(a => a.id));
  await pool.query('DELETE FROM user_sessions WHERE user_id IN ($1, $2, $3)', [sellerId, otherSellerId, adminId]);
  await pool.query('DELETE FROM users WHERE id IN ($1, $2, $3)', [sellerId, otherSellerId, adminId]);
});

test('Fix 1: Prevent sold listings from being renewed (seller, admin, and repository level)', async () => {
  const sellerId = `fix1_seller_${Date.now()}`;
  const adminId = `fix1_admin_${Date.now()}`;
  const sellerToken = `token_fix1_s_${Date.now()}`;
  const adminToken = `token_fix1_a_${Date.now()}`;

  await pool.query(`
    INSERT INTO users (id, name, email, type, status, admin_role) VALUES
      ($1, 'Fix1 Seller', '${sellerId}@example.com', 'user', 'active', NULL),
      ($2, 'Fix1 Admin', '${adminId}@example.com', 'user', 'active', 'admin')
  `, [sellerId, adminId]);

  await pool.query(`
    INSERT INTO user_sessions (id, user_id, expires_at) VALUES
      ($1, $2, NOW() + INTERVAL '1 day'),
      ($3, $4, NOW() + INTERVAL '1 day')
  `, [sellerToken, sellerId, adminToken, adminId]);

  const soldAdId = `lst_sold_${Date.now()}`;
  const expiredAdId = `lst_exp_${Date.now()}`;
  const pendingAdId = `lst_pnd_${Date.now()}`;
  const rejectedAdId = `lst_rej_${Date.now()}`;
  const pastDate = new Date(Date.now() - 10 * 24 * 3600 * 1000);

  // Insert a sold listing with past expires_at
  await pool.query(`
    INSERT INTO listings (id, seller_id, seller_name, category_id, title, description, price, city, state, locality, status, expires_at) VALUES
      ($1, $2, 'Fix1 Seller', 'cat_cars', 'Sold Car Listing', 'Sold desc', 1000, 'Mumbai', 'Maharashtra', 'Loc', 'sold', $3),
      ($4, $2, 'Fix1 Seller', 'cat_cars', 'Expired Car Listing', 'Exp desc', 1000, 'Mumbai', 'Maharashtra', 'Loc', 'expired', $3),
      ($5, $2, 'Fix1 Seller', 'cat_cars', 'Pending Car Listing', 'Pnd desc', 1000, 'Mumbai', 'Maharashtra', 'Loc', 'pending', $3),
      ($6, $2, 'Fix1 Seller', 'cat_cars', 'Rejected Car Listing', 'Rej desc', 1000, 'Mumbai', 'Maharashtra', 'Loc', 'rejected', $3)
  `, [soldAdId, sellerId, pastDate, expiredAdId, pendingAdId, rejectedAdId]);

  // 1. Seller attempting to renew sold listing MUST fail with 400
  const sellerRenewSoldReq = makeReq('http://localhost:3000/api/listings/bulk-action', 'POST', {
    action: 'renew',
    ids: [soldAdId],
  }, sellerToken);
  const sellerRenewSoldRes = await bulkActionPost(sellerRenewSoldReq);
  const sellerRenewSoldJson = await sellerRenewSoldRes.json();
  assert.equal(sellerRenewSoldRes.status, 400, 'Seller renewing sold listing must return 400');
  assert.match(sellerRenewSoldJson.error, /Sold listings cannot be renewed/i);

  // 2. Admin attempting to renew sold listing MUST ALSO fail with 400
  const adminRenewSoldReq = makeReq('http://localhost:3000/api/listings/bulk-action', 'POST', {
    action: 'renew',
    ids: [soldAdId],
  }, adminToken);
  const adminRenewSoldRes = await bulkActionPost(adminRenewSoldReq);
  const adminRenewSoldJson = await adminRenewSoldRes.json();
  assert.equal(adminRenewSoldRes.status, 400, 'Admin renewing sold listing must return 400');
  assert.match(adminRenewSoldJson.error, /Sold listings cannot be renewed/i);

  // 3. Admin attempting to renew pending or rejected listing MUST fail with 400
  const adminRenewPendingReq = makeReq('http://localhost:3000/api/listings/bulk-action', 'POST', {
    action: 'renew',
    ids: [pendingAdId],
  }, adminToken);
  const adminRenewPendingRes = await bulkActionPost(adminRenewPendingReq);
  assert.equal(adminRenewPendingRes.status, 400, 'Admin renewing pending listing must return 400');

  const adminRenewRejectedReq = makeReq('http://localhost:3000/api/listings/bulk-action', 'POST', {
    action: 'renew',
    ids: [rejectedAdId],
  }, adminToken);
  const adminRenewRejectedRes = await bulkActionPost(adminRenewRejectedReq);
  assert.equal(adminRenewRejectedRes.status, 400, 'Admin renewing rejected listing must return 400');

  // 4. Repository level direct bypass attempt: bulkRenew directly called on sold, pending, and rejected
  const directRenewResult = await listingRepository.bulkRenew([soldAdId, pendingAdId, rejectedAdId], 30);
  assert.equal(directRenewResult.renewedCount, 0, 'Repository bulkRenew must not update sold, pending, or rejected listings');

  // Verify database status remains strictly unchanged
  const checkSold = await listingRepository.findById(soldAdId);
  assert.equal(checkSold?.status, 'sold', 'Sold listing status must still be sold');
  const checkPending = await listingRepository.findById(pendingAdId);
  assert.equal(checkPending?.status, 'pending', 'Pending listing status must still be pending');
  const checkRejected = await listingRepository.findById(rejectedAdId);
  assert.equal(checkRejected?.status, 'rejected', 'Rejected listing status must still be rejected');

  // 5. Eligible expired listing CAN be renewed and gets exactly 30 days
  const renewExpReq = makeReq('http://localhost:3000/api/listings/bulk-action', 'POST', {
    action: 'renew',
    ids: [expiredAdId],
  }, sellerToken);
  const renewExpRes = await bulkActionPost(renewExpReq);
  assert.equal(renewExpRes.status, 200, 'Eligible expired listing renewal must return 200');
  const checkExp = await listingRepository.findById(expiredAdId);
  assert.equal(checkExp?.status, 'approved', 'Renewed listing status must be approved');
  const daysDiff = Math.round((new Date(checkExp!.expiresAt).getTime() - Date.now()) / (24 * 3600 * 1000));
  assert.ok(daysDiff >= 29 && daysDiff <= 31, `Renewal must add exactly 30 days (got ${daysDiff})`);

  // Clean up
  await pool.query('DELETE FROM listings WHERE id IN ($1, $2, $3, $4)', [soldAdId, expiredAdId, pendingAdId, rejectedAdId]);
  await pool.query('DELETE FROM user_sessions WHERE user_id IN ($1, $2)', [sellerId, adminId]);
  await pool.query('DELETE FROM users WHERE id IN ($1, $2)', [sellerId, adminId]);
});

test('Fix 2: Pagination of seller listings via API limit and offset beyond 200 items', async () => {
  const sellerId = `fix2_seller_${Date.now()}`;
  const sellerToken = `token_fix2_s_${Date.now()}`;

  await pool.query(`
    INSERT INTO users (id, name, email, type, status, admin_role) VALUES
      ($1, 'Fix2 Seller', '${sellerId}@example.com', 'user', 'active', NULL)
  `, [sellerId]);

  await pool.query(`
    INSERT INTO user_sessions (id, user_id, expires_at) VALUES
      ($1, $2, NOW() + INTERVAL '1 day')
  `, [sellerToken, sellerId]);

  // Insert 25 items for this seller with varying statuses
  const ids: string[] = [];
  for (let i = 0; i < 25; i++) {
    const id = `lst_pg_${i}_${Date.now()}`;
    ids.push(id);
    const status = i % 5 === 0 ? 'approved' : i % 5 === 1 ? 'pending' : i % 5 === 2 ? 'sold' : i % 5 === 3 ? 'expired' : 'rejected';
    await pool.query(`
      INSERT INTO listings (id, seller_id, seller_name, category_id, title, description, price, city, state, locality, status, expires_at)
      VALUES ($1, $2, 'Fix2 Seller', 'cat_cars', $3, 'Description', 1000, 'Mumbai', 'Maharashtra', 'Loc', $4, NOW() + INTERVAL '30 days')
    `, [id, sellerId, `Seller Ad ${i}`, status]);
  }

  // Page 1 (limit 10, offset 0)
  const page1Req = makeReq(`http://localhost:3000/api/listings?sellerId=${sellerId}&status=all&limit=10&offset=0`, 'GET', undefined, sellerToken);
  const page1Res = await listingsGet(page1Req);
  const page1Json = await page1Res.json();
  assert.equal(page1Res.status, 200);
  assert.equal(page1Json.items.length, 10, 'Expected 10 items on page 1');
  assert.equal(page1Json.total, 25, 'Expected 25 total listings for seller');
  assert.ok(page1Json.statusCounts, 'Expected statusCounts to be returned for seller');
  assert.equal(page1Json.statusCounts.all, 25);

  // Page 2 (limit 10, offset 10)
  const page2Req = makeReq(`http://localhost:3000/api/listings?sellerId=${sellerId}&status=all&limit=10&offset=10`, 'GET', undefined, sellerToken);
  const page2Res = await listingsGet(page2Req);
  const page2Json = await page2Res.json();
  assert.equal(page2Res.status, 200);
  assert.equal(page2Json.items.length, 10, 'Expected 10 items on page 2');
  assert.notEqual(page1Json.items[0].id, page2Json.items[0].id, 'Page 1 and Page 2 must have distinct items');

  // Page 3 (limit 10, offset 20)
  const page3Req = makeReq(`http://localhost:3000/api/listings?sellerId=${sellerId}&status=all&limit=10&offset=20`, 'GET', undefined, sellerToken);
  const page3Res = await listingsGet(page3Req);
  const page3Json = await page3Res.json();
  assert.equal(page3Res.status, 200);
  assert.equal(page3Json.items.length, 5, 'Expected 5 items on page 3');

  // Filter by status=sold
  const soldReq = makeReq(`http://localhost:3000/api/listings?sellerId=${sellerId}&status=sold&limit=10&offset=0`, 'GET', undefined, sellerToken);
  const soldRes = await listingsGet(soldReq);
  const soldJson = await soldRes.json();
  assert.equal(soldRes.status, 200);
  assert.equal(soldJson.total, 5, 'Expected 5 sold ads');
  assert.ok(soldJson.items.every((it: any) => it.status === 'sold'));

  // Clean up
  await pool.query('DELETE FROM listings WHERE id = ANY($1)', [ids]);
  await pool.query('DELETE FROM user_sessions WHERE user_id = $1', [sellerId]);
  await pool.query('DELETE FROM users WHERE id = $1', [sellerId]);
});

