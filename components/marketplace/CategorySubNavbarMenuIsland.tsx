'use client';

import React, { useState, useRef, useEffect, useMemo } from 'react';
import { ChevronDown, X, Grid, Loader2 } from 'lucide-react';
import { useAppOptional } from '@/context/AppContextInstance';
import { buildChillyUrl } from '@/lib/utils/seoAndUrlHelper';
import { NavLink } from '@/components/common/NavLink';
import { useNavigationFeedback } from '@/lib/router/useRouter';

export interface CompactSubNavCategory {
  id: string;
  name: string;
  href: string;
  children: Array<{
    id: string;
    name: string;
    href: string;
    isActive: boolean;
  }>;
}

export interface CategorySubNavbarMenuIslandProps {
  city: string;
  allDirectoryHref: string;
  navTree: CompactSubNavCategory[];
  activeCategoryId?: string;
  activeSubcategoryId?: string;
}

export const CategorySubNavbarMenuIsland: React.FC<CategorySubNavbarMenuIslandProps> = ({
  city: propCity,
  allDirectoryHref: propAllDirectoryHref,
  navTree: propNavTree,
  activeCategoryId,
  activeSubcategoryId,
}) => {
  const app = useAppOptional();
  const { isNavigating, pendingLinkId } = useNavigationFeedback();

  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const city = propCity || app?.selectedMarketplaceCity || 'All India';

  const effectiveNavTree = useMemo<CompactSubNavCategory[]>(() => {
    if (propNavTree && propNavTree.length > 0) {
      return propNavTree;
    }
    const fallbackCategories = app?.categories ?? [];
    if (fallbackCategories.length === 0) return [];
    const roots = fallbackCategories.filter((c) => c.parentId === null);
    return roots.map((rootCat) => {
      const children = fallbackCategories.filter((c) => c.parentId === rootCat.id);
      return {
        id: rootCat.id,
        name: rootCat.name,
        href: buildChillyUrl({
          city,
          categoryId: rootCat.id,
          subcategoryId: 'all',
          categories: fallbackCategories,
        }),
        children: children.map((sub) => ({
          id: sub.id,
          name: sub.name,
          href: buildChillyUrl({
            city,
            categoryId: rootCat.id,
            subcategoryId: sub.id,
            categories: fallbackCategories,
          }),
          isActive:
            activeCategoryId === rootCat.id && activeSubcategoryId === sub.id,
        })),
      };
    });
  }, [propNavTree, app?.categories, city, activeCategoryId, activeSubcategoryId]);

  const allDirectoryHref =
    propAllDirectoryHref ||
    buildChillyUrl({
      city,
      categoryId: 'all',
      subcategoryId: 'all',
      categories: app?.categories ?? [],
    });

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const closeMenus = () => {
    setIsDropdownOpen(false);
    setMobileDrawerOpen(false);
  };

  const toggleDropdown = () => {
    if (typeof window !== 'undefined' && window.innerWidth < 768) {
      setMobileDrawerOpen(true);
    } else {
      setIsDropdownOpen((prev) => !prev);
    }
  };

  return (
    <>
      <div className="relative shrink-0 py-2" ref={dropdownRef}>
        <button
          type="button"
          onClick={toggleDropdown}
          aria-expanded={isDropdownOpen || mobileDrawerOpen}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold tracking-tight transition-all cursor-pointer select-none border ${
            isDropdownOpen || mobileDrawerOpen
              ? 'bg-[#e8f0fe] text-[#1a73e8] border-[#d2e3fc]'
              : 'text-[#3c4043] bg-[#f8f9fa] border-[#dadce0] hover:bg-[#f1f3f4] hover:text-[#202124]'
          }`}
        >
          {isNavigating && !pendingLinkId ? (
            <Loader2 className="w-3.5 h-3.5 text-[#1dbf73] animate-spin" />
          ) : (
            <Grid className="w-3.5 h-3.5 text-[#1dbf73]" />
          )}
          <span>All Categories</span>
          <ChevronDown
            className={`w-3.5 h-3.5 transition-transform duration-200 ${
              isDropdownOpen || mobileDrawerOpen ? 'rotate-180 text-[#1a73e8]' : 'text-[#5f6368]'
            }`}
          />
        </button>

        {/* Desktop Multi-Column Megamenu Dropdown */}
        {isDropdownOpen && (
          <div className="hidden md:block absolute left-0 top-full mt-1.5 w-[860px] max-w-[90vw] bg-white border border-[#dadce0] rounded-xl shadow-xl p-6 z-[100] animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 mb-4 border-b border-[#dadce0]">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold uppercase tracking-wider text-[#202124]">
                  Browse Marketplace Directory
                </span>
                <span className="text-xs text-[#5f6368] font-medium">· {city}</span>
              </div>
              <NavLink
                href={allDirectoryHref}
                onClick={closeMenus}
                className="text-xs font-semibold text-[#1dbf73] hover:text-[#19a463] hover:underline cursor-pointer inline-flex items-center"
              >
                <span>Full Directory Overview →</span>
              </NavLink>
            </div>

            {/* 4-column category grid */}
            <div className="grid grid-cols-4 gap-6 max-h-[460px] overflow-y-auto pr-2 scrollbar-thin">
              {effectiveNavTree.map((rootCat) => (
                <div key={rootCat.id} className="space-y-2">
                  {/* Parent Category Header */}
                  <NavLink
                    href={rootCat.href}
                    onClick={closeMenus}
                    className="font-bold text-xs text-[#202124] hover:text-[#1dbf73] transition-colors flex items-center text-left truncate w-full cursor-pointer group"
                  >
                    <span className="group-hover:underline truncate">{rootCat.name}</span>
                  </NavLink>

                  {/* Child Subcategories */}
                  {rootCat.children.length > 0 && (
                    <div className="space-y-1 pl-1 border-l border-[#e8eaed]">
                      {rootCat.children.map((sub) => (
                        <NavLink
                          key={sub.id}
                          href={sub.href}
                          onClick={closeMenus}
                          className={`text-xs flex items-center text-left truncate w-full transition-colors cursor-pointer py-0.5 pl-2 ${
                            sub.isActive
                              ? 'text-[#1dbf73] font-bold'
                              : 'text-[#5f6368] hover:text-[#202124]'
                          }`}
                          title={sub.name}
                        >
                          <span className="truncate">{sub.name}</span>
                        </NavLink>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Mobile Fullscreen Slide-Up Category Explorer Drawer */}
      {mobileDrawerOpen && (
        <div className="md:hidden fixed inset-0 z-[9999] bg-black/60 backdrop-blur-xs flex flex-col justify-end animate-in fade-in duration-200">
          <div className="bg-white rounded-t-3xl max-h-[85vh] flex flex-col shadow-2xl overflow-hidden animate-in slide-in-from-bottom duration-300">
            {/* Drawer Header */}
            <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
              <div className="flex items-center gap-2">
                <span className="font-black text-sm text-slate-900 uppercase tracking-wider">
                  All Categories
                </span>
                <span className="text-xs text-slate-400 font-medium">({city})</span>
              </div>
              <button
                type="button"
                onClick={() => setMobileDrawerOpen(false)}
                className="w-8 h-8 rounded-full bg-slate-200 hover:bg-slate-300 text-slate-700 flex items-center justify-center cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Quick All Classifieds Button */}
            <div className="p-3 bg-blue-50/60 border-b border-blue-100 flex items-center justify-between">
              <span className="text-xs text-blue-950 font-bold">Browse everything in {city}</span>
              <NavLink
                href={allDirectoryHref}
                onClick={closeMenus}
                className="px-3 py-1 bg-blue-600 text-white rounded-lg text-xs font-bold shadow-xs cursor-pointer inline-flex items-center"
              >
                <span>View All</span>
              </NavLink>
            </div>

            {/* Category List */}
            <div className="p-4 overflow-y-auto space-y-4 flex-1 divide-y divide-slate-100">
              {effectiveNavTree.map((rootCat) => (
                <div key={rootCat.id} className="pt-3 first:pt-0 space-y-2">
                  <NavLink
                    href={rootCat.href}
                    onClick={closeMenus}
                    className="font-black text-xs text-slate-900 uppercase tracking-wider flex items-center justify-between w-full text-left cursor-pointer"
                  >
                    <span className="text-blue-900">{rootCat.name}</span>
                    <span className="text-[10px] text-blue-600 font-bold">All {rootCat.name} →</span>
                  </NavLink>

                  {rootCat.children.length > 0 && (
                    <div className="grid grid-cols-2 gap-1.5 pt-1">
                      {rootCat.children.map((sub) => (
                        <NavLink
                          key={sub.id}
                          href={sub.href}
                          onClick={closeMenus}
                          className="text-left text-xs text-slate-600 hover:text-blue-600 p-2 rounded-lg bg-slate-50 border border-slate-100 truncate font-medium active:bg-blue-100 cursor-pointer flex items-center justify-between"
                        >
                          <span className="truncate">{sub.name}</span>
                        </NavLink>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </>
  );
};
