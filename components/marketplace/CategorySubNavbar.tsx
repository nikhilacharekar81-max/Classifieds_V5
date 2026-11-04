import React from 'react';
import { Category } from '@/lib/types';
import { buildChillyUrl } from '@/lib/utils/seoAndUrlHelper';
import { NavLink } from '@/components/common/NavLink';
import {
  CategorySubNavbarMenuIsland,
  CompactSubNavCategory,
} from './CategorySubNavbarMenuIsland';

interface CategorySubNavbarProps {
  currentCity?: string;
  activeCategoryId?: string;
  activeSubcategoryId?: string;
  categories?: Category[];
}

interface TrendingCategoryItem {
  label: string;
  categoryId: string;
  subcategoryId?: string;
}

const TRENDING_CATEGORIES: TrendingCategoryItem[] = [
  { label: 'Cars', categoryId: 'cat_cars', subcategoryId: 'sub_cars_cars' },
  { label: 'Motorcycles', categoryId: 'cat_bikes', subcategoryId: 'sub_bikes_motorcycles' },
  { label: 'Mobile Phones', categoryId: 'cat_mobiles', subcategoryId: 'sub_mob_phones' },
  {
    label: 'For Sale: Houses & Apartments',
    categoryId: 'cat_housing_realestate',
    subcategoryId: 'sub_house_apt_sale',
  },
  {
    label: 'For Rent: Houses & Apartments',
    categoryId: 'cat_housing_realestate',
    subcategoryId: 'sub_house_apt_rent',
  },
  {
    label: 'Beds - Wardrobes',
    categoryId: 'cat_furniture',
    subcategoryId: 'sub_furn_beds_wardrobes',
  },
  {
    label: 'TVs, Video - Audio',
    categoryId: 'cat_electronics',
    subcategoryId: 'sub_elec_tv',
  },
];

export const CategorySubNavbar: React.FC<CategorySubNavbarProps> = ({
  currentCity,
  activeCategoryId,
  activeSubcategoryId,
  categories = [],
}) => {
  const city = currentCity || 'All India';

  const rootCategories = categories.filter((c) => c.parentId === null);

  const navTree: CompactSubNavCategory[] = rootCategories.map((rootCat) => {
    const children = categories.filter((c) => c.parentId === rootCat.id);
    return {
      id: rootCat.id,
      name: rootCat.name,
      href: buildChillyUrl({
        city,
        categoryId: rootCat.id,
        subcategoryId: 'all',
        categories,
      }),
      children: children.map((sub) => ({
        id: sub.id,
        name: sub.name,
        href: buildChillyUrl({
          city,
          categoryId: rootCat.id,
          subcategoryId: sub.id,
          categories,
        }),
        isActive: activeCategoryId === rootCat.id && activeSubcategoryId === sub.id,
      })),
    };
  });

  const allDirectoryHref = buildChillyUrl({
    city,
    categoryId: 'all',
    subcategoryId: 'all',
    categories,
  });

  return (
    <div className="bg-white border-b border-[#dadce0] relative z-40">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 relative">
        {/* Navbar Container */}
        <div className="flex items-center gap-4 sm:gap-7">
          {/* "ALL CATEGORIES" Dropdown Trigger & Menu Island */}
          <CategorySubNavbarMenuIsland
            city={city}
            allDirectoryHref={allDirectoryHref}
            navTree={navTree}
            activeCategoryId={activeCategoryId}
            activeSubcategoryId={activeSubcategoryId}
          />

          {/* Fiverr-Style Horizontal Category Strip (Server-Rendered) */}
          <div className="flex-1 min-w-0 flex items-center gap-5 sm:gap-6 overflow-x-auto whitespace-nowrap scrollbar-none">
            {TRENDING_CATEGORIES.map((item) => {
              const isActive =
                activeCategoryId === item.categoryId &&
                (item.subcategoryId ? activeSubcategoryId === item.subcategoryId : true);
              const href = buildChillyUrl({
                city,
                categoryId: item.categoryId,
                subcategoryId: item.subcategoryId || 'all',
                categories,
              });

              return (
                <NavLink
                  key={item.label}
                  href={href}
                  className={`text-[13px] py-3 border-b-[3px] transition-all cursor-pointer shrink-0 select-none inline-flex items-center ${
                    isActive
                      ? 'border-[#1dbf73] text-[#202124] font-semibold'
                      : 'border-transparent text-[#62646a] hover:text-[#202124] hover:border-[#1dbf73]/60 font-medium'
                  }`}
                >
                  <span>{item.label}</span>
                </NavLink>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};
