'use client';

import React, { useState } from 'react';
import { Grid, List, ChevronRight, Loader2 } from 'lucide-react';
import { Listing, Category } from '@/lib/types';
import { NavLink } from '@/components/common/NavLink';
import { ImageWithFallback } from '@/components/common/ImageWithFallback';
import { buildChillyUrl } from '@/lib/utils/seoAndUrlHelper';
import { useNavigationFeedback } from '@/lib/router/useRouter';

export interface SimilarListingsSectionProps {
  relatedListings: Listing[];
  cityName: string;
  categories: Category[];
}

export const SimilarListingsSection: React.FC<SimilarListingsSectionProps> = ({
  relatedListings,
  cityName,
  categories,
}) => {
  const [similarAdsLayout, setSimilarAdsLayout] = useState<'grid' | 'listicle'>('grid');
  const { isUrlPending } = useNavigationFeedback();

  if (relatedListings.length === 0) return null;

  return (
    <div className="mt-12 pt-8 border-t border-[#dadce0]">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <div>
          <h2 className="text-lg font-bold text-[#202124]">
            Similar Classifieds in {cityName}
          </h2>
          <p className="text-xs text-[#5f6368]">
            Related listings in the same category or city
          </p>
        </div>

        {/* Grid / Listicle Toggle for Similar Ads */}
        <div className="flex items-center border border-[#dadce0] rounded-lg p-0.5 bg-white">
          <button
            type="button"
            onClick={() => setSimilarAdsLayout('grid')}
            className={`px-2.5 py-1.5 rounded-md text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer ${
              similarAdsLayout === 'grid'
                ? 'bg-[#e6f4ea] text-[#137333]'
                : 'text-[#5f6368] hover:text-[#202124]'
            }`}
          >
            <Grid className="w-3.5 h-3.5" />
            <span>Grid</span>
          </button>
          <button
            type="button"
            onClick={() => setSimilarAdsLayout('listicle')}
            className={`px-2.5 py-1.5 rounded-md text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer ${
              similarAdsLayout === 'listicle'
                ? 'bg-[#e6f4ea] text-[#137333]'
                : 'text-[#5f6368] hover:text-[#202124]'
            }`}
          >
            <List className="w-3.5 h-3.5" />
            <span>Listicle</span>
          </button>
        </div>
      </div>

      {similarAdsLayout === 'grid' ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
          {relatedListings.map((item) => {
            const itemUrl = buildChillyUrl({ listing: item, categories });
            const sellerInitial = (item.sellerName || 'S').charAt(0).toUpperCase();
            const isItemPending = isUrlPending(itemUrl);
            return (
              <NavLink
                key={item.id}
                href={itemUrl}
                showSpinner={false}
                className="bg-white rounded-xl border border-[#dadce0] hover:border-[#1dbf73] overflow-hidden shadow-2xs hover:shadow-md cursor-pointer transition-all group flex flex-col justify-between"
              >
                <div className="relative aspect-[4/3] bg-[#f1f3f4] overflow-hidden">
                  <ImageWithFallback
                    src={item.images[0]}
                    alt={item.title}
                    categoryId={item.categoryId}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                </div>
                <div className="p-3.5 space-y-2 flex-1 flex flex-col justify-between">
                  <div className="space-y-1">
                    <div className="flex items-center justify-between gap-1.5">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <div className="w-4 h-4 rounded-full bg-[#e6f4ea] text-[#137333] font-bold text-[9px] flex items-center justify-center shrink-0">
                          {sellerInitial}
                        </div>
                        <span className="text-[11px] font-semibold text-[#202124] truncate">
                          {item.sellerName || 'Verified Seller'}
                        </span>
                      </div>
                      {isItemPending && (
                        <Loader2 className="w-3.5 h-3.5 animate-spin text-[#1dbf73] shrink-0" />
                      )}
                    </div>
                    <h4 className="font-medium text-xs text-[#202124] group-hover:text-[#1dbf73] line-clamp-2 leading-snug">
                      {item.title}
                    </h4>
                    <p className="text-[11px] text-[#5f6368] truncate">
                      {item.location.locality ? `${item.location.locality}, ` : ''}
                      {item.location.city}
                    </p>
                  </div>
                  <div className="pt-2 border-t border-[#f1f3f4] flex items-baseline justify-between">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-[#5f6368]">
                      Price
                    </span>
                    <span className="text-sm font-bold font-mono tabular-nums text-[#202124]">
                      ₹{item.price.toLocaleString('en-IN')}
                    </span>
                  </div>
                </div>
              </NavLink>
            );
          })}
        </div>
      ) : (
        <div className="space-y-3">
          {relatedListings.map((item, idx) => {
            const itemUrl = buildChillyUrl({ listing: item, categories });
            const sellerInitial = (item.sellerName || 'S').charAt(0).toUpperCase();
            const isItemPending = isUrlPending(itemUrl);
            return (
              <NavLink
                key={item.id}
                href={itemUrl}
                showSpinner={false}
                className="bg-white rounded-xl border border-[#dadce0] hover:border-[#1dbf73] p-3.5 sm:p-4 shadow-2xs hover:shadow-md cursor-pointer transition-all group flex flex-col sm:flex-row items-start sm:items-center gap-4"
              >
                <div className="hidden sm:flex w-8 h-8 rounded-lg bg-[#f8f9fa] border border-[#dadce0] text-[#5f6368] group-hover:border-[#1dbf73] group-hover:text-[#1dbf73] font-mono text-xs font-bold tabular-nums items-center justify-center shrink-0 transition-colors">
                  {String(idx + 1).padStart(2, '0')}
                </div>

                <div className="relative w-full sm:w-44 h-40 sm:h-28 rounded-lg bg-[#f1f3f4] overflow-hidden shrink-0">
                  <ImageWithFallback
                    src={item.images[0]}
                    alt={item.title}
                    categoryId={item.categoryId}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                </div>

                <div className="flex-1 min-w-0 space-y-1.5">
                  <div className="flex flex-wrap items-center gap-2 text-[11px] text-[#5f6368]">
                    <div className="flex items-center gap-1.5">
                      <div className="w-4 h-4 rounded-full bg-[#e6f4ea] text-[#137333] font-bold text-[9px] flex items-center justify-center">
                        {sellerInitial}
                      </div>
                      <span className="font-semibold text-[#202124]">
                        {item.sellerName || 'Verified Seller'}
                      </span>
                    </div>
                    <span>·</span>
                    <span>
                      {item.location.locality ? `${item.location.locality}, ` : ''}
                      {item.location.city}
                    </span>
                    <span>·</span>
                    <span>{item.createdAt.split(' ')[0]}</span>
                  </div>

                  <h4 className="text-sm sm:text-base font-bold text-[#202124] group-hover:text-[#1dbf73] transition-colors line-clamp-1">
                    {item.title}
                  </h4>

                  <p className="text-xs text-[#5f6368] line-clamp-2 leading-relaxed">
                    {item.description}
                  </p>
                </div>

                <div className="w-full sm:w-auto sm:pl-4 sm:border-l border-[#f1f3f4] flex sm:flex-col items-center sm:items-end justify-between gap-2 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0">
                  <div className="sm:text-right">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-[#5f6368] block">
                      Price
                    </span>
                    <span className="text-base sm:text-lg font-extrabold font-mono tabular-nums text-[#202124]">
                      ₹{item.price.toLocaleString('en-IN')}
                    </span>
                  </div>
                  <span className="px-3 py-1.5 rounded-md bg-[#f8f9fa] group-hover:bg-[#1dbf73] text-[#202124] group-hover:text-white border border-[#dadce0] group-hover:border-[#1dbf73] text-xs font-semibold transition-colors flex items-center gap-1">
                    <span>View Ad</span>
                    {isItemPending ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <ChevronRight className="w-3.5 h-3.5" />
                    )}
                  </span>
                </div>
              </NavLink>
            );
          })}
        </div>
      )}
    </div>
  );
};
