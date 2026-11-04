import React from 'react';
import { ChevronRight } from 'lucide-react';
import { NavLink } from '@/components/common/NavLink';
import { Category } from '@/lib/types';
import { buildChillyUrl } from '@/lib/utils/seoAndUrlHelper';
import { HeroSearchBar } from './HeroSearchBar';

export interface MarketplaceHeroBannerProps {
  effectiveCity: string;
  effectiveSearch?: string;
  onSearchChange?: (q: string) => void;
  categories: Category[];
  totalDirectoryListings: number;
  rootCategoriesCount: number;
  isCountsLoading?: boolean;
}

const POPULAR_TAGS = [
  { label: 'Used Cars', cat: 'cat_cars', sub: 'sub_cars_cars' },
  { label: 'Apartments for Rent', cat: 'cat_housing_realestate', sub: 'sub_house_apt_rent' },
  { label: 'iPhones & Mobiles', cat: 'cat_mobiles', sub: 'sub_mob_phones' },
  { label: 'Home & Tech Services', cat: 'cat_services', sub: 'all' },
];

export const MarketplaceHeroBanner: React.FC<MarketplaceHeroBannerProps> = ({
  effectiveCity,
  effectiveSearch = '',
  onSearchChange,
  categories,
  totalDirectoryListings,
  rootCategoriesCount,
  isCountsLoading = false,
}) => {
  const isSpecificCity =
    Boolean(effectiveCity) &&
    effectiveCity !== 'All India' &&
    effectiveCity !== 'All Cities';

  return (
    <div className="relative rounded-2xl overflow-hidden bg-[#0a4226] text-white border border-[#1dbf73]/30 shadow-sm">
      <div className="px-6 py-10 sm:px-12 sm:py-14 max-w-4xl space-y-6 relative z-10">
        <nav
          aria-label="Breadcrumb"
          className="flex flex-wrap items-center gap-1.5 text-xs text-emerald-200/80"
        >
          <NavLink href="/" className="hover:text-white font-medium cursor-pointer">
            chillyads
          </NavLink>
          <span>/</span>
          {isSpecificCity ? (
            <>
              <NavLink
                href={buildChillyUrl({ city: effectiveCity, categories })}
                className="font-semibold text-white hover:underline"
              >
                {effectiveCity}
              </NavLink>
              <span>/</span>
              <span className="text-emerald-100">Marketplace</span>
            </>
          ) : (
            <span className="font-semibold text-white">All India Marketplace</span>
          )}
        </nav>

        <h1 className="text-2xl sm:text-4xl lg:text-[40px] font-extrabold tracking-tight leading-[1.12] text-white">
          {isSpecificCity ? (
            <>
              Find the right <span className="italic font-serif text-[#1dbf73]">local service</span>,
              vehicle, or property in {effectiveCity}
            </>
          ) : (
            <>
              Scale your local search with{' '}
              <span className="italic font-serif text-[#1dbf73]">verified</span> gigs, vehicles &amp;
              real estate
            </>
          )}
        </h1>

        {/* Hero Integrated Search Bar (Client Island) */}
        <HeroSearchBar
          effectiveCity={effectiveCity}
          initialSearch={effectiveSearch}
          onSearchChange={onSearchChange}
        />

        {/* Popular Tags */}
        <div className="flex flex-wrap items-center gap-2 text-xs pt-1">
          <span className="font-semibold text-emerald-100/90">Popular:</span>
          {POPULAR_TAGS.map((tag) => (
            <NavLink
              key={tag.label}
              href={buildChillyUrl({
                city: effectiveCity,
                categoryId: tag.cat,
                subcategoryId: tag.sub,
                categories,
              })}
              className="px-3 py-1 rounded-full border border-white/30 hover:border-white hover:bg-white/10 text-white font-medium transition-colors cursor-pointer"
            >
              {tag.label}
            </NavLink>
          ))}
        </div>
      </div>

      {/* Bottom Cloud Metric Bar inside Hero */}
      <div className="bg-black/25 border-t border-white/10 px-6 sm:px-12 py-3 flex flex-wrap items-center justify-between gap-4 text-xs text-emerald-100/90">
        <div className="flex flex-wrap items-center gap-6 tabular-nums">
          {!isCountsLoading && (
            <>
              <span>
                <strong className="text-white font-mono">
                  {totalDirectoryListings.toLocaleString()}
                </strong>{' '}
                active listings
              </span>
              <span>·</span>
            </>
          )}
          <span>
            <strong className="text-white font-mono">{rootCategoriesCount}</strong> primary verticals
          </span>
          <span>·</span>
          <span>
            Direct KYC-verified sellers across{' '}
            {isSpecificCity ? effectiveCity : '500+ Indian cities'}
          </span>
        </div>
        <NavLink
          href="/post"
          className="text-white hover:text-[#1dbf73] font-semibold flex items-center gap-1 transition-colors"
        >
          <span>Become a Seller</span>
          <ChevronRight className="w-3.5 h-3.5" />
        </NavLink>
      </div>
    </div>
  );
};
