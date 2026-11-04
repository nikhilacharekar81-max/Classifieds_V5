import React from 'react';
import type { SeoContentEntry } from '@/lib/data/seoContentData';
import { Sparkles, MapPin, ShieldCheck } from 'lucide-react';
import { SeoExpandableText } from './SeoExpandableText';

interface SeoContentBlockProps {
  locationName: string;
  categoryName: string;
  categoryId: string;
  seoData?: Pick<SeoContentEntry, 'title' | 'content' | 'wordCount' | 'lastUpdated'>;
}

export const SeoContentBlock: React.FC<SeoContentBlockProps> = ({
  locationName,
  categoryName,
  seoData: propSeoData,
}) => {
  const isIndia = !locationName || locationName === 'All India' || locationName === 'India';
  const displayLocation = isIndia ? 'India' : locationName;

  const seoData = propSeoData || {
    title: `${categoryName || 'Classifieds'} in ${displayLocation} — Buy, Sell & Verified Local Directory`,
    content: `Explore verified ${categoryName || 'classified'} listings in ${displayLocation}. Connect directly with local buyers, sellers, and service providers with zero middlemen or brokerage fees on Chillyads.`,
    wordCount: 165,
    lastUpdated: 'April 2026',
  };

  return (
    <section className="my-8 border-t border-slate-200 dark:border-slate-800 pt-8 pb-4">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-slate-50 dark:bg-slate-900/60 rounded-2xl p-6 sm:p-8 border border-slate-200/80 dark:border-slate-800 shadow-sm relative overflow-hidden">
          {/* Subtle background decoration */}
          <div className="absolute -right-12 -bottom-12 w-48 h-48 bg-emerald-500/5 rounded-full blur-3xl pointer-events-none" />

          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4 pb-4 border-b border-slate-200/60 dark:border-slate-800">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-emerald-100 dark:bg-emerald-950/80 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0 shadow-xs">
                <MapPin className="w-4 h-4" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-slate-900 dark:text-white leading-snug">
                  {seoData.title}
                </h2>
                <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  <span className="font-medium text-emerald-600 dark:text-emerald-400">
                    {displayLocation} Directory
                  </span>
                  <span>•</span>
                  <span>Direct Buyers &amp; Sellers</span>
                  <span>•</span>
                  <span className="flex items-center gap-1 text-slate-600 dark:text-slate-300 font-medium">
                    <ShieldCheck className="w-3 h-3 text-emerald-500" /> Verified Directory
                  </span>
                </div>
              </div>
            </div>

            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200/60 dark:border-emerald-800/60 self-start md:self-auto shrink-0">
              <Sparkles className="w-3 h-3" />
              <span>{seoData.wordCount} Words Local Guide</span>
            </div>
          </div>

          {/* Content Body */}
          <SeoExpandableText
            content={seoData.content}
            lastUpdated={seoData.lastUpdated}
          />
        </div>
      </div>
    </section>
  );
};
