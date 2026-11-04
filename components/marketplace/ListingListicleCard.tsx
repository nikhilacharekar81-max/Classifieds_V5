import React from 'react';
import { Rocket, ChevronRight } from 'lucide-react';
import { Listing, Category, UserGeoLocation } from '@/lib/types';
import { NavLink } from '@/components/common/NavLink';
import { ImageWithFallback } from '@/components/common/ImageWithFallback';
import { buildChillyUrl } from '@/lib/utils/seoAndUrlHelper';
import { calculateDistanceKm } from '@/lib/utils/distanceUtils';
import { isListingBoosted } from '@/lib/utils/boostHelper';
import { extractListingAttributeSummary, isRentalListing } from './ListingGridCard';
import { FavoriteButton } from './FavoriteButton';

export interface ListingListicleCardProps {
  listing: Listing;
  rankNumber: number;
  categories: Category[];
  subName: string;
  userLocation?: UserGeoLocation | null;
  onSaveWatchlist?: (listing: Listing) => void;
  variant?: 'latest' | 'catalog';
  priority?: boolean;
}

export const ListingListicleCard: React.FC<ListingListicleCardProps> = ({
  listing,
  rankNumber,
  categories,
  subName,
  userLocation,
  onSaveWatchlist,
  variant = 'catalog',
  priority = false,
}) => {
  const listingUrl = buildChillyUrl({ listing, categories });
  const sellerInitial = (listing.sellerName || 'S').charAt(0).toUpperCase();

  const distanceKm =
    variant === 'catalog' &&
    userLocation &&
    listing.location.latitude &&
    listing.location.longitude
      ? calculateDistanceKm(
          userLocation.latitude,
          userLocation.longitude,
          listing.location.latitude,
          listing.location.longitude
        )
      : null;

  const attrParts = variant === 'catalog' ? extractListingAttributeSummary(listing, 4) : [];
  const isRental = variant === 'catalog' && isRentalListing(listing);
  const boosted = variant === 'catalog' && isListingBoosted(listing);

  return (
    <article className="bg-white rounded-xl border border-[#dadce0] hover:border-[#1dbf73] p-3.5 sm:p-4 shadow-2xs hover:shadow-md transition-all cursor-pointer flex flex-col sm:flex-row items-start sm:items-center gap-4 group">
      {/* Listicle Rank Number */}
      <div className="hidden sm:flex w-8 h-8 rounded-lg bg-[#f8f9fa] border border-[#dadce0] text-[#5f6368] group-hover:border-[#1dbf73] group-hover:text-[#1dbf73] font-mono text-xs font-bold tabular-nums items-center justify-center shrink-0 transition-colors">
        {String(rankNumber).padStart(2, '0')}
      </div>

      {/* Thumbnail */}
      <NavLink
        href={listingUrl}
        showSpinner={false}
        className={`relative w-full ${
          variant === 'latest' ? 'sm:w-44 h-40 sm:h-28' : 'sm:w-48 h-44 sm:h-32'
        } rounded-lg bg-[#f1f3f4] overflow-hidden shrink-0 block`}
        aria-label={listing.title}
      >
        <ImageWithFallback
          src={
            listing.images[0] ||
            'https://images.unsplash.com/photo-1549399542-7e3f8b79c341?w=600&auto=format&fit=crop&q=80'
          }
          alt={listing.title}
          categoryId={listing.categoryId}
          priority={priority}
          className="w-full h-full object-cover group-hover:scale-[1.03] transition-transform duration-300"
        />
        {boosted ? (
          <div className="absolute top-2 left-2 bg-[#1a73e8] text-white text-[10px] font-bold px-2 py-0.5 rounded shadow-xs flex items-center gap-1 uppercase tracking-wider pointer-events-none">
            <Rocket className="w-3 h-3" /> Boosted
          </div>
        ) : listing.isFeatured ? (
          <div className="absolute top-2 left-2 bg-[#202124]/90 text-white text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-wider pointer-events-none">
            Featured
          </div>
        ) : null}
      </NavLink>

      {/* Content Body */}
      <div className="flex-1 min-w-0 space-y-1.5">
        <div className="flex flex-wrap items-center gap-2 text-[11px] text-[#5f6368]">
          <div className="flex items-center gap-1.5">
            <div className="w-4 h-4 rounded-full bg-[#e6f4ea] text-[#137333] font-bold text-[9px] flex items-center justify-center">
              {sellerInitial}
            </div>
            <span className="font-semibold text-[#202124]">
              {listing.sellerName || 'Verified Seller'}
            </span>
          </div>
          {variant === 'latest' && (
            <>
              <span>·</span>
              <span className="text-[#1dbf73] font-semibold">Verified</span>
            </>
          )}
          <span>·</span>
          <span>{subName || 'Classified'}</span>
          {variant === 'latest' ? (
            <>
              <span>·</span>
              <span>
                {listing.location.locality ? `${listing.location.locality}, ` : ''}
                {listing.location.city}
              </span>
            </>
          ) : (
            attrParts.length > 0 && (
              <>
                <span>·</span>
                <span className="font-mono tabular-nums text-[#202124]">
                  {attrParts.join(' · ')}
                </span>
              </>
            )
          )}
        </div>

        <h3 className="text-sm sm:text-base font-bold text-[#202124] group-hover:text-[#1dbf73] transition-colors line-clamp-1">
          <NavLink href={listingUrl} className="hover:underline">
            {listing.title}
          </NavLink>
        </h3>

        <p className="text-xs text-[#5f6368] line-clamp-2 leading-relaxed">
          {listing.description}
        </p>

        {variant === 'catalog' && (
          <p className="text-[11px] text-[#5f6368] pt-0.5">
            {distanceKm !== null ? `${distanceKm} km away · ` : ''}
            {listing.location.locality ? `${listing.location.locality}, ` : ''}
            {listing.location.city} · Posted {listing.createdAt.split(' ')[0]}
          </p>
        )}
      </div>

      {/* Right Price & Action */}
      <div className="w-full sm:w-auto sm:pl-4 sm:border-l border-[#f1f3f4] flex sm:flex-col items-center sm:items-end justify-between gap-2 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0">
        <div className="sm:text-right">
          <span className="text-[10px] font-bold uppercase tracking-wider text-[#5f6368] block">
            {isRental ? 'Monthly' : 'Price'}
          </span>
          <div className="text-base sm:text-lg font-extrabold font-mono tabular-nums text-[#202124]">
            ₹{listing.price.toLocaleString('en-IN')}
            {isRental && <span className="text-xs font-normal text-[#5f6368]">/mo</span>}
          </div>
        </div>

        <div className="flex items-center gap-2">
          {variant === 'catalog' && (
            <FavoriteButton
              listing={onSaveWatchlist ? listing : undefined}
              listingId={listing.id}
              listingTitle={listing.title}
              onSaveWatchlist={onSaveWatchlist}
              variant="listicle"
            />
          )}
          <NavLink
            href={listingUrl}
            className="px-3 py-1.5 rounded-md bg-[#f8f9fa] group-hover:bg-[#1dbf73] text-[#202124] group-hover:text-white border border-[#dadce0] group-hover:border-[#1dbf73] text-xs font-semibold transition-colors flex items-center gap-1"
          >
            <span>View Ad</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </NavLink>
        </div>
      </div>
    </article>
  );
};
