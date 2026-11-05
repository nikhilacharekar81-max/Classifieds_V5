'use client';
import React from 'react';
import { Sparkles, AlertCircle, ShieldCheck, Tag, IndianRupee } from 'lucide-react';
import { Category, CustomFieldDefinition } from '@/lib/types';
import { navigateTo } from '@/lib/router/useRouter';

interface AdDetailsStepSectionProps {
  title: string;
  description: string;
  price: string;
  titleError: string | null;
  isCheckingTitle: boolean;
  titleInputRef: React.RefObject<HTMLInputElement | null>;
  activeCategoryFields: CustomFieldDefinition[];
  selectedCategory?: Category;
  selectedSubcategory?: Category;
  dynamicAttributes: Record<string, any>;
  onTitleChange: (title: string) => void;
  onDescriptionChange: (description: string) => void;
  onPriceChange: (price: string) => void;
  onDynamicAttrChange: (key: string, value: any) => void;
}

export const AdDetailsStepSection: React.FC<AdDetailsStepSectionProps> = ({
  title,
  description,
  price,
  titleError,
  isCheckingTitle,
  titleInputRef,
  activeCategoryFields,
  selectedCategory,
  selectedSubcategory,
  dynamicAttributes,
  onTitleChange,
  onDescriptionChange,
  onPriceChange,
  onDynamicAttrChange,
}) => {
  return (
    <>
      {/* Section 2: Ad Title & Description */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-4">
        <h2 className="text-sm font-bold uppercase tracking-wider text-slate-500 flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-blue-600" />
          2. Include Some Details
        </h2>

        <div>
          <div className="flex items-center justify-between mb-1">
            <label htmlFor="ad-title-input" className="block text-xs font-semibold text-slate-700">
              Ad Title *
            </label>
            {isCheckingTitle && (
              <span className="text-[11px] text-slate-400 animate-pulse">Checking uniqueness...</span>
            )}
          </div>
          <input
            id="ad-title-input"
            ref={titleInputRef}
            type="text"
            required
            value={title}
            onChange={(e) => onTitleChange(e.target.value)}
            placeholder="e.g. 2023 Hyundai Creta SX (O) Turbo Automatic Sunroof"
            className={`w-full text-sm rounded-xl px-4 py-2.5 transition-all focus:outline-none ${
              titleError
                ? 'border-2 border-red-500 bg-red-50/20 text-slate-900 focus:ring-2 focus:ring-red-300'
                : 'border border-slate-300 focus:ring-2 focus:ring-blue-500'
            }`}
          />

          {/* Prominent Duplicate Title Detection Error Alert */}
          {titleError && (
            <div
              id="duplicate-title-alert"
              className="mt-2.5 p-3.5 rounded-xl bg-red-50 border border-red-200 text-red-800 flex items-start gap-2.5 animate-in fade-in duration-150"
            >
              <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
              <div className="text-xs space-y-1.5 flex-1">
                <div className="font-bold text-red-900 leading-snug">
                  {titleError}
                </div>
                <div className="text-[11px] text-red-700 leading-relaxed">
                  Titles must be unique per seller (ignoring case and extra spaces). You can add distinct details such as year, variant, condition, or color.
                </div>
                <div className="pt-1 flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => navigateTo('/user')}
                    className="text-[11px] font-extrabold text-blue-700 hover:text-blue-900 underline inline-flex items-center gap-1 cursor-pointer"
                  >
                    View & Edit your existing ads &rarr;
                  </button>
                </div>
              </div>
            </div>
          )}

          <span className="text-[11px] text-slate-400 mt-1 block">
            Mention key features, brand, model, and condition (must be unique among your ads).
          </span>
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">
            Description *
          </label>
          <textarea
            rows={4}
            required
            value={description}
            onChange={(e) => onDescriptionChange(e.target.value)}
            placeholder="Describe what makes your ad unique. Include service history, accessories, reason for selling, etc."
            className="w-full text-sm border border-slate-300 rounded-xl p-3 focus:ring-2 focus:ring-blue-500 focus:outline-none leading-relaxed"
          />

          <div className="mt-2.5 p-3 rounded-xl bg-slate-50 border border-slate-200 text-slate-600 flex items-start gap-2.5 text-xs">
            <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
            <p className="leading-relaxed">
              <strong className="text-slate-900 font-bold">Anti-Spam & Security Link Policy:</strong> Live clickable links are disabled in ad descriptions. Any web URLs entered will render as unclickable plain text on the listing page.
            </p>
          </div>
        </div>
      </div>

      {/* Section 3: Category Dynamic Custom Attributes (EAV System) */}
      {activeCategoryFields.length > 0 && selectedCategory && (
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between pb-2 border-b border-slate-100">
            <h2 className="text-sm font-bold uppercase tracking-wider text-slate-500 flex items-center gap-2">
              <Tag className="w-4 h-4 text-emerald-600" />
              3. {selectedSubcategory ? selectedSubcategory.name : selectedCategory.name} Specifications
            </h2>
            <span className="text-[11px] text-slate-400 font-mono">Dynamic Category Attributes</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {activeCategoryFields.map((field: CustomFieldDefinition) => (
              <div key={field.name}>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  {field.label} {field.unit && <span className="text-slate-400 font-normal">({field.unit})</span>}{' '}
                  {field.required && <span className="text-rose-500">*</span>}
                </label>

                {field.type === 'select' && field.options ? (
                  <select
                    required={field.required}
                    value={dynamicAttributes[field.name] || ''}
                    onChange={(e) => onDynamicAttrChange(field.name, e.target.value)}
                    className="w-full text-xs border border-slate-300 rounded-xl px-3 py-2 bg-slate-50 focus:ring-2 focus:ring-blue-500 focus:outline-none cursor-pointer"
                  >
                    <option value="">Select {field.label}...</option>
                    {field.options.map((opt: string) => (
                      <option key={opt} value={opt}>
                        {opt}
                      </option>
                    ))}
                  </select>
                ) : field.type === 'radio' && field.options ? (
                  <div className="flex flex-wrap items-center gap-2 pt-1">
                    {field.options.map((opt: string) => (
                      <button
                        key={opt}
                        type="button"
                        onClick={() => onDynamicAttrChange(field.name, opt)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all cursor-pointer ${
                          dynamicAttributes[field.name] === opt
                            ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                            : 'bg-slate-50 text-slate-700 border-slate-300 hover:bg-slate-100'
                        }`}
                      >
                        {opt}
                      </button>
                    ))}
                  </div>
                ) : (
                  <div className="relative">
                    <input
                      type={field.type === 'number' ? 'number' : 'text'}
                      required={field.required}
                      value={dynamicAttributes[field.name] || ''}
                      onChange={(e) => onDynamicAttrChange(field.name, e.target.value)}
                      placeholder={`Enter ${field.label.toLowerCase()}${field.unit ? ` (${field.unit})` : ''}`}
                      className="w-full text-xs border border-slate-300 rounded-xl px-3 py-2 bg-slate-50 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                    />
                    {field.unit && (
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[11px] font-medium text-slate-400 pointer-events-none">
                        {field.unit}
                      </span>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Section 4: Set a Price */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-4">
        <h2 className="text-sm font-bold uppercase tracking-wider text-slate-500 flex items-center gap-2">
          <IndianRupee className="w-4 h-4 text-blue-600" />
          4. Set a Price (₹)
        </h2>

        <div className="max-w-xs">
          <label className="block text-xs font-semibold text-slate-700 mb-1">
            Asking Price in Rupees (Optional)
          </label>
          <div className="relative">
            <span className="absolute left-3.5 top-2.5 text-slate-500 font-bold text-sm">₹</span>
            <input
              type="number"
              value={price}
              onChange={(e) => onPriceChange(e.target.value)}
              placeholder="e.g. 850000 (leave blank if unspecified)"
              className="w-full text-base font-bold pl-8 pr-4 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none"
            />
          </div>
          {price !== undefined && price !== null && String(price).trim() !== '' ? (
            <span className="text-[11px] text-emerald-600 font-semibold mt-1 block">
              ₹{Number(price).toLocaleString('en-IN')}
            </span>
          ) : (
            <span className="text-[11px] text-slate-400 font-medium mt-1 block">
              Price on request (optional)
            </span>
          )}
        </div>
      </div>
    </>
  );
};
