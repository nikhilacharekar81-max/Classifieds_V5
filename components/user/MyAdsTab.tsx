'use client';
import React from 'react';
import {
  ShoppingBag,
  Heart,
  MessageSquare,
  Plus,
  Edit3,
  Trash2,
  CheckCircle2,
  AlertTriangle,
  ExternalLink,
  Eye,
  MapPin,
  Sparkles,
  Rocket,
  Search,
  AlertCircle,
  RotateCcw,
  Layers,
  Star,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { Listing } from '@/lib/types';
import { Badge } from '@/components/common/Badge';
import { navigateTo } from '@/lib/router/useRouter';
import { isListingBoosted, formatBoostTimeRemaining } from '@/lib/utils/boostHelper';

interface MyAdsTabProps {
  userListings: Listing[];
  filteredUserListings: Listing[];
  activeUserApprovedListingsCount: number;
  freeQuotaLimit: number;
  extraListingFeeRate: number;
  isQuotaExceeded: boolean;
  freeQuotaSlotsRemaining: number;
  adStatusFilter: 'all' | 'approved' | 'pending' | 'expired' | 'sold' | 'rejected';
  adSearchQuery: string;
  onStatusFilterChange: (status: 'all' | 'approved' | 'pending' | 'expired' | 'sold' | 'rejected') => void;
  onSearchQueryChange: (q: string) => void;
  onEditListing: (listing: Listing) => void;
  onRenewListing: (id: string, days: number) => void;
  onMarkAsSold: (id: string) => void;
  onFeatureListingModal: (listing: Listing) => void;
  onBoostListingModal: (listing: Listing) => void;
  onDeleteListing: (id: string) => void;
  currentPage?: number;
  totalPages?: number;
  totalListings?: number;
  pageSize?: number;
  onPageChange?: (page: number) => void;
  isLoading?: boolean;
  statusCounts?: {
    all: number;
    approved: number;
    pending: number;
    expired: number;
    sold: number;
    rejected: number;
  };
}

export const MyAdsTab: React.FC<MyAdsTabProps> = ({
  userListings,
  filteredUserListings,
  activeUserApprovedListingsCount,
  freeQuotaLimit,
  extraListingFeeRate,
  isQuotaExceeded,
  freeQuotaSlotsRemaining,
  adStatusFilter,
  adSearchQuery,
  onStatusFilterChange,
  onSearchQueryChange,
  onEditListing,
  onRenewListing,
  onMarkAsSold,
  onFeatureListingModal,
  onBoostListingModal,
  onDeleteListing,
  currentPage = 1,
  totalPages = 1,
  totalListings = 0,
  pageSize = 10,
  onPageChange,
  isLoading = false,
  statusCounts,
}) => {
  return (
    <div className="space-y-4">
      {/* Freemium Volume Quota Policy Banner */}
      <div
        className={`p-4 rounded-xl border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs shadow-xs ${
          isQuotaExceeded
            ? 'bg-amber-50/90 border-amber-300 text-amber-950 dark:bg-amber-950/40 dark:border-amber-800 dark:text-amber-200'
            : 'bg-emerald-50/90 border-emerald-300 text-emerald-950 dark:bg-emerald-950/40 dark:border-emerald-800 dark:text-emerald-200'
        }`}
      >
        <div className="flex items-center gap-3">
          <div className={`p-2.5 rounded-xl text-white shrink-0 ${isQuotaExceeded ? 'bg-amber-500' : 'bg-emerald-600'}`}>
            <Layers className="w-5 h-5" />
          </div>
          <div>
            <div className="font-extrabold flex items-center gap-2 flex-wrap">
              <span>
                Freemium Active Ads Quota: {activeUserApprovedListingsCount} of {freeQuotaLimit} Free Active Ads Used
              </span>
              <span
                className={`px-2.5 py-0.5 rounded-full text-[10px] uppercase font-black tracking-wider ${
                  isQuotaExceeded ? 'bg-amber-200 text-amber-950' : 'bg-emerald-200 text-emerald-950'
                }`}
              >
                {isQuotaExceeded
                  ? '⚡ Free Quota Reached'
                  : `✓ ${freeQuotaSlotsRemaining} Free Slot${freeQuotaSlotsRemaining === 1 ? '' : 's'} Remaining`}
              </span>
            </div>
            <p className="text-[11px] text-slate-700 dark:text-slate-300 mt-1">
              {isQuotaExceeded
                ? `You have reached your baseline quota of ${freeQuotaLimit} free active listings. Publishing additional ads will incur a volume quota fee of ₹${extraListingFeeRate}/ad.`
                : `Your account includes a baseline of ${freeQuotaLimit} free active ad listings. You can post ${freeQuotaSlotsRemaining} more ad${freeQuotaSlotsRemaining === 1 ? '' : 's'} for free.`}
            </p>
          </div>
        </div>

        <button
          onClick={() => navigateTo('/post')}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-xs transition-all shrink-0 cursor-pointer flex items-center gap-1.5 shadow-sm hover:scale-102"
        >
          <Plus className="w-4 h-4" />
          <span>Post New Ad</span>
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-2 overflow-x-auto w-full sm:w-auto">
          {[
            { id: 'all', label: 'All Ads', count: statusCounts ? statusCounts.all : userListings.length },
            { id: 'approved', label: 'Active Live', count: statusCounts ? statusCounts.approved : userListings.filter((l) => l.status === 'approved').length },
            { id: 'pending', label: 'Pending Review', count: statusCounts ? statusCounts.pending : userListings.filter((l) => l.status === 'pending').length },
            { id: 'expired', label: 'Expired Ads', count: statusCounts ? statusCounts.expired : userListings.filter((l) => l.status === 'expired').length },
            { id: 'sold', label: 'Archived Sold', count: statusCounts ? statusCounts.sold : userListings.filter((l) => l.status === 'sold').length },
            { id: 'rejected', label: 'Rejected', count: statusCounts ? statusCounts.rejected : userListings.filter((l) => l.status === 'rejected').length },
          ].map((btn) => (
            <button
              key={btn.id}
              onClick={() => onStatusFilterChange(btn.id as any)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                adStatusFilter === btn.id
                  ? 'bg-slate-900 text-white dark:bg-blue-600 dark:text-white shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:hover:bg-slate-700'
              }`}
            >
              {btn.label} ({btn.count})
            </button>
          ))}
        </div>

        <div className="relative w-full sm:w-64">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            value={adSearchQuery}
            onChange={(e) => onSearchQueryChange(e.target.value)}
            placeholder="Search my ads..."
            className="w-full text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 pl-8 pr-3 py-1.5 focus:outline-none"
          />
        </div>
      </div>

      {/* Ads List Grid */}
      {filteredUserListings.length === 0 ? (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-12 text-center space-y-3">
          <ShoppingBag className="w-12 h-12 text-slate-300 dark:text-slate-700 mx-auto" />
          <h3 className="text-base font-bold text-slate-800 dark:text-slate-200">No Ads Found</h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto">
            You do not have any listings under this filter state. Create a new listing to start receiving buyers!
          </p>
          <button
            onClick={() => navigateTo('/post')}
            className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-extrabold rounded-xl text-xs inline-flex items-center gap-2 transition-colors cursor-pointer"
          >
            <Plus className="w-4 h-4 stroke-[3]" /> Post Your Ad Now
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredUserListings.map((listing) => (
            <div
              key={listing.id}
              className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-sm hover:shadow-md transition-all flex flex-col md:flex-row items-start md:items-center justify-between gap-4"
            >
              <div className="flex items-start gap-4 flex-1">
                <img
                  src={listing.images[0] || 'https://images.unsplash.com/photo-1581092160607-ee22621dd758?auto=format&fit=crop&w=400&q=80'}
                  alt={listing.title}
                  className="w-24 h-24 rounded-xl object-cover ring-1 ring-slate-200 dark:ring-slate-800 shrink-0"
                />

                <div className="space-y-1.5">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="text-base font-extrabold text-slate-900 dark:text-white leading-tight">
                      {listing.title}
                    </h3>

                    {listing.status === 'approved' && <Badge variant="success" size="sm">Active Live</Badge>}
                    {listing.status === 'pending' && <Badge variant="warning" size="sm">Pending Approval</Badge>}
                    {listing.status === 'sold' && <Badge variant="neutral" size="sm">Sold</Badge>}
                    {listing.status === 'expired' && <Badge variant="danger" size="sm">Expired</Badge>}
                    {listing.status === 'rejected' && <Badge variant="danger" size="sm">Rejected</Badge>}

                    {listing.isFeatured && (
                      <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded bg-amber-400 text-slate-950 flex items-center gap-1">
                        <Sparkles className="w-3 h-3 fill-slate-950" /> Featured Ad
                      </span>
                    )}

                    {isListingBoosted(listing) && (
                      <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded bg-gradient-to-r from-violet-600 via-indigo-600 to-blue-600 text-white flex items-center gap-1 shadow-xs">
                        <Rocket className="w-3 h-3 text-amber-300 fill-amber-300" /> Boosted ({formatBoostTimeRemaining(listing.boostExpiresAt)})
                      </span>
                    )}
                  </div>

                  <div className="text-base font-black text-blue-600 dark:text-blue-400">
                    ₹{listing.price.toLocaleString('en-IN')}
                  </div>

                  <div className="flex items-center gap-4 text-xs text-slate-500 dark:text-slate-400 flex-wrap">
                    <span className="flex items-center gap-1">
                      <MapPin className="w-3.5 h-3.5" /> {listing.location.city}, {listing.location.locality}
                    </span>
                    <span>• Posted: {listing.createdAt}</span>
                    <span>• Expires: {listing.expiresAt}</span>
                  </div>

                  {listing.status === 'expired' && (
                    <div className="bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-200 border border-amber-200 dark:border-amber-900 p-2.5 rounded-xl text-xs font-semibold flex items-center justify-between gap-2 mt-1">
                      <div className="flex items-center gap-2">
                        <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
                        <span>Your ad has expired. Please renew it for free to restore live visibility!</span>
                      </div>
                      <button
                        onClick={() => onRenewListing(listing.id, 30)}
                        className="px-3 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-bold text-xs flex items-center gap-1 shrink-0 transition-colors shadow-xs cursor-pointer"
                      >
                        <RotateCcw className="w-3.5 h-3.5" /> Renew Free
                      </button>
                    </div>
                  )}

                  {listing.rejectionReason && (
                    <div className="bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 p-2 rounded-lg text-xs font-semibold flex items-center gap-2 mt-1">
                      <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                      <span>Rejection Note: {listing.rejectionReason}</span>
                    </div>
                  )}

                  {/* Engagement Stats */}
                  <div className="flex items-center gap-4 pt-1 text-xs text-slate-600 dark:text-slate-400 font-medium">
                    <span className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded">
                      <Eye className="w-3.5 h-3.5 text-blue-500" /> {listing.views} Views
                    </span>
                    <span className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded">
                      <Heart className="w-3.5 h-3.5 text-rose-500" /> {listing.likes} Favorites
                    </span>
                    <span className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded">
                      <MessageSquare className="w-3.5 h-3.5 text-emerald-500" /> {listing.chatsCount} Buyer Enquiries
                    </span>
                  </div>
                </div>
              </div>

              {/* Listing Action Controls */}
              <div className="flex flex-wrap items-center gap-2 w-full md:w-auto shrink-0 border-t md:border-t-0 border-slate-100 dark:border-slate-800 pt-3 md:pt-0">
                <button
                  onClick={() => navigateTo(`/mumbai_g1/item/${listing.id}`)}
                  className="p-2 text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white bg-slate-100 dark:bg-slate-800 rounded-lg text-xs font-bold transition-colors cursor-pointer flex items-center gap-1"
                  title="View Live Ad"
                >
                  <ExternalLink className="w-4 h-4" />
                  <span className="md:hidden">View</span>
                </button>

                <button
                  onClick={() => onEditListing(listing)}
                  className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer shadow-xs"
                >
                  <Edit3 className="w-3.5 h-3.5" />
                  <span>Edit Ad</span>
                </button>

                {listing.status === 'expired' && (
                  <button
                    onClick={() => onRenewListing(listing.id, 30)}
                    className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-extrabold flex items-center gap-1.5 transition-colors cursor-pointer shadow-xs"
                    title="Renew Ad for Free (+30 Days)"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>Renew For Free</span>
                  </button>
                )}

                {listing.status === 'approved' && (
                  <button
                    onClick={() => onMarkAsSold(listing.id)}
                    className="px-3 py-1.5 bg-slate-800 hover:bg-slate-900 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Mark Sold</span>
                  </button>
                )}

                {listing.isFeatured ? (
                  <button
                    onClick={() => onFeatureListingModal(listing)}
                    className="px-3.5 py-1.5 bg-amber-100 hover:bg-amber-200 text-amber-950 dark:bg-amber-950/80 dark:text-amber-200 dark:hover:bg-amber-900 border border-amber-300 dark:border-amber-700 rounded-lg text-xs font-black flex items-center gap-1.5 transition-colors cursor-pointer shadow-2xs"
                    title="Ad is Featured - Click to extend featured duration"
                  >
                    <Star className="w-3.5 h-3.5 fill-amber-500 text-amber-600" />
                    <span>⭐ Featured (Extend)</span>
                  </button>
                ) : (
                  <button
                    onClick={() => onFeatureListingModal(listing)}
                    className="px-3.5 py-1.5 bg-gradient-to-r from-amber-400 via-amber-500 to-yellow-400 hover:from-amber-500 hover:to-yellow-500 text-slate-950 rounded-lg text-xs font-black flex items-center gap-1.5 transition-all cursor-pointer shadow-xs hover:shadow-md hover:scale-102"
                    title="Feature your ad at top search positions for up to 10x buyer leads"
                  >
                    <Sparkles className="w-3.5 h-3.5 fill-slate-950" />
                    <span>⭐ Feature Ad</span>
                  </button>
                )}

                {listing.status === 'approved' &&
                  (isListingBoosted(listing) ? (
                    <div className="px-3 py-1.5 bg-violet-50 dark:bg-violet-950/40 border border-violet-200 dark:border-violet-800 text-violet-700 dark:text-violet-300 rounded-lg text-xs font-bold flex items-center gap-1.5 shadow-xs">
                      <Rocket className="w-3.5 h-3.5 text-violet-600 animate-pulse" />
                      <span>Boost Active</span>
                    </div>
                  ) : (
                    <button
                      onClick={() => onBoostListingModal(listing)}
                      className="px-3 py-1.5 bg-gradient-to-r from-violet-600 via-indigo-600 to-blue-600 hover:from-violet-700 hover:to-blue-700 text-white rounded-lg text-xs font-black flex items-center gap-1.5 transition-all cursor-pointer shadow-md hover:shadow-lg"
                      title="Boost ad to appear near the top of relevant listings"
                    >
                      <Rocket className="w-3.5 h-3.5 text-amber-300" />
                      <span>Boost to Top</span>
                    </button>
                  ))}

                <button
                  onClick={() => onDeleteListing(listing.id)}
                  className="p-2 text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-lg transition-colors cursor-pointer"
                  title="Delete Listing"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Server-Side Pagination Controls */}
      {totalPages > 1 && onPageChange && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
          <div className="text-slate-500 dark:text-slate-400">
            Showing <span className="font-semibold text-slate-800 dark:text-slate-200">{Math.min((currentPage - 1) * pageSize + 1, totalListings)}</span> to{' '}
            <span className="font-semibold text-slate-800 dark:text-slate-200">{Math.min(currentPage * pageSize, totalListings)}</span> of{' '}
            <span className="font-semibold text-slate-800 dark:text-slate-200">{totalListings}</span> ads
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={currentPage <= 1 || isLoading}
              onClick={() => onPageChange(Math.max(1, currentPage - 1))}
              className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 disabled:opacity-40 hover:bg-slate-50 dark:hover:bg-slate-700 font-medium transition-colors flex items-center gap-1 cursor-pointer disabled:cursor-not-allowed"
            >
              <ChevronLeft className="w-4 h-4" />
              <span>Previous</span>
            </button>
            <span className="px-2 font-semibold text-slate-700 dark:text-slate-300">
              Page {currentPage} of {totalPages}
            </span>
            <button
              type="button"
              disabled={currentPage >= totalPages || isLoading}
              onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))}
              className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 disabled:opacity-40 hover:bg-slate-50 dark:hover:bg-slate-700 font-medium transition-colors flex items-center gap-1 cursor-pointer disabled:cursor-not-allowed"
            >
              <span>Next</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
