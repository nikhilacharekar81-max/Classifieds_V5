'use client';
import { createContext, useContext } from 'react';
import type {
  AdminUser,
  UserAccount,
  Listing,
  Category,
  CustomFieldDefinition,
  LocationItem,
  ReportItem,
  ModerationRule,
  PromotionalPackage,
  OrderTransaction,
  AuditLog,
  ToastMessage,
  SystemSettings,
  Role,
  UserGeoLocation,
  EmailLog,
  EmailSettings,
  EmailTemplate,
  NewsletterCampaign,
  EmailSmtpConfig,
  NewsletterAudienceFilter,
  CmsPage,
} from '@/lib/types';

export interface AppContextType {
  // Navigation & Mode
  viewMode: 'admin' | 'marketplace';
  setViewMode: (mode: 'admin' | 'marketplace') => void;
  activeSidebarTab: string;
  setActiveSidebarTab: (tab: string) => void;
  theme: 'light' | 'dark';
  toggleTheme: () => void;
  globalSearchOpen: boolean;
  setGlobalSearchOpen: (open: boolean) => void;
  mobileSidebarOpen: boolean;
  setMobileSidebarOpen: (open: boolean) => void;

  // Current logged in admin & permissions
  currentAdmin: AdminUser | null;
  switchAdminRole: (role: Role) => void;
  impersonatedUser: UserAccount | null;
  impersonateUser: (user: UserAccount) => void;
  exitImpersonation: () => void;
  currentUser: UserAccount;
  authUser: UserAccount | null;
  updateAuth: (user: UserAccount | null, admin: AdminUser | null, userId: string | null) => void;
  setCurrentUserId: (id: string) => void;
  isAuthChecking: boolean;

  // Data Collections
  listings: Listing[];
  categories: Category[];
  customFields: CustomFieldDefinition[];
  locations: LocationItem[];
  users: UserAccount[];
  reports: ReportItem[];
  rules: ModerationRule[];
  packages: PromotionalPackage[];
  transactions: OrderTransaction[];
  auditLogs: AuditLog[];
  settings: SystemSettings;
  toasts: ToastMessage[];

  // Listing Operations
  approveListing: (id: string) => void;
  rejectListing: (id: string, reason: string) => void;
  featureListing: (id: string, isFeatured: boolean) => void;
  markAsSold: (id: string) => void;
  deleteListing: (id: string) => void;
  updateListing: (listing: Listing) => boolean;
  restoreListing: (id: string) => void;
  extendExpiration: (id: string, days?: number) => void;
  renewListing: (id: string, days?: number, isFree?: boolean) => void;
  bulkRenewListings: (ids: string[], days?: number) => void;
  markListingAsExpired: (id: string) => void;
  sendAdExpiredEmail: (listingId: string) => void;
  addListing: (listing: Omit<Listing, 'id' | 'createdAt' | 'views' | 'likes' | 'chatsCount'>) => Promise<Listing | null>;
  checkDuplicateTitle: (
    title: string,
    sellerId: string,
    excludeListingId?: string
  ) => Promise<{ isDuplicate: boolean; message?: string; conflictingListingId?: string }>;
  bulkApproveListings: (ids: string[]) => void;
  bulkRejectListings: (ids: string[], reason: string) => void;
  bulkDeleteListings: (ids: string[]) => void;

  // Email System, Newsletters & Logs
  emailLogs: EmailLog[];
  emailSettings: EmailSettings;
  emailTemplates: EmailTemplate[];
  newsletters: NewsletterCampaign[];
  sendEmail: (emailData: Omit<EmailLog, 'id' | 'sentAt' | 'status'>) => void;
  sendBatchEmails: (emails: Omit<EmailLog, 'id' | 'sentAt' | 'status'>[]) => Promise<number>;
  updateEmailSettings: (newSettings: Partial<EmailSettings>) => void;
  addEmailTemplate: (template: Omit<EmailTemplate, 'id' | 'lastUpdated'>) => EmailTemplate;
  updateEmailTemplate: (template: EmailTemplate) => void;
  deleteEmailTemplate: (id: string) => void;
  resetEmailTemplates: () => void;
  createNewsletterCampaign: (campaign: Omit<NewsletterCampaign, 'id' | 'createdAt' | 'sentCount'>) => NewsletterCampaign;
  sendNewsletterCampaign: (campaignId: string) => Promise<{ success: boolean; recipientCount: number; message: string }>;
  deleteNewsletterCampaign: (id: string) => void;
  testSmtpConnection: (config?: EmailSmtpConfig) => Promise<{ success: boolean; message: string; latencyMs: number }>;
  unsubscribeEmail: (email: string) => boolean;
  filterAudienceUsers: (filter: NewsletterAudienceFilter | string, customState?: string, customCity?: string) => UserAccount[];
  registerUser: (userData: Partial<UserAccount>) => UserAccount;

  // Category & Attributes Operations
  addCategory: (category: Omit<Category, 'id' | 'listingCount'>) => void;
  updateCategory: (category: Category) => void;
  deleteCategory: (id: string) => void;
  toggleCategoryStatus: (id: string) => void;
  addCustomField: (field: Omit<CustomFieldDefinition, 'id'>) => void;
  updateCustomField: (field: CustomFieldDefinition) => void;
  deleteCustomField: (id: string) => void;

  // Location Operations
  addLocation: (location: Omit<LocationItem, 'id' | 'listingCount'>) => void;
  updateLocation: (location: LocationItem) => void;
  deleteLocation: (id: string) => void;
  toggleLocationPopular: (id: string) => void;

  // User Operations
  verifyUserKyc: (userId: string, status: 'verified' | 'rejected') => void;
  updateUser: (user: UserAccount) => void;
  banUser: (userId: string, reason: string) => void;
  unbanUser: (userId: string) => void;

  // Moderation
  actionReport: (reportId: string, actionNote: string, actionType: 'actioned' | 'dismissed') => void;
  addModerationRule: (rule: Omit<ModerationRule, 'id'>) => void;
  toggleModerationRule: (id: string) => void;

  // Commerce
  addPackage: (pkg: Omit<PromotionalPackage, 'id' | 'salesCount'>) => void;
  updatePackage: (pkg: PromotionalPackage) => void;
  togglePackageStatus: (id: string) => void;
  boostListing: (
    listingId: string,
    packageId: string,
    paymentMethod?: 'upi' | 'card' | 'netbanking'
  ) => Promise<{ success: boolean; message: string; listing?: Listing; transaction?: OrderTransaction }>;
  isListingBoosted: (listing: Partial<Listing> | null | undefined) => boolean;
  cleanupExpiredBoosts: () => void;

  // Settings & System
  updateSettings: (newSettings: Partial<SystemSettings>) => void;
  resetAllCounters: () => void;
  addToast: (toast: Omit<ToastMessage, 'id'>) => void;
  removeToast: (id: string) => void;
  recordAuditLog: (action: string, module: string, targetId: string, targetSummary: string, details: string) => void;

  // CMS Pages & Footer Links
  cmsPages: CmsPage[];
  updateCmsPage: (page: CmsPage) => void;
  addCmsPage: (page: Omit<CmsPage, 'id' | 'updatedAt'>) => void;
  deleteCmsPage: (id: string) => void;
  activeCmsPageSlug: string | null;
  openCmsPageModal: (slug: string) => void;
  closeCmsPageModal: () => void;
  reportModalConfig: { open: boolean; type?: 'ad' | 'user'; targetId?: string; targetTitle?: string } | null;
  openReportModal: (type?: 'ad' | 'user', targetId?: string, targetTitle?: string) => void;
  closeReportModal: () => void;
  submitReport: (report: { targetType: 'listing' | 'user'; targetId: string; targetTitle: string; reason: string; comments: string }) => void;

  // Regulatory & Compliance Modals State
  isCmpModalOpen: boolean;
  openCmpModal: () => void;
  closeCmpModal: () => void;
  isUsPrivacyModalOpen: boolean;
  openUsPrivacyModal: () => void;
  closeUsPrivacyModal: () => void;
  isEeatModalOpen: boolean;
  openEeatModal: () => void;
  closeEeatModal: () => void;

  // Marketplace interaction state
  selectedMarketplaceCity: string;
  setSelectedMarketplaceCity: (city: string) => void;
  selectedMarketplaceCategory: string;
  setSelectedMarketplaceCategory: (catId: string) => void;
  selectedMarketplaceSubcategory: string;
  setSelectedMarketplaceSubcategory: (subId: string) => void;
  marketplaceSearch: string;
  setMarketplaceSearch: (q: string) => void;
  activeViewingListing: Listing | null;
  setActiveViewingListing: (listing: Listing | null) => void;
  isPostAdOpen: boolean;
  setIsPostAdOpen: (open: boolean) => void;
  userLocation: UserGeoLocation | null;
  setUserLocation: (loc: UserGeoLocation | null) => void;
  fetchGpsLocation: () => void;
  signOut: () => Promise<void>;
  refreshData: () => Promise<void>;
}

export interface InitialServerData {
  listings?: Listing[];
  categories?: Category[];
  locations?: LocationItem[];
  settings?: SystemSettings;
  cmsPages?: CmsPage[];
}

export const AppContext = createContext<AppContextType | undefined>(undefined);

export const useAppOptional = () => {
  return useContext(AppContext);
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
};
