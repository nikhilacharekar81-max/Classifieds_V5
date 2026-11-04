import test from 'node:test';
import assert from 'node:assert/strict';
import { pool } from '../src/db/index.ts';
import { categoryRepository } from '../server/repositories/category.repository.ts';
import { listingRepository } from '../server/repositories/listing.repository.ts';
import { adminRepository } from '../server/repositories/admin.repository.ts';
import { listingService } from '../server/services/listing.service.ts';
import {
  getCategoriesWithLiveCounts,
  invalidateLiveListingCountsCache,
  REFERENCE_CACHE_TAGS,
} from '../server/cache/reference-data.cache.ts';
import { renderSsrPage } from '../src/entry-server.tsx';

test('PostgreSQL connection and schema tables verification', async () => {
  const connRes = await pool.query('SELECT current_database() AS db');
  assert.equal(connRes.rows.length, 1);
  assert.ok(connRes.rows[0].db);

  const tablesRes = await pool.query(`
    SELECT table_name
    FROM information_schema.tables
    WHERE table_schema = 'public'
    ORDER BY table_name
  `);
  const tableNames = tablesRes.rows.map((r) => r.table_name);
  assert.ok(tableNames.includes('users'));
  assert.ok(tableNames.includes('listings'));
  assert.ok(tableNames.includes('categories'));
  assert.ok(tableNames.includes('locations'));
  assert.ok(tableNames.includes('boost_packages'));
  assert.ok(tableNames.includes('system_settings'));
  assert.ok(tableNames.includes('cache_invalidation_outbox'));
});

test('PostgreSQL repositories, pagination, and reference cache verification', async () => {
  const [categories, settings, marketplace] = await Promise.all([
    categoryRepository.findAll(),
    adminRepository.getSystemSettings(),
    listingRepository.findMarketplaceListings({ status: 'approved', limit: 20 }),
  ]);

  assert.ok(categories.length >= 10, 'Expected at least 10 categories in PostgreSQL');
  assert.equal(settings.siteName, 'Chillyads');
  assert.ok(marketplace.items.length > 0, 'Expected approved listings in PostgreSQL');
  assert.ok(marketplace.total >= marketplace.items.length);

  // Verify 50-item PostgreSQL pagination
  const page1 = await listingService.getPaginatedPageListings({
    query: { page: '1' },
    pageSize: 50,
  });
  assert.equal(page1.page, 1);
  assert.equal(page1.pageSize, 50);
  assert.ok(page1.items.length <= 50);
  assert.ok(page1.total >= page1.items.length);

  const page2 = await listingService.getPaginatedPageListings({
    query: { page: '2' },
    pageSize: 50,
  });
  assert.equal(page2.page, 2);
  assert.ok(page2.items.length <= 50);

  // Verify tag-based cache and PostgreSQL cache_invalidation_outbox
  const cachedCats = await getCategoriesWithLiveCounts();
  assert.ok(cachedCats.length >= 10);
  await invalidateLiveListingCountsCache();

  const outboxRes = await pool.query(
    'SELECT tag, status FROM cache_invalidation_outbox WHERE tag = $1',
    [REFERENCE_CACHE_TAGS.LISTING_COUNTS]
  );
  assert.equal(outboxRes.rows.length, 1);
  assert.equal(outboxRes.rows[0].status, 'completed');
});

test('Full HTML SSR pre-renders PostgreSQL content and scopes client-side ads per route', async () => {
  // 1. Home Directory Route: strictly 10 slim latest ads stored on client side
  const homeSsr = await renderSsrPage('/', {}, 'http://localhost:3000');
  assert.ok(homeSsr.appHtml.includes('Explore Marketplace Categories'));
  assert.ok(homeSsr.headTagsHtml.includes('rel="canonical"'));
  assert.ok(homeSsr.headTagsHtml.includes('application/ld+json'));
  assert.equal(homeSsr.ssrProps.initialListings?.length, 10);

  // 2. Category Route: paginated <= 50 slim cards
  const cityCatSsr = await renderSsrPage('/mumbai/cars', {}, 'http://localhost:3000');
  assert.ok(cityCatSsr.pageTitle.includes('Mumbai'));
  assert.ok(cityCatSsr.appHtml.includes('Cars in Mumbai'));
  assert.ok((cityCatSsr.ssrProps.initialListings?.length || 0) <= 50);

  // 3. Search Route Page 2: paginated <= 50 slim cards
  const searchPage2Ssr = await renderSsrPage('/search', { page: '2' }, 'http://localhost:3000');
  assert.equal(searchPage2Ssr.ssrProps.initialPage, 2);
  assert.ok((searchPage2Ssr.ssrProps.initialListings?.length || 0) <= 50);

  // 4. Listing Detail Route: 1 detail listing + up to 4 related slim cards
  const sampleId = homeSsr.ssrProps.initialListings?.[0]?.id;
  if (sampleId) {
    const detailSsr = await renderSsrPage(`/item/${sampleId}`, {}, 'http://localhost:3000');
    assert.equal(detailSsr.ssrProps.initialListing?.id, sampleId);
    assert.ok((detailSsr.ssrProps.initialListings?.length || 0) <= 4);
  }
});

test('Production startup strictly blocks demo user and listing seeding even if called directly', async () => {
  const {
    seedDemoData,
    ensureDatabaseSeeded,
    seedDevelopmentDatabase,
    seedPostgres,
  } = await import('../server/seed-postgres.ts');

  const prevEnv = process.env.NODE_ENV;
  try {
    process.env.NODE_ENV = 'production';

    await assert.rejects(
      async () => {
        await (seedDemoData as any)(undefined, { allowInProduction: true });
      },
      /Demo data seeding is disabled in production/
    );

    await assert.rejects(
      async () => {
        await ensureDatabaseSeeded({ includeDemoData: true });
      },
      /Demo data seeding is disabled in production/
    );

    await assert.rejects(
      async () => {
        await seedDevelopmentDatabase();
      },
      /seedDevelopmentDatabase cannot be run in production/
    );

    await assert.rejects(
      async () => {
        await seedPostgres({ includeDemoData: true });
      },
      /Demo data seeding is disabled in production/
    );

    // Essential reference initialization succeeds in production without demo seeding
    await ensureDatabaseSeeded();
  } finally {
    process.env.NODE_ENV = prevEnv;
    await pool.end();
  }
});
