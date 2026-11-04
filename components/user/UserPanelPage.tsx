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
  const [kycFileData, setKycFileData] = useState<string | null>(null);

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
  const [sellerTotal, setSellerTotal] = useState<number>(0);
  const [sellerPage, setSellerPage] = useState<number>(1);
  const [sellerPageSize] = useState<number>(10);
  const [sellerStatusCounts, setSellerStatusCounts] = useState<{
    all: number;
    approved: number;
    pending: number;
    expired: number;
    sold: number;
    rejected: number;
  }>({
    all: 0,
    approved: 0,
    pending: 0,
    expired: 0,
    sold: 0,
    rejected: 0,
  });
  const [loadingSellerListings, setLoadingSellerListings] = useState(false);

  const fetchSellerListings = React.useCallback(
    async (
      sellerId: string,
      page = sellerPage,
      status = adStatusFilter,
      search = adSearchQuery,
      limit = sellerPageSize
    ) => {
      setLoadingSellerListings(true);
      try {
        const params = new URLSearchParams();
        params.set('sellerId', sellerId);
        params.set('status', status);
        if (search.trim()) {
          params.set('search', search.trim());
        }
        params.set('limit', String(limit));
        params.set('offset', String(Math.max(0, (page - 1) * limit)));

        const res = await fetch(`/api/listings?${params.toString()}`);
        if (res.ok) {
          const data = await res.json();
          if (Array.isArray(data.items)) {
            setSellerListings(data.items);
            const total = typeof data.total === 'number' ? data.total : data.items.length;
            setSellerTotal(total);
            if (data.statusCounts) {
              setSellerStatusCounts(data.statusCounts);
            }
            return { total, items: data.items };
          }
        }
        return null;
      } catch (err) {
        console.error('Failed to fetch seller listings:', err);
        return null;
      } finally {
        setLoadingSellerListings(false);
      }
    },
    [sellerPage, adStatusFilter, adSearchQuery, sellerPageSize]
  );

  React.useEffect(() => {
    if (currentUser?.id) {
      fetchSellerListings(currentUser.id, sellerPage, adStatusFilter, adSearchQuery);
    }
  }, [currentUser?.id, sellerPage, adStatusFilter, adSearchQuery, fetchSellerListings]);

  const handleStatusFilterChange = (status: 'all' | 'approved' | 'pending' | 'expired' | 'sold' | 'rejected') => {
    setAdStatusFilter(status);
    setSellerPage(1);
  };

  const handleSearchQueryChange = (q: string) => {
    setAdSearchQuery(q);
    setSellerPage(1);
  };

  const userListings = sellerListings !== null
    ? sellerListings
    : currentUser?.id
      ? listings.filter((l) => l.sellerId === currentUser.id)
      : [];
  const activeUserApprovedListingsCount = sellerStatusCounts.approved || userListings.filter((l) => l.status === 'approved').length;
  const freeQuotaLimit = settings.freeListingsLimit ?? 3;
  const extraListingFeeRate = settings.extraListingFee ?? 99;
  const isQuotaExceeded = activeUserApprovedListingsCount >= freeQuotaLimit;
  const freeQuotaSlotsRemaining = Math.max(0, freeQuotaLimit - activeUserApprovedListingsCount);

  // When sellerListings is populated from server-side pagination, it is already filtered and paginated
  const filteredUserListings = sellerListings !== null
    ? sellerListings
    : userListings.filter((l) => {
        if (adStatusFilter !== 'all' && l.status !== adStatusFilter) return false;
        if (adSearchQuery.trim()) {
          const q = adSearchQuery.toLowerCase();
          return l.title.toLowerCase().includes(q) || l.description.toLowerCase().includes(q);
        }
        return true;
      });

  const totalSellerAdsCount = sellerStatusCounts.all || (sellerListings !== null ? sellerTotal : userListings.length);
  const totalPages = Math.ceil(sellerTotal / sellerPageSize) || 1;

  const refreshSellerListingsAfterAction = React.useCallback(async () => {
    if (!currentUser?.id) return;
    const result = await fetchSellerListings(currentUser.id, sellerPage, adStatusFilter, adSearchQuery);
    if (result && typeof result.total === 'number') {
      const newTotal = result.total;
      const lastValidPage = Math.max(1, Math.ceil(newTotal / sellerPageSize));
      if (sellerPage > lastValidPage) {
        setSellerPage(lastValidPage);
        await fetchSellerListings(currentUser.id, lastValidPage, adStatusFilter, adSearchQuery);
      }
    }
  }, [currentUser?.id, sellerPage, adStatusFilter, adSearchQuery, sellerPageSize, fetchSellerListings]);

  const handleRenewListing = async (id: string, days?: number, isFree?: boolean) => {
    const success = await renewListing(id, days, isFree);
    if (success && currentUser?.id) {
      await refreshSellerListingsAfterAction();
    }
  };

  const handleMarkAsSold = async (id: string) => {
    const success = await markAsSold(id);
    if (success && currentUser?.id) {
      await refreshSellerListingsAfterAction();
    }
  };

  const handleDeleteListing = async (id: string) => {
    const success = await deleteListing(id);
    if (success && currentUser?.id) {
      const willBeEmptyPage = (sellerListings?.length || 0) <= 1 && sellerPage > 1;
      const targetPage = willBeEmptyPage ? sellerPage - 1 : sellerPage;
      if (willBeEmptyPage) {
        setSellerPage(targetPage);
      }
      fetchSellerListings(currentUser.id, targetPage, adStatusFilter, adSearchQuery);
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

  const handleKycSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!kycDocNumber.trim()) {
      addToast({ type: 'error', title: 'KYC Document Required', message: 'Please enter a valid document number.' });
      return;
    }

    if (!kycFileData) {
      addToast({ type: 'error', title: 'Document Scan Required', message: 'Please upload a front scan of your government ID document.' });
      return;
    }

    try {
      const res = await fetch('/api/user/kyc', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          documentType: kycDocType,
          documentNumber: kycDocNumber.trim(),
          fileUrl: kycFileData,
        }),
      });

      const data = await res.json().catch(() => null);
      if (!res.ok) {
        throw new Error(data?.error || 'Failed to submit KYC verification');
      }

      const returnedDocUrl = data?.document?.fileUrl || kycFileData;

      const updated: UserAccount = {
        ...currentUser,
        kycStatus: 'pending',
        kycDocument: {
          type: kycDocType,
          docNumber: kycDocNumber.trim(),
          submittedAt: new Date().toISOString().split('T')[0],
          fileUrl: returnedDocUrl,
        },
      };

      updateUser(updated);
      setKycModalOpen(false);
      setKycDocNumber('');
      setKycFileData(null);
      addToast({
        type: 'success',
        title: 'KYC Document Submitted',
        message: 'Your verification request has been sent for admin compliance review.',
      });
    } catch (err: any) {
      addToast({
        type: 'error',
        title: 'Submission Failed',
        message: err?.message || 'Could not submit KYC verification document.',
      });
    }
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
        fetchSellerListings(currentUser.id, sellerPage, adStatusFilter, adSearchQuery);
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
            { id: 'my-ads', label: 'My Classified Ads', icon: ShoppingBag, count: totalSellerAdsCount },
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
            onStatusFilterChange={handleStatusFilterChange}
            onSearchQueryChange={handleSearchQueryChange}
            onEditListing={(listing) => {
              setEditingListing(listing);
              setEditTitleError(null);
            }}
            onRenewListing={handleRenewListing}
            onMarkAsSold={handleMarkAsSold}
            onFeatureListingModal={setFeatureModalListing}
            onBoostListingModal={setBoostTargetListing}
            onDeleteListing={handleDeleteListing}
            currentPage={sellerPage}
            totalPages={totalPages}
            totalListings={sellerTotal}
            pageSize={sellerPageSize}
            onPageChange={setSellerPage}
            isLoading={loadingSellerListings}
            statusCounts={sellerStatusCounts}
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
        kycFileData={kycFileData}
        onDocTypeChange={setKycDocType}
        onDocNumberChange={setKycDocNumber}
        onDocFileChange={setKycFileData}
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
