'use client';
import React, { useState } from 'react';
import { useAppOptional } from '@/context/AppContextInstance';
import { dispatchPublicToast } from '@/components/common/ChunkErrorRecovery';
import { X, CheckCircle2, ShieldCheck, Lock } from 'lucide-react';

export interface UsPrivacyModalProps {
  isOpen?: boolean;
  onClose?: () => void;
}

function getInitialOptedOut(): boolean {
  if (typeof window !== 'undefined') {
    try {
      return window.localStorage.getItem('us_privacy') === '1YYY';
    } catch {
      return false;
    }
  }
  return false;
}

export const UsPrivacyModal: React.FC<UsPrivacyModalProps> = ({ isOpen, onClose }) => {
  const app = useAppOptional();

  const isUsPrivacyModalOpen =
    isOpen !== undefined ? isOpen : app?.isUsPrivacyModalOpen || false;
  const closeUsPrivacyModal = onClose || app?.closeUsPrivacyModal || (() => {});

  const [optedOut, setOptedOut] = useState<boolean>(getInitialOptedOut);

  if (!isUsPrivacyModalOpen) return null;

  const notifyToast = (toast: {
    title: string;
    message: string;
    type: 'success' | 'info' | 'warning' | 'error';
  }) => {
    if (app?.addToast) {
      app.addToast(toast);
    } else {
      dispatchPublicToast(toast);
    }
  };

  const handleToggleOptOut = (e: React.ChangeEvent<HTMLInputElement>) => {
    const isChecked = e.target.checked;
    setOptedOut(isChecked);

    const newSignal = isChecked ? '1YYY' : '1YNN';
    localStorage.setItem('us_privacy', newSignal);

    const win = window as any;
    if (typeof win.__usprivacy === 'function') {
      win.__usprivacy('setPrivacy', 1, () => {}, newSignal);
    }

    window.dispatchEvent(new CustomEvent('us_privacy_updated', { detail: { signal: newSignal } }));

    notifyToast({
      type: isChecked ? 'info' : 'success',
      title: isChecked ? 'Opt-Out Signal Applied (CPRA / CCPA)' : 'Privacy Preference Updated',
      message: isChecked
        ? 'Your "Do Not Sell or Share" signal (1YYY) was broadcast to Google AdSense & analytics partners.'
        : 'Standard personalization preferences re-enabled.',
    });
  };

  const handleConfirm = () => {
    closeUsPrivacyModal();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/75 backdrop-blur-sm p-4 overflow-y-auto animate-fade-in font-sans">
      <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-lg w-full shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden my-auto">
        {/* Header */}
        <div className="p-5 border-b border-slate-200 dark:border-slate-800 bg-blue-50/60 dark:bg-blue-950/30 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center shrink-0 shadow-md">
              <svg
                className="w-6 h-6 fill-current"
                viewBox="0 0 30 14"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path d="M7.4 12.8h6.8l3.1-11.6H10.5L7.4 12.8zm11.3 0h6.8l3.1-11.6h-6.8l-3.1 11.6zM2.8 1.2L0 12.8h4.5l2.8-11.6H2.8z" />
              </svg>
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white">
                Your Privacy Choices (CPRA / CCPA / VCDPA)
              </h2>
              <p className="text-[11px] text-slate-500">
                US State Privacy Rights &amp; Do Not Sell / Share My Information
              </p>
            </div>
          </div>

          <button
            onClick={closeUsPrivacyModal}
            className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-white hover:bg-slate-200 dark:hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4 text-xs text-slate-600 dark:text-slate-300">
          <p className="leading-relaxed">
            Under California law (CPRA / CCPA), Virginia (VCDPA), Colorado, Connecticut, and Utah
            privacy acts, residents have the explicit right to opt out of the{' '}
            <strong>&quot;sale or sharing&quot;</strong> of personal information and{' '}
            <strong>targeted cross-context behavioral advertising</strong>.
          </p>

          {/* Toggle Block */}
          <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80 space-y-3">
            <div className="flex items-center justify-between gap-4">
              <div>
                <span className="font-bold text-slate-900 dark:text-white block text-sm">
                  Opt Out of Sale / Sharing &amp; Targeted Ads
                </span>
                <span className="text-[11px] text-slate-500">
                  Broadcasts US Privacy String signal (
                  <code className="text-blue-600 font-mono font-bold">1YYY</code>) to Google Tag
                  Manager and AdSense.
                </span>
              </div>

              <label className="relative inline-flex items-center cursor-pointer shrink-0 min-h-[48px] min-w-[48px]">
                <input
                  type="checkbox"
                  checked={optedOut}
                  onChange={handleToggleOptOut}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-slate-300 peer-focus:outline-none rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:after:border-slate-600 peer-checked:bg-blue-600"></div>
              </label>
            </div>

            <div className="pt-2 border-t border-slate-200 dark:border-slate-700 flex items-center justify-between text-[11px]">
              <span className="text-slate-500">Active Technical Signal:</span>
              <span
                className={`font-mono font-bold px-2 py-0.5 rounded ${
                  optedOut
                    ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/80 dark:text-amber-300'
                    : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-300'
                }`}
              >
                {optedOut ? 'us_privacy=1YYY (OPTED OUT)' : 'us_privacy=1YNN (STANDARD)'}
              </span>
            </div>
          </div>

          <div className="space-y-2 text-[11px] text-slate-500">
            <div className="flex items-start gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
              <p>
                <strong>Global Privacy Control (GPC):</strong> Our infrastructure automatically
                honors browser-level GPC signals transmitted by compatible privacy browsers.
              </p>
            </div>
            <div className="flex items-start gap-2">
              <ShieldCheck className="w-4 h-4 text-blue-500 shrink-0 mt-0.5" />
              <p>
                <strong>No Mandatory Login:</strong> You do not need to register an account or
                provide an email address to exercise your right to opt out.
              </p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 flex items-center justify-between gap-3 text-xs">
          <span className="text-[11px] text-slate-400 flex items-center gap-1">
            <Lock className="w-3.5 h-3.5 text-slate-400" /> State Privacy Compliant
          </span>

          <button
            onClick={handleConfirm}
            className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow transition min-h-[48px] min-w-[120px] flex items-center justify-center"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
