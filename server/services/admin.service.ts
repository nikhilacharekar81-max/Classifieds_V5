import { adminRepository } from '@/server/repositories/admin.repository';
import { categoryRepository } from '@/server/repositories/category.repository';
import { locationRepository } from '@/server/repositories/location.repository';
import { cmsRepository } from '@/server/repositories/cms.repository';
import {
  invalidateCategoryReferenceCache,
  invalidateLocationReferenceCache,
  invalidateSettingsReferenceCache,
} from '@/server/cache/reference-data.cache';
import { boostService } from './boost.service';
import {
  Category,
  CustomFieldDefinition,
  LocationItem,
  SystemSettings,
  CmsPage,
  AuditLog,
} from '@/lib/types';

export class AdminService {
  public async getDashboardMetrics() {
    const kpis = await adminRepository.getDashboardKpis();
    const boostAnalytics = await boostService.getBoostAnalytics();
    const recentAuditLogs = await adminRepository.findAllAuditLogs(10);

    return {
      totalListings: kpis.totalListings,
      activeUsers: kpis.activeUsers,
      totalRevenue: kpis.totalRevenue,
      pendingModeration: kpis.pendingListings,
      pendingKyc: kpis.pendingVerification,
      openReports: kpis.activeReports,
      activeBoosts: boostAnalytics.activeBoostsCount,
      boostRevenue: boostAnalytics.totalBoostRevenue,
      recentAuditLogs,
    };
  }

  // Categories
  public async getCategories(): Promise<Category[]> {
    return await categoryRepository.findAll();
  }

  public async addCategory(
    catData: Omit<Category, 'id' | 'listingCount'>,
    actor?: { id?: string; name?: string; ipAddress?: string }
  ): Promise<Category> {
    const id = `cat_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
    const category = await categoryRepository.create({
      id,
      name: catData.name,
      slug: catData.slug,
      icon: catData.icon,
      parentId: catData.parentId || null,
      orderIndex: catData.orderIndex || 0,
      isActive: catData.isActive ?? true,
      seoTitle: catData.seoTitle,
      seoDescription: catData.seoDescription,
      isPaid: catData.isPaid ?? false,
      postingFee: catData.postingFee ?? 0,
      freeListingsQuota: catData.freeListingsQuota ?? 3,
    });

    await invalidateCategoryReferenceCache();
    await this.recordAudit(
      'CATEGORY_CREATED',
      'Categories',
      id,
      category.name,
      `Created category "${category.name}"`,
      actor?.id,
      actor?.name,
      actor?.ipAddress
    );
    return category;
  }

  public async updateCategory(
    id: string,
    updatedData: Partial<Category>,
    actor?: { id?: string; name?: string; ipAddress?: string }
  ): Promise<Category | null> {
    const fields: any = {};
    if (updatedData.name !== undefined) fields.name = updatedData.name;
    if (updatedData.slug !== undefined) fields.slug = updatedData.slug;
    if (updatedData.icon !== undefined) fields.icon = updatedData.icon;
    if (updatedData.parentId !== undefined) fields.parentId = updatedData.parentId;
    if (updatedData.orderIndex !== undefined) fields.orderIndex = updatedData.orderIndex;
    if (updatedData.isActive !== undefined) fields.isActive = updatedData.isActive;
    if (updatedData.seoTitle !== undefined) fields.seoTitle = updatedData.seoTitle;
    if (updatedData.seoDescription !== undefined) fields.seoDescription = updatedData.seoDescription;
    if (updatedData.isPaid !== undefined) fields.isPaid = updatedData.isPaid;
    if (updatedData.postingFee !== undefined) fields.postingFee = String(updatedData.postingFee);
    if (updatedData.freeListingsQuota !== undefined) fields.freeListingsQuota = updatedData.freeListingsQuota;

    const updated = await categoryRepository.update(id, fields);
    if (updated) {
      await invalidateCategoryReferenceCache();
      await this.recordAudit(
        'CATEGORY_UPDATED',
        'Categories',
        id,
        updated.name,
        `Updated category "${updated.name}"`,
        actor?.id,
        actor?.name,
        actor?.ipAddress
      );
    }
    return updated;
  }

  public async deleteCategory(
    id: string,
    actor?: { id?: string; name?: string; ipAddress?: string }
  ): Promise<boolean> {
    const cat = await categoryRepository.findById(id);
    const success = await categoryRepository.delete(id);
    if (success) {
      await invalidateCategoryReferenceCache();
      if (cat) {
        await this.recordAudit(
          'CATEGORY_DELETED',
          'Categories',
          id,
          cat.name,
          `Deleted category "${cat.name}"`,
          actor?.id,
          actor?.name,
          actor?.ipAddress
        );
      }
    }
    return success;
  }

  // Custom Fields (EAV)
  public async getCustomFields(categoryId?: string): Promise<CustomFieldDefinition[]> {
    if (categoryId && categoryId !== 'all') {
      return await categoryRepository.findCustomFieldsByCategory(categoryId);
    }
    return await categoryRepository.findAllCustomFields();
  }

  public async addCustomField(
    fieldData: Omit<CustomFieldDefinition, 'id'>,
    actor?: { id: string; name: string; ipAddress?: string }
  ): Promise<CustomFieldDefinition> {
    const id = `fld_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
    const field = await categoryRepository.createCustomField({
      ...fieldData,
      id,
    });
    await this.recordAudit(
      'ATTRIBUTE_CREATED', 
      'Attributes', 
      id, 
      field.label, 
      `Added attribute "${field.label}"`,
      actor?.id,
      actor?.name,
      actor?.ipAddress
    );
    return field;
  }

  // Locations
  public async getLocations(): Promise<LocationItem[]> {
    return await locationRepository.findAll();
  }

  public async addLocation(
    locData: Omit<LocationItem, 'id' | 'listingCount'>,
    actor?: { id: string; name: string; ipAddress?: string }
  ): Promise<LocationItem> {
    const id = `loc_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
    const created = await locationRepository.create({
      id,
      type: locData.type,
      name: locData.name,
      slug: locData.slug || locData.name.toLowerCase().replace(/\s+/g, '-'),
      code: locData.code,
      geoId: locData.geoId || 'g0',
      parentId: locData.parentId || null,
      latitude: locData.latitude,
      longitude: locData.longitude,
      popular: locData.popular ?? false,
      orderIndex: locData.orderIndex || 0,
    });
    await invalidateLocationReferenceCache();
    await this.recordAudit(
      'LOCATION_CREATED',
      'Locations',
      id,
      created.name,
      `Added location "${created.name}"`,
      actor?.id,
      actor?.name,
      actor?.ipAddress
    );
    return created;
  }

  public async updateLocation(
    id: string, 
    updatedData: Partial<LocationItem>,
    actor?: { id: string; name: string; ipAddress?: string }
  ): Promise<LocationItem | null> {
    const fields: any = {};
    if (updatedData.name !== undefined) fields.name = updatedData.name;
    if (updatedData.slug !== undefined) fields.slug = updatedData.slug;
    if (updatedData.code !== undefined) fields.code = updatedData.code;
    if (updatedData.geoId !== undefined) fields.geoId = updatedData.geoId;
    if (updatedData.parentId !== undefined) fields.parentId = updatedData.parentId;
    if (updatedData.latitude !== undefined) fields.latitude = updatedData.latitude;
    if (updatedData.longitude !== undefined) fields.longitude = updatedData.longitude;
    if (updatedData.popular !== undefined) fields.popular = updatedData.popular;
    if (updatedData.orderIndex !== undefined) fields.orderIndex = updatedData.orderIndex;

    const updated = await locationRepository.update(id, fields);
    if (updated) {
      await invalidateLocationReferenceCache();
      await this.recordAudit(
        'LOCATION_UPDATED',
        'Locations',
        id,
        updated.name,
        `Updated location "${updated.name}"`,
        actor?.id,
        actor?.name,
        actor?.ipAddress
      );
    }
    return updated;
  }

  public async deleteLocation(
    id: string,
    actor?: { id: string; name: string; ipAddress?: string }
  ): Promise<boolean> {
    const loc = await locationRepository.findAll().then(all => all.find(l => l.id === id));
    const success = await locationRepository.delete(id);
    if (success) {
      await invalidateLocationReferenceCache();
      if (loc) {
        await this.recordAudit(
          'LOCATION_DELETED',
          'Locations',
          id,
          loc.name,
          `Deleted location "${loc.name}"`,
          actor?.id,
          actor?.name,
          actor?.ipAddress
        );
      }
    }
    return success;
  }

  // System Settings
  public async getSettings(): Promise<SystemSettings> {
    return await adminRepository.getSystemSettings();
  }

  public async updateSettings(
    newSettings: Partial<SystemSettings>,
    actor?: { id?: string; name?: string; ipAddress?: string }
  ): Promise<SystemSettings> {
    const validationErr = (msg: string) => {
      const err: any = new Error(msg);
      err.code = 'VALIDATION_ERROR';
      return err;
    };

    if (!newSettings || typeof newSettings !== 'object' || Array.isArray(newSettings)) {
      throw validationErr('Settings payload must be a valid object');
    }

    const validated: Partial<SystemSettings> = {};

    if (newSettings.siteName !== undefined) {
      if (typeof newSettings.siteName !== 'string' || !newSettings.siteName.trim() || newSettings.siteName.trim().length > 120) {
        throw validationErr('Site name must be a non-empty string (max 120 characters)');
      }
      validated.siteName = newSettings.siteName.trim();
    }

    if (newSettings.listingDurationDays !== undefined) {
      const raw = newSettings.listingDurationDays;
      const val = Number(raw);
      if (
        raw === null ||
        typeof raw === 'boolean' ||
        (typeof raw === 'string' && raw.trim() === '') ||
        !Number.isInteger(val) ||
        val < 1 ||
        val > 365
      ) {
        throw validationErr('Listing duration must be an integer between 1 and 365 days');
      }
      validated.listingDurationDays = val;
    }

    if (newSettings.extraListingFee !== undefined) {
      const raw = newSettings.extraListingFee;
      const val = Number(raw);
      if (
        raw === null ||
        typeof raw === 'boolean' ||
        (typeof raw === 'string' && raw.trim() === '') ||
        isNaN(val) ||
        !isFinite(val) ||
        val < 0 ||
        val > 1000000
      ) {
        throw validationErr('Extra listing fee must be a non-negative number');
      }
      validated.extraListingFee = Number(val.toFixed(2));
    }

    if (newSettings.freeListingsLimit !== undefined) {
      const raw = newSettings.freeListingsLimit;
      const val = Number(raw);
      if (
        raw === null ||
        typeof raw === 'boolean' ||
        (typeof raw === 'string' && raw.trim() === '') ||
        !Number.isInteger(val) ||
        val < 0 ||
        val > 10000
      ) {
        throw validationErr('Free listings limit must be a non-negative integer');
      }
      validated.freeListingsLimit = val;
    }

    if (newSettings.maxPhotosPerListing !== undefined) {
      const raw = newSettings.maxPhotosPerListing;
      const val = Number(raw);
      if (
        raw === null ||
        typeof raw === 'boolean' ||
        (typeof raw === 'string' && raw.trim() === '') ||
        !Number.isInteger(val) ||
        val < 1 ||
        val > 20
      ) {
        throw validationErr('Max photos per listing must be an integer between 1 and 20');
      }
      validated.maxPhotosPerListing = val;
    }

    const allowedTopLevelKeys = new Set<string>([
      'siteName',
      'listingDurationDays',
      'extraListingFee',
      'freeListingsLimit',
      'maxPhotosPerListing',
      'autoApproveVerifiedUsers',
      'maintenanceMode',
      'watermarkImages',
      'aiSpamFilterEnabled',
      'otpLoginEnabled',
      'enablePrivacyChoices',
      'defaultCurrency',
      'currencySymbol',
      'timezone',
      'dateFormat',
      'paidFeatures',
      'paymentGatewayConfigured', // read-only status flag ignored if echoed back
    ]);

    for (const key of Object.keys(newSettings)) {
      if (!allowedTopLevelKeys.has(key)) {
        throw validationErr(`Unrecognized system setting field: '${key}'`);
      }
    }

    const booleanKeys: Array<keyof SystemSettings> = [
      'autoApproveVerifiedUsers',
      'maintenanceMode',
      'watermarkImages',
      'aiSpamFilterEnabled',
      'otpLoginEnabled',
      'enablePrivacyChoices',
    ];
    for (const key of booleanKeys) {
      if (newSettings[key] !== undefined) {
        if (typeof newSettings[key] !== 'boolean') {
          throw validationErr(`Setting '${String(key)}' must be a boolean`);
        }
        (validated as any)[key] = newSettings[key];
      }
    }

    if (newSettings.defaultCurrency !== undefined) {
      if (typeof newSettings.defaultCurrency !== 'string' || !/^[A-Za-z]{3,10}$/.test(newSettings.defaultCurrency.trim())) {
        throw validationErr('Default currency must be a valid 3-10 letter currency code');
      }
      validated.defaultCurrency = newSettings.defaultCurrency.trim().toUpperCase();
    }

    if (newSettings.currencySymbol !== undefined) {
      if (typeof newSettings.currencySymbol !== 'string' || !newSettings.currencySymbol.trim() || newSettings.currencySymbol.trim().length > 10) {
        throw validationErr('Currency symbol must be a non-empty string (max 10 characters)');
      }
      validated.currencySymbol = newSettings.currencySymbol.trim();
    }

    if (newSettings.timezone !== undefined) {
      if (typeof newSettings.timezone !== 'string' || !newSettings.timezone.trim() || newSettings.timezone.trim().length > 64) {
        throw validationErr('Timezone must be a non-empty string');
      }
      validated.timezone = newSettings.timezone.trim();
    }

    if (newSettings.dateFormat !== undefined) {
      if (typeof newSettings.dateFormat !== 'string' || !newSettings.dateFormat.trim() || newSettings.dateFormat.trim().length > 32) {
        throw validationErr('Date format must be a non-empty string');
      }
      validated.dateFormat = newSettings.dateFormat.trim();
    }

    if (newSettings.paidFeatures !== undefined) {
      if (!newSettings.paidFeatures || typeof newSettings.paidFeatures !== 'object' || Array.isArray(newSettings.paidFeatures)) {
        throw validationErr('paidFeatures must be a valid configuration object');
      }
      const { DEFAULT_PAID_FEATURES_CONFIG } = await import('@/lib/data/initialData');
      const currentSettings = await adminRepository.getSystemSettingsDirect();
      const basePaid = { ...DEFAULT_PAID_FEATURES_CONFIG, ...(currentSettings.paidFeatures || {}) };
      const pf = newSettings.paidFeatures as Record<string, any>;

      const pfBooleanKeys = [
        'masterMonetizationEnabled',
        'freemiumQuotaEnabled',
        'paidSubcategoriesEnabled',
        'featuredAdEnabled',
        'adBoostEnabled',
        'displayAdsEnabled',
        'headerBannerEnabled',
        'inFeedBannerEnabled',
        'sidebarBannerEnabled',
      ] as const;

      const pfNonNegativeNumberKeys = [
        'extraListingFee',
        'defaultSubcategoryFee',
        'featuredAdPrice',
        'quickBoostPrice',
        'spotlightBoostPrice',
        'premiumSurgeBoostPrice',
        'bannerDailyRate',
      ] as const;

      const allowedPaidKeys = new Set<string>([
        ...pfBooleanKeys,
        ...pfNonNegativeNumberKeys,
        'freeListingsLimit',
        'featuredAdDurationDays',
      ]);

      for (const k of Object.keys(pf)) {
        if (!allowedPaidKeys.has(k)) {
          throw validationErr(`Unrecognized paidFeatures field: 'paidFeatures.${k}'`);
        }
      }

      for (const k of pfBooleanKeys) {
        if (pf[k] !== undefined) {
          if (typeof pf[k] !== 'boolean') {
            throw validationErr(`paidFeatures.${k} must be a boolean`);
          }
          basePaid[k] = pf[k];
        }
      }

      if (pf.freeListingsLimit !== undefined) {
        const v = Number(pf.freeListingsLimit);
        if (
          typeof pf.freeListingsLimit === 'boolean' ||
          pf.freeListingsLimit === null ||
          pf.freeListingsLimit === '' ||
          !Number.isInteger(v) ||
          v < 0 ||
          v > 10000
        ) {
          throw validationErr('paidFeatures.freeListingsLimit must be a non-negative integer');
        }
        basePaid.freeListingsLimit = v;
        if (validated.freeListingsLimit === undefined) {
          validated.freeListingsLimit = v;
        }
      }

      for (const k of pfNonNegativeNumberKeys) {
        if (pf[k] !== undefined) {
          const v = Number(pf[k]);
          if (
            typeof pf[k] === 'boolean' ||
            pf[k] === null ||
            pf[k] === '' ||
            isNaN(v) ||
            !isFinite(v) ||
            v < 0 ||
            v > 1000000
          ) {
            throw validationErr(`paidFeatures.${k} must be a non-negative number`);
          }
          const rounded = Number(v.toFixed(2));
          basePaid[k] = rounded;
          if (k === 'extraListingFee' && validated.extraListingFee === undefined) {
            validated.extraListingFee = rounded;
          }
        }
      }

      if (pf.featuredAdDurationDays !== undefined) {
        const v = Number(pf.featuredAdDurationDays);
        if (
          typeof pf.featuredAdDurationDays === 'boolean' ||
          pf.featuredAdDurationDays === null ||
          pf.featuredAdDurationDays === '' ||
          !Number.isInteger(v) ||
          v < 1 ||
          v > 365
        ) {
          throw validationErr('paidFeatures.featuredAdDurationDays must be an integer between 1 and 365');
        }
        basePaid.featuredAdDurationDays = v;
      }

      validated.paidFeatures = basePaid;
    } else if (validated.freeListingsLimit !== undefined || validated.extraListingFee !== undefined) {
      const { DEFAULT_PAID_FEATURES_CONFIG } = await import('@/lib/data/initialData');
      const currentSettings = await adminRepository.getSystemSettingsDirect();
      validated.paidFeatures = {
        ...DEFAULT_PAID_FEATURES_CONFIG,
        ...(currentSettings.paidFeatures || {}),
        ...(validated.freeListingsLimit !== undefined ? { freeListingsLimit: validated.freeListingsLimit } : {}),
        ...(validated.extraListingFee !== undefined ? { extraListingFee: validated.extraListingFee } : {}),
      };
    }

    if (Object.keys(validated).length === 0) {
      return await this.getSettings();
    }

    const updated = await adminRepository.updateSystemSettings(validated);
    await invalidateSettingsReferenceCache();
    await this.recordAudit(
      'SETTINGS_UPDATED',
      'Settings',
      'primary',
      'System Settings',
      'Updated platform settings',
      actor?.id,
      actor?.name,
      actor?.ipAddress
    );
    return updated;
  }

  // CMS Pages
  public async getCmsPages(): Promise<CmsPage[]> {
    return await cmsRepository.findAllPages();
  }

  public async getCmsPageBySlug(slug: string): Promise<CmsPage | null> {
    return await cmsRepository.findBySlug(slug);
  }

  public async updateCmsPage(
    id: string, 
    updatedData: Partial<CmsPage>,
    actor?: { id?: string; name?: string; ipAddress?: string }
  ): Promise<CmsPage | null> {
    const fields: any = {};
    if (updatedData.title !== undefined) fields.title = updatedData.title;
    if (updatedData.content !== undefined) fields.content = updatedData.content;
    if (updatedData.seoTitle !== undefined) fields.seoTitle = updatedData.seoTitle;
    if (updatedData.seoDescription !== undefined) fields.seoDescription = updatedData.seoDescription;
    if (updatedData.isActive !== undefined) fields.isActive = updatedData.isActive;

    const updated = await cmsRepository.updatePage(id, fields);
    if (updated) {
      await this.recordAudit(
        'CMS_PAGE_UPDATED',
        'CMS',
        id,
        updated.title,
        `Updated CMS page "${updated.title}"`,
        actor?.id,
        actor?.name,
        actor?.ipAddress
      );
    }
    return updated;
  }

  public async addCmsPage(
    data: Omit<CmsPage, 'id' | 'updatedAt'>,
    actor?: { id?: string; name?: string; ipAddress?: string }
  ): Promise<CmsPage> {
    const id = `p_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
    const created = await cmsRepository.createPage({
      id,
      slug: data.slug,
      title: data.title,
      content: data.content,
      seoTitle: data.seoTitle,
      seoDescription: data.seoDescription,
    });
    await this.recordAudit(
      'CMS_PAGE_CREATED',
      'CMS',
      id,
      created.title,
      `Created CMS page "${created.title}"`,
      actor?.id,
      actor?.name,
      actor?.ipAddress
    );
    return created;
  }

  public async deleteCmsPage(
    id: string,
    actor?: { id?: string; name?: string; ipAddress?: string }
  ): Promise<boolean> {
    const page = await cmsRepository.findById(id);
    const success = await cmsRepository.deletePage(id);
    if (success && page) {
      await this.recordAudit(
        'CMS_PAGE_DELETED',
        'CMS',
        id,
        page.title,
        `Deleted CMS page "${page.title}"`,
        actor?.id,
        actor?.name,
        actor?.ipAddress
      );
    }
    return success;
  }

  // Audit Logging
  public async recordAudit(
    action: string,
    module: string,
    targetId: string,
    targetSummary: string,
    details: string,
    adminId?: string,
    adminName?: string,
    ipAddress?: string
  ): Promise<AuditLog> {
    return await adminRepository.createAuditLog({
      adminId: adminId || 'system',
      adminName: adminName || 'System',
      action,
      module,
      targetId,
      targetSummary,
      details,
      ipAddress: ipAddress || 'unknown',
    });
  }

  public async getAuditLogs(): Promise<AuditLog[]> {
    return await adminRepository.findAllAuditLogs();
  }
}

export const adminService = new AdminService();
