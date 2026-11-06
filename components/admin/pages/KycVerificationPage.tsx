'use client';
import React, { useEffect, useState } from 'react';
import { useApp } from '@/context/AppContext';
import {
  ArrowLeft,
  ShieldCheck,
  CheckCircle2,
  XCircle,
  AlertCircle,
  FileText,
  Calendar,
  MapPin,
  Mail,
  Phone,
} from 'lucide-react';
import { Badge } from '@/components/common/Badge';
import { navigateTo } from '@/lib/router/useRouter';
import { UserAccount } from '@/lib/types';

interface KycVerificationPageProps {
  userId: string;
}

export const KycVerificationPage: React.FC<KycVerificationPageProps> = ({ userId }) => {
  const { users, verifyUserKyc } = useApp();
  const contextUser = users.find((u) => u.id === userId);
  const [fetchedUser, setFetchedUser] = useState<UserAccount | null>(null);
  const [loading, setLoading] = useState<boolean>(!contextUser?.kycDocument);
  const [reviewNotes, setReviewNotes] = useState<string>('');

  useEffect(() => {
    let active = true;
    setLoading(true);
    fetch(`/api/admin/users/${encodeURIComponent(userId)}`, { cache: 'no-store' })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (!active) return;
        if (data && data.id) {
          setFetchedUser(data);
          if ((data.kycDocument as any)?.rejectionReason) {
            setReviewNotes((data.kycDocument as any).rejectionReason);
          }
        }
        setLoading(false);
      })
      .catch(() => {
        if (!active) return;
        setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [userId]);

  const user = fetchedUser || contextUser;

  if (loading && (!user || !user.kycDocument)) {
    return (
      <div className="p-8 max-w-xl mx-auto text-center space-y-4">
        <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto" />
        <p className="text-xs font-semibold text-slate-500">Loading persisted KYC submission...</p>
      </div>
    );
  }

  if (!user || !user.kycDocument) {
    return (
      <div className="p-8 max-w-xl mx-auto text-center space-y-4">
        <div className="w-14 h-14 bg-amber-100 text-amber-600 rounded-2xl flex items-center justify-center mx-auto">
          <AlertCircle className="w-7 h-7" />
        </div>
        <h2 className="text-lg font-bold text-slate-900 dark:text-white">
          No KYC Document Found for User #{userId}
        </h2>
        <p className="text-xs text-slate-500">
          The requested user account does not have a pending government identity document.
        </p>
        <button
          onClick={() => navigateTo('/admin/users/verification')}
          className="px-4 py-2 bg-blue-600 text-white text-xs font-semibold rounded-xl shadow"
        >
          Return to Verification Queue
        </button>
      </div>
    );
  }

  const kyc = user.kycDocument;

  const handleApprove = () => {
    verifyUserKyc(user.id, 'verified', reviewNotes.trim() || 'Verified by administrator');
    navigateTo('/admin/users/verification');
  };

  const handleReject = () => {
    verifyUserKyc(
      user.id,
      'rejected',
      reviewNotes.trim() || 'Document did not pass compliance verification'
    );
    navigateTo('/admin/users/verification');
  };

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6 animate-in fade-in duration-150">
      {/* Top Breadcrumbs & Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200 dark:border-slate-800">
        <div>
          <div className="flex items-center gap-2 text-xs text-slate-500 mb-1">
            <button
              onClick={() => navigateTo('/admin/users/verification')}
              className="hover:text-blue-600 flex items-center gap-1 font-medium"
            >
              <ArrowLeft className="w-3.5 h-3.5" /> Back to Verification Queue
            </button>
            <span>/</span>
            <span>KYC Inspection</span>
          </div>
          <h1 className="text-xl font-bold text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
            <span>Government KYC Document Verification</span>
            <Badge variant="warning">{kyc.type} CARD</Badge>
          </h1>
        </div>

        <span className="text-xs font-mono bg-slate-100 dark:bg-slate-800 text-slate-500 px-3 py-1 rounded-lg">
          URL: #/admin/users/kyc/{user.id}
        </span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column (5 cols): User Details & Metadata */}
        <div className="lg:col-span-5 space-y-6">
          {/* User Profile Card */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 shadow-sm space-y-4">
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Applicant Profile
            </h2>

            <div className="flex items-center gap-3">
              <img
                src={user.avatar}
                alt={user.name}
                className="w-14 h-14 rounded-full object-cover border-2 border-slate-200 shrink-0"
              />
              <div>
                <div className="font-bold text-base text-slate-900 dark:text-white flex items-center gap-1.5">
                  <span>{user.name}</span>
                  {user.kycStatus === 'verified' && (
                    <ShieldCheck className="w-4 h-4 text-blue-500" />
                  )}
                </div>
                <div className="text-xs text-slate-500 capitalize">
                  Account Type: {user.type}
                </div>
                <span className="text-[10px] font-mono text-slate-400">User ID: #{user.id}</span>
              </div>
            </div>

            <div className="pt-3 border-t border-slate-100 dark:border-slate-800 space-y-2 text-xs text-slate-600 dark:text-slate-300">
              <div className="flex items-center gap-2">
                <Mail className="w-4 h-4 text-slate-400" />
                <span>{user.email}</span>
              </div>
              <div className="flex items-center gap-2">
                <Phone className="w-4 h-4 text-slate-400" />
                <span>{user.phone}</span>
              </div>
              <div className="flex items-center gap-2">
                <MapPin className="w-4 h-4 text-slate-400" />
                <span>
                  {user.location.city}, {user.location.state}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-slate-400" />
                <span>Registered: {user.joinedDate}</span>
              </div>
            </div>
          </div>

          {/* Document Metadata */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 shadow-sm space-y-3 text-xs">
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Document Parameters
            </h2>

            <div className="grid grid-cols-2 gap-3">
              <div className="bg-slate-50 dark:bg-slate-800 p-3 rounded-xl border border-slate-200 dark:border-slate-700">
                <span className="text-slate-400 block text-[10px] uppercase font-bold">
                  Document Type
                </span>
                <span className="font-bold text-slate-800 dark:text-white mt-0.5 block">
                  {kyc.type}
                </span>
              </div>
              <div className="bg-slate-50 dark:bg-slate-800 p-3 rounded-xl border border-slate-200 dark:border-slate-700">
                <span className="text-slate-400 block text-[10px] uppercase font-bold">
                  Masked Document ID
                </span>
                <span className="font-mono font-bold text-slate-800 dark:text-white mt-0.5 block">
                  {kyc.docNumber}
                </span>
              </div>
              <div className="bg-slate-50 dark:bg-slate-800 p-3 rounded-xl border border-slate-200 dark:border-slate-700">
                <span className="text-slate-400 block text-[10px] uppercase font-bold">
                  Submission Date
                </span>
                <span className="text-slate-700 dark:text-slate-300 mt-0.5 block">
                  {kyc.submittedAt}
                </span>
              </div>
              <div className="bg-slate-50 dark:bg-slate-800 p-3 rounded-xl border border-slate-200 dark:border-slate-700">
                <span className="text-slate-400 block text-[10px] uppercase font-bold">
                  Current Status
                </span>
                <span className="text-amber-600 font-bold mt-0.5 block uppercase">
                  {user.kycStatus}
                </span>
              </div>
            </div>
          </div>

          {/* Verification Actions */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 shadow-sm space-y-3">
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Moderation Decision
            </h2>
            <p className="text-xs text-slate-500">
              Ensure photo matches, legal name matches registration, and document number is valid.
            </p>

            <div>
              <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-300 mb-1">
                Review Notes / Rejection Reason
              </label>
              <textarea
                rows={2}
                value={reviewNotes}
                onChange={(e) => setReviewNotes(e.target.value)}
                placeholder="Optional note on approval, or reason for rejection..."
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-200"
              />
            </div>

            <div className="flex flex-col sm:flex-row gap-3 pt-2">
              <button
                onClick={handleReject}
                className="flex-1 py-2.5 px-4 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-1.5 shadow transition-all"
              >
                <XCircle className="w-4 h-4" />
                <span>Reject KYC</span>
              </button>

              <button
                onClick={handleApprove}
                className="flex-1 py-2.5 px-4 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-1.5 shadow transition-all"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>Verify & Grant Blue Tick</span>
              </button>
            </div>
          </div>
        </div>

        {/* Right Column (7 cols): Document High-Res Scan */}
        <div className="lg:col-span-7 space-y-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 shadow-sm space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-2">
                <FileText className="w-4 h-4 text-blue-500" />
                Uploaded Government ID Document Scan
              </h2>
              <span className="text-xs text-slate-500 font-mono">{kyc.type} Scan</span>
            </div>

            <div className="bg-slate-950 rounded-xl overflow-hidden border border-slate-200 dark:border-slate-700 max-h-[500px] flex items-center justify-center p-2">
              <img
                src={kyc.fileUrl}
                alt="Government KYC Document Scan"
                className="max-h-[480px] w-full object-contain rounded-lg"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
