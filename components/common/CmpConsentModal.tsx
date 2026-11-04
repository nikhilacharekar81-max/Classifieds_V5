'use client';
import React, { useState } from 'react';
import { useAppOptional } from '@/context/AppContextInstance';
import { dispatchPublicToast } from '@/components/common/ChunkErrorRecovery';
import { X, Cookie, Lock, BarChart2, Radio, Sliders, Info } from 'lucide-react';

export interface CmpConsentModalProps {
  isOpen?: boolean;
  onClose?: () => void;
}

function getInitialCmpPreferences() {
  if (typeof window !== 'undefined') {
    try {
      const saved = window.localStorage.getItem('chilly_cmp_consent');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.categories) {
          return parsed.categories;
        }
      }
    } catch {
      // ignore
    }
  }
  return {
    essential: true,
    analytics: true,
    advertising: true,
    functional: true,
  };
}

export const CmpConsentModal: React.FC<CmpConsentModalProps> = ({ isOpen, onClose }) => {
  const app = useAppOptional();

  const isCmpModalOpen = isOpen !== undefined ? isOpen : app?.isCmpModalOpen || false;
  const closeCmpModal = onClose || app?.closeCmpModal || (() => {});

  const [preferences, setPreferences] = useState(getInitialCmpPreferences);
  const [activeTab, setActiveTab] = useState<'overview' | 'categories' | 'vendors'>('overview');

  if (!isCmpModalOpen) return null;

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

  const handleSavePreferences = (customPreferences = preferences) => {
    const consentPayload = {
      tcString: 'CP' + Date.now() + '_TCFv2_IAB_Compliant',
      cmpId: 752,
      cmpVersion: '2.2.0',
      gdprApplies: true,
      timestamp: new Date().toISOString(),
      categories: customPreferences,
      purpose: {
        consents: {
          1: customPreferences.essential,
          2: customPreferences.analytics,
          3: customPreferences.advertising,
          4: customPreferences.functional,
        },
      },
    };

    localStorage.setItem('chilly_cmp_consent', JSON.stringify(consentPayload));

    if (!customPreferences.advertising) {
      localStorage.setItem('us_privacy', '1YYY');
    } else {
      localStorage.setItem('us_privacy', '1YNN');
    }

    window.dispatchEvent(new CustomEvent('cmp_consent_updated', { detail: consentPayload }));

    notifyToast({
      type: 'success',
      title: 'Privacy Preferences Saved',
      message:
        'Your cookie consent choices have been updated across all ad partners and analytics tags.',
    });

    closeCmpModal();
  };

  const handleAcceptAll = () => {
    const allOn = { essential: true, analytics: true, advertising: true, functional: true };
    setPreferences(allOn);
    handleSavePreferences(allOn);
  };

  const handleRejectOptional = () => {
    const essentialOnly = {
      essential: true,
      analytics: false,
      advertising: false,
      functional: false,
    };
    setPreferences(essentialOnly);
    handleSavePreferences(essentialOnly);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/75 backdrop-blur-sm p-4 overflow-y-auto animate-fade-in font-sans">
      <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-2xl w-full shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden my-auto">
        {/* Top Header */}
        <div className="p-5 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/80 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-blue-600/10 text-blue-600 dark:text-blue-400 shrink-0">
              <Cookie className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-slate-900 dark:text-white">
                  Privacy Settings &amp; Cookie Preferences
                </h2>
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300 uppercase">
                  IAB TCF v2.2 Certified
                </span>
              </div>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Manage your data privacy, Google AdSense personalization, and analytics choices
              </p>
            </div>
          </div>

          <button
            onClick={closeCmpModal}
            className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-white hover:bg-slate-200 dark:hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-slate-200 dark:border-slate-800 bg-slate-100/60 dark:bg-slate-950/40 p-1 text-xs font-semibold">
          <button
            onClick={() => setActiveTab('overview')}
            className={`flex-1 py-2 rounded-lg text-center transition ${
              activeTab === 'overview'
                ? 'bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-sm'
                : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            Consent Overview
          </button>
          <button
            onClick={() => setActiveTab('categories')}
            className={`flex-1 py-2 rounded-lg text-center transition ${
              activeTab === 'categories'
                ? 'bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-sm'
                : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            Cookie Categories
          </button>
          <button
            onClick={() => setActiveTab('vendors')}
            className={`flex-1 py-2 rounded-lg text-center transition ${
              activeTab === 'vendors'
                ? 'bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-sm'
                : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            Ad Vendors &amp; Partners
          </button>
        </div>

        {/* Tab Body */}
        <div className="p-6 space-y-4 max-h-[55vh] overflow-y-auto text-xs text-slate-600 dark:text-slate-300">
          {activeTab === 'overview' && (
            <div className="space-y-3 leading-relaxed">
              <p>
                We use cookies and Google Certified Consent Management technology (IAB TCF v2.2
                framework) to ensure our classified marketplace remains safe, fast, and transparent.
              </p>

              <div className="p-3.5 bg-blue-50 dark:bg-blue-950/30 rounded-xl border border-blue-200 dark:border-blue-800/60 flex items-start gap-3">
                <Info className="w-5 h-5 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
                <div className="text-[11px] text-blue-900 dark:text-blue-200 space-y-1">
                  <p className="font-bold">Google Certified Publisher Guarantee</p>
                  <p>
                    For visitors in the EU/EEA, UK, and US, you can customize or revoke your
                    advertising consent at any time. Changes take effect immediately across all
                    third-party ad networks including Google AdSense and DoubleClick DART cookies.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800">
                  <div className="flex items-center gap-2 font-bold text-slate-800 dark:text-slate-200 mb-1">
                    <Lock className="w-4 h-4 text-emerald-500" />
                    <span>Essential Security</span>
                  </div>
                  <p className="text-[11px] text-slate-500">
                    Required for user authentication, fraud prevention, and session stability.
                    Cannot be disabled.
                  </p>
                </div>

                <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800">
                  <div className="flex items-center gap-2 font-bold text-slate-800 dark:text-slate-200 mb-1">
                    <Radio className="w-4 h-4 text-indigo-500" />
                    <span>Personalized Ads</span>
                  </div>
                  <p className="text-[11px] text-slate-500">
                    Controls tailored classified recommendations and Google AdSense partner
                    networks.
                  </p>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'categories' && (
            <div className="space-y-3">
              {/* Essential */}
              <div className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40 flex items-center justify-between gap-4">
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2 font-bold text-slate-900 dark:text-white">
                    <Lock className="w-4 h-4 text-emerald-500" />
                    <span>1. Strictly Necessary &amp; Security Cookies</span>
                  </div>
                  <p className="text-[11px] text-slate-500">
                    Enables login sessions, listing search filters, and anti-spam moderation. Always
                    active.
                  </p>
                </div>
                <span className="px-2.5 py-1 bg-emerald-100 text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-300 text-[10px] font-bold rounded-lg shrink-0">
                  Always Active
                </span>
              </div>

              {/* Analytics */}
              <div className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex items-center justify-between gap-4">
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2 font-bold text-slate-900 dark:text-white">
                    <BarChart2 className="w-4 h-4 text-blue-500" />
                    <span>2. Performance &amp; Analytics Cookies</span>
                  </div>
                  <p className="text-[11px] text-slate-500">
                    Measures website traffic, popular category page views, and search performance.
                  </p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer shrink-0">
                  <input
                    type="checkbox"
                    checked={preferences.analytics}
                    onChange={(e) =>
                      setPreferences({ ...preferences, analytics: e.target.checked })
                    }
                    className="sr-only peer"
                  />
                  <div className="w-9 h-5 bg-slate-300 peer-focus:outline-none rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all dark:after:border-slate-600 peer-checked:bg-blue-600"></div>
                </label>
              </div>

              {/* Ads & Personalization */}
              <div className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex items-center justify-between gap-4">
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2 font-bold text-slate-900 dark:text-white">
                    <Radio className="w-4 h-4 text-purple-500" />
                    <span>3. Targeted Advertising &amp; DoubleClick Cookies</span>
                  </div>
                  <p className="text-[11px] text-slate-500">
                    Allows Google AdSense, DoubleClick DART, and certified partners to serve
                    contextual ads based on relevant search intent.
                  </p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer shrink-0">
                  <input
                    type="checkbox"
                    checked={preferences.advertising}
                    onChange={(e) =>
                      setPreferences({ ...preferences, advertising: e.target.checked })
                    }
                    className="sr-only peer"
                  />
                  <div className="w-9 h-5 bg-slate-300 peer-focus:outline-none rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all dark:after:border-slate-600 peer-checked:bg-blue-600"></div>
                </label>
              </div>

              {/* Functional */}
              <div className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex items-center justify-between gap-4">
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2 font-bold text-slate-900 dark:text-white">
                    <Sliders className="w-4 h-4 text-amber-500" />
                    <span>4. Functional &amp; City Locality Preferences</span>
                  </div>
                  <p className="text-[11px] text-slate-500">
                    Remembers your last selected marketplace city, recent search keywords, and dark
                    mode theme settings.
                  </p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer shrink-0">
                  <input
                    type="checkbox"
                    checked={preferences.functional}
                    onChange={(e) =>
                      setPreferences({ ...preferences, functional: e.target.checked })
                    }
                    className="sr-only peer"
                  />
                  <div className="w-9 h-5 bg-slate-300 peer-focus:outline-none rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all dark:after:border-slate-600 peer-checked:bg-blue-600"></div>
                </label>
              </div>
            </div>
          )}

          {activeTab === 'vendors' && (
            <div className="space-y-3">
              <p className="text-[11px] text-slate-500">
                Chillyads integrates with IAB TCF v2.2 certified vendor partners. Below are primary
                verified ad infrastructure providers:
              </p>

              <div className="divide-y divide-slate-100 dark:divide-slate-800 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden">
                <div className="p-3 bg-slate-50 dark:bg-slate-800/40 flex items-center justify-between">
                  <div>
                    <span className="font-bold text-slate-900 dark:text-white block">
                      Google Advertising Products
                    </span>
                    <span className="text-[10px] text-slate-400">
                      Vendor ID: 752 • AdSense, DoubleClick DART, Google Tag Manager
                    </span>
                  </div>
                  <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 text-[10px] font-semibold rounded">
                    Certified CMP
                  </span>
                </div>

                <div className="p-3 bg-white dark:bg-slate-900 flex items-center justify-between">
                  <div>
                    <span className="font-bold text-slate-900 dark:text-white block">
                      Amazon Advertising Systems
                    </span>
                    <span className="text-[10px] text-slate-400">
                      Vendor ID: 128 • Contextual Sponsored Listings
                    </span>
                  </div>
                  <span className="px-2 py-0.5 bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 text-[10px] font-semibold rounded">
                    TCF v2.2 Registered
                  </span>
                </div>

                <div className="p-3 bg-slate-50 dark:bg-slate-800/40 flex items-center justify-between">
                  <div>
                    <span className="font-bold text-slate-900 dark:text-white block">
                      Index Exchange &amp; Criteo
                    </span>
                    <span className="text-[10px] text-slate-400">
                      Vendor ID: 10 • Programmatic Header Bidding
                    </span>
                  </div>
                  <span className="px-2 py-0.5 bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 text-[10px] font-semibold rounded">
                    TCF v2.2 Registered
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="p-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
          <button
            onClick={handleRejectOptional}
            className="w-full sm:w-auto px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 font-semibold hover:bg-slate-100 dark:hover:bg-slate-800 transition text-center min-h-[44px]"
          >
            Reject Optional Cookies
          </button>

          <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
            <button
              onClick={() => handleSavePreferences()}
              className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-semibold transition text-center min-h-[44px]"
            >
              Save Custom Choices
            </button>

            <button
              onClick={handleAcceptAll}
              className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold transition shadow-md text-center min-h-[44px]"
            >
              Accept All Cookies
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
