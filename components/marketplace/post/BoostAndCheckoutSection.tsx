'use client';
import React from 'react';
import { Sparkles, IndianRupee, Layers, CheckCircle2, CreditCard, ShieldCheck } from 'lucide-react';
import { Category } from '@/lib/types';

interface BoostAndCheckoutSectionProps {
  isFeaturedEnabled: boolean;
  wantFeatured: boolean;
  currencySymbol: string;
  featuredAdPrice: number;
  featuredAdDurationDays: number;
  requiresPayment: boolean;
  totalFee: number;
  isPaidSubcategory: boolean;
  postingFeeAmount: number;
  selectedCategory?: Category;
  selectedSubcategory?: Category;
  isVolumeQuotaExceeded: boolean;
  userActiveListingsCount: number;
  volumeQuotaFee: number;
  freeQuotaLimit: number;
  paymentMethod: 'upi' | 'card' | 'netbanking';
  onToggleFeatured: (checked: boolean) => void;
  onSelectPaymentMethod: (method: 'upi' | 'card' | 'netbanking') => void;
}

export const BoostAndCheckoutSection: React.FC<BoostAndCheckoutSectionProps> = ({
  isFeaturedEnabled,
  wantFeatured,
  currencySymbol,
  featuredAdPrice,
  featuredAdDurationDays,
  requiresPayment,
  totalFee,
  isPaidSubcategory,
  postingFeeAmount,
  selectedCategory,
  selectedSubcategory,
  isVolumeQuotaExceeded,
  userActiveListingsCount,
  volumeQuotaFee,
  freeQuotaLimit,
  paymentMethod,
  onToggleFeatured,
  onSelectPaymentMethod,
}) => {
  return (
    <>
      {/* Section 7: Boost & Feature Your Ad */}
      {isFeaturedEnabled && (
        <div
          className={`rounded-2xl border p-6 shadow-sm space-y-4 transition-all duration-300 ${
            wantFeatured
              ? 'bg-amber-50/60 border-amber-300 ring-1 ring-amber-300/40'
              : 'bg-white border-slate-200'
          }`}
        >
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-start gap-3">
              <div className={`p-2.5 rounded-xl text-white ${wantFeatured ? 'bg-amber-500' : 'bg-slate-400'}`}>
                <Sparkles className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-sm font-bold uppercase tracking-wider text-slate-800 flex items-center gap-2">
                  7. Boost & Feature Your Ad (Optional)
                </h2>
                <p className="text-xs text-slate-600 mt-1">
                  Featured Ads appear at the very top of their respective category and subcategory listings. Get up to{' '}
                  <strong className="text-amber-700">10x more visibility</strong>, instant views, and quick inquiries
                  from premium buyers.
                </p>
              </div>
            </div>
            <div className="text-right shrink-0">
              <span className="text-sm font-black text-slate-900 bg-amber-100 text-amber-950 px-2.5 py-1 rounded-full">
                {currencySymbol}
                {featuredAdPrice} / {featuredAdDurationDays} Days
              </span>
            </div>
          </div>

          <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <input
                type="checkbox"
                id="featuredCheckbox"
                checked={wantFeatured}
                onChange={(e) => onToggleFeatured(e.target.checked)}
                className="w-4 h-4 text-amber-600 border-slate-300 rounded-md focus:ring-amber-500 cursor-pointer"
              />
              <label htmlFor="featuredCheckbox" className="text-xs font-bold text-slate-800 cursor-pointer select-none">
                Yes, make my ad a Featured Ad for {currencySymbol}
                {featuredAdPrice} ({featuredAdDurationDays} Days Validity)
              </label>
            </div>
            {wantFeatured && (
              <span className="text-xs font-bold text-amber-600 flex items-center gap-1 animate-pulse">
                ⚡ Premium Boost Active
              </span>
            )}
          </div>
        </div>
      )}

      {/* Paid Subcategory or Featured Boost Fee Notice & Checkout Card */}
      {requiresPayment && (
        <div className="bg-amber-50/90 border-2 border-amber-300 rounded-2xl p-6 shadow-sm space-y-4 animate-in fade-in duration-200">
          <div className="flex items-start justify-between gap-3 pb-3 border-b border-amber-200">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-amber-500 text-white rounded-xl shadow-xs">
                <IndianRupee className="w-6 h-6" />
              </div>
              <div>
                <span className="px-2.5 py-0.5 rounded-full bg-amber-200 text-amber-900 font-bold text-[10px] uppercase tracking-wider">
                  Unified Checkout
                </span>
                <h3 className="text-base font-extrabold text-slate-900 mt-0.5">
                  Secured Payment Summary
                </h3>
                <p className="text-xs text-slate-600 mt-0.5">
                  Complete payment to publish your ad with selected premium upgrades.
                </p>
              </div>
            </div>

            <div className="text-right shrink-0">
              <span className="text-2xl font-black text-slate-950">₹{totalFee}</span>
              <span className="block text-[10px] text-slate-500 font-medium">Includes 18% GST</span>
            </div>
          </div>

          {/* Detailed Invoice Breakdown */}
          <div className="text-xs space-y-1.5 text-slate-700 bg-amber-100/40 p-3.5 rounded-xl border border-amber-200/50">
            {isPaidSubcategory && (
              <div className="flex justify-between">
                <span>Base Posting Fee ({selectedSubcategory?.name || selectedCategory?.name}):</span>
                <span className="font-semibold">₹{postingFeeAmount}</span>
              </div>
            )}
            {isVolumeQuotaExceeded ? (
              <div className="flex justify-between text-amber-950 font-bold">
                <span className="flex items-center gap-1">
                  <Layers className="w-3 h-3 text-amber-600" /> Volume Quota Fee (Listing #{userActiveListingsCount + 1}):
                </span>
                <span>₹{volumeQuotaFee}</span>
              </div>
            ) : (
              <div className="flex justify-between text-emerald-800 font-medium">
                <span className="flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3 text-emerald-600" /> Free Active Listing Quota ({userActiveListingsCount + 1}/{freeQuotaLimit}):
                </span>
                <span className="font-bold text-emerald-700">FREE (₹0)</span>
              </div>
            )}
            {wantFeatured && (
              <div className="flex justify-between">
                <span className="flex items-center gap-1 text-amber-900 font-semibold">
                  <Sparkles className="w-3 h-3 text-amber-600" /> Premium Featured Promotion (30 days):
                </span>
                <span className="font-bold text-amber-950">₹100</span>
              </div>
            )}
            <div className="flex justify-between border-t border-amber-200/60 pt-1.5 text-sm font-black text-slate-900">
              <span>Grand Total to Pay:</span>
              <span>₹{totalFee}</span>
            </div>
          </div>

          {/* Payment Method Selector */}
          <div className="pt-3 border-t border-amber-200/80">
            <label className="block text-xs font-bold text-slate-800 mb-2">
              Select Instant Payment Method *
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => onSelectPaymentMethod('upi')}
                className={`p-3 rounded-xl border text-left flex items-center justify-between transition-all cursor-pointer ${
                  paymentMethod === 'upi'
                    ? 'border-amber-600 bg-white ring-2 ring-amber-500/30 text-amber-950 font-bold shadow-xs'
                    : 'border-amber-200 bg-amber-100/50 hover:bg-white text-slate-700'
                }`}
              >
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-amber-600" />
                  <span className="text-xs font-bold">BHIM UPI / GPay</span>
                </div>
                {paymentMethod === 'upi' && <CheckCircle2 className="w-4 h-4 text-amber-600" />}
              </button>

              <button
                type="button"
                onClick={() => onSelectPaymentMethod('card')}
                className={`p-3 rounded-xl border text-left flex items-center justify-between transition-all cursor-pointer ${
                  paymentMethod === 'card'
                    ? 'border-amber-600 bg-white ring-2 ring-amber-500/30 text-amber-950 font-bold shadow-xs'
                    : 'border-amber-200 bg-amber-100/50 hover:bg-white text-slate-700'
                }`}
              >
                <div className="flex items-center gap-2">
                  <CreditCard className="w-4 h-4 text-blue-600" />
                  <span className="text-xs font-bold">Credit / Debit Card</span>
                </div>
                {paymentMethod === 'card' && <CheckCircle2 className="w-4 h-4 text-amber-600" />}
              </button>

              <button
                type="button"
                onClick={() => onSelectPaymentMethod('netbanking')}
                className={`p-3 rounded-xl border text-left flex items-center justify-between transition-all cursor-pointer ${
                  paymentMethod === 'netbanking'
                    ? 'border-amber-600 bg-white ring-2 ring-amber-500/30 text-amber-950 font-bold shadow-xs'
                    : 'border-amber-200 bg-amber-100/50 hover:bg-white text-slate-700'
                }`}
              >
                <div className="flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-emerald-600" />
                  <span className="text-xs font-bold">NetBanking</span>
                </div>
                {paymentMethod === 'netbanking' && <CheckCircle2 className="w-4 h-4 text-amber-600" />}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
