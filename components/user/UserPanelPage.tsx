'use client';
import React, { useState } from 'react';
import { useApp } from '@/context/AppContext';
import { Listing, UserAccount } from '@/lib/types';
import {
  ShoppingBag,
  Receipt,
  MessageSquare,
  Settings,
  Mail,
} from 'lucide-react';
import { DUPLICATE_TITLE_ERROR_MESSAGE } from '@/lib/utils/adTitleValidation';
import { UserProfileHeader } from './UserProfileHeader';
import { MyAdsTab } from './MyAdsTab';
import { EmailNotificationsTab } from './EmailNotificationsTab';
import { OrdersReceiptsTab, MessagesEnquiriesTab } from './OrdersAndMessagesTabs';
import { AccountSettingsTab } from './AccountSettingsTab';
import { KycDocumentModal, EditListingModal } from './UserPanelModals';
import { BoostAdModal } from '@/components/marketplace/BoostAdModal';
import { FeatureAdModal } from '@/components/marketplace/FeatureAdModal';

export const UserPanelPage: React.FC = () => {
  const {
    users,
    listings,
    transactions,
    emailLogs,
    updateListing,
    deleteListing,
    markAsSold,
    renewListing,
    updateUser,
    addToast,
    checkDuplicateTitle,
    settings,
    currentUser: authUser,
  } = useApp();

  const [activeUserId, setActiveUserId] = useState<string>(() => {
    return (
      authUser?.id ||
      users.find((u) => u.type === 'user' || u.type === 'business')?.id ||
      users[0]?.id ||
      'usr_101'
    );
  });

  const currentUser = users.find((u) => u.id === activeUserId) || users[0];

  const [activeTab, setActiveTab] = useState<
    'my-ads' | 'saved-ads' | 'orders-receipts' | 'messages' | 'email-notifications' | 'account-settings'
  >('my-ads');

  const [adStatusFilter, setAdStatusFilter] = useState<
    'all' | 'approved' | 'pending' | 'expired' | 'sold' | 'rejected'
  >('all');
  const [adSearchQuery, setAdSearchQuery] = useState('');

  const [editingListing, setEditingListing] = useState<Listing | null>(null);
  const [editTitleError, setEditTitleError] = useState<string | null>(null);
  const [boostTargetListing, setBoostTargetListing] = useState<Listing | null>(null);
  const [featureModalListing, setFeatureModalListing] = useState<Listing | null>(null);

  const [kycModalOpen, setKycModalOpen] = useState(false);
  const [kycDocType, setKycDocType] = useState<'Aadhaar' | 'PAN' | 'GSTIN' | 'Passport'>('Aadhaar');
  const [kycDocNumber, setKycDocNumber] = useState('');

  const [profileForm, setProfileForm] = useState({
    name: currentUser?.name || '',
    email: currentUser?.email || '',
    phone: currentUser?.phone || '',
    city: currentUser?.location?.city || '',
    state: currentUser?.location?.state || '',
    companyName: currentUser?.businessDetails?.companyName || '',
    gstNumber: currentUser?.businessDetails?.gstNumber || '',
  });

  React.useEffect(() => {
    if (currentUser) {
      setProfileForm({
        name: currentUser.name,
        email: currentUser.email,
        phone: currentUser.phone,
        city: currentUser.location.city,
        state: currentUser.location.state,
        companyName: currentUser.businessDetails?.companyName || '',
        gstNumber: currentUser.businessDetails?.gstNumber || '',
      });
    }
  }, [currentUser?.id]);

  const userEmails = React.useMemo(() => {
    if (!currentUser) return [];
    return emailLogs.filter(
      (e) =>
        (e.toEmail && currentUser.email && e.toEmail.toLowerCase() === currentUser.email.toLowerCase()) ||
        e.relatedUserId === currentUser.id
    );
  }, [emailLogs, currentUser]);

  React.useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const featureTargetId = urlParams.get('feature');
    if (featureTargetId) {
      const target = listings.find((l) => l.id === featureTargetId);
      if (target && featureModalListing?.id !== target.id) {
        setFeatureModalListing(target);
      }
    }
  }, [listings, featureModalListing?.id]);

  const [sellerListings, setSellerListings] = useState<Listing[] | null>(null);
  const [loadingSellerListings, setLoadingSellerListings] = useState(false);

  const fetchSellerListings = React.useCallback(async (sellerId: string) => {
    setLoadingSellerListings(true);
    try {
      const res = await fetch(`/api/listings?sellerId=${encodeURIComponent(sellerId)}&status=all&limit=200`);
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data.items)) {
          setSellerListings(data.items);
        }
      }
    } catch (err) {
      console.error('Failed to fetch seller listings:', err);
    } finally {
      setLoadingSellerListings(false);
    }
  }, []);

  React.useEffect(() => {
    if (currentUser?.id) {
      fetchSellerListings(currentUser.id);
    }
  }, [currentUser?.id, fetchSellerListings]);

  const userListings = sellerListings !== null
    ? sellerListings
    : currentUser?.id
      ? listings.filter((l) => l.sellerId === currentUser.id)
      : [];
  const activeUserApprovedListingsCount = userListings.filter((l) => l.status === 'approved').length;
  const freeQuotaLimit = settings.freeListingsLimit ?? 3;
  const extraListingFeeRate = settings.extraListingFee ?? 99;
  const isQuotaExceeded = activeUserApprovedListingsCount >= freeQuotaLimit;
  const freeQuotaSlotsRemaining = Math.max(0, freeQuotaLimit - activeUserApprovedListingsCount);

  const filteredUserListings = userListings.filter((l) => {
    if (adStatusFilter !== 'all' && l.status !== adStatusFilter) return false;
    if (adSearchQuery.trim()) {
      const q = adSearchQuery.toLowerCase();
      return l.title.toLowerCase().includes(q) || l.description.toLowerCase().includes(q);
    }
    return true;
  });

  const handleRenewListing = async (id: string, days?: number, isFree?: boolean) => {
    const success = await renewListing(id, days, isFree);
    if (success && currentUser?.id) {
      fetchSellerListings(currentUser.id);
    }
  };

  const handleMarkAsSold = async (id: string) => {
    const success = await markAsSold(id);
    if (success && currentUser?.id) {
      fetchSellerListings(currentUser.id);
    }
  };

  const handleDeleteListing = async (id: string) => {
    const success = await deleteListing(id);
    if (success && currentUser?.id) {
      fetchSellerListings(currentUser.id);
    }
  };

  const userTransactions = currentUser?.id ? transactions.filter((t) => t.userId === currentUser.id) : [];

  const handleSaveProfile = (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) return;

    const updated: UserAccount = {
      ...currentUser,
      name: profileForm.name,
      email: profileForm.email,
      phone: profileForm.phone,
      location: {
        city: profileForm.city,
        state: profileForm.state,
      },
      businessDetails: profileForm.companyName
        ? {
            companyName: profileForm.companyName,
            gstNumber: profileForm.gstNumber,
            verifiedBusiness: currentUser.businessDetails?.verifiedBusiness || false,
          }
        : currentUser.businessDetails,
    };

    updateUser(updated);
  };

  const handleKycSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!kycDocNumber.trim()) {
      addToast({ type: 'error', title: 'KYC Document Required', message: 'Please enter a valid document number.' });
      return;
    }

    const updated: UserAccount = {
      ...currentUser,
      kycStatus: 'pending',
      kycDocument: {
        type: kycDocType,
        docNumber: kycDocNumber,
        submittedAt: new Date().toISOString().split('T')[0],
        fileUrl: 'https://images.unsplash.com/photo-1568602471122-7832951cc4c5?auto=format&fit=crop&w=400&q=80',
      },
    };

    updateUser(updated);
    setKycModalOpen(false);
    setKycDocNumber('');
    addToast({
      type: 'success',
      title: 'KYC Document Submitted',
      message: 'Your verification request has been sent for admin compliance review.',
    });
  };

  const handleSaveListingEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingListing) return;

    const duplicateCheck = await checkDuplicateTitle(
      editingListing.title,
      editingListing.sellerId,
      editingListing.id
    );

    if (duplicateCheck.isDuplicate) {
      const errorMsg = duplicateCheck.message || DUPLICATE_TITLE_ERROR_MESSAGE;
      setEditTitleError(errorMsg);
      addToast({
        type: 'error',
        title: 'Duplicate Ad Title Detected',
        message: errorMsg,
      });
      return;
    }

    const success = await updateListing(editingListing);
    if (success) {
      setEditingListing(null);
      setEditTitleError(null);
      if (currentUser?.id) {
        fetchSellerListings(currentUser.id);
      }
    } else {
      setEditTitleError(DUPLICATE_TITLE_ERROR_MESSAGE);
    }
  };

  if (!currentUser) {
    return (
      <div className="min-h-screen bg-slate-100 dark:bg-slate-950 text-slate-900 dark:text-slate-100 font-sans flex items-center justify-center p-6">
        <div className="max-w-md w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-8 text-center shadow-sm space-y-4">
          <div className="w-12 h-12 bg-blue-100 dark:bg-blue-950/60 text-blue-600 rounded-full flex items-center justify-center mx-auto">
            <ShoppingBag className="w-6 h-6" />
          </div>
          <h2 className="text-xl font-bold">Seller Dashboard</h2>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Please sign in to view and manage your classified ads, renewals, and chat enquiries.
          </p>
          <a
            href="/"
            className="inline-block px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl text-sm transition-colors"
          >
            Go to Marketplace
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-100 dark:bg-slate-950 text-slate-900 dark:text-slate-100 font-sans pb-12 overflow-x-hidden">
      <UserProfileHeader
        users={users}
        activeUserId={activeUserId}
        currentUser={currentUser}
        userListings={userListings}
        activeUserApprovedListingsCount={activeUserApprovedListingsCount}
        freeQuotaLimit={freeQuotaLimit}
        isQuotaExceeded={isQuotaExceeded}
        onSelectUser={setActiveUserId}
        onOpenKycModal={() => setKycModalOpen(true)}
      />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 pt-6 space-y-6">
        {/* Tab Navigation Menu */}
        <div className="flex items-center gap-2 border-b border-slate-200 dark:border-slate-800 overflow-x-auto scrollbar-none pb-0.5">
          {[
            { id: 'my-ads', label: 'My Classified Ads', icon: ShoppingBag, count: userListings.length },
            { id: 'email-notifications', label: 'Email Notifications & Approvals', icon: Mail, count: userEmails.length },
            { id: 'orders-receipts', label: 'Purchases & Invoices', icon: Receipt, count: userTransactions.length },
            { id: 'messages', label: 'Chat Enquiries', icon: MessageSquare, count: userListings.reduce((sum, l) => sum + l.chatsCount, 0) },
            { id: 'account-settings', label: 'Account Profile & Security', icon: Settings },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center gap-2 px-4 py-3 font-extrabold text-xs border-b-2 transition-all whitespace-nowrap cursor-pointer ${
                  isActive
                    ? 'border-blue-600 text-blue-600 dark:border-blue-400 dark:text-blue-400 bg-white dark:bg-slate-900 rounded-t-xl shadow-xs'
                    : 'border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200/50 dark:hover:bg-slate-800/50 rounded-t-xl'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span>{tab.label}</span>
                {tab.count !== undefined && (
                  <span
                    className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                      isActive ? 'bg-blue-100 text-blue-800' : 'bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-300'
                    }`}
                  >
                    {tab.count}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {activeTab === 'my-ads' && (
          <MyAdsTab
            userListings={userListings}
            filteredUserListings={filteredUserListings}
            activeUserApprovedListingsCount={activeUserApprovedListingsCount}
            freeQuotaLimit={freeQuotaLimit}
            extraListingFeeRate={extraListingFeeRate}
            isQuotaExceeded={isQuotaExceeded}
            freeQuotaSlotsRemaining={freeQuotaSlotsRemaining}
            adStatusFilter={adStatusFilter}
            adSearchQuery={adSearchQuery}
            onStatusFilterChange={setAdStatusFilter}
            onSearchQueryChange={setAdSearchQuery}
            onEditListing={(listing) => {
              setEditingListing(listing);
              setEditTitleError(null);
            }}
            onRenewListing={handleRenewListing}
            onMarkAsSold={handleMarkAsSold}
            onFeatureListingModal={setFeatureModalListing}
            onBoostListingModal={setBoostTargetListing}
            onDeleteListing={handleDeleteListing}
          />
        )}

        {activeTab === 'email-notifications' && (
          <EmailNotificationsTab
            currentUser={currentUser}
            userEmails={userEmails}
            listings={listings}
            onFeatureListingModal={setFeatureModalListing}
          />
        )}

        {activeTab === 'orders-receipts' && (
          <OrdersReceiptsTab
            currentUser={currentUser}
            userTransactions={userTransactions}
            onDownloadInvoice={(txId) => {
              addToast({
                type: 'success',
                title: 'Tax Invoice Downloaded',
                message: `GST Invoice for ${txId} saved as PDF.`,
              });
            }}
          />
        )}

        {activeTab === 'messages' && (
          <MessagesEnquiriesTab
            userListings={userListings}
            onReplyToBuyers={(title) => {
              addToast({
                type: 'info',
                title: 'Chat Messenger Opened',
                message: `Connecting to buyer inbox thread for "${title.substring(0, 30)}..."`,
              });
            }}
          />
        )}

        {activeTab === 'account-settings' && (
          <AccountSettingsTab
            currentUser={currentUser}
            profileForm={profileForm}
            onProfileFormChange={setProfileForm}
            onSaveProfile={handleSaveProfile}
            onOpenKycModal={() => setKycModalOpen(true)}
          />
        )}
      </main>

      <KycDocumentModal
        isOpen={kycModalOpen}
        kycDocType={kycDocType}
        kycDocNumber={kycDocNumber}
        onDocTypeChange={setKycDocType}
        onDocNumberChange={setKycDocNumber}
        onClose={() => setKycModalOpen(false)}
        onSubmit={handleKycSubmit}
      />

      <EditListingModal
        editingListing={editingListing}
        editTitleError={editTitleError}
        onChangeListing={setEditingListing}
        onClearTitleError={() => setEditTitleError(null)}
        onClose={() => setEditingListing(null)}
        onSubmit={handleSaveListingEdit}
      />

      {boostTargetListing && (
        <BoostAdModal
          listing={boostTargetListing}
          isOpen={!!boostTargetListing}
          onClose={() => setBoostTargetListing(null)}
          onBoostSuccess={() => setBoostTargetListing(null)}
        />
      )}

      {featureModalListing && (
        <FeatureAdModal
          listing={featureModalListing}
          isOpen={!!featureModalListing}
          onClose={() => setFeatureModalListing(null)}
          onSuccess={() => setFeatureModalListing(null)}
        />
      )}
    </div>
  );
};
