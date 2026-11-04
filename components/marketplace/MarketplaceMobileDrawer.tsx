'use client';

import React from 'react';
import { X, FolderTree, Plus, User, Shield, Tag } from 'lucide-react';
import { Category } from '@/lib/types';
import { navigateTo } from '@/lib/router/useRouter';
import { buildChillyUrl } from '@/lib/utils/seoAndUrlHelper';
import { ICONS_MAP } from './categoryIcons';
import { PropertyFiltersSidebar, PropertyFilterState } from './PropertyFiltersSidebar';

export interface MarketplaceMobileDrawerProps extends PropertyFilterState {
  isOpen: boolean;
  onClose: () => void;
  categories: Category[];
  rootCategories: Category[];
  selectedMarketplaceCity: string;
  selectedMarketplaceCategory: string;
  selectedMarketplaceSubcategory: string;
  onSelectCategory: (catId: string) => void;
  onResetToDirectory: () => void;
  onSignOut: () => void;
}

export const MarketplaceMobileDrawer: React.FC<MarketplaceMobileDrawerProps> = ({
  isOpen,
  onClose,
  categories,
  rootCategories,
  selectedMarketplaceCity,
  selectedMarketplaceCategory,
  selectedMarketplaceSubcategory,
  onSelectCategory,
  onResetToDirectory,
  onSignOut,
  ...propertyFilters
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200"
        onClick={onClose}
      />

      {/* Slide-out Menu Panel */}
      <div className="relative w-80 max-w-[85vw] bg-white h-full shadow-2xl z-10 flex flex-col animate-in slide-in-from-left duration-300">
        {/* Drawer Header */}
        <div className="p-4 bg-slate-950 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-400 text-slate-950 flex items-center justify-center font-black text-xl tracking-tighter">
              chillyads
            </div>
            <div>
              <h3 className="text-sm font-bold">Welcome to Chillyads</h3>
              <p className="text-[11px] text-slate-400">India’s Marketplace</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Drawer Navigation Links */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          <div className="space-y-1">
            <button
              onClick={() => {
                onResetToDirectory();
                onClose();
                navigateTo('/');
              }}
              className="w-full text-left px-3 py-2.5 rounded-xl text-xs font-bold text-slate-800 hover:bg-slate-100 flex items-center gap-3 transition-colors cursor-pointer"
            >
              <FolderTree className="w-4 h-4 text-blue-600" />
              <span>All Categories Directory</span>
            </button>

            <button
              onClick={() => {
                onClose();
                navigateTo('/post');
              }}
              className="w-full text-left px-3 py-2.5 rounded-xl text-xs font-extrabold text-amber-900 bg-amber-50 hover:bg-amber-100 flex items-center gap-3 transition-colors cursor-pointer border border-amber-200"
            >
              <Plus className="w-4 h-4 text-amber-600" />
              <span>Post Free Ad (+ SELL)</span>
            </button>

            <button
              onClick={() => {
                onClose();
                navigateTo('/my-account');
              }}
              className="w-full text-left px-3 py-2.5 rounded-xl text-xs font-bold text-slate-800 hover:bg-slate-100 flex items-center gap-3 transition-colors cursor-pointer"
            >
              <User className="w-4 h-4 text-emerald-600" />
              <span>My Account &amp; Saved Ads</span>
            </button>

            <button
              onClick={() => {
                onClose();
                onSignOut();
              }}
              className="w-full text-left px-3 py-2.5 rounded-xl text-xs font-bold text-slate-800 hover:bg-slate-100 flex items-center gap-3 transition-colors cursor-pointer"
            >
              <span className="w-4 h-4" />
              <span>Sign Out</span>
            </button>

            <button
              onClick={() => {
                onClose();
                navigateTo('/admin/dashboard');
              }}
              className="w-full text-left px-3 py-2.5 rounded-xl text-xs font-bold text-slate-800 hover:bg-slate-100 flex items-center gap-3 transition-colors cursor-pointer"
            >
              <Shield className="w-4 h-4 text-purple-600" />
              <span>Admin Panel &amp; Moderation</span>
            </button>
          </div>

          <div className="border-t border-slate-200 pt-3">
            <h4 className="text-[11px] font-bold uppercase tracking-wider text-slate-400 px-3 mb-2">
              Browse Categories
            </h4>
            <div className="space-y-1">
              {rootCategories.map((cat) => {
                const IconComponent = ICONS_MAP[cat.icon || 'Tag'] || Tag;
                return (
                  <button
                    key={cat.id}
                    onClick={() => {
                      onSelectCategory(cat.id);
                      onClose();
                      const targetUrl = buildChillyUrl({
                        city: selectedMarketplaceCity,
                        categoryId: cat.id,
                        subcategoryId: 'all',
                        categories,
                      });
                      navigateTo(targetUrl);
                    }}
                    className="w-full text-left px-3 py-2 rounded-xl text-xs font-medium text-slate-700 hover:bg-slate-100 flex items-center gap-3 transition-colors cursor-pointer"
                  >
                    <div className="p-1.5 rounded-lg bg-slate-100 text-slate-800">
                      <IconComponent className="w-3.5 h-3.5" />
                    </div>
                    <span>{cat.name}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Mobile Properties Advanced Filters */}
          {selectedMarketplaceCategory === 'cat_housing_realestate' && (
            <PropertyFiltersSidebar
              {...propertyFilters}
              effectiveSubcategory={selectedMarketplaceSubcategory}
              compactMobile
            />
          )}
        </div>

        {/* Drawer Footer */}
        <div className="p-4 border-t border-slate-200 bg-slate-50 text-center">
          <p className="text-[11px] text-slate-500 font-medium">
            Chillyads Classifieds India • v2.5
          </p>
        </div>
      </div>
    </div>
  );
};
