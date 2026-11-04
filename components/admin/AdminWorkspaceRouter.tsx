'use client';

import React from 'react';
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
  return (
    <div
      className={`min-h-screen bg-slate-100 dark:bg-slate-950 flex transition-colors ${
        theme === 'dark' ? 'dark' : ''
      }`}
    >
      <AdminSidebar />
      <div className="flex-1 flex flex-col min-w-0 overflow-y-auto overflow-x-hidden h-screen">
        <AdminHeader />
        <main className="flex-1 pb-16">{renderAdminModule(path, activeSidebarTab)}</main>
      </div>
    </div>
  );
};
