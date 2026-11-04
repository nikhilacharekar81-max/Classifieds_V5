'use client';

import React, { useState } from 'react';
import dynamic from '@/src/shims/next-dynamic';
import { Share2 } from 'lucide-react';
import { Listing } from '@/lib/types';
import { dispatchPublicToast } from '@/components/common/ChunkErrorRecovery';
import { ListingGallery } from './detail/ListingGallery';
import { ListingOfferAndSellerCard } from './detail/ListingOfferAndSellerCard';

const BoostAdModal = dynamic(() =>
  import('./BoostAdModal').then((m) => m.BoostAdModal)
);

export const PublicListingShareButton: React.FC = () => {
  const [copiedLink, setCopiedLink] = useState(false);

  const handleShare = () => {
    if (typeof window !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(window.location.href);
      setCopiedLink(true);
      dispatchPublicToast({
        title: 'Link Copied',
        message: 'Classified ad webpage URL copied to your clipboard.',
        type: 'success',
      });
      setTimeout(() => setCopiedLink(false), 3000);
    }
  };

  return (
    <button
      type="button"
      onClick={handleShare}
      className="flex items-center gap-1 hover:text-blue-600 cursor-pointer text-slate-600 font-semibold"
    >
      <Share2 className="w-3.5 h-3.5 text-blue-600" />
      <span>{copiedLink ? 'Copied!' : 'Share'}</span>
    </button>
  );
};

export const PublicListingGalleryIsland: React.FC<{ listing: Listing }> = ({ listing }) => {
  const [activeImageIndex, setActiveImageIndex] = useState(0);

  return (
    <ListingGallery
      listing={listing}
      activeImageIndex={activeImageIndex}
      onSelectImage={setActiveImageIndex}
    />
  );
};

export const PublicListingOfferIsland: React.FC<{ listing: Listing }> = ({ listing }) => {
  const [showPhone, setShowPhone] = useState(false);
  const [revealedPhone, setRevealedPhone] = useState<string | null>(null);
  const [isRevealingPhone, setIsRevealingPhone] = useState(false);
  const [isBoostModalOpen, setIsBoostModalOpen] = useState(false);

  const handleRevealPhone = async () => {
    if (revealedPhone || listing.sellerPhone) {
      setShowPhone(true);
      return;
    }

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

  return (
    <>
      <ListingOfferAndSellerCard
        listing={listing}
        isOwner={false}
        showPhone={showPhone}
        revealedPhone={revealedPhone}
        isRevealingPhone={isRevealingPhone}
        onRevealPhone={handleRevealPhone}
        onOpenBoostModal={() => setIsBoostModalOpen(true)}
      />

      {isBoostModalOpen && (
        <BoostAdModal
          listing={listing}
          isOpen={isBoostModalOpen}
          onClose={() => setIsBoostModalOpen(false)}
          onBoostSuccess={() => setIsBoostModalOpen(false)}
        />
      )}
    </>
  );
};
