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
          paidFeatures: { ...DEFAULT_PAID_FEATURES_CONFIG },
        };
      }
      const r = rows[0];
      const storedPaidCfg =
        r.paidFeaturesConfig && typeof r.paidFeaturesConfig === 'object'
          ? (r.paidFeaturesConfig as Record<string, any>)
          : {};
      const resolvedFreeLimit =
        storedPaidCfg.freeListingsLimit !== undefined && storedPaidCfg.freeListingsLimit !== null
          ? Number(storedPaidCfg.freeListingsLimit)
          : r.freeListingsLimit ?? DEFAULT_PAID_FEATURES_CONFIG.freeListingsLimit;
      const resolvedExtraFee =
        storedPaidCfg.extraListingFee !== undefined && storedPaidCfg.extraListingFee !== null
          ? Number(storedPaidCfg.extraListingFee)
          : r.extraListingFee !== undefined && r.extraListingFee !== null
          ? Number(r.extraListingFee)
          : DEFAULT_PAID_FEATURES_CONFIG.extraListingFee;

      return {
        siteName: r.siteName,
        defaultCurrency: r.defaultCurrency,
        currencySymbol: r.currencySymbol,
        timezone: r.timezone,
        dateFormat: r.dateFormat,
        listingDurationDays: r.listingDurationDays,
        freeListingsLimit: r.freeListingsLimit,
        extraListingFee: Number(r.extraListingFee),
        maxPhotosPerListing: r.maxPhotosPerListing,
        autoApproveVerifiedUsers: r.autoApproveVerifiedUsers,
        maintenanceMode: r.maintenanceMode,
        watermarkImages: r.watermarkImages,
        aiSpamFilterEnabled: r.aiSpamFilterEnabled,
        otpLoginEnabled: r.otpLoginEnabled,
        paidFeatures: {
          ...DEFAULT_PAID_FEATURES_CONFIG,
          ...storedPaidCfg,
          freeListingsLimit: resolvedFreeLimit,
          extraListingFee: resolvedExtraFee,
        },
      };
    } catch (error) {
      console.error('AdminRepository.getSystemSettingsDirect error:', error);
      throw new Error('Failed to get system settings', { cause: error });
    }
  }

  public async getSystemSettings(): Promise<SystemSettings> {
    try {
      return await getCachedSystemSettings();
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
      if (data.paidFeatures !== undefined) fields.paidFeaturesConfig = data.paidFeatures;

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
