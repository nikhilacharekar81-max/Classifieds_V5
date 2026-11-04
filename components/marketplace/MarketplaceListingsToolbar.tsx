'use client';

import React from 'react';
import { ChevronRight, Grid, List, FolderTree, X } from 'lucide-react';
import { Category } from '@/lib/types';
import { NavLink } from '@/components/common/NavLink';
import { buildChillyUrl } from '@/lib/utils/seoAndUrlHelper';

export interface MarketplaceListingsToolbarProps {
  effectiveCity: string;
  effectiveCategory: string;
  effectiveSubcategory: string;
  effectiveSearch: string;
  isSearchRoute: boolean;
  activeMainCat?: Category;
  categories: Category[];
  paginatedCount: number;
  totalMatchingListings: number;
  currentPage: number;
  totalPages: number;
  itemsPerPage: number;
  listingsLayout: 'grid' | 'listicle';
  onChangeLayout: (layout: 'grid' | 'listicle') => void;
  sortBy: string;
  onChangeSort: (newSort: string) => void;
  isLoading?: boolean;
}

export const MarketplaceListingsToolbar: React.FC<MarketplaceListingsToolbarProps> = ({
  effectiveCity,
  effectiveCategory,
  effectiveSubcategory,
  effectiveSearch,
  isSearchRoute,
  activeMainCat,
  categories,
  paginatedCount,
  totalMatchingListings,
  currentPage,
  totalPages,
  itemsPerPage,
  listingsLayout,
  onChangeLayout,
  sortBy,
  onChangeSort,
  isLoading = false,
}) => {
  const isSpecificCity =
    Boolean(effectiveCity) &&
    effectiveCity !== 'All India' &&
    effectiveCity !== 'All Cities';
  const activeSubcatName =
    effectiveSubcategory !== 'all'
      ? categories.find((c) => c.id === effectiveSubcategory)?.name
      : undefined;

  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
      <div className="space-y-1.5">
        <nav
          aria-label="Breadcrumb"
          className="flex flex-wrap items-center gap-1.5 text-xs text-slate-500"
        >
          <NavLink href="/" className="hover:text-blue-600 font-medium cursor-pointer">
            Home
          </NavLink>

          {isSpecificCity && (
            <>
              <ChevronRight className="w-3 h-3 text-slate-400" />
              <NavLink
                href={buildChillyUrl({ city: effectiveCity, categories })}
                className="hover:text-blue-600 font-medium cursor-pointer"
              >
                {effectiveCity}
              </NavLink>
            </>
          )}

          {activeMainCat && (
            <>
              <ChevronRight className="w-3 h-3 text-slate-400" />
              <NavLink
                href={buildChillyUrl({
                  city: effectiveCity,
                  categoryId: activeMainCat.id,
                  subcategoryId: 'all',
                  categories,
                })}
                className={`hover:text-blue-600 font-medium cursor-pointer ${
                  effectiveSubcategory === 'all' ? 'text-slate-900 font-bold' : ''
                }`}
              >
                {activeMainCat.name}
              </NavLink>
            </>
          )}

          {effectiveSubcategory !== 'all' && (
            <>
              <ChevronRight className="w-3 h-3 text-slate-400" />
              <span className="font-bold text-blue-600">{activeSubcatName}</span>
            </>
          )}

          {isSearchRoute && !activeMainCat && (
            <>
              <ChevronRight className="w-3 h-3 text-slate-400" />
              <span className="font-bold text-blue-600">
                {effectiveSearch ? `Search: "${effectiveSearch}"` : 'Search Results'}
              </span>
            </>
          )}
        </nav>

        <h1 className="text-xl font-black text-slate-900 tracking-tight">
          {effectiveSubcategory !== 'all'
            ? activeSubcatName
            : activeMainCat
            ? activeMainCat.name
            : effectiveSearch
            ? `Search Results for "${effectiveSearch}"`
            : 'Search Results'}{' '}
          in {effectiveCity}
        </h1>
        <p className="text-xs text-slate-500">
          {isLoading
            ? `Loading verified listings in ${effectiveCity}...`
            : `Showing ${paginatedCount} of ${totalMatchingListings.toLocaleString()} verified listings (Page ${currentPage} of ${totalPages} • Max ${itemsPerPage} per page)`}
        </p>
      </div>

      {/* Action buttons, Grid/Listicle Toggle & Sort selector on right */}
      <div className="flex flex-wrap items-center gap-2.5 shrink-0">
        {/* Grid / Listicle View Toggle */}
        <div className="flex items-center border border-[#dadce0] rounded-lg p-0.5 bg-white">
          <button
            type="button"
            onClick={() => onChangeLayout('grid')}
            className={`px-2.5 py-1 rounded-md text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer ${
              listingsLayout === 'grid'
                ? 'bg-[#e6f4ea] text-[#137333]'
                : 'text-[#5f6368] hover:text-[#202124]'
            }`}
          >
            <Grid className="w-3.5 h-3.5" />
            <span>Grid</span>
          </button>
          <button
            type="button"
            onClick={() => onChangeLayout('listicle')}
            className={`px-2.5 py-1 rounded-md text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer ${
              listingsLayout === 'listicle'
                ? 'bg-[#e6f4ea] text-[#137333]'
                : 'text-[#5f6368] hover:text-[#202124]'
            }`}
          >
            <List className="w-3.5 h-3.5" />
            <span>Listicle</span>
          </button>
        </div>

        <div className="flex items-center gap-1.5">
          <label
            htmlFor="marketplace-sort"
            className="text-[11px] font-bold text-slate-500 uppercase tracking-wider"
          >
            Sort:
          </label>
          <select
            id="marketplace-sort"
            value={sortBy}
            onChange={(e) => onChangeSort(e.target.value)}
            className="rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-bold text-slate-700 outline-none focus:border-blue-600 cursor-pointer"
          >
            <option value="newest">Newest First</option>
            <option value="price_low">Price: Low to High</option>
            <option value="price_high">Price: High to Low</option>
            <option value="oldest">Oldest First</option>
          </select>
        </div>

        <NavLink
          href={buildChillyUrl({ city: effectiveCity, categories })}
          className="px-3 py-1.5 rounded-lg border border-slate-300 text-xs font-bold text-slate-700 hover:bg-slate-100 flex items-center gap-1.5 transition-colors cursor-pointer"
        >
          <FolderTree className="w-3.5 h-3.5 text-blue-600" />
          <span>All Categories</span>
        </NavLink>

        {(effectiveCategory !== 'all' || effectiveCity !== 'All India' || effectiveSearch) && (
          <NavLink
            href="/"
            className="text-xs font-semibold text-rose-600 hover:text-rose-700 flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-rose-200 hover:bg-rose-50 transition-colors cursor-pointer"
          >
            <X className="w-3.5 h-3.5" /> Clear All Filters
          </NavLink>
        )}
      </div>
    </div>
  );
};
