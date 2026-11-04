'use client';
import React, { useState } from 'react';
import { useAppOptional } from '@/context/AppContextInstance';
import { dispatchPublicToast } from '@/components/common/ChunkErrorRecovery';
import {
  X,
  Award,
  ShieldCheck,
  FileCode,
  Copy,
  Check,
  ExternalLink,
  Building2,
  Mail,
} from 'lucide-react';

export interface EeatSchemaModalProps {
  isOpen?: boolean;
  onClose?: () => void;
  onOpenCmsPage?: (slug: string) => void;
}

export const EeatSchemaModal: React.FC<EeatSchemaModalProps> = ({
  isOpen,
  onClose,
  onOpenCmsPage,
}) => {
  const app = useAppOptional();

  const isEeatModalOpen = isOpen !== undefined ? isOpen : app?.isEeatModalOpen || false;
  const closeEeatModal = onClose || app?.closeEeatModal || (() => {});
  const openCmsPageModal = onOpenCmsPage || app?.openCmsPageModal || (() => {});

  const [copied, setCopied] = useState(false);

  if (!isEeatModalOpen) return null;

  const jsonLdSchema = {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: 'Chillyads Marketplace India Pvt Ltd',
    url: 'https://www.chillyads.com',
    logo: 'https://www.chillyads.com/logo.png',
    publishingPrinciples: 'https://www.chillyads.com/editorial-guidelines',
    correctionsPolicy: 'https://www.chillyads.com/corrections-policy',
    knowsAbout: [
      'Classified Advertisements',
      'Used Vehicles & Automobiles',
      'Local Jobs & Employment',
      'Home Services & Technicians',
      'Electronics & Mobile Phones',
      'Real Estate & Property',
    ],
    contactPoint: {
      '@type': 'ContactPoint',
      email: 'support@chillyads.com',
      contactType: 'customer support',
      availableLanguage: ['en', 'hi'],
    },
  };

  const handleCopySchema = () => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(JSON.stringify(jsonLdSchema, null, 2));
      setCopied(true);
      if (app?.addToast) {
        app.addToast({
          type: 'success',
          title: 'JSON-LD Schema Copied',
          message: 'Organization Schema snippet copied to clipboard.',
        });
      } else {
        dispatchPublicToast({
          type: 'success',
          title: 'JSON-LD Schema Copied',
          message: 'Organization Schema snippet copied to clipboard.',
        });
      }
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/75 backdrop-blur-sm p-4 overflow-y-auto animate-fade-in font-sans">
      <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-2xl w-full shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden my-auto">
        {/* Header */}
        <div className="p-5 border-b border-slate-200 dark:border-slate-800 bg-gradient-to-r from-blue-900 via-indigo-900 to-slate-900 text-white flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-white/10 text-yellow-400 shrink-0 backdrop-blur-sm">
              <Award className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-white">
                  E-E-A-T Publisher Credentials &amp; Schema
                </h2>
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-yellow-400 text-slate-900 uppercase">
                  Verified Grade
                </span>
              </div>
              <p className="text-[11px] text-slate-300 mt-0.5">
                Google Search Quality Evaluator Guidelines &amp; Structured Data Graph
              </p>
            </div>
          </div>

          <button
            onClick={closeEeatModal}
            className="p-1.5 rounded-xl text-slate-300 hover:text-white hover:bg-white/10 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-5 text-xs text-slate-600 dark:text-slate-300 max-h-[60vh] overflow-y-auto">
          {/* Rating Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
            <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
              <span className="text-xs font-bold text-blue-600 dark:text-blue-400 block uppercase">
                Experience
              </span>
              <span className="text-lg font-black text-slate-900 dark:text-white">10+ Yrs</span>
              <span className="text-[10px] text-slate-400 block mt-0.5">Verified Local Ads</span>
            </div>

            <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
              <span className="text-xs font-bold text-indigo-600 dark:text-indigo-400 block uppercase">
                Expertise
              </span>
              <span className="text-lg font-black text-slate-900 dark:text-white">Domain-Led</span>
              <span className="text-[10px] text-slate-400 block mt-0.5">Automotive &amp; Tech</span>
            </div>

            <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
              <span className="text-xs font-bold text-purple-600 dark:text-purple-400 block uppercase">
                Authority
              </span>
              <span className="text-lg font-black text-slate-900 dark:text-white">
                Index Verified
              </span>
              <span className="text-[10px] text-slate-400 block mt-0.5">Schema Graph</span>
            </div>

            <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
              <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 block uppercase">
                Trust
              </span>
              <span className="text-lg font-black text-slate-900 dark:text-white">KYC 100%</span>
              <span className="text-[10px] text-slate-400 block mt-0.5">Anti-Scam AI</span>
            </div>
          </div>

          {/* Guidelines Links */}
          <div className="p-4 rounded-xl bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800/60 space-y-2">
            <h4 className="font-bold text-slate-900 dark:text-white text-xs flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-blue-600 dark:text-blue-400" />
              Publisher Transparency &amp; Editorial Governance
            </h4>
            <p className="text-[11px] leading-relaxed">
              Chillyads enforces transparent editorial guidelines, factual vehicle inspections, and
              AI price anomaly detection to protect buyers and search engine crawlers from
              fraudulent listings.
            </p>
            <div className="pt-2 flex flex-wrap gap-2 text-[11px]">
              <button
                onClick={() => {
                  closeEeatModal();
                  openCmsPageModal('editorial-guidelines');
                }}
                className="px-3 py-1.5 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg font-semibold text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1 min-h-[44px]"
              >
                Editorial Guidelines <ExternalLink className="w-3 h-3" />
              </button>
              <button
                onClick={() => {
                  closeEeatModal();
                  openCmsPageModal('corrections-policy');
                }}
                className="px-3 py-1.5 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg font-semibold text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1 min-h-[44px]"
              >
                Corrections Policy <ExternalLink className="w-3 h-3" />
              </button>
            </div>
          </div>

          {/* Live JSON-LD View */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                <FileCode className="w-4 h-4 text-purple-500" />
                Live JSON-LD Schema Graph (
                <code className="text-purple-600">@type: Organization</code>)
              </span>

              <button
                onClick={handleCopySchema}
                className="px-2.5 py-1 text-[11px] font-semibold bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-300 rounded-lg transition flex items-center gap-1 min-h-[44px]"
              >
                {copied ? (
                  <Check className="w-3.5 h-3.5 text-emerald-500" />
                ) : (
                  <Copy className="w-3.5 h-3.5" />
                )}
                {copied ? 'Copied' : 'Copy JSON'}
              </button>
            </div>

            <pre className="p-3 bg-slate-900 text-slate-100 rounded-xl text-[10px] font-mono overflow-x-auto border border-slate-800 leading-relaxed max-h-48">
              {JSON.stringify(jsonLdSchema, null, 2)}
            </pre>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 flex items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-3 text-slate-500 text-[11px]">
            <span className="flex items-center gap-1">
              <Building2 className="w-3.5 h-3.5 text-slate-400" /> Gurugram, India
            </span>
            <span className="flex items-center gap-1">
              <Mail className="w-3.5 h-3.5 text-slate-400" /> support@chillyads.com
            </span>
          </div>

          <button
            onClick={closeEeatModal}
            className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow transition min-h-[48px] min-w-[100px] flex items-center justify-center"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
