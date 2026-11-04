'use client';
import React from 'react';
import { Tag, CornerDownRight, CheckCircle2 } from 'lucide-react';
import { Category } from '@/lib/types';
import { getCategoryIcon } from '../categoryIcons';

interface CategoryStepSectionProps {
  categories: Category[];
  rootCategories: Category[];
  currentSubcategories: Category[];
  selectedCategory?: Category;
  selectedSubcategory?: Category;
  categoryId: string;
  subcategoryId: string;
  onSelectCategory: (catId: string, defaultSubId: string) => void;
  onSelectSubcategory: (subId: string) => void;
}

export const CategoryStepSection: React.FC<CategoryStepSectionProps> = ({
  categories,
  rootCategories,
  currentSubcategories,
  selectedCategory,
  selectedSubcategory,
  categoryId,
  subcategoryId,
  onSelectCategory,
  onSelectSubcategory,
}) => {
  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-5">
      <div className="flex items-center justify-between border-b border-slate-100 pb-2">
        <h2 className="text-sm font-bold uppercase tracking-wider text-slate-600 flex items-center gap-2">
          <Tag className="w-4 h-4 text-blue-600" />
          1. Select Category & Subcategory
        </h2>
        {selectedCategory && (
          <span className="text-xs font-semibold text-blue-600 bg-blue-50 px-2.5 py-1 rounded-full">
            {selectedCategory.name}
            {selectedSubcategory && ` › ${selectedSubcategory.name}`}
          </span>
        )}
      </div>

      {/* Step 1A: Parent Category Selector */}
      <div>
        <label className="block text-xs font-bold text-slate-700 mb-2">
          Select Department / Main Category *
        </label>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2.5">
          {rootCategories.map((cat) => {
            const isSelected = categoryId === cat.id;
            const IconComp = getCategoryIcon(cat.icon);
            const subCount = categories.filter((c) => c.parentId === cat.id).length;

            return (
              <button
                key={cat.id}
                type="button"
                onClick={() => {
                  const childSubs = categories.filter((c) => c.parentId === cat.id && c.isActive);
                  onSelectCategory(cat.id, childSubs[0]?.id || '');
                }}
                className={`p-3 rounded-xl border text-center flex flex-col items-center justify-center gap-1.5 transition-all cursor-pointer ${
                  isSelected
                    ? 'border-blue-600 bg-blue-50 ring-2 ring-blue-500/20 text-blue-950 font-bold shadow-xs'
                    : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50 text-slate-700'
                }`}
              >
                <div className={`p-2 rounded-lg ${isSelected ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-600'}`}>
                  <IconComp className="w-4 h-4" />
                </div>
                <span className="text-[11px] leading-tight font-bold">{cat.name}</span>
                {subCount > 0 && (
                  <span className="text-[9px] text-slate-400 font-normal">
                    {subCount} subcategories
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Step 1B: Subcategory Selector */}
      {currentSubcategories.length > 0 && (
        <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2.5 animate-in fade-in duration-150">
          <label className="block text-xs font-bold text-slate-800 flex items-center gap-1.5">
            <CornerDownRight className="w-4 h-4 text-blue-600" />
            Select Specific Subcategory for <span className="text-blue-600">{selectedCategory?.name}</span> *
          </label>
          <div className="flex flex-wrap gap-2">
            {currentSubcategories.map((sub) => {
              const isSubSelected = subcategoryId === sub.id;
              const SubIcon = getCategoryIcon(sub.icon);

              return (
                <button
                  key={sub.id}
                  type="button"
                  onClick={() => onSelectSubcategory(sub.id)}
                  className={`px-3 py-2 rounded-lg text-xs flex items-center gap-2 transition-all cursor-pointer ${
                    isSubSelected
                      ? 'bg-blue-600 text-white font-bold shadow-sm ring-2 ring-blue-500/30'
                      : 'bg-white border border-slate-300 hover:border-slate-400 text-slate-800 font-medium'
                  }`}
                >
                  <SubIcon className={`w-3.5 h-3.5 ${isSubSelected ? 'text-white' : 'text-slate-500'}`} />
                  <span>{sub.name}</span>
                  {isSubSelected && <CheckCircle2 className="w-3.5 h-3.5" />}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
