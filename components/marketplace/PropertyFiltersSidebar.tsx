'use client';

import React from 'react';
import { SlidersHorizontal } from 'lucide-react';

export interface PropertyFilterState {
  propTypeFilter: string;
  setPropTypeFilter: (v: string) => void;
  propConfigFilter: string;
  setPropConfigFilter: (v: string) => void;
  propStatusFilter: string;
  setPropStatusFilter: (v: string) => void;
  propListedByFilter: string;
  setPropListedByFilter: (v: string) => void;
  propFurnishingFilter: string;
  setPropFurnishingFilter: (v: string) => void;
  propMinPriceFilter: string;
  setPropMinPriceFilter: (v: string) => void;
  propMaxPriceFilter: string;
  setPropMaxPriceFilter: (v: string) => void;
  propMinAreaFilter: string;
  setPropMinAreaFilter: (v: string) => void;
  propMaxAreaFilter: string;
  setPropMaxAreaFilter: (v: string) => void;
  rentDepositMaxFilter: string;
  setRentDepositMaxFilter: (v: string) => void;
  rentBrokerageFilter: string;
  setRentBrokerageFilter: (v: string) => void;
  rentTenantPrefFilter: string;
  setRentTenantPrefFilter: (v: string) => void;
  rentAvailabilityFilter: string;
  setRentAvailabilityFilter: (v: string) => void;
  rentPetsFilter: string;
  setRentPetsFilter: (v: string) => void;
  onResetAll: () => void;
}

export interface PropertyFiltersSidebarProps extends PropertyFilterState {
  effectiveSubcategory: string;
  compactMobile?: boolean;
}

const PROPERTY_TYPES = [
  'Apartment / Flat',
  'Independent House',
  'Villa',
  'Builder Floor',
  'Studio Apartment',
  'Penthouse',
  'Duplex',
  'Triplex',
  'Farm House',
  'Row House / Townhouse',
];

const CONFIG_OPTIONS = ['all', '1 RK', '1 BHK', '2 BHK', '3 BHK', '4 BHK', '5 BHK', '6+ BHK'];

export const PropertyFiltersSidebar: React.FC<PropertyFiltersSidebarProps> = ({
  propTypeFilter,
  setPropTypeFilter,
  propConfigFilter,
  setPropConfigFilter,
  propStatusFilter,
  setPropStatusFilter,
  propListedByFilter,
  setPropListedByFilter,
  propFurnishingFilter,
  setPropFurnishingFilter,
  propMinPriceFilter,
  setPropMinPriceFilter,
  propMaxPriceFilter,
  setPropMaxPriceFilter,
  propMinAreaFilter,
  setPropMinAreaFilter,
  propMaxAreaFilter,
  setPropMaxAreaFilter,
  rentDepositMaxFilter,
  setRentDepositMaxFilter,
  rentBrokerageFilter,
  setRentBrokerageFilter,
  rentTenantPrefFilter,
  setRentTenantPrefFilter,
  rentAvailabilityFilter,
  setRentAvailabilityFilter,
  rentPetsFilter,
  setRentPetsFilter,
  onResetAll,
  effectiveSubcategory,
  compactMobile = false,
}) => {
  const hasAnyActiveFilter =
    propTypeFilter !== 'all' ||
    propConfigFilter !== 'all' ||
    propStatusFilter !== 'all' ||
    propListedByFilter !== 'all' ||
    propFurnishingFilter !== 'all' ||
    Boolean(propMinPriceFilter) ||
    Boolean(propMaxPriceFilter) ||
    Boolean(propMinAreaFilter) ||
    Boolean(propMaxAreaFilter) ||
    Boolean(rentDepositMaxFilter) ||
    rentBrokerageFilter !== 'all' ||
    rentTenantPrefFilter !== 'all' ||
    rentAvailabilityFilter !== 'all' ||
    rentPetsFilter !== 'all';

  return (
    <div
      className={
        compactMobile
          ? 'border-t border-slate-200 pt-3 space-y-3'
          : 'bg-white border border-slate-200 rounded-2xl p-4 shadow-sm space-y-4 animate-in fade-in duration-200'
      }
    >
      <div
        className={
          compactMobile
            ? 'flex items-center justify-between px-3'
            : 'border-b border-slate-100 pb-2.5 flex items-center justify-between'
        }
      >
        <div className="flex items-center gap-2">
          {!compactMobile && <SlidersHorizontal className="w-4 h-4 text-blue-600" />}
          <h3
            className={
              compactMobile
                ? 'text-[11px] font-bold uppercase tracking-wider text-slate-400'
                : 'text-xs font-black text-slate-900 uppercase tracking-wider'
            }
          >
            Property Filters
          </h3>
        </div>
        {hasAnyActiveFilter && (
          <button
            type="button"
            onClick={onResetAll}
            className="text-[10px] font-bold text-rose-600 hover:underline cursor-pointer"
          >
            {compactMobile ? 'Clear' : 'Reset All'}
          </button>
        )}
      </div>

      <div className={compactMobile ? 'px-3 space-y-3' : 'space-y-4'}>
        {/* Property Type Dropdown */}
        <div className="space-y-1.5">
          <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
            Property Type
          </label>
          <select
            value={propTypeFilter}
            onChange={(e) => setPropTypeFilter(e.target.value)}
            className="w-full rounded-xl border border-slate-200 bg-slate-50 p-2 text-xs font-semibold text-slate-800 outline-none focus:border-blue-500 transition-colors cursor-pointer"
          >
            <option value="all">All Types</option>
            {PROPERTY_TYPES.map((pt) => (
              <option key={pt} value={pt}>
                {pt}
              </option>
            ))}
          </select>
        </div>

        {/* BHK Configuration Button Group */}
        <div className="space-y-1.5">
          <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
            Configuration
          </label>
          <div className="grid grid-cols-4 gap-1">
            {CONFIG_OPTIONS.map((cfg) => {
              const isSel = propConfigFilter === cfg;
              return (
                <button
                  key={cfg}
                  type="button"
                  onClick={() => setPropConfigFilter(cfg)}
                  className={`p-1 rounded-lg text-[10px] font-bold text-center border cursor-pointer transition-colors ${
                    isSel
                      ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                      : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  {cfg === 'all' ? 'All' : compactMobile ? cfg.split(' ')[0] : cfg}
                </button>
              );
            })}
          </div>
        </div>

        {/* Price Range */}
        <div className="space-y-1.5">
          <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
            Price Range (₹)
          </label>
          <div className="grid grid-cols-2 gap-2">
            <input
              type="number"
              placeholder="Min"
              value={propMinPriceFilter}
              onChange={(e) => setPropMinPriceFilter(e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-slate-50 py-1.5 px-2.5 text-xs font-semibold text-slate-800 outline-none focus:border-blue-500 transition-colors"
            />
            <input
              type="number"
              placeholder="Max"
              value={propMaxPriceFilter}
              onChange={(e) => setPropMaxPriceFilter(e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-slate-50 py-1.5 px-2.5 text-xs font-semibold text-slate-800 outline-none focus:border-blue-500 transition-colors"
            />
          </div>
        </div>

        {/* Area Range (Sq. Ft.) */}
        {!compactMobile && (
          <div className="space-y-1.5">
            <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
              Area (Sq. Ft.)
            </label>
            <div className="grid grid-cols-2 gap-2">
              <input
                type="number"
                placeholder="Min Area"
                value={propMinAreaFilter}
                onChange={(e) => setPropMinAreaFilter(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-slate-50 py-1.5 px-2.5 text-xs font-semibold text-slate-800 outline-none focus:border-blue-500 transition-colors"
              />
              <input
                type="number"
                placeholder="Max Area"
                value={propMaxAreaFilter}
                onChange={(e) => setPropMaxAreaFilter(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-slate-50 py-1.5 px-2.5 text-xs font-semibold text-slate-800 outline-none focus:border-blue-500 transition-colors"
              />
            </div>
          </div>
        )}

        {/* Furnishing */}
        <div className="space-y-1.5">
          <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
            Furnishing
          </label>
          <select
            value={propFurnishingFilter}
            onChange={(e) => setPropFurnishingFilter(e.target.value)}
            className="w-full rounded-xl border border-slate-200 bg-slate-50 p-2 text-xs font-semibold text-slate-800 outline-none focus:border-blue-500 transition-colors cursor-pointer"
          >
            <option value="all">Any Furnishing</option>
            <option value="Furnished">Furnished</option>
            <option value="Semi Furnished">Semi Furnished</option>
            <option value="Unfurnished">Unfurnished</option>
          </select>
        </div>

        {!compactMobile && (
          <>
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
                Property Status
              </label>
              <select
                value={propStatusFilter}
                onChange={(e) => setPropStatusFilter(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-slate-50 p-2 text-xs font-semibold text-slate-800 outline-none focus:border-blue-500 transition-colors cursor-pointer"
              >
                <option value="all">Any Status</option>
                <option value="Ready to Move">Ready to Move</option>
                <option value="Under Construction">Under Construction</option>
                <option value="New Property">New Property</option>
                <option value="Resale Property">Resale Property</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
                Listed By
              </label>
              <select
                value={propListedByFilter}
                onChange={(e) => setPropListedByFilter(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-slate-50 p-2 text-xs font-semibold text-slate-800 outline-none focus:border-blue-500 transition-colors cursor-pointer"
              >
                <option value="all">Any Lister</option>
                <option value="Owner">Owner</option>
                <option value="Dealer / Agent">Dealer / Agent</option>
                <option value="Builder / Developer">Builder / Developer</option>
              </select>
            </div>
          </>
        )}

        {/* Rent Specific Options */}
        {effectiveSubcategory === 'sub_house_apt_rent' && (
          <div className="space-y-3 pt-3 border-t border-slate-100 animate-in fade-in duration-200">
            <div className="border-b border-slate-100 pb-1 flex items-center justify-between">
              <span className="text-[10px] font-black uppercase tracking-wider text-blue-600">
                Rent Specific Options
              </span>
            </div>

            <div className="space-y-1.5">
              <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
                Max Security Deposit (₹)
              </label>
              <input
                type="number"
                placeholder="Any Amount"
                value={rentDepositMaxFilter}
                onChange={(e) => setRentDepositMaxFilter(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-slate-50 py-1.5 px-2.5 text-xs font-semibold text-slate-800 outline-none focus:border-blue-500 transition-colors"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
                Brokerage
              </label>
              <select
                value={rentBrokerageFilter}
                onChange={(e) => setRentBrokerageFilter(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-slate-50 p-2 text-xs font-semibold text-slate-800 outline-none focus:border-blue-500 transition-colors cursor-pointer"
              >
                <option value="all">Any Brokerage</option>
                <option value="No Brokerage">No Brokerage</option>
                <option value="15 Days Rent">15 Days Rent</option>
                <option value="1 Month Rent">1 Month Rent</option>
                <option value="2 Months Rent">2 Months Rent</option>
                <option value="Custom / Fixed Fee">Custom / Fixed Fee</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
                Tenant Preference
              </label>
              <select
                value={rentTenantPrefFilter}
                onChange={(e) => setRentTenantPrefFilter(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-slate-50 p-2 text-xs font-semibold text-slate-800 outline-none focus:border-blue-500 transition-colors cursor-pointer"
              >
                <option value="all">Any Preference</option>
                <option value="Anyone">Anyone</option>
                <option value="Families Only">Families Only</option>
                <option value="Bachelors Only">Bachelors Only</option>
                <option value="Working Professionals">Working Professionals</option>
                <option value="Females Only">Females Only</option>
                <option value="Males Only">Males Only</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
                Available From
              </label>
              <select
                value={rentAvailabilityFilter}
                onChange={(e) => setRentAvailabilityFilter(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-slate-50 p-2 text-xs font-semibold text-slate-800 outline-none focus:border-blue-500 transition-colors cursor-pointer"
              >
                <option value="all">Any Availability</option>
                <option value="Immediate">Immediate</option>
                <option value="Within 15 Days">Within 15 Days</option>
                <option value="Within 30 Days">Within 30 Days</option>
                <option value="Custom Date">Custom Date</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
                Pets Allowed
              </label>
              <select
                value={rentPetsFilter}
                onChange={(e) => setRentPetsFilter(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-slate-50 p-2 text-xs font-semibold text-slate-800 outline-none focus:border-blue-500 transition-colors cursor-pointer"
              >
                <option value="all">Any Choice</option>
                <option value="Yes">Yes</option>
                <option value="No">No</option>
                <option value="Cats Only">Cats Only</option>
                <option value="Dogs Only">Dogs Only</option>
              </select>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
