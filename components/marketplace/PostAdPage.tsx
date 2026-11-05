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

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;
    // ... (rest of function remains same)
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

    filesArray.forEach((file) => {
      if (file.size > 5 * 1024 * 1024) {
        addToast({
          title: 'File Too Large',
          message: `${file.name} is larger than 5MB. Please upload a smaller image.`,
          type: 'error',
        });
        return;
      }

      const reader = new FileReader();
      reader.onloadend = () => {
        if (typeof reader.result === 'string') {
          setPostForm((prev) => ({
            ...prev,
            images: [...prev.images, reader.result as string],
          }));
        }
      };
      reader.readAsDataURL(file);
    });
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

  // Freemium Volume Quota calculations
  const userActiveListingsCount = useMemo(() => {
    if (!currentUser?.id) return 0;
    return listings.filter((l) => l.sellerId === currentUser.id && l.status === 'approved').length;
  }, [listings, currentUser]);

  const paidCfg = settings.paidFeatures;
  const currencySymbol = settings.currencySymbol || '₹';
  const isMasterMonetized = paidCfg ? paidCfg.masterMonetizationEnabled : true;
  const isQuotaEnabled = isMasterMonetized && (paidCfg ? paidCfg.freemiumQuotaEnabled : true);
  const isSubcatFeeEnabled = isMasterMonetized && (paidCfg ? paidCfg.paidSubcategoriesEnabled : true);
  const isFeaturedEnabled = isMasterMonetized && (paidCfg ? paidCfg.featuredAdEnabled : true);

  const freeQuotaLimit = paidCfg?.freeListingsLimit ?? settings.freeListingsLimit ?? 3;
  const extraListingFeeRate = paidCfg?.extraListingFee ?? settings.extraListingFee ?? 99;

  const isVolumeQuotaExceeded = isQuotaEnabled && userActiveListingsCount >= freeQuotaLimit;
  const volumeQuotaFee = isVolumeQuotaExceeded ? extraListingFeeRate : 0;
  const remainingFreeListings = Math.max(0, freeQuotaLimit - userActiveListingsCount);

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

  const selectedCategory = categories.find((c) => c.id === postForm.categoryId);
  const selectedSubcategory = categories.find((c) => c.id === postForm.subcategoryId);
  const currentSubcategories = categories.filter(
    (c) => c.parentId === postForm.categoryId && c.isActive
  );

  const isPaidSubcategory = isSubcatFeeEnabled && !!(selectedSubcategory?.isPaid || selectedCategory?.isPaid);
  const postingFeeAmount =
    selectedSubcategory?.postingFee || selectedCategory?.postingFee || paidCfg?.defaultSubcategoryFee || 149;

  const featuredAdPrice = paidCfg?.featuredAdPrice ?? 100;
  const featuredFee = isFeaturedEnabled && wantFeatured ? featuredAdPrice : 0;
  const baseFee = isPaidSubcategory ? postingFeeAmount : 0;
  const totalFee = isMasterMonetized ? baseFee + volumeQuotaFee + featuredFee : 0;
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

    const newAd = await addListing({
      title: postForm.title,
      categoryId: postForm.categoryId,
      subcategoryId: postForm.subcategoryId || undefined,
      sellerId,
      sellerName,
      sellerType,
      sellerPhone,
      sellerAvatar,
      price: parsedPrice as any,
      description: postForm.description || 'Genuine item, well maintained and used with care.',
      images: finalImages,
      status: requiresPayment ? 'approved' : 'pending',
      isFeatured: wantFeatured,
      featuredUntil: wantFeatured ? new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0] : undefined,
      isBoosted: wantFeatured,
      location: {
        city: postForm.city,
        state: postForm.state,
        locality: postForm.locality,
      },
      customAttributes: postForm.dynamicAttributes,
      expiresAt: new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0],
    });

    if (!newAd) {
      setTitleError(DUPLICATE_TITLE_ERROR_MESSAGE);
      titleInputRef.current?.focus();
      return;
    }

    if (requiresPayment) {
      const quotaDetails = isVolumeQuotaExceeded
        ? ` (includes ₹${volumeQuotaFee} Volume Quota Fee for ad #${userActiveListingsCount + 1})`
        : '';
      addToast({
        title: `Payment Processed: ₹${totalFee}`,
        message: `Payment of ₹${totalFee}${quotaDetails} received via ${paymentMethod.toUpperCase()}. Your ad #${newAd.id} is now live!`,
        type: 'success',
      });
    } else {
      addToast({
        title: 'Free Classified Ad Submitted!',
        message: `Your ad #${newAd.id} was posted using your free quota (${userActiveListingsCount + 1}/${freeQuotaLimit} active ads used).`,
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
        {!isUserAuthenticated ? (
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
                featuredAdDurationDays={paidCfg?.featuredAdDurationDays || 30}
                requiresPayment={requiresPayment}
                totalFee={totalFee}
                isPaidSubcategory={isPaidSubcategory}
                postingFeeAmount={postingFeeAmount}
                selectedCategory={selectedCategory}
                selectedSubcategory={selectedSubcategory}
                isVolumeQuotaExceeded={isVolumeQuotaExceeded}
                userActiveListingsCount={userActiveListingsCount}
                volumeQuotaFee={volumeQuotaFee}
                freeQuotaLimit={freeQuotaLimit}
                paymentMethod={paymentMethod}
                onToggleFeatured={(checked) => {
                  setWantFeatured(checked);
                  if (checked) {
                    addToast({
                      type: 'success',
                      title: 'Featured Promotion Added',
                      message: `Successfully added Featured Ad promotion (${currencySymbol}${featuredAdPrice}) to your checkout invoice.`,
                    });
                  }
                }}
                onSelectPaymentMethod={setPaymentMethod}
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
                    requiresPayment
                      ? 'bg-amber-600 hover:bg-amber-700 shadow-amber-600/30'
                      : 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-600/30'
                  }`}
                >
                  {requiresPayment ? (
                    <>
                      <IndianRupee className="w-4 h-4" />
                      <span>Pay ₹{totalFee} & Post Ad Now</span>
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
