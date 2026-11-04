import React from 'react';
import { Rocket } from 'lucide-react';
import { Listing, Category, UserGeoLocation } from '@/lib/types';
import { NavLink } from '@/components/common/NavLink';
import { ImageWithFallback } from '@/components/common/ImageWithFallback';
import { buildChillyUrl } from '@/lib/utils/seoAndUrlHelper';
import { calculateDistanceKm } from '@/lib/utils/distanceUtils';
import { isListingBoosted } from '@/lib/utils/boostHelper';
import { FavoriteButton } from './FavoriteButton';

export interface ListingGridCardProps {
  listing: Listing;
  categories: Category[];
  subName: string;
  userLocation?: UserGeoLocation | null;
  onSaveWatchlist?: (listing: Listing) => void;
  variant?: 'latest' | 'catalog';
  priority?: boolean;
}

export function extractListingAttributeSummary(listing: Listing, maxItems = 3): string[] {
  const attrParts: string[] = [];
  const attrs = listing.customAttributes;
  if (!attrs) return attrParts;
  if (attrs.year) attrParts.push(String(attrs.year));
  if (attrs.km_driven) attrParts.push(`${Number(attrs.km_driven).toLocaleString()} km`);
  if (attrs.fuel) attrParts.push(String(attrs.fuel));
  if (attrs.storage) attrParts.push(String(attrs.storage));
  if (attrs.bhk) attrParts.push(String(attrs.bhk));
  if (attrs.configuration) attrParts.push(String(attrs.configuration));
  if (attrs.property_type) attrParts.push(String(attrs.property_type));
  if (attrs.furnishing) attrParts.push(String(attrs.furnishing));
  return attrParts.slice(0, maxItems);
}

export function isRentalListing(listing: Listing): boolean {
  const lowerTitle = listing.title.toLowerCase();
  return (
    listing.subcategoryId === 'sub_house_apt_rent' ||
    listing.subcategoryId === 'sub_house_shops_rent' ||
    listing.subcategoryId === 'sub_house_pg_guest' ||
    lowerTitle.includes('for rent') ||
    lowerTitle.includes('rental')
  );
}

export const ListingGridCard: React.FC<ListingGridCardProps> = ({
  listing,
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

  const attrParts = variant === 'catalog' ? extractListingAttributeSummary(listing, 3) : [];
  const isRental = variant === 'catalog' && isRentalListing(listing);
  const boosted = variant === 'catalog' && isListingBoosted(listing);

  return (
    <article className="bg-white rounded-xl border border-[#dadce0] hover:border-[#1dbf73] overflow-hidden shadow-2xs hover:shadow-md transition-all cursor-pointer flex flex-col justify-between group relative">
      <div className="relative aspect-[4/3] bg-[#f1f3f4] overflow-hidden">
        <NavLink
          href={listingUrl}
          showSpinner={false}
          className="block w-full h-full"
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
        </NavLink>
        {boosted ? (
          <div className="absolute top-2.5 left-2.5 bg-[#1a73e8] text-white text-[10px] font-bold px-2 py-0.5 rounded shadow-xs flex items-center gap-1 uppercase tracking-wider z-10 pointer-events-none">
            <Rocket className="w-3 h-3" /> Boosted
          </div>
        ) : listing.isFeatured ? (
          <div className="absolute top-2.5 left-2.5 bg-[#202124]/90 text-white text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-wider pointer-events-none">
            Featured
          </div>
        ) : null}

        {variant === 'catalog' && (
          <FavoriteButton
            listing={onSaveWatchlist ? listing : undefined}
            listingId={listing.id}
            listingTitle={listing.title}
            onSaveWatchlist={onSaveWatchlist}
            variant="grid"
          />
        )}
      </div>

      <div className="p-3.5 space-y-2 flex-1 flex flex-col justify-between">
        <div className="space-y-1.5">
          {/* Seller Header Row */}
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-1.5 min-w-0">
              <div className="w-5 h-5 rounded-full bg-[#e6f4ea] text-[#137333] font-bold text-[10px] flex items-center justify-center shrink-0">
                {sellerInitial}
              </div>
              <span className="text-[11px] font-semibold text-[#202124] truncate">
                {listing.sellerName || 'Verified Seller'}
              </span>
            </div>
            {variant === 'latest' ? (
              <span className="text-[10px] font-semibold text-[#1dbf73] shrink-0">Verified</span>
            ) : (
              <span className="text-[10px] text-[#5f6368] truncate shrink-0">
                {subName || 'Classified'}
              </span>
            )}
          </div>

          {/* Gig Title */}
          <h3
            className="text-xs font-medium text-[#202124] group-hover:text-[#1dbf73] line-clamp-2 leading-snug transition-colors"
            title={listing.title}
          >
            <NavLink href={listingUrl} className="hover:underline">
              {listing.title}
            </NavLink>
          </h3>

          {/* Unboxed Metadata Line (Zero-Pill Discipline) */}
          {attrParts.length > 0 && (
            <p className="text-[11px] text-[#5f6368] truncate font-mono tabular-nums">
              {attrParts.join(' · ')}
            </p>
          )}

          {variant === 'latest' ? (
            <p className="text-[11px] text-[#5f6368] truncate">
              {subName || 'Classified'} ·{' '}
              {listing.location.locality ? `${listing.location.locality}, ` : ''}
              {listing.location.city}
            </p>
          ) : (
            <p className="text-[11px] text-[#5f6368] truncate">
              {distanceKm !== null ? `${distanceKm} km · ` : ''}
              {listing.location.locality ? `${listing.location.locality}, ` : ''}
              {listing.location.city} · {listing.createdAt.split(' ')[0]}
            </p>
          )}
        </div>

        {/* Price Footer */}
        <NavLink
          href={listingUrl}
          showSpinner={false}
          className="pt-2.5 border-t border-[#f1f3f4] flex items-baseline justify-between gap-2 mt-auto"
        >
          <span className="text-[10px] font-bold uppercase tracking-wider text-[#5f6368]">
            {isRental ? 'Monthly' : 'Price'}
          </span>
          <div className="text-sm font-bold font-mono tabular-nums text-[#202124]">
            ₹{listing.price.toLocaleString('en-IN')}
            {isRental && <span className="text-[11px] font-normal text-[#5f6368]">/mo</span>}
          </div>
        </NavLink>
      </div>
    </article>
  );
};
