'use client';
import React from 'react';
import { useAppOptional } from '@/context/AppContextInstance';
import { INITIAL_CMS_PAGES } from '@/lib/data/cmsPagesData';
import { dispatchPublicToast } from '@/components/common/ChunkErrorRecovery';
import { X, ShieldCheck, FileText, Calendar, Edit3, Share2, Printer } from 'lucide-react';
import { Badge } from './Badge';
import { navigateTo } from '@/lib/router/useRouter';

export interface CmsPageModalProps {
  slug?: string | null;
  onClose?: () => void;
}

export const CmsPageModal: React.FC<CmsPageModalProps> = ({ slug, onClose }) => {
  const app = useAppOptional();

  const cmsPages = app?.cmsPages || INITIAL_CMS_PAGES;
  const activeCmsPageSlug = slug !== undefined ? slug : app?.activeCmsPageSlug || null;
  const closeCmsPageModal = onClose || app?.closeCmsPageModal || (() => {});

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

  if (!activeCmsPageSlug) return null;

  const page = cmsPages.find((p) => p.slug === activeCmsPageSlug);

  if (!page) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
        <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 max-w-md w-full text-center shadow-xl border border-slate-200 dark:border-slate-800">
          <FileText className="w-12 h-12 text-slate-400 mx-auto mb-3" />
          <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-1">Page Not Found</h3>
          <p className="text-xs text-slate-500 mb-4">
            The requested page slug{' '}
            <code className="text-blue-600 font-mono">/{activeCmsPageSlug}</code> could not be
            located.
          </p>
          <button
            onClick={closeCmsPageModal}
            className="px-4 py-2 bg-slate-800 text-white text-xs font-semibold rounded-xl hover:bg-slate-700 transition"
          >
            Close Modal
          </button>
        </div>
      </div>
    );
  }

  const handleShare = () => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(window.location.origin + '/' + page.slug);
      notifyToast({
        type: 'success',
        title: 'Link Copied',
        message: `Direct link to "${page.title}" copied to clipboard.`,
      });
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const handleEditInAdmin = () => {
    closeCmsPageModal();
    app?.setViewMode?.('admin');
    navigateTo('/admin/cms');
  };

  const renderBoldText = (text: string) => {
    const parts = text.split(/(\*\*.*?\*\*)/g);
    return parts.map((part, i) => {
      if (part.startsWith('**') && part.endsWith('**')) {
        return (
          <strong key={i} className="font-bold text-slate-900 dark:text-white">
            {part.slice(2, -2)}
          </strong>
        );
      }
      return part;
    });
  };

  const renderFormattedContent = (content: string) => {
    const lines = content.split('\n');
    return lines.map((line, idx) => {
      const trimmed = line.trim();
      if (!trimmed) return <div key={idx} className="h-2" />;

      if (trimmed.startsWith('### ')) {
        return (
          <h3
            key={idx}
            className="text-lg font-bold text-slate-900 dark:text-white mt-4 mb-2 pb-1 border-b border-slate-100 dark:border-slate-800"
          >
            {trimmed.replace('### ', '')}
          </h3>
        );
      }
      if (trimmed.startsWith('#### ')) {
        return (
          <h4
            key={idx}
            className="text-sm font-bold text-slate-800 dark:text-slate-200 mt-3 mb-1.5 flex items-center gap-1.5"
          >
            <span className="w-1.5 h-1.5 rounded-full bg-blue-600 inline-block"></span>
            {trimmed.replace('#### ', '')}
          </h4>
        );
      }
      if (trimmed.startsWith('- ')) {
        const itemText = trimmed.replace('- ', '');
        return (
          <li
            key={idx}
            className="text-xs text-slate-600 dark:text-slate-300 ml-4 list-disc leading-relaxed my-0.5"
          >
            {renderBoldText(itemText)}
          </li>
        );
      }
      if (/^\d+\.\s/.test(trimmed)) {
        return (
          <div
            key={idx}
            className="text-xs font-semibold text-slate-800 dark:text-slate-200 mt-2 mb-1"
          >
            {renderBoldText(trimmed)}
          </div>
        );
      }

      return (
        <p key={idx} className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed my-1.5">
          {renderBoldText(trimmed)}
        </p>
      );
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-sm p-4 overflow-y-auto animate-fade-in">
      <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-3xl w-full max-h-[88vh] flex flex-col shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden my-auto">
        {/* Header */}
        <div className="p-5 border-b border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-900/80 flex items-start justify-between gap-4 sticky top-0 z-10 backdrop-blur-md">
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <Badge variant="info">{page.category}</Badge>
              <span className="text-[11px] text-slate-400 flex items-center gap-1 font-mono">
                <Calendar className="w-3 h-3 text-slate-400" />
                Updated: {page.updatedAt}
              </span>
            </div>
            <h2 className="text-xl font-bold text-slate-900 dark:text-white tracking-tight">
              {page.title}
            </h2>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleShare}
              title="Share Link"
              className="p-2 rounded-xl text-slate-500 hover:text-slate-700 dark:hover:text-white hover:bg-slate-200 dark:hover:bg-slate-800 transition"
            >
              <Share2 className="w-4 h-4" />
            </button>
            <button
              onClick={handlePrint}
              title="Print Page"
              className="p-2 rounded-xl text-slate-500 hover:text-slate-700 dark:hover:text-white hover:bg-slate-200 dark:hover:bg-slate-800 transition"
            >
              <Printer className="w-4 h-4" />
            </button>
            <button
              onClick={closeCmsPageModal}
              className="p-2 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-200 dark:hover:bg-slate-800 transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto space-y-3 font-sans text-slate-700 dark:text-slate-300">
          <div className="prose dark:prose-invert max-w-none">
            {renderFormattedContent(page.content)}
          </div>
        </div>

        {/* Footer actions */}
        <div className="p-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400">
            <ShieldCheck className="w-4 h-4 text-emerald-500" />
            <span>Official Chillyads Platform Documentation &amp; Policy</span>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
            <button
              onClick={handleEditInAdmin}
              className="px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition flex items-center gap-1.5 font-semibold text-[11px]"
            >
              <Edit3 className="w-3.5 h-3.5 text-blue-500" /> Edit Page in Admin
            </button>

            <button
              onClick={closeCmsPageModal}
              className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg shadow-sm transition"
            >
              Done Reading
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
