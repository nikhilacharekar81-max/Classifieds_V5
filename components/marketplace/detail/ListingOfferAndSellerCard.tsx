'use client';

import React from 'react';
import {
  Sparkles,
  Rocket,
  MapPin,
  Calendar,
  Eye,
  Phone,
  ShieldCheck,
  CheckCircle2,
} from 'lucide-react';
import { Listing } from '@/lib/types';
import { isListingBoosted, formatBoostTimeRemaining } from '@/lib/utils/boostHelper';
import { isRentalListing } from '../ListingGridCard';

export interface ListingOfferAndSellerCardProps {
  listing: Listing;
  isOwner: boolean;
  showPhone: boolean;
  revealedPhone?: string | null;
  isRevealingPhone?: boolean;
  onRevealPhone: () => void;
  onOpenBoostModal: () => void;
}

export const ListingOfferAndSellerCard: React.FC<ListingOfferAndSellerCardProps> = ({
  listing,
  isOwner,
  showPhone,
  revealedPhone,
  isRevealingPhone,
  onRevealPhone,
  onOpenBoostModal,
}) => {
  const boosted = isListingBoosted(listing);
  const isRental = isRentalListing(listing);

  return (
    <>
      {/* Owner Management Controls & Boost Promotion */}
      {isOwner && (
        <div className="bg-gradient-to-br from-indigo-50/80 to-blue-50/80 dark:bg-slate-800/80 border border-indigo-200 dark:border-indigo-800/60 rounded-2xl p-5 shadow-sm space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-black uppercase tracking-wider text-indigo-950 dark:text-indigo-200 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
              You Own This Ad
            </span>
            <span className="text-[11px] text-indigo-600 dark:text-indigo-400 font-bold">
              Seller Dashboard
            </span>
          </div>

          {boosted ? (
            <div className="p-3.5 bg-white dark:bg-slate-900 border border-indigo-100 dark:border-slate-700 rounded-xl text-xs space-y-1.5">
              <div className="font-extrabold text-indigo-700 dark:text-indigo-400 flex items-center gap-1.5">
                <Rocket className="w-4 h-4 text-amber-400 fill-amber-400 animate-bounce" />
                <span>Boost Active • Top Category Placement</span>
              </div>
              <p className="text-slate-500 text-[11px]">
                Package:{' '}
                <span className="font-semibold text-slate-700 dark:text-slate-300">
                  {listing.boostPackageName || 'Top Boost'}
                </span>{' '}
                • Expires in{' '}
                <span className="font-bold text-indigo-600 dark:text-indigo-400">
                  {formatBoostTimeRemaining(listing.boostExpiresAt)}
                </span>
              </p>
            </div>
          ) : (
            <div>
              <p className="text-xs text-slate-600 dark:text-slate-300 mb-3 leading-relaxed">
                Elevate your ad to the top of category feeds to get up to 8x more verified buyer
                views and chat inquiries.
              </p>
              <button
                type="button"
                onClick={onOpenBoostModal}
                className="w-full py-2.5 px-4 bg-gradient-to-r from-violet-600 via-indigo-600 to-blue-600 hover:from-violet-700 hover:to-blue-700 text-white font-extrabold rounded-xl text-xs shadow-md hover:shadow-lg transition-all cursor-pointer flex items-center justify-center gap-2"
              >
                <Rocket className="w-4 h-4 text-amber-300" />
                <span>Boost Your Ad to Top</span>
              </button>
            </div>
          )}
        </div>
      )}

      {/* Contiguous Gig Price & Summary Card */}
      <div className="bg-white rounded-xl border border-[#dadce0] overflow-hidden shadow-2xs">
        <div className="px-6 py-3 bg-[#f8f9fa] border-b border-[#dadce0] flex items-center justify-between">
          <span className="text-xs font-bold uppercase tracking-wider text-[#1dbf73]">
            Standard Offer
          </span>
          <span className="text-[11px] font-medium text-[#5f6368] font-mono tabular-nums">
            ID #{listing.id}
          </span>
        </div>

        <div className="p-6 space-y-4">
          {boosted && (
            <div className="p-2.5 bg-[#e8f0fe] border border-[#d2e3fc] text-[#1a73e8] rounded-lg flex items-center justify-between text-xs font-bold">
              <div className="flex items-center gap-1.5">
                <Rocket className="w-4 h-4" />
                <span>Boosted Placement</span>
              </div>
              <span className="text-[10px] font-mono tabular-nums">
                {formatBoostTimeRemaining(listing.boostExpiresAt)} left
              </span>
            </div>
          )}

          <div>
            <div className="text-3xl font-extrabold font-mono tabular-nums text-[#202124] flex items-baseline gap-1.5">
              {listing.price !== null && listing.price !== undefined ? (
                <>
                  <span>₹{listing.price.toLocaleString('en-IN')}</span>
                  {isRental && (
                    <span className="text-sm font-semibold text-[#5f6368] font-sans">/ month</span>
                  )}
                </>
              ) : (
                <span className="text-2xl font-bold text-[#137333]">Price on request</span>
              )}
            </div>
            <h1 className="text-base font-bold text-[#202124] mt-2 leading-snug">
              {listing.title}
            </h1>
          </div>

          <div className="flex items-center justify-between pt-3 border-t border-[#f1f3f4] text-xs text-[#5f6368]">
            <div className="flex items-center gap-1.5">
              <MapPin className="w-3.5 h-3.5 text-[#5f6368]" />
              <span>{listing.location.locality || listing.location.city}</span>
            </div>
            <div className="flex items-center gap-3 font-mono tabular-nums">
              <span className="flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5 text-[#5f6368]" />
                {listing.createdAt.split(' ')[0]}
              </span>
              <span className="flex items-center gap-1">
                <Eye className="w-3.5 h-3.5 text-[#5f6368]" />
                {listing.views} views
              </span>
            </div>
          </div>

          {/* Call & Reveal Phone Button */}
          <div className="pt-1">
            {showPhone && (revealedPhone || listing.sellerPhone) ? (
              <div className="p-3 bg-[#e6f4ea] border border-[#ceead6] rounded-lg flex items-center justify-between text-[#137333] font-bold text-sm font-mono tabular-nums">
                <div className="flex items-center gap-2">
                  <Phone className="w-4 h-4 text-[#137333]" />
                  <span>{revealedPhone || listing.sellerPhone}</span>
                </div>
                <span className="text-[11px] font-sans font-semibold text-[#137333]">
                  Verified Seller
                </span>
              </div>
            ) : (
              <button
                type="button"
                onClick={onRevealPhone}
                disabled={isRevealingPhone}
                className="w-full py-3 px-4 bg-[#1dbf73] hover:bg-[#19a463] text-white font-bold rounded-md flex items-center justify-center gap-2 text-sm transition-colors cursor-pointer disabled:opacity-75 disabled:cursor-not-allowed"
              >
                <Phone className="w-4 h-4" />
                <span>{isRevealingPhone ? 'Revealing Phone...' : 'Continue & Reveal Phone'}</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Seller Profile Card */}
      <div className="bg-white rounded-xl border border-[#dadce0] p-6 shadow-2xs space-y-4">
        <h4 className="text-xs font-bold uppercase tracking-wider text-[#5f6368]">
          About The Seller
        </h4>

        <div className="flex items-center gap-3.5">
          {listing.sellerAvatar ? (
            <img
              src={listing.sellerAvatar}
              alt={listing.sellerName}
              referrerPolicy="no-referrer"
              className="w-14 h-14 rounded-full object-cover border border-[#dadce0] shrink-0"
            />
          ) : (
            <div className="w-14 h-14 rounded-full bg-[#e6f4ea] text-[#137333] font-bold text-lg flex items-center justify-center border border-[#ceead6] shrink-0">
              {(listing.sellerName || 'S').charAt(0).toUpperCase()}
            </div>
          )}
          <div className="flex-1 min-w-0">
            <div className="font-bold text-[#202124] text-base flex items-center gap-1.5">
              <span className="truncate">{listing.sellerName}</span>
              <span title="Verified KYC Account">
                <ShieldCheck className="w-4 h-4 text-[#1dbf73]" />
              </span>
            </div>
            <div className="text-xs text-[#5f6368] flex items-center gap-1 mt-0.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-[#1dbf73]" /> Government KYC Verified
            </div>
            <div className="text-[11px] text-[#5f6368] mt-0.5">
              Avg. response time: <strong className="text-[#202124]">&lt; 1 hour</strong>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};
