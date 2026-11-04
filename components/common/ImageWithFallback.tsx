'use client';
import React, { useState, useRef, useEffect } from 'react';
import {
  Wrench,
  Car,
  Bike,
  Smartphone,
  Home,
  Briefcase,
  GraduationCap,
  Heart,
  ImageOff,
} from 'lucide-react';

interface ImageWithFallbackProps {
  src: string;
  alt: string;
  categoryId?: string;
  className?: string;
  style?: React.CSSProperties;
  priority?: boolean;
}

export const BROKEN_UNSPLASH_REPLACEMENTS: Record<string, string> = {
  '1586191582056-a36a297921c5': '1601584115197-04ecc0da31d7',
  '1580481072645-022f9a6d83d0': '1555041469-a586c61ea9bc',
  '1626225967045-94408422617d': '1576678927484-cc907957088c',
  '1534536281715-e28d7674177d': '1521791136064-7986c2920216',
  '1590362891988-f778047831d6': '1549399542-7e3f8b79c341',
  '1581094288338-2314dddb7eed': '1621905251189-08b45d6a269e',
  '1523050854058-8df90110c9f1': '1434030216411-0b793f4b4173',
  '1525609004556-c46c7d6cf0a3': '1552519507-da3b142c6e3d',
  '1496181130204-755241544e35': '1517336714731-489689fd1ca8',
  '1588449668338-dec4187fb31d': '1505740420928-5e560c06d30e',
  '1524704659690-3f8031201b33': '1552053831-71594a27632d',
};

const CATEGORY_BACKUP_IMAGE_URLS: Record<string, string> = {
  cat_services: 'https://images.unsplash.com/photo-1621905251189-08b45d6a269e?w=800&auto=format&fit=crop&q=80',
  cat_vehicles: 'https://images.unsplash.com/photo-1549399542-7e3f8b79c341?w=800&auto=format&fit=crop&q=80',
  cat_cars: 'https://images.unsplash.com/photo-1549399542-7e3f8b79c341?w=800&auto=format&fit=crop&q=80',
  cat_bikes: 'https://images.unsplash.com/photo-1558981403-c5f9899a28bc?w=800&auto=format&fit=crop&q=80',
  cat_electronics: 'https://images.unsplash.com/photo-1517336714731-489689fd1ca8?w=800&auto=format&fit=crop&q=80',
  cat_mobiles: 'https://images.unsplash.com/photo-1695048133142-1a20484d2569?w=800&auto=format&fit=crop&q=80',
  cat_real_estate: 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=800&auto=format&fit=crop&q=80',
  cat_housing_realestate: 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=800&auto=format&fit=crop&q=80',
  cat_properties: 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=800&auto=format&fit=crop&q=80',
  cat_jobs: 'https://images.unsplash.com/photo-1498050108023-c5249f4df085?w=800&auto=format&fit=crop&q=80',
  cat_furniture: 'https://images.unsplash.com/photo-1555041469-a586c61ea9bc?w=800&auto=format&fit=crop&q=80',
  cat_fashion: 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=800&auto=format&fit=crop&q=80',
  cat_pets: 'https://images.unsplash.com/photo-1552053831-71594a27632d?w=800&auto=format&fit=crop&q=80',
  cat_books_sports: 'https://images.unsplash.com/photo-1576678927484-cc907957088c?w=800&auto=format&fit=crop&q=80',
  cat_commercial: 'https://images.unsplash.com/photo-1601584115197-04ecc0da31d7?w=800&auto=format&fit=crop&q=80',
};

export function normalizeImageUrl(rawSrc: string): string {
  if (!rawSrc) return '';
  let normalized = rawSrc;
  for (const [brokenId, validId] of Object.entries(BROKEN_UNSPLASH_REPLACEMENTS)) {
    if (normalized.includes(brokenId)) {
      normalized = normalized.replace(brokenId, validId);
    }
  }
  return normalized;
}

const CATEGORY_FALLBACKS: Record<string, { icon: React.ComponentType<any>; bg: string; text: string }> = {
  cat_services: {
    icon: Wrench,
    bg: 'from-blue-50 to-indigo-100 dark:from-blue-950/40 dark:to-indigo-950/40',
    text: 'text-blue-600 dark:text-blue-400',
  },
  cat_vehicles: {
    icon: Car,
    bg: 'from-emerald-50 to-teal-100 dark:from-emerald-950/40 dark:to-teal-950/40',
    text: 'text-emerald-600 dark:text-emerald-400',
  },
  cat_cars: {
    icon: Car,
    bg: 'from-emerald-50 to-teal-100 dark:from-emerald-950/40 dark:to-teal-950/40',
    text: 'text-emerald-600 dark:text-emerald-400',
  },
  cat_bikes: {
    icon: Bike,
    bg: 'from-teal-50 to-cyan-100 dark:from-teal-950/40 dark:to-cyan-950/40',
    text: 'text-teal-600 dark:text-teal-400',
  },
  cat_electronics: {
    icon: Smartphone,
    bg: 'from-purple-50 to-fuchsia-100 dark:from-purple-950/40 dark:to-fuchsia-950/40',
    text: 'text-purple-600 dark:text-purple-400',
  },
  cat_mobiles: {
    icon: Smartphone,
    bg: 'from-purple-50 to-fuchsia-100 dark:from-purple-950/40 dark:to-fuchsia-950/40',
    text: 'text-purple-600 dark:text-purple-400',
  },
  cat_real_estate: {
    icon: Home,
    bg: 'from-amber-50 to-orange-100 dark:from-amber-950/40 dark:to-orange-950/40',
    text: 'text-amber-600 dark:text-amber-400',
  },
  cat_housing_realestate: {
    icon: Home,
    bg: 'from-amber-50 to-orange-100 dark:from-amber-950/40 dark:to-orange-950/40',
    text: 'text-amber-600 dark:text-amber-400',
  },
  cat_jobs: {
    icon: Briefcase,
    bg: 'from-sky-50 to-blue-100 dark:from-sky-950/40 dark:to-blue-950/40',
    text: 'text-sky-600 dark:text-sky-400',
  },
  cat_education: {
    icon: GraduationCap,
    bg: 'from-indigo-50 to-violet-100 dark:from-indigo-950/40 dark:to-violet-950/40',
    text: 'text-indigo-600 dark:text-indigo-400',
  },
  cat_health: {
    icon: Heart,
    bg: 'from-rose-50 to-pink-100 dark:from-rose-950/40 dark:to-pink-950/40',
    text: 'text-rose-600 dark:text-rose-400',
  },
};

export const ImageWithFallback: React.FC<ImageWithFallbackProps> = ({
  src,
  alt,
  categoryId = 'all',
  className = '',
  style,
  priority = false,
}) => {
  const backupCategoryUrl =
    CATEGORY_BACKUP_IMAGE_URLS[categoryId] ||
    'https://images.unsplash.com/photo-1549399542-7e3f8b79c341?w=800&auto=format&fit=crop&q=80';
  const primarySrc = normalizeImageUrl(src) || backupCategoryUrl;
  const [currentSrc, setCurrentSrc] = useState<string>(primarySrc);
  const [completelyFailed, setCompletelyFailed] = useState<boolean>(false);
  const imgRef = useRef<HTMLImageElement | null>(null);

  useEffect(() => {
    setCurrentSrc(normalizeImageUrl(src) || backupCategoryUrl);
    setCompletelyFailed(false);
  }, [src, backupCategoryUrl]);

  useEffect(() => {
    const img = imgRef.current;
    if (img && img.complete && img.naturalWidth === 0 && currentSrc) {
      if (currentSrc !== backupCategoryUrl) {
        setCurrentSrc(backupCategoryUrl);
      } else {
        setCompletelyFailed(true);
      }
    }
  }, [currentSrc, backupCategoryUrl]);

  if (!currentSrc || completelyFailed) {
    const fallback = CATEGORY_FALLBACKS[categoryId] || {
      icon: ImageOff,
      bg: 'from-slate-50 to-slate-100 dark:from-slate-900/60 dark:to-slate-950/60',
      text: 'text-slate-400 dark:text-slate-500',
    };

    const IconComponent = fallback.icon;

    return (
      <div
        className={`flex flex-col items-center justify-center bg-gradient-to-br ${fallback.bg} border border-slate-100 dark:border-slate-800/40 select-none ${className}`}
        style={style}
      >
        <div
          className={`p-3 rounded-full bg-white dark:bg-slate-900 shadow-xs border border-slate-100/55 dark:border-slate-800/60 ${fallback.text} mb-2`}
        >
          <IconComponent className="w-6 h-6" strokeWidth={1.8} />
        </div>
        <span className="text-[10px] font-bold tracking-wider uppercase text-slate-500 dark:text-slate-400">
          Chillyads
        </span>
      </div>
    );
  }

  return (
    <img
      ref={imgRef}
      src={currentSrc}
      alt={alt}
      referrerPolicy="no-referrer"
      loading={priority ? 'eager' : 'lazy'}
      fetchPriority={priority ? 'high' : 'auto'}
      decoding="async"
      onError={() => {
        if (currentSrc !== backupCategoryUrl) {
          setCurrentSrc(backupCategoryUrl);
        } else {
          setCompletelyFailed(true);
        }
      }}
      className={className}
      style={style}
    />
  );
};
