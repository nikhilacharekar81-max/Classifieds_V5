'use client';
import React, { useState } from 'react';
import { useApp } from '@/context/AppContext';
import { PaidFeaturesConfig, Category } from '@/lib/types';
import {
  Sparkles,
  Coins,
  DollarSign,
  PackageCheck,
  Tag,
  Star,
  Zap,
  Megaphone,
  CheckCircle2,
  XCircle,
  Save,
  RotateCcw,
  Sliders,
  Layers,
  Search,
  Eye,
  AlertCircle,
  Info,
  TrendingUp,
  ShieldCheck,
} from 'lucide-react';

export const PaidFeaturesModule: React.FC = () => {
  const {
    settings,
    updateSettings,
    categories,
    updateCategory,
    packages,
    updatePackage,
    addToast,
    recordAuditLog,
  } = useApp();

  const defaultPaidFeatures: PaidFeaturesConfig = {
    masterMonetizationEnabled: true,
    freemiumQuotaEnabled: true,
    freeListingsLimit: settings.freeListingsLimit || 3,
    extraListingFee: settings.extraListingFee || 99,
    paidSubcategoriesEnabled: true,
    defaultSubcategoryFee: 149,
    featuredAdEnabled: true,
    featuredAdPrice: 100,
    featuredAdDurationDays: 30,
    adBoostEnabled: true,
    quickBoostPrice: 49,
    spotlightBoostPrice: 199,
    premiumSurgeBoostPrice: 499,
    displayAdsEnabled: true,
    headerBannerEnabled: true,
    inFeedBannerEnabled: true,
    sidebarBannerEnabled: true,
    bannerDailyRate: 299,
  };

  const [form, setForm] = useState<PaidFeaturesConfig>(
    settings.paidFeatures ? { ...defaultPaidFeatures, ...settings.paidFeatures } : defaultPaidFeatures
  );

  const [categorySearch, setCategorySearch] = useState('');
  const [activeTab, setActiveTab] = useState<'all' | 'quotas' | 'categories' | 'featured' | 'boosts' | 'banners'>('all');
  const [selectedParentCategory, setSelectedParentCategory] = useState<string>('all');

  const symbol = settings.currencySymbol || '₹';

  // Toggle helper
  const handleToggle = (key: keyof PaidFeaturesConfig) => {
    setForm((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  const handleNumberChange = (key: keyof PaidFeaturesConfig, value: number) => {
    setForm((prev) => ({
      ...prev,
      [key]: Math.max(0, value),
    }));
  };

  // Toggle subcategory paid status
  const handleToggleSubcategoryPaid = (subId: string) => {
    const target = categories.find((c) => c.id === subId);
    if (target) {
      updateCategory({ ...target, isPaid: !target.isPaid });
    }
  };

  // Update subcategory posting fee
  const handleUpdateSubcategoryFee = (subId: string, fee: number) => {
    const target = categories.find((c) => c.id === subId);
    if (target) {
      updateCategory({ ...target, postingFee: Math.max(0, fee) });
    }
  };

  // Bulk update categories
  const handleBulkSetCategoriesPaid = (isPaid: boolean) => {
    categories.forEach((c) => {
      if (c.parentId) {
        updateCategory({ ...c, isPaid });
      }
    });
    addToast({
      title: isPaid ? 'Subcategories Marked Paid' : 'Subcategories Marked Free',
      message: `Updated all subcategory fee states to ${isPaid ? 'Paid' : 'Free'}.`,
      type: 'info',
    });
  };

  // Save changes
  const handleSaveAll = () => {
    updateSettings({
      freeListingsLimit: form.freeListingsLimit,
      extraListingFee: form.extraListingFee,
      paidFeatures: form,
    });

    // Also sync boost packages if boost prices changed
    packages.forEach((pkg) => {
      let newPrice = pkg.price;
      if (pkg.id === 'pkg_quick_24h' || pkg.name.toLowerCase().includes('quick')) {
        newPrice = form.quickBoostPrice;
      } else if (pkg.id === 'pkg_spotlight_7d' || pkg.name.toLowerCase().includes('spotlight')) {
        newPrice = form.spotlightBoostPrice;
      } else if (pkg.id === 'pkg_premium_surge' || pkg.name.toLowerCase().includes('surge')) {
        newPrice = form.premiumSurgeBoostPrice;
      }
      updatePackage({ ...pkg, price: newPrice, isActive: form.adBoostEnabled });
    });

    recordAuditLog(
      'UPDATE_PAID_FEATURES_CONFIG',
      'Commerce / Paid Features',
      'system_paid_features',
      'System Monetization Settings',
      `Updated paid features configuration. Master Status: ${form.masterMonetizationEnabled ? 'ENABLED' : 'DISABLED'}`
    );

    addToast({
      title: 'Paid Features Saved Successfully!',
      message: 'All fee rules, toggles, and package pricing have been applied live across Chillyads.',
      type: 'success',
    });
  };

  const handleResetToDefaults = () => {
    setForm(defaultPaidFeatures);
    addToast({
      title: 'Reset to Defaults',
      message: 'Form restored to standard Chillyads monetisation presets.',
      type: 'info',
    });
  };

  // Filter subcategories for the table view
  const parentCategories = categories.filter((c) => !c.parentId);
  const subcategories = categories.filter((c) => {
    if (!c.parentId) return false;
    if (selectedParentCategory !== 'all' && c.parentId !== selectedParentCategory) return false;
    if (categorySearch.trim()) {
      const parent = categories.find((p) => p.id === c.parentId);
      const query = categorySearch.toLowerCase();
      return (
        c.name.toLowerCase().includes(query) ||
        (parent && parent.name.toLowerCase().includes(query))
      );
    }
    return true;
  });

  const activeFeaturesCount = [
    form.freemiumQuotaEnabled,
    form.paidSubcategoriesEnabled,
    form.featuredAdEnabled,
    form.adBoostEnabled,
    form.displayAdsEnabled,
  ].filter(Boolean).length;

  return (
    <div className="space-y-8 pb-16">
      {/* Top Banner Header */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 p-6 md:p-8 text-white shadow-xl border border-indigo-900/50">
        <div className="absolute top-0 right-0 -mt-12 -mr-12 w-96 h-96 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-1/3 -mb-12 w-80 h-80 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/20 text-amber-300 text-xs font-semibold tracking-wide border border-amber-500/30">
              <Sparkles className="w-3.5 h-3.5" />
              Chillyads Monetization Engine
            </div>
            <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight text-white">
              Paid Features & Fee Control Center
            </h1>
            <p className="text-slate-300 text-sm max-w-2xl leading-relaxed">
              Manage all 5 monetization avenues from a single master dashboard. Enable or disable paid features instantly, customize pricing models, and monitor platform monetization status.
            </p>
          </div>

          {/* Master Toggle Card */}
          <div className="bg-slate-800/80 backdrop-blur-md p-5 rounded-xl border border-slate-700/80 shadow-2xl flex flex-col gap-3 min-w-[280px]">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                <Coins className="w-4 h-4 text-amber-400" />
                Master Monetization Switch
              </span>
              <span
                className={`text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full ${
                  form.masterMonetizationEnabled
                    ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                    : 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                }`}
              >
                {form.masterMonetizationEnabled ? 'ALL PAID ACTIVE' : 'FREE MODE'}
              </span>
            </div>

            <button
              onClick={() => handleToggle('masterMonetizationEnabled')}
              className={`relative inline-flex h-9 w-full flex-shrink-0 cursor-pointer rounded-lg transition-colors duration-200 ease-in-out focus:outline-none p-1 border ${
                form.masterMonetizationEnabled
                  ? 'bg-emerald-600 border-emerald-500'
                  : 'bg-slate-700 border-slate-600'
              }`}
            >
              <div
                className={`flex items-center justify-center w-1/2 h-full rounded-md text-xs font-bold transition-all duration-200 ${
                  form.masterMonetizationEnabled
                    ? 'bg-white text-emerald-950 shadow-md'
                    : 'text-slate-400'
                }`}
              >
                <CheckCircle2 className="w-3.5 h-3.5 mr-1" />
                ON (Monetized)
              </div>
              <div
                className={`flex items-center justify-center w-1/2 h-full rounded-md text-xs font-bold transition-all duration-200 ${
                  !form.masterMonetizationEnabled
                    ? 'bg-rose-600 text-white shadow-md'
                    : 'text-slate-400'
                }`}
              >
                <XCircle className="w-3.5 h-3.5 mr-1" />
                OFF (100% Free)
              </div>
            </button>

            <p className="text-[11px] text-slate-400 leading-tight">
              {form.masterMonetizationEnabled
                ? 'Paid features are enforced according to rules below.'
                : 'Overridden: All fees waived across the entire platform.'}
            </p>
          </div>
        </div>

        {/* Action Controls Bar */}
        <div className="mt-8 pt-6 border-t border-slate-800/80 flex flex-wrap items-center justify-between gap-4">
          {/* Status Indicators */}
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2 bg-slate-800/60 px-3.5 py-1.5 rounded-lg border border-slate-700/60 text-xs font-medium text-slate-200">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              Active Paid Modules:{' '}
              <span className="font-bold text-amber-400 ml-1">
                {form.masterMonetizationEnabled ? activeFeaturesCount : 0} of 5
              </span>
            </div>

            <div className="flex items-center gap-2 bg-slate-800/60 px-3.5 py-1.5 rounded-lg border border-slate-700/60 text-xs font-medium text-slate-200">
              <Tag className="w-3.5 h-3.5 text-indigo-400" />
              Base Extra Listing Fee:{' '}
              <span className="font-bold text-white ml-1">{symbol}{form.extraListingFee}</span>
            </div>

            <div className="flex items-center gap-2 bg-slate-800/60 px-3.5 py-1.5 rounded-lg border border-slate-700/60 text-xs font-medium text-slate-200">
              <Star className="w-3.5 h-3.5 text-amber-400" />
              Featured Fee:{' '}
              <span className="font-bold text-white ml-1">{symbol}{form.featuredAdPrice}</span>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-3 ml-auto">
            <button
              onClick={handleResetToDefaults}
              className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium text-xs flex items-center gap-2 transition border border-slate-700"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              Reset Defaults
            </button>
            <button
              onClick={handleSaveAll}
              className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center gap-2 transition shadow-lg shadow-emerald-900/40 active:scale-95"
            >
              <Save className="w-4 h-4" />
              Save Paid Features
            </button>
          </div>
        </div>
      </div>

      {/* Warning Notice if Master Monetization is Turned OFF */}
      {!form.masterMonetizationEnabled && (
        <div className="bg-amber-500/10 border-l-4 border-amber-500 p-4 rounded-r-xl flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
          <div className="text-xs text-amber-900 dark:text-amber-200 space-y-1">
            <p className="font-bold">Master Monetization is currently TURNED OFF</p>
            <p>
              The platform is running in 100% Free Mode. Users can publish unlimited ads, select paid subcategories, and upgrade ads without being asked for payment. Turn the master switch ON to restore fee collections.
            </p>
          </div>
        </div>
      )}

      {/* Navigation Filter Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 border-b border-slate-200 dark:border-slate-800">
        {[
          { id: 'all', label: 'All Paid Features (5)', icon: Sliders },
          { id: 'quotas', label: '1. Volume Quotas', icon: PackageCheck },
          { id: 'categories', label: '2. Subcategory Fees', icon: Tag },
          { id: 'featured', label: '3. Featured Upgrade', icon: Star },
          { id: 'boosts', label: '4. Boost Tiers', icon: Zap },
          { id: 'banners', label: '5. Display Banners', icon: Megaphone },
        ].map((tab) => {
          const IconComp = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
                isActive
                  ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/20'
                  : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-800'
              }`}
            >
              <IconComp className="w-3.5 h-3.5" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* 5 Paid Feature Modules Container */}
      <div className="space-y-8">
        {/* ==========================================
            FEATURE 1: FREEMIUM VOLUME QUOTAS
           ========================================== */}
        {(activeTab === 'all' || activeTab === 'quotas') && (
          <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 border border-slate-200 dark:border-slate-800 shadow-sm space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center flex-shrink-0 font-bold border border-indigo-100 dark:border-indigo-900/50">
                  <PackageCheck className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                      1. Freemium Active Ad Volume Quotas
                    </h2>
                    <span
                      className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${
                        form.freemiumQuotaEnabled && form.masterMonetizationEnabled
                          ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300'
                          : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
                      }`}
                    >
                      {form.freemiumQuotaEnabled && form.masterMonetizationEnabled ? 'Active' : 'Disabled'}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    Allow sellers a free allocation of active listings, then charge a per-ad fee for additional active ads.
                  </p>
                </div>
              </div>

              {/* Toggle Switch */}
              <button
                onClick={() => handleToggle('freemiumQuotaEnabled')}
                className={`relative inline-flex h-7 w-14 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                  form.freemiumQuotaEnabled ? 'bg-emerald-600' : 'bg-slate-300 dark:bg-slate-700'
                }`}
              >
                <span
                  className={`pointer-events-none inline-block h-6 w-6 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                    form.freemiumQuotaEnabled ? 'translate-x-7' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>

            {/* Inputs Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2 bg-slate-50 dark:bg-slate-800/50 p-4 rounded-xl border border-slate-200/80 dark:border-slate-800">
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                  Baseline Free Active Listings Limit per Seller
                </label>
                <div className="relative">
                  <input
                    type="number"
                    min="1"
                    max="100"
                    value={form.freeListingsLimit}
                    onChange={(e) => handleNumberChange('freeListingsLimit', parseInt(e.target.value) || 0)}
                    disabled={!form.freemiumQuotaEnabled}
                    className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white font-bold text-sm focus:ring-2 focus:ring-emerald-500 disabled:opacity-50"
                  />
                  <span className="absolute right-3 top-3 text-xs text-slate-400 font-medium">Active Ads</span>
                </div>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  First <span className="font-bold text-emerald-600 dark:text-emerald-400">{form.freeListingsLimit} active ads</span> published by any user are 100% free of charge.
                </p>
              </div>

              <div className="space-y-2 bg-slate-50 dark:bg-slate-800/50 p-4 rounded-xl border border-slate-200/80 dark:border-slate-800">
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                  Fee Charged per Extra Listing Beyond Quota
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-2.5 text-sm font-bold text-slate-500">{symbol}</span>
                  <input
                    type="number"
                    min="0"
                    value={form.extraListingFee}
                    onChange={(e) => handleNumberChange('extraListingFee', parseInt(e.target.value) || 0)}
                    disabled={!form.freemiumQuotaEnabled}
                    className="w-full pl-8 pr-3.5 py-2.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white font-bold text-sm focus:ring-2 focus:ring-emerald-500 disabled:opacity-50"
                  />
                  <span className="absolute right-3 top-3 text-xs text-slate-400 font-medium">per ad</span>
                </div>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  Sellers publishing ad #{form.freeListingsLimit + 1} and above pay <span className="font-bold text-emerald-600 dark:text-emerald-400">{symbol}{form.extraListingFee}</span> per ad.
                </p>
              </div>
            </div>

            {/* Live User-Facing Banner Simulation */}
            <div className="p-4 rounded-xl bg-indigo-50/50 dark:bg-indigo-950/30 border border-indigo-100 dark:border-indigo-900/50 text-xs flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <Info className="w-5 h-5 text-indigo-600 dark:text-indigo-400 flex-shrink-0" />
                <div>
                  <span className="font-bold text-indigo-950 dark:text-indigo-200 block">
                    Seller Quota Preview in Post Ad Form:
                  </span>
                  <span className="text-slate-600 dark:text-slate-300">
                    {form.freemiumQuotaEnabled
                      ? `Sellers with 3 active ads see: "Free limit reached (3/3). Additional listing fee: ${symbol}${form.extraListingFee}"`
                      : 'Freemium quota disabled: Sellers can post unlimited ads for free.'}
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ==========================================
            FEATURE 2: PAID SUBCATEGORIES
           ========================================== */}
        {(activeTab === 'all' || activeTab === 'categories') && (
          <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 border border-slate-200 dark:border-slate-800 shadow-sm space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 flex items-center justify-center flex-shrink-0 font-bold border border-amber-100 dark:border-amber-900/50">
                  <Tag className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                      2. Subcategory & Category Posting Fees
                    </h2>
                    <span
                      className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${
                        form.paidSubcategoriesEnabled && form.masterMonetizationEnabled
                          ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300'
                          : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
                      }`}
                    >
                      {form.paidSubcategoriesEnabled && form.masterMonetizationEnabled ? 'Active' : 'Disabled'}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    Charge explicit posting fees for commercial, high-value subcategories (Commercial Vehicles, Real Estate, Heavy Equipment).
                  </p>
                </div>
              </div>

              {/* Toggle Switch */}
              <button
                onClick={() => handleToggle('paidSubcategoriesEnabled')}
                className={`relative inline-flex h-7 w-14 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                  form.paidSubcategoriesEnabled ? 'bg-emerald-600' : 'bg-slate-300 dark:bg-slate-700'
                }`}
              >
                <span
                  className={`pointer-events-none inline-block h-6 w-6 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                    form.paidSubcategoriesEnabled ? 'translate-x-7' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>

            {/* Default Fee Config & Controls */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-50 dark:bg-slate-800/50 p-4 rounded-xl border border-slate-200/80 dark:border-slate-800">
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block">
                  Default Subcategory Posting Fee
                </label>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  Applied when marking new subcategories as Paid.
                </p>
              </div>

              <div className="flex items-center gap-3">
                <div className="relative w-36">
                  <span className="absolute left-3 top-2.5 text-sm font-bold text-slate-500">{symbol}</span>
                  <input
                    type="number"
                    min="0"
                    value={form.defaultSubcategoryFee}
                    onChange={(e) => handleNumberChange('defaultSubcategoryFee', parseInt(e.target.value) || 0)}
                    disabled={!form.paidSubcategoriesEnabled}
                    className="w-full pl-8 pr-3.5 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white font-bold text-sm focus:ring-2 focus:ring-emerald-500 disabled:opacity-50"
                  />
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleBulkSetCategoriesPaid(true)}
                    disabled={!form.paidSubcategoriesEnabled}
                    className="px-3 py-2 rounded-lg bg-emerald-600 text-white font-semibold text-xs hover:bg-emerald-500 transition disabled:opacity-50"
                  >
                    Set All Paid
                  </button>
                  <button
                    onClick={() => handleBulkSetCategoriesPaid(false)}
                    disabled={!form.paidSubcategoriesEnabled}
                    className="px-3 py-2 rounded-lg bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200 font-semibold text-xs hover:bg-slate-300 transition disabled:opacity-50"
                  >
                    Set All Free
                  </button>
                </div>
              </div>
            </div>

            {/* Subcategory Fee Management Table */}
            <div className="space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <h3 className="text-xs font-extrabold uppercase text-slate-500 dark:text-slate-400 tracking-wider">
                  Individual Subcategory Fee Rules ({subcategories.length})
                </h3>

                <div className="flex items-center gap-2">
                  <select
                    value={selectedParentCategory}
                    onChange={(e) => setSelectedParentCategory(e.target.value)}
                    className="px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-medium text-slate-700 dark:text-slate-200"
                  >
                    <option value="all">All Parent Categories</option>
                    {parentCategories.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name}
                      </option>
                    ))}
                  </select>

                  <div className="relative w-48">
                    <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-slate-400" />
                    <input
                      type="text"
                      placeholder="Filter subcategory..."
                      value={categorySearch}
                      onChange={(e) => setCategorySearch(e.target.value)}
                      className="w-full pl-8 pr-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs text-slate-900 dark:text-white"
                    />
                  </div>
                </div>
              </div>

              <div className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden max-h-80 overflow-y-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead className="bg-slate-100 dark:bg-slate-800/80 text-slate-600 dark:text-slate-300 font-bold sticky top-0 z-10">
                    <tr>
                      <th className="py-2.5 px-4">Subcategory</th>
                      <th className="py-2.5 px-4">Parent Category</th>
                      <th className="py-2.5 px-4">Paid Status</th>
                      <th className="py-2.5 px-4 text-right">Posting Fee ({symbol})</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {subcategories.map((sub) => {
                      const parent = categories.find((p) => p.id === sub.parentId);
                      return (
                        <tr
                          key={sub.id}
                          className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition"
                        >
                          <td className="py-2.5 px-4 font-bold text-slate-900 dark:text-white">
                            {sub.name}
                          </td>
                          <td className="py-2.5 px-4 text-slate-500 dark:text-slate-400">
                            {parent?.name || 'Category'}
                          </td>
                          <td className="py-2.5 px-4">
                            <button
                              onClick={() => handleToggleSubcategoryPaid(sub.id)}
                              disabled={!form.paidSubcategoriesEnabled}
                              className={`px-2.5 py-1 rounded-full text-[10px] font-extrabold uppercase transition ${
                                sub.isPaid
                                  ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 border border-amber-300'
                                  : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
                              }`}
                            >
                              {sub.isPaid ? 'PAID SUBCATEGORY' : 'FREE TO POST'}
                            </button>
                          </td>
                          <td className="py-2.5 px-4 text-right">
                            <div className="inline-flex items-center gap-1">
                              <span className="font-bold text-slate-500">{symbol}</span>
                              <input
                                type="number"
                                min="0"
                                value={sub.postingFee || 0}
                                onChange={(e) =>
                                  handleUpdateSubcategoryFee(sub.id, parseInt(e.target.value) || 0)
                                }
                                disabled={!sub.isPaid || !form.paidSubcategoriesEnabled}
                                className="w-20 px-2 py-1 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white text-right font-bold disabled:opacity-40"
                              />
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ==========================================
            FEATURE 3: FEATURED AD UPGRADES
           ========================================== */}
        {(activeTab === 'all' || activeTab === 'featured') && (
          <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 border border-slate-200 dark:border-slate-800 shadow-sm space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-500 flex items-center justify-center flex-shrink-0 font-bold border border-amber-500/20">
                  <Star className="w-5 h-5 fill-amber-500" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                      3. Featured Ad Upgrades (Gold Badge & Top Placement)
                    </h2>
                    <span
                      className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${
                        form.featuredAdEnabled && form.masterMonetizationEnabled
                          ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300'
                          : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
                      }`}
                    >
                      {form.featuredAdEnabled && form.masterMonetizationEnabled ? 'Active' : 'Disabled'}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    Offer sellers a single-click upgrade during checkout to highlight their ad with a gold badge and top positioning.
                  </p>
                </div>
              </div>

              {/* Toggle Switch */}
              <button
                onClick={() => handleToggle('featuredAdEnabled')}
                className={`relative inline-flex h-7 w-14 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                  form.featuredAdEnabled ? 'bg-emerald-600' : 'bg-slate-300 dark:bg-slate-700'
                }`}
              >
                <span
                  className={`pointer-events-none inline-block h-6 w-6 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                    form.featuredAdEnabled ? 'translate-x-7' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>

            {/* Pricing & Duration inputs */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2 bg-slate-50 dark:bg-slate-800/50 p-4 rounded-xl border border-slate-200/80 dark:border-slate-800">
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                  Featured Upgrade Fee
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-2.5 text-sm font-bold text-slate-500">{symbol}</span>
                  <input
                    type="number"
                    min="0"
                    value={form.featuredAdPrice}
                    onChange={(e) => handleNumberChange('featuredAdPrice', parseInt(e.target.value) || 0)}
                    disabled={!form.featuredAdEnabled}
                    className="w-full pl-8 pr-3.5 py-2.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white font-bold text-sm focus:ring-2 focus:ring-emerald-500 disabled:opacity-50"
                  />
                </div>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  Price charged when user checks "Feature my ad" during ad posting or renewal.
                </p>
              </div>

              <div className="space-y-2 bg-slate-50 dark:bg-slate-800/50 p-4 rounded-xl border border-slate-200/80 dark:border-slate-800">
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                  Featured Status Validity Duration
                </label>
                <div className="relative">
                  <input
                    type="number"
                    min="1"
                    max="365"
                    value={form.featuredAdDurationDays}
                    onChange={(e) => handleNumberChange('featuredAdDurationDays', parseInt(e.target.value) || 0)}
                    disabled={!form.featuredAdEnabled}
                    className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white font-bold text-sm focus:ring-2 focus:ring-emerald-500 disabled:opacity-50"
                  />
                  <span className="absolute right-3 top-3 text-xs text-slate-400 font-medium">Days</span>
                </div>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  The featured status expires automatically after {form.featuredAdDurationDays} days.
                </p>
              </div>
            </div>

            {/* Badge Preview */}
            <div className="p-4 rounded-xl bg-amber-50/50 dark:bg-amber-950/20 border border-amber-200/60 dark:border-amber-900/40 flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="px-2.5 py-1 rounded-md bg-amber-500 text-slate-950 font-extrabold text-[10px] uppercase tracking-wider flex items-center gap-1 shadow-sm">
                  <Star className="w-3 h-3 fill-slate-950" />
                  FEATURED
                </div>
                <span className="text-xs text-slate-700 dark:text-slate-300 font-medium">
                  Sample Gold Badge as rendered on Chillyads card thumbnails
                </span>
              </div>
              <span className="text-xs font-bold text-amber-700 dark:text-amber-400">
                {symbol}{form.featuredAdPrice} for {form.featuredAdDurationDays} Days
              </span>
            </div>
          </div>
        )}

        {/* ==========================================
            FEATURE 4: AD BOOST PACKAGES
           ========================================== */}
        {(activeTab === 'all' || activeTab === 'boosts') && (
          <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 border border-slate-200 dark:border-slate-800 shadow-sm space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-xl bg-purple-50 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400 flex items-center justify-center flex-shrink-0 font-bold border border-purple-100 dark:border-purple-900/50">
                  <Zap className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                      4. Ad Boost Package Tiers
                    </h2>
                    <span
                      className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${
                        form.adBoostEnabled && form.masterMonetizationEnabled
                          ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300'
                          : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
                      }`}
                    >
                      {form.adBoostEnabled && form.masterMonetizationEnabled ? 'Active' : 'Disabled'}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    Allow sellers to boost existing live listings with 24-hour, 7-day, or 30-day view multipliers.
                  </p>
                </div>
              </div>

              {/* Toggle Switch */}
              <button
                onClick={() => handleToggle('adBoostEnabled')}
                className={`relative inline-flex h-7 w-14 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                  form.adBoostEnabled ? 'bg-emerald-600' : 'bg-slate-300 dark:bg-slate-700'
                }`}
              >
                <span
                  className={`pointer-events-none inline-block h-6 w-6 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                    form.adBoostEnabled ? 'translate-x-7' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>

            {/* Package Tier Inputs */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Tier 1 */}
              <div className="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-xl border border-slate-200/80 dark:border-slate-800 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                    <Zap className="w-3.5 h-3.5 text-amber-500" />
                    Quick Boost
                  </span>
                  <span className="text-[10px] font-extrabold text-slate-500">24 Hours</span>
                </div>

                <div className="relative">
                  <span className="absolute left-3 top-2.5 text-sm font-bold text-slate-500">{symbol}</span>
                  <input
                    type="number"
                    min="0"
                    value={form.quickBoostPrice}
                    onChange={(e) => handleNumberChange('quickBoostPrice', parseInt(e.target.value) || 0)}
                    disabled={!form.adBoostEnabled}
                    className="w-full pl-8 pr-3.5 py-2.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white font-bold text-sm focus:ring-2 focus:ring-emerald-500 disabled:opacity-50"
                  />
                </div>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  Instant 3x impression surge for 1 full day.
                </p>
              </div>

              {/* Tier 2 */}
              <div className="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-xl border border-slate-200/80 dark:border-slate-800 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                    <Zap className="w-3.5 h-3.5 text-purple-500" />
                    7-Day Spotlight
                  </span>
                  <span className="text-[10px] font-extrabold text-slate-500">7 Days</span>
                </div>

                <div className="relative">
                  <span className="absolute left-3 top-2.5 text-sm font-bold text-slate-500">{symbol}</span>
                  <input
                    type="number"
                    min="0"
                    value={form.spotlightBoostPrice}
                    onChange={(e) => handleNumberChange('spotlightBoostPrice', parseInt(e.target.value) || 0)}
                    disabled={!form.adBoostEnabled}
                    className="w-full pl-8 pr-3.5 py-2.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white font-bold text-sm focus:ring-2 focus:ring-emerald-500 disabled:opacity-50"
                  />
                </div>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  Top of category gallery for a full week.
                </p>
              </div>

              {/* Tier 3 */}
              <div className="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-xl border border-slate-200/80 dark:border-slate-800 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                    <Zap className="w-3.5 h-3.5 text-emerald-500" />
                    30-Day Premium Surge
                  </span>
                  <span className="text-[10px] font-extrabold text-slate-500">30 Days</span>
                </div>

                <div className="relative">
                  <span className="absolute left-3 top-2.5 text-sm font-bold text-slate-500">{symbol}</span>
                  <input
                    type="number"
                    min="0"
                    value={form.premiumSurgeBoostPrice}
                    onChange={(e) => handleNumberChange('premiumSurgeBoostPrice', parseInt(e.target.value) || 0)}
                    disabled={!form.adBoostEnabled}
                    className="w-full pl-8 pr-3.5 py-2.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white font-bold text-sm focus:ring-2 focus:ring-emerald-500 disabled:opacity-50"
                  />
                </div>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  Maximum exposure with homepage carousel highlight.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* ==========================================
            FEATURE 5: DISPLAY BANNERS
           ========================================== */}
        {(activeTab === 'all' || activeTab === 'banners') && (
          <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 border border-slate-200 dark:border-slate-800 shadow-sm space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center flex-shrink-0 font-bold border border-blue-100 dark:border-blue-900/50">
                  <Megaphone className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                      5. Display & Banner Advertising Slots
                    </h2>
                    <span
                      className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${
                        form.displayAdsEnabled && form.masterMonetizationEnabled
                          ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300'
                          : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
                      }`}
                    >
                      {form.displayAdsEnabled && form.masterMonetizationEnabled ? 'Active' : 'Disabled'}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    Enable or disable banner placements across top leaderboards, search results in-feed slots, and sidebars.
                  </p>
                </div>
              </div>

              {/* Toggle Switch */}
              <button
                onClick={() => handleToggle('displayAdsEnabled')}
                className={`relative inline-flex h-7 w-14 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                  form.displayAdsEnabled ? 'bg-emerald-600' : 'bg-slate-300 dark:bg-slate-700'
                }`}
              >
                <span
                  className={`pointer-events-none inline-block h-6 w-6 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                    form.displayAdsEnabled ? 'translate-x-7' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>

            {/* Banner Placement Sub-Toggles */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div
                onClick={() => form.displayAdsEnabled && handleToggle('headerBannerEnabled')}
                className={`p-4 rounded-xl border cursor-pointer transition flex items-center justify-between ${
                  form.headerBannerEnabled && form.displayAdsEnabled
                    ? 'bg-emerald-50/50 border-emerald-300 dark:bg-emerald-950/20 dark:border-emerald-800'
                    : 'bg-slate-50 border-slate-200 dark:bg-slate-800/40 dark:border-slate-800 opacity-60'
                }`}
              >
                <div>
                  <span className="text-xs font-bold text-slate-900 dark:text-white block">
                    Header Leaderboard Slot
                  </span>
                  <span className="text-[11px] text-slate-500">Top of Marketplace homepage</span>
                </div>
                <div
                  className={`w-4 h-4 rounded-full border flex items-center justify-center ${
                    form.headerBannerEnabled && form.displayAdsEnabled
                      ? 'bg-emerald-600 border-emerald-600 text-white'
                      : 'border-slate-400'
                  }`}
                >
                  {form.headerBannerEnabled && form.displayAdsEnabled && <CheckCircle2 className="w-3 h-3" />}
                </div>
              </div>

              <div
                onClick={() => form.displayAdsEnabled && handleToggle('inFeedBannerEnabled')}
                className={`p-4 rounded-xl border cursor-pointer transition flex items-center justify-between ${
                  form.inFeedBannerEnabled && form.displayAdsEnabled
                    ? 'bg-emerald-50/50 border-emerald-300 dark:bg-emerald-950/20 dark:border-emerald-800'
                    : 'bg-slate-50 border-slate-200 dark:bg-slate-800/40 dark:border-slate-800 opacity-60'
                }`}
              >
                <div>
                  <span className="text-xs font-bold text-slate-900 dark:text-white block">
                    In-Feed Search Slot
                  </span>
                  <span className="text-[11px] text-slate-500">Embedded within listing feeds</span>
                </div>
                <div
                  className={`w-4 h-4 rounded-full border flex items-center justify-center ${
                    form.inFeedBannerEnabled && form.displayAdsEnabled
                      ? 'bg-emerald-600 border-emerald-600 text-white'
                      : 'border-slate-400'
                  }`}
                >
                  {form.inFeedBannerEnabled && form.displayAdsEnabled && <CheckCircle2 className="w-3 h-3" />}
                </div>
              </div>

              <div
                onClick={() => form.displayAdsEnabled && handleToggle('sidebarBannerEnabled')}
                className={`p-4 rounded-xl border cursor-pointer transition flex items-center justify-between ${
                  form.sidebarBannerEnabled && form.displayAdsEnabled
                    ? 'bg-emerald-50/50 border-emerald-300 dark:bg-emerald-950/20 dark:border-emerald-800'
                    : 'bg-slate-50 border-slate-200 dark:bg-slate-800/40 dark:border-slate-800 opacity-60'
                }`}
              >
                <div>
                  <span className="text-xs font-bold text-slate-900 dark:text-white block">
                    Sidebar Banner Slot
                  </span>
                  <span className="text-[11px] text-slate-500">Detail & Filter sidebar slots</span>
                </div>
                <div
                  className={`w-4 h-4 rounded-full border flex items-center justify-center ${
                    form.sidebarBannerEnabled && form.displayAdsEnabled
                      ? 'bg-emerald-600 border-emerald-600 text-white'
                      : 'border-slate-400'
                  }`}
                >
                  {form.sidebarBannerEnabled && form.displayAdsEnabled && <CheckCircle2 className="w-3 h-3" />}
                </div>
              </div>
            </div>

            {/* Pricing Rate */}
            <div className="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-xl border border-slate-200/80 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <label className="text-xs font-bold text-slate-800 dark:text-slate-200 block">
                  Advertiser Banner Rate per Day
                </label>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  Standard baseline rate charged to third-party advertisers per daily run.
                </p>
              </div>

              <div className="relative w-40">
                <span className="absolute left-3 top-2.5 text-sm font-bold text-slate-500">{symbol}</span>
                <input
                  type="number"
                  min="0"
                  value={form.bannerDailyRate}
                  onChange={(e) => handleNumberChange('bannerDailyRate', parseInt(e.target.value) || 0)}
                  disabled={!form.displayAdsEnabled}
                  className="w-full pl-8 pr-3.5 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white font-bold text-sm focus:ring-2 focus:ring-emerald-500 disabled:opacity-50"
                />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Bottom Sticky Action Bar */}
      <div className="sticky bottom-4 z-20 bg-slate-900/90 backdrop-blur-md p-4 rounded-2xl border border-slate-800 shadow-2xl flex items-center justify-between text-white gap-4">
        <div className="flex items-center gap-3">
          <ShieldCheck className="w-5 h-5 text-emerald-400" />
          <div className="hidden sm:block">
            <span className="text-xs font-bold block">Live Monetization Policy Engine</span>
            <span className="text-[10px] text-slate-400">
              Changes apply instantly to Post Ad wizards, Listing Upgrades, and Checkouts.
            </span>
          </div>
        </div>

        <div className="flex items-center gap-3 ml-auto">
          <button
            onClick={handleResetToDefaults}
            className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium text-xs transition border border-slate-700"
          >
            Reset
          </button>
          <button
            onClick={handleSaveAll}
            className="px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center gap-2 transition shadow-lg shadow-emerald-900/50 active:scale-95"
          >
            <Save className="w-4 h-4" />
            Save All Changes
          </button>
        </div>
      </div>
    </div>
  );
};
