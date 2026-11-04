'use client';
import React from 'react';
import {
  Listing,
  UserAccount,
  PromotionalPackage,
  OrderTransaction,
  ToastMessage,
  EmailLog,
} from '@/lib/types';
import {
  checkDuplicateAdTitle,
  DUPLICATE_TITLE_ERROR_MESSAGE,
} from '@/lib/utils/adTitleValidation';
import { isListingBoosted } from '@/lib/utils/boostHelper';

interface UseListingActionsParams {
  listings: Listing[];
  setListings: React.Dispatch<React.SetStateAction<Listing[]>>;
  users: UserAccount[];
  currentUser: UserAccount;
  packages: PromotionalPackage[];
  setPackages: React.Dispatch<React.SetStateAction<PromotionalPackage[]>>;
  setTransactions: React.Dispatch<React.SetStateAction<OrderTransaction[]>>;
  sendEmail: (emailData: Omit<EmailLog, 'id' | 'sentAt' | 'status'>) => void;
  addToast: (toast: Omit<ToastMessage, 'id'>) => void;
  recordAuditLog: (action: string, module: string, targetId: string, targetSummary: string, details: string) => void;
}

export function useListingActions({
  listings,
  setListings,
  users,
  currentUser,
  packages,
  setPackages,
  setTransactions,
  sendEmail,
  addToast,
  recordAuditLog,
}: UseListingActionsParams) {
  const approveListing = (id: string) => {
    const item = listings.find((l) => l.id === id);
    if (!item) return;
    setListings((prev) =>
      prev.map((l) => (l.id === id ? { ...l, status: 'approved' as const, rejectionReason: undefined } : l))
    );
    recordAuditLog(
      'APPROVE_LISTING',
      'Marketplace / Listings',
      id,
      item.title,
      'Listing reviewed and approved for public search'
    );

    const seller = users.find((u) => u.id === item.sellerId);
    const sellerEmail = seller?.email || 'seller@example.com';
    const sellerName = item.sellerName || seller?.name || 'Valued Seller';

    sendEmail({
      toEmail: sellerEmail,
      toName: sellerName,
      subject: `🎉 Good News! Your ad "${item.title.substring(0, 45)}..." is Approved & Live!`,
      body: `Hi ${sellerName},\n\nGreat news! Your classified listing "${item.title}" (Ad ID: #${item.id}) has been reviewed and approved by our moderation team. It is now live and visible to buyers across ${item.location?.city || 'India'}.\n\n🚀 Want to get up to 10x more buyer enquiries? Feature your ad at the top of category search results with an eye-catching Gold Featured Badge!`,
      actionLabel: '⭐ Feature Your Ad Now',
      actionUrl: `/user/my-ads?feature=${item.id}`,
      type: 'ad_approved',
      listingId: item.id,
      listingTitle: item.title,
      relatedUserId: item.sellerId,
    });

    addToast({
      type: 'success',
      title: 'Listing Approved & Email Sent',
      message: `"${item.title.substring(0, 35)}..." is live. Approval email with Feature Ad option dispatched to ${sellerEmail}.`,
    });

    fetch(`/api/listings/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'approved' }),
    }).catch(() => {});
  };

  const rejectListing = (id: string, reason: string) => {
    const item = listings.find((l) => l.id === id);
    if (!item) return;
    setListings((prev) =>
      prev.map((l) => (l.id === id ? { ...l, status: 'rejected' as const, rejectionReason: reason } : l))
    );
    recordAuditLog('REJECT_LISTING', 'Marketplace / Listings', id, item.title, `Rejected with reason: ${reason}`);
    addToast({
      type: 'error',
      title: 'Listing Rejected',
      message: `Reason: ${reason}`,
    });

    fetch(`/api/listings/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'rejected', rejectionReason: reason }),
    }).catch(() => {});
  };

  const featureListing = (id: string, isFeatured: boolean) => {
    const item = listings.find((l) => l.id === id);
    if (!item) return;
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + 30);
    const featuredUntil = isFeatured ? futureDate.toISOString().split('T')[0] : undefined;
    setListings((prev) =>
      prev.map((l) =>
        l.id === id
          ? {
              ...l,
              isFeatured,
              featuredUntil,
            }
          : l
      )
    );
    recordAuditLog(
      isFeatured ? 'FEATURE_LISTING' : 'UNFEATURE_LISTING',
      'Marketplace / Listings',
      id,
      item.title,
      isFeatured ? 'Granted Featured Ad status badge' : 'Removed featured status'
    );
    addToast({
      type: 'success',
      title: isFeatured ? 'Listing Featured' : 'Feature Status Removed',
      message: item.title.substring(0, 40) + '...',
    });

    fetch(`/api/listings/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ isFeatured, featuredUntil: featuredUntil || null }),
    }).catch(() => {});
  };

  const markAsSold = (id: string) => {
    const item = listings.find((l) => l.id === id);
    if (!item) return;
    setListings((prev) => prev.map((l) => (l.id === id ? { ...l, status: 'sold' as const } : l)));
    recordAuditLog('MARK_AS_SOLD', 'Marketplace / Listings', id, item.title, 'Marked as sold');
    addToast({
      type: 'info',
      title: 'Marked as Sold',
      message: 'Item has been archived as sold.',
    });

    fetch(`/api/listings/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'sold' }),
    }).catch(() => {});
  };

  const deleteListing = (id: string) => {
    const item = listings.find((l) => l.id === id);
    if (!item) return;
    setListings((prev) => prev.filter((l) => l.id !== id));
    recordAuditLog('DELETE_LISTING', 'Marketplace / Listings', id, item.title, 'Permanently deleted listing');
    addToast({
      type: 'warning',
      title: 'Listing Deleted',
      message: 'The listing has been removed.',
    });

    fetch(`/api/listings/${id}`, {
      method: 'DELETE',
    }).catch(() => {});
  };

  const updateListing = (updatedListing: Listing): boolean => {
    const duplicateCheck = checkDuplicateAdTitle({
      title: updatedListing.title,
      sellerId: updatedListing.sellerId,
      existingListings: listings,
      excludeListingId: updatedListing.id,
    });

    if (duplicateCheck.isDuplicate) {
      addToast({
        type: 'error',
        title: 'Duplicate Ad Title Detected',
        message: DUPLICATE_TITLE_ERROR_MESSAGE,
      });
      return false;
    }

    setListings((prev) => prev.map((l) => (l.id === updatedListing.id ? updatedListing : l)));
    addToast({
      type: 'success',
      title: 'Listing Updated',
      message: `"${updatedListing.title.substring(0, 35)}..." saved successfully.`,
    });

    fetch(`/api/listings/${updatedListing.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updatedListing),
    }).catch(() => {});

    return true;
  };

  const restoreListing = (id: string) => {
    setListings((prev) => prev.map((l) => (l.id === id ? { ...l, status: 'approved' as const } : l)));

    fetch(`/api/listings/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'approved' }),
    }).catch(() => {});
  };

  const sendAdExpiredEmail = (listingId: string) => {
    const listing = listings.find((l) => l.id === listingId);
    if (!listing) return;

    const sellerUser = users.find((u) => u.id === listing.sellerId);
    const toEmail =
      sellerUser?.email || `${listing.sellerName.toLowerCase().replace(/[^a-z0-9]/g, '')}@example.com`;

    sendEmail({
      toEmail,
      toName: listing.sellerName,
      subject: `Action Required: Your ad "${listing.title.length > 40 ? listing.title.substring(0, 37) + '...' : listing.title}" has expired – Renew it for FREE now!`,
      body: `Hi ${listing.sellerName},\n\nYour classified ad "${listing.title}" (Ad ID: #${listing.id}) on Chillyads has expired on ${listing.expiresAt}.\n\nGood news: You can renew your ad right now for 100% FREE without paying any fees. Once renewed, your listing will be immediately visible again to active buyers across ${listing.location.city}.\n\nClick the button below to renew your ad for free in one click:`,
      actionLabel: 'Renew Ad for Free (₹0)',
      actionUrl: `/my-account?tab=my-ads&filter=expired&renew=${listing.id}`,
      type: 'ad_expired',
      listingId: listing.id,
      listingTitle: listing.title,
    });

    addToast({
      type: 'info',
      title: '📧 Expiry Notice Dispatched',
      message: `Automated free renewal email sent to ${listing.sellerName} (${toEmail}).`,
    });
  };

  const markListingAsExpired = (id: string) => {
    const item = listings.find((l) => l.id === id);
    if (!item) return;

    const todayStr = new Date().toISOString().split('T')[0];
    setListings((prev) =>
      prev.map((l) => (l.id === id ? { ...l, status: 'expired' as const, expiresAt: todayStr } : l))
    );

    recordAuditLog(
      'MARK_EXPIRED',
      'Marketplace / Listings',
      id,
      item.title,
      `Marked as expired. Automated expiry notice email sent.`
    );
    sendAdExpiredEmail(id);

    fetch(`/api/listings/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'expired', expiresAt: todayStr }),
    }).catch(() => {});
  };

  const renewListing = (id: string, days = 30, isFree = true) => {
    const item = listings.find((l) => l.id === id);
    if (!item) return;

    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + days);
    const newExpires = futureDate.toISOString().split('T')[0];

    setListings((prev) =>
      prev.map((l) =>
        l.id === id
          ? {
              ...l,
              status: 'approved' as const,
              expiresAt: newExpires,
              rejectionReason: undefined,
            }
          : l
      )
    );

    const sellerUser = users.find((u) => u.id === item.sellerId);
    const toEmail =
      sellerUser?.email || `${item.sellerName.toLowerCase().replace(/[^a-z0-9]/g, '')}@example.com`;

    sendEmail({
      toEmail,
      toName: item.sellerName,
      subject: `Your ad "${item.title.length > 40 ? item.title.substring(0, 37) + '...' : item.title}" has been renewed & is now LIVE!`,
      body: `Hi ${item.sellerName},\n\nCongratulations! Your classified listing "${item.title}" (Ad ID: #${item.id}) has been successfully renewed for ${days} days until ${newExpires} (${isFree ? '100% Free of Charge' : 'Extended'}).\n\nYour ad is now active in ${item.location.city} and receiving search traffic, buyer calls, and chats.`,
      actionLabel: 'View Live Listing',
      actionUrl: `/item/${item.id}`,
      type: 'ad_renewed',
      listingId: item.id,
      listingTitle: item.title,
    });

    recordAuditLog(
      'RENEW_LISTING',
      'Marketplace / Listings',
      id,
      item.title,
      `Renewed for ${days} days until ${newExpires} (${isFree ? 'Free ₹0' : 'Paid'})`
    );

    addToast({
      type: 'success',
      title: '🎉 Ad Renewed for Free!',
      message: `"${item.title.substring(0, 32)}..." is now renewed and active for ${days} days.`,
    });

    fetch(`/api/listings/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'approved', expiresAt: newExpires, rejectionReason: null }),
    }).catch(() => {});
  };

  const bulkRenewListings = (ids: string[], days = 30) => {
    if (ids.length === 0) return;

    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + days);
    const newExpires = futureDate.toISOString().split('T')[0];

    setListings((prev) =>
      prev.map((l) =>
        ids.includes(l.id)
          ? {
              ...l,
              status: 'approved' as const,
              expiresAt: newExpires,
              rejectionReason: undefined,
            }
          : l
      )
    );

    ids.forEach((id) => {
      const item = listings.find((l) => l.id === id);
      if (item) {
        const sellerUser = users.find((u) => u.id === item.sellerId);
        const toEmail =
          sellerUser?.email || `${item.sellerName.toLowerCase().replace(/[^a-z0-9]/g, '')}@example.com`;
        sendEmail({
          toEmail,
          toName: item.sellerName,
          subject: `Admin Renewal Notice: Your ad "${item.title.length > 40 ? item.title.substring(0, 37) + '...' : item.title}" has been renewed!`,
          body: `Hi ${item.sellerName},\n\nYour classified ad "${item.title}" (Ad ID: #${item.id}) has been renewed by the Chillyads Admin team for an additional ${days} days until ${newExpires} (100% Free).\n\nYour ad is active and visible to all buyers in ${item.location.city}.`,
          actionLabel: 'View Live Listing',
          actionUrl: `/item/${item.id}`,
          type: 'ad_renewed',
          listingId: item.id,
          listingTitle: item.title,
        });
      }
    });

    recordAuditLog(
      'BULK_RENEW_LISTINGS',
      'Marketplace / Admin',
      `${ids.length} ads`,
      `Bulk renewed ${ids.length} expired ads`,
      `Extended all by ${days} days until ${newExpires} (Free renewal)`
    );

    addToast({
      type: 'success',
      title: '✅ Bulk Renewal Completed',
      message: `Successfully renewed ${ids.length} expired listings for ${days} days. Confirmation emails sent to sellers.`,
    });

    fetch('/api/listings/bulk-action', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'update', ids, data: { status: 'approved', expiresAt: newExpires } }),
    }).catch(() => {});
  };

  const extendExpiration = (id: string, days = 30) => {
    renewListing(id, days, true);
  };

  const addListing = async (
    newListingData: Omit<Listing, 'id' | 'createdAt' | 'views' | 'likes' | 'chatsCount'>
  ): Promise<Listing | null> => {
    const duplicateCheck = checkDuplicateAdTitle({
      title: newListingData.title,
      sellerId: newListingData.sellerId,
      existingListings: listings,
    });

    if (duplicateCheck.isDuplicate) {
      addToast({
        type: 'error',
        title: 'Duplicate Ad Title Detected',
        message: DUPLICATE_TITLE_ERROR_MESSAGE,
      });
      return null;
    }

    try {
      const res = await fetch('/api/listings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newListingData),
      });

      if (!res.ok) {
        throw new Error('Failed to create listing');
      }

      const createdListing: Listing = await res.json();

      setListings((prev) => [createdListing, ...prev]);
      recordAuditLog(
        'NEW_LISTING_POSTED',
        'Marketplace / Listings',
        createdListing.id,
        createdListing.title,
        `Submitted with status: ${createdListing.status}`
      );
      addToast({
        type: 'success',
        title: 'Ad Posted Successfully!',
        message:
          createdListing.status === 'approved'
            ? 'Your ad is live on Chillyads.'
            : 'Ad submitted for verification in the moderation queue.',
      });

      return createdListing;
    } catch (err) {
      console.error('Failed to create listing:', err);
      addToast({
        type: 'error',
        title: 'Posting Failed',
        message: 'There was an error saving your ad.',
      });
      return null;
    }
  };

  const checkDuplicateTitle = async (
    title: string,
    sellerId: string,
    excludeListingId?: string
  ): Promise<{ isDuplicate: boolean; message?: string; conflictingListingId?: string }> => {
    const clientCheck = checkDuplicateAdTitle({
      title,
      sellerId,
      existingListings: listings,
      excludeListingId,
    });

    if (clientCheck.isDuplicate) {
      return clientCheck;
    }

    try {
      const res = await fetch('/api/listings/check-duplicate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, sellerId, excludeListingId }),
      });
      if (res.ok) {
        return await res.json();
      }
    } catch {
      // Return clientCheck on network failure
    }

    return clientCheck;
  };

  const bulkApproveListings = (ids: string[]) => {
    setListings((prev) =>
      prev.map((l) => (ids.includes(l.id) ? { ...l, status: 'approved' as const, rejectionReason: undefined } : l))
    );
    recordAuditLog(
      'BULK_APPROVE',
      'Marketplace / Moderation',
      `${ids.length} items`,
      `${ids.length} listings approved`,
      `IDs: ${ids.join(', ')}`
    );
    addToast({
      type: 'success',
      title: 'Bulk Approval Complete',
      message: `Successfully approved ${ids.length} listings.`,
    });

    fetch('/api/listings/bulk-action', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'update', ids, data: { status: 'approved' } }),
    }).catch(() => {});
  };

  const bulkRejectListings = (ids: string[], reason: string) => {
    setListings((prev) =>
      prev.map((l) => (ids.includes(l.id) ? { ...l, status: 'rejected' as const, rejectionReason: reason } : l))
    );
    recordAuditLog(
      'BULK_REJECT',
      'Marketplace / Moderation',
      `${ids.length} items`,
      `${ids.length} listings rejected`,
      `Reason: ${reason}`
    );
    addToast({
      type: 'error',
      title: 'Bulk Rejection Applied',
      message: `Rejected ${ids.length} listings. Reason: ${reason}`,
    });

    fetch('/api/listings/bulk-action', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'update', ids, data: { status: 'rejected', rejectionReason: reason } }),
    }).catch(() => {});
  };

  const bulkDeleteListings = (ids: string[]) => {
    setListings((prev) => prev.filter((l) => !ids.includes(l.id)));
    recordAuditLog(
      'BULK_DELETE',
      'Marketplace / Listings',
      `${ids.length} items`,
      'Permanently deleted multiple listings',
      `IDs: ${ids.join(', ')}`
    );
    addToast({
      type: 'warning',
      title: 'Bulk Delete Applied',
      message: `Deleted ${ids.length} listings.`,
    });

    fetch('/api/listings/bulk-action', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'delete', ids }),
    }).catch(() => {});
  };

  const cleanupExpiredBoosts = () => {
    const now = Date.now();
    setListings((prev) => {
      let changed = false;
      const updated = prev.map((listing) => {
        if (listing.isBoosted && listing.boostExpiresAt) {
          const expiryTime = new Date(listing.boostExpiresAt).getTime();
          if (expiryTime <= now) {
            changed = true;
            return {
              ...listing,
              isBoosted: false,
              boostStatus: 'expired' as const,
            };
          }
        }
        return listing;
      });
      return changed ? updated : prev;
    });

    if (typeof window !== 'undefined') {
      fetch('/api/boost/cleanup-expired', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nowMs: now }),
      }).catch(() => {});
    }
  };

  const boostListing = async (
    listingId: string,
    packageId: string,
    paymentMethod: 'upi' | 'card' | 'netbanking' = 'upi'
  ): Promise<{ success: boolean; message: string; listing?: Listing; transaction?: OrderTransaction }> => {
    const listing = listings.find((l) => l.id === listingId);
    if (!listing) {
      return { success: false, message: 'Listing not found' };
    }

    if (isListingBoosted(listing)) {
      return {
        success: false,
        message: 'This ad already has an active boost. You can boost it again after the current boost expires.',
      };
    }

    const pkg = packages.find((p) => p.id === packageId);
    if (!pkg) {
      return { success: false, message: 'Selected boost package not found' };
    }

    try {
      const orderRes = await fetch('/api/boost/create-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          listingId,
          packageId,
          userId: currentUser?.id || listing.sellerId,
          userName: currentUser?.name || listing.sellerName,
        }),
      });

      if (!orderRes.ok) {
        const errData = await orderRes.json().catch(() => ({}));
        return {
          success: false,
          message: errData.error || 'Failed to initialize boost order on server',
        };
      }

      const orderData = await orderRes.json();
      const paymentId = `pay_boost_${Date.now()}_${Math.floor(100 + Math.random() * 900)}`;
      const gatewayName = paymentMethod === 'upi' ? 'UPI' : paymentMethod === 'card' ? 'Razorpay' : 'Netbanking';

      const verifyRes = await fetch('/api/boost/verify-payment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orderId: orderData.orderId,
          listingId,
          packageId,
          paymentId,
          paymentGateway: gatewayName,
          userId: currentUser?.id || listing.sellerId,
        }),
      });

      if (!verifyRes.ok) {
        const errData = await verifyRes.json().catch(() => ({}));
        return {
          success: false,
          message: errData.error || 'Payment verification failed',
        };
      }

      const verifyData = await verifyRes.json();
      const updatedListing = verifyData.listing as Listing;
      const transaction = verifyData.transaction as OrderTransaction;

      setListings((prev) => prev.map((l) => (l.id === listingId ? updatedListing : l)));
      setPackages((prev) =>
        prev.map((p) => (p.id === packageId ? { ...p, salesCount: (p.salesCount || 0) + 1 } : p))
      );
      if (transaction) {
        setTransactions((prev) => [transaction, ...prev]);
      }

      recordAuditLog(
        'BOOST_LISTING',
        'Marketplace / Ads',
        listingId,
        listing.title,
        `Boosted with package ${pkg.name} for ₹${pkg.price} (Payment Ref: ${paymentId})`
      );

      addToast({
        type: 'success',
        title: 'Ad Boosted to Top!',
        message: `"${listing.title}" is now boosted to the top of category feeds for ${pkg.durationHours || pkg.durationDays * 24} hours.`,
      });

      return {
        success: true,
        message: 'Ad successfully boosted to top!',
        listing: updatedListing,
        transaction,
      };
    } catch (err: any) {
      addToast({
        type: 'error',
        title: 'Boost Payment Failed',
        message: err.message || 'Unable to complete boost order verification.',
      });

      return {
        success: false,
        message: err.message || 'Payment processing failed. Please try again.',
      };
    }
  };

  return {
    approveListing,
    rejectListing,
    featureListing,
    markAsSold,
    deleteListing,
    updateListing,
    restoreListing,
    sendAdExpiredEmail,
    markListingAsExpired,
    renewListing,
    bulkRenewListings,
    extendExpiration,
    addListing,
    checkDuplicateTitle,
    bulkApproveListings,
    bulkRejectListings,
    bulkDeleteListings,
    cleanupExpiredBoosts,
    boostListing,
  };
}
