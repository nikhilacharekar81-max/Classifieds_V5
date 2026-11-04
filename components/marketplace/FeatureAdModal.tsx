'use client';
import React, { useState } from 'react';
import { useApp } from '@/context/AppContext';
import { Listing } from '@/lib/types';
import {
  Sparkles,
  CheckCircle2,
  Clock,
  ShieldCheck,
  CreditCard,
  QrCode,
  Building,
  AlertCircle,
  X,
  TrendingUp,
  Award,
  Star,
  Check,
} from 'lucide-react';

interface FeatureAdModalProps {
  listing: Listing | null;
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export const FeatureAdModal: React.FC<FeatureAdModalProps> = ({
  listing,
  isOpen,
  onClose,
  onSuccess,
}) => {
  const { featureListing, addToast, settings } = useApp();

  const [selectedPlan, setSelectedPlan] = useState<{
    id: string;
    title: string;
    days: number;
    price: number;
    popular?: boolean;
    badge?: string;
  }>({
    id: 'feature_15',
    title: '15 Days Pro Feature',
    days: 15,
    price: 99,
    popular: true,
    badge: 'MOST POPULAR',
  });

  const [paymentMethod, setPaymentMethod] = useState<'upi' | 'card' | 'netbanking'>('upi');
  const [upiId, setUpiId] = useState('user@upi');
  const [isProcessing, setIsProcessing] = useState(false);

  if (!isOpen || !listing) return null;

  const plans = [
    {
      id: 'feature_7',
      title: '7 Days Starter',
      days: 7,
      price: 49,
      badge: 'QUICK BOOST',
    },
    {
      id: 'feature_15',
      title: '15 Days Pro Feature',
      days: 15,
      price: 99,
      popular: true,
      badge: 'MOST POPULAR',
    },
    {
      id: 'feature_30',
      title: '30 Days Max Exposure',
      days: 30,
      price: 149,
      badge: 'BEST VALUE',
    },
  ];

  const currencySymbol = settings.currencySymbol || '₹';
  const taxAmount = Math.round(selectedPlan.price * 0.18);
  const totalPayable = selectedPlan.price + taxAmount;

  const handleActivateFeature = () => {
    setIsProcessing(true);

    setTimeout(() => {
      // Calculate future expiry date
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + selectedPlan.days);
      const formattedUntil = futureDate.toISOString().split('T')[0];

      // Update listing featured status
      featureListing(listing.id, true);

      setIsProcessing(false);
      addToast({
        type: 'success',
        title: '⭐ Ad Featured Successfully!',
        message: `"${listing.title.substring(0, 30)}..." is now Featured for ${selectedPlan.days} days until ${formattedUntil}.`,
      });

      if (onSuccess) onSuccess();
      onClose();
    }, 800);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs overflow-y-auto">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl max-w-2xl w-full p-6 shadow-2xl space-y-6 relative animate-in fade-in zoom-in-95 duration-200">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute right-5 top-5 text-slate-400 hover:text-slate-600 dark:hover:text-white p-1 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header */}
        <div className="flex items-center gap-3 border-b border-slate-100 dark:border-slate-800 pb-4">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-amber-400 via-amber-500 to-yellow-300 flex items-center justify-center shadow-lg shadow-amber-500/20 text-slate-950 font-black shrink-0">
            <Sparkles className="w-6 h-6 fill-slate-950" />
          </div>
          <div>
            <h2 className="text-xl font-extrabold text-slate-900 dark:text-white leading-snug flex items-center gap-2">
              <span>Feature Your Classified Ad</span>
              <span className="text-[11px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-amber-100 text-amber-900 dark:bg-amber-950 dark:text-amber-300 border border-amber-300">
                Top Visibility
              </span>
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Get up to <strong className="text-amber-600 dark:text-amber-400">10x more buyer views</strong> and calls by pinning your ad to top search positions!
            </p>
          </div>
        </div>

        {/* Selected Ad Preview */}
        <div className="p-3.5 bg-gradient-to-r from-amber-500/10 via-amber-400/5 to-transparent border border-amber-300/40 dark:border-amber-700/50 rounded-2xl flex items-center gap-3">
          <img
            src={listing.images[0] || 'https://images.unsplash.com/photo-1549399542-7e3f8b79c341?w=400&auto=format&fit=crop&q=80'}
            alt={listing.title}
            className="w-16 h-16 rounded-xl object-cover ring-2 ring-amber-400/50 shrink-0"
          />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded bg-amber-400 text-slate-950 flex items-center gap-1 shadow-2xs">
                <Star className="w-3 h-3 fill-slate-950" /> FEATURED PREVIEW
              </span>
              <span className="text-xs font-bold text-slate-500 truncate">#{listing.id}</span>
            </div>
            <h3 className="text-sm font-extrabold text-slate-900 dark:text-white truncate mt-1">
              {listing.title}
            </h3>
            <div className="text-xs font-black text-blue-600 dark:text-blue-400">
              {currencySymbol}{listing.price.toLocaleString('en-IN')}
            </div>
          </div>
        </div>

        {/* Feature Benefits Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs">
          <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-emerald-600 shrink-0" />
            <span className="font-semibold text-slate-700 dark:text-slate-300">Top Search Priority</span>
          </div>
          <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 flex items-center gap-2">
            <Award className="w-4 h-4 text-amber-500 shrink-0" />
            <span className="font-semibold text-slate-700 dark:text-slate-300">Gold "Featured" Badge</span>
          </div>
          <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-blue-500 shrink-0" />
            <span className="font-semibold text-slate-700 dark:text-slate-300">Up to 10x Buyer Calls</span>
          </div>
        </div>

        {/* Step 1: Select Plan */}
        <div>
          <label className="block text-xs font-extrabold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2">
            Choose Featured Duration Plan:
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {plans.map((plan) => {
              const isSelected = selectedPlan.id === plan.id;
              return (
                <button
                  key={plan.id}
                  type="button"
                  onClick={() => setSelectedPlan(plan)}
                  className={`p-4 rounded-2xl border text-left relative transition-all cursor-pointer ${
                    isSelected
                      ? 'border-amber-500 bg-amber-50/70 dark:bg-amber-950/30 ring-2 ring-amber-500/40 shadow-md scale-102'
                      : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-amber-300'
                  }`}
                >
                  {plan.popular && (
                    <span className="absolute -top-2.5 right-3 px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-amber-500 text-slate-950 shadow-xs">
                      {plan.badge}
                    </span>
                  )}

                  <div className="text-xs font-extrabold text-slate-900 dark:text-white">
                    {plan.title}
                  </div>
                  <div className="text-lg font-black text-slate-900 dark:text-white mt-1">
                    {currencySymbol}{plan.price}
                  </div>
                  <div className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5 font-medium">
                    {plan.days} Days Visibility
                  </div>

                  {isSelected && (
                    <div className="mt-2 text-xs font-bold text-amber-700 dark:text-amber-300 flex items-center gap-1">
                      <Check className="w-3.5 h-3.5 stroke-[3]" /> Selected Plan
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Step 2: Payment Method */}
        <div className="space-y-3 pt-2 border-t border-slate-100 dark:border-slate-800">
          <label className="block text-xs font-extrabold uppercase tracking-wider text-slate-500 dark:text-slate-400">
            Select Payment Method:
          </label>
          <div className="grid grid-cols-3 gap-2">
            <button
              type="button"
              onClick={() => setPaymentMethod('upi')}
              className={`p-2.5 rounded-xl border text-xs font-bold flex items-center justify-center gap-2 cursor-pointer transition-colors ${
                paymentMethod === 'upi'
                  ? 'border-blue-600 bg-blue-50 text-blue-700 dark:bg-blue-950/50 dark:text-blue-300 dark:border-blue-500'
                  : 'border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-50'
              }`}
            >
              <QrCode className="w-4 h-4" /> Instant UPI / QR
            </button>
            <button
              type="button"
              onClick={() => setPaymentMethod('card')}
              className={`p-2.5 rounded-xl border text-xs font-bold flex items-center justify-center gap-2 cursor-pointer transition-colors ${
                paymentMethod === 'card'
                  ? 'border-blue-600 bg-blue-50 text-blue-700 dark:bg-blue-950/50 dark:text-blue-300 dark:border-blue-500'
                  : 'border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-50'
              }`}
            >
              <CreditCard className="w-4 h-4" /> Debit / Credit
            </button>
            <button
              type="button"
              onClick={() => setPaymentMethod('netbanking')}
              className={`p-2.5 rounded-xl border text-xs font-bold flex items-center justify-center gap-2 cursor-pointer transition-colors ${
                paymentMethod === 'netbanking'
                  ? 'border-blue-600 bg-blue-50 text-blue-700 dark:bg-blue-950/50 dark:text-blue-300 dark:border-blue-500'
                  : 'border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-50'
              }`}
            >
              <Building className="w-4 h-4" /> NetBanking
            </button>
          </div>

          {paymentMethod === 'upi' && (
            <div className="p-3 bg-slate-50 dark:bg-slate-800/80 rounded-xl border border-slate-200 dark:border-slate-700 space-y-1.5">
              <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300">
                UPI ID (GPay / PhonePe / Paytm):
              </label>
              <input
                type="text"
                value={upiId}
                onChange={(e) => setUpiId(e.target.value)}
                className="w-full text-xs font-mono border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-2 bg-white dark:bg-slate-900 focus:ring-2 focus:ring-blue-500 focus:outline-none"
              />
            </div>
          )}
        </div>

        {/* Pricing Summary & Action */}
        <div className="p-4 rounded-2xl bg-slate-900 text-white flex flex-col sm:flex-row items-center justify-between gap-4 shadow-lg">
          <div>
            <div className="text-[11px] text-slate-400 font-medium">Total Price (Incl. 18% GST)</div>
            <div className="text-xl font-black text-amber-400 flex items-baseline gap-1">
              <span>{currencySymbol}{totalPayable}</span>
              <span className="text-xs font-normal text-slate-400">
                ({currencySymbol}{selectedPlan.price} + {currencySymbol}{taxAmount} GST)
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl border border-slate-700 text-slate-300 hover:bg-slate-800 text-xs font-bold transition-colors cursor-pointer w-1/2 sm:w-auto"
            >
              Cancel
            </button>

            <button
              type="button"
              disabled={isProcessing}
              onClick={handleActivateFeature}
              className="px-6 py-2.5 bg-gradient-to-r from-amber-400 via-amber-500 to-yellow-400 hover:from-amber-500 hover:to-yellow-500 text-slate-950 font-black text-xs rounded-xl shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer w-1/2 sm:w-auto"
            >
              <Sparkles className="w-4 h-4 fill-slate-950" />
              <span>{isProcessing ? 'Activating Feature...' : `Feature Now (${currencySymbol}${totalPayable})`}</span>
            </button>
          </div>
        </div>

        {/* Security badge */}
        <div className="flex items-center justify-center gap-1.5 text-[11px] text-slate-500 dark:text-slate-400">
          <ShieldCheck className="w-4 h-4 text-emerald-600" />
          <span>100% Instant Activation • 256-Bit SSL Encrypted Payment</span>
        </div>
      </div>
    </div>
  );
};
