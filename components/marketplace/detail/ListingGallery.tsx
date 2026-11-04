'use client';

import React from 'react';
import { Sparkles } from 'lucide-react';
import { Listing } from '@/lib/types';
import { ImageWithFallback } from '@/components/common/ImageWithFallback';

export interface ListingGalleryProps {
  listing: Listing;
  activeImageIndex: number;
  onSelectImage: (idx: number) => void;
}

export const ListingGallery: React.FC<ListingGalleryProps> = ({
  listing,
  activeImageIndex,
  onSelectImage,
}) => {
  return (
    <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
      <div className="relative bg-slate-950 h-80 sm:h-96 flex items-center justify-center">
        <ImageWithFallback
          src={listing.images[activeImageIndex] || listing.images[0]}
          alt={listing.title}
          categoryId={listing.categoryId}
          priority={activeImageIndex === 0}
          className="w-full h-full object-contain"
        />

        {listing.isFeatured && (
          <div className="absolute top-4 left-4 bg-amber-400 text-slate-950 font-black text-xs px-3 py-1 rounded-md uppercase tracking-wider shadow flex items-center gap-1">
            <Sparkles className="w-3.5 h-3.5" /> Featured Ad
          </div>
        )}

        {listing.images.length > 1 && (
          <div className="absolute bottom-3 right-4 bg-black/60 text-white text-xs px-2.5 py-1 rounded-lg backdrop-blur-sm">
            {activeImageIndex + 1} / {listing.images.length}
          </div>
        )}
      </div>

      {/* Thumbnails */}
      {listing.images.length > 1 && (
        <div className="p-3 bg-slate-50 border-t border-slate-200 flex gap-2 overflow-x-auto">
          {listing.images.map((img, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => onSelectImage(idx)}
              className={`w-16 h-16 rounded-lg overflow-hidden border-2 shrink-0 transition-all cursor-pointer ${
                activeImageIndex === idx
                  ? 'border-blue-600 ring-2 ring-blue-400'
                  : 'border-slate-200 opacity-70 hover:opacity-100'
              }`}
            >
              <ImageWithFallback
                src={img}
                alt="Thumb"
                categoryId={listing.categoryId}
                className="w-full h-full object-cover"
              />
            </button>
          ))}
        </div>
      )}
    </div>
  );
};
