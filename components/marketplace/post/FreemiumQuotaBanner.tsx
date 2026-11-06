'use client';
import React from 'react';
import { Layers } from 'lucide-react';

interface FreemiumQuotaBannerProps {
  isVolumeQuotaExceeded: boolean;
  remainingFreeListings: number | null;
  userActiveListingsCount: number | null;
  freeQuotaLimit: number;
  extraListingFeeRate: number;
  quotaStatus?: 'loading' | 'loaded' | 'unavailable';
}

export const FreemiumQuotaBanner: React.FC<FreemiumQuotaBannerProps> = ({
  isVolumeQuotaExceeded,
  remainingFreeListings,
  userActiveListingsCount,
  freeQuotaLimit,
  extraListingFeeRate,
  quotaStatus = 'loaded',
}) => {
  const isLoading = quotaStatus === 'loading';
  const isUnavailable = quotaStatus === 'unavailable' || userActiveListingsCount === null;
  const displayCount = userActiveListingsCount ?? 0;

  return (
    <div
      className={`p-5 rounded-2xl border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-xs transition-all ${
        isLoading || isUnavailable
          ? 'bg-slate-50/90 border-slate-300'
          : isVolumeQuotaExceeded
          ? 'bg-amber-50/90 border-amber-300'
          : 'bg-emerald-50/90 border-emerald-300'
      }`}
    >
      <div className="flex items-start gap-3.5">
        <div
          className={`p-3 rounded-xl shrink-0 ${
            isLoading || isUnavailable
              ? 'bg-slate-500 text-white'
              : isVolumeQuotaExceeded
              ? 'bg-amber-500 text-white'
              : 'bg-emerald-600 text-white'
          }`}
        >
          <Layers className="w-5 h-5" />
        </div>
        <div className="space-y-1">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="text-xs font-black uppercase tracking-wider text-slate-900">
              Freemium Volume Quota Policy
            </h3>
            <span
              className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${
                isLoading
                  ? 'bg-slate-200 text-slate-800'
                  : isUnavailable
                  ? 'bg-amber-100 text-amber-900'
                  : isVolumeQuotaExceeded
                  ? 'bg-amber-200 text-amber-950'
                  : 'bg-emerald-200 text-emerald-950'
              }`}
            >
              {isLoading
                ? 'Checking Quota...'
                : isUnavailable
                ? 'Quota Status Unavailable'
                : isVolumeQuotaExceeded
                ? '⚡ Quota Reached'
                : `✓ ${remainingFreeListings} Free Active Slot${remainingFreeListings === 1 ? '' : 's'} Remaining`}
            </span>
          </div>
          <p className="text-xs text-slate-700 leading-relaxed">
            {isLoading ? (
              <>Checking your authoritative active listing count with the server...</>
            ) : isUnavailable ? (
              <>
                Your active listing quota count could not be retrieved right now. Your account receives a baseline of{' '}
                <strong>{freeQuotaLimit} free active ad listings</strong> (₹{extraListingFeeRate} per extra listing), and
                the server will verify your quota upon submission.
              </>
            ) : isVolumeQuotaExceeded ? (
              <>
                You currently have{' '}
                <strong className="text-amber-900">
                  {displayCount} active listing{displayCount === 1 ? '' : 's'}
                </strong>
                , reaching your baseline limit of <strong>{freeQuotaLimit} free active ads</strong>. Publishing this
                additional listing requires a volume quota fee of{' '}
                <strong className="text-amber-950 font-black">₹{extraListingFeeRate}</strong>.
              </>
            ) : (
              <>
                Your account receives a baseline of{' '}
                <strong className="text-emerald-900">{freeQuotaLimit} free active ad listings</strong>. You currently
                have <strong>{displayCount} active ad{displayCount === 1 ? '' : 's'}</strong>{' '}
                live. This ad will be published for{' '}
                <strong className="text-emerald-900 font-extrabold">FREE (₹0)</strong> (unless a paid category is selected).
              </>
            )}
          </p>
        </div>
      </div>

      <div className="shrink-0 w-full sm:w-auto text-left sm:text-right bg-white/70 p-3 rounded-xl border border-slate-200/60">
        <div className="text-[11px] font-bold text-slate-700">
          {isLoading
            ? 'Quota Usage (Loading...)'
            : isUnavailable
            ? `Quota Usage (— / ${freeQuotaLimit} Active Ads)`
            : `Quota Usage (${displayCount} / ${freeQuotaLimit} Active Ads)`}
        </div>
        <div className="w-full sm:w-36 h-2 bg-slate-200 rounded-full overflow-hidden mt-1.5">
          <div
            className={`h-full transition-all duration-500 ${
              isLoading || isUnavailable
                ? 'bg-slate-400'
                : isVolumeQuotaExceeded
                ? 'bg-amber-500'
                : 'bg-emerald-500'
            }`}
            style={{
              width:
                isLoading || isUnavailable || freeQuotaLimit <= 0
                  ? '0%'
                  : `${Math.min(100, (displayCount / freeQuotaLimit) * 100)}%`,
            }}
          />
        </div>
        <span className="text-[10px] text-slate-500 font-medium mt-1 block">
          {isLoading
            ? 'Verifying with server...'
            : isUnavailable
            ? 'Verified by server on submit'
            : isVolumeQuotaExceeded
            ? `₹${extraListingFeeRate} per extra listing`
            : '₹0 within free quota'}
        </span>
      </div>
    </div>
  );
};
