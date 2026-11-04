import React from 'react';
import { FolderTree, ChevronDown, Tag } from 'lucide-react';
import { Category } from '@/lib/types';
import { NavLink } from '@/components/common/NavLink';
import { buildChillyUrl } from '@/lib/utils/seoAndUrlHelper';
import { ICONS_MAP } from './categoryIcons';

export interface CategoryTreeSidebarProps {
  categories: Category[];
  rootCategories: Category[];
  effectiveCity: string;
  effectiveCategory: string;
  effectiveSubcategory: string;
}

export const CategoryTreeSidebar: React.FC<CategoryTreeSidebarProps> = ({
  categories,
  rootCategories,
  effectiveCity,
  effectiveCategory,
  effectiveSubcategory,
}) => {
  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm space-y-4">
      <div className="border-b border-slate-100 pb-2.5">
        <h3 className="text-xs font-black text-slate-900 uppercase tracking-wider">
          All Categories
        </h3>
      </div>
      <div className="space-y-1">
        {/* Reset to Directory Option */}
        <NavLink
          href={buildChillyUrl({ city: effectiveCity, categories })}
          className="w-full text-left px-3 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2.5 cursor-pointer hover:bg-slate-50 text-slate-500"
        >
          <FolderTree className="w-4 h-4 text-slate-400" />
          <span>All Categories Directory</span>
        </NavLink>

        {rootCategories.map((cat) => {
          const IconComponent = ICONS_MAP[cat.icon || 'Tag'] || Tag;
          const isSelected = effectiveCategory === cat.id;
          const childSubs = categories.filter((c) => c.parentId === cat.id && c.isActive);
          const catTargetUrl = buildChillyUrl({
            city: effectiveCity,
            categoryId: cat.id,
            subcategoryId: 'all',
            categories,
          });

          return (
            <div key={cat.id} className="space-y-1">
              <NavLink
                href={catTargetUrl}
                className={`w-full text-left px-3 py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-between cursor-pointer ${
                  isSelected
                    ? 'bg-blue-50 text-blue-700 shadow-xs'
                    : 'text-slate-700 hover:bg-slate-50'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <div
                    className={`p-1 rounded-lg ${
                      isSelected
                        ? 'bg-blue-100 text-blue-700'
                        : 'bg-slate-100 text-slate-600'
                    }`}
                  >
                    <IconComponent className="w-3.5 h-3.5" />
                  </div>
                  <span>{cat.name}</span>
                </div>
                {childSubs.length > 0 && (
                  <ChevronDown
                    className={`w-3 h-3 transition-transform ${
                      isSelected ? 'rotate-180 text-blue-500' : 'text-slate-400'
                    }`}
                  />
                )}
              </NavLink>

              {/* Nested Subcategories List if Parent Category is Selected */}
              {isSelected && childSubs.length > 0 && (
                <div className="pl-6 pr-2 py-1 space-y-1 border-l-2 border-slate-100 ml-5 animate-in slide-in-from-top-1 duration-150">
                  <NavLink
                    href={catTargetUrl}
                    className={`w-full text-left py-1 text-[11px] font-semibold transition-colors flex items-center gap-1.5 cursor-pointer ${
                      effectiveSubcategory === 'all'
                        ? 'text-blue-600 font-bold'
                        : 'text-slate-500 hover:text-slate-800'
                    }`}
                  >
                    <span className="w-1.5 h-1.5 rounded-full bg-slate-300" />
                    <span>All in {cat.name}</span>
                  </NavLink>

                  {childSubs.map((sub) => {
                    const isSubSelected = effectiveSubcategory === sub.id;
                    const subTargetUrl = buildChillyUrl({
                      city: effectiveCity,
                      categoryId: cat.id,
                      subcategoryId: sub.id,
                      categories,
                    });
                    return (
                      <NavLink
                        key={sub.id}
                        href={subTargetUrl}
                        className={`w-full text-left py-1 text-[11px] font-semibold transition-colors flex items-center gap-1.5 cursor-pointer ${
                          isSubSelected
                            ? 'text-blue-600 font-bold'
                            : 'text-slate-500 hover:text-slate-800'
                        }`}
                      >
                        <span
                          className={`w-1.5 h-1.5 rounded-full ${
                            isSubSelected ? 'bg-blue-600' : 'bg-slate-300'
                          }`}
                        />
                        <span>{sub.name}</span>
                      </NavLink>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
