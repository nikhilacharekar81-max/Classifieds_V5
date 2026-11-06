'use client';
import React, { useState, useEffect } from 'react';
import { useApp } from '@/context/AppContext';
import {
  Search,
  Sun,
  Moon,
  ExternalLink,
  Globe,
  Shield,
  Code2,
  Bell,
  ChevronDown,
  UserCheck,
  Check,
  LogOut,
  Menu,
} from 'lucide-react';
import { Role } from '@/lib/types';
import { navigateTo } from '@/lib/router/useRouter';

export const AdminHeader: React.FC = () => {
  const {
    activeSidebarTab,
    theme,
    toggleTheme,
    setViewMode,
    currentAdmin,
    switchAdminRole,
    impersonatedUser,
    exitImpersonation,
    mobileSidebarOpen,
    setMobileSidebarOpen,
  } = useApp();

  const [roleDropdownOpen, setRoleDropdownOpen] = useState(false);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        navigateTo('/admin/search');
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  if (!currentAdmin) {
    return null;
  }

  const rolesList: { role: Role; label: string; desc: string }[] = [
    { role: 'super_admin', label: 'Super Admin', desc: 'Full administrative access & system config' },
    { role: 'admin', label: 'Admin', desc: 'Standard administrative access' },
    { role: 'moderator', label: 'Moderator', desc: 'Listing approvals, reports & user sanctions' },
    { role: 'finance_user', label: 'Finance User', desc: 'Orders, refunds, tax config & invoices' },
  ];

  const formatBreadcrumb = (tab: string) => {
    const parts = tab.split('/');
    return parts.map((p) => p.charAt(0).toUpperCase() + p.slice(1)).join(' / ');
  };

  return (
    <header className="bg-white dark:bg-[#1e1f22] border-b border-[#dadce0] dark:border-slate-800 sticky top-0 z-30 transition-colors">
      {/* Google Cloud 4-Color Signature Top Accent Hairline */}
      <div className="h-[3px] w-full flex">
        <div className="flex-1 bg-[#4285F4]" />
        <div className="flex-1 bg-[#EA4335]" />
        <div className="flex-1 bg-[#FBBC05]" />
        <div className="flex-1 bg-[#34A853]" />
      </div>

      {/* Impersonation Banner Alert */}
      {impersonatedUser && (
        <div className="h-8 bg-[#fef7e0] dark:bg-amber-950/80 border-b border-[#feefc3] dark:border-amber-800 text-[#b06000] dark:text-amber-200 text-xs font-medium px-4 flex items-center justify-between z-40">
          <div className="flex items-center gap-2">
            <Shield className="w-3.5 h-3.5" />
            <span>
              IAM Impersonation Active: <strong>{impersonatedUser.name}</strong> ({impersonatedUser.email})
            </span>
          </div>
          <button
            onClick={exitImpersonation}
            className="px-2.5 py-0.5 bg-[#1a73e8] text-white text-[11px] font-medium rounded hover:bg-[#1557b0] transition-colors cursor-pointer"
          >
            End Session
          </button>
        </div>
      )}

      <div className="h-14 px-3 sm:px-5 flex items-center justify-between gap-3">
        {/* Left: Cloud Console Menu + Project Selector + Breadcrumb */}
        <div className="flex items-center gap-2.5 min-w-0">
          <button
            onClick={() => setMobileSidebarOpen(!mobileSidebarOpen)}
            className="md:hidden p-1.5 rounded-md border border-[#dadce0] dark:border-slate-700 text-[#5f6368] dark:text-slate-200 hover:bg-[#f1f3f4] dark:hover:bg-slate-800 shrink-0"
            aria-label="Toggle Navigation Sidebar"
          >
            <Menu className="w-5 h-5" />
          </button>

          {/* Google Cloud Style Project Selector Box */}
          <div className="hidden sm:flex items-center gap-2 px-2.5 py-1 rounded-md border border-[#dadce0] dark:border-slate-700 bg-[#f8f9fa] dark:bg-slate-800/80 text-xs font-medium text-[#3c4043] dark:text-slate-200 shrink-0">
            <span className="w-2 h-2 rounded-xs bg-[#1a73e8]" />
            <span className="font-semibold tracking-tight">chillyads-cloud</span>
            <ChevronDown className="w-3.5 h-3.5 text-[#5f6368]" />
          </div>

          <span className="hidden sm:inline text-[#dadce0] dark:text-slate-700">/</span>

          <h1 className="text-sm sm:text-base font-semibold text-[#202124] dark:text-white tracking-tight truncate max-w-[140px] sm:max-w-none">
            {formatBreadcrumb(activeSidebarTab)}
          </h1>
        </div>

        {/* Center: Google Cloud Console Global Search Bar */}
        <div className="hidden md:flex flex-1 max-w-md mx-4">
          <button
            onClick={() => navigateTo('/admin/search')}
            className="w-full flex items-center justify-between gap-2 px-3 py-1.5 rounded-md border border-[#dadce0] dark:border-slate-700 bg-[#f1f3f4] dark:bg-slate-800/70 hover:bg-white dark:hover:bg-slate-800 hover:shadow-xs text-[#5f6368] dark:text-slate-300 text-xs transition-all cursor-pointer group"
          >
            <div className="flex items-center gap-2 truncate">
              <Search className="w-4 h-4 text-[#5f6368] group-hover:text-[#1a73e8] shrink-0" />
              <span className="truncate">Search resources, listings, users, and policies</span>
            </div>
            <kbd className="text-[10px] font-mono bg-white dark:bg-slate-700 border border-[#dadce0] dark:border-slate-600 px-1.5 py-0.5 rounded text-[#5f6368] dark:text-slate-300 shrink-0">
              ⌘K
            </kbd>
          </button>
        </div>

        {/* Right: Cloud Console Utilities & IAM Profile */}
        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
          <button
            onClick={() => navigateTo('/admin/search')}
            className="md:hidden p-1.5 rounded-md border border-[#dadce0] dark:border-slate-700 text-[#5f6368] dark:text-slate-300 hover:bg-[#f1f3f4]"
            aria-label="Search"
          >
            <Search className="w-4 h-4" />
          </button>

          {/* Switch to Fiverr-Style Live Marketplace */}
          <button
            onClick={() => navigateTo('/')}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-[#1dbf73] hover:bg-[#19a463] text-white text-xs font-semibold transition-colors whitespace-nowrap cursor-pointer shrink-0"
            title="Open Live Marketplace"
          >
            <Globe className="w-3.5 h-3.5 shrink-0" />
            <span>Live Marketplace</span>
          </button>

          <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md border border-[#dadce0] dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-medium text-[#3c4043] dark:text-slate-200 shrink-0">
            <Shield className="w-3.5 h-3.5 text-[#1a73e8] shrink-0" />
            <span className="capitalize hidden lg:inline">{currentAdmin.role.replace('_', ' ')}</span>
          </div>

          {/* Theme Toggle */}
          <button
            onClick={toggleTheme}
            aria-label="Toggle theme"
            className="p-1.5 rounded-md border border-[#dadce0] dark:border-slate-700 text-[#5f6368] dark:text-slate-300 hover:bg-[#f1f3f4] dark:hover:bg-slate-800 transition-colors shrink-0 cursor-pointer"
          >
            {theme === 'light' ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4 text-amber-400" />}
          </button>

          {/* Log Out Button */}
          <button
            onClick={() => navigateTo('/')}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-md border border-[#dadce0] dark:border-slate-700 text-[#3c4043] dark:text-slate-200 hover:bg-[#f1f3f4] dark:hover:bg-slate-800 text-xs font-medium transition-colors cursor-pointer whitespace-nowrap shrink-0"
            title="Exit Console"
          >
            <LogOut className="w-3.5 h-3.5 text-[#5f6368] shrink-0" />
            <span className="hidden xl:inline">Exit</span>
          </button>

          {/* Current Admin User Profile */}
          <div className="flex items-center gap-2 pl-2 border-l border-[#dadce0] dark:border-slate-800">
            <img
              src={currentAdmin.avatar}
              alt={currentAdmin.name}
              referrerPolicy="no-referrer"
              className="w-7 h-7 rounded-full object-cover border border-[#dadce0] dark:border-slate-700"
            />
            <div className="hidden lg:block text-left text-xs">
              <div className="font-medium text-[#202124] dark:text-white leading-tight">
                {currentAdmin.name}
              </div>
              <div className="text-[10px] text-[#5f6368] dark:text-slate-400 truncate max-w-[120px]">
                {currentAdmin.email}
              </div>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};

