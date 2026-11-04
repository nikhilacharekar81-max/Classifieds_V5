import {
  pgTable,
  varchar,
  text,
  boolean,
  integer,
  numeric,
  timestamp,
  doublePrecision,
  jsonb,
  uniqueIndex,
  index,
  primaryKey,
} from '@/src/db/pg-orm';
import { sql } from '@/src/db/pg-orm';

// 1. Users
export const users = pgTable('users', {
  id: varchar('id', { length: 64 }).primaryKey(),
  uid: varchar('uid', { length: 128 }),
  name: varchar('name', { length: 255 }).notNull(),
  email: varchar('email', { length: 255 }).notNull().unique(),
  phone: varchar('phone', { length: 32 }).notNull().default(''),
  passwordHash: varchar('password_hash', { length: 255 }),
  avatarUrl: text('avatar_url'),
  type: varchar('type', { length: 32 }).notNull().default('user'),
  status: varchar('status', { length: 32 }).notNull().default('active'),
  kycStatus: varchar('kyc_status', { length: 32 }).notNull().default('unsubmitted'),
  emailSubscribed: boolean('email_subscribed').notNull().default(true),
  emailUnsubscribedAt: timestamp('email_unsubscribed_at', { withTimezone: true }),
  city: varchar('city', { length: 128 }).notNull().default('Mumbai'),
  state: varchar('state', { length: 128 }).notNull().default('Maharashtra'),
  rating: numeric('rating', { precision: 3, scale: 2 }).notNull().default('5.00'),
  reviewCount: integer('review_count').notNull().default(0),
  businessName: varchar('business_name', { length: 255 }),
  gstNumber: varchar('gst_number', { length: 32 }),
  verifiedBusiness: boolean('verified_business').notNull().default(false),
  adminRole: varchar('admin_role', { length: 64 }),
  twoFactorEnabled: boolean('two_factor_enabled').notNull().default(false),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

// 2. User Sessions
export const userSessions = pgTable('user_sessions', {
  id: varchar('id', { length: 128 }).primaryKey(),
  userId: varchar('user_id', { length: 64 }).notNull().references(() => users.id, { onDelete: 'cascade' }),
  ipAddress: varchar('ip_address', { length: 64 }).notNull().default('unknown'),
  userAgent: text('user_agent'),
  impersonatedBy: varchar('impersonated_by', { length: 64 }),
  expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

// 3. KYC Documents
export const kycDocuments = pgTable('kyc_documents', {
  id: varchar('id', { length: 64 }).primaryKey(),
  userId: varchar('user_id', { length: 64 }).notNull().references(() => users.id, { onDelete: 'cascade' }),
  documentType: varchar('document_type', { length: 32 }).notNull(),
  documentNumber: varchar('document_number', { length: 128 }).notNull(),
  fileUrl: text('file_url').notNull(),
  status: varchar('status', { length: 32 }).notNull().default('pending'),
  rejectionReason: text('rejection_reason'),
  reviewedBy: varchar('reviewed_by', { length: 64 }),
  submittedAt: timestamp('submitted_at', { withTimezone: true }).notNull().defaultNow(),
  reviewedAt: timestamp('reviewed_at', { withTimezone: true }),
});

// 4. Categories
export const categories = pgTable('categories', {
  id: varchar('id', { length: 64 }).primaryKey(),
  name: varchar('name', { length: 255 }).notNull(),
  slug: varchar('slug', { length: 255 }).notNull(),
  icon: varchar('icon', { length: 64 }).notNull().default('Package'),
  parentId: varchar('parent_id', { length: 64 }),
  orderIndex: integer('order_index').notNull().default(0),
  isActive: boolean('is_active').notNull().default(true),
  seoTitle: text('seo_title'),
  seoDescription: text('seo_description'),
  isPaid: boolean('is_paid').notNull().default(false),
  postingFee: numeric('posting_fee', { precision: 10, scale: 2 }).notNull().default('0.00'),
  freeListingsQuota: integer('free_listings_quota').notNull().default(3),
});

// 5. Custom Fields (EAV)
export const categoryCustomFields = pgTable('category_custom_fields', {
  id: varchar('id', { length: 64 }).primaryKey(),
  categoryId: varchar('category_id', { length: 64 }).notNull().references(() => categories.id, { onDelete: 'cascade' }),
  name: varchar('name', { length: 128 }).notNull(),
  label: varchar('label', { length: 255 }).notNull(),
  type: varchar('type', { length: 32 }).notNull(),
  options: jsonb('options'),
  unit: varchar('unit', { length: 32 }),
  required: boolean('required').notNull().default(false),
  filterable: boolean('filterable').notNull().default(true),
  orderIndex: integer('order_index').notNull().default(0),
});

// 6. Locations
export const locations = pgTable('locations', {
  id: varchar('id', { length: 64 }).primaryKey(),
  type: varchar('type', { length: 32 }).notNull(),
  name: varchar('name', { length: 255 }).notNull(),
  slug: varchar('slug', { length: 255 }).notNull(),
  code: varchar('code', { length: 32 }),
  geoId: varchar('geo_id', { length: 32 }).notNull(),
  parentId: varchar('parent_id', { length: 64 }),
  latitude: doublePrecision('latitude'),
  longitude: doublePrecision('longitude'),
  popular: boolean('popular').notNull().default(false),
  orderIndex: integer('order_index').notNull().default(0),
});

// 7. Listings
export const listings = pgTable(
  'listings',
  {
    id: varchar('id', { length: 64 }).primaryKey(),
    sellerId: varchar('seller_id', { length: 64 }).notNull().references(() => users.id, { onDelete: 'restrict' }),
    sellerName: varchar('seller_name', { length: 255 }).notNull().default('Seller'),
    sellerPhone: varchar('seller_phone', { length: 32 }).notNull().default(''),
    categoryId: varchar('category_id', { length: 64 }).notNull().references(() => categories.id),
    subcategoryId: varchar('subcategory_id', { length: 64 }),
    title: varchar('title', { length: 255 }).notNull(),
    description: text('description').notNull(),
    price: numeric('price', { precision: 12, scale: 2 }).notNull(),
    state: varchar('state', { length: 128 }).notNull(),
    city: varchar('city', { length: 128 }).notNull(),
    locality: varchar('locality', { length: 128 }).notNull(),
    latitude: doublePrecision('latitude'),
    longitude: doublePrecision('longitude'),
    images: jsonb('images').notNull().default('[]'),
    customAttributes: jsonb('custom_attributes').notNull().default('{}'),
    status: varchar('status', { length: 32 }).notNull().default('pending'),
    rejectionReason: text('rejection_reason'),
    isFeatured: boolean('is_featured').notNull().default(false),
    featuredUntil: timestamp('featured_until', { withTimezone: true }),

    // Boost Tracking
    isBoosted: boolean('is_boosted').notNull().default(false),
    boostStatus: varchar('boost_status', { length: 32 }).notNull().default('inactive'),
    boostStartedAt: timestamp('boost_started_at', { withTimezone: true }),
    boostExpiresAt: timestamp('boost_expires_at', { withTimezone: true }),
    boostPackageId: varchar('boost_package_id', { length: 64 }),
    boostPackageName: varchar('boost_package_name', { length: 255 }),
    boostPaymentId: varchar('boost_payment_id', { length: 128 }),
    boostPrice: numeric('boost_price', { precision: 10, scale: 2 }).default('0.00'),
    boostDurationHours: integer('boost_duration_hours').default(0),
    boostViews: integer('boost_views').notNull().default(0),
    boostImpressions: integer('boost_impressions').notNull().default(0),
    boostClicks: integer('boost_clicks').notNull().default(0),

    views: integer('views').notNull().default(0),
    likes: integer('likes').notNull().default(0),
    chatsCount: integer('chats_count').notNull().default(0),
    spamScore: integer('spam_score').notNull().default(0),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
    expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
  },
  (table) => [
    uniqueIndex('idx_unique_active_ad_title_per_seller').on(
      table.sellerId,
      sql`LOWER(REGEXP_REPLACE(TRIM(${table.title}), '\\s+', ' ', 'g'))`
    ).where(sql`${table.status} NOT IN ('sold', 'expired')`),
    index('idx_listings_boost_ranking').on(
      table.boostStatus,
      table.boostExpiresAt,
      table.isFeatured,
      table.createdAt
    ),
    index('idx_listings_location_cat').on(table.city, table.categoryId, table.status),
    index('idx_listings_status_city_cat_created').on(
      table.status,
      table.city,
      table.categoryId,
      table.subcategoryId,
      table.createdAt
    ),
    index('idx_listings_status_expires').on(table.status, table.expiresAt),
  ]
);

// 8. Boost Packages
export const boostPackages = pgTable('boost_packages', {
  id: varchar('id', { length: 64 }).primaryKey(),
  name: varchar('name', { length: 255 }).notNull(),
  badge: varchar('badge', { length: 64 }).notNull(),
  type: varchar('type', { length: 32 }).notNull().default('boost'),
  durationDays: integer('duration_days').notNull().default(1),
  durationHours: integer('duration_hours').notNull().default(24),
  price: numeric('price', { precision: 10, scale: 2 }).notNull(),
  discountPrice: numeric('discount_price', { precision: 10, scale: 2 }),
  currency: varchar('currency', { length: 10 }).notNull().default('INR'),
  features: jsonb('features').notNull().default('[]'),
  isActive: boolean('is_active').notNull().default(true),
  salesCount: integer('sales_count').notNull().default(0),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

// 9. Boost Orders
export const boostOrders = pgTable('boost_orders', {
  orderId: varchar('order_id', { length: 64 }).primaryKey(),
  listingId: varchar('listing_id', { length: 64 }).notNull().references(() => listings.id, { onDelete: 'cascade' }),
  packageId: varchar('package_id', { length: 64 }).notNull().references(() => boostPackages.id),
  userId: varchar('user_id', { length: 64 }).notNull().references(() => users.id),
  price: numeric('price', { precision: 10, scale: 2 }).notNull(),
  taxAmount: numeric('tax_amount', { precision: 10, scale: 2 }).notNull(),
  totalAmount: numeric('total_amount', { precision: 10, scale: 2 }).notNull(),
  durationHours: integer('duration_hours').notNull(),
  currency: varchar('currency', { length: 10 }).notNull().default('INR'),
  status: varchar('status', { length: 32 }).notNull().default('pending'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

// 10. Boost Transactions
export const boostTransactions = pgTable('boost_transactions', {
  id: varchar('id', { length: 64 }).primaryKey(),
  orderId: varchar('order_id', { length: 64 }).notNull().references(() => boostOrders.orderId),
  listingId: varchar('listing_id', { length: 64 }).notNull().references(() => listings.id),
  userId: varchar('user_id', { length: 64 }).notNull().references(() => users.id),
  packageId: varchar('package_id', { length: 64 }).notNull().references(() => boostPackages.id),
  amount: numeric('amount', { precision: 10, scale: 2 }).notNull(),
  taxAmount: numeric('tax_amount', { precision: 10, scale: 2 }).notNull(),
  totalAmount: numeric('total_amount', { precision: 10, scale: 2 }).notNull(),
  paymentGateway: varchar('payment_gateway', { length: 64 }).notNull(),
  paymentId: varchar('payment_id', { length: 128 }).notNull(),
  invoiceNumber: varchar('invoice_number', { length: 64 }).notNull().unique(),
  status: varchar('status', { length: 32 }).notNull().default('pending'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

// 11. Payment Webhook Events (Durable Idempotency)
export const paymentWebhookEvents = pgTable(
  'payment_webhook_events',
  {
    id: varchar('id', { length: 128 }).primaryKey(),
    orderId: varchar('order_id', { length: 64 }).notNull(),
    gateway: varchar('gateway', { length: 64 }).notNull(),
    payload: jsonb('payload').notNull(),
    processedAt: timestamp('processed_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex('idx_webhook_gateway_event_unique').on(table.gateway, table.id),
  ]
);

// 12. User Favorites
export const userFavorites = pgTable(
  'user_favorites',
  {
    userId: varchar('user_id', { length: 64 }).notNull().references(() => users.id, { onDelete: 'cascade' }),
    listingId: varchar('listing_id', { length: 64 }).notNull().references(() => listings.id, { onDelete: 'cascade' }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    primaryKey({ columns: [table.userId, table.listingId] }),
  ]
);

// 13. Chat Messages
export const chatMessages = pgTable('chat_messages', {
  id: varchar('id', { length: 64 }).primaryKey(),
  listingId: varchar('listing_id', { length: 64 }).notNull().references(() => listings.id, { onDelete: 'cascade' }),
  senderId: varchar('sender_id', { length: 64 }).notNull().references(() => users.id),
  receiverId: varchar('receiver_id', { length: 64 }).notNull().references(() => users.id),
  messageText: text('message_text').notNull(),
  readAt: timestamp('read_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

// 14. Abuse Reports
export const abuseReports = pgTable('abuse_reports', {
  id: varchar('id', { length: 64 }).primaryKey(),
  type: varchar('type', { length: 32 }).notNull(),
  targetId: varchar('target_id', { length: 64 }).notNull(),
  targetTitle: varchar('target_title', { length: 255 }).notNull(),
  reportedBy: varchar('reported_by', { length: 64 }).notNull().references(() => users.id),
  reason: varchar('reason', { length: 64 }).notNull(),
  notes: text('notes').notNull(),
  status: varchar('status', { length: 32 }).notNull().default('pending'),
  actionTaken: text('action_taken'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

// 15. Moderation Rules
export const moderationRules = pgTable('moderation_rules', {
  id: varchar('id', { length: 64 }).primaryKey(),
  title: varchar('title', { length: 255 }).notNull(),
  type: varchar('type', { length: 64 }).notNull(),
  action: varchar('action', { length: 64 }).notNull(),
  keywords: jsonb('keywords').default('[]'),
  threshold: numeric('threshold', { precision: 10, scale: 2 }),
  isActive: boolean('is_active').notNull().default(true),
});

// 16. Email Templates
export const emailTemplates = pgTable('email_templates', {
  id: varchar('id', { length: 64 }).primaryKey(),
  name: varchar('name', { length: 255 }).notNull(),
  category: varchar('category', { length: 64 }).notNull(),
  subject: varchar('subject', { length: 255 }).notNull(),
  bodyHtml: text('body_html').notNull(),
  bodyText: text('body_text').notNull(),
  actionLabel: varchar('action_label', { length: 128 }),
  actionUrl: text('action_url'),
  variables: jsonb('variables').notNull().default('[]'),
  isActive: boolean('is_active').notNull().default(true),
  isSystemDefault: boolean('is_system_default').notNull().default(false),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

// 17. Email Logs
export const emailLogs = pgTable('email_logs', {
  id: varchar('id', { length: 64 }).primaryKey(),
  toEmail: varchar('to_email', { length: 255 }).notNull(),
  toName: varchar('to_name', { length: 255 }).notNull(),
  subject: varchar('subject', { length: 255 }).notNull(),
  body: text('body').notNull(),
  status: varchar('status', { length: 32 }).notNull().default('delivered'),
  type: varchar('type', { length: 64 }).notNull(),
  listingId: varchar('listing_id', { length: 64 }),
  relatedUserId: varchar('related_user_id', { length: 64 }),
  sentAt: timestamp('sent_at', { withTimezone: true }).notNull().defaultNow(),
});

// 18. Newsletter Campaigns
export const newsletterCampaigns = pgTable('newsletter_campaigns', {
  id: varchar('id', { length: 64 }).primaryKey(),
  title: varchar('title', { length: 255 }).notNull(),
  subject: varchar('subject', { length: 255 }).notNull(),
  previewText: text('preview_text'),
  contentHtml: text('content_html').notNull(),
  targetAudience: varchar('target_audience', { length: 64 }).notNull(),
  targetCity: varchar('target_city', { length: 128 }),
  targetState: varchar('target_state', { length: 128 }),
  status: varchar('status', { length: 32 }).notNull().default('draft'),
  targetCount: integer('target_count').notNull().default(0),
  sentCount: integer('sent_count').notNull().default(0),
  deliveredCount: integer('delivered_count').notNull().default(0),
  openedCount: integer('opened_count').notNull().default(0),
  clickedCount: integer('clicked_count').notNull().default(0),
  createdBy: varchar('created_by', { length: 64 }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  sentAt: timestamp('sent_at', { withTimezone: true }),
});

// 19. CMS Pages
export const cmsPages = pgTable('cms_pages', {
  id: varchar('id', { length: 64 }).primaryKey(),
  slug: varchar('slug', { length: 128 }).notNull().unique(),
  title: varchar('title', { length: 255 }).notNull(),
  content: text('content').notNull(),
  seoTitle: text('seo_title'),
  seoDescription: text('seo_description'),
  isActive: boolean('is_active').notNull().default(true),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

// 20. Audit Logs
export const auditLogs = pgTable('audit_logs', {
  id: varchar('id', { length: 64 }).primaryKey(),
  adminId: varchar('admin_id', { length: 64 }).notNull(),
  adminName: varchar('admin_name', { length: 255 }).notNull(),
  action: varchar('action', { length: 128 }).notNull(),
  module: varchar('module', { length: 64 }).notNull(),
  targetId: varchar('target_id', { length: 64 }).notNull(),
  targetSummary: varchar('target_summary', { length: 255 }).notNull(),
  details: text('details').notNull(),
  ipAddress: varchar('ip_address', { length: 64 }).notNull().default('unknown'),
  timestamp: timestamp('timestamp', { withTimezone: true }).notNull().defaultNow(),
});

// 21. System Settings
export const systemSettings = pgTable('system_settings', {
  id: varchar('id', { length: 32 }).primaryKey().default('primary'),
  siteName: varchar('site_name', { length: 255 }).notNull().default('Chillyads'),
  defaultCurrency: varchar('default_currency', { length: 10 }).notNull().default('INR'),
  currencySymbol: varchar('currency_symbol', { length: 10 }).notNull().default('₹'),
  timezone: varchar('timezone', { length: 64 }).notNull().default('Asia/Kolkata'),
  dateFormat: varchar('date_format', { length: 32 }).notNull().default('DD/MM/YYYY'),
  listingDurationDays: integer('listing_duration_days').notNull().default(30),
  freeListingsLimit: integer('free_listings_limit').notNull().default(3),
  extraListingFee: numeric('extra_listing_fee', { precision: 10, scale: 2 }).notNull().default('99.00'),
  maxPhotosPerListing: integer('max_photos_per_listing').notNull().default(5),
  autoApproveVerifiedUsers: boolean('auto_approve_verified_users').notNull().default(false),
  maintenanceMode: boolean('maintenance_mode').notNull().default(false),
  watermarkImages: boolean('watermark_images').notNull().default(false),
  aiSpamFilterEnabled: boolean('ai_spam_filter_enabled').notNull().default(true),
  otpLoginEnabled: boolean('otp_login_enabled').notNull().default(true),
  paidFeaturesConfig: jsonb('paid_features_config').notNull().default('{}'),
});

// 22. Display Advertising Campaigns
export const advertisingCampaigns = pgTable('advertising_campaigns', {
  id: varchar('id', { length: 64 }).primaryKey(),
  advertiserName: varchar('advertiser_name', { length: 255 }).notNull(),
  title: varchar('title', { length: 255 }).notNull(),
  position: varchar('position', { length: 64 }).notNull(),
  targetCity: varchar('target_city', { length: 128 }),
  targetCategory: varchar('target_category', { length: 128 }),
  bannerUrl: text('banner_url').notNull(),
  targetUrl: text('target_url').notNull(),
  status: varchar('status', { length: 32 }).notNull().default('active'),
  impressions: integer('impressions').notNull().default(0),
  clicks: integer('clicks').notNull().default(0),
  startDate: timestamp('start_date', { withTimezone: true }).notNull().defaultNow(),
  endDate: timestamp('end_date', { withTimezone: true }),
});

// 23. Cache Invalidation Outbox
export const cacheInvalidationOutbox = pgTable(
  'cache_invalidation_outbox',
  {
    id: varchar('id', { length: 64 }).primaryKey(),
    tag: varchar('tag', { length: 128 }).notNull().unique(),
    status: varchar('status', { length: 32 }).notNull().default('pending'),
    attempts: integer('attempts').notNull().default(0),
    lastError: text('last_error'),
    nextRetryAt: timestamp('next_retry_at', { withTimezone: true }).notNull().defaultNow(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    completedAt: timestamp('completed_at', { withTimezone: true }),
  },
  (table) => [
    index('idx_cache_invalidation_outbox_status_retry').on(table.status, table.nextRetryAt),
  ]
);

