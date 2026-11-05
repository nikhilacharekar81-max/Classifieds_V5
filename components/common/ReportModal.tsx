'use client';
import React, { useState } from 'react';
import { useAppOptional } from '@/context/AppContextInstance';
import { dispatchPublicToast } from '@/components/common/ChunkErrorRecovery';
import { X, ShieldAlert, Send, AlertTriangle, Hash, UserCheck } from 'lucide-react';

export interface ReportModalProps {
  reportConfig?: { open: boolean; type: 'ad' | 'user'; targetId?: string } | null;
  onClose?: () => void;
}

export const ReportModal: React.FC<ReportModalProps> = ({ reportConfig, onClose }) => {
  const app = useAppOptional();

  const activeConfig = reportConfig !== undefined ? reportConfig : app?.reportModalConfig || null;
  const closeReportModal = onClose || app?.closeReportModal || (() => {});

  const initialType: 'listing' | 'user' = activeConfig?.type === 'user' ? 'user' : 'listing';
  const [targetType, setTargetType] = useState<'listing' | 'user'>(initialType);
  const [targetId, setTargetId] = useState<string>(activeConfig?.targetId || '');
  const adReasons = [
    { label: 'Fraud / Advance Payment Scam', key: 'fraud_scam' },
    { label: 'Prohibited / Illegal Goods or Counterfeit', key: 'prohibited_item' },
    { label: 'Misleading Price / Category Clickbait', key: 'wrong_category' },
    { label: 'Duplicate Listing', key: 'duplicate' },
    { label: 'Offensive Content / Harassment', key: 'offensive' },
    { label: 'Other Safety Concern', key: 'spam' },
  ];

  const userReasons = [
    { label: 'User Asking for Advance Token via UPI', key: 'fraud_scam' },
    { label: 'Sending Phishing / Fake Links in Chat', key: 'fraud_scam' },
    { label: 'Abusive Language / Threats / Harassment', key: 'offensive' },
    { label: 'Impersonating Army / Defense Personnel', key: 'fraud_scam' },
    { label: 'Repeated Spam Messaging', key: 'spam' },
  ];

  const activeReasons = targetType === 'listing' ? adReasons : userReasons;
  const [reason, setReason] = useState<string>(adReasons[0].key);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const cleanId =
      targetId.trim() || (targetType === 'listing' ? 'ad_unspecified' : 'usr_unspecified');
    const displayTitle = targetType === 'listing' ? `Ad ID: ${cleanId}` : `User ID: ${cleanId}`;

    try {
      if (app?.submitReport) {
        await app.submitReport({
          targetType,
          targetId: cleanId,
          targetTitle: displayTitle,
          reason,
          comments,
        });
      } else {
        const res = await fetch('/api/reports', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            targetType,
            targetId: cleanId,
            targetTitle: displayTitle,
            reason,
            notes: comments || 'User submitted report',
          }),
        });

        if (!res.ok) {
          const errData = await res.json().catch(() => ({}));
          throw new Error(errData.error || `Failed to submit report (HTTP ${res.status})`);
        }

        dispatchPublicToast({
          type: 'success',
          title: 'Safety Report Submitted',
          message: `Thank you. Our Trust & Safety team has received your report for ${displayTitle}.`,
        });
        closeReportModal();
      }
    } catch (err: any) {
      dispatchPublicToast({
        type: 'error',
        title: 'Report Submission Failed',
        message: err.message || 'Unable to submit report. Please try again.',
      });
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-sm p-4 overflow-y-auto animate-fade-in font-sans">
      <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-lg w-full shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden my-auto">
        {/* Header */}
        <div className="p-5 border-b border-slate-200 dark:border-slate-800 bg-red-50/50 dark:bg-red-950/20 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-red-100 dark:bg-red-900/50 text-red-600 dark:text-red-400">
              <ShieldAlert className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white">
                {targetType === 'listing' ? 'Report Suspicious Ad' : 'Report Fraudulent User'}
              </h2>
              <p className="text-[11px] text-slate-500">
                Submit report to Chillyads 24/7 Moderation &amp; Trust Team
              </p>
            </div>
          </div>

          <button
            onClick={closeReportModal}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4 text-xs">
          {/* Target Type Selector */}
          <div className="flex items-center gap-2 p-1 bg-slate-100 dark:bg-slate-800 rounded-xl">
            <button
              type="button"
              onClick={() => {
                setTargetType('listing');
                setTargetId('');
                setReason(adReasons[0].key);
              }}
              className={`flex-1 py-2 rounded-lg font-bold transition text-center min-h-[44px] ${
                targetType === 'listing'
                  ? 'bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-sm'
                  : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              Report an Ad
            </button>
            <button
              type="button"
              onClick={() => {
                setTargetType('user');
                setTargetId('');
                setReason(userReasons[0].key);
              }}
              className={`flex-1 py-2 rounded-lg font-bold transition text-center min-h-[44px] ${
                targetType === 'user'
                  ? 'bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-sm'
                  : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              Report a User / Seller
            </button>
          </div>

          {/* Blank Text Input Field for Ad ID or User ID */}
          <div>
            <label className="block font-bold mb-1 text-slate-800 dark:text-slate-200">
              {targetType === 'listing' ? 'Enter Ad ID *' : 'Enter User ID *'}
            </label>
            <div className="relative">
              {targetType === 'listing' ? (
                <Hash className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
              ) : (
                <UserCheck className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
              )}
              <input
                type="text"
                required
                placeholder={
                  targetType === 'listing'
                    ? 'Type Ad ID (e.g. lst_1001, 1002, or Ad ID)...'
                    : 'Type User ID (e.g. usr_101, 202, or Seller ID)...'
                }
                value={targetId}
                onChange={(e) => setTargetId(e.target.value)}
                className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-semibold text-slate-900 dark:text-white placeholder:text-slate-400 focus:ring-2 focus:ring-blue-500 min-h-[44px]"
              />
            </div>
            <p className="text-[10px] text-slate-400 mt-1">
              {targetType === 'listing'
                ? 'Enter the specific Ad ID or listing reference number you wish to report.'
                : 'Enter the User ID or Seller account reference you wish to report.'}
            </p>
          </div>

          {/* Reason Dropdown */}
          <div>
            <label className="block font-bold mb-1 text-slate-800 dark:text-slate-200">
              Reason for Report *
            </label>
            <select
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 p-2.5 text-xs text-slate-800 dark:text-slate-200 font-semibold min-h-[44px]"
            >
              {activeReasons.map((r, i) => (
                <option key={i} value={r.key}>
                  {r.label}
                </option>
              ))}
            </select>
          </div>

          {/* Comments */}
          <div>
            <label className="block font-bold mb-1 text-slate-800 dark:text-slate-200">
              Detailed Description / Incident Notes *
            </label>
            <textarea
              rows={3}
              required
              placeholder="Describe what happened (e.g., seller asked for advance token payment via UPI or sent suspicious link in chat)..."
              value={comments}
              onChange={(e) => setComments(e.target.value)}
              className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 p-2.5 text-xs text-slate-800 dark:text-slate-200"
            />
          </div>

          <div className="p-3 bg-amber-50 dark:bg-amber-950/30 rounded-xl border border-amber-200 dark:border-amber-800/50 flex items-start gap-2 text-amber-800 dark:text-amber-300 text-[11px]">
            <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <p>
              False reporting violates Chillyads Terms of Service. Reports are logged along with IP
              address for security.
            </p>
          </div>

          {/* Buttons */}
          <div className="flex items-center justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={closeReportModal}
              className="px-4 py-2.5 rounded-xl text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 font-semibold min-h-[44px]"
            >
              Cancel
            </button>

            <button
              type="submit"
              className="px-5 py-2.5 bg-red-600 hover:bg-red-700 text-white font-bold rounded-xl shadow-md flex items-center gap-1.5 transition min-h-[44px]"
            >
              <Send className="w-3.5 h-3.5" /> Submit Report
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
