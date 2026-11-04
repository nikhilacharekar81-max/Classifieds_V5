'use client';
import React from 'react';
import { Mail, CheckCircle2, Clock, Sparkles } from 'lucide-react';
import { EmailLog, Listing, UserAccount } from '@/lib/types';

interface EmailNotificationsTabProps {
  currentUser: UserAccount;
  userEmails: EmailLog[];
  listings: Listing[];
  onFeatureListingModal: (listing: Listing) => void;
}

export const EmailNotificationsTab: React.FC<EmailNotificationsTabProps> = ({
  currentUser,
  userEmails,
  listings,
  onFeatureListingModal,
}) => {
  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm space-y-4">
      <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
        <div>
          <h3 className="text-base font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
            <Mail className="w-5 h-5 text-blue-600" />
            <span>Email Notifications & Ad Approval Alerts</span>
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Official emails dispatched to <strong className="text-slate-700 dark:text-slate-300">{currentUser.email}</strong> regarding ad approvals, featured opportunities, and system notices.
          </p>
        </div>
        <span className="px-3 py-1 bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-300 font-extrabold text-xs rounded-full border border-blue-200 dark:border-blue-800">
          {userEmails.length} Email{userEmails.length === 1 ? '' : 's'}
        </span>
      </div>

      {userEmails.length === 0 ? (
        <div className="text-center py-12 space-y-3">
          <Mail className="w-12 h-12 text-slate-300 dark:text-slate-700 mx-auto" />
          <h4 className="text-sm font-bold text-slate-800 dark:text-slate-200">No Email Logs Yet</h4>
          <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto">
            When you submit a new ad and an admin reviews it, you will receive an instant approval notification email right here!
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {userEmails.map((email) => {
            const targetListing = listings.find((l) => l.id === email.listingId);
            const isApprovalEmail = email.type === 'ad_approved' || email.subject.toLowerCase().includes('approved');

            return (
              <div
                key={email.id}
                className={`p-5 rounded-2xl border transition-all space-y-3 ${
                  isApprovalEmail
                    ? 'bg-gradient-to-r from-emerald-500/5 via-amber-500/5 to-transparent border-emerald-200 dark:border-emerald-900/60'
                    : 'bg-slate-50/70 dark:bg-slate-800/50 border-slate-200 dark:border-slate-800'
                }`}
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200/60 dark:border-slate-700/60 pb-3">
                  <div className="flex items-center gap-2">
                    {isApprovalEmail ? (
                      <span className="p-1.5 rounded-lg bg-emerald-100 text-emerald-800 dark:bg-emerald-900/60 dark:text-emerald-300 shrink-0">
                        <CheckCircle2 className="w-4 h-4" />
                      </span>
                    ) : (
                      <span className="p-1.5 rounded-lg bg-blue-100 text-blue-800 dark:bg-blue-900/60 dark:text-blue-300 shrink-0">
                        <Mail className="w-4 h-4" />
                      </span>
                    )}
                    <h4 className="text-sm font-extrabold text-slate-900 dark:text-white leading-snug">
                      {email.subject}
                    </h4>
                  </div>
                  <div className="flex items-center gap-2 text-[11px] text-slate-500 dark:text-slate-400 shrink-0">
                    <Clock className="w-3.5 h-3.5" />
                    <span>{email.sentAt}</span>
                    <span className="px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 text-[10px] font-bold uppercase">
                      {email.status}
                    </span>
                  </div>
                </div>

                <div className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed whitespace-pre-line font-normal">
                  {email.body}
                </div>

                {/* FEATURE YOUR AD ACTION IN APPROVAL EMAIL */}
                {(isApprovalEmail || email.actionLabel) && (
                  <div className="mt-3 p-4 rounded-xl bg-gradient-to-r from-amber-400/20 via-yellow-400/10 to-transparent border border-amber-300 dark:border-amber-700 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-2xs">
                    <div className="space-y-0.5">
                      <div className="text-xs font-black text-amber-950 dark:text-amber-300 flex items-center gap-1.5">
                        <Sparkles className="w-4 h-4 fill-amber-500 text-amber-600" />
                        <span>⭐ Featured Ad Promotion Available!</span>
                      </div>
                      <p className="text-[11px] text-slate-600 dark:text-slate-300">
                        Promote this approved listing to the top of search results for maximum buyer calls and inquiries.
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        if (targetListing) {
                          onFeatureListingModal(targetListing);
                        } else {
                          const matched = listings.find((l) => l.sellerId === currentUser.id);
                          if (matched) onFeatureListingModal(matched);
                        }
                      }}
                      className="px-4 py-2 bg-gradient-to-r from-amber-400 via-amber-500 to-yellow-400 hover:from-amber-500 hover:to-yellow-500 text-slate-950 font-black text-xs rounded-xl shadow-md transition-all flex items-center gap-1.5 cursor-pointer shrink-0"
                    >
                      <Sparkles className="w-3.5 h-3.5 fill-slate-950" />
                      <span>{email.actionLabel || '⭐ Feature Your Ad Now'}</span>
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
