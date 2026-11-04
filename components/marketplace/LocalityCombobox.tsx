'use client';
import React, { useState, useEffect, useRef } from 'react';
import { LocationItem } from '@/lib/types';
import { MapPin, Search, Plus, Check, ChevronDown, X, Edit3, List } from 'lucide-react';

interface LocalityComboboxProps {
  city: string;
  cityId?: string;
  value: string;
  onChange: (val: string) => void;
  localities: LocationItem[];
  placeholder?: string;
}

export const LocalityCombobox: React.FC<LocalityComboboxProps> = ({
  city,
  cityId,
  value,
  onChange,
  localities,
  placeholder,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isManualInput, setIsManualInput] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Available localities for current city
  const cityLocalities = React.useMemo(() => {
    if (!city) return [];
    if (cityId) {
      return localities.filter((l) => l.parentId === cityId);
    }
    return localities.filter(
      (l) => l.parentId === 'loc_' + city.toLowerCase().replace(/[^a-z0-9]/g, '') ||
             l.parentId === 'loc_mum' && city.toLowerCase() === 'mumbai'
    );
  }, [city, cityId, localities]);

  // If city has no predefined localities, default to manual input
  useEffect(() => {
    if (cityLocalities.length === 0) {
      if (!isManualInput) setIsManualInput(true);
    } else {
      // If current value is not in cityLocalities and not empty, check if it is a custom locality
      const isPredefined = cityLocalities.some(
        (l) => l.name.toLowerCase() === value.trim().toLowerCase()
      );
      if (value && !isPredefined && !isManualInput) {
        setIsManualInput(true);
      }
    }
  }, [cityLocalities, city, value, isManualInput]);

  // Handle click outside to close dropdown
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Focus search input when dropdown opens
  useEffect(() => {
    if (isOpen && searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, [isOpen]);

  const filteredLocalities = React.useMemo(() => {
    if (!searchQuery.trim()) return cityLocalities;
    const q = searchQuery.toLowerCase().trim();
    return cityLocalities.filter((loc) => loc.name.toLowerCase().includes(q));
  }, [cityLocalities, searchQuery]);

  // Handle selecting a predefined locality
  const handleSelectPredefined = (locName: string) => {
    onChange(locName);
    setIsOpen(false);
    setSearchQuery('');
  };

  // Handle applying a custom locality
  const handleApplyCustomLocality = (customName: string) => {
    const trimmed = customName.trim();
    if (trimmed) {
      onChange(trimmed);
    }
    setIsManualInput(true);
    setIsOpen(false);
    setSearchQuery('');
  };

  return (
    <div ref={containerRef} className="relative w-full">
      {/* Label and Mode Switcher */}
      <div className="flex items-center justify-between mb-1">
        <label className="block text-xs font-semibold text-slate-700">
          Locality / Sector *
          {cityLocalities.length > 0 && !isManualInput && (
            <span className="ml-1.5 font-normal text-blue-600 text-[11px]">
              ({cityLocalities.length} in {city})
            </span>
          )}
          {isManualInput && cityLocalities.length > 0 && (
            <span className="ml-1.5 font-normal text-amber-600 text-[11px]">
              (Custom Locality)
            </span>
          )}
        </label>

        {cityLocalities.length > 0 && (
          <button
            type="button"
            onClick={() => {
              if (isManualInput) {
                setIsManualInput(false);
                setIsOpen(true);
              } else {
                setIsManualInput(true);
                setIsOpen(false);
              }
            }}
            className="text-[11px] font-medium text-blue-600 hover:text-blue-800 flex items-center gap-1 transition-colors cursor-pointer"
          >
            {isManualInput ? (
              <>
                <List className="w-3 h-3" /> Choose from list
              </>
            ) : (
              <>
                <Edit3 className="w-3 h-3" /> Enter custom
              </>
            )}
          </button>
        )}
      </div>

      {/* Mode 1: Manual Input (When city has no predefined list OR seller opts for custom entry) */}
      {isManualInput ? (
        <div className="space-y-1.5">
          <div className="relative flex items-center">
            <input
              type="text"
              value={value}
              onChange={(e) => onChange(e.target.value)}
              placeholder={placeholder || `Enter your custom locality in ${city}...`}
              className="w-full text-xs border border-slate-300 rounded-xl px-3 py-2 bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none font-medium pr-8"
              autoFocus={cityLocalities.length > 0}
            />
            {value && (
              <button
                type="button"
                onClick={() => onChange('')}
                className="absolute right-2.5 text-slate-400 hover:text-slate-600 p-0.5"
                title="Clear"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
          <p className="text-[11px] text-slate-500">
            Locality not in list? You can type your exact area, sector, or landmark above.
          </p>
        </div>
      ) : (
        /* Mode 2: Searchable Dropdown with Custom Locality Fallback */
        <div className="relative">
          {/* Selected Value Trigger */}
          <div
            onClick={() => setIsOpen(!isOpen)}
            className={`w-full flex items-center justify-between text-xs border rounded-xl px-3 py-2 bg-slate-50 hover:bg-white cursor-pointer transition-colors ${
              isOpen ? 'border-blue-500 ring-2 ring-blue-100 bg-white' : 'border-slate-300'
            }`}
          >
            <div className="flex items-center gap-2 truncate">
              <MapPin className="w-3.5 h-3.5 text-blue-600 shrink-0" />
              {value ? (
                <span className="font-semibold text-slate-800 truncate">{value}</span>
              ) : (
                <span className="text-slate-400 font-normal">
                  {placeholder || `Select locality in ${city}...`}
                </span>
              )}
            </div>
            <div className="flex items-center gap-1 shrink-0">
              {value && (
                <span
                  role="button"
                  tabIndex={0}
                  onClick={(e) => {
                    e.stopPropagation();
                    onChange('');
                  }}
                  className="p-1 hover:bg-slate-200 rounded-full text-slate-400 hover:text-slate-600"
                  title="Clear locality"
                >
                  <X className="w-3 h-3" />
                </span>
              )}
              <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${isOpen ? 'rotate-180 text-blue-600' : ''}`} />
            </div>
          </div>

          {/* Dropdown Menu */}
          {isOpen && (
            <div className="absolute z-50 left-0 right-0 mt-1 bg-white border border-slate-200 rounded-xl shadow-xl overflow-hidden animate-in fade-in slide-in-from-top-1 duration-150">
              {/* Search Box */}
              <div className="p-2 border-b border-slate-100 bg-slate-50 flex items-center gap-2">
                <Search className="w-3.5 h-3.5 text-slate-400 shrink-0 ml-1" />
                <input
                  ref={searchInputRef}
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      if (filteredLocalities.length > 0) {
                        handleSelectPredefined(filteredLocalities[0].name);
                      } else if (searchQuery.trim()) {
                        handleApplyCustomLocality(searchQuery);
                      }
                    }
                  }}
                  placeholder={`Search in ${cityLocalities.length} localities...`}
                  className="w-full text-xs bg-transparent focus:outline-none placeholder:text-slate-400 font-medium"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery('')}
                    className="p-0.5 text-slate-400 hover:text-slate-600"
                  >
                    <X className="w-3 h-3" />
                  </button>
                )}
              </div>

              {/* Localities List */}
              <div className="max-h-56 overflow-y-auto divide-y divide-slate-50">
                {filteredLocalities.length > 0 ? (
                  filteredLocalities.map((loc) => {
                    const isSelected = value.toLowerCase() === loc.name.toLowerCase();
                    return (
                      <button
                        key={loc.id}
                        type="button"
                        onClick={() => handleSelectPredefined(loc.name)}
                        className={`w-full text-left px-3 py-2 text-xs flex items-center justify-between hover:bg-blue-50/70 transition-colors cursor-pointer ${
                          isSelected ? 'bg-blue-50 text-blue-700 font-semibold' : 'text-slate-700'
                        }`}
                      >
                        <span className="truncate">{loc.name}</span>
                        {isSelected && <Check className="w-3.5 h-3.5 text-blue-600 shrink-0" />}
                        {loc.popular && !isSelected && (
                          <span className="text-[10px] font-medium text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200">
                            Popular
                          </span>
                        )}
                      </button>
                    );
                  })
                ) : (
                  /* Fallback when NOT found in dropdown */
                  <div className="p-3 text-center bg-slate-50/50">
                    <p className="text-xs text-slate-600 font-medium">
                      Locality &ldquo;{searchQuery}&rdquo; not found in list
                    </p>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      Don&apos;t worry! You can use it as your custom locality.
                    </p>
                    <button
                      type="button"
                      onClick={() => handleApplyCustomLocality(searchQuery)}
                      className="mt-2.5 w-full inline-flex items-center justify-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold shadow-xs transition-colors cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      Use &ldquo;{searchQuery}&rdquo; as my locality
                    </button>
                  </div>
                )}
              </div>

              {/* Bottom Sticky Action: Enter Custom Locality */}
              <div className="p-2 bg-slate-50 border-t border-slate-100 flex items-center justify-between text-xs">
                <span className="text-[11px] text-slate-500">Can&apos;t find your locality?</span>
                <button
                  type="button"
                  onClick={() => {
                    if (searchQuery.trim()) {
                      handleApplyCustomLocality(searchQuery);
                    } else {
                      setIsManualInput(true);
                      setIsOpen(false);
                    }
                  }}
                  className="font-semibold text-blue-600 hover:text-blue-800 text-[11px] flex items-center gap-1 cursor-pointer"
                >
                  <Plus className="w-3 h-3" />
                  {searchQuery.trim() ? `Use "${searchQuery.trim()}"` : 'Enter custom locality'}
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
