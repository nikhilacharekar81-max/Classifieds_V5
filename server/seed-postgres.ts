import { db } from '@/src/db/index';
import * as schema from '@/src/db/schema';
import { eq, inArray, sql } from '@/src/db/pg-orm';
import { hashPassword } from '@/lib/auth/password';
import {
  INITIAL_CATEGORIES,
  INITIAL_CUSTOM_FIELDS,
  INITIAL_LOCATIONS,
  INITIAL_USERS,
  INITIAL_ADMINS,
  INITIAL_LISTINGS,
  INITIAL_MODERATION_RULES,
  INITIAL_PACKAGES,
  INITIAL_SETTINGS,
  INITIAL_EMAIL_TEMPLATES,
  INITIAL_CMS_PAGES,
} from '@/lib/data/initialData';
import { seedCategoriesWithTenAds } from '@/lib/data/listingsSeeder';

export type SeedDbExecutor = Pick<typeof db, 'insert' | 'select' | 'update' | 'delete' | 'execute'>;

export const INITIALIZATION_MARKER_ID = 'init_complete_v3';
const ADVISORY_LOCK_KEY_1 = 20261103;
const ADVISORY_LOCK_KEY_2 = 1;

declare global {
  var _isDatabaseInitialized: boolean | undefined;
  var _activeSeedPromise: Promise<void> | undefined;
}

export function isDatabaseInitialized(): boolean {
  return Boolean(globalThis._isDatabaseInitialized);
}

export function resetDatabaseInitializationStateForTesting(): void {
  globalThis._isDatabaseInitialized = false;
  globalThis._activeSeedPromise = undefined;
}

function chunkArray<T>(items: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < items.length; i += size) {
    chunks.push(items.slice(i, i + size));
  }
  return chunks;
}

const validCategoryIds = new Set(INITIAL_CATEGORIES.map((c) => c.id));

function resolveCategoryId(rawId: string): string {
  let id = rawId;
  if (id === 'cat_vehicles') id = 'cat_cars';
  if (id === 'cat_buy_and_sell') id = 'cat_electronics';
  if (id === 'cat_pets_animals') id = 'cat_pets';
  if (!validCategoryIds.has(id)) return 'cat_electronics';
  return id;
}

const REQUIRED_SETTING_IDS = ['primary', INITIALIZATION_MARKER_ID];
const REQUIRED_CATEGORY_IDS = Array.from(new Set(INITIAL_CATEGORIES.map((c) => c.id)));
const REQUIRED_CUSTOM_FIELD_IDS = Array.from(new Set(INITIAL_CUSTOM_FIELDS.map((f) => f.id)));
const REQUIRED_LOCATION_IDS = Array.from(new Set(INITIAL_LOCATIONS.map((l) => l.id)));
const REQUIRED_PACKAGE_IDS = Array.from(new Set(INITIAL_PACKAGES.map((p) => p.id)));
const REQUIRED_MODERATION_RULE_IDS = Array.from(new Set(INITIAL_MODERATION_RULES.map((r) => r.id)));
const REQUIRED_EMAIL_TEMPLATE_IDS = Array.from(new Set(INITIAL_EMAIL_TEMPLATES.map((t) => t.id)));
const REQUIRED_CMS_PAGE_SLUGS = Array.from(new Set(INITIAL_CMS_PAGES.map((p) => p.slug)));

/**
 * Checks whether the database has completed all essential production initialization steps.
 * Verifies the actual required essential records (by primary/unique key) across all reference tables
 * populated by `seedEssentialProductionData()`, rather than relying on approximate row counts.
 */
export async function checkIsFullyInitialized(executor: SeedDbExecutor = db): Promise<boolean> {
  const settingsCountRes = await executor
    .select({ count: sql<number>`count(*)::int` })
    .from(schema.systemSettings)
    .where(inArray(schema.systemSettings.id, REQUIRED_SETTING_IDS));
  if (Number(settingsCountRes[0]?.count || 0) !== REQUIRED_SETTING_IDS.length) {
    return false;
  }

  const categoryCountRes = await executor
    .select({ count: sql<number>`count(*)::int` })
    .from(schema.categories)
    .where(inArray(schema.categories.id, REQUIRED_CATEGORY_IDS));
  if (Number(categoryCountRes[0]?.count || 0) !== REQUIRED_CATEGORY_IDS.length) {
    return false;
  }

  const customFieldCountRes = await executor
    .select({ count: sql<number>`count(*)::int` })
    .from(schema.categoryCustomFields)
    .where(inArray(schema.categoryCustomFields.id, REQUIRED_CUSTOM_FIELD_IDS));
  if (Number(customFieldCountRes[0]?.count || 0) !== REQUIRED_CUSTOM_FIELD_IDS.length) {
    return false;
  }

  const locationCountRes = await executor
    .select({ count: sql<number>`count(*)::int` })
    .from(schema.locations)
    .where(inArray(schema.locations.id, REQUIRED_LOCATION_IDS));
  if (Number(locationCountRes[0]?.count || 0) !== REQUIRED_LOCATION_IDS.length) {
    return false;
  }

  const packageCountRes = await executor
    .select({ count: sql<number>`count(*)::int` })
    .from(schema.boostPackages)
    .where(inArray(schema.boostPackages.id, REQUIRED_PACKAGE_IDS));
  if (Number(packageCountRes[0]?.count || 0) !== REQUIRED_PACKAGE_IDS.length) {
    return false;
  }

  const moderationRuleCountRes = await executor
    .select({ count: sql<number>`count(*)::int` })
    .from(schema.moderationRules)
    .where(inArray(schema.moderationRules.id, REQUIRED_MODERATION_RULE_IDS));
  if (Number(moderationRuleCountRes[0]?.count || 0) !== REQUIRED_MODERATION_RULE_IDS.length) {
    return false;
  }

  const emailTemplateCountRes = await executor
    .select({ count: sql<number>`count(*)::int` })
    .from(schema.emailTemplates)
    .where(inArray(schema.emailTemplates.id, REQUIRED_EMAIL_TEMPLATE_IDS));
  if (Number(emailTemplateCountRes[0]?.count || 0) !== REQUIRED_EMAIL_TEMPLATE_IDS.length) {
    return false;
  }

  const cmsPageCountRes = await executor
    .select({ count: sql<number>`count(*)::int` })
    .from(schema.cmsPages)
    .where(inArray(schema.cmsPages.slug, REQUIRED_CMS_PAGE_SLUGS));
  if (Number(cmsPageCountRes[0]?.count || 0) !== REQUIRED_CMS_PAGE_SLUGS.length) {
    return false;
  }

  return true;
}

/**
 * PHASE 1A: Seeds ONLY essential production reference and configuration data:
 * - Categories & Subcategories (INITIAL_CATEGORIES)
 * - Category Custom Fields (INITIAL_CUSTOM_FIELDS)
 * - Locations (INITIAL_LOCATIONS)
 * - Boost Packages (INITIAL_PACKAGES)
 * - Moderation Rules (INITIAL_MODERATION_RULES)
 * - System Email Templates (INITIAL_EMAIL_TEMPLATES)
 * - Legal & Compliance CMS Pages (INITIAL_CMS_PAGES)
 * - Primary System Settings (INITIAL_SETTINGS)
 * - Completion Marker ('init_complete_v3') written ONLY after all steps succeed
 *
 * Uses batch inserts with `.onConflictDoNothing()` so existing data is never overwritten or deleted.
 */
export async function seedEssentialProductionData(executor: SeedDbExecutor = db): Promise<void> {
  console.log('--- Starting Essential Production Database Initialization ---');

  // 1. Categories (Batch Insert: Parents first, then Children)
  const parentCategories = INITIAL_CATEGORIES.filter((c) => !c.parentId);
  const childCategories = INITIAL_CATEGORIES.filter((c) => c.parentId);

  const mapCategory = (c: (typeof INITIAL_CATEGORIES)[0]) => ({
    id: c.id,
    name: c.name,
    slug: c.slug,
    icon: c.icon,
    parentId: c.parentId || null,
    orderIndex: c.order || (c as any).orderIndex || 0,
    isActive: c.isActive ?? true,
    seoTitle: c.seoTitle || null,
    seoDescription: c.seoDescription || null,
    isPaid: c.isPaid ?? false,
    postingFee: String(c.postingFee || 0),
    freeListingsQuota: c.freeListingsQuota ?? 3,
  });

  for (const batch of chunkArray(parentCategories.map(mapCategory), 50)) {
    await executor.insert(schema.categories).values(batch).onConflictDoNothing();
  }
  for (const batch of chunkArray(childCategories.map(mapCategory), 50)) {
    await executor.insert(schema.categories).values(batch).onConflictDoNothing();
  }

  // 2. Custom Fields (Batch Insert)
  const customFieldsToInsert = INITIAL_CUSTOM_FIELDS.map((f) => ({
    id: f.id,
    categoryId: resolveCategoryId(f.categoryId),
    name: f.name,
    label: f.label,
    type: f.type,
    options: f.options || [],
    unit: f.unit || null,
    required: f.required ?? false,
    filterable: f.filterable ?? true,
    orderIndex: f.orderIndex || 0,
  }));

  for (const batch of chunkArray(customFieldsToInsert, 50)) {
    await executor.insert(schema.categoryCustomFields).values(batch).onConflictDoNothing();
  }

  // 3. Locations (Batch Insert: Parents first, then Children)
  const rootLocations = INITIAL_LOCATIONS.filter((l) => !l.parentId);
  const childLocations = INITIAL_LOCATIONS.filter((l) => l.parentId);

  const mapLocation = (loc: (typeof INITIAL_LOCATIONS)[0]) => {
    const anyLoc = loc as any;
    const s = anyLoc.slug || loc.name.toLowerCase().replace(/\s+/g, '-');
    const g = anyLoc.geoId || (loc.id === 'loc_in' ? 'g0' : `g_${loc.id}`);
    return {
      id: loc.id,
      type: loc.type,
      name: loc.name,
      slug: s,
      code: loc.code || null,
      geoId: g,
      parentId: loc.parentId || null,
      latitude: anyLoc.latitude || null,
      longitude: anyLoc.longitude || null,
      popular: loc.popular ?? false,
      orderIndex: anyLoc.orderIndex || anyLoc.order || 0,
    };
  };

  for (const batch of chunkArray(rootLocations.map(mapLocation), 50)) {
    await executor.insert(schema.locations).values(batch).onConflictDoNothing();
  }
  for (const batch of chunkArray(childLocations.map(mapLocation), 50)) {
    await executor.insert(schema.locations).values(batch).onConflictDoNothing();
  }

  // 4. Boost Packages (Batch Insert)
  const packagesToInsert = INITIAL_PACKAGES.map((p) => ({
    id: p.id,
    name: p.name,
    badge: p.badge,
    type: p.type || 'boost',
    durationDays: p.durationDays || 1,
    durationHours: p.durationHours || 24,
    price: String(p.price),
    discountPrice: p.discountPrice ? String(p.discountPrice) : null,
    currency: p.currency || 'INR',
    features: p.features || [],
    isActive: p.isActive ?? true,
    salesCount: p.salesCount || 0,
  }));
  for (const batch of chunkArray(packagesToInsert, 50)) {
    await executor.insert(schema.boostPackages).values(batch).onConflictDoNothing();
  }

  // 5. Moderation Rules (Batch Insert)
  const rulesToInsert = INITIAL_MODERATION_RULES.map((r) => ({
    id: r.id,
    title: r.title,
    type: r.type,
    action: r.action,
    keywords: r.keywords || [],
    threshold: r.threshold ? String(r.threshold) : null,
    isActive: r.isActive ?? true,
  }));
  for (const batch of chunkArray(rulesToInsert, 50)) {
    await executor.insert(schema.moderationRules).values(batch).onConflictDoNothing();
  }

  // 6. Email Templates (Batch Insert)
  const templatesToInsert = INITIAL_EMAIL_TEMPLATES.map((t) => ({
    id: t.id,
    name: t.name,
    category: t.category,
    subject: t.subject,
    bodyHtml: t.bodyHtml,
    bodyText: t.bodyText,
    actionLabel: t.actionLabel,
    actionUrl: t.actionUrl,
    variables: t.variables || [],
    isActive: t.isActive ?? true,
    isSystemDefault: t.isSystemDefault ?? false,
  }));
  for (const batch of chunkArray(templatesToInsert, 50)) {
    await executor.insert(schema.emailTemplates).values(batch).onConflictDoNothing();
  }

  // 7. CMS Pages (Batch Insert)
  const pagesToInsert = INITIAL_CMS_PAGES.map((p) => ({
    id: p.id,
    slug: p.slug,
    title: p.title,
    content: p.content,
    seoTitle: (p as any).seoTitle || p.title,
    seoDescription: (p as any).seoDescription || p.title,
    isActive: p.status === 'published' || ((p as any).isActive ?? true),
  }));
  for (const batch of chunkArray(pagesToInsert, 50)) {
    await executor.insert(schema.cmsPages).values(batch).onConflictDoNothing();
  }

  // 8. Primary System Settings
  await executor
    .insert(schema.systemSettings)
    .values({
      id: 'primary',
      siteName: INITIAL_SETTINGS.siteName || 'Chillyads',
      defaultCurrency: INITIAL_SETTINGS.defaultCurrency || 'INR',
      currencySymbol: INITIAL_SETTINGS.currencySymbol || '₹',
      timezone: INITIAL_SETTINGS.timezone || 'Asia/Kolkata',
      dateFormat: INITIAL_SETTINGS.dateFormat || 'DD/MM/YYYY',
      listingDurationDays: INITIAL_SETTINGS.listingDurationDays || 30,
      freeListingsLimit: INITIAL_SETTINGS.freeListingsLimit || 3,
      extraListingFee: String(INITIAL_SETTINGS.extraListingFee || 99),
      maxPhotosPerListing: INITIAL_SETTINGS.maxPhotosPerListing || 5,
      autoApproveVerifiedUsers: INITIAL_SETTINGS.autoApproveVerifiedUsers ?? false,
      maintenanceMode: INITIAL_SETTINGS.maintenanceMode ?? false,
      watermarkImages: INITIAL_SETTINGS.watermarkImages ?? false,
      aiSpamFilterEnabled: INITIAL_SETTINGS.aiSpamFilterEnabled ?? true,
      otpLoginEnabled: INITIAL_SETTINGS.otpLoginEnabled ?? true,
      paidFeaturesConfig:
        INITIAL_SETTINGS.paidFeatures || (INITIAL_SETTINGS as any).paidFeaturesConfig || {},
    })
    .onConflictDoNothing();

  // 9. Consistent Initialization Completion Marker (written ONLY after all essential steps succeed)
  await executor
    .insert(schema.systemSettings)
    .values({
      id: INITIALIZATION_MARKER_ID,
      siteName: 'INITIALIZED_V3',
      paidFeaturesConfig: {
        initializedAt: new Date().toISOString(),
        version: 'v3',
      },
    })
    .onConflictDoNothing();

  console.log('--- Essential Production Database Initialization Complete ---');
}

/**
 * PHASE 1B: Seeds development/test demonstration users, staff accounts, and sample listings.
 * Strictly forbidden in production and never runs automatically during server startup or visitor requests.
 * Uses `.onConflictDoNothing()` so existing real users and real listings are never modified or deleted.
 */
export async function seedDemoData(executor: SeedDbExecutor = db): Promise<void> {
  if (process.env.NODE_ENV === 'production') {
    throw new Error(
      'Demo data seeding is disabled in production to prevent inserting sample users and listings.'
    );
  }

  console.log('--- Starting Development/Demo Data Seeding (Users & Sample Listings) ---');
  const defaultPasswordHash = await hashPassword('Password123!');

  // 1. Sample Users & Demo Admins (Batch Insert)
  const usersToInsert = [
    ...INITIAL_USERS.map((u) => ({
      id: u.id,
      name: u.name,
      email: u.email,
      phone: u.phone || '+91 98000 11111',
      passwordHash: defaultPasswordHash,
      avatarUrl: u.avatar,
      type: u.type,
      status: u.status,
      kycStatus: u.kycStatus,
      emailSubscribed: u.emailSubscribed,
      city: u.location?.city || 'Mumbai',
      state: u.location?.state || 'Maharashtra',
      rating: String(u.rating || 5.0),
      reviewCount: u.reviewCount || 0,
      businessName: u.businessDetails?.companyName || (u as any).businessName || null,
      gstNumber: u.businessDetails?.gstNumber || (u as any).gstNumber || null,
      verifiedBusiness:
        u.businessDetails?.verifiedBusiness || (u as any).verifiedBusiness || false,
      adminRole: null as string | null,
    })),
    ...INITIAL_ADMINS.map((a) => ({
      id: a.id,
      name: a.name,
      email: a.email,
      phone: '+91 98200 11223',
      passwordHash: defaultPasswordHash,
      avatarUrl: a.avatar,
      type: 'business' as const,
      status: 'active' as const,
      kycStatus: 'verified' as const,
      emailSubscribed: true,
      city: 'Mumbai',
      state: 'Maharashtra',
      rating: '4.90',
      reviewCount: 38,
      businessName: 'Chillyads Staff',
      verifiedBusiness: true,
      adminRole: a.role,
    })),
  ];

  for (const batch of chunkArray(usersToInsert, 50)) {
    await executor.insert(schema.users).values(batch).onConflictDoNothing();
  }

  // 2. Sample Listings & Synthetic Sellers (Batch Insert)
  const seeded = seedCategoriesWithTenAds(INITIAL_LISTINGS);

  const sellerMap = new Map<string, any>();
  for (const l of seeded) {
    if (!sellerMap.has(l.sellerId)) {
      sellerMap.set(l.sellerId, {
        id: l.sellerId,
        name: l.sellerName,
        email: `${l.sellerId}@chillyads.com`,
        phone: l.sellerPhone || '+91 98000 00000',
        city: l.location?.city || 'Mumbai',
        state: l.location?.state || 'Maharashtra',
      });
    }
  }

  for (const batch of chunkArray(Array.from(sellerMap.values()), 50)) {
    await executor.insert(schema.users).values(batch).onConflictDoNothing();
  }

  const expiresDate = new Date();
  expiresDate.setDate(expiresDate.getDate() + 30);

  const listingsToInsert = seeded.map((l) => ({
    id: l.id,
    sellerId: l.sellerId,
    sellerName: l.sellerName,
    sellerPhone: l.sellerPhone || '',
    categoryId: resolveCategoryId(l.categoryId),
    subcategoryId: l.subcategoryId || null,
    title: l.title,
    description: l.description,
    price: String(l.price),
    state: l.location?.state || 'Maharashtra',
    city: l.location?.city || 'Mumbai',
    locality: l.location?.locality || 'Andheri West',
    latitude: l.location?.latitude || 19.076,
    longitude: l.location?.longitude || 72.8777,
    images: l.images || [],
    customAttributes: l.customAttributes || {},
    status: l.status || 'approved',
    isFeatured: l.isFeatured ?? false,
    featuredUntil: l.featuredUntil ? new Date(l.featuredUntil) : null,
    isBoosted: l.isBoosted ?? false,
    boostStatus: l.boostStatus || 'inactive',
    boostViews: l.boostViews || 0,
    boostImpressions: l.boostImpressions || 0,
    boostClicks: l.boostClicks || 0,
    views: l.views || 0,
    likes: l.likes || 0,
    chatsCount: l.chatsCount || 0,
    spamScore: l.spamScore || 0,
    expiresAt: expiresDate,
  }));

  for (const batch of chunkArray(listingsToInsert, 50)) {
    await executor.insert(schema.listings).values(batch).onConflictDoNothing();
  }

  console.log('--- Development/Demo Data Seeding Complete ---');
}

/**
 * Coordinates essential database initialization across both in-process callers and
 * concurrent Cloud Run instances using a PostgreSQL transaction-scoped advisory lock
 * (`pg_advisory_xact_lock`) bound to the exact transaction connection executing the seed queries.
 *
 * - Never automatically seeds demo users or sample listings in production or on visitor requests.
 * - Propagates errors on failure so callers never silently cache or return misleading empty data.
 */
export async function ensureDatabaseSeeded(options?: {
  includeDemoData?: boolean;
}): Promise<void> {
  if (options?.includeDemoData && process.env.NODE_ENV === 'production') {
    throw new Error(
      'Demo data seeding is disabled in production to prevent inserting sample users and listings.'
    );
  }

  const shouldSeedDemo =
    Boolean(options?.includeDemoData) && process.env.NODE_ENV !== 'production';

  if (globalThis._isDatabaseInitialized && !shouldSeedDemo) {
    return;
  }

  if (globalThis._activeSeedPromise) {
    return globalThis._activeSeedPromise;
  }

  globalThis._activeSeedPromise = (async () => {
    try {
      await db.transaction(async (tx) => {
        // 1. Acquire PostgreSQL transaction-level advisory lock on this exact connection
        // before checking initialization completion. Automatically released on COMMIT or ROLLBACK.
        await tx.execute(
          sql`SELECT pg_advisory_xact_lock(${ADVISORY_LOCK_KEY_1}, ${ADVISORY_LOCK_KEY_2})`
        );

        // 2. Check consistent completion marker and core reference table integrity
        const alreadyInitialized = await checkIsFullyInitialized(tx);

        if (!alreadyInitialized) {
          await seedEssentialProductionData(tx);
          const verifiedAfterSeed = await checkIsFullyInitialized(tx);
          if (!verifiedAfterSeed) {
            throw new Error(
              'Essential production database initialization failed completeness verification after seeding.'
            );
          }
        }

        if (shouldSeedDemo) {
          await seedDemoData(tx);
        }
      });

      globalThis._isDatabaseInitialized = true;
    } catch (err) {
      globalThis._isDatabaseInitialized = false;
      console.error('[DatabaseInit] Essential database initialization failed:', err);
      throw err;
    } finally {
      globalThis._activeSeedPromise = undefined;
    }
  })();

  return globalThis._activeSeedPromise;
}

/**
 * Explicit helper for development and test environments to initialize both
 * essential reference data and demonstration users/listings.
 */
export async function seedDevelopmentDatabase(): Promise<void> {
  if (process.env.NODE_ENV === 'production') {
    throw new Error('seedDevelopmentDatabase cannot be run in production.');
  }
  await ensureDatabaseSeeded({ includeDemoData: true });
}

/**
 * Backwards-compatible entry point.
 * In production, runs only essential reference data initialization.
 * In development/test, supports optional demo seeding when explicitly requested.
 */
export async function seedPostgres(options?: { includeDemoData?: boolean }): Promise<void> {
  if (options?.includeDemoData && process.env.NODE_ENV === 'production') {
    throw new Error(
      'Demo data seeding is disabled in production to prevent inserting sample users and listings.'
    );
  }
  const includeDemo =
    options?.includeDemoData ??
    (process.env.NODE_ENV !== 'production' && process.env.SEED_DEMO_DATA === 'true');
  await ensureDatabaseSeeded({ includeDemoData: includeDemo });
}

if (
  typeof process !== 'undefined' &&
  Array.isArray(process.argv) &&
  process.argv[1]?.endsWith('seed-postgres.ts')
) {
  const isDemo = process.argv.includes('--demo');
  const isInit = process.argv.includes('--init');
  if (isDemo || isInit) {
    (isDemo ? seedDevelopmentDatabase() : ensureDatabaseSeeded())
      .then(() => {
        console.log(
          isDemo
            ? '[DatabaseInit] Essential + demo seed completed.'
            : '[DatabaseInit] Essential production initialization completed.'
        );
        process.exit(0);
      })
      .catch((err) => {
        console.error('[DatabaseInit] CLI seed failed:', err);
        process.exit(1);
      });
  }
}
