'use client';
import React from 'react';

interface BadgeProps {
  variant?: 'success' | 'warning' | 'danger' | 'info' | 'purple' | 'neutral';
  children: React.ReactNode;
  size?: 'sm' | 'md';
  className?: string;
}

export const Badge: React.FC<BadgeProps> = ({
  variant = 'neutral',
  children,
  size = 'sm',
  className = '',
}) => {
  const sizeStyles = size === 'sm' ? 'px-2 py-0.5 text-xs' : 'px-2.5 py-1 text-xs';

  const variantStyles = {
    success: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20',
    warning: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20',
    danger: 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20',
    info: 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20',
    purple: 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20',
    neutral: 'bg-slate-500/10 text-slate-600 dark:text-slate-400 border border-slate-500/20',
  }[variant];

  return (
    <span className={`inline-flex items-center gap-1 font-medium rounded-md tracking-tight whitespace-nowrap ${sizeStyles} ${variantStyles} ${className}`}>
      {children}
    </span>
  );
};
