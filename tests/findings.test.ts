import test from 'node:test';
import assert from 'node:assert/strict';
import { pool } from '../src/db/index.ts';
import { listingRepository } from '../server/repositories/listing.repository.ts';
import { POST as bulkActionPost } from '../server/api/listings/bulk-action/route.ts';
import { PUT as listingIdPut } from '../server/api/listings/[id]/route.ts';
import { GET as listingsGet } from '../server/api/listings/route.ts';
import { POST as impersonatePost } from '../server/api/admin/impersonate/route.ts';
import { PUT as userPut } from '../server/api/admin/users/[id]/route.ts';
import { POST as unsubPost } from '../server/api/auth/unsubscribe/route.ts';

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
    INSERT INTO users (id, name, email, type, status, admin_role, email_verified) VALUES
      ($1, 'Test Seller', '${sellerId}@example.com', 'user', 'active', NULL, TRUE),
      ($2, 'Other Seller', '${otherSellerId}@example.com', 'user', 'active', NULL, TRUE),
      ($3, 'Test Admin', '${adminId}@example.com', 'user', 'active', 'admin', TRUE),
      ($4, 'Test Mod', '${modId}@example.com', 'user', 'active', 'moderator', TRUE)
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
    INSERT INTO users (id, name, email, type, status, admin_role, email_verified) VALUES
      ($1, 'F3 Seller', '${sellerId}@example.com', 'user', 'active', NULL, TRUE),
      ($2, 'F3 Moderator', '${modId}@example.com', 'user', 'active', 'moderator', TRUE),
      ($3, 'F3 Admin', '${adminId}@example.com', 'user', 'active', 'admin', TRUE)
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
    INSERT INTO users (id, name, email, type, status, admin_role, email_verified) VALUES
      ($1, 'Seller F4', '${sellerId}@example.com', 'user', 'active', NULL, TRUE),
      ($2, 'Other F4', '${otherSellerId}@example.com', 'user', 'active', NULL, TRUE),
      ($3, 'Admin F4', '${adminId}@example.com', 'user', 'active', 'admin', TRUE)
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
    INSERT INTO users (id, name, email, type, status, admin_role, email_verified) VALUES
      ($1, 'Fix1 Seller', '${sellerId}@example.com', 'user', 'active', NULL, TRUE),
      ($2, 'Fix1 Admin', '${adminId}@example.com', 'user', 'active', 'admin', TRUE)
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
  const totalCount = 251;
  const ids: string[] = [];
  const baseTime = Date.now();

  await pool.query(`
    INSERT INTO users (id, name, email, type, status, admin_role, email_verified) VALUES
      ($1, 'Fix2 Seller', '${sellerId}@example.com', 'user', 'active', NULL, TRUE)
  `, [sellerId]);

  await pool.query(`
    INSERT INTO user_sessions (id, user_id, expires_at) VALUES
      ($1, $2, NOW() + INTERVAL '1 day')
  `, [sellerToken, sellerId]);

  try {
    // Bulk insert 251 listings with deterministic descending createdAt timestamps
    const valuesClauses: string[] = [];
    const queryParams: any[] = [];
    let paramIdx = 1;

    for (let i = 0; i < totalCount; i++) {
      const id = `lst_pg_${i}_${baseTime}`;
      ids.push(id);
      const status = i % 5 === 0 ? 'approved' : i % 5 === 1 ? 'pending' : i % 5 === 2 ? 'sold' : i % 5 === 3 ? 'expired' : 'rejected';
      const createdAt = new Date(baseTime - i * 1000);
      const expiresAt = new Date(baseTime + 30 * 24 * 3600 * 1000);

      valuesClauses.push(`($${paramIdx}, $${paramIdx+1}, 'Fix2 Seller', 'cat_cars', $${paramIdx+2}, 'Description', 1000, 'Mumbai', 'Maharashtra', 'Loc', $${paramIdx+3}, $${paramIdx+4}, $${paramIdx+5})`);
      queryParams.push(id, sellerId, `Seller Ad ${i}`, status, expiresAt, createdAt);
      paramIdx += 6;
    }

    await pool.query(`
      INSERT INTO listings (id, seller_id, seller_name, category_id, title, description, price, city, state, locality, status, expires_at, created_at)
      VALUES ${valuesClauses.join(', ')}
    `, queryParams);

    // Verify unauthenticated caller is restricted to approved listings only (authorization preservation)
    const unauthReq = makeReq(`http://localhost:3000/api/listings?sellerId=${sellerId}&status=all&limit=10&offset=0`, 'GET');
    const unauthRes = await listingsGet(unauthReq);
    const unauthJson = await unauthRes.json();
    assert.equal(unauthRes.status, 200);
    assert.ok(unauthJson.total < totalCount, 'Unauthenticated caller must not see all statuses');
    assert.ok(unauthJson.items.every((it: any) => it.status === 'approved'), 'Unauthenticated caller only sees approved listings');

    // 1. The API reports the correct total of 251 listings for authenticated owner
    const page1Req = makeReq(`http://localhost:3000/api/listings?sellerId=${sellerId}&status=all&limit=10&offset=0`, 'GET', undefined, sellerToken);
    const page1Res = await listingsGet(page1Req);
    const page1Json = await page1Res.json();
    assert.equal(page1Res.status, 200);
    assert.equal(page1Json.total, 251, 'The API reports the correct total of 251 listings');
    assert.ok(page1Json.statusCounts, 'Expected statusCounts to be returned for seller');
    assert.equal(page1Json.statusCounts.all, 251);

    // 2. Page 1 returns the expected first 10 listings
    assert.equal(page1Json.items.length, 10, 'Page 1 returns the expected first 10 listings');
    assert.deepEqual(page1Json.items.map((it: any) => it.id), ids.slice(0, 10), 'Page 1 must match the first 10 inserted listings');

    // 3. Page 20 returns the expected 10 listings (offset = 190)
    const page20Req = makeReq(`http://localhost:3000/api/listings?sellerId=${sellerId}&status=all&limit=10&offset=190`, 'GET', undefined, sellerToken);
    const page20Res = await listingsGet(page20Req);
    const page20Json = await page20Res.json();
    assert.equal(page20Res.status, 200);
    assert.equal(page20Json.items.length, 10, 'Page 20 returns the expected 10 listings');
    assert.deepEqual(page20Json.items.map((it: any) => it.id), ids.slice(190, 200), 'Page 20 must match listings 191 to 200');

    // Page 21 returns the expected listings beyond 200 items (offset = 200)
    const page21Req = makeReq(`http://localhost:3000/api/listings?sellerId=${sellerId}&status=all&limit=10&offset=200`, 'GET', undefined, sellerToken);
    const page21Res = await listingsGet(page21Req);
    const page21Json = await page21Res.json();
    assert.equal(page21Res.status, 200);
    assert.equal(page21Json.items.length, 10, 'Page 21 returns expected listings beyond 200 ceiling');
    assert.deepEqual(page21Json.items.map((it: any) => it.id), ids.slice(200, 210), 'Page 21 must match listings 201 to 210');

    // 4. Final page (offset = 250) returns the remaining listing
    const lastPageReq = makeReq(`http://localhost:3000/api/listings?sellerId=${sellerId}&status=all&limit=10&offset=250`, 'GET', undefined, sellerToken);
    const lastPageRes = await listingsGet(lastPageReq);
    const lastPageJson = await lastPageRes.json();
    assert.equal(lastPageRes.status, 200);
    assert.equal(lastPageJson.items.length, 1, 'Page 21/26 final page returns the remaining listing');
    assert.equal(lastPageJson.items[0].id, ids[250], 'Final page must return the 251st listing');

    // Iterate through all pages to verify 5, 6, and 7
    const totalPages = Math.ceil(totalCount / 10); // 26 pages
    const allFetchedIds: string[] = [];
    const idSet = new Set<string>();
    let hasDuplicate = false;

    for (let page = 1; page <= totalPages; page++) {
      const offset = (page - 1) * 10;
      const req = makeReq(`http://localhost:3000/api/listings?sellerId=${sellerId}&status=all&limit=10&offset=${offset}`, 'GET', undefined, sellerToken);
      const res = await listingsGet(req);
      const data = await res.json();
      for (const item of data.items) {
        if (idSet.has(item.id)) {
          hasDuplicate = true;
        }
        idSet.add(item.id);
        allFetchedIds.push(item.id);
      }
    }

    // 5. All pages together contain exactly 251 distinct listing IDs
    assert.equal(idSet.size, 251, 'All pages together contain exactly 251 distinct listing IDs');

    // 6. There are no duplicate IDs across pages
    assert.equal(hasDuplicate, false, 'There are no duplicate IDs across pages');
    assert.equal(allFetchedIds.length, 251, 'Total fetched count across all pages must equal 251');

    // 7. No listing is missing
    const missingIds = ids.filter((id) => !idSet.has(id));
    assert.equal(missingIds.length, 0, 'No listing is missing');
  } finally {
    // Reliable cleanup even on assertion failure
    await pool.query('DELETE FROM listings WHERE seller_id = $1', [sellerId]);
    await pool.query('DELETE FROM user_sessions WHERE user_id = $1', [sellerId]);
    await pool.query('DELETE FROM users WHERE id = $1', [sellerId]);
  }
});

test('ORM Safety: Compound tautology expressions in UPDATE/DELETE are strictly rejected', async () => {
  const { db } = await import('../src/db/index.ts');
  const schema = await import('../src/db/schema.ts');
  const { sql } = await import('../src/db/pg-orm.ts');

  // Direct tautologies
  await assert.rejects(
    async () => {
      await db.delete(schema.users).where(sql`1 = 1`);
    },
    /ORM Safety: DELETE query has unrestricted \.where\(\)/
  );

  // Compound unrestricted expressions: id = 'some-id' OR 1 = 1
  await assert.rejects(
    async () => {
      await db.delete(schema.users).where(sql`id = 'some-id' OR 1 = 1`);
    },
    /ORM Safety: DELETE query has unrestricted compound \.where\(\)/
  );

  // Compound unrestricted in UPDATE
  await assert.rejects(
    async () => {
      await db.update(schema.users).set({ status: 'active' }).where(sql`id = 'x' OR true`);
    },
    /ORM Safety: UPDATE query has unrestricted compound \.where\(\)/
  );
});

test('Authorization: Support agents cannot impersonate and cannot alter restricted user fields', async () => {
  const supportId = `usr_sup_${Date.now()}`;
  const targetId = `usr_tgt_${Date.now()}`;
  const supportToken = `tok_sup_${Date.now()}`;

  await pool.query(`
    INSERT INTO users (id, name, email, type, status, admin_role, email_verified) VALUES
      ($1, 'Support Agent', '${supportId}@example.com', 'user', 'active', 'support_agent', TRUE),
      ($2, 'Target User', '${targetId}@example.com', 'user', 'active', NULL, TRUE)
  `, [supportId, targetId]);

  await pool.query(`
    INSERT INTO user_sessions (id, user_id, expires_at) VALUES ($1, $2, NOW() + INTERVAL '1 day')
  `, [supportToken, supportId]);

  try {
    const { getAuthenticatedUser } = await import('../lib/auth/session.ts');

    // 1. Support agent attempting to impersonate must return 403 Forbidden
    const impReq = makeReq('http://localhost:3000/api/admin/impersonate', 'POST', {
      action: 'start',
      userId: targetId,
    }, supportToken);
    (impReq as any).auth = await getAuthenticatedUser(impReq);
    const impRes = await impersonatePost(impReq);
    assert.equal(impRes.status, 403, 'Support agent must not be able to initiate impersonation');

    // 2. Support agent attempting to alter kycStatus must return 403 Forbidden
    const kycReq = makeReq(`http://localhost:3000/api/admin/users/${targetId}`, 'PUT', {
      kycStatus: 'verified',
    }, supportToken);
    (kycReq as any).auth = await getAuthenticatedUser(kycReq);
    const kycRes = await userPut(kycReq, { params: Promise.resolve({ id: targetId }) });
    assert.equal(kycRes.status, 403, 'Support agent must not be able to alter kycStatus');

    // 3. Support agent attempting to alter account status must return 403 Forbidden
    const statusReq = makeReq(`http://localhost:3000/api/admin/users/${targetId}`, 'PUT', {
      status: 'banned',
    }, supportToken);
    (statusReq as any).auth = await getAuthenticatedUser(statusReq);
    const statusRes = await userPut(statusReq, { params: Promise.resolve({ id: targetId }) });
    assert.equal(statusRes.status, 403, 'Support agent must not be able to alter user status');
  } finally {
    await pool.query('DELETE FROM user_sessions WHERE user_id IN ($1, $2)', [supportId, targetId]);
    await pool.query('DELETE FROM users WHERE id IN ($1, $2)', [supportId, targetId]);
  }
});

test('Unsubscribe POST: Authenticated user can unsubscribe their own account', async () => {
  const unsubId = `usr_unsub_${Date.now()}`;
  const unsubEmail = `${unsubId}@example.com`;
  const unsubToken = `tok_unsub_${Date.now()}`;

  await pool.query(`
    INSERT INTO users (id, name, email, type, status, email_subscribed, email_verified) VALUES
      ($1, 'Unsub User', $2, 'user', 'active', TRUE, TRUE)
  `, [unsubId, unsubEmail]);

  await pool.query(`
    INSERT INTO user_sessions (id, user_id, expires_at) VALUES ($1, $2, NOW() + INTERVAL '1 day')
  `, [unsubToken, unsubId]);

  try {
    const req = makeReq('http://localhost:3000/api/auth/unsubscribe', 'POST', {
      email: unsubEmail,
    }, unsubToken);

    const res = await unsubPost(req);
    assert.equal(res.status, 200);

    const check = await pool.query('SELECT email_subscribed FROM users WHERE id = $1', [unsubId]);
    assert.equal(check.rows[0].email_subscribed, false);
  } finally {
    await pool.query('DELETE FROM user_sessions WHERE user_id = $1', [unsubId]);
    await pool.query('DELETE FROM users WHERE id = $1', [unsubId]);
  }
});


