import React from 'react';
import { Plus } from 'lucide-react';
import { NavLink } from '@/components/common/NavLink';
import { LocationSelectorInput, CompactCityOption } from './LocationSelectorInput';
import { MyAccountDropdown } from '@/components/common/MyAccountDropdown';
import { Category, LocationItem } from '@/lib/types';
import { buildChillyUrl } from '@/lib/utils/seoAndUrlHelper';
import { HeaderSearchInput } from './HeaderSearchInput';
import { HeaderMobileMenuIsland, CompactDrawerCategory } from './HeaderMobileMenuIsland';

export interface MarketplaceHeaderProps {
  effectiveCity: string;
  effectiveSearch?: string;
  onSearchChange?: (q: string) => void;
  onOpenMobileMenu?: () => void;
  categories?: Category[];
  locations?: LocationItem[];
  activeCategoryId?: string;
  activeSubcategoryId?: string;
}

export const MarketplaceHeader: React.FC<MarketplaceHeaderProps> = ({
  effectiveCity,
  effectiveSearch = '',
  onSearchChange,
  onOpenMobileMenu,
  categories,
  locations,
  activeCategoryId,
  activeSubcategoryId,
}) => {
  const rootCategories = (categories || []).filter((c) => !c.parentId && c.isActive);

  const drawerCategories: CompactDrawerCategory[] = rootCategories.map((cat) => ({
    id: cat.id,
    name: cat.name,
    icon: cat.icon || 'Tag',
    href: buildChillyUrl({
      city: effectiveCity,
      categoryId: cat.id,
      subcategoryId: 'all',
      categories: categories || [],
    }),
  }));

  const statesMap = new Map<string, string>();
  const compactCityOptions: CompactCityOption[] = [];
  if (locations && locations.length > 0) {
    for (const loc of locations) {
      if (loc.type === 'state') {
        statesMap.set(loc.id, loc.name);
      }
    }
    for (const loc of locations) {
      if (loc.type === 'city') {
        compactCityOptions.push({
          id: loc.id,
          name: loc.name,
          stateName: loc.parentId ? statesMap.get(loc.parentId) : undefined,
        });
      }
    }
  }

  const activeCatObj =
    activeCategoryId && activeCategoryId !== 'all'
      ? (categories || []).find((c) => c.id === activeCategoryId && !c.parentId)
      : undefined;
  const activeSubObj =
    activeSubcategoryId && activeSubcategoryId !== 'all'
      ? (categories || []).find((c) => c.id === activeSubcategoryId && c.parentId !== null)
      : undefined;

  const cityOptionsProp = compactCityOptions.length > 0 ? compactCityOptions : undefined;

  return (
    <>
      {/* Google Cloud 4-Color Accent Hairline */}
      <div className="h-[3px] w-full flex shrink-0">
        <div className="flex-1 bg-[#4285F4]" />
        <div className="flex-1 bg-[#EA4335]" />
        <div className="flex-1 bg-[#FBBC05]" />
        <div className="flex-1 bg-[#34A853]" />
      </div>

      {/* Main Navigation Header */}
      <header className="bg-white border-b border-[#dadce0] sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3">
          {/* Desktop & Top Mobile Bar */}
          <div className="flex items-center justify-between gap-4">
            {/* Logo & Mobile Menu Toggle */}
            <div className="flex items-center gap-4">
              <HeaderMobileMenuIsland
                onOpenMobileMenu={onOpenMobileMenu}
                drawerCategories={drawerCategories}
              />

              <NavLink
                href="/"
                className="flex items-baseline font-black text-2xl tracking-tight text-[#202124] cursor-pointer select-none"
              >
                <span>chillyads</span>
                <span className="text-[#1dbf73] text-3xl leading-none">.</span>
              </NavLink>

              {/* Typeable Location Selector (Desktop) */}
              <div className="hidden sm:block">
                <LocationSelectorInput
                  currentCity={effectiveCity}
                  cityOptions={cityOptionsProp}
                  currentCategoryId={activeCategoryId}
                  currentSubcategoryId={activeSubcategoryId}
                  activeCategorySlug={activeCatObj?.slug}
                  activeSubcategorySlug={activeSubObj?.slug}
                />
              </div>
            </div>

            {/* Search Bar (Desktop View) */}
            <HeaderSearchInput
              variant="desktop"
              effectiveSearch={effectiveSearch}
              onSearchChange={onSearchChange}
            />

            {/* Actions: My Account Dropdown & Post Ad CTA */}
            <div className="flex items-center gap-2 sm:gap-3">
              <MyAccountDropdown />

              <NavLink
                href="/post"
                className="px-4 py-2 bg-[#1dbf73] hover:bg-[#19a463] text-white font-bold rounded-md text-xs flex items-center gap-1.5 shadow-2xs transition-all cursor-pointer"
              >
                <Plus className="w-4 h-4 stroke-[2.5]" />
                <span>Post a Gig / Ad</span>
              </NavLink>
            </div>
          </div>

          {/* Mobile Search Box (Below Logo & Top Bar on Mobile View) */}
          <HeaderSearchInput
            variant="mobile"
            effectiveSearch={effectiveSearch}
            onSearchChange={onSearchChange}
          />
        </div>

        {/* Mobile Location Selector Bar */}
        <div className="sm:hidden px-4 pb-2.5 pt-1 border-t border-[#f1f3f4]">
          <LocationSelectorInput
            className="w-full"
            currentCity={effectiveCity}
            currentCategoryId={activeCategoryId}
            currentSubcategoryId={activeSubcategoryId}
            activeCategorySlug={activeCatObj?.slug}
            activeSubcategorySlug={activeSubObj?.slug}
          />
        </div>
      </header>
    </>
  );
};
