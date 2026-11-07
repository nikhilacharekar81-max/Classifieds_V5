'use client';
import React, { useState } from 'react';
import { useAppOptional } from '@/context/AppContextInstance';
import { Listing, PromotionalPackage } from '@/lib/types';
import { dispatchPublicToast } from '@/components/common/ChunkErrorRecovery';
import {
  Rocket,
  CheckCircle2,
  Clock,
  ShieldCheck,
  CreditCard,
  QrCode,
  Building,
  AlertCircle,
  X,
  Sparkles,
  TrendingUp,
} from 'lucide-react';
import { isListingBoosted } from '@/lib/utils/boostHelper';

const DEFAULT_BOOST_PACKAGES: PromotionalPackage[] = [
  {
    id: 'pkg_boost_1d',
    name: '24-Hour Quick Top Boost',
    badge: 'Quick Boost',
    type: 'boost',
    price: 99,
    discountPrice: 149,
    durationDays: 1,
    durationHours: 24,
    features: ['Top of Category Feed for 24h', 'Boosted Badge', '2x Buyer Views'],
    isActive: true,
    salesCount: 0,
  },
  {
    id: 'pkg_boost_3d',
    name: '3-Day Spotlight Top Boost',
    type: 'boost',
    price: 249,
    discountPrice: 399,
    durationDays: 3,
    durationHours: 72,
    badge: 'Most Popular',
    features: ['Top of Category Feed for 3 Days', 'Priority Search Placement', '5x Buyer Views'],
    isActive: true,
    salesCount: 0,
  },
  {
    id: 'pkg_boost_7d',
    name: '7-Day Power Top Boost',
    type: 'boost',
    price: 499,
    discountPrice: 799,
    durationDays: 7,
    durationHours: 168,
    badge: 'Best Value',
    features: ['Top of Category Feed for 7 Days', 'City-Wide Priority', '8x Buyer Views'],
    isActive: true,
    salesCount: 0,
  },
];

interface BoostAdModalProps {
  listing: Listing;
  isOpen: boolean;
  onClose: () => void;
  onBoostSuccess?: (updatedListing: Listing) => void;
}

export const BoostAdModal: React.FC<BoostAdModalProps> = ({
  listing,
  isOpen,
  onClose,
  onBoostSuccess,
}) => {
  const app = useAppOptional();

  const sourcePackages =
    app?.packages && app.packages.length > 0 ? app.packages : DEFAULT_BOOST_PACKAGES;
  const boostPackages = sourcePackages.filter(
    (p) => p.type === 'boost' && p.isActive !== false
  );

  const [selectedPackageId, setSelectedPackageId] = useState<string>(() => {
    return boostPackages[1]?.id || boostPackages[0]?.id || '';
  });

  const [paymentMethod, setPaymentMethod] = useState<'upi' | 'card' | 'netbanking'>('upi');
  const [upiId, setUpiId] = useState('user@okhdfcbank');
  const [isProcessing, setIsProcessing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [completedStep, setCompletedStep] = useState<'selection' | 'success' | 'pending_order'>('selection');

  if (!isOpen) return null;

  const selectedPackage =
    boostPackages.find((p) => p.id === selectedPackageId) || boostPackages[0];

  const paymentGatewayConfigured = Boolean(app?.settings?.paymentGatewayConfigured);
  const price = selectedPackage?.price || 0;
  const taxAmount = Math.round(price * 0.18);
  const totalPayable = price + taxAmount;

  const isAlreadyBoosted = isListingBoosted(listing);

  const handleConfirmBoost = async () => {
    if (!selectedPackage) {
      setErrorMessage('Please select a valid boost package');
      return;
    }

    if (isAlreadyBoosted) {
      setErrorMessage(
        'This ad already has an active boost. You can boost it again once the current boost period expires.'
      );
      return;
    }

    setIsProcessing(true);
    setErrorMessage(null);

    try {
      if (!paymentGatewayConfigured) {
        const orderRes = await fetch('/api/boost/create-order', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({
            listingId: listing.id,
            packageId: selectedPackage.id,
            paymentMethod,
          }),
        });
        const orderData = await orderRes.json().catch(() => ({}));
        if (!orderRes.ok || !orderData.success) {
          setErrorMessage(
            orderData.error || orderData.message || 'Unable to record pending boost order.'
          );
          setIsProcessing(false);
          return;
        }
        setCompletedStep('pending_order');
        setIsProcessing(false);
        dispatchPublicToast({
          type: 'warning',
          title: 'Boost Order Saved (Payment Pending)',
          message: `Your boost order for "${listing.title}" is saved as pending because the payment gateway is not configured.`,
        });
        return;
      }

      // Gateway is configured: create order and execute payment verification
      const orderRes = await fetch('/api/boost/create-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          listingId: listing.id,
          packageId: selectedPackage.id,
          paymentMethod,
        }),
      });
      const orderData = await orderRes.json().catch(() => ({}));
      if (!orderRes.ok || !orderData.orderId) {
        setErrorMessage(orderData.error || 'Failed to create boost order.');
        setIsProcessing(false);
        return;
      }

      let signature: string | undefined = undefined;
      let paymentId: string | undefined = undefined;
      const rzpKey = orderData.keyId;
      const rzpOrderId = orderData.providerOrderId || orderData.orderId;

      if (typeof window !== 'undefined' && rzpKey && orderData.providerOrderId) {
        const { openRazorpayCheckout } = await import('@/lib/utils/razorpay');
        try {
          const payment = await openRazorpayCheckout({
            key: rzpKey,
            amount: Math.round(totalPayable * 100),
            currency: 'INR',
            name: app?.settings?.siteName || 'Chillyads',
            description: `${selectedPackage.name} Boost`,
            order_id: rzpOrderId,
            prefill: {
              name: app?.currentUser?.name,
              email: app?.currentUser?.email,
              contact: app?.currentUser?.phone,
            }
          });
          paymentId = payment.paymentId;
          signature = payment.signature;
        } catch (checkoutErr: any) {
          setErrorMessage(checkoutErr.message || 'Payment checkout cancelled.');
          setIsProcessing(false);
          return;
        }
      }

      const verifyRes = await fetch('/api/boost/verify-payment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          orderId: orderData.orderId,
          paymentId,
          paymentGateway: 'Razorpay',
          signature,
          amount: totalPayable,
          currency: 'INR',
        }),
      });
      const verifyData = await verifyRes.json().catch(() => ({}));
      if (!verifyRes.ok || !verifyData.success) {
        setErrorMessage(verifyData.error || 'Payment verification failed. Boost could not be activated without confirmed payment capture.');
        setIsProcessing(false);
        return;
      }

      setCompletedStep('success');
      setIsProcessing(false);
      dispatchPublicToast({
        type: 'success',
        title: 'Ad Boost Activated!',
        message: `"${listing.title}" is now boosted to the top of category feeds.`,
      });
      if (verifyData.data && onBoostSuccess) {
        onBoostSuccess(verifyData.data);
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Payment processing encountered an error. Please try again.');
      setIsProcessing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in duration-200">
      <div
        className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl max-w-xl w-full max-h-[90vh] overflow-y-auto shadow-2xl flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-slate-100 dark:border-slate-800 bg-gradient-to-r from-violet-600 via-indigo-600 to-blue-600 text-white rounded-t-2xl">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-white/20 rounded-xl">
              <Rocket className="w-5 h-5 text-amber-300" />
            </div>
            <div>
              <h3 className="font-extrabold text-base leading-tight">Boost Your Ad to Top</h3>
              <p className="text-xs text-indigo-100">
                Appear at the top of category listings instantly
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-white/20 transition-colors cursor-pointer text-white/80 hover:text-white"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6 flex-1">
          {completedStep === 'pending_order' ? (
            <div className="text-center py-6 space-y-4">
              <div className="w-16 h-16 bg-amber-100 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 rounded-full flex items-center justify-center mx-auto ring-8 ring-amber-50 dark:ring-amber-900/30">
                <Clock className="w-8 h-8" />
              </div>
              <div>
                <h4 className="text-xl font-black text-slate-900 dark:text-white">
                  Boost Order Saved (Pending Payment)
                </h4>
                <p className="text-sm text-slate-500 dark:text-slate-400 mt-1 max-w-md mx-auto">
                  Your boost request for{' '}
                  <span className="font-semibold text-slate-800 dark:text-slate-200">
                    &quot;{listing.title}&quot;
                  </span>{' '}
                  has been recorded as pending payment verification because the payment gateway is not currently configured.
                </p>
              </div>
              <div className="pt-4">
                <button
                  onClick={onClose}
                  className="w-full py-3 bg-slate-800 hover:bg-slate-900 text-white font-bold rounded-xl text-sm transition-all shadow-md cursor-pointer"
                >
                  Close
                </button>
              </div>
            </div>
          ) : completedStep === 'success' ? (
            <div className="text-center py-6 space-y-4">
              <div className="w-16 h-16 bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 rounded-full flex items-center justify-center mx-auto ring-8 ring-emerald-50 dark:ring-emerald-900/30">
                <CheckCircle2 className="w-8 h-8" />
              </div>
              <div>
                <h4 className="text-xl font-black text-slate-900 dark:text-white">
                  Ad Successfully Boosted!
                </h4>
                <p className="text-sm text-slate-500 dark:text-slate-400 mt-1 max-w-md mx-auto">
                  Your ad{' '}
                  <span className="font-semibold text-slate-800 dark:text-slate-200">
                    &quot;{listing.title}&quot;
                  </span>{' '}
                  is now elevated to the very top of search and category feeds.
                </p>
              </div>

              <div className="bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl p-4 text-left text-xs space-y-2 max-w-md mx-auto">
                <div className="flex justify-between">
                  <span className="text-slate-500">Selected Package:</span>
                  <span className="font-bold text-slate-900 dark:text-white">
                    {selectedPackage?.name}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Duration:</span>
                  <span className="font-bold text-indigo-600 dark:text-indigo-400">
                    {selectedPackage?.durationHours || (selectedPackage?.durationDays || 1) * 24}{' '}
                    Hours Top Ranking
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Total Paid (incl. 18% GST):</span>
                  <span className="font-black text-emerald-600 dark:text-emerald-400">
                    ₹{totalPayable}
                  </span>
                </div>
                <div className="flex justify-between border-t border-slate-200 dark:border-slate-700 pt-2">
                  <span className="text-slate-500">Status:</span>
                  <span className="inline-flex items-center gap-1 font-bold text-emerald-600">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping"></span>{' '}
                    Active Now
                  </span>
                </div>
              </div>

              <div className="pt-4">
                <button
                  onClick={onClose}
                  className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-sm transition-all shadow-md cursor-pointer"
                >
                  View My Ad in Top Listings
                </button>
              </div>
            </div>
          ) : (
            <>
              <div className="flex items-center gap-3.5 p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700">
                <img
                  src={
                    listing.images[0] ||
                    'https://images.unsplash.com/photo-1549399542-7e3f8b79c341?w=200&auto=format&fit=crop&q=80'
                  }
                  alt={listing.title}
                  className="w-16 h-16 rounded-lg object-cover shrink-0 ring-1 ring-slate-200 dark:ring-slate-700"
                />
                <div className="min-w-0 flex-1">
                  <span className="text-[10px] font-bold text-blue-600 dark:text-blue-400 uppercase tracking-wider">
                    Selected Ad for Boost
                  </span>
                  <h4 className="text-sm font-bold text-slate-900 dark:text-white truncate">
                    {listing.title}
                  </h4>
                  <div className="flex items-center gap-2 mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                    <span className="font-black text-slate-900 dark:text-white">
                      ₹{listing.price.toLocaleString('en-IN')}
                    </span>
                    <span>• {listing.location.locality || listing.location.city}</span>
                  </div>
                </div>
              </div>

              {isAlreadyBoosted && (
                <div className="p-3 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 rounded-xl text-xs text-amber-800 dark:text-amber-300 flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 text-amber-600 mt-0.5" />
                  <div>
                    <span className="font-bold">
                      This listing is currently active with a top boost.
                    </span>
                    <p className="mt-0.5 text-[11px]">
                      Boosts cannot overlap. You can purchase a new boost package once the current
                      active period expires.
                    </p>
                  </div>
                </div>
              )}

              <div>
                <div className="flex items-center justify-between mb-2.5">
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                    Select Boost Duration
                  </label>
                  <span className="text-[11px] text-indigo-600 dark:text-indigo-400 font-semibold flex items-center gap-1">
                    <Sparkles className="w-3 h-3" /> Real-time server rates
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {boostPackages.map((pkg) => {
                    const isSelected = selectedPackageId === pkg.id;
                    const hours = pkg.durationHours || pkg.durationDays * 24;

                    return (
                      <div
                        key={pkg.id}
                        onClick={() => setSelectedPackageId(pkg.id)}
                        className={`relative rounded-xl p-3.5 border transition-all cursor-pointer flex flex-col justify-between ${
                          isSelected
                            ? 'border-indigo-600 bg-indigo-50/70 dark:bg-indigo-950/40 ring-2 ring-indigo-600/30'
                            : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/40 hover:border-slate-300'
                        }`}
                      >
                        {pkg.badge && (
                          <span
                            className={`absolute -top-2.5 right-2.5 text-[9px] font-black uppercase px-2 py-0.5 rounded-full shadow-xs ${
                              isSelected
                                ? 'bg-indigo-600 text-white'
                                : 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300'
                            }`}
                          >
                            {pkg.badge}
                          </span>
                        )}

                        <div>
                          <div className="flex items-center gap-1 text-xs font-extrabold text-slate-900 dark:text-white">
                            <Clock className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                            <span>
                              {hours >= 24 && hours % 24 === 0
                                ? `${hours / 24} ${hours === 24 ? 'Day' : 'Days'}`
                                : `${hours} Hours`}
                            </span>
                          </div>

                          <div className="mt-2 text-xl font-black text-slate-900 dark:text-white flex items-baseline gap-1">
                            <span>₹{pkg.price}</span>
                            {pkg.discountPrice && (
                              <span className="text-xs text-slate-400 line-through font-normal">
                                ₹{pkg.discountPrice}
                              </span>
                            )}
                          </div>
                        </div>

                        <div className="mt-3 pt-2 border-t border-slate-200/60 dark:border-slate-700/60 text-[11px] text-slate-600 dark:text-slate-300">
                          <span className="font-semibold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                            <TrendingUp className="w-3 h-3" /> Top placement
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {selectedPackage && (
                  <div className="mt-3 p-3 bg-indigo-50/50 dark:bg-indigo-950/20 border border-indigo-100 dark:border-indigo-900/40 rounded-xl">
                    <span className="text-[11px] font-bold text-indigo-950 dark:text-indigo-200 block mb-1.5">
                      Included with {selectedPackage.name}:
                    </span>
                    <ul className="grid grid-cols-1 sm:grid-cols-2 gap-1 text-xs text-slate-600 dark:text-slate-300">
                      {selectedPackage.features.map((feat, idx) => (
                        <li key={idx} className="flex items-center gap-1.5">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                          <span className="truncate">{feat}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>

              {paymentGatewayConfigured ? (
                <div>
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 block mb-2">
                    Select Payment Method
                  </label>

                  <div className="grid grid-cols-3 gap-2.5">
                    <button
                      type="button"
                      onClick={() => setPaymentMethod('upi')}
                      className={`p-2.5 rounded-xl border text-xs font-bold flex flex-col items-center justify-center gap-1 transition-all cursor-pointer ${
                        paymentMethod === 'upi'
                          ? 'border-indigo-600 bg-indigo-50/60 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 ring-1 ring-indigo-600'
                          : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'
                      }`}
                    >
                      <QrCode className="w-4 h-4" />
                      <span>Instant UPI</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setPaymentMethod('card')}
                      className={`p-2.5 rounded-xl border text-xs font-bold flex flex-col items-center justify-center gap-1 transition-all cursor-pointer ${
                        paymentMethod === 'card'
                          ? 'border-indigo-600 bg-indigo-50/60 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 ring-1 ring-indigo-600'
                          : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'
                      }`}
                    >
                      <CreditCard className="w-4 h-4" />
                      <span>Cards</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setPaymentMethod('netbanking')}
                      className={`p-2.5 rounded-xl border text-xs font-bold flex flex-col items-center justify-center gap-1 transition-all cursor-pointer ${
                        paymentMethod === 'netbanking'
                          ? 'border-indigo-600 bg-indigo-50/60 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 ring-1 ring-indigo-600'
                          : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'
                      }`}
                    >
                      <Building className="w-4 h-4" />
                      <span>Netbanking</span>
                    </button>
                  </div>

                  {paymentMethod === 'upi' && (
                    <div className="mt-2.5">
                      <input
                        type="text"
                        value={upiId}
                        onChange={(e) => setUpiId(e.target.value)}
                        placeholder="Virtual Payment Address (e.g. mobile@upi)"
                        className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                      />
                    </div>
                  )}
                </div>
              ) : (
                <div className="p-3 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 rounded-xl text-xs text-amber-900 dark:text-amber-200 flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 text-amber-600 mt-0.5" />
                  <div>
                    <span className="font-bold">Payment Gateway Not Configured:</span> Online payment checkout is not enabled. Your boost request can be saved as a pending order and will activate only after payment is verified.
                  </div>
                </div>
              )}

              <div className="bg-slate-50 dark:bg-slate-800/40 rounded-xl p-3.5 border border-slate-200 dark:border-slate-700 text-xs space-y-1.5">
                <div className="flex justify-between text-slate-600 dark:text-slate-400">
                  <span>Boost Package Base:</span>
                  <span className="font-semibold text-slate-900 dark:text-white">₹{price}</span>
                </div>
                <div className="flex justify-between text-slate-600 dark:text-slate-400">
                  <span>Goods &amp; Service Tax (18% GST):</span>
                  <span>₹{taxAmount}</span>
                </div>
                <div className="flex justify-between text-sm font-black border-t border-slate-200 dark:border-slate-700 pt-2 text-slate-900 dark:text-white">
                  <span>{paymentGatewayConfigured ? 'Total Amount Payable:' : 'Total Pending Amount:'}</span>
                  <span className="text-indigo-600 dark:text-indigo-400">₹{totalPayable}</span>
                </div>
              </div>

              {errorMessage && (
                <div className="p-3 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 rounded-xl text-xs text-rose-700 dark:text-rose-300 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{errorMessage}</span>
                </div>
              )}

              <div className="pt-2">
                <button
                  type="button"
                  disabled={isProcessing || isAlreadyBoosted || !selectedPackage}
                  onClick={handleConfirmBoost}
                  className="w-full py-3 px-4 bg-gradient-to-r from-violet-600 via-indigo-600 to-blue-600 hover:from-violet-700 hover:to-blue-700 disabled:opacity-50 text-white font-extrabold rounded-xl shadow-lg flex items-center justify-center gap-2 text-sm transition-all cursor-pointer"
                >
                  {isProcessing ? (
                    <span className="flex items-center gap-2">
                      <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                      {paymentGatewayConfigured ? 'Confirming Secure Payment...' : 'Saving Pending Boost Order...'}
                    </span>
                  ) : isAlreadyBoosted ? (
                    'Boost Already Active on this Ad'
                  ) : paymentGatewayConfigured ? (
                    <>
                      <Rocket className="w-4 h-4 text-amber-300" />
                      <span>Pay ₹{totalPayable} &amp; Boost Ad Now</span>
                    </>
                  ) : (
                    <>
                      <Rocket className="w-4 h-4 text-amber-300" />
                      <span>Save Boost Order (₹{totalPayable} Pending Payment)</span>
                    </>
                  )}
                </button>

                <div className="flex items-center justify-center gap-1.5 text-[11px] text-slate-400 mt-2">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
                  <span>
                    {paymentGatewayConfigured
                      ? '256-Bit Encrypted Payment • Instant Rank Elevation'
                      : 'Verified Payment Required Before Boost Activation'}
                  </span>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
