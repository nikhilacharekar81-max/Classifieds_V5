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

test('Finding 5: Unsubscribe authorization — Only owner or actual admin can unsubscribe', async () => {
  const unsubId = `usr_unsub_${Date.now()}`;
  const otherId = `usr_oth_${Date.now()}`;
  const modId = `usr_mod_${Date.now()}`;
  const adminId = `usr_adm_${Date.now()}`;

  const unsubEmail = `${unsubId}@example.com`;
  const otherEmail = `${otherId}@example.com`;

  const unsubToken = `tok_unsub_${Date.now()}`;
  const modToken = `tok_mod_${Date.now()}`;
  const adminToken = `tok_adm_${Date.now()}`;

  await pool.query(`
    INSERT INTO users (id, name, email, type, status, email_subscribed, email_verified, admin_role) VALUES
      ($1, 'Unsub User', $2, 'user', 'active', TRUE, TRUE, NULL),
      ($3, 'Other User', $4, 'user', 'active', TRUE, TRUE, NULL),
      ($5, 'Mod User', 'mod@example.com', 'user', 'active', TRUE, TRUE, 'moderator'),
      ($6, 'Admin User', 'adm@example.com', 'user', 'active', TRUE, TRUE, 'admin')
  `, [unsubId, unsubEmail, otherId, otherEmail, modId, adminId]);

  await pool.query(`
    INSERT INTO user_sessions (id, user_id, expires_at) VALUES
      ($1, $2, NOW() + INTERVAL '1 day'),
      ($3, $4, NOW() + INTERVAL '1 day'),
      ($5, $6, NOW() + INTERVAL '1 day')
  `, [unsubToken, unsubId, modToken, modId, adminToken, adminId]);

  try {
    // 1. Authenticated user CAN unsubscribe their own account
    const req1 = makeReq('http://localhost:3000/api/auth/unsubscribe', 'POST', {
      email: unsubEmail,
    }, unsubToken);
    const res1 = await unsubPost(req1);
    assert.equal(res1.status, 200);

    // 2. Moderator CANNOT unsubscribe another user's account
    const req2 = makeReq('http://localhost:3000/api/auth/unsubscribe', 'POST', {
      email: otherEmail,
    }, modToken);
    const res2 = await unsubPost(req2);
    assert.equal(res2.status, 403, 'Moderator cannot unsubscribe another user');

    // 3. Actual admin CAN unsubscribe another user's account
    const req3 = makeReq('http://localhost:3000/api/auth/unsubscribe', 'POST', {
      email: otherEmail,
    }, adminToken);
    const res3 = await unsubPost(req3);
    assert.equal(res3.status, 200, 'Admin can unsubscribe another user');
  } finally {
    await pool.query('DELETE FROM user_sessions WHERE user_id IN ($1, $2, $3, $4)', [unsubId, otherId, modId, adminId]);
    await pool.query('DELETE FROM users WHERE id IN ($1, $2, $3, $4)', [unsubId, otherId, modId, adminId]);
  }
});

test('Finding 6: Atomic database-level campaign claim prevents concurrent duplicate sends', async () => {
  const { emailRepository } = await import('../server/repositories/email.repository.ts');
  const campId = `camp_atomic_${Date.now()}`;

  await emailRepository.createCampaign({
    id: campId,
    title: 'Atomic Campaign',
    subject: 'Atomic Subject',
    contentHtml: '<p>Content</p>',
    targetAudience: 'all_subscribed',
    status: 'draft',
  });

  try {
    // First claim succeeds
    const claim1 = await emailRepository.claimCampaignForSending(campId);
    assert.ok(claim1, 'First claim should succeed and return campaign');
    assert.equal(claim1.status, 'sending');

    // Second concurrent claim fails (already claimed)
    const claim2 = await emailRepository.claimCampaignForSending(campId);
    assert.equal(claim2, null, 'Second claim must fail and return null');
  } finally {
    await pool.query('DELETE FROM newsletter_campaigns WHERE id = $1', [campId]);
  }
});

test('Finding 1 & 2: Individual listing permissions and free quota enforcement', async () => {
  const { POST: listingPost } = await import('../server/api/listings/route.ts');
  const { DELETE: listingDelete } = await import('../server/api/listings/[id]/route.ts');

  const sellerId = `usr_seller_q_${Date.now()}`;
  const supportId = `usr_support_q_${Date.now()}`;
  const adminId = `usr_admin_q_${Date.now()}`;

  const sellerToken = `tok_seller_q_${Date.now()}`;
  const supportToken = `tok_support_q_${Date.now()}`;
  const adminToken = `tok_admin_q_${Date.now()}`;

  await pool.query(`
    INSERT INTO users (id, name, email, phone, type, status, email_verified, admin_role) VALUES
      ($1, 'Seller Q', '${sellerId}@example.com', '+919876543210', 'user', 'active', TRUE, NULL),
      ($2, 'Support Q', '${supportId}@example.com', '+919876543211', 'user', 'active', TRUE, 'support_agent'),
      ($3, 'Admin Q', '${adminId}@example.com', '+919876543212', 'user', 'active', TRUE, 'admin')
  `, [sellerId, supportId, adminId]);

  await pool.query(`
    INSERT INTO user_sessions (id, user_id, expires_at) VALUES
      ($1, $2, NOW() + INTERVAL '1 day'),
      ($3, $4, NOW() + INTERVAL '1 day'),
      ($5, $6, NOW() + INTERVAL '1 day')
  `, [sellerToken, sellerId, supportToken, supportId, adminToken, adminId]);

  let createdListingId = '';

  try {
    // 1. Ordinary seller can create ad within free quota without supplying payment ID
    const postReq = makeReq('http://localhost:3000/api/listings', 'POST', {
      title: `Free Quota Listing ${Date.now()}`,
      description: 'Listing within free quota.',
      categoryId: 'cat_services',
      price: 500,
      location: { city: 'Mumbai', state: 'Maharashtra', locality: 'Bandra' },
      isFeatured: true, // Ordinary seller trying to feature for free
    }, sellerToken);

    const postRes = await listingPost(postReq);
    assert.equal(postRes.status, 201, 'Should create listing without payment within free quota');
    const postData = await postRes.json();
    createdListingId = postData.id;

    // Ordinary seller listing must be pending and NOT featured
    assert.equal(postData.status, 'pending', 'Ordinary seller ad must be pending');
    assert.equal(postData.isFeatured, false, 'Ordinary seller ad must not be auto-featured');

    // 2. Support agent CANNOT delete seller ad
    const delReqSupport = makeReq(`http://localhost:3000/api/listings/${createdListingId}`, 'DELETE', undefined, supportToken);
    const delResSupport = await listingDelete(delReqSupport, { params: Promise.resolve({ id: createdListingId }) });
    assert.equal(delResSupport.status, 403, 'Support agent cannot delete another user listing');

    // 3. Seller CAN delete their own ad
    const delReqOwner = makeReq(`http://localhost:3000/api/listings/${createdListingId}`, 'DELETE', undefined, sellerToken);
    const delResOwner = await listingDelete(delReqOwner, { params: Promise.resolve({ id: createdListingId }) });
    assert.equal(delResOwner.status, 200, 'Owner can delete their own listing');
  } finally {
    if (createdListingId) {
      await pool.query('DELETE FROM listings WHERE id = $1', [createdListingId]);
    }
    await pool.query('DELETE FROM user_sessions WHERE user_id IN ($1, $2, $3)', [sellerId, supportId, adminId]);
    await pool.query('DELETE FROM users WHERE id IN ($1, $2, $3)', [sellerId, supportId, adminId]);
  }
});

test('Finding 3 & 7: Payment verification and email audit attribution', async () => {
  const { listingService } = await import('../server/services/listing.service.ts');
  const { POST: testSmtpPost } = await import('../server/api/admin/email/test-smtp/route.ts');

  const adminId = `usr_adm_eml_${Date.now()}`;
  const adminToken = `tok_adm_eml_${Date.now()}`;

  await pool.query(`
    INSERT INTO users (id, name, email, phone, type, status, email_verified, admin_role) VALUES
      ($1, 'Admin Eml', '${adminId}@example.com', '+919876543213', 'user', 'active', TRUE, 'admin')
  `, [adminId]);

  await pool.query(`
    INSERT INTO user_sessions (id, user_id, expires_at) VALUES ($1, $2, NOW() + INTERVAL '1 day')
  `, [adminToken, adminId]);

  try {
    // 1. Finding 7: Unauthorized request must be rejected
    const unauthReq = makeReq('http://localhost:3000/api/admin/email/test-smtp', 'POST', {});
    const unauthRes = await testSmtpPost(unauthReq);
    assert.equal(unauthRes.status, 401, 'Unauthorized request must be rejected');

    // 2. Finding 3: Paid category requires posting order; zero-fee category does not
    const paidCatId = `cat_paid_${Date.now()}`;
    await pool.query(`
      INSERT INTO categories (id, name, slug, posting_fee, free_listings_quota)
      VALUES ($1, 'Paid Category', $2, 99.00, 0)
    `, [paidCatId, `paid-cat-${Date.now()}`]);

    // Zero fee category returns 400 (no fee required)
    const zeroOrderRes = await listingService.createPostingOrder({
      categoryId: 'cat_services',
      userId: adminId,
    });
    assert.equal(zeroOrderRes.success, false);
    assert.equal(zeroOrderRes.status, 400);

    // Paid category creates server-side order
    const orderRes = await listingService.createPostingOrder({
      categoryId: paidCatId,
      userId: adminId,
    });
    assert.equal(orderRes.success, true);
    assert.ok(orderRes.order?.orderId);
    assert.equal(orderRes.order.amount, 99);

    // Verify order was inserted into posting_orders
    const checkOrder = await pool.query('SELECT * FROM posting_orders WHERE order_id = $1', [orderRes.order.orderId]);
    assert.equal(checkOrder.rows.length, 1);
    assert.equal(checkOrder.rows[0].currency, 'INR');
    assert.equal(checkOrder.rows[0].status, 'pending');
    assert.equal(Number(checkOrder.rows[0].amount), 99);
  } finally {
    await pool.query('DELETE FROM posting_orders WHERE user_id = $1', [adminId]);
    await pool.query('DELETE FROM categories WHERE id LIKE $1', ['cat_paid_%']);
    await pool.query('DELETE FROM user_sessions WHERE user_id = $1', [adminId]);
    await pool.query('DELETE FROM users WHERE id = $1', [adminId]);
  }
});

test('Phase 3 (3.1, 3.2, 3.3): SSR status codes (404/410/200), noindex, #fragments, and AsyncLocalStorage requestCache', async () => {
  const { renderSsrPage } = await import('../src/entry-server.tsx');
  const { normalizeInternalUrl, parsePath } = await import('../lib/router/useRouter.ts');
  const { requestCache, runWithRequestCache, revalidateTag } = await import('../src/shims/next-cache.ts');
  const { REFERENCE_CACHE_TAGS } = await import('../server/cache/reference-data.cache.ts');

  // 3.2 Preserve #fragments in normalizeInternalUrl and parsePath
  assert.equal(normalizeInternalUrl('/mumbai/cars/?b=2&a=1#dealers'), '/mumbai/cars?a=1&b=2#dealers');
  assert.equal(normalizeInternalUrl('/my-account#kyc'), '/my-account#kyc');
  assert.equal(normalizeInternalUrl('#faq-section'), '/#faq-section');
  const parsedWithFrag = parsePath('/mumbai/cars?sort=price_asc#top-picks');
  assert.equal(parsedWithFrag.path, '/mumbai/cars');
  assert.equal(parsedWithFrag.query.sort, 'price_asc');
  assert.equal(parsedWithFrag.hash, '#top-picks');

  // 3.3 Request-scoped memoisation via AsyncLocalStorage
  let callCount = 0;
  const dedupedFn = requestCache(async (arg: string) => {
    callCount += 1;
    return `val_${arg}_${callCount}`;
  });
  await runWithRequestCache(async () => {
    const [r1, r2] = await Promise.all([dedupedFn('alpha'), dedupedFn('alpha')]);
    assert.equal(r1, r2);
    assert.equal(callCount, 1, 'Expected requestCache to deduplicate within the same request');
  });
  await runWithRequestCache(async () => {
    const r3 = await dedupedFn('alpha');
    assert.equal(r3, 'val_alpha_2');
    assert.equal(callCount, 2, 'Expected separate request context to execute anew');
  });

  // 3.1 Valid pages return 200 and index, follow
  const validHome = await renderSsrPage('/', {}, 'http://localhost:3000');
  assert.equal(validHome.statusCode, 200);
  assert.match(validHome.headTagsHtml, /content="index, follow/);

  // 3.1 Unknown routes and arbitrary slugs return 404 and noindex (no invented pages)
  const unknownSlug = await renderSsrPage('/totally-unknown-random-slug-xyz', {}, 'http://localhost:3000');
  assert.equal(unknownSlug.statusCode, 404);
  assert.match(unknownSlug.headTagsHtml, /content="noindex, nofollow"/);

  const fakeCityGeo = await renderSsrPage('/nonexistentcity_g999999', {}, 'http://localhost:3000');
  assert.equal(fakeCityGeo.statusCode, 404);
  assert.match(fakeCityGeo.headTagsHtml, /content="noindex, nofollow"/);

  const unknownSubSlug = await renderSsrPage('/mumbai/nonexistent-category-xyz', {}, 'http://localhost:3000');
  assert.equal(unknownSubSlug.statusCode, 404);
  assert.match(unknownSubSlug.headTagsHtml, /content="noindex, nofollow"/);

  // 3.1 Unknown listing returns 404 + noindex
  const missingListing = await renderSsrPage('/item/lst_nonexistent_99999999', {}, 'http://localhost:3000');
  assert.equal(missingListing.statusCode, 404);
  assert.match(missingListing.headTagsHtml, /content="noindex, nofollow"/);

  // 3.1 Expired listing returns 410 Gone + noindex
  const sellerId = `usr_p3_${Date.now()}`;
  const expAdId = `lst_p3_exp_${Date.now()}`;
  await pool.query(
    `INSERT INTO users (id, name, email, type, status, email_verified) VALUES ($1, 'P3 Seller', $2, 'user', 'active', TRUE)`,
    [sellerId, `${sellerId}@example.com`]
  );
  await pool.query(
    `INSERT INTO listings (id, seller_id, seller_name, category_id, title, description, price, city, state, locality, status, expires_at)
     VALUES ($1, $2, 'P3 Seller', 'cat_cars', 'Expired SSR Ad', 'Desc', 1000, 'Mumbai', 'Maharashtra', 'Bandra', 'expired', NOW() - INTERVAL '2 days')`,
    [expAdId, sellerId]
  );
  await revalidateTag(REFERENCE_CACHE_TAGS.LISTING_COUNTS);

  try {
    const expiredSsr = await renderSsrPage(`/item/${expAdId}`, {}, 'http://localhost:3000');
    assert.equal(expiredSsr.statusCode, 410, 'Expired listing SSR must return HTTP 410 Gone');
    assert.match(expiredSsr.headTagsHtml, /content="noindex, nofollow"/);
  } finally {
    await pool.query('DELETE FROM listings WHERE id = $1', [expAdId]);
    await pool.query('DELETE FROM users WHERE id = $1', [sellerId]);
  }

  // 3.1 Admin, account, post, and search-query pages return 200 with noindex, nofollow
  for (const [pathStr, q] of [
    ['/admin/dashboard', {}],
    ['/my-account', {}],
    ['/post', {}],
    ['/search', { q: 'iphone' }],
    ['/mumbai/cars', { q: 'honda' }],
  ] as const) {
    const res = await renderSsrPage(pathStr, q as Record<string, string>, 'http://localhost:3000');
    assert.equal(res.statusCode, 200, `Expected 200 for ${pathStr}`);
    assert.match(res.headTagsHtml, /content="noindex, nofollow"/, `Expected noindex for ${pathStr}`);
  }
});

test('Four-Phase Remaining Findings: Profile self-edit, KYC admin restriction, category integrity, settings validation, and quota/paidFeatures defaults', async () => {
  const { NextRequest } = await import('../src/shims/next-server.ts');
  const { PUT: putAccount } = await import('../server/api/user/account/route.ts');
  const { POST: postAdminUsers } = await import('../server/api/admin/users/route.ts');
  const { DELETE: deleteCategoryRoute } = await import('../server/api/admin/categories/[id]/route.ts');
  const { PUT: putSettingsRoute } = await import('../server/api/admin/settings/route.ts');
  const { adminRepository } = await import('../server/repositories/admin.repository.ts');
  const { listingService } = await import('../server/services/listing.service.ts');
  const { listingRepository } = await import('../server/repositories/listing.repository.ts');

  const sellerId = `usr_fp_${Date.now()}`;
  const supportId = `usr_fp_sup_${Date.now()}`;
  const adminId = `usr_fp_adm_${Date.now()}`;
  const sellerTok = `tok_fp_${Date.now()}`;
  const supportTok = `tok_fp_sup_${Date.now()}`;
  const adminTok = `tok_fp_adm_${Date.now()}`;
  const inactiveCatId = `cat_inactive_${Date.now()}`;
  const adId = `lst_fp_${Date.now()}`;

  await pool.query(
    `INSERT INTO users (id, name, email, phone, type, status, admin_role, email_verified) VALUES
      ($1, 'Original Seller', $2, '9876543210', 'user', 'active', NULL, TRUE),
      ($3, 'Support Staff', $4, '9876543211', 'user', 'active', 'support_agent', TRUE),
      ($5, 'Site Admin', $6, '9876543212', 'user', 'active', 'admin', TRUE)`,
    [sellerId, `${sellerId}@example.com`, supportId, `${supportId}@example.com`, adminId, `${adminId}@example.com`]
  );
  await pool.query(
    `INSERT INTO user_sessions (id, user_id, expires_at) VALUES
      ($1, $2, NOW() + INTERVAL '1 day'),
      ($3, $4, NOW() + INTERVAL '1 day'),
      ($5, $6, NOW() + INTERVAL '1 day')`,
    [sellerTok, sellerId, supportTok, supportId, adminTok, adminId]
  );
  await pool.query(
    `INSERT INTO categories (id, name, slug, icon, is_active, order_index) VALUES ($1, 'Inactive Dept', $2, 'Package', FALSE, 99)`,
    [inactiveCatId, `inactive-dept-${Date.now()}`]
  );
  await pool.query(
    `INSERT INTO listings (id, seller_id, seller_name, seller_phone, category_id, title, description, price, city, state, locality, status, expires_at)
     VALUES ($1, $2, 'Original Seller', '9876543210', 'cat_cars', 'Active Pending Ad', 'Desc', 5000, 'Mumbai', 'Maharashtra', 'Andheri', 'pending', NOW() + INTERVAL '10 days')`,
    [adId, sellerId]
  );

  try {
    // 1. PUT /api/user/account updates own profile & propagates seller name/phone to listings, while blocking privileged fields
    const forbiddenReq = makeReq('http://localhost:3000/api/user/account', 'PUT', {
      name: 'Hacked',
      kycStatus: 'verified',
    }, sellerTok);
    const forbiddenRes = await putAccount(forbiddenReq);
    assert.equal(forbiddenRes.status, 403, 'Modifying kycStatus on /api/user/account must be rejected with 403');

    const validProfileReq = makeReq('http://localhost:3000/api/user/account', 'PUT', {
      name: 'Updated Seller Name',
      phone: '+919988776655',
      location: { city: 'Pune', state: 'Maharashtra' },
    }, sellerTok);
    const validProfileRes = await putAccount(validProfileReq);
    assert.equal(validProfileRes.status, 200);
    const updatedListingRow = await pool.query('SELECT seller_name, seller_phone FROM listings WHERE id = $1', [adId]);
    assert.equal(updatedListingRow.rows[0].seller_name, 'Updated Seller Name');
    assert.equal(updatedListingRow.rows[0].seller_phone, '+919988776655');

    // 2. Support agent cannot verify KYC (restricted to actual admin/super_admin)
    const supKycReq = makeReq('http://localhost:3000/api/admin/users', 'POST', {
      action: 'verify_kyc',
      userId: sellerId,
      status: 'verified',
    }, supportTok);
    const supKycRes = await postAdminUsers(supKycReq);
    assert.equal(supKycRes.status, 403, 'Support agent must be blocked from verifying KYC');

    // 3. Inactive category rejected when creating a listing
    const inactiveCreateRes = await listingService.createListing(
      {
        title: 'Test Inactive Cat Ad',
        description: 'Valid description for inactive category check',
        categoryId: inactiveCatId,
        price: 100,
        location: { city: 'Mumbai', state: 'Maharashtra', locality: 'Bandra' },
        sellerId,
        sellerName: 'Updated Seller Name',
        sellerPhone: '+919988776655',
      } as any,
      sellerId
    );
    assert.equal(inactiveCreateRes.success, false);
    assert.equal(inactiveCreateRes.status, 400);

    // 4. Deleting a category with listings returns HTTP 409 Conflict (not 500 ReferenceError)
    const delCatReq = makeReq('http://localhost:3000/api/admin/categories/cat_cars', 'DELETE', undefined, adminTok);
    const delCatRes = await deleteCategoryRoute(delCatReq, { params: Promise.resolve({ id: 'cat_cars' }) });
    assert.equal(delCatRes.status, 409, 'Deleting a category with listings must return 409 Conflict');

    // 5. Settings validation rejects invalid values with 400 and paidFeatures defaults are always complete
    const badSettingsReq = makeReq('http://localhost:3000/api/admin/settings', 'PUT', {
      listingDurationDays: -5,
    }, adminTok);
    const badSettingsRes = await putSettingsRoute(badSettingsReq);
    assert.equal(badSettingsRes.status, 400, 'Invalid settings must return HTTP 400');

    const sysSettings = await adminRepository.getSystemSettingsDirect();
    assert.equal(typeof sysSettings.paidFeatures?.masterMonetizationEnabled, 'boolean');
    assert.equal(typeof sysSettings.paidFeatures?.freeListingsLimit, 'number');

    // 6. getSellerStatusCounts includes activeQuotaCount (approved + pending non-expired)
    const counts = await listingRepository.getSellerStatusCounts(sellerId);
    assert.equal(counts.activeQuotaCount, 1);
  } finally {
    await pool.query('DELETE FROM listings WHERE id = $1', [adId]);
    await pool.query('DELETE FROM categories WHERE id = $1', [inactiveCatId]);
    await pool.query('DELETE FROM user_sessions WHERE user_id IN ($1, $2, $3)', [sellerId, supportId, adminId]);
    await pool.query('DELETE FROM users WHERE id IN ($1, $2, $3)', [sellerId, supportId, adminId]);
  }
});




