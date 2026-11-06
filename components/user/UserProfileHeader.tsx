'use client';
import React from 'react';
import {
  User,
  Plus,
  ArrowLeft,
  ShieldCheck,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Mail,
  Phone,
  MapPin,
} from 'lucide-react';
import { UserAccount, Listing } from '@/lib/types';
import { navigateTo } from '@/lib/router/useRouter';

interface UserProfileHeaderProps {
  users: UserAccount[];
  activeUserId: string;
  currentUser: UserAccount;
  userListings: Listing[];
  totalSellerAdsCount?: number;
  activeUserApprovedListingsCount: number | null;
  quotaStatus?: 'loading' | 'loaded' | 'unavailable';
  freeQuotaLimit: number;
  isQuotaExceeded: boolean;
  onSelectUser: (userId: string) => void;
  onOpenKycModal: () => void;
}

export const UserProfileHeader: React.FC<UserProfileHeaderProps> = ({
  users,
  activeUserId,
  currentUser,
  userListings,
  totalSellerAdsCount,
  activeUserApprovedListingsCount,
  quotaStatus = 'loaded',
  freeQuotaLimit,
  isQuotaExceeded,
  onSelectUser,
  onOpenKycModal,
}) => {
  const isQuotaLoading = quotaStatus === 'loading';
  const isQuotaUnavailable =
    quotaStatus === 'unavailable' || activeUserApprovedListingsCount === null;
  return (
    <>
      {/* Top Header Navigation */}
      <header className="bg-slate-900 text-white border-b border-slate-800 sticky top-0 z-30 shadow-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigateTo('/')}
              className="flex items-center gap-1.5 text-xs font-bold text-emerald-400 hover:text-emerald-300 bg-slate-800 px-3 py-1.5 rounded-lg border border-slate-700 transition-colors cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Back to Live Site</span>
            </button>
            <div className="h-4 w-[1px] bg-slate-800" />
            <h1 className="text-base font-extrabold tracking-tight flex items-center gap-2">
              <User className="w-4 h-4 text-amber-400" />
              <span>User Dashboard & Listing Manager</span>
            </h1>
          </div>

          <div className="flex items-center gap-3">
            {/* User Account Switcher (For Testing & Demo) */}
            <div className="flex items-center gap-2 bg-slate-800 px-3 py-1.5 rounded-lg border border-slate-700 text-xs">
              <span className="text-slate-400 font-medium">Switch User:</span>
              <select
                value={activeUserId}
                onChange={(e) => onSelectUser(e.target.value)}
                className="bg-transparent text-white font-bold text-xs focus:outline-none cursor-pointer"
              >
                {users.map((u) => (
                  <option key={u.id} value={u.id} className="bg-slate-900 text-white">
                    {u.name} ({u.type.toUpperCase()}) - {u.location.city}
                  </option>
                ))}
              </select>
            </div>

            <button
              onClick={() => navigateTo('/post')}
              className="px-4 py-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black rounded-lg text-xs flex items-center gap-1.5 shadow transition-all cursor-pointer"
            >
              <Plus className="w-4 h-4 stroke-[3]" /> Post New Ad
            </button>
          </div>
        </div>
      </header>

      {/* User Profile Banner Header */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 pt-6">
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            <div className="relative">
              <img
                src={currentUser.avatar}
                alt={currentUser.name}
                className="w-20 h-20 rounded-2xl object-cover ring-4 ring-slate-100 dark:ring-slate-800 shadow"
              />
              <span className="absolute -bottom-1 -right-1 p-1 bg-blue-600 text-white rounded-lg shadow" title="Verified Seller">
                <ShieldCheck className="w-3.5 h-3.5" />
              </span>
            </div>

            <div className="space-y-1">
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-xl font-extrabold text-slate-900 dark:text-white">{currentUser.name}</h2>
                <span className="text-[10px] font-extrabold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
                  {currentUser.type} Account
                </span>

                {currentUser.kycStatus === 'verified' && (
                  <span className="text-[10px] font-extrabold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3 text-emerald-600" /> KYC Verified Seller
                  </span>
                )}

                {currentUser.kycStatus === 'pending' && (
                  <span className="text-[10px] font-extrabold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-200 dark:border-amber-800 flex items-center gap-1">
                    <Clock className="w-3 h-3 text-amber-600" /> KYC Pending Review
                  </span>
                )}

                {currentUser.kycStatus === 'unsubmitted' && (
                  <button
                    onClick={onOpenKycModal}
                    className="text-[10px] font-extrabold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-rose-50 text-rose-700 hover:bg-rose-100 dark:bg-rose-950/60 dark:text-rose-300 border border-rose-200 dark:border-rose-800 flex items-center gap-1 cursor-pointer transition-colors"
                  >
                    <AlertTriangle className="w-3 h-3 text-rose-600" /> Complete KYC Verification
                  </button>
                )}
              </div>

              <div className="flex items-center gap-4 text-xs text-slate-500 dark:text-slate-400 flex-wrap">
                <span className="flex items-center gap-1">
                  <Mail className="w-3.5 h-3.5 text-slate-400" /> {currentUser.email}
                </span>
                <span className="flex items-center gap-1">
                  <Phone className="w-3.5 h-3.5 text-slate-400" /> {currentUser.phone}
                </span>
                <span className="flex items-center gap-1">
                  <MapPin className="w-3.5 h-3.5 text-slate-400" /> {currentUser.location.city}, {currentUser.location.state}
                </span>
              </div>
            </div>
          </div>

          {/* Quick Metrics */}
          <div className="flex items-center gap-3 w-full md:w-auto overflow-x-auto pb-1 md:pb-0">
            <div className="bg-slate-50 dark:bg-slate-800/60 px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700/80 text-center min-w-[90px]">
              <div className="text-lg font-black text-slate-900 dark:text-white">
                {totalSellerAdsCount !== undefined ? totalSellerAdsCount : userListings.length}
              </div>
              <div className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">Total Ads</div>
            </div>

            <div className="bg-slate-50 dark:bg-slate-800/60 px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700/80 text-center min-w-[90px]">
              <div className="text-lg font-black text-emerald-600 dark:text-emerald-400">
                {isQuotaLoading
                  ? '...'
                  : isQuotaUnavailable
                  ? '—'
                  : activeUserApprovedListingsCount}
              </div>
              <div className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">Active Live</div>
            </div>

            {/* Freemium Volume Quota Box */}
            <div
              className={`px-4 py-2.5 rounded-xl border text-center min-w-[125px] ${
                isQuotaLoading || isQuotaUnavailable
                  ? 'bg-slate-50 dark:bg-slate-800/60 border-slate-300 dark:border-slate-700'
                  : isQuotaExceeded
                  ? 'bg-amber-50/90 dark:bg-amber-950/40 border-amber-300 dark:border-amber-800'
                  : 'bg-emerald-50/90 dark:bg-emerald-950/40 border-emerald-300 dark:border-emerald-800'
              }`}
            >
              <div className="text-lg font-black tracking-tight flex items-center justify-center gap-1">
                <span
                  className={
                    isQuotaLoading || isQuotaUnavailable
                      ? 'text-slate-600 dark:text-slate-300'
                      : isQuotaExceeded
                      ? 'text-amber-700 dark:text-amber-300'
                      : 'text-emerald-700 dark:text-emerald-300'
                  }
                >
                  {isQuotaLoading
                    ? `... / ${freeQuotaLimit}`
                    : isQuotaUnavailable
                    ? `— / ${freeQuotaLimit}`
                    : `${activeUserApprovedListingsCount} / ${freeQuotaLimit}`}
                </span>
              </div>
              <div className="text-[10px] font-extrabold uppercase tracking-wider text-slate-600 dark:text-slate-400">
                {isQuotaLoading
                  ? 'Checking Quota'
                  : isQuotaUnavailable
                  ? 'Quota Unavailable'
                  : 'Free Quota'}
              </div>
            </div>

            <div className="bg-slate-50 dark:bg-slate-800/60 px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700/80 text-center min-w-[90px]">
              <div className="text-lg font-black text-blue-600 dark:text-blue-400">
                {userListings.reduce((sum, l) => sum + l.views, 0)}
              </div>
              <div className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">Total Views</div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};
