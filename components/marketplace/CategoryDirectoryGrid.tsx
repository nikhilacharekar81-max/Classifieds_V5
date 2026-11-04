import React from 'react';
import {
  Wrench,
  Car,
  Briefcase,
  Building2,
  Package,
  Users,
  Heart,
  PawPrint,
  Smartphone,
  Tv,
  Armchair,
  Bike,
  Shirt,
  BookOpen,
  Truck,
  Tag,
  Layers,
} from 'lucide-react';
import { Category } from '@/lib/types';
import { buildChillyUrl } from '@/lib/utils/seoAndUrlHelper';
import {
  CategoryDirectoryClientShell,
  CompactDirectoryCategoryItem,
} from './CategoryDirectoryClientShell';

interface CategoryDirectoryGridProps {
  categories: Category[];
  currentCity?: string;
  onSelectCategory?: (categoryId: string) => void;
  onSelectSubcategory?: (categoryId: string, subcategoryId: string) => void;
  selectedCategoryId?: string;
  selectedSubcategoryId?: string;
  isCountsLoading?: boolean;
  variant?: 'marketplace' | 'admin' | 'standalone';
  className?: string;
}

const ICONS_MAP: Record<string, React.FC<{ className?: string }>> = {
  Wrench,
  Car,
  Briefcase,
  Building2,
  Package,
  Users,
  Heart,
  PawPrint,
  Smartphone,
  Tv,
  Armchair,
  Bike,
  Shirt,
  BookOpen,
  Truck,
  Tag,
  Layers,
};

export const CategoryDirectoryGrid: React.FC<CategoryDirectoryGridProps> = ({
  categories,
  currentCity = 'All India',
  onSelectCategory,
  onSelectSubcategory,
  selectedCategoryId,
  selectedSubcategoryId,
  isCountsLoading = false,
  className = '',
}) => {
  const rootCategories = categories
    .filter((c) => !c.parentId && c.isActive)
    .sort((a, b) => a.order - b.order);

  const items: CompactDirectoryCategoryItem[] = rootCategories.map((cat) => {
    const subs = categories
      .filter((c) => c.parentId === cat.id && c.isActive)
      .sort((a, b) => a.order - b.order);

    const totalLiveAds = cat.listingCount || 0;
    const catUrl = buildChillyUrl({
      city: currentCity,
      categoryId: cat.id,
      subcategoryId: 'all',
      categories,
    });

    const compactSubs = subs.map((sub) => ({
      id: sub.id,
      name: sub.name,
      slug: sub.slug,
      url: buildChillyUrl({
        city: currentCity,
        categoryId: cat.id,
        subcategoryId: sub.id,
        categories,
      }),
      count: sub.listingCount || 0,
      isSelected: selectedSubcategoryId === sub.id,
    }));

    return {
      id: cat.id,
      name: cat.name,
      slug: cat.slug,
      catUrl,
      isSelected: selectedCategoryId === cat.id,
      totalSubCount: subs.length,
      totalLiveAds,
      subcategories: compactSubs,
    };
  });

  const totalAllSubs = items.reduce((sum, item) => sum + item.totalSubCount, 0);

  const categoryIcons: Record<string, React.ReactNode> = Object.fromEntries(
    rootCategories.map((cat) => {
      const IconComp = ICONS_MAP[cat.icon] || Layers;
      return [
        cat.id,
        <IconComp
          key={cat.id}
          className="w-5 h-5 text-[#3c4043] group-hover:text-[#1dbf73] transition-colors"
        />,
      ];
    })
  );

  const displayCity = currentCity && currentCity !== 'All India' ? currentCity : 'India';

  return (
    <CategoryDirectoryClientShell
      items={items}
      categoryIcons={categoryIcons}
      rootCategoriesCount={rootCategories.length}
      totalAllSubs={totalAllSubs}
      displayCity={displayCity}
      isCountsLoading={isCountsLoading}
      onSelectCategory={onSelectCategory}
      onSelectSubcategory={onSelectSubcategory}
      className={className}
    />
  );
};
