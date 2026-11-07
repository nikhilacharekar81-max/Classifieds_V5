'use client';
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useApp } from '@/context/AppContext';
import { LocationItem } from '@/lib/types';
import { ArrowLeft, Upload, IndianRupee } from 'lucide-react';
import { navigateTo } from '@/lib/router/useRouter';
import { buildChillyUrl } from '@/lib/utils/seoAndUrlHelper';
import { DUPLICATE_TITLE_ERROR_MESSAGE } from '@/lib/utils/adTitleValidation';
import { FreemiumQuotaBanner } from './post/FreemiumQuotaBanner';
import { CategoryStepSection } from './post/CategoryStepSection';
import { AdDetailsStepSection } from './post/AdDetailsStepSection';
import { PhotoUploadSection } from './post/PhotoUploadSection';
import { LocationStepSection } from './post/LocationStepSection';
import { BoostAndCheckoutSection } from './post/BoostAndCheckoutSection';

export const PostAdPage: React.FC = () => {
  const {
    categories,
    addListing,
    addToast,
    customFields,
    locations,
    currentUser,
    checkDuplicateTitle,
    settings,
    listings,
    isAuthChecking,
  } = useApp();

  const states = locations.filter((l) => l.type === 'state');
  const cities = locations.filter((l) => l.type === 'city');
  const localities = locations.filter((l) => l.type === 'locality');

  const rootCategories = categories.filter((c) => !c.parentId && c.isActive);
  const initialRoot = rootCategories[0]?.id || 'cat_services';
  const initialSubs = categories.filter((c) => c.parentId === initialRoot && c.isActive);

  const [postForm, setPostForm] = useState({
    title: '',
    categoryId: initialRoot,
    subcategoryId: initialSubs[0]?.id || '',
    price: '',
    description: '',
    country: 'India',
    state: '',
    city: '',
    locality: '',
    images: [] as string[],
    dynamicAttributes: {} as Record<string, any>,
  });

  // Authentication check helper
  const isUserAuthenticated = !!currentUser;

  const openAuthModal = (mode: 'signin' | 'signup') => {
    window.dispatchEvent(new CustomEvent('open_auth_modal', { detail: { mode } }));
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    const remainingSlots = 5 - postForm.images.length;
    if (remainingSlots <= 0) {
      addToast({
        title: 'Photo Limit Reached',
        message: 'Maximum 5 photos are allowed per listing.',
        type: 'warning',
      });
      return;
    }

    const filesArray = Array.from(files).slice(0, remainingSlots);

    for (const file of filesArray) {
      if (file.size > 5 * 1024 * 1024) {
        addToast({
          title: 'File Too Large',
          message: `${file.name} is larger than 5MB. Please upload a smaller image.`,
          type: 'error',
        });
        continue;
      }

      const formData = new FormData();
      formData.append('file', file);

      try {
        const res = await fetch('/api/listings/upload', {
          method: 'POST',
          body: formData,
        });

        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(data.error || 'Upload failed');
        }

        const { url } = await res.json();
        setPostForm((prev) => ({
          ...prev,
          images: [...prev.images, url],
        }));
      } catch (err: any) {
        addToast({
          title: 'Upload Failed',
          message: err.message || `Failed to upload ${file.name}.`,
          type: 'error',
        });
      }
    }
  };

  const handleRemoveImage = (index: number) => {
    const updated = postForm.images.filter((_, i) => i !== index);
    setPostForm((prev) => ({
      ...prev,
      images: updated,
    }));
  };

  const [titleError, setTitleError] = useState<string | null>(null);
  const [isCheckingTitle, setIsCheckingTitle] = useState(false);
  const titleInputRef = useRef<HTMLInputElement>(null);

  const [paymentMethod, setPaymentMethod] = useState<'upi' | 'card' | 'netbanking'>('upi');
  const [wantFeatured, setWantFeatured] = useState(false);
  const [serverActiveQuotaCount, setServerActiveQuotaCount] = useState<number | null>(null);
  const [quotaStatus, setQuotaStatus] = useState<'loading' | 'loaded' | 'unavailable'>('loading');

  useEffect(() => {
    if (!currentUser?.id) {
      setServerActiveQuotaCount(null);
      setQuotaStatus('unavailable');
      return;
    }
    let cancelled = false;
    setQuotaStatus('loading');
    fetch(`/api/listings?sellerId=${encodeURIComponent(currentUser.id)}&limit=1`, {
      credentials: 'include',
    })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (cancelled) return;
        const authoritativeCount = data?.statusCounts?.activeQuotaCount;
        if (typeof authoritativeCount === 'number' && Number.isFinite(authoritativeCount)) {
          setServerActiveQuotaCount(authoritativeCount);
          setQuotaStatus('loaded');
        } else {
          setServerActiveQuotaCount(null);
          setQuotaStatus('unavailable');
        }
      })
      .catch(() => {
        if (!cancelled) {
          setServerActiveQuotaCount(null);
          setQuotaStatus('unavailable');
        }
      });
    return () => {
      cancelled = true;
    };
  }, [currentUser?.id, listings.length]);

  // Never fall back to truncated client-side bootstrap listings for quota counts (#13)
  const userActiveListingsCount = useMemo(() => {
    if (!currentUser?.id) return null;
    if (quotaStatus === 'loaded' && serverActiveQuotaCount !== null) {
      return serverActiveQuotaCount;
    }
    return null;
  }, [currentUser?.id, quotaStatus, serverActiveQuotaCount]);

  const paidCfg = settings.paidFeatures;
  const currencySymbol = settings.currencySymbol || '₹';
  const paymentGatewayConfigured = Boolean(settings.paymentGatewayConfigured);
  const isMasterMonetized = paidCfg ? paidCfg.masterMonetizationEnabled : true;
  const isQuotaEnabled = isMasterMonetized && (paidCfg ? paidCfg.freemiumQuotaEnabled : true);
  const isSubcatFeeEnabled = isMasterMonetized && (paidCfg ? paidCfg.paidSubcategoriesEnabled : true);
  const isFeaturedEnabled = isMasterMonetized && (paidCfg ? paidCfg.featuredAdEnabled : true);

  const selectedCategory = categories.find((c) => c.id === postForm.categoryId);
  const selectedSubcategory = categories.find((c) => c.id === postForm.subcategoryId);
  const currentSubcategories = categories.filter(
    (c) => c.parentId === postForm.categoryId && c.isActive
  );

  const freeQuotaLimit =
    selectedSubcategory?.freeListingsQuota ??
    selectedCategory?.freeListingsQuota ??
    paidCfg?.freeListingsLimit ??
    settings.freeListingsLimit ??
    3;
  const extraListingFeeRate = paidCfg?.extraListingFee ?? settings.extraListingFee ?? 99;

  const isVolumeQuotaExceeded =
    isQuotaEnabled && userActiveListingsCount !== null && userActiveListingsCount >= freeQuotaLimit;
  const remainingFreeListings =
    userActiveListingsCount !== null ? Math.max(0, freeQuotaLimit - userActiveListingsCount) : null;

  // As-you-type debounced duplicate title check for immediate user feedback
  useEffect(() => {
    if (!postForm.title.trim() || !currentUser?.id) {
      if (titleError !== null) setTitleError(null);
      return;
    }

    const timer = setTimeout(async () => {
      setIsCheckingTitle(true);
      const res = await checkDuplicateTitle(postForm.title, currentUser.id);
      if (res.isDuplicate) {
        setTitleError(res.message || DUPLICATE_TITLE_ERROR_MESSAGE);
      } else {
        setTitleError(null);
      }
      setIsCheckingTitle(false);
    }, 250);

    return () => clearTimeout(timer);
  }, [postForm.title, currentUser?.id, checkDuplicateTitle]);

  const sortedStates: LocationItem[] = useMemo(() => {
    return states.slice().sort((a, b) => a.name.localeCompare(b.name));
  }, [states]);

  const availableCities: LocationItem[] = useMemo(() => {
    if (!postForm.state) return [];
    const stateObj = states.find((s) => s.name === postForm.state);
    if (!stateObj) return [];
    return cities
      .filter((c) => c.parentId === stateObj.id)
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [states, cities, postForm.state]);

  const configuredCategoryFee =
    selectedSubcategory?.postingFee !== undefined && selectedSubcategory?.postingFee !== null
      ? Number(selectedSubcategory.postingFee)
      : selectedCategory?.postingFee !== undefined && selectedCategory?.postingFee !== null
        ? Number(selectedCategory.postingFee)
        : undefined;
  const rawPostingFee =
    configuredCategoryFee !== undefined
      ? configuredCategoryFee
      : paidCfg?.defaultSubcategoryFee ?? 149;
  const postingFeeAmount = Math.max(0, Number(rawPostingFee) || 0);
  const effectivePaidFlag =
    selectedSubcategory !== undefined
      ? selectedSubcategory.isPaid !== undefined
        ? Boolean(selectedSubcategory.isPaid)
        : Boolean(selectedCategory?.isPaid)
      : Boolean(selectedCategory?.isPaid);
  const isPaidSubcategory =
    (configuredCategoryFee !== undefined && configuredCategoryFee > 0) ||
    (isSubcatFeeEnabled && effectivePaidFlag && postingFeeAmount > 0);

  // Paid category/subcategory fees apply independently of free quota; do not double-charge quota fee on paid categories (#2)
  const volumeQuotaFee = !isPaidSubcategory && isVolumeQuotaExceeded ? extraListingFeeRate : 0;
  const featuredAdPrice = paidCfg?.featuredAdPrice ?? 100;
  const featuredFee = isFeaturedEnabled && wantFeatured ? featuredAdPrice : 0;
  const baseFee = isPaidSubcategory ? postingFeeAmount : 0;
  const mandatoryPostingFee = isMasterMonetized ? baseFee + volumeQuotaFee : 0;
  const totalFee = isMasterMonetized ? mandatoryPostingFee + featuredFee : 0;
  const requiresPayment = totalFee > 0;

  const activeCategoryFields = customFields.filter((f) => {
    if (postForm.subcategoryId) {
      const subFieldsExist = customFields.some((cf) => cf.categoryId === postForm.subcategoryId);
      if (subFieldsExist) {
        return f.categoryId === postForm.subcategoryId;
      }
    }
    return f.categoryId === postForm.categoryId;
  });

  const handleDynamicAttrChange = (key: string, value: any) => {
    setPostForm((prev) => ({
      ...prev,
      dynamicAttributes: {
        ...prev.dynamicAttributes,
        [key]: value,
      },
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!currentUser) {
      addToast({
        title: 'Authentication Required',
        message: 'Please log in to post an ad.',
        type: 'warning',
      });
      openAuthModal('signin');
      return;
    }

    if (!postForm.title) {
      addToast({
        title: 'Title Required',
        message: 'Please provide at least a title for your ad.',
        type: 'warning',
      });
      return;
    }

    if (!postForm.state || !postForm.city) {
      addToast({
        title: 'Location Required',
        message: 'Please select your State and City in India where the item or service is located.',
        type: 'warning',
      });
      return;
    }

    if (!currentUser.phone || !currentUser.phone.trim()) {
      addToast({
        title: 'Phone Number Required',
        message: 'A verified phone number is required on your account to post an ad. Please add your phone number in Account Settings.',
        type: 'warning',
      });
      return;
    }

    const duplicateCheck = await checkDuplicateTitle(postForm.title, currentUser.id);
    if (duplicateCheck.isDuplicate) {
      const errorMsg = duplicateCheck.message || DUPLICATE_TITLE_ERROR_MESSAGE;
      setTitleError(errorMsg);
      titleInputRef.current?.focus();
      titleInputRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      addToast({
        title: 'Duplicate Ad Title Detected',
        message: errorMsg,
        type: 'error',
      });
      return;
    }

    const sellerId = currentUser.id;
    const sellerName = currentUser.name;
    const sellerType = currentUser.type || 'user';
    const sellerPhone = currentUser.phone || '';
    const sellerAvatar = currentUser.avatar || '';

    const finalImages = postForm.images.slice(0, 5);

    let parsedPrice: number | null = null;
    if (postForm.price !== undefined && postForm.price !== null && String(postForm.price).trim() !== '') {
      const p = Number(postForm.price);
      if (!isNaN(p) && isFinite(p) && p >= 0) {
        parsedPrice = p;
      }
    }

    const listingDurationDays = settings.listingDurationDays || 30;
    const isAdminActor = currentUser.adminRole === 'admin' || currentUser.adminRole === 'super_admin';

    let createdOrderId: string | undefined = undefined;
    let postingFeePaymentId: string | undefined = undefined;
    let postingFeeSignature: string | undefined = undefined;
    let selectedPaymentGateway: string | undefined = undefined;

    if (mandatoryPostingFee > 0 && !isAdminActor) {
      if (!paymentGatewayConfigured) {
        addToast({
          title: 'Payment Gateway Not Configured',
          message: `This category requires a posting fee of ${currencySymbol}${mandatoryPostingFee}, but online payment is not currently configured. Your ad details and uploaded photos have been preserved.`,
          type: 'error',
        });
        return;
      }

      try {
        const orderRes = await fetch('/api/listings/create-order', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({
            categoryId: postForm.categoryId,
            subcategoryId: postForm.subcategoryId || undefined,
            purpose: 'posting_fee',
          }),
        });
        const orderData = await orderRes.json();
        if (!orderRes.ok || !orderData.orderId) {
          addToast({
            title: 'Posting Order Failed',
            message: orderData.error || 'Failed to create a server-side posting order.',
            type: 'error',
          });
          return;
        }
        createdOrderId = orderData.orderId;
        const rzpKey = orderData.keyId;
        const rzpOrderId = orderData.providerOrderId || orderData.orderId;

        // Open genuine payment provider checkout (Razorpay SDK) if key and provider order ID are returned
        if (typeof window !== 'undefined' && rzpKey && orderData.providerOrderId) {
          const { openRazorpayCheckout } = await import('@/lib/utils/razorpay');
          const razorpayPayment = await openRazorpayCheckout({
            key: rzpKey,
            amount: Math.round((orderData.amount || mandatoryPostingFee) * 100),
            currency: orderData.currency || 'INR',
            name: settings?.siteName || 'Chillyads Classifieds',
            description: `Posting Fee for ${postForm.title.substring(0, 30)}`,
            order_id: rzpOrderId,
            prefill: {
              name: currentUser?.name,
              email: currentUser?.email,
              contact: currentUser?.phone,
            }
          });

          postingFeePaymentId = razorpayPayment.paymentId;
          postingFeeSignature = razorpayPayment.signature;
          selectedPaymentGateway = 'Razorpay';
        } else {
          // If payment gateway SDK is not loaded or credentials/provider order creation is unavailable
          addToast({
            title: 'Online Payment Checkout Unavailable',
            message: `Razorpay payment gateway credentials or SDK are not available on the server. Paid listing creation requires a configured payment provider. Your form details and photos have been preserved.`,
            type: 'error',
          });
          return;
        }
      } catch (err: any) {
        addToast({
          title: 'Checkout Cancelled / Failed',
          message: err?.message || 'Could not complete online payment checkout. Your ad details and photos have been preserved.',
          type: 'error',
        });
        return;
      }
    }

    const result = (await addListing({
      title: postForm.title,
      categoryId: postForm.categoryId,
      subcategoryId: postForm.subcategoryId || undefined,
      sellerId,
      sellerName,
      sellerType,
      sellerPhone,
      sellerAvatar,
      price: parsedPrice as any,
      description: postForm.description,
      images: finalImages,
      status: 'pending',
      isFeatured: isAdminActor ? wantFeatured : false,
      requestedFeatured: !isAdminActor && wantFeatured ? true : undefined,
      featuredUntil: undefined,
      isBoosted: false,
      postingFeeOrderId: createdOrderId,
      postingFeePaymentId,
      postingFeeSignature,
      paymentGateway: selectedPaymentGateway,
      location: {
        city: postForm.city,
        state: postForm.state,
        locality: postForm.locality,
      },
      customAttributes: {
        ...postForm.dynamicAttributes,
        ...(wantFeatured
          ? {
              requestedFeatured: true,
              featuredPaymentStatus: isAdminActor ? 'approved' : 'pending',
              requestedFeaturedPrice: featuredAdPrice,
              requestedFeaturedDurationDays: paidCfg?.featuredAdDurationDays ?? 30,
            }
          : {}),
      },
      expiresAt: new Date(Date.now() + listingDurationDays * 86400000).toISOString().split('T')[0],
    } as any)) as any;

    const { listing: newAd, error, code } = result || {};

    if (!newAd) {
      if (code === 'DUPLICATE_TITLE') {
        setTitleError(error || DUPLICATE_TITLE_ERROR_MESSAGE);
        titleInputRef.current?.focus();
        titleInputRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
      return;
    }

    if (wantFeatured && !isAdminActor) {
      addToast({
        title: 'Standard Listing Submitted (Featured Pending Payment)',
        message: `Your ad #${newAd.id} was submitted for moderation as a standard listing. The Featured upgrade (${currencySymbol}${featuredAdPrice}) is saved as pending payment verification.`,
        type: 'warning',
      });
    } else if (requiresPayment) {
      addToast({
        title: 'Ad Submitted',
        message: `Your ad #${newAd.id} has been submitted. Payment of ${currencySymbol}${totalFee} is required to activate paid features.`,
        type: 'info',
      });
    } else {
      const quotaSummary =
        userActiveListingsCount !== null
          ? `(${userActiveListingsCount + 1}/${freeQuotaLimit} active ads used)`
          : `(Free limit: ${freeQuotaLimit} active ads)`;
      addToast({
        title: 'Free Classified Ad Submitted!',
        message: `Your ad #${newAd.id} was posted using your free quota ${quotaSummary}. It is now awaiting moderation.`,
        type: 'success',
      });
    }

    navigateTo(buildChillyUrl({ listing: newAd, categories }));
  };

  return (
    <div className="min-h-screen bg-slate-100 text-slate-900 pb-20 overflow-x-hidden">
      {/* Top Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigateTo('/')}
              className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-600 transition-colors cursor-pointer"
              title="Return to Classifieds"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div className="flex items-center gap-2">
              <span className="text-xl font-black text-slate-950 tracking-tighter">
                Chillyads<span className="text-emerald-600">.in</span>
              </span>
              <span className="text-slate-300">|</span>
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                Post Free Classified Ad
              </span>
            </div>
          </div>

          <button
            onClick={() => navigateTo('/')}
            className="text-xs text-slate-500 hover:text-slate-800 font-medium cursor-pointer"
          >
            Cancel & Exit
          </button>
        </div>
      </header>

      {/* Main Posting Form */}
      <main className="max-w-4xl mx-auto px-4 py-8">
        {isAuthChecking ? (
          <div className="text-center py-20 text-slate-500">Loading authentication...</div>
        ) : !isUserAuthenticated ? (
          <div className="bg-white rounded-2xl p-8 border border-slate-200 shadow-sm text-center">
            <h2 className="text-xl font-black text-slate-900 mb-4">Post Free Classified Ad</h2>
            <p className="text-slate-600 mb-6">Please log in or register to post your free ad. Registration is free.</p>
            <div className="flex gap-4 justify-center">
              <button
                onClick={() => openAuthModal('signin')}
                className="px-6 py-2 bg-emerald-600 text-white font-bold rounded-lg hover:bg-emerald-700 cursor-pointer"
              >
                Log In
              </button>
              <button
                onClick={() => openAuthModal('signup')}
                className="px-6 py-2 bg-slate-200 text-slate-800 font-bold rounded-lg hover:bg-slate-300 cursor-pointer"
              >
                Register for Free
              </button>
            </div>
          </div>
        ) : (
          <>
            <div className="mb-6">
              <h1 className="text-2xl font-black text-slate-900 tracking-tight">
                Create Your Free Classified Listing
              </h1>
              <p className="text-xs text-slate-500 mt-1">
                Choose your main department and subcategory. Custom fields adapt dynamically to your selection.
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
              <FreemiumQuotaBanner
                isVolumeQuotaExceeded={isVolumeQuotaExceeded}
                remainingFreeListings={remainingFreeListings}
                userActiveListingsCount={userActiveListingsCount}
                quotaStatus={quotaStatus}
                freeQuotaLimit={freeQuotaLimit}
                extraListingFeeRate={extraListingFeeRate}
              />

              <CategoryStepSection
                categories={categories}
                rootCategories={rootCategories}
                currentSubcategories={currentSubcategories}
                selectedCategory={selectedCategory}
                selectedSubcategory={selectedSubcategory}
                categoryId={postForm.categoryId}
                subcategoryId={postForm.subcategoryId}
                onSelectCategory={(catId, defaultSubId) => {
                  setPostForm((prev) => ({
                    ...prev,
                    categoryId: catId,
                    subcategoryId: defaultSubId,
                    dynamicAttributes: {},
                  }));
                }}
                onSelectSubcategory={(subId) => {
                  setPostForm((prev) => ({
                    ...prev,
                    subcategoryId: subId,
                  }));
                }}
              />

              <AdDetailsStepSection
                title={postForm.title}
                description={postForm.description}
                price={postForm.price}
                titleError={titleError}
                isCheckingTitle={isCheckingTitle}
                titleInputRef={titleInputRef}
                activeCategoryFields={activeCategoryFields}
                selectedCategory={selectedCategory}
                selectedSubcategory={selectedSubcategory}
                dynamicAttributes={postForm.dynamicAttributes}
                onTitleChange={(title) => {
                  setPostForm((prev) => ({ ...prev, title }));
                  if (titleError) setTitleError(null);
                }}
                onDescriptionChange={(description) => setPostForm((prev) => ({ ...prev, description }))}
                onPriceChange={(price) => setPostForm((prev) => ({ ...prev, price }))}
                onDynamicAttrChange={handleDynamicAttrChange}
              />

              <PhotoUploadSection
                images={postForm.images}
                onFileChange={handleFileChange}
                onRemoveImage={handleRemoveImage}
              />

              <LocationStepSection
                state={postForm.state}
                city={postForm.city}
                locality={postForm.locality}
                sortedStates={sortedStates}
                availableCities={availableCities}
                cities={cities}
                localities={localities}
                currentUser={currentUser}
                onStateChange={(state) =>
                  setPostForm((prev) => ({
                    ...prev,
                    state,
                    city: '',
                    locality: '',
                  }))
                }
                onCityChange={(city) =>
                  setPostForm((prev) => ({
                    ...prev,
                    city,
                    locality: '',
                  }))
                }
                onLocalityChange={(locality) =>
                  setPostForm((prev) => ({
                    ...prev,
                    locality,
                  }))
                }
                onUseProfileLocation={() => {
                  if (!currentUser?.location) return;
                  setPostForm((prev) => ({
                    ...prev,
                    country: 'India',
                    state: currentUser.location.state,
                    city: currentUser.location.city,
                    locality: '',
                  }));
                  addToast({
                    title: 'Location Set from Profile',
                    message: `Set to ${currentUser.location.city}, ${currentUser.location.state}`,
                    type: 'info',
                  });
                }}
              />

              <BoostAndCheckoutSection
                isFeaturedEnabled={isFeaturedEnabled}
                wantFeatured={wantFeatured}
                currencySymbol={currencySymbol}
                featuredAdPrice={featuredAdPrice}
                featuredAdDurationDays={paidCfg?.featuredAdDurationDays ?? 30}
                requiresPayment={requiresPayment}
                paymentGatewayConfigured={paymentGatewayConfigured}
                totalFee={totalFee}
                isPaidSubcategory={isPaidSubcategory}
                postingFeeAmount={postingFeeAmount}
                selectedCategory={selectedCategory}
                selectedSubcategory={selectedSubcategory}
                isVolumeQuotaExceeded={isVolumeQuotaExceeded}
                userActiveListingsCount={userActiveListingsCount}
                quotaStatus={quotaStatus}
                volumeQuotaFee={volumeQuotaFee}
                freeQuotaLimit={freeQuotaLimit}
                paymentMethod={paymentMethod}
                onToggleFeatured={(checked) => {
                  setWantFeatured(checked);
                  if (checked) {
                    addToast({
                      type: 'info',
                      title: 'Featured Upgrade Selected (Payment Pending)',
                      message: `Featured promotion (${currencySymbol}${featuredAdPrice}) is selected as a pending request. It requires verified payment before activation.`,
                    });
                  }
                }}
                onSelectPaymentMethod={setPaymentMethod}
                boostEnabled={settings.boostEnabled}
              />

              {/* Submit Actions Bar */}
              <div className="flex items-center justify-between gap-4 pt-4 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => navigateTo('/')}
                  className="px-5 py-2.5 text-xs font-bold text-slate-600 hover:text-slate-800 transition-colors cursor-pointer"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  className={`px-8 py-3 text-white font-bold rounded-xl shadow-lg text-sm flex items-center gap-2 transition-all cursor-pointer hover:scale-102 ${
                    requiresPayment && paymentGatewayConfigured
                      ? 'bg-amber-600 hover:bg-amber-700 shadow-amber-600/30'
                      : 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-600/30'
                  }`}
                >
                  {requiresPayment && paymentGatewayConfigured ? (
                    <>
                      <IndianRupee className="w-4 h-4" />
                      <span>Pay ₹{totalFee} & Post Ad Now</span>
                    </>
                  ) : wantFeatured && mandatoryPostingFee === 0 ? (
                    <>
                      <Upload className="w-4 h-4" />
                      <span>Post Ad & Save Featured Request</span>
                    </>
                  ) : (
                    <>
                      <Upload className="w-4 h-4" />
                      <span>Post Classified Ad Now</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </>
        )}
      </main>
    </div>
  );
};
