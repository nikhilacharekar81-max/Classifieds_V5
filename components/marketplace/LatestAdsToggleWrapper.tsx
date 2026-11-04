'use client';

import React, { useState } from 'react';
import { Grid, List } from 'lucide-react';
import { Listing, Category } from '@/lib/types';
import { ListingGridCard } from './ListingGridCard';
import { ListingListicleCard } from './ListingListicleCard';

export interface LatestAdItemWithSubName {
  listing: Listing;
  subName: string;
}

export interface LatestAdsToggleWrapperProps {
  title: React.ReactNode;
  items: LatestAdItemWithSubName[];
  categories: Category[];
  latestAdsLayout?: 'grid' | 'listicle';
  onChangeLayout?: (layout: 'grid' | 'listicle') => void;
}

export const LatestAdsToggleWrapper: React.FC<LatestAdsToggleWrapperProps> = ({
  title,
  items,
  categories,
  latestAdsLayout,
  onChangeLayout,
}) => {
  const [internalLayout, setInternalLayout] = useState<'grid' | 'listicle'>(
    latestAdsLayout || 'grid'
  );

  const activeLayout = latestAdsLayout ?? internalLayout;

  const handleLayoutChange = (nextLayout: 'grid' | 'listicle') => {
    if (onChangeLayout) {
      onChangeLayout(nextLayout);
    } else {
      setInternalLayout(nextLayout);
    }
  };

  return (
    <div className="space-y-4 pt-4 border-t border-[#dadce0]">
      <div className="flex flex-wrap items-center justify-between gap-3">
        {title}
        {/* Grid / Listicle View Toggle */}
        <div className="flex items-center border border-[#dadce0] rounded-lg p-0.5 bg-white">
          <button
            type="button"
            onClick={() => handleLayoutChange('grid')}
            className={`px-2.5 py-1.5 rounded-md text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer ${
              activeLayout === 'grid'
                ? 'bg-[#e6f4ea] text-[#137333]'
                : 'text-[#5f6368] hover:text-[#202124]'
            }`}
          >
            <Grid className="w-3.5 h-3.5" />
            <span>Grid</span>
          </button>
          <button
            type="button"
            onClick={() => handleLayoutChange('listicle')}
            className={`px-2.5 py-1.5 rounded-md text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer ${
              activeLayout === 'listicle'
                ? 'bg-[#e6f4ea] text-[#137333]'
                : 'text-[#5f6368] hover:text-[#202124]'
            }`}
          >
            <List className="w-3.5 h-3.5" />
            <span>Listicle</span>
          </button>
        </div>
      </div>

      {activeLayout === 'grid' ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
          {items.map(({ listing, subName }, idx) => (
            <ListingGridCard
              key={listing.id}
              listing={listing}
              categories={categories}
              subName={subName}
              variant="latest"
              priority={idx < 5}
            />
          ))}
        </div>
      ) : (
        <div className="space-y-3">
          {items.map(({ listing, subName }, idx) => (
            <ListingListicleCard
              key={listing.id}
              listing={listing}
              rankNumber={idx + 1}
              categories={categories}
              subName={subName}
              variant="latest"
              priority={idx < 3}
            />
          ))}
        </div>
      )}
    </div>
  );
};
