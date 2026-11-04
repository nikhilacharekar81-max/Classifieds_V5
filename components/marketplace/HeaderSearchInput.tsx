'use client';

import React, { useState, useEffect } from 'react';
import { Search, Loader2 } from 'lucide-react';
import { navigateTo, useNavigationFeedback } from '@/lib/router/useRouter';

const HEADER_SEARCH_SYNC_EVENT = 'chilly_header_search_sync';

export interface HeaderSearchInputProps {
  effectiveSearch?: string;
  onSearchChange?: (q: string) => void;
  variant: 'desktop' | 'mobile';
}

export const HeaderSearchInput: React.FC<HeaderSearchInputProps> = ({
  effectiveSearch = '',
  onSearchChange,
  variant,
}) => {
  const [localSearch, setLocalSearch] = useState(effectiveSearch);
  const [prevEffectiveSearch, setPrevEffectiveSearch] = useState(effectiveSearch);

  if (effectiveSearch !== prevEffectiveSearch) {
    setPrevEffectiveSearch(effectiveSearch);
    setLocalSearch(effectiveSearch);
  }

  useEffect(() => {
    if (onSearchChange) return;
    const handleSync = (event: Event) => {
      const customEvent = event as CustomEvent<string>;
      if (typeof customEvent.detail === 'string') {
        setLocalSearch(customEvent.detail);
      }
    };
    window.addEventListener(HEADER_SEARCH_SYNC_EVENT, handleSync);
    return () => window.removeEventListener(HEADER_SEARCH_SYNC_EVENT, handleSync);
  }, [onSearchChange]);

  const currentSearch = onSearchChange ? effectiveSearch : localSearch;
  const handleSearchChange = (q: string) => {
    if (onSearchChange) {
      onSearchChange(q);
    } else {
      setLocalSearch(q);
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent<string>(HEADER_SEARCH_SYNC_EVENT, { detail: q }));
      }
    }
  };

  const { isUrlPending } = useNavigationFeedback();
  const searchTargetUrl = `/search?q=${encodeURIComponent(currentSearch)}`;
  const isSearchPending = isUrlPending(searchTargetUrl);

  if (variant === 'mobile') {
    return (
      <div className="sm:hidden mt-3 flex">
        <input
          type="text"
          value={currentSearch}
          onChange={(e) => handleSearchChange(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              navigateTo(searchTargetUrl);
            }
          }}
          placeholder="Find services, cars, mobiles, properties..."
          className="w-full text-xs rounded-l-md border border-r-0 border-[#dadce0] pl-3.5 pr-3 py-2.5 focus:outline-none placeholder:text-[#5f6368] font-medium bg-[#f8f9fa]"
        />
        <button
          type="button"
          onClick={() => navigateTo(searchTargetUrl)}
          className="px-4 bg-[#1dbf73] text-white rounded-r-md flex items-center justify-center hover:bg-[#19a463] transition-colors cursor-pointer"
        >
          {isSearchPending ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Search className="w-4 h-4" />
          )}
        </button>
      </div>
    );
  }

  return (
    <div className="hidden sm:flex flex-1 max-w-xl relative">
      <input
        type="text"
        value={currentSearch}
        onChange={(e) => handleSearchChange(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            navigateTo(searchTargetUrl);
          }
        }}
        placeholder="What service, vehicle, or property are you looking for today?"
        className="w-full text-xs rounded-l-md border border-r-0 border-[#dadce0] pl-4 pr-4 py-2.5 focus:outline-none focus:border-[#202124] placeholder:text-[#5f6368] font-medium text-[#202124]"
      />
      <button
        type="button"
        onClick={() => navigateTo(searchTargetUrl)}
        className="px-4 bg-[#1dbf73] hover:bg-[#19a463] text-white rounded-r-md flex items-center justify-center transition-colors cursor-pointer shrink-0"
        title="Search Marketplace"
      >
        {isSearchPending ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : (
          <Search className="w-4 h-4" />
        )}
      </button>
    </div>
  );
};
