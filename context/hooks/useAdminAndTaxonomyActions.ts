'use client';
import React from 'react';
import {
  Category,
  CustomFieldDefinition,
  LocationItem,
  UserAccount,
  Listing,
  ReportItem,
  ModerationRule,
  PromotionalPackage,
  SystemSettings,
  CmsPage,
  ToastMessage,
} from '@/lib/types';

interface UseAdminAndTaxonomyActionsParams {
  categories: Category[];
  setCategories: React.Dispatch<React.SetStateAction<Category[]>>;
  customFields: CustomFieldDefinition[];
  setCustomFields: React.Dispatch<React.SetStateAction<CustomFieldDefinition[]>>;
  locations: LocationItem[];
  setLocations: React.Dispatch<React.SetStateAction<LocationItem[]>>;
  users: UserAccount[];
  setUsers: React.Dispatch<React.SetStateAction<UserAccount[]>>;
  currentUser: UserAccount;
  setListings: React.Dispatch<React.SetStateAction<Listing[]>>;
  setReports: React.Dispatch<React.SetStateAction<ReportItem[]>>;
  rules: ModerationRule[];
  setRules: React.Dispatch<React.SetStateAction<ModerationRule[]>>;
  packages: PromotionalPackage[];
  setPackages: React.Dispatch<React.SetStateAction<PromotionalPackage[]>>;
  setSettings: React.Dispatch<React.SetStateAction<SystemSettings>>;
  cmsPages: CmsPage[];
  setCmsPages: React.Dispatch<React.SetStateAction<CmsPage[]>>;
  setReportModalConfig: React.Dispatch<
    React.SetStateAction<{ open: boolean; type?: 'ad' | 'user'; targetId?: string; targetTitle?: string } | null>
  >;
  addToast: (toast: Omit<ToastMessage, 'id'>) => void;
  recordAuditLog: (action: string, module: string, targetId: string, targetSummary: string, details: string) => void;
}

export function useAdminAndTaxonomyActions({
  categories,
  setCategories,
  customFields,
  setCustomFields,
  locations,
  setLocations,
  users,
  setUsers,
  currentUser,
  setListings,
  setReports,
  rules,
  setRules,
  packages,
  setPackages,
  setSettings,
  cmsPages,
  setCmsPages,
  setReportModalConfig,
  addToast,
  recordAuditLog,
}: UseAdminAndTaxonomyActionsParams) {
  const updateCmsPage = (updatedPage: CmsPage) => {
    fetch(`/api/admin/cms/${updatedPage.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updatedPage),
    })
      .then((res) => {
        if (!res.ok) {
          console.error(`Failed to update CMS page ${updatedPage.id}: ${res.statusText}`);
          addToast({
            type: 'error',
            title: 'Update Failed',
            message: 'Failed to save page content on server.',
          });
          return;
        }

        setCmsPages((prev) =>
          prev.map((p) =>
            p.id === updatedPage.id ? { ...updatedPage, updatedAt: new Date().toISOString().split('T')[0] } : p
          )
        );
        addToast({
          type: 'success',
          title: 'Page Content Saved',
          message: `Updated "${updatedPage.title}" (${updatedPage.slug}).`,
        });
      })
      .catch((err) => {
        console.error(`Error updating CMS page ${updatedPage.id}:`, err);
        addToast({
          type: 'error',
          title: 'Network Error',
          message: 'Unable to connect to server.',
        });
      });
  };

  const addCmsPage = (newPage: Omit<CmsPage, 'id' | 'updatedAt'>) => {
    const page: CmsPage = {
      ...newPage,
      id: `p_${Date.now()}`,
      updatedAt: new Date().toISOString().split('T')[0],
    };

    fetch('/api/admin/cms', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(page),
    })
      .then((res) => {
        if (!res.ok) {
          console.error(`Failed to create CMS page: ${res.statusText}`);
          addToast({
            type: 'error',
            title: 'Creation Failed',
            message: 'Failed to create page on server.',
          });
          return;
        }

        setCmsPages((prev) => [page, ...prev]);
        addToast({
          type: 'success',
          title: 'New Page Published',
          message: `Page "${page.title}" created successfully.`,
        });
      })
      .catch((err) => {
        console.error('Error creating CMS page:', err);
        addToast({
          type: 'error',
          title: 'Network Error',
          message: 'Unable to connect to server.',
        });
      });
  };

  const deleteCmsPage = (id: string) => {
    const target = cmsPages.find((p) => p.id === id);

    fetch(`/api/admin/cms/${id}`, {
      method: 'DELETE',
    })
      .then((res) => {
        if (!res.ok) {
          console.error(`Failed to delete CMS page ${id}: ${res.statusText}`);
          addToast({
            type: 'error',
            title: 'Delete Failed',
            message: 'Failed to delete page on server.',
          });
          return;
        }

        setCmsPages((prev) => prev.filter((p) => p.id !== id));
        addToast({
          type: 'warning',
          title: 'Page Deleted',
          message: target ? `Removed page "${target.title}".` : 'Page deleted.',
        });
      })
      .catch((err) => {
        console.error(`Error deleting CMS page ${id}:`, err);
        addToast({
          type: 'error',
          title: 'Network Error',
          message: 'Unable to connect to server.',
        });
      });
  };

  const submitReport = (reportData: {
    targetType: 'listing' | 'user';
    targetId: string;
    targetTitle: string;
    reason: string;
    comments: string;
  }) => {
    const validReasons: Record<string, ReportItem['reason']> = {
      spam: 'spam',
      prohibited: 'prohibited_item',
      prohibited_item: 'prohibited_item',
      fraud: 'fraud_scam',
      fraud_scam: 'fraud_scam',
      offensive: 'offensive',
      duplicate: 'duplicate',
      wrong_category: 'wrong_category',
    };

    const parsedReason = validReasons[reportData.reason] || 'spam';

    void (async () => {
      try {
        const res = await fetch('/api/reports', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            targetType: reportData.targetType,
            targetId: reportData.targetId,
            targetTitle: reportData.targetTitle,
            reason: parsedReason,
            notes: reportData.comments || 'User submitted report',
          }),
        });
        const data = await res.json().catch(() => null);
        if (!res.ok) {
          throw new Error(data?.error || 'Failed to submit report');
        }
        const createdReport: ReportItem = {
          id: data.report?.id || `rep_${Date.now()}`,
          type: reportData.targetType,
          targetId: reportData.targetId,
          targetTitle: reportData.targetTitle,
          reportedBy: currentUser ? currentUser.id : 'usr_anon',
          reportedByName: currentUser ? currentUser.name : 'Anonymous User',
          reason: parsedReason,
          notes: reportData.comments || 'User submitted report',
          createdAt: new Date().toISOString().replace('T', ' ').substring(0, 16),
          status: 'pending',
        };
        setReports((prev) => [createdReport, ...prev]);
        addToast({
          type: 'success',
          title: 'Report Submitted',
          message: 'Thank you for reporting. Our moderation team has received your report and will review it.',
        });
      } catch (err: any) {
        addToast({
          type: 'error',
          title: 'Report Submission Failed',
          message: err?.message || 'Unable to submit report at this time.',
        });
      } finally {
        setReportModalConfig(null);
      }
    })();
  };

  const addCategory = (catData: Omit<Category, 'id' | 'listingCount'>) => {
    const prefix = catData.parentId ? 'sub_' : 'cat_';
    const baseId = prefix + (catData.slug || 'item').replace(/[^a-z0-9]/g, '_');
    let id = baseId;
    let counter = 1;
    while (categories.some((c) => c.id === id)) {
      id = `${baseId}_${counter++}`;
    }
    const payload: Category = { ...catData, id, listingCount: 0 };

    void (async () => {
      try {
        const res = await fetch('/api/admin/categories', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        const data = await res.json().catch(() => null);
        if (!res.ok) {
          throw new Error(data?.error || 'Failed to create category');
        }
        const createdCat: Category = data && data.id ? { ...payload, ...data } : payload;
        setCategories((prev) => [...prev, createdCat]);
        recordAuditLog(
          catData.parentId ? 'CREATE_SUBCATEGORY' : 'CREATE_CATEGORY',
          'Marketplace / Categories',
          createdCat.id,
          createdCat.name,
          catData.parentId
            ? 'Added new subcategory under parent category'
            : 'Added new category via configuration panel'
        );
        addToast({
          type: 'success',
          title: catData.parentId ? 'Subcategory Created' : 'Category Created',
          message: `"${createdCat.name}" has been added to taxonomy.`,
        });
      } catch (err: any) {
        addToast({
          type: 'error',
          title: catData.parentId ? 'Subcategory Creation Failed' : 'Category Creation Failed',
          message: err?.message || 'Database operation failed.',
        });
      }
    })();
  };

  const updateCategory = (cat: Category) => {
    void (async () => {
      try {
        const res = await fetch(`/api/admin/categories/${cat.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(cat),
        });
        const data = await res.json().catch(() => null);
        if (!res.ok) {
          throw new Error(data?.error || 'Failed to update category');
        }
        const updatedCat: Category = data && data.id ? { ...cat, ...data, listingCount: cat.listingCount } : cat;
        setCategories((prev) => prev.map((c) => (c.id === cat.id ? updatedCat : c)));
        recordAuditLog(
          'UPDATE_CATEGORY',
          'Marketplace / Categories',
          cat.id,
          updatedCat.name,
          'Updated category SEO & hierarchy configuration'
        );
        addToast({ type: 'success', title: 'Category Updated', message: updatedCat.name });
      } catch (err: any) {
        addToast({
          type: 'error',
          title: 'Category Update Failed',
          message: err?.message || 'Database operation failed.',
        });
      }
    })();
  };

  const toggleCategoryStatus = (id: string) => {
    const target = categories.find((c) => c.id === id);
    if (!target) return;
    const updatedStatus = !target.isActive;

    void (async () => {
      try {
        const res = await fetch(`/api/admin/categories/${id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ isActive: updatedStatus }),
        });
        const data = await res.json().catch(() => null);
        if (!res.ok) {
          throw new Error(data?.error || 'Failed to update category status');
        }
        setCategories((prev) => prev.map((c) => (c.id === id ? { ...c, isActive: updatedStatus } : c)));
      } catch (err: any) {
        addToast({
          type: 'error',
          title: 'Status Update Failed',
          message: err?.message || 'Database operation failed.',
        });
      }
    })();
  };

  const deleteCategory = (id: string) => {
    const cat = categories.find((c) => c.id === id);

    void (async () => {
      try {
        const res = await fetch(`/api/admin/categories/${id}`, {
          method: 'DELETE',
        });
        const data = await res.json().catch(() => null);
        if (!res.ok) {
          throw new Error(data?.error || 'Failed to delete category');
        }
        setCategories((prev) => prev.filter((c) => c.id !== id && c.parentId !== id));
        if (cat) {
          recordAuditLog(
            'DELETE_CATEGORY',
            'Marketplace / Categories',
            id,
            cat.name,
            'Deleted category and associated subcategories'
          );
          addToast({ type: 'warning', title: 'Category Deleted', message: cat.name });
        }
      } catch (err: any) {
        addToast({
          type: 'error',
          title: 'Category Deletion Failed',
          message: err?.message || 'Database operation failed.',
        });
      }
    })();
  };

  const addCustomField = (field: Omit<CustomFieldDefinition, 'id'>) => {
    const id = 'cf_' + field.name + '_' + Math.random().toString(36).substring(2, 6);
    const newField: CustomFieldDefinition = { ...field, id };
    setCustomFields((prev) => [...prev, newField]);
    recordAuditLog(
      'ADD_CUSTOM_ATTRIBUTE',
      'Marketplace / Attributes',
      id,
      field.label,
      `Bound dynamic field to category ${field.categoryId}`
    );
    addToast({ type: 'success', title: 'Custom Field Added', message: field.label });
  };

  const updateCustomField = (field: CustomFieldDefinition) => {
    setCustomFields((prev) => prev.map((f) => (f.id === field.id ? field : f)));
    recordAuditLog(
      'UPDATE_CUSTOM_ATTRIBUTE',
      'Marketplace / Attributes',
      field.id,
      field.label,
      'Updated dynamic attribute specification'
    );
    addToast({ type: 'success', title: 'Attribute Updated', message: field.label });
  };

  const deleteCustomField = (id: string) => {
    const field = customFields.find((f) => f.id === id);
    setCustomFields((prev) => prev.filter((f) => f.id !== id));
    if (field) {
      recordAuditLog('DELETE_CUSTOM_ATTRIBUTE', 'Marketplace / Attributes', id, field.label, 'Removed custom field');
    }
    addToast({ type: 'warning', title: 'Attribute Deleted', message: '' });
  };

  const addLocation = (locData: Omit<LocationItem, 'id' | 'listingCount'>) => {
    const id =
      'loc_' +
      (locData.code ? locData.code.toLowerCase() : locData.name.toLowerCase().replace(/[^a-z0-9]/g, '_'));
    const newLoc: LocationItem = {
      ...locData,
      id,
      listingCount: 0,
    };

    fetch('/api/admin/locations', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newLoc),
    })
      .then((res) => {
        if (!res.ok) {
          console.error(`Failed to add location: ${res.statusText}`);
          addToast({
            type: 'error',
            title: 'Creation Failed',
            message: 'Failed to add location on server.',
          });
          return;
        }
        setLocations((prev) => [...prev, newLoc]);
        recordAuditLog(
          'CREATE_LOCATION',
          'Marketplace / Locations',
          id,
          newLoc.name,
          `Created ${newLoc.type} in Country -> City hierarchy`
        );
        addToast({
          type: 'success',
          title: `${newLoc.type === 'country' ? 'Country' : 'City'} Added`,
          message: newLoc.name,
        });
      })
      .catch((err) => {
        console.error('Error adding location:', err);
        addToast({
          type: 'error',
          title: 'Network Error',
          message: 'Unable to connect to server.',
        });
      });
  };

  const updateLocation = (loc: LocationItem) => {
    fetch(`/api/admin/locations/${loc.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(loc),
    })
      .then((res) => {
        if (!res.ok) {
          console.error(`Failed to update location: ${res.statusText}`);
          addToast({
            type: 'error',
            title: 'Update Failed',
            message: 'Failed to update location on server.',
          });
          return;
        }
        setLocations((prev) => prev.map((l) => (l.id === loc.id ? loc : l)));
        recordAuditLog('UPDATE_LOCATION', 'Marketplace / Locations', loc.id, loc.name, `Updated location details`);
        addToast({ type: 'success', title: 'Location Updated', message: loc.name });
      })
      .catch((err) => {
        console.error('Error updating location:', err);
        addToast({
          type: 'error',
          title: 'Network Error',
          message: 'Unable to connect to server.',
        });
      });
  };

  const deleteLocation = (id: string) => {
    const loc = locations.find((l) => l.id === id);
    fetch(`/api/admin/locations/${id}`, {
      method: 'DELETE',
    })
      .then((res) => {
        if (!res.ok) {
          console.error(`Failed to delete location: ${res.statusText}`);
          addToast({
            type: 'error',
            title: 'Delete Failed',
            message: 'Failed to delete location on server.',
          });
          return;
        }
        setLocations((prev) => prev.filter((l) => l.id !== id && l.parentId !== id));
        if (loc) {
          recordAuditLog('DELETE_LOCATION', 'Marketplace / Locations', id, loc.name, `Deleted location and linked cities`);
          addToast({ type: 'warning', title: 'Location Removed', message: loc.name });
        }
      })
      .catch((err) => {
        console.error('Error deleting location:', err);
        addToast({
          type: 'error',
          title: 'Network Error',
          message: 'Unable to connect to server.',
        });
      });
  };

  const toggleLocationPopular = (id: string) => {
    const target = locations.find((l) => l.id === id);
    if (!target) return;
    const updatedPopular = !target.popular;
    fetch(`/api/admin/locations/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ popular: updatedPopular }),
    })
      .then((res) => {
        if (!res.ok) {
          console.error(`Failed to toggle location popular: ${res.statusText}`);
          addToast({
            type: 'error',
            title: 'Update Failed',
            message: 'Failed to update popular location status.',
          });
          return;
        }
        setLocations((prev) => prev.map((l) => (l.id === id ? { ...l, popular: updatedPopular } : l)));
      })
      .catch((err) => {
        console.error('Error toggling location popular:', err);
        addToast({
          type: 'error',
          title: 'Network Error',
          message: 'Unable to connect to server.',
        });
      });
  };

  const updateUser = (updatedUser: UserAccount) => {
    fetch(`/api/admin/users/${updatedUser.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updatedUser),
    })
      .then((res) => {
        if (!res.ok) {
          console.error(`Failed to update user ${updatedUser.id}: ${res.statusText}`);
          addToast({
            type: 'error',
            title: 'Action Failed',
            message: 'Failed to update profile settings on server.',
          });
          return;
        }
        setUsers((prev) => prev.map((u) => (u.id === updatedUser.id ? updatedUser : u)));
        addToast({
          type: 'success',
          title: 'Profile Updated',
          message: 'Your account settings have been saved.',
        });
      })
      .catch((err) => {
        console.error(`Error updating user ${updatedUser.id}:`, err);
        addToast({
          type: 'error',
          title: 'Network Error',
          message: 'Unable to connect to server.',
        });
      });
  };

  const verifyUserKyc = (userId: string, status: 'verified' | 'rejected') => {
    const user = users.find((u) => u.id === userId);
    if (!user) return;
    fetch('/api/admin/users', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'verify_kyc', userId, status }),
    })
      .then((res) => {
        if (!res.ok) {
          console.error(`Failed to update KYC status for user ${userId}: ${res.statusText}`);
          addToast({
            type: 'error',
            title: 'Action Failed',
            message: 'Failed to persist KYC decision on server.',
          });
          return;
        }
        setUsers((prev) => prev.map((u) => (u.id === userId ? { ...u, kycStatus: status } : u)));
        recordAuditLog(
          status === 'verified' ? 'VERIFY_USER_KYC' : 'REJECT_USER_KYC',
          'Users / Verification',
          userId,
          user.name,
          `Manual KYC status set to ${status}`
        );
        addToast({
          type: status === 'verified' ? 'success' : 'error',
          title: status === 'verified' ? 'User KYC Verified' : 'User KYC Rejected',
          message: user.name,
        });
      })
      .catch((err) => {
        console.error(`Error updating KYC status for user ${userId}:`, err);
        addToast({
          type: 'error',
          title: 'Network Error',
          message: 'Unable to connect to server.',
        });
      });
  };

  const banUser = (userId: string, reason: string) => {
    const user = users.find((u) => u.id === userId);
    if (!user) return;
    fetch('/api/admin/users', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'ban', userId, reason }),
    })
      .then((res) => {
        if (!res.ok) {
          console.error(`Failed to ban user ${userId}: ${res.statusText}`);
          addToast({
            type: 'error',
            title: 'Action Failed',
            message: 'Failed to record user ban on server.',
          });
          return;
        }
        setUsers((prev) => prev.map((u) => (u.id === userId ? { ...u, status: 'banned' as const } : u)));
        setListings((prev) =>
          prev.map((l) =>
            l.sellerId === userId ? { ...l, status: 'rejected' as const, rejectionReason: 'Seller account suspended' } : l
          )
        );
        recordAuditLog('BAN_USER', 'Users / Safety', userId, user.name, `Banned user and suspended all ads. Reason: ${reason}`);
        addToast({
          type: 'error',
          title: 'User Banned',
          message: `${user.name} has been banned. All active listings taken down.`,
        });
      })
      .catch((err) => {
        console.error(`Error banning user ${userId}:`, err);
        addToast({
          type: 'error',
          title: 'Network Error',
          message: 'Unable to connect to server.',
        });
      });
  };

  const unbanUser = (userId: string) => {
    const user = users.find((u) => u.id === userId);
    if (!user) return;
    fetch('/api/admin/users', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'unban', userId }),
    })
      .then((res) => {
        if (!res.ok) {
          console.error(`Failed to unban user ${userId}: ${res.statusText}`);
          addToast({
            type: 'error',
            title: 'Action Failed',
            message: 'Failed to reactivate user on server.',
          });
          return;
        }
        setUsers((prev) => prev.map((u) => (u.id === userId ? { ...u, status: 'active' as const } : u)));
        recordAuditLog('UNBAN_USER', 'Users / Safety', userId, user.name, 'Reactivated user account');
        addToast({
          type: 'success',
          title: 'User Re-activated',
          message: `${user.name} account restored to active status.`,
        });
      })
      .catch((err) => {
        console.error(`Error unbanning user ${userId}:`, err);
        addToast({
          type: 'error',
          title: 'Network Error',
          message: 'Unable to connect to server.',
        });
      });
  };

  const actionReport = (reportId: string, actionNote: string, actionType: 'actioned' | 'dismissed') => {
    fetch('/api/admin/moderation', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'action_report', reportId, note: actionNote, actionType }),
    })
      .then((res) => {
        if (!res.ok) {
          console.error(`Failed to action report ${reportId}: ${res.statusText}`);
          addToast({
            type: 'error',
            title: 'Action Failed',
            message: 'Failed to process report on server.',
          });
          return;
        }
        setReports((prev) =>
          prev.map((r) =>
            r.id === reportId
              ? {
                  ...r,
                  status: actionType,
                  actionTaken: actionNote,
                }
              : r
          )
        );
        recordAuditLog('MODERATE_REPORT', 'Moderation / Queue', reportId, actionType, actionNote);
        addToast({
          type: 'info',
          title: 'Report Processed',
          message: `Status: ${actionType.toUpperCase()}`,
        });
      })
      .catch((err) => {
        console.error(`Error actioning report ${reportId}:`, err);
        addToast({
          type: 'error',
          title: 'Network Error',
          message: 'Unable to connect to server.',
        });
      });
  };

  const addModerationRule = (rule: Omit<ModerationRule, 'id'>) => {
    const id = 'rule_' + Date.now();
    fetch('/api/admin/moderation', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'add_rule', ruleData: { ...rule, id } }),
    })
      .then((res) => {
        if (!res.ok) {
          console.error(`Failed to add moderation rule: ${res.statusText}`);
          addToast({
            type: 'error',
            title: 'Rule Creation Failed',
            message: 'Failed to create moderation rule on server.',
          });
          return;
        }
        setRules((prev) => [...prev, { ...rule, id }]);
        recordAuditLog('CREATE_MODERATION_RULE', 'Moderation / Rules', id, rule.title, `Automated action: ${rule.action}`);
        addToast({ type: 'success', title: 'Moderation Rule Created', message: rule.title });
      })
      .catch((err) => {
        console.error('Error adding moderation rule:', err);
        addToast({
          type: 'error',
          title: 'Network Error',
          message: 'Unable to connect to server.',
        });
      });
  };

  const toggleModerationRule = (id: string) => {
    const target = rules.find((r) => r.id === id);
    if (!target) return;
    const updated = !target.isActive;
    fetch('/api/admin/moderation', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'toggle_rule', ruleData: { id } }),
    })
      .then((res) => {
        if (!res.ok) {
          console.error(`Failed to toggle moderation rule: ${res.statusText}`);
          addToast({
            type: 'error',
            title: 'Update Failed',
            message: 'Failed to toggle rule on server.',
          });
          return;
        }
        setRules((prev) => prev.map((r) => (r.id === id ? { ...r, isActive: updated } : r)));
      })
      .catch((err) => {
        console.error('Error toggling moderation rule:', err);
        addToast({
          type: 'error',
          title: 'Network Error',
          message: 'Unable to connect to server.',
        });
      });
  };

  const addPackage = (pkg: Omit<PromotionalPackage, 'id' | 'salesCount'>) => {
    const id = 'pkg_' + Math.random().toString(36).substring(2, 7);
    const newPkg = { ...pkg, id, salesCount: 0 };
    fetch('/api/boost/packages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newPkg),
    })
      .then((res) => {
        if (!res.ok) {
          console.error(`Failed to add package: ${res.statusText}`);
          addToast({
            type: 'error',
            title: 'Creation Failed',
            message: 'Failed to create package on server.',
          });
          return;
        }
        setPackages((prev) => [...prev, newPkg]);
        recordAuditLog('CREATE_COMMERCE_PACKAGE', 'Commerce / Packages', id, pkg.name, `Price: ₹${pkg.price}`);
        addToast({ type: 'success', title: 'Promotional Package Added', message: pkg.name });
      })
      .catch((err) => {
        console.error('Error adding package:', err);
        addToast({
          type: 'error',
          title: 'Network Error',
          message: 'Unable to connect to server.',
        });
      });
  };

  const updatePackage = (pkg: PromotionalPackage) => {
    fetch(`/api/boost/packages/${pkg.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(pkg),
    })
      .then((res) => {
        if (!res.ok) {
          console.error(`Failed to update package: ${res.statusText}`);
          addToast({
            type: 'error',
            title: 'Update Failed',
            message: 'Failed to update package on server.',
          });
          return;
        }
        setPackages((prev) => prev.map((p) => (p.id === pkg.id ? pkg : p)));
        recordAuditLog('UPDATE_COMMERCE_PACKAGE', 'Commerce / Packages', pkg.id, pkg.name, `Price: ₹${pkg.price}`);
        addToast({ type: 'success', title: 'Package Updated', message: pkg.name });
      })
      .catch((err) => {
        console.error('Error updating package:', err);
        addToast({
          type: 'error',
          title: 'Network Error',
          message: 'Unable to connect to server.',
        });
      });
  };

  const togglePackageStatus = (id: string) => {
    const target = packages.find((p) => p.id === id);
    if (!target) return;
    const updatedStatus = !target.isActive;
    fetch(`/api/boost/packages/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ isActive: updatedStatus }),
    })
      .then((res) => {
        if (!res.ok) {
          console.error(`Failed to toggle package status: ${res.statusText}`);
          addToast({
            type: 'error',
            title: 'Update Failed',
            message: 'Failed to toggle package status on server.',
          });
          return;
        }
        setPackages((prev) => prev.map((p) => (p.id === id ? { ...p, isActive: updatedStatus } : p)));
      })
      .catch((err) => {
        console.error('Error toggling package status:', err);
        addToast({
          type: 'error',
          title: 'Network Error',
          message: 'Unable to connect to server.',
        });
      });
  };

  const updateSettings = (newSettings: Partial<SystemSettings>) => {
    void (async () => {
      try {
        const res = await fetch('/api/admin/settings', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(newSettings),
        });

        const data = await res.json().catch(() => null);
        if (!res.ok) {
          throw new Error(data?.error || 'Failed to save settings');
        }

        const updatedSettings = data && data.settings ? data.settings : newSettings;
        setSettings((prev) => ({ ...prev, ...updatedSettings }));

        recordAuditLog(
          'UPDATE_SYSTEM_SETTINGS',
          'Administration / Settings',
          'sys_config',
          'System Configuration',
          'Updated global site settings'
        );

        addToast({ type: 'success', title: 'Settings Saved', message: 'System configuration updated successfully.' });
      } catch (err: any) {
        console.error('Failed to persist settings:', err);
        addToast({
          type: 'error',
          title: 'Save Settings Failed',
          message: err?.message || 'Unable to update system configuration.',
        });
      }
    })();
  };

  const resetAllCounters = () => {
    setListings((prev) => prev.map((l) => ({ ...l, views: 0, likes: 0, chatsCount: 0, spamScore: 0 })));
    setCategories((prev) => prev.map((c) => ({ ...c, listingCount: 0 })));
    setLocations((prev) => prev.map((loc) => ({ ...loc, listingCount: 0 })));
    setUsers((prev) => prev.map((u) => ({ ...u, totalListings: 0, activeListings: 0, reviewCount: 0 })));
    setPackages((prev) => prev.map((p) => ({ ...p, salesCount: 0 })));
    recordAuditLog(
      'RESET_ALL_COUNTERS',
      'Administration / System',
      'counters',
      'System Counters Reset',
      'Reset all listing views, likes, chats, user listing counts, category counts, location counts, and package sales counts to 0'
    );
    addToast({
      type: 'success',
      title: 'All Counters Reset!',
      message: 'Listings views, likes, chats, category counts, location counts, and package sales counts have been reset to 0.',
    });
  };

  return {
    updateCmsPage,
    addCmsPage,
    deleteCmsPage,
    submitReport,
    addCategory,
    updateCategory,
    toggleCategoryStatus,
    deleteCategory,
    addCustomField,
    updateCustomField,
    deleteCustomField,
    addLocation,
    updateLocation,
    deleteLocation,
    toggleLocationPopular,
    updateUser,
    verifyUserKyc,
    banUser,
    unbanUser,
    actionReport,
    addModerationRule,
    toggleModerationRule,
    addPackage,
    updatePackage,
    togglePackageStatus,
    updateSettings,
    resetAllCounters,
  };
}
