import React from 'react';
import { MapPin } from 'lucide-react';
import { Listing } from '@/lib/types';
import { renderUnclickableDescription } from '@/lib/utils/unclickableLinks';

export interface ListingSpecsAndDescriptionProps {
  listing: Listing;
}

export const ListingSpecsAndDescription: React.FC<ListingSpecsAndDescriptionProps> = ({
  listing,
}) => {
  return (
    <>
      {/* Dynamic Custom Specifications & Attributes */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
        <h3 className="text-sm font-bold uppercase tracking-wider text-slate-500 mb-4 pb-2 border-b border-slate-100">
          Specifications &amp; Dynamic Attributes
        </h3>

        {listing.customAttributes && Object.keys(listing.customAttributes).length > 0 ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {Object.entries(listing.customAttributes).map(([key, val]) => (
              <div key={key} className="bg-slate-50 rounded-xl p-3 border border-slate-200/80">
                <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wide">
                  {key.replace(/_/g, ' ')}
                </span>
                <span className="font-semibold text-slate-800 text-sm mt-0.5 block">
                  {String(val)}
                </span>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-xs text-slate-400 italic">
            No custom category attributes specified for this listing.
          </p>
        )}
      </div>

      {/* Description */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
        <div className="flex items-center justify-between mb-3 pb-2 border-b border-slate-100">
          <h3 className="text-sm font-bold uppercase tracking-wider text-slate-500">
            Description
          </h3>
          <span className="text-[10px] text-slate-400 font-medium flex items-center gap-1">
            🔒 Links are unclickable for anti-spam safety
          </span>
        </div>
        <div className="text-sm text-slate-700 leading-relaxed whitespace-pre-line">
          {renderUnclickableDescription(listing.description)}
        </div>
      </div>

      {/* Location Details */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
        <h3 className="text-sm font-bold uppercase tracking-wider text-slate-500 mb-3 pb-2 border-b border-slate-100 flex items-center justify-between">
          <span>Location</span>
          <span className="text-xs font-normal text-slate-400">
            {listing.location.city}, {listing.location.state}
          </span>
        </h3>
        <div className="flex items-center gap-3 text-slate-700 text-sm">
          <MapPin className="w-5 h-5 text-rose-500 shrink-0" />
          <span>
            {listing.location.locality ? `${listing.location.locality}, ` : ''}
            {listing.location.city}, {listing.location.state}
          </span>
        </div>
      </div>
    </>
  );
};
