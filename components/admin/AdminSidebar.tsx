'use client';
import React, { useState } from 'react';
import { useApp } from '@/context/AppContext';
import { useRouter } from '@/lib/router/useRouter';
import {
  LayoutDashboard,
  Store,
  Users,
  ShieldCheck,
  CreditCard,
  Megaphone,
  MessageSquare,
  FileText,
  Search,
  BarChart3,
  Settings,
  ChevronDown,
  ChevronRight,
  ShoppingBag,
  Clock,
  Layers,
  LogOut,
  Sparkles,
  MapPin,
  Star,
  UserCheck,
  Building,
  UserX,
  AlertOctagon,
  Bot,
  AlertTriangle,
  Sliders,
  Receipt,
  RotateCcw,
  Percent,
  Coins,
  Radio,
  Share2,
  Mail,
  Send,
  Bell,
  Code,
  Globe,
  ExternalLink,
  Database,
  KeyRound,
  History,
  Workflow,
  SlidersHorizontal,
  X,
} from 'lucide-react';

export const AdminSidebar: React.FC = () => {
  const {
    activeSidebarTab,
    setActiveSidebarTab,
    listings,
    users,
    reports,
    mobileSidebarOpen,
    setMobileSidebarOpen,
  } = useApp();
  const { navigateTo } = useRouter();

  const pendingListingsCount = listings.filter((l) => l.status === 'pending').length;
  const expiredListingsCount = listings.filter((l) => l.status === 'expired').length;
  const pendingKycCount = users.filter((u) => u.kycStatus === 'pending').length;
  const openReportsCount = reports.filter((r) => r.status === 'pending').length;

  // Track expanded sections
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    marketplace: true,
    users: true,
    moderation: true,
    commerce: false,
    advertising: false,
    email: true,
    communication: false,
    cms: false,
    seo: false,
    analytics: false,
    administration: false,
  });

  const toggleSection = (key: string) => {
    setExpandedSections((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const menuSections = [
    {
      id: 'dashboard',
      label: 'Dashboard',
      icon: LayoutDashboard,
      isDirect: true,
      tab: 'dashboard',
    },
    {
      id: 'paid-features',
      label: 'Paid Features',
      icon: Sparkles,
      isDirect: true,
      tab: 'paid-features',
    },
    {
      id: 'marketplace',
      label: 'Marketplace',
      icon: Store,
      children: [
        { tab: 'marketplace/listings', label: 'Listings', icon: ShoppingBag },
        {
          tab: 'marketplace/pending',
          label: 'Pending Listings',
          icon: Clock,
          badge: pendingListingsCount > 0 ? pendingListingsCount : undefined,
          badgeVariant: 'warning',
        },
        {
          tab: 'marketplace/expired',
          label: 'Expired Ads',
          icon: RotateCcw,
          badge: expiredListingsCount > 0 ? expiredListingsCount : undefined,
          badgeVariant: 'danger',
        },
        { tab: 'marketplace/categories', label: 'Categories', icon: Layers },
        { tab: 'marketplace/attributes', label: 'Attributes', icon: SlidersHorizontal },
        { tab: 'marketplace/locations', label: 'Locations', icon: MapPin },
        { tab: 'marketplace/featured', label: 'Featured Listings', icon: Star },
      ],
    },
    {
      id: 'users',
      label: 'Users',
      icon: Users,
      children: [
        { tab: 'users/all', label: 'All Users', icon: Users },
        { tab: 'users/regular', label: 'Regular Users', icon: Users },
        { tab: 'users/businesses', label: 'Businesses', icon: Building },
        {
          tab: 'users/verification',
          label: 'Verification',
          icon: UserCheck,
          badge: pendingKycCount > 0 ? pendingKycCount : undefined,
          badgeVariant: 'warning',
        },
        { tab: 'users/banned', label: 'Banned Users', icon: UserX },
      ],
    },
    {
      id: 'moderation',
      label: 'Moderation',
      icon: ShieldCheck,
      children: [
        {
          tab: 'moderation/reports',
          label: 'Reports',
          icon: AlertOctagon,
          badge: openReportsCount > 0 ? openReportsCount : undefined,
          badgeVariant: 'danger',
        },
        { tab: 'moderation/spam', label: 'Spam', icon: Bot },
        { tab: 'moderation/fraud', label: 'Fraud Flags', icon: AlertTriangle },
        { tab: 'moderation/reviews', label: 'Reviews', icon: Star },
        { tab: 'moderation/rules', label: 'Moderation Rules', icon: Sliders },
      ],
    },
    {
      id: 'commerce',
      label: 'Commerce',
      icon: CreditCard,
      children: [
        { tab: 'paid-features', label: 'Paid Features Engine', icon: Sparkles },
        { tab: 'commerce/orders', label: 'Orders', icon: ShoppingBag },
        { tab: 'commerce/transactions', label: 'Transactions', icon: Receipt },
        { tab: 'commerce/subscriptions', label: 'Subscriptions', icon: Coins },
        { tab: 'commerce/packages', label: 'Packages', icon: Sparkles },
        { tab: 'commerce/coupons', label: 'Coupons', icon: Percent },
        { tab: 'commerce/refunds', label: 'Refunds', icon: RotateCcw },
        { tab: 'commerce/taxes', label: 'Taxes', icon: Receipt },
      ],
    },
    {
      id: 'advertising',
      label: 'Advertising',
      icon: Megaphone,
      children: [
        { tab: 'advertising/campaigns', label: 'Campaigns', icon: Megaphone },
        { tab: 'advertising/banners', label: 'Banners', icon: Share2 },
        { tab: 'advertising/sponsored', label: 'Sponsored Listings', icon: Star },
        { tab: 'advertising/advertisers', label: 'Advertisers', icon: Building },
      ],
    },
    {
      id: 'email',
      label: 'Email & Newsletter',
      icon: Mail,
      children: [
        { tab: 'email/dashboard', label: 'Email Dashboard', icon: LayoutDashboard },
        { tab: 'email/send', label: 'Send Newsletter', icon: Send },
        { tab: 'email/campaigns', label: 'Newsletter History', icon: Megaphone },
        { tab: 'email/templates', label: 'Email Templates', icon: FileText },
        { tab: 'email/settings', label: 'Email Settings', icon: Settings },
        { tab: 'email/logs', label: 'Email Logs / History', icon: History },
      ],
    },
    {
      id: 'communication',
      label: 'Communication',
      icon: MessageSquare,
      children: [
        { tab: 'communication/messages', label: 'Messages', icon: MessageSquare },
        { tab: 'communication/email', label: 'Email', icon: Mail },
        { tab: 'communication/sms', label: 'SMS', icon: Radio },
        { tab: 'communication/push', label: 'Push Notifications', icon: Send },
        { tab: 'communication/templates', label: 'Templates', icon: Bell },
      ],
    },
    {
      id: 'cms',
      label: 'CMS',
      icon: FileText,
      children: [
        { tab: 'cms/pages', label: 'Pages', icon: FileText },
        { tab: 'cms/blog', label: 'Blog', icon: FileText },
        { tab: 'cms/faq', label: 'FAQ', icon: FileText },
        { tab: 'cms/media', label: 'Media', icon: FileText },
        { tab: 'cms/menus', label: 'Menus', icon: Layers },
      ],
    },
    {
      id: 'seo',
      label: 'SEO',
      icon: Search,
      children: [
        { tab: 'seo/metadata', label: 'Metadata', icon: Search },
        { tab: 'seo/redirects', label: 'Redirects', icon: Share2 },
        { tab: 'seo/sitemap', label: 'Sitemap', icon: Globe },
        { tab: 'seo/templates', label: 'SEO Templates', icon: Code },
      ],
    },
    {
      id: 'analytics',
      label: 'Analytics',
      icon: BarChart3,
      children: [
        { tab: 'analytics/marketplace', label: 'Marketplace', icon: BarChart3 },
        { tab: 'analytics/users', label: 'Users', icon: Users },
        { tab: 'analytics/listings', label: 'Listings', icon: ShoppingBag },
        { tab: 'analytics/revenue', label: 'Revenue', icon: CreditCard },
        { tab: 'analytics/reports', label: 'Reports', icon: FileText },
      ],
    },
    {
      id: 'administration',
      label: 'Administration',
      icon: Settings,
      children: [
        { tab: 'admin/users', label: 'Admin Users', icon: Users },
        { tab: 'admin/roles', label: 'Roles & Permissions', icon: KeyRound },
        { tab: 'admin/logs', label: 'Audit Logs', icon: History },
        { tab: 'admin/settings', label: 'System Settings', icon: Settings },
        { tab: 'admin/gateways', label: 'Payment Gateways', icon: Database },
        { tab: 'admin/integrations', label: 'Integrations', icon: Workflow },
      ],
    },
  ];

  return (
    <>
      {/* Mobile Backdrop */}
      {mobileSidebarOpen && (
        <div
          onClick={() => setMobileSidebarOpen(false)}
          className="fixed inset-0 bg-black/60 z-40 md:hidden backdrop-blur-xs transition-opacity"
        />
      )}

      <aside
        className={`fixed inset-y-0 left-0 z-50 w-72 bg-white dark:bg-[#1e1f22] text-[#3c4043] dark:text-slate-300 flex flex-col shrink-0 border-r border-[#dadce0] dark:border-slate-800 select-none h-screen transform transition-transform duration-200 md:translate-x-0 md:static md:w-64 ${
          mobileSidebarOpen ? 'translate-x-0 shadow-2xl' : '-translate-x-full md:translate-x-0'
        }`}
      >
        {/* Google Cloud Console Brand Header */}
        <div className="h-[59px] flex items-center justify-between px-4 border-b border-[#dadce0] dark:border-slate-800">
          <div className="flex items-center gap-2.5">
            {/* Google Cloud 4-Color Cube Icon */}
            <div className="w-8 h-8 rounded-lg bg-[#f8f9fa] dark:bg-slate-800 border border-[#dadce0] dark:border-slate-700 flex items-center justify-center shrink-0">
              <div className="grid grid-cols-2 gap-0.5 w-4 h-4">
                <span className="bg-[#4285F4] rounded-[1px]" />
                <span className="bg-[#EA4335] rounded-[1px]" />
                <span className="bg-[#FBBC05] rounded-[1px]" />
                <span className="bg-[#34A853] rounded-[1px]" />
              </div>
            </div>
            <div className="min-w-0">
              <div className="font-display font-bold text-[#202124] dark:text-white text-sm tracking-tight flex items-center gap-0.5">
                <span>chillyads</span>
                <span className="text-[#1dbf73]">.</span>
                <span className="font-normal text-[#5f6368] dark:text-slate-400 ml-1 text-xs">Cloud</span>
              </div>
              <div className="text-[11px] text-[#5f6368] dark:text-slate-400 truncate">
                Admin Console
              </div>
            </div>
          </div>
          <button
            onClick={() => setMobileSidebarOpen(false)}
            className="md:hidden p-1.5 rounded-md text-[#5f6368] hover:bg-[#f1f3f4] dark:hover:bg-slate-800"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Navigation Links */}
        <div className="flex-1 overflow-y-auto pr-2 py-3 space-y-0.5">
          {/* Quick Back to Live Marketplace link */}
          <div className="px-3 pb-2 mb-2 border-b border-[#dadce0]/70 dark:border-slate-800">
            <button
              type="button"
              onClick={() => {
                navigateTo('/');
                setMobileSidebarOpen(false);
              }}
              className="w-full flex items-center justify-between px-3 py-2 rounded-md text-xs font-semibold bg-[#f8f9fa] dark:bg-slate-800/80 hover:bg-[#e8f0fe] dark:hover:bg-slate-800 text-[#1a73e8] dark:text-blue-400 border border-[#dadce0] dark:border-slate-700 transition-colors cursor-pointer"
              title="Return to the live public marketplace"
            >
              <div className="flex items-center gap-2">
                <Globe className="w-3.5 h-3.5 text-[#1a73e8] dark:text-blue-400" />
                <span>Storefront Marketplace</span>
              </div>
              <ExternalLink className="w-3 h-3 opacity-75" />
            </button>
          </div>

          {menuSections.map((section) => {
            if (section.isDirect) {
              const isActive = activeSidebarTab === section.tab;
              const Icon = section.icon;
              return (
                <button
                  key={section.id}
                  onClick={() => {
                    setActiveSidebarTab(section.tab!);
                    navigateTo('/admin/' + section.tab);
                    setMobileSidebarOpen(false);
                  }}
                  className={`w-full flex items-center gap-3 pl-4 pr-3 py-2 rounded-r-full text-xs font-medium transition-colors cursor-pointer ${
                    isActive
                      ? 'bg-[#e8f0fe] text-[#1a73e8] dark:bg-blue-950/60 dark:text-blue-400 font-semibold'
                      : 'text-[#3c4043] dark:text-slate-300 hover:bg-[#f1f3f4] dark:hover:bg-slate-800/60'
                  }`}
                >
                  <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-[#1a73e8] dark:text-blue-400' : 'text-[#5f6368] dark:text-slate-400'}`} />
                  <span className="truncate">{section.label}</span>
                </button>
              );
            }

            const isExpanded = !!expandedSections[section.id];
            const Icon = section.icon;
            const hasActiveChild = section.children?.some((c) => c.tab === activeSidebarTab);

            return (
              <div key={section.id} className="pt-1">
                <button
                  onClick={() => toggleSection(section.id)}
                  className={`w-full flex items-center justify-between pl-4 pr-3 py-2 rounded-r-full text-xs font-semibold transition-colors cursor-pointer ${
                    hasActiveChild
                      ? 'text-[#1a73e8] dark:text-blue-400 bg-[#f8f9fa] dark:bg-slate-800/40'
                      : 'text-[#5f6368] dark:text-slate-400 hover:text-[#202124] dark:hover:text-slate-200 hover:bg-[#f1f3f4] dark:hover:bg-slate-800/30'
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <Icon className={`w-4 h-4 shrink-0 ${hasActiveChild ? 'text-[#1a73e8] dark:text-blue-400' : 'text-[#5f6368] dark:text-slate-400'}`} />
                    <span className="truncate">{section.label}</span>
                  </div>
                  {isExpanded ? (
                    <ChevronDown className="w-3.5 h-3.5 text-[#5f6368] shrink-0" />
                  ) : (
                    <ChevronRight className="w-3.5 h-3.5 text-[#5f6368] shrink-0" />
                  )}
                </button>

                {isExpanded && section.children && (
                  <div className="mt-0.5 space-y-0.5">
                    {section.children.map((child) => {
                      const isChildActive = activeSidebarTab === child.tab;
                      const ChildIcon = child.icon;
                      return (
                        <button
                          key={child.tab}
                          onClick={() => {
                            setActiveSidebarTab(child.tab);
                            navigateTo('/admin/' + child.tab);
                            setMobileSidebarOpen(false);
                          }}
                          className={`w-full flex items-center justify-between pl-9 pr-3 py-1.5 rounded-r-full text-xs transition-colors cursor-pointer ${
                            isChildActive
                              ? 'bg-[#e8f0fe] text-[#1a73e8] dark:bg-blue-950/60 dark:text-blue-400 font-semibold'
                              : 'text-[#3c4043] dark:text-slate-300 hover:bg-[#f1f3f4] dark:hover:bg-slate-800/50'
                          }`}
                        >
                          <div className="flex items-center gap-2.5 truncate">
                            <ChildIcon
                              className={`w-3.5 h-3.5 shrink-0 ${
                                isChildActive ? 'text-[#1a73e8] dark:text-blue-400' : 'text-[#5f6368] dark:text-slate-400'
                              }`}
                            />
                            <span className="truncate">{child.label}</span>
                          </div>
                          {child.badge !== undefined && (
                            <span
                              className={`text-[11px] font-mono tabular-nums font-semibold ${
                                child.badgeVariant === 'danger'
                                  ? 'text-[#d93025] dark:text-rose-400'
                                  : 'text-[#e37400] dark:text-amber-400'
                              }`}
                            >
                              {child.badge}
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Exit Console Action */}
        <div className="p-3 border-t border-[#dadce0] dark:border-slate-800 bg-[#f8f9fa] dark:bg-slate-900/60">
          <button
            onClick={() => navigateTo('/')}
            className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-md border border-[#dadce0] dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-[#f1f3f4] dark:hover:bg-slate-700 text-[#3c4043] dark:text-slate-200 text-xs font-medium transition-colors cursor-pointer"
          >
            <LogOut className="w-3.5 h-3.5 text-[#5f6368]" />
            <span>Exit Cloud Console</span>
          </button>
        </div>
      </aside>
    </>
  );
};

