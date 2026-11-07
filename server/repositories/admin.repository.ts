import { db } from '@/src/db/index';
import * as schema from '@/src/db/schema';
import { desc, eq, sql } from '@/src/db/pg-orm';
import { AuditLog, SystemSettings } from '@/lib/types';
import { DEFAULT_PAID_FEATURES_CONFIG } from '@/lib/data/initialData';
import { getCachedSystemSettings } from '@/server/cache/reference-data.cache';
import crypto from 'node:crypto';

export class AdminRepository {
  private mapRowToAuditLog(row: typeof schema.auditLogs.$inferSelect): AuditLog {
    return {
      id: row.id,
      adminId: row.adminId,
      adminName: row.adminName,
      action: row.action,
      module: row.module,
      targetId: row.targetId,
      targetSummary: row.targetSummary,
      details: row.details,
      ipAddress: row.ipAddress,
      timestamp: row.timestamp.toISOString(),
    };
  }

  public async createAuditLog(params: {
    adminId: string;
    adminName: string;
    action: string;
    module: string;
    targetId: string;
    targetSummary: string;
    details: string;
    ipAddress?: string;
  }, executor?: any): Promise<AuditLog> {
    try {
      const id = `aud_${crypto.randomUUID()}`;
      const dbExecutor = executor || db;
      const inserted = await dbExecutor
        .insert(schema.auditLogs)
        .values({
          id,
          adminId: params.adminId,
          adminName: params.adminName,
          action: params.action,
          module: params.module,
          targetId: params.targetId,
          targetSummary: params.targetSummary,
          details: params.details,
          ipAddress: params.ipAddress || 'unknown',
        })
        .returning();

      return this.mapRowToAuditLog(inserted[0]);
    } catch (error) {
      console.error('AdminRepository.createAuditLog error:', error);
      throw new Error('Failed to create audit log in PostgreSQL', { cause: error });
    }
  }

  public async findAllAuditLogs(limit = 100): Promise<AuditLog[]> {
    try {
      const rows = await db
        .select()
        .from(schema.auditLogs)
        .orderBy(desc(schema.auditLogs.timestamp))
        .limit(limit);

      return rows.map((r) => this.mapRowToAuditLog(r));
    } catch (error) {
      console.error('AdminRepository.findAllAuditLogs error:', error);
      return [];
    }
  }

  public async getSystemSettingsDirect(): Promise<SystemSettings> {
    try {
      const paymentGatewayConfigured = Boolean(process.env.PAYMENT_GATEWAY_SECRET?.trim());
      const rows = await db.select().from(schema.systemSettings).where(eq(schema.systemSettings.id, 'primary')).limit(1);
      if (!rows.length) {
        return {
          siteName: 'Chillyads',
          defaultCurrency: 'INR',
          currencySymbol: '₹',
          timezone: 'Asia/Kolkata',
          dateFormat: 'DD/MM/YYYY',
          listingDurationDays: 30,
          freeListingsLimit: DEFAULT_PAID_FEATURES_CONFIG.freeListingsLimit,
          extraListingFee: DEFAULT_PAID_FEATURES_CONFIG.extraListingFee,
          maxPhotosPerListing: 5,
          autoApproveVerifiedUsers: false,
          maintenanceMode: false,
          watermarkImages: false,
          aiSpamFilterEnabled: true,
          otpLoginEnabled: true,
          enablePrivacyChoices: true,
          paidFeatures: { ...DEFAULT_PAID_FEATURES_CONFIG },
          paymentGatewayConfigured,
          boostEnabled: process.env.BOOST_ENABLED === 'true',
        };
      }
      const r = rows[0];
      const storedPaidCfg =
        r.paidFeaturesConfig && typeof r.paidFeaturesConfig === 'object' && !Array.isArray(r.paidFeaturesConfig)
          ? (r.paidFeaturesConfig as Record<string, any>)
          : {};

      const resolveNum = (val: any, fallback: number): number => {
        if (val !== undefined && val !== null && typeof val !== 'boolean' && !isNaN(Number(val)) && isFinite(Number(val))) {
          return Number(val);
        }
        return fallback;
      };
      const resolveBool = (val: any, fallback: boolean): boolean => {
        return typeof val === 'boolean' ? val : fallback;
      };

      const resolvedFreeLimit = resolveNum(
        storedPaidCfg.freeListingsLimit,
        r.freeListingsLimit !== undefined && r.freeListingsLimit !== null
          ? Number(r.freeListingsLimit)
          : DEFAULT_PAID_FEATURES_CONFIG.freeListingsLimit
      );
      const resolvedExtraFee = resolveNum(
        storedPaidCfg.extraListingFee,
        r.extraListingFee !== undefined && r.extraListingFee !== null
          ? Number(r.extraListingFee)
          : DEFAULT_PAID_FEATURES_CONFIG.extraListingFee
      );
      const resolvedEnablePrivacyChoices = resolveBool(
        storedPaidCfg.enablePrivacyChoices,
        true
      );

      const mergedPaidFeatures = {
        masterMonetizationEnabled: resolveBool(storedPaidCfg.masterMonetizationEnabled, DEFAULT_PAID_FEATURES_CONFIG.masterMonetizationEnabled),
        freemiumQuotaEnabled: resolveBool(storedPaidCfg.freemiumQuotaEnabled, DEFAULT_PAID_FEATURES_CONFIG.freemiumQuotaEnabled),
        freeListingsLimit: resolvedFreeLimit,
        extraListingFee: resolvedExtraFee,
        paidSubcategoriesEnabled: resolveBool(storedPaidCfg.paidSubcategoriesEnabled, DEFAULT_PAID_FEATURES_CONFIG.paidSubcategoriesEnabled),
        defaultSubcategoryFee: resolveNum(storedPaidCfg.defaultSubcategoryFee, DEFAULT_PAID_FEATURES_CONFIG.defaultSubcategoryFee),
        featuredAdEnabled: resolveBool(storedPaidCfg.featuredAdEnabled, DEFAULT_PAID_FEATURES_CONFIG.featuredAdEnabled),
        featuredAdPrice: resolveNum(storedPaidCfg.featuredAdPrice, DEFAULT_PAID_FEATURES_CONFIG.featuredAdPrice),
        featuredAdDurationDays: resolveNum(storedPaidCfg.featuredAdDurationDays, DEFAULT_PAID_FEATURES_CONFIG.featuredAdDurationDays),
        adBoostEnabled: resolveBool(storedPaidCfg.adBoostEnabled, DEFAULT_PAID_FEATURES_CONFIG.adBoostEnabled),
        quickBoostPrice: resolveNum(storedPaidCfg.quickBoostPrice, DEFAULT_PAID_FEATURES_CONFIG.quickBoostPrice),
        spotlightBoostPrice: resolveNum(storedPaidCfg.spotlightBoostPrice, DEFAULT_PAID_FEATURES_CONFIG.spotlightBoostPrice),
        premiumSurgeBoostPrice: resolveNum(storedPaidCfg.premiumSurgeBoostPrice, DEFAULT_PAID_FEATURES_CONFIG.premiumSurgeBoostPrice),
        displayAdsEnabled: resolveBool(storedPaidCfg.displayAdsEnabled, DEFAULT_PAID_FEATURES_CONFIG.displayAdsEnabled),
        headerBannerEnabled: resolveBool(storedPaidCfg.headerBannerEnabled, DEFAULT_PAID_FEATURES_CONFIG.headerBannerEnabled),
        inFeedBannerEnabled: resolveBool(storedPaidCfg.inFeedBannerEnabled, DEFAULT_PAID_FEATURES_CONFIG.inFeedBannerEnabled),
        sidebarBannerEnabled: resolveBool(storedPaidCfg.sidebarBannerEnabled, DEFAULT_PAID_FEATURES_CONFIG.sidebarBannerEnabled),
        bannerDailyRate: resolveNum(storedPaidCfg.bannerDailyRate, DEFAULT_PAID_FEATURES_CONFIG.bannerDailyRate),
      };

      return {
        siteName: r.siteName,
        defaultCurrency: r.defaultCurrency,
        currencySymbol: r.currencySymbol,
        timezone: r.timezone,
        dateFormat: r.dateFormat,
        listingDurationDays: r.listingDurationDays,
        freeListingsLimit: resolvedFreeLimit,
        extraListingFee: resolvedExtraFee,
        maxPhotosPerListing: r.maxPhotosPerListing,
        autoApproveVerifiedUsers: r.autoApproveVerifiedUsers,
        maintenanceMode: r.maintenanceMode,
        watermarkImages: r.watermarkImages,
        aiSpamFilterEnabled: r.aiSpamFilterEnabled,
        otpLoginEnabled: r.otpLoginEnabled,
        enablePrivacyChoices: resolvedEnablePrivacyChoices,
        paidFeatures: mergedPaidFeatures,
        paymentGatewayConfigured,
        boostEnabled: process.env.BOOST_ENABLED === 'true',
      };
    } catch (error) {
      console.error('AdminRepository.getSystemSettingsDirect error:', error);
      throw new Error('Failed to get system settings', { cause: error });
    }
  }

  public async getSystemSettings(): Promise<SystemSettings> {
    try {
      const cached = await getCachedSystemSettings();
      return {
        ...cached,
        paymentGatewayConfigured: Boolean(process.env.PAYMENT_GATEWAY_SECRET?.trim()),
      };
    } catch (error) {
      console.error('AdminRepository.getSystemSettings error:', error);
      throw new Error('Failed to get system settings', { cause: error });
    }
  }

  public async updateSystemSettings(data: Partial<SystemSettings>): Promise<SystemSettings> {
    try {
      const fields: any = {};
      if (data.siteName !== undefined) fields.siteName = data.siteName;
      if (data.defaultCurrency !== undefined) fields.defaultCurrency = data.defaultCurrency;
      if (data.currencySymbol !== undefined) fields.currencySymbol = data.currencySymbol;
      if (data.timezone !== undefined) fields.timezone = data.timezone;
      if (data.dateFormat !== undefined) fields.dateFormat = data.dateFormat;
      if (data.listingDurationDays !== undefined) fields.listingDurationDays = data.listingDurationDays;
      if (data.freeListingsLimit !== undefined) fields.freeListingsLimit = data.freeListingsLimit;
      if (data.extraListingFee !== undefined) fields.extraListingFee = String(data.extraListingFee);
      if (data.maxPhotosPerListing !== undefined) fields.maxPhotosPerListing = data.maxPhotosPerListing;
      if (data.autoApproveVerifiedUsers !== undefined) fields.autoApproveVerifiedUsers = data.autoApproveVerifiedUsers;
      if (data.maintenanceMode !== undefined) fields.maintenanceMode = data.maintenanceMode;
      if (data.watermarkImages !== undefined) fields.watermarkImages = data.watermarkImages;
      if (data.aiSpamFilterEnabled !== undefined) fields.aiSpamFilterEnabled = data.aiSpamFilterEnabled;
      if (data.otpLoginEnabled !== undefined) fields.otpLoginEnabled = data.otpLoginEnabled;
      if (data.paidFeatures !== undefined || data.enablePrivacyChoices !== undefined) {
        const current = await this.getSystemSettingsDirect();
        fields.paidFeaturesConfig = {
          ...(current.paidFeatures || DEFAULT_PAID_FEATURES_CONFIG),
          ...(data.paidFeatures || {}),
          ...(data.enablePrivacyChoices !== undefined
            ? { enablePrivacyChoices: data.enablePrivacyChoices }
            : current.enablePrivacyChoices !== undefined
            ? { enablePrivacyChoices: current.enablePrivacyChoices }
            : {}),
        };
      }

      await db
        .insert(schema.systemSettings)
        .values({
          id: 'primary',
          ...fields,
        })
        .onConflictDoUpdate({
          target: schema.systemSettings.id,
          set: fields,
        });

      return await this.getSystemSettingsDirect();
    } catch (error) {
      console.error('AdminRepository.updateSystemSettings error:', error);
      throw new Error('Failed to update system settings in PostgreSQL', { cause: error });
    }
  }

  public async getDashboardKpis(): Promise<{
    totalListings: number;
    pendingListings: number;
    activeUsers: number;
    pendingVerification: number;
    activeReports: number;
    totalRevenue: number;
  }> {
    try {
      const [listingsCount] = await db
        .select({ count: sql<number>`count(*)::int` })
        .from(schema.listings);

      const [pendingCount] = await db
        .select({ count: sql<number>`count(*)::int` })
        .from(schema.listings)
        .where(eq(schema.listings.status, 'pending'));

      const [usersCount] = await db
        .select({ count: sql<number>`count(*)::int` })
        .from(schema.users)
        .where(eq(schema.users.status, 'active'));

      const [kycCount] = await db
        .select({ count: sql<number>`count(*)::int` })
        .from(schema.users)
        .where(eq(schema.users.kycStatus, 'pending'));

      const [reportsCount] = await db
        .select({ count: sql<number>`count(*)::int` })
        .from(schema.abuseReports)
        .where(eq(schema.abuseReports.status, 'pending'));

      const [revResult] = await db
        .select({ total: sql<string>`coalesce(sum(${schema.boostTransactions.totalAmount}), 0)::text` })
        .from(schema.boostTransactions)
        .where(eq(schema.boostTransactions.status, 'completed'));

      return {
        totalListings: listingsCount?.count || 0,
        pendingListings: pendingCount?.count || 0,
        activeUsers: usersCount?.count || 0,
        pendingVerification: kycCount?.count || 0,
        activeReports: reportsCount?.count || 0,
        totalRevenue: Number(revResult?.total || 0),
      };
    } catch (error) {
      console.error('AdminRepository.getDashboardKpis error:', error);
      return {
        totalListings: 0,
        pendingListings: 0,
        activeUsers: 0,
        pendingVerification: 0,
        activeReports: 0,
        totalRevenue: 0,
      };
    }
  }
}

export const adminRepository = new AdminRepository();
