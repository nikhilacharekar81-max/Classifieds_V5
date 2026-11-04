'use client';
import React from 'react';
import { MapPin } from 'lucide-react';
import { LocationItem, UserAccount } from '@/lib/types';
import { LocalityCombobox } from '../LocalityCombobox';

interface LocationStepSectionProps {
  state: string;
  city: string;
  locality: string;
  sortedStates: LocationItem[];
  availableCities: LocationItem[];
  cities: LocationItem[];
  localities: LocationItem[];
  currentUser: UserAccount | null;
  onStateChange: (state: string) => void;
  onCityChange: (city: string) => void;
  onLocalityChange: (locality: string) => void;
  onUseProfileLocation: () => void;
}

export const LocationStepSection: React.FC<LocationStepSectionProps> = ({
  state,
  city,
  locality,
  sortedStates,
  availableCities,
  cities,
  localities,
  currentUser,
  onStateChange,
  onCityChange,
  onLocalityChange,
  onUseProfileLocation,
}) => {
  const selectedCityObj = cities.find(
    (c) => c.name.toLowerCase() === city.toLowerCase()
  );

  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
        <div>
          <h2 className="text-sm font-bold uppercase tracking-wider text-slate-800 flex items-center gap-2">
            <MapPin className="w-4 h-4 text-emerald-600" />
            6. Location in India (State → City → Locality)
          </h2>
          <p className="text-[11px] text-slate-500 mt-0.5">
            Specify the exact location where buyers can view or collect this item
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs font-semibold text-emerald-800 bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-full flex items-center gap-1.5">
            <span>🇮🇳 India</span>
            {state && (
              <>
                <span className="text-slate-300">›</span>
                <span>{state}</span>
              </>
            )}
            {city && (
              <>
                <span className="text-slate-300">›</span>
                <span>{city}</span>
              </>
            )}
          </span>

          {currentUser?.location?.city &&
            (city !== currentUser.location.city || state !== currentUser.location.state) && (
              <button
                type="button"
                onClick={onUseProfileLocation}
                className="text-[11px] font-bold text-blue-600 hover:text-blue-800 bg-blue-50 hover:bg-blue-100 border border-blue-200 px-2.5 py-1 rounded-full transition-colors cursor-pointer flex items-center gap-1"
                title={`Autofill ${currentUser.location.city}, ${currentUser.location.state}`}
              >
                <MapPin className="w-3 h-3" />
                Use My Profile Location
              </button>
            )}
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
        {/* State Selection (Tier 1 for India) */}
        <div>
          <label className="block text-xs font-bold text-slate-700 mb-1">
            State / Union Territory *
          </label>
          <select
            value={state}
            onChange={(e) => onStateChange(e.target.value)}
            className={`w-full text-xs border rounded-xl px-3 py-2.5 bg-slate-50 font-medium focus:ring-2 focus:ring-emerald-500 focus:outline-none cursor-pointer ${
              !state ? 'border-amber-300 bg-amber-50/40 text-slate-700 font-semibold' : 'border-slate-300'
            }`}
          >
            <option value="">— Select State / Union Territory —</option>
            {sortedStates.map((st) => (
              <option key={st.id} value={st.name}>
                🏛️ {st.name} {st.code ? `(${st.code})` : ''}
              </option>
            ))}
          </select>
          {!state && (
            <span className="text-[10px] text-amber-600 font-medium mt-1 block">
              Please select your state first
            </span>
          )}
        </div>

        {/* City Selection (Tier 2 - Cascades dynamically based on State) */}
        <div>
          <label className="block text-xs font-bold text-slate-700 mb-1">
            City / District *
          </label>
          <select
            value={city}
            disabled={!state}
            onChange={(e) => onCityChange(e.target.value)}
            className={`w-full text-xs border rounded-xl px-3 py-2.5 font-medium focus:ring-2 focus:ring-emerald-500 focus:outline-none cursor-pointer ${
              !state
                ? 'bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed'
                : !city
                ? 'bg-amber-50/40 border-amber-300 text-slate-700 font-semibold'
                : 'bg-slate-50 border-slate-300'
            }`}
          >
            <option value="">
              {!state
                ? '— Select State First —'
                : availableCities.length > 0
                ? `— Select City in ${state} (${availableCities.length} Cities) —`
                : `— Select City in ${state} —`}
            </option>
            {availableCities.map((c) => (
              <option key={c.id} value={c.name}>
                📍 {c.name} {c.code ? `(${c.code})` : ''}
              </option>
            ))}
          </select>
          {state && !city && (
            <span className="text-[10px] text-amber-600 font-medium mt-1 block">
              {availableCities.length > 0
                ? `${availableCities.length} cities available in ${state}`
                : `Select city in ${state}`}
            </span>
          )}
        </div>

        {/* Locality Input (Tier 3) */}
        <div>
          <label className="block text-xs font-bold text-slate-700 mb-1">
            Locality / Neighborhood / Sector
          </label>
          <LocalityCombobox
            city={city}
            cityId={selectedCityObj?.id}
            value={locality}
            onChange={onLocalityChange}
            localities={localities}
            placeholder={
              city
                ? `Locality in ${city} (e.g. Bandra, Indiranagar)...`
                : 'Select a city first...'
            }
          />
        </div>
      </div>
    </div>
  );
};
