'use client';

import React, { useState } from 'react';
import { Search, Loader2 } from 'lucide-react';
import { navigateTo, useNavigationFeedback } from '@/lib/router/useRouter';

export interface HeroSearchBarProps {
  effectiveCity: string;
  initialSearch?: string;
  onSearchChange?: (q: string) => void;
}

export const HeroSearchBar: React.FC<HeroSearchBarProps> = ({
  effectiveCity,
  initialSearch = '',
  onSearchChange,
}) => {
  const [localSearch, setLocalSearch] = useState(initialSearch);
  const currentSearch = onSearchChange ? initialSearch : localSearch;

  const handleSearchChange = (q: string) => {
    if (onSearchChange) {
      onSearchChange(q);
    } else {
      setLocalSearch(q);
    }
  };

  const { isUrlPending } = useNavigationFeedback();
  const isSpecificCity =
    Boolean(effectiveCity) &&
    effectiveCity !== 'All India' &&
    effectiveCity !== 'All Cities';
  const searchUrl = `/search?q=${encodeURIComponent(currentSearch)}`;

  return (
    <div className="flex max-w-2xl bg-white rounded-lg p-1.5 shadow-lg">
      <div className="flex-1 flex items-center pl-3">
        <Search className="w-4 h-4 text-[#5f6368] shrink-0" />
        <input
          type="text"
          value={currentSearch}
          onChange={(e) => handleSearchChange(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              navigateTo(searchUrl);
            }
          }}
          placeholder={`Search any service, car, apartment, or mobile in ${
            isSpecificCity ? effectiveCity : 'India'
          }...`}
          className="w-full px-3 py-2 text-sm text-[#202124] placeholder:text-[#5f6368] focus:outline-none font-medium"
        />
      </div>
      <button
        type="button"
        onClick={() => navigateTo(searchUrl)}
        className="px-6 py-2.5 bg-[#1dbf73] hover:bg-[#19a463] text-white font-bold text-sm rounded-md transition-colors cursor-pointer shrink-0 flex items-center gap-1.5"
      >
        {isUrlPending(searchUrl) && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
        <span>Search</span>
      </button>
    </div>
  );
};
