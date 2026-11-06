export interface CmsPage {
  id: string;
  title: string;
  slug: string;
  category: 'Legal' | 'Trust & Safety' | 'Support & Help' | 'About' | 'Blog / Guides';
  content: string;
  updatedAt: string;
  status: 'published' | 'draft';
  seoTitle?: string;
  seoDescription?: string;
  isActive?: boolean;
}

export type Role = 'super_admin' | 'moderator' | 'support_agent' | 'finance_user' | 'content_manager' | 'marketing_manager';

export interface AdminUser {
  id: string;
  name: string;
  email: string;
  avatar: string;
  role: Role;
  twoFactorEnabled: boolean;
  lastLogin: string;
  ipAddress: string;
  status: 'active' | 'inactive';
}

export type UserType = 'user' | 'business';
export type UserStatus = 'active' | 'suspended' | 'banned';
export type KycStatus = 'pending' | 'verified' | 'rejected' | 'unsubmitted';

export interface UserAccount {
  id: string;
  name: string;
  email: string;
  phone: string;
  avatar: string;
  type: UserType;
  status: UserStatus;
  kycStatus: KycStatus;
  emailSubscribed: boolean; // Captured & defaulted to true on registration
  emailUnsubscribedAt?: string;
  emailVerified?: boolean;
  emailVerifiedAt?: string;
  banReason?: string;
  kycDocument?: {
    type: 'Aadhaar' | 'PAN' | 'GSTIN' | 'Passport';
    docNumber: string;
    submittedAt: string;
    fileUrl: string;
  };
  location: {
    city: string;
    state: string;
  };
  totalListings: number;
  activeListings: number;
  rating: number;
  reviewCount: number;
  joinedDate: string;
  lastLogin: string;
  lastIp: string;
  businessDetails?: {
    companyName: string;
    gstNumber: string;
    verifiedBusiness: boolean;
  };
  adminRole?: string | null;
}

export type ListingStatus = 'pending' | 'approved' | 'rejected' | 'sold' | 'expired' | 'draft';

export interface CustomFieldDefinition {
  id: string;
  categoryId: string;
  name: string;
  label: string;
  type: 'text' | 'number' | 'select' | 'radio' | 'checkbox';
  options?: string[];
  required: boolean;
  unit?: string;
  filterable: boolean;
  orderIndex?: number;
}

export interface Listing {
  id: string;
  title: string;
  description: string;
  price: number | null;
  categoryId: string;
  subcategoryId?: string;
  sellerId: string;
  sellerName: string;
  sellerType: UserType;
  sellerPhone: string;
  sellerAvatar: string;
  images: string[];
  location: {
    state: string;
    city: string;
    locality: string;
    latitude?: number;
    longitude?: number;
  };
  status: ListingStatus;
  rejectionReason?: string;
  isFeatured: boolean;
  featuredUntil?: string;
  isBoosted: boolean;
  boostStartedAt?: string;
  boostExpiresAt?: string;
  boostPackageId?: string;
  boostPackageName?: string;
  boostStatus?: 'active' | 'expired' | 'inactive';
  boostPaymentId?: string;
  boostPrice?: number;
  boostDurationHours?: number;
  boostViews?: number;
  boostImpressions?: number;
  boostClicks?: number;
  views: number;
  likes: number;
  chatsCount: number;
  customAttributes: Record<string, string | number | boolean>;
  createdAt: string;
  expiresAt: string;
  spamScore?: number; // 0 to 100
  isDuplicate?: boolean;
}

export interface Category {
  id: string;
  name: string;
  slug: string;
  icon: string;
  parentId: string | null;
  listingCount: number;
  isActive: boolean;
  order: number;
  orderIndex?: number;
  seoTitle?: string;
  seoDescription?: string;
  isPaid?: boolean;
  postingFee?: number;
  freeListingsQuota?: number;
}

export interface LocationItem {
  id: string;
  type: 'country' | 'state' | 'city' | 'locality';
  name: string;
  slug?: string;
  code?: string;
  geoId?: string;
  parentId: string | null;
  latitude?: number;
  longitude?: number;
  popular?: boolean;
  listingCount: number;
  order?: number;
  orderIndex?: number;
}

export interface ReportItem {
  id: string;
  type: 'listing' | 'user' | 'message';
  targetId: string;
  targetTitle: string;
  targetImage?: string;
  reportedBy: string;
  reportedByName: string;
  reason: 'spam' | 'prohibited_item' | 'fraud_scam' | 'offensive' | 'duplicate' | 'wrong_category';
  notes: string;
  status: 'pending' | 'reviewed' | 'actioned' | 'dismissed';
  createdAt: string;
  actionTaken?: string;
}

export interface ModerationRule {
  id: string;
  title: string;
  type: 'keyword_blacklist' | 'price_anomaly' | 'image_duplicate' | 'rapid_posting';
  action: 'flag_for_review' | 'auto_reject' | 'auto_ban_user';
  keywords?: string[];
  threshold?: number;
  isActive: boolean;
}

export interface PromotionalPackage {
  id: string;
  name: string;
  badge: string;
  type: 'feature' | 'boost' | 'bundle' | 'subscription';
  durationDays: number;
  durationHours?: number;
  price: number;
  currency?: string;
  discountPrice?: number;
  features: string[];
  isActive: boolean;
  salesCount: number;
}

export interface BoostOrderRequest {
  listingId: string;
  packageId: string;
  userId: string;
}

export interface BoostPaymentVerificationRequest {
  orderId: string;
  listingId: string;
  packageId: string;
  paymentId: string;
  paymentGateway: 'Razorpay' | 'PayTM' | 'Stripe' | 'UPI' | 'Wallet';
  userId: string;
}

export interface BoostAnalyticsSummary {
  totalBoostsPurchased: number;
  totalBoostRevenue: number;
  activeBoostsCount: number;
  expiredBoostsCount: number;
  avgDurationHours: number;
  boostedAdViews: number;
  boostedAdImpressions: number;
  boostedAdClicks: number;
}

export interface OrderTransaction {
  id: string;
  orderId: string;
  userId: string;
  userName: string;
  packageId: string;
  packageName: string;
  amount: number;
  taxAmount: number;
  totalAmount?: number;
  status: 'completed' | 'pending' | 'failed' | 'refunded';
  paymentGateway: 'Razorpay' | 'PayTM' | 'Stripe' | 'UPI' | 'Wallet';
  paymentId?: string;
  invoiceNumber: string;
  createdAt: string;
}

export interface AuditLog {
  id: string;
  adminId: string;
  adminName: string;
  action: string;
  module: string;
  targetId: string;
  targetSummary: string;
  details: string;
  ipAddress: string;
  timestamp: string;
}

export interface ToastMessage {
  id: string;
  type: 'success' | 'error' | 'info' | 'warning';
  title: string;
  message?: string;
  action?: {
    label: string;
    onClick: () => void;
  };
}

export type EmailDeliveryStatus = 'delivered' | 'opened' | 'clicked' | 'queued' | 'sending' | 'failed' | 'not_configured';
export type EmailLogType = 'transactional' | 'marketing' | 'test' | 'ad_expired' | 'ad_renewed' | 'ad_approved' | 'ad_rejected' | 'welcome' | 'newsletter' | 'custom_broadcast' | 'general';

export interface EmailLog {
  id: string;
  toEmail: string;
  toName: string;
  subject: string;
  body: string;
  actionLabel?: string;
  actionUrl?: string;
  status: EmailDeliveryStatus;
  sentAt: string;
  listingId?: string;
  listingTitle?: string;
  templateId?: string;
  type: EmailLogType;
  errorMessage?: string;
  relatedUserId?: string;
  senderEmail?: string;
  isMarketing?: boolean;
}

export type EmailTemplateCategory = 'account' | 'ad_lifecycle' | 'user_activity' | 'marketing';

export interface EmailTemplateVariable {
  key: string;
  label: string;
  sample: string;
  description?: string;
}

export interface EmailTemplate {
  id: string;
  name: string;
  category: EmailTemplateCategory;
  description: string;
  subject: string;
  bodyHtml: string;
  bodyText: string;
  actionLabel?: string;
  actionUrl?: string;
  variables: EmailTemplateVariable[];
  isActive: boolean;
  lastUpdated: string;
  isSystemDefault?: boolean;
}

export interface EmailSmtpConfig {
  host: string;
  port: number;
  secure?: boolean; // SSL/TLS
  username: string;
  password: string; // Stored securely/masked in UI
  encryption?: 'tls' | 'ssl' | 'none';
  authRequired?: boolean;
  authMethod?: 'LOGIN' | 'PLAIN' | 'CRAM-MD5';
}

export interface EmailSettings {
  senderName: string;
  senderEmail: string;
  replyToEmail: string;
  marketingSenderName?: string;
  marketingSenderEmail?: string;
  smtp: EmailSmtpConfig;
  batchSize: number;
  delayBetweenBatchesMs?: number;
  rateLimitPerMinute?: number;
  enableUnsubscribeHeader?: boolean;
  footerAddress?: string;
  footerText?: string;
  companyAddress?: string;
  companyName?: string;
  unsubscribeUrl?: string;
  brandColor?: string;
  brandLogoUrl?: string;
  trackOpens?: boolean;
  trackClicks?: boolean;
  defaultEmailSubscribedOnRegister?: boolean;
}

export type NewsletterTargetAudience = 
  | 'all_subscribed'
  | 'active_sellers'
  | 'business_users'
  | 'individual_users'
  | 'city_specific'
  | 'state_specific';

export interface NewsletterAudienceFilter {
  target: NewsletterTargetAudience;
  state?: string;
  city?: string;
  categoryId?: string;
}

export interface NewsletterCampaign {
  id: string;
  title?: string;
  subject: string;
  previewText?: string;
  contentHtml?: string;
  bodyHtml?: string;
  targetAudience?: NewsletterTargetAudience;
  targetCity?: string;
  targetState?: string;
  audienceFilter?: NewsletterAudienceFilter;
  status: 'draft' | 'scheduled' | 'sending' | 'completed' | 'sent' | 'cancelled';
  totalRecipients?: number;
  targetCount?: number;
  sentCount: number;
  deliveredCount?: number;
  openedCount?: number;
  clickedCount?: number;
  bouncedCount?: number;
  failedCount?: number;
  unsubscribeCount?: number;
  createdAt: string;
  scheduledAt?: string;
  sentAt?: string;
  authorName?: string;
  createdBy?: string;
}

export interface PaidFeaturesConfig {
  masterMonetizationEnabled: boolean; // Master ON/OFF toggle for all paid features
  
  // 1. Freemium Volume Quotas
  freemiumQuotaEnabled: boolean;
  freeListingsLimit: number; // e.g., 3
  extraListingFee: number; // e.g., ₹99

  // 2. Paid Subcategories & Categories
  paidSubcategoriesEnabled: boolean;
  defaultSubcategoryFee: number; // e.g., ₹149

  // 3. Featured Ad Upgrades
  featuredAdEnabled: boolean;
  featuredAdPrice: number; // e.g., ₹100
  featuredAdDurationDays: number; // e.g., 30

  // 4. Ad Boost Packages
  adBoostEnabled: boolean;
  quickBoostPrice: number; // e.g., ₹49 (24h)
  spotlightBoostPrice: number; // e.g., ₹199 (7d)
  premiumSurgeBoostPrice: number; // e.g., ₹499 (30d)

  // 5. Sponsored & Display Advertising
  displayAdsEnabled: boolean;
  headerBannerEnabled: boolean;
  inFeedBannerEnabled: boolean;
  sidebarBannerEnabled: boolean;
  bannerDailyRate: number; // e.g., ₹299
}

export interface SystemSettings {
  siteName: string;
  defaultCurrency: string;
  currencySymbol: string;
  timezone: string;
  dateFormat: string;
  listingDurationDays: number;
  freeListingsLimit: number; // Baseline free active listings quota (e.g., 3 active ads)
  extraListingFee: number; // Fee charged per listing published beyond baseline limit (e.g., ₹99)
  maxPhotosPerListing: number;
  autoApproveVerifiedUsers: boolean;
  maintenanceMode: boolean;
  watermarkImages: boolean;
  aiSpamFilterEnabled: boolean;
  otpLoginEnabled: boolean;
  enablePrivacyChoices?: boolean;
  paidFeatures?: PaidFeaturesConfig;
}

export interface UserGeoLocation {
  latitude: number;
  longitude: number;
  city: string;
  area: string;
  radiusKm: number;
}
