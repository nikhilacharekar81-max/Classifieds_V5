'use client';

import React, { useState, useEffect } from 'react';
import { ArrowLeft, AlertCircle, Share2 } from 'lucide-react';
import { NavLink } from '@/components/common/NavLink';
import { useApp } from '@/context/AppContext';
import { Listing } from '@/lib/types';
import { Footer } from '@/components/common/Footer';
import { buildChillyUrl, findListingById } from '@/lib/utils/seoAndUrlHelper';
import { CategorySubNavbar } from './CategorySubNavbar';
import { MarketplaceHeader } from './MarketplaceHeader';
import { ListingGallery } from './detail/ListingGallery';
import { ListingSpecsAndDescription } from './detail/ListingSpecsAndDescription';
import { ListingOfferAndSellerCard } from './detail/ListingOfferAndSellerCard';
import { SellerLiveChatBox, BuyerSafetyBanner } from './detail/SellerLiveChatBox';
import { SimilarListingsSection } from './detail/SimilarListingsSection';
import { BoostAdModal } from './BoostAdModal';
import { ListingMapWidget } from './ListingMapWidget';

export interface ListingDetailPageProps {
  listingId: string;
  initialListing?: Listing | null;
  initialListings?: Listing[];
}

export const ListingDetailPage: React.FC<ListingDetailPageProps> = ({
  listingId,
  initialListing,
  initialListings,
}) => {
  const {
    listings,
    categories,
    addToast,
    marketplaceSearch,
    setMarketplaceSearch,
    currentUser,
  } = useApp();

  const sourceListings =
    initialListings && initialListings.length > 0 ? initialListings : listings;
  const listing =
    (initialListing && findListingById([initialListing], listingId)) ||
    findListingById(sourceListings, listingId) ||
    findListingById(listings, listingId) ||
    initialListing ||
    null;

  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const [showPhone, setShowPhone] = useState(false);
  const [revealedPhone, setRevealedPhone] = useState<string | null>(null);
  const [isRevealingPhone, setIsRevealingPhone] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [isBoostModalOpen, setIsBoostModalOpen] = useState(false);

  useEffect(() => {
    setActiveImageIndex(0);
    setShowPhone(false);
    setRevealedPhone(null);
  }, [listingId]);

  const handleRevealPhone = async () => {
    if (revealedPhone || listing?.sellerPhone) {
      setShowPhone(true);
      return;
    }
    if (!listing) return;

    setIsRevealingPhone(true);
    try {
      const res = await fetch(`/api/listings/${encodeURIComponent(listing.id)}/reveal-phone`);
      if (res.ok) {
        const data = await res.json();
        if (data.phone) {
          setRevealedPhone(data.phone);
          setShowPhone(true);
        }
      }
    } catch (err) {
      console.error('Failed to reveal seller phone:', err);
    } finally {
      setIsRevealingPhone(false);
    }
  };

  const isOwner = Boolean(listing && currentUser && listing.sellerId === currentUser.id);

  if (!listing) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6 text-center">
        <div className="w-16 h-16 bg-rose-100 text-rose-600 rounded-2xl flex items-center justify-center mb-4">
          <AlertCircle className="w-8 h-8" />
        </div>
        <h2 className="text-xl font-bold text-slate-800">Classified Ad Not Found</h2>
        <p className="text-sm text-slate-500 max-w-md mt-1 mb-6">
          The listing #{listingId} may have been sold, removed, or expired.
        </p>
        <NavLink
          href="/"
          className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm rounded-xl shadow transition-all flex items-center gap-2"
        >
          <ArrowLeft className="w-4 h-4" /> Return to Classifieds Home
        </NavLink>
      </div>
    );
  }

  const category = categories.find((c) => c.id === listing.categoryId);
  const subcategory = listing.subcategoryId
    ? categories.find((c) => c.id === listing.subcategoryId)
    : null;
  const relatedListings = sourceListings
    .filter(
      (l) =>
        l.id !== listing.id &&
        l.status === 'approved' &&
        (l.categoryId === listing.categoryId ||
          l.subcategoryId === listing.subcategoryId ||
          l.location.city === listing.location.city)
    )
    .slice(0, 4);

  const cityUrl = buildChillyUrl({
    city: listing.location.city || 'All India',
    categories,
  });

  const categoryUrl = buildChillyUrl({
    city: listing.location.city || 'All India',
    categoryId: listing.categoryId,
    subcategoryId: 'all',
    categories,
  });

  const subcategoryUrl = subcategory
    ? buildChillyUrl({
        city: listing.location.city || 'All India',
        categoryId: listing.categoryId,
        subcategoryId: subcategory.id,
        categories,
      })
    : '';

  const handleShare = () => {
    const fullUrl = window.location.href;
    navigator.clipboard.writeText(fullUrl);
    setCopiedLink(true);
    addToast({
      title: 'Link Copied',
      message: 'Classified ad webpage URL copied to your clipboard.',
      type: 'success',
    });
    setTimeout(() => setCopiedLink(false), 3000);
  };

  return (
    <div className="min-h-screen bg-[#f8f9fa] text-[#202124] pb-20">
      <MarketplaceHeader
        effectiveCity={listing.location?.city || 'All India'}
        effectiveSearch={marketplaceSearch}
        onSearchChange={setMarketplaceSearch}
      />

      <CategorySubNavbar
        currentCity={listing.location?.city}
        activeCategoryId={listing.categoryId}
        activeSubcategoryId={listing.subcategoryId}
      />

      {/* Top Breadcrumb Bar */}
      <nav
        aria-label="Breadcrumb"
        className="bg-white border-b border-slate-200 listing-breadcrumb text-slate-500"
      >
        <div className="max-w-7xl mx-auto px-4 py-2.5 flex items-center justify-between text-xs overflow-x-auto whitespace-nowrap scrollbar-none">
          <div className="flex items-center gap-2">
            <NavLink
              href="/"
              className="hover:text-blue-600 font-medium flex items-center gap-1 shrink-0"
            >
              Home
            </NavLink>
            {listing.location?.city && (
              <>
                <span className="text-slate-300">/</span>
                <NavLink
                  href={cityUrl}
                  className="hover:text-blue-600 font-medium transition-colors cursor-pointer shrink-0"
                >
                  {listing.location.city}
                </NavLink>
              </>
            )}
            <span className="text-slate-300">/</span>
            {category && (
              <>
                <NavLink
                  href={categoryUrl}
                  className="hover:text-blue-600 font-medium transition-colors cursor-pointer shrink-0"
                >
                  {category.name}
                </NavLink>
                <span className="text-slate-300">/</span>
              </>
            )}
            {subcategory && (
              <>
                <NavLink
                  href={subcategoryUrl}
                  className="hover:text-blue-600 font-medium transition-colors cursor-pointer shrink-0"
                >
                  {subcategory.name}
                </NavLink>
                <span className="text-slate-300">/</span>
              </>
            )}
            <span className="text-slate-900 font-semibold truncate max-w-xs sm:max-w-md">
              {listing.title}{' '}
              {listing.location.locality ? `in ${listing.location.locality}` : ''}{' '}
              {listing.location.city ? `, ${listing.location.city}` : ''}
            </span>
          </div>

          <div className="hidden sm:flex items-center gap-3 text-slate-400 shrink-0 pl-4">
            <span>AD ID: #{listing.id}</span>
            <button
              type="button"
              onClick={handleShare}
              className="flex items-center gap-1 hover:text-blue-600 cursor-pointer text-slate-600 font-semibold"
            >
              <Share2 className="w-3.5 h-3.5 text-blue-600" />
              <span>{copiedLink ? 'Copied!' : 'Share'}</span>
            </button>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 py-6">
        <article
          itemScope
          itemType="https://schema.org/Product"
          className="grid grid-cols-1 lg:grid-cols-12 gap-6"
        >
          <meta itemProp="name" content={listing.title} />
          <meta itemProp="description" content={listing.description} />
          <meta itemProp="image" content={listing.images[0]} />
          <div
            itemProp="offers"
            itemScope
            itemType="https://schema.org/Offer"
            className="hidden"
          >
            <meta itemProp="price" content={String(listing.price)} />
            <meta itemProp="priceCurrency" content="INR" />
            <meta
              itemProp="availability"
              content={
                listing.status === 'sold'
                  ? 'https://schema.org/OutOfStock'
                  : 'https://schema.org/InStock'
              }
            />
            <meta itemProp="itemCondition" content="https://schema.org/UsedCondition" />
          </div>

          {/* Left Column (7 cols): Images & Full Specs */}
          <div className="lg:col-span-7 space-y-6">
            <ListingGallery
              listing={listing}
              activeImageIndex={activeImageIndex}
              onSelectImage={setActiveImageIndex}
            />
            <ListingSpecsAndDescription listing={listing} />
          </div>

          {/* Right Column (5 cols): Price, Seller & Interactive Chat */}
          <div className="lg:col-span-5 space-y-6">
            <ListingOfferAndSellerCard
              listing={listing}
              isOwner={isOwner}
              showPhone={showPhone}
              revealedPhone={revealedPhone}
              isRevealingPhone={isRevealingPhone}
              onRevealPhone={handleRevealPhone}
              onOpenBoostModal={() => setIsBoostModalOpen(true)}
            />

            <SellerLiveChatBox listing={listing} />

            <ListingMapWidget
              cityName={listing.location.city}
              locality={listing.location.locality}
              state={listing.location.state}
              title={listing.title}
              priceFormatted={`₹${listing.price.toLocaleString('en-IN')}`}
            />

            <BuyerSafetyBanner />
          </div>
        </article>

        <SimilarListingsSection
          relatedListings={relatedListings}
          cityName={listing.location.city}
          categories={categories}
        />
      </main>

      {isBoostModalOpen && (
        <BoostAdModal
          listing={listing}
          isOpen={isBoostModalOpen}
          onClose={() => setIsBoostModalOpen(false)}
          onBoostSuccess={() => setIsBoostModalOpen(false)}
        />
      )}

      <Footer />
    </div>
  );
};
