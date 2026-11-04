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

  public async addCategory(catData: Omit<Category, 'id' | 'listingCount'>): Promise<Category> {
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
      postingFee: catData.postingFee || 0,
      freeListingsQuota: catData.freeListingsQuota || 3,
    });

    await invalidateCategoryReferenceCache();
    await this.recordAudit('CATEGORY_CREATED', 'Categories', id, category.name, `Created category "${category.name}"`);
    return category;
  }

  public async updateCategory(id: string, updatedData: Partial<Category>): Promise<Category | null> {
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
      await this.recordAudit('CATEGORY_UPDATED', 'Categories', id, updated.name, `Updated category "${updated.name}"`);
    }
    return updated;
  }

  public async deleteCategory(id: string): Promise<boolean> {
    const cat = await categoryRepository.findById(id);
    const success = await categoryRepository.delete(id);
    if (success) {
      await invalidateCategoryReferenceCache();
      if (cat) {
        await this.recordAudit('CATEGORY_DELETED', 'Categories', id, cat.name, `Deleted category "${cat.name}"`);
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

  public async addCustomField(fieldData: Omit<CustomFieldDefinition, 'id'>): Promise<CustomFieldDefinition> {
    const id = `fld_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
    const field = await categoryRepository.createCustomField({
      ...fieldData,
      id,
    });
    await this.recordAudit('ATTRIBUTE_CREATED', 'Attributes', id, field.label, `Added attribute "${field.label}"`);
    return field;
  }

  // Locations
  public async getLocations(): Promise<LocationItem[]> {
    return await locationRepository.findAll();
  }

  public async addLocation(locData: Omit<LocationItem, 'id' | 'listingCount'>): Promise<LocationItem> {
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
    return created;
  }

  public async updateLocation(id: string, updatedData: Partial<LocationItem>): Promise<LocationItem | null> {
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
    }
    return updated;
  }

  public async deleteLocation(id: string): Promise<boolean> {
    const success = await locationRepository.delete(id);
    if (success) {
      await invalidateLocationReferenceCache();
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
    const updated = await adminRepository.updateSystemSettings(newSettings);
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

  public async updateCmsPage(id: string, updatedData: Partial<CmsPage>): Promise<CmsPage | null> {
    const fields: any = {};
    if (updatedData.title !== undefined) fields.title = updatedData.title;
    if (updatedData.content !== undefined) fields.content = updatedData.content;
    if (updatedData.seoTitle !== undefined) fields.seoTitle = updatedData.seoTitle;
    if (updatedData.seoDescription !== undefined) fields.seoDescription = updatedData.seoDescription;
    if (updatedData.isActive !== undefined) fields.isActive = updatedData.isActive;

    return await cmsRepository.updatePage(id, fields);
  }

  public async addCmsPage(data: Omit<CmsPage, 'id' | 'updatedAt'>): Promise<CmsPage> {
    const id = `p_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
    return await cmsRepository.createPage({
      id,
      slug: data.slug,
      title: data.title,
      content: data.content,
      seoTitle: data.seoTitle,
      seoDescription: data.seoDescription,
    });
  }

  public async deleteCmsPage(id: string): Promise<boolean> {
    return await cmsRepository.deletePage(id);
  }

  // Audit Logging
  public async recordAudit(
    action: string,
    module: string,
    targetId: string,
    targetSummary: string,
    details: string,
    adminId = 'system',
    adminName = 'Administrator',
    ipAddress = 'unknown'
  ): Promise<AuditLog> {
    return await adminRepository.createAuditLog({
      adminId,
      adminName,
      action,
      module,
      targetId,
      targetSummary,
      details,
      ipAddress,
    });
  }

  public async getAuditLogs(): Promise<AuditLog[]> {
    return await adminRepository.findAllAuditLogs();
  }
}

export const adminService = new AdminService();
