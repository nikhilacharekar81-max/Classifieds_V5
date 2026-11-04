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
  Tag,
  Layers,
} from 'lucide-react';

export const ICONS_MAP: Record<string, React.FC<{ className?: string }>> = {
  Wrench,
  Car,
  Briefcase,
  Building2,
  Package,
  PackageIcon: Package,
  Users,
  Heart,
  PawPrint,
  Smartphone,
  Tv,
  Armchair,
  Bike,
  Shirt,
  BookOpen,
  Tag,
  Layers,
};

export function getCategoryIcon(iconName?: string): React.FC<{ className?: string }> {
  return (iconName && ICONS_MAP[iconName]) || Layers;
}
