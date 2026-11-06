import React, { useMemo } from 'react';
import { Heart } from 'lucide-react';
import { Listing } from '@/lib/types';
import { useApp } from '@/context/AppContext';

export interface FavoriteButtonProps {
  listing?: Listing;
  listingId?: string;
  listingTitle?: string;
  onSaveWatchlist?: (listing: Listing) => void;
  variant?: 'grid' | 'listicle';
}

export const FavoriteButton: React.FC<FavoriteButtonProps> = ({
  listing,
  listingId,
  listingTitle,
  onSaveWatchlist,
  variant = 'grid',
}) => {
  const { toggleFavorite, favoriteListingIds } = useApp();
  const effectiveId = listingId || listing?.id || '';

  const isSaved = useMemo(() => 
    favoriteListingIds.includes(effectiveId), 
    [favoriteListingIds, effectiveId]
  );

  const handleClick = async (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    e.stopPropagation();
    if (!effectiveId) return;

    await toggleFavorite(effectiveId);

    if (onSaveWatchlist && listing) {
      onSaveWatchlist(listing);
    }
  };

  if (variant === 'listicle') {
    return (
      <button
        type="button"
        onClick={handleClick}
        aria-pressed={isSaved}
        className={`relative z-20 p-1.5 rounded-md border border-[#dadce0] transition-colors cursor-pointer ${
          isSaved
            ? 'text-[#ea4335] bg-[#fce8e6]/40 border-[#f6aea9]'
            : 'text-[#5f6368] hover:text-[#ea4335] hover:bg-[#f8f9fa]'
        }`}
        title={isSaved ? 'Saved in Watchlist' : 'Save to Watchlist'}
      >
        <Heart className={`w-4 h-4 ${isSaved ? 'fill-current' : ''}`} />
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      aria-pressed={isSaved}
      className={`absolute top-2.5 right-2.5 z-20 p-1.5 rounded-full bg-white/90 hover:bg-white transition-colors shadow-xs cursor-pointer ${
        isSaved ? 'text-[#ea4335]' : 'text-[#5f6368] hover:text-[#ea4335]'
      }`}
      title={isSaved ? 'Saved in Watchlist' : 'Save to Watchlist'}
    >
      <Heart className={`w-4 h-4 ${isSaved ? 'fill-current' : ''}`} />
    </button>
  );
};
