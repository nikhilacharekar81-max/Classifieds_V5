'use client';
import React, { useState } from 'react';
import { useApp } from '@/context/AppContext';
import { LocationItem } from '@/lib/types';
import {
  MapPin,
  Plus,
  Search,
  Star,
  Globe,
  Trash2,
  Edit2,
  X,
  ChevronRight,
  ChevronDown,
} from 'lucide-react';
import { Badge } from '@/components/common/Badge';

export const LocationsModule: React.FC = () => {
  const {
    locations,
    addLocation,
    updateLocation,
    deleteLocation,
    toggleLocationPopular,
  } = useApp();

  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState<'all' | 'country' | 'state' | 'city'>('all');
  const [collapsedCountryIds, setCollapsedCountryIds] = useState<Record<string, boolean>>({});
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingLoc, setEditingLoc] = useState<LocationItem | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  // Form state
  const [formData, setFormData] = useState({
    type: 'city' as 'country' | 'state' | 'city',
    name: '',
    code: '',
    parentId: '' as string | null,
    popular: false,
  });

  const countries = locations.filter((l) => l.type === 'country');
  const states = locations.filter((l) => l.type === 'state');
  const cities = locations.filter((l) => l.type === 'city');
  const localities = locations.filter((l) => l.type === 'locality');

  const toggleCountryCollapse = (countryId: string) => {
    setCollapsedCountryIds((prev) => ({
      ...prev,
      [countryId]: !prev[countryId],
    }));
  };

  const handleOpenAdd = (targetType: 'country' | 'state' | 'city' = 'city', parentId?: string) => {
    let defaultParentId = parentId || null;
    if (targetType === 'state' && !defaultParentId) {
      defaultParentId = countries[0]?.id || 'loc_in';
    } else if (targetType === 'city' && !defaultParentId) {
      defaultParentId = states[0]?.id || 'loc_st_mah';
    }

    setFormData({
      type: targetType,
      name: '',
      code: '',
      parentId: defaultParentId,
      popular: false,
    });
    setEditingLoc(null);
    setIsAddModalOpen(true);
  };

  const handleOpenEdit = (loc: LocationItem) => {
    setEditingLoc(loc);
    setFormData({
      type: loc.type as 'country' | 'state' | 'city',
      name: loc.name,
      code: loc.code || '',
      parentId: loc.parentId || (loc.type === 'state' ? countries[0]?.id : states[0]?.id) || 'loc_in',
      popular: !!loc.popular,
    });
    setIsAddModalOpen(true);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) return;

    const formattedCode = formData.code.trim().toUpperCase() || undefined;
    const parent = formData.type === 'country' 
      ? null 
      : formData.parentId || (formData.type === 'state' ? countries[0]?.id : states[0]?.id) || 'loc_in';

    if (editingLoc) {
      updateLocation({
        ...editingLoc,
        type: formData.type,
        name: formData.name.trim(),
        code: formattedCode,
        parentId: parent,
        popular: formData.popular,
      });
    } else {
      addLocation({
        type: formData.type,
        name: formData.name.trim(),
        code: formattedCode,
        parentId: parent,
        popular: formData.popular,
      });
    }

    setIsAddModalOpen(false);
    setEditingLoc(null);
  };

  return (
    <div className="p-6 space-y-5 max-w-7xl mx-auto text-slate-900 dark:text-white">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200 dark:border-slate-800">
        <div>
          <div className="flex items-center gap-2 text-xs text-blue-600 dark:text-blue-400 font-semibold mb-1">
            <Globe className="w-3.5 h-3.5" />
            <span>Location Hierarchy (Country → State → City)</span>
          </div>
          <h2 className="text-xl font-bold tracking-tight flex items-center gap-2">
            Location Hierarchy (Country → State → City)
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Geographic routing for geo-targeted ads, search filtering, and state/city landing pages
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => handleOpenAdd('country')}
            className="px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-800 text-xs font-semibold hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center gap-1.5 transition-colors text-slate-700 dark:text-slate-300 cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" /> + Add Country
          </button>
          <button
            onClick={() => handleOpenAdd('state')}
            className="px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-800 text-xs font-semibold hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center gap-1.5 transition-colors text-slate-700 dark:text-slate-300 cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" /> + Add State
          </button>
          <button
            onClick={() => handleOpenAdd('city')}
            className="px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 shadow-sm transition-colors cursor-pointer"
          >
            <Plus className="w-4 h-4" /> + Add City
          </button>
        </div>
      </div>

      {/* 3-Tier Metrics Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-sm flex items-center justify-between">
          <div>
            <div className="text-xs font-medium text-slate-500">Tier 1: Countries</div>
            <div className="text-2xl font-black text-indigo-600 dark:text-indigo-400 mt-1">{countries.length}</div>
            <div className="text-[11px] text-slate-400 mt-0.5">National territories</div>
          </div>
          <div className="p-3 bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 rounded-xl">
            <Globe className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-sm flex items-center justify-between">
          <div>
            <div className="text-xs font-medium text-slate-500">Tier 2: States</div>
            <div className="text-2xl font-black text-blue-600 mt-1">{states.length}</div>
            <div className="text-[11px] text-slate-400 mt-0.5">Provinces/Regions</div>
          </div>
          <div className="p-3 bg-blue-50 dark:bg-blue-950/50 text-blue-600 rounded-xl">
            <Plus className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-sm flex items-center justify-between">
          <div>
            <div className="text-xs font-medium text-slate-500">Tier 3: Cities & Hubs</div>
            <div className="text-2xl font-black text-emerald-600 dark:text-emerald-400 mt-1">{cities.length}</div>
            <div className="text-[11px] text-slate-400 mt-0.5">Municipalities under states</div>
          </div>
          <div className="p-3 bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 rounded-xl">
            <MapPin className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-sm flex items-center justify-between">
          <div>
            <div className="text-xs font-medium text-slate-500">Popular Cities</div>
            <div className="text-2xl font-black text-amber-500 mt-1">
              {cities.filter((c) => c.popular).length}
            </div>
            <div className="text-[11px] text-slate-400 mt-0.5">Featured in header quick-picker</div>
          </div>
          <div className="p-3 bg-amber-50 dark:bg-amber-950/50 text-amber-500 rounded-xl">
            <Star className="w-6 h-6 fill-amber-500" />
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-3 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2.5">
          <div className="relative w-full sm:w-64">
            <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search country, state, city, code..."
              className="w-full text-xs rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/60 pl-9 pr-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium"
            />
          </div>

          <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800/80 p-1 rounded-lg">
            {(['all', 'country', 'state', 'city'] as const).map((t) => (
              <button
                key={t}
                onClick={() => setTypeFilter(t)}
                className={`px-3 py-1.5 rounded-md text-xs font-semibold capitalize transition-colors cursor-pointer ${
                  typeFilter === t
                    ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                {t === 'all'
                  ? 'All Tiers'
                  : t === 'country'
                  ? 'Countries (Tier 1)'
                  : t === 'state'
                  ? 'States (Tier 2)'
                  : 'Cities (Tier 3)'}
              </button>
            ))}
          </div>
        </div>

        <div className="text-xs text-slate-500">
          Showing <strong>{locations.length}</strong> location entries
        </div>
      </div>

      {/* Country → State → City Hierarchy Display */}
      <div className="space-y-6">
        {countries.map((country) => {
          const countryStates = states.filter((s) => s.parentId === country.id);
          const countryCities = cities.filter((c) => {
            // Find parent state of city, then verify if state parent is this country
            const s = states.find((st) => st.id === c.parentId);
            return s?.parentId === country.id || c.parentId === country.id;
          });
          const isCollapsed = !!collapsedCountryIds[country.id];

          // Filter logic
          const q = searchTerm.toLowerCase();
          const countryMatches = country.name.toLowerCase().includes(q) || (country.code && country.code.toLowerCase().includes(q));

          const filteredStates = countryStates.filter((state) => {
            const stateMatches = state.name.toLowerCase().includes(q) || (state.code && state.code.toLowerCase().includes(q));
            const stateCities = cities.filter((c) => c.parentId === state.id);
            const hasMatchingCity = stateCities.some(
              (c) =>
                c.name.toLowerCase().includes(q) ||
                (c.code && c.code.toLowerCase().includes(q)) ||
                localities.some((loc) => loc.parentId === c.id && loc.name.toLowerCase().includes(q))
            );
            return countryMatches || stateMatches || hasMatchingCity;
          });

          if (searchTerm && !countryMatches && filteredStates.length === 0) {
            return null;
          }

          if (typeFilter === 'country' && !countryMatches) {
            return null;
          }
          if (typeFilter === 'state' && filteredStates.length === 0) {
            return null;
          }
          if (typeFilter === 'city' && countryCities.length === 0) {
            return null;
          }

          return (
            <div
              key={country.id}
              className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm space-y-4"
            >
              {/* Country Header (Tier 1) */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100 dark:border-slate-800">
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => toggleCountryCollapse(country.id)}
                    className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded text-slate-500 cursor-pointer"
                    title={isCollapsed ? 'Expand states' : 'Collapse states'}
                  >
                    {isCollapsed ? (
                      <ChevronRight className="w-5 h-5 text-indigo-600" />
                    ) : (
                      <ChevronDown className="w-5 h-5 text-indigo-600" />
                    )}
                  </button>

                  <div className="p-3 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 font-bold shadow-xs">
                    <Globe className="w-5 h-5" />
                  </div>

                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-bold text-slate-900 dark:text-white text-base">
                        {country.name}
                      </h3>
                      {country.code && (
                        <span className="text-[10px] font-mono font-bold bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 px-2 py-0.5 rounded">
                          {country.code}
                        </span>
                      )}
                      <Badge variant="info">Tier 1: Country</Badge>
                    </div>
                    <div className="text-xs text-slate-500 mt-0.5">
                      Contains <strong>{countryStates.length} States</strong> and <strong>{countryCities.length} total Cities</strong>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleOpenAdd('state', country.id)}
                    className="px-3 py-1.5 bg-blue-50 dark:bg-blue-950/50 hover:bg-blue-100 dark:hover:bg-blue-900/80 text-blue-700 dark:text-blue-300 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" /> + Add State to {country.name}
                  </button>
                  <button
                    onClick={() => handleOpenEdit(country)}
                    className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-slate-500 hover:text-slate-900 dark:hover:text-white transition-colors cursor-pointer"
                    title="Edit Country"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* States Listing (Tier 2) & Cities (Tier 3) */}
              {!isCollapsed && (
                <div className="space-y-4 pt-2">
                  {filteredStates.length === 0 ? (
                    <div className="text-xs text-slate-400 py-2">
                      No states added under {country.name} yet.{' '}
                      <button
                        onClick={() => handleOpenAdd('state', country.id)}
                        className="text-blue-600 dark:text-blue-400 font-semibold hover:underline cursor-pointer"
                      >
                        + Add first state
                      </button>
                    </div>
                  ) : (
                    filteredStates.map((state) => {
                      const stateCities = cities.filter((c) => c.parentId === state.id);
                      const filteredCities = stateCities.filter(
                        (c) => c.name.toLowerCase().includes(q) || (c.code && c.code.toLowerCase().includes(q))
                      );
                      const displayCities = searchTerm ? filteredCities : stateCities;

                      if (typeFilter === 'city' && displayCities.length === 0) {
                        return null;
                      }

                      return (
                        <div key={state.id} className="ml-4 pl-4 border-l-2 border-slate-100 dark:border-slate-800 space-y-3">
                          {/* State row */}
                          <div className="flex items-center justify-between bg-slate-50/50 dark:bg-slate-800/30 px-3.5 py-2.5 rounded-xl border border-slate-100 dark:border-slate-800">
                            <div className="flex items-center gap-2.5 min-w-0">
                              <span className="text-sm">🏛️</span>
                              <div className="min-w-0">
                                <div className="flex items-center gap-1.5 flex-wrap">
                                  <h4 className="font-bold text-xs text-slate-800 dark:text-slate-200">
                                    {state.name}
                                  </h4>
                                  {state.code && (
                                    <span className="text-[9px] font-mono font-bold bg-blue-50 dark:bg-blue-950/40 text-blue-600 px-1.5 py-0.5 rounded">
                                      {state.code}
                                    </span>
                                  )}
                                  <Badge variant="purple">Tier 2: State</Badge>
                                </div>
                                <div className="text-[10px] text-slate-400 mt-0.5">
                                  Contains <strong>{stateCities.length} Cities</strong>
                                </div>
                              </div>
                            </div>

                            <div className="flex items-center gap-2">
                              {typeFilter !== 'state' && (
                                <button
                                  onClick={() => handleOpenAdd('city', state.id)}
                                  className="px-2 py-1 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 rounded-lg text-[10px] font-semibold hover:bg-emerald-100 flex items-center gap-1 transition-colors cursor-pointer"
                                >
                                  <Plus className="w-3 h-3" /> + Add City
                                </button>
                              )}
                              <button
                                onClick={() => handleOpenEdit(state)}
                                className="p-1 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 rounded cursor-pointer"
                                title="Edit State"
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                              </button>
                              {deleteConfirmId === state.id ? (
                                <div className="flex items-center gap-0.5">
                                  <button
                                    onClick={() => {
                                      deleteLocation(state.id);
                                      setDeleteConfirmId(null);
                                    }}
                                    className="px-1.5 py-0.5 bg-rose-600 text-white rounded text-[9px] font-bold cursor-pointer"
                                  >
                                    Del
                                  </button>
                                  <button
                                    onClick={() => setDeleteConfirmId(null)}
                                    className="p-0.5 text-slate-400 hover:text-slate-600 cursor-pointer"
                                  >
                                    <X className="w-3 h-3" />
                                  </button>
                                </div>
                              ) : (
                                <button
                                  onClick={() => setDeleteConfirmId(state.id)}
                                  className="p-1 text-slate-300 hover:text-rose-500 rounded cursor-pointer transition-colors"
                                  title="Delete State"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              )}
                            </div>
                          </div>

                          {/* Cities list (Tier 3) */}
                          {typeFilter !== 'state' && (
                            <div className="pl-6 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                              {displayCities.map((city) => (
                                <div
                                  key={city.id}
                                  className="bg-slate-50/60 dark:bg-slate-800/20 border border-slate-100 dark:border-slate-800/60 rounded-xl p-3 flex items-center justify-between hover:border-blue-300 dark:hover:border-blue-700 transition-colors"
                                >
                                  <div className="flex items-center gap-2.5 min-w-0">
                                    <div className="p-2 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400">
                                      <MapPin className="w-3.5 h-3.5" />
                                    </div>
                                    <div className="min-w-0">
                                      <div className="font-bold text-[11px] text-slate-800 dark:text-white truncate flex items-center gap-1">
                                        <span>{city.name}</span>
                                        {city.code && (
                                          <span className="text-[9px] font-mono text-slate-400 font-medium">
                                            ({city.code})
                                          </span>
                                        )}
                                      </div>
                                      <div className="text-[9px] text-slate-400 flex items-center gap-1 mt-0.5">
                                        <Badge variant="info">Tier 3: City</Badge>
                                        {localities.filter((loc) => loc.parentId === city.id).length > 0 && (
                                          <span className="text-[9px] font-semibold text-indigo-600 dark:text-indigo-400">
                                            • {localities.filter((loc) => loc.parentId === city.id).length} localities
                                          </span>
                                        )}
                                      </div>
                                    </div>
                                  </div>

                                  <div className="flex items-center gap-1">
                                    <button
                                      onClick={() => toggleLocationPopular(city.id)}
                                      className={`p-1 rounded cursor-pointer transition-colors ${
                                        city.popular
                                          ? 'text-amber-500 bg-amber-50 dark:bg-amber-950/60'
                                          : 'text-slate-300 dark:text-slate-600 hover:text-amber-400'
                                      }`}
                                      title={city.popular ? 'Popular City' : 'Mark as Popular'}
                                    >
                                      <Star className={`w-3 h-3 ${city.popular ? 'fill-amber-500' : ''}`} />
                                    </button>
                                    <button
                                      onClick={() => handleOpenEdit(city)}
                                      className="p-1 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 rounded cursor-pointer"
                                      title="Edit City"
                                    >
                                      <Edit2 className="w-3 h-3" />
                                    </button>
                                    {deleteConfirmId === city.id ? (
                                      <div className="flex items-center gap-0.5">
                                        <button
                                          onClick={() => {
                                            deleteLocation(city.id);
                                            setDeleteConfirmId(null);
                                          }}
                                          className="px-1.5 py-0.5 bg-rose-600 text-white rounded text-[9px] font-bold cursor-pointer"
                                        >
                                          Del
                                        </button>
                                        <button
                                          onClick={() => setDeleteConfirmId(null)}
                                          className="p-0.5 text-slate-400 hover:text-slate-600 cursor-pointer"
                                        >
                                          <X className="w-3 h-3" />
                                        </button>
                                      </div>
                                    ) : (
                                      <button
                                        onClick={() => setDeleteConfirmId(city.id)}
                                        className="p-1 text-slate-300 hover:text-rose-500 rounded cursor-pointer transition-colors"
                                        title="Delete City"
                                      >
                                        <Trash2 className="w-3 h-3" />
                                      </button>
                                    )}
                                  </div>
                                </div>
                              ))}

                              {displayCities.length === 0 && (
                                <div className="text-[11px] text-slate-400 col-span-full py-1">
                                  No cities found under {state.name}.
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Add / Edit Location Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl max-w-md w-full p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <h3 className="font-bold text-slate-900 dark:text-white text-base flex items-center gap-2">
                <MapPin className="w-4 h-4 text-blue-600" />
                {editingLoc ? 'Edit Geographic Location' : 'Add New Location (Country → State → City)'}
              </h3>
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSave} className="space-y-4 text-xs">
              {/* Hierarchy Tier Selector */}
              <div>
                <label className="block font-semibold mb-1 text-slate-700 dark:text-slate-300">
                  Select Hierarchy Tier *
                </label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, type: 'country', parentId: null })}
                    className={`p-2.5 rounded-xl border text-center font-bold flex flex-col items-center justify-center gap-1 transition-all cursor-pointer ${
                      formData.type === 'country'
                        ? 'border-indigo-600 bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300'
                        : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400'
                    }`}
                  >
                    <Globe className="w-4 h-4" />
                    <span className="text-[10px]">Tier 1: Country</span>
                  </button>

                  <button
                    type="button"
                    onClick={() =>
                      setFormData({
                        ...formData,
                        type: 'state',
                        parentId: countries[0]?.id || 'loc_in',
                      })
                    }
                    className={`p-2.5 rounded-xl border text-center font-bold flex flex-col items-center justify-center gap-1 transition-all cursor-pointer ${
                      formData.type === 'state'
                        ? 'border-blue-600 bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300'
                        : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400'
                    }`}
                  >
                    <Plus className="w-4 h-4" />
                    <span className="text-[10px]">Tier 2: State</span>
                  </button>

                  <button
                    type="button"
                    onClick={() =>
                      setFormData({
                        ...formData,
                        type: 'city',
                        parentId: states[0]?.id || 'loc_st_mah',
                      })
                    }
                    className={`p-2.5 rounded-xl border text-center font-bold flex flex-col items-center justify-center gap-1 transition-all cursor-pointer ${
                      formData.type === 'city'
                        ? 'border-emerald-600 bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300'
                        : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400'
                    }`}
                  >
                    <MapPin className="w-4 h-4" />
                    <span className="text-[10px]">Tier 3: City</span>
                  </button>
                </div>
              </div>

              {/* If State, select parent Country */}
              {formData.type === 'state' && (
                <div>
                  <label className="block font-semibold mb-1 text-slate-700 dark:text-slate-300">
                    Parent Country (Tier 1) *
                  </label>
                  <select
                    value={formData.parentId || ''}
                    onChange={(e) => setFormData({ ...formData, parentId: e.target.value })}
                    className="w-full text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 p-2.5 font-medium focus:ring-2 focus:ring-blue-500 focus:outline-none cursor-pointer"
                  >
                    {countries.map((c) => (
                      <option key={c.id} value={c.id}>
                        🌍 {c.name} {c.code ? `(${c.code})` : ''}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* If City, select parent State */}
              {formData.type === 'city' && (
                <div>
                  <label className="block font-semibold mb-1 text-slate-700 dark:text-slate-300">
                    Parent State (Tier 2) *
                  </label>
                  <select
                    value={formData.parentId || ''}
                    onChange={(e) => setFormData({ ...formData, parentId: e.target.value })}
                    className="w-full text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 p-2.5 font-medium focus:ring-2 focus:ring-blue-500 focus:outline-none cursor-pointer"
                  >
                    {states.map((s) => (
                      <option key={s.id} value={s.id}>
                        🏛️ {s.name} {s.code ? `(${s.code})` : ''}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Name & Code */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold mb-1 text-slate-700 dark:text-slate-300">
                    {formData.type === 'country' ? 'Country Name *' : formData.type === 'state' ? 'State Name *' : 'City Name *'}
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder={formData.type === 'country' ? 'e.g. India' : formData.type === 'state' ? 'e.g. Maharashtra' : 'e.g. Mumbai'}
                    className="w-full text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 p-2.5 font-medium focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block font-semibold mb-1 text-slate-700 dark:text-slate-300">
                    Short Code / ISO Code
                  </label>
                  <input
                    type="text"
                    value={formData.code}
                    onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                    placeholder={formData.type === 'country' ? 'e.g. IN' : formData.type === 'state' ? 'e.g. MH' : 'e.g. MUM'}
                    className="w-full text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 p-2.5 font-mono uppercase focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                </div>
              </div>

              {formData.type === 'city' && (
                <div className="flex items-center gap-2 pt-1">
                  <input
                    type="checkbox"
                    id="isPopularCity"
                    checked={formData.popular}
                    onChange={(e) => setFormData({ ...formData, popular: e.target.checked })}
                    className="rounded text-blue-600 focus:ring-blue-500 cursor-pointer"
                  />
                  <label
                    htmlFor="isPopularCity"
                    className="font-medium text-slate-700 dark:text-slate-300 cursor-pointer"
                  >
                    Feature as Popular City in header location quick-selector
                  </label>
                </div>
              )}

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg font-medium cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg shadow-sm cursor-pointer transition-colors"
                >
                  {editingLoc ? 'Save Changes' : 'Create Location'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
