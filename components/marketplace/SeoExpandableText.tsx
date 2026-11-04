'use client';

import React, { useState } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';

export interface SeoExpandableTextProps {
  content: string;
  lastUpdated: string;
}

export const SeoExpandableText: React.FC<SeoExpandableTextProps> = ({
  content,
  lastUpdated,
}) => {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <div className="relative">
      <p
        className={`text-slate-600 dark:text-slate-300 text-sm leading-relaxed ${
          !isExpanded ? 'line-clamp-3 md:line-clamp-none' : ''
        }`}
      >
        {content}
      </p>

      {/* Mobile / Short Viewport Toggle if truncated */}
      <div className="mt-3 flex items-center justify-between">
        <button
          type="button"
          onClick={() => setIsExpanded(!isExpanded)}
          className="md:hidden inline-flex items-center gap-1 text-xs font-semibold text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 dark:hover:text-emerald-300 transition-colors"
        >
          {isExpanded ? (
            <>
              Show Less <ChevronUp className="w-3.5 h-3.5" />
            </>
          ) : (
            <>
              Read Full Local Guide <ChevronDown className="w-3.5 h-3.5" />
            </>
          )}
        </button>

        <span className="text-[11px] text-slate-400 dark:text-slate-500 ml-auto">
          Updated {lastUpdated}
        </span>
      </div>
    </div>
  );
};
