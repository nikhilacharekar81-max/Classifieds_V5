'use client';

import React from 'react';
import { ShieldAlert, Lock, ArrowLeft } from 'lucide-react';
import { useApp } from '@/context/AppContext';
import { canAccessAdmin, hasPermission, RolePermissions } from '@/lib/auth/roles';
import { navigateTo } from '@/lib/router/useRouter';
import { AdminSidebar } from '@/components/admin/AdminSidebar';
import { AdminHeader } from '@/components/admin/AdminHeader';
import { DashboardModule } from '@/components/admin/modules/DashboardModule';
import { ListingsModule } from '@/components/admin/modules/ListingsModule';
import { CategoriesModule } from '@/components/admin/modules/CategoriesModule';
import { AttributesModule } from '@/components/admin/modules/AttributesModule';
import { UsersModule } from '@/components/admin/modules/UsersModule';
import { ModerationModule } from '@/components/admin/modules/ModerationModule';
import { CommerceModule } from '@/components/admin/modules/CommerceModule';
import { LocationsModule } from '@/components/admin/modules/LocationsModule';
import { AdvertisingModule } from '@/components/admin/modules/AdvertisingModule';
import { CommunicationModule } from '@/components/admin/modules/CommunicationModule';
import { CmsSeoModule } from '@/components/admin/modules/CmsSeoModule';
import { AnalyticsModule } from '@/components/admin/modules/AnalyticsModule';
import { AdminSettingsModule } from '@/components/admin/modules/AdminSettingsModule';
import { EmailManagementModule } from '@/components/admin/modules/EmailManagementModule';
import { PaidFeaturesModule } from '@/components/admin/modules/PaidFeaturesModule';
import { GlobalSearchPage } from '@/components/admin/pages/GlobalSearchPage';
import { KycVerificationPage } from '@/components/admin/pages/KycVerificationPage';

interface RouteAccessRule {
  requiredPermission?: keyof RolePermissions;
  requireActualAdmin?: boolean;
}

export function getAdminRouteAccessRule(path: string, activeSidebarTab: string): RouteAccessRule {
  if (path.startsWith('/admin/users/kyc/')) {
    return { requireActualAdmin: true };
  }
  if (path === '/admin/search' || path.startsWith('/admin/search')) {
    return { requiredPermission: 'canAccessAdmin' };
  }

  const sub = path.replace(/^\/admin\/?/, '') || activeSidebarTab || 'dashboard';

  if (sub === 'users/verification' || sub.startsWith('users/kyc')) {
    return { requireActualAdmin: true };
  }
  if (sub.startsWith('users/')) {
    return { requiredPermission: 'canManageUsers' };
  }
  if (sub.startsWith('marketplace/categories') || sub.startsWith('marketplace/attributes')) {
    return { requiredPermission: 'canManageCategories' };
  }
  if (sub === 'marketplace/locations') {
    return { requiredPermission: 'canManageSettings' };
  }
  if (sub.startsWith('marketplace/')) {
    return { requiredPermission: 'canModerateListings' };
  }
  if (sub.startsWith('moderation/')) {
    return { requiredPermission: 'canModerateListings' };
  }
  if (
    sub === 'paid-features' ||
    sub.startsWith('commerce/') ||
    sub.startsWith('advertising/') ||
    sub === 'analytics/revenue'
  ) {
    return { requiredPermission: 'canManageFinance' };
  }
  if (sub.startsWith('cms/') || sub.startsWith('seo/')) {
    return { requiredPermission: 'canManageCms' };
  }
  if (
    sub === 'email' ||
    sub.startsWith('email/') ||
    sub.startsWith('communication/') ||
    sub.startsWith('admin/') ||
    sub.startsWith('analytics/')
  ) {
    return { requiredPermission: 'canManageSettings' };
  }

  return { requiredPermission: 'canAccessAdmin' };
}

function renderAdminModule(path: string, activeSidebarTab: string) {
  if (path.startsWith('/admin/users/kyc/')) {
    const userId = path.split('/')[4];
    return <KycVerificationPage userId={userId} />;
  }

  if (path === '/admin/search' || path.startsWith('/admin/search')) {
    return <GlobalSearchPage />;
  }

  const sub = path.replace(/^\/admin\/?/, '') || activeSidebarTab || 'dashboard';

  if (sub.startsWith('marketplace/categories')) {
    return <CategoriesModule />;
  }
  if (sub.startsWith('marketplace/attributes')) {
    return <AttributesModule />;
  }
  if (sub.startsWith('commerce/packages')) {
    return <CommerceModule />;
  }
  if (sub.startsWith('moderation/rules')) {
    return <ModerationModule />;
  }
  if (sub.startsWith('email/')) {
    const tab = sub.replace('email/', '') as any;
    return <EmailManagementModule initialTab={tab || 'dashboard'} />;
  }

  switch (sub) {
    case 'dashboard':
      return <DashboardModule />;

    case 'email':
    case 'email/dashboard':
      return <EmailManagementModule initialTab="dashboard" />;
    case 'email/send':
      return <EmailManagementModule initialTab="send" />;
    case 'email/campaigns':
      return <EmailManagementModule initialTab="campaigns" />;
    case 'email/templates':
      return <EmailManagementModule initialTab="templates" />;
    case 'email/settings':
      return <EmailManagementModule initialTab="settings" />;
    case 'email/logs':
      return <EmailManagementModule initialTab="logs" />;

    case 'marketplace/listings':
      return <ListingsModule initialStatusFilter="all" />;
    case 'marketplace/pending':
      return <ListingsModule initialStatusFilter="pending" />;
    case 'marketplace/expired':
      return <ListingsModule initialStatusFilter="expired" />;
    case 'marketplace/featured':
      return <ListingsModule initialStatusFilter="all" />;
    case 'marketplace/locations':
      return <LocationsModule />;

    case 'users/all':
      return <UsersModule initialTab="all" />;
    case 'users/regular':
      return <UsersModule initialTab="users" />;
    case 'users/businesses':
      return <UsersModule initialTab="businesses" />;
    case 'users/verification':
      return <UsersModule initialTab="verification" />;
    case 'users/banned':
      return <UsersModule initialTab="banned" />;

    case 'moderation/reports':
    case 'moderation/spam':
    case 'moderation/fraud':
    case 'moderation/rules':
    case 'moderation/reviews':
      return <ModerationModule />;

    case 'paid-features':
      return <PaidFeaturesModule />;

    case 'commerce/orders':
    case 'commerce/transactions':
    case 'commerce/subscriptions':
    case 'commerce/packages':
    case 'commerce/coupons':
    case 'commerce/refunds':
    case 'commerce/taxes':
      return <CommerceModule />;

    case 'advertising/campaigns':
    case 'advertising/banners':
    case 'advertising/sponsored':
    case 'advertising/advertisers':
      return <AdvertisingModule />;

    case 'communication/messages':
    case 'communication/email':
    case 'communication/sms':
    case 'communication/push':
    case 'communication/templates':
      return <CommunicationModule />;

    case 'cms/pages':
    case 'cms/blog':
    case 'cms/faq':
    case 'cms/media':
    case 'cms/menus':
    case 'seo/metadata':
    case 'seo/redirects':
    case 'seo/sitemap':
    case 'seo/templates':
      return <CmsSeoModule />;

    case 'analytics/marketplace':
    case 'analytics/users':
    case 'analytics/listings':
    case 'analytics/revenue':
    case 'analytics/reports':
      return <AnalyticsModule />;

    case 'admin/users':
    case 'admin/roles':
    case 'admin/logs':
    case 'admin/settings':
    case 'admin/gateways':
    case 'admin/integrations':
      return <AdminSettingsModule />;

    default:
      return <DashboardModule />;
  }
}

export interface AdminWorkspaceRouterProps {
  path: string;
  activeSidebarTab: string;
  theme: 'light' | 'dark';
}

export const AdminWorkspaceRouter: React.FC<AdminWorkspaceRouterProps> = ({
  path,
  activeSidebarTab,
  theme,
}) => {
  const { currentAdmin, isAuthChecking, setActiveSidebarTab } = useApp();

  if (isAuthChecking) {
    return (
      <div className={`min-h-screen bg-slate-100 dark:bg-slate-950 flex items-center justify-center p-6 ${theme === 'dark' ? 'dark' : ''}`}>
        <div className="text-center">
          <div className="w-10 h-10 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-sm font-semibold text-slate-600 dark:text-slate-300">Verifying administrator session...</p>
        </div>
      </div>
    );
  }

  if (!currentAdmin || !canAccessAdmin(currentAdmin.role)) {
    return (
      <div className={`min-h-screen bg-slate-100 dark:bg-slate-950 flex items-center justify-center p-6 ${theme === 'dark' ? 'dark' : ''}`}>
        <div className="max-w-md w-full bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm p-8 text-center">
          <div className="w-14 h-14 rounded-2xl bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-800 text-rose-600 flex items-center justify-center mx-auto mb-4">
            <ShieldAlert className="w-7 h-7" />
          </div>
          <h1 className="text-xl font-bold text-slate-900 dark:text-white mb-2">Administrator Access Required</h1>
          <p className="text-sm text-slate-600 dark:text-slate-400 mb-6">
            You do not have permission to access the administrative console. Please sign in with an authorized staff or administrator account.
          </p>
          <button
            type="button"
            onClick={() => navigateTo('/')}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-bold transition-colors cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
            Return to Marketplace
          </button>
        </div>
      </div>
    );
  }

  const isActualAdmin = currentAdmin.role === 'admin' || currentAdmin.role === 'super_admin';
  const accessRule = getAdminRouteAccessRule(path, activeSidebarTab);
  const isModuleAuthorized = accessRule.requireActualAdmin
    ? isActualAdmin
    : accessRule.requiredPermission
    ? hasPermission(currentAdmin.role, accessRule.requiredPermission)
    : true;

  return (
    <div
      className={`min-h-screen bg-slate-100 dark:bg-slate-950 flex transition-colors ${
        theme === 'dark' ? 'dark' : ''
      }`}
    >
      <AdminSidebar />
      <div className="flex-1 flex flex-col min-w-0 overflow-y-auto overflow-x-hidden h-screen">
        <AdminHeader />
        <main className="flex-1 pb-16">
          {isModuleAuthorized ? (
            renderAdminModule(path, activeSidebarTab)
          ) : (
            <div className="max-w-lg mx-auto my-12 bg-white dark:bg-slate-900 rounded-2xl border border-amber-200 dark:border-amber-800 shadow-sm p-8 text-center">
              <div className="w-12 h-12 rounded-xl bg-amber-50 dark:bg-amber-950/50 border border-amber-200 dark:border-amber-800 text-amber-600 flex items-center justify-center mx-auto mb-4">
                <Lock className="w-6 h-6" />
              </div>
              <h2 className="text-lg font-bold text-slate-900 dark:text-white mb-2">Insufficient Role Permissions</h2>
              <p className="text-sm text-slate-600 dark:text-slate-400 mb-6">
                Your current role (<span className="font-semibold">{currentAdmin.role}</span>) is not authorized to view or modify this administrative module.
              </p>
              <button
                type="button"
                onClick={() => {
                  setActiveSidebarTab('dashboard');
                  navigateTo('/admin/dashboard');
                }}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-900 dark:bg-slate-800 hover:bg-slate-800 text-white text-xs font-bold transition-colors cursor-pointer"
              >
                Back to Workspace Overview
              </button>
            </div>
          )}
        </main>
      </div>
    </div>
  );
};

