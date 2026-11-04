'use client';
import React, { useState, useMemo } from 'react';
import { useApp } from '@/context/AppContext';
import {
  Search,
  ArrowLeft,
  ShoppingBag,
  Users,
  Layers,
  LayoutDashboard,
  Shield,
  CreditCard,
  Settings,
  ExternalLink,
} from 'lucide-react';
import { Badge } from '@/components/common/Badge';
import { navigateTo } from '@/lib/router/useRouter';

export const GlobalSearchPage: React.FC = () => {
  const { listings, users, categories } = useApp();
  const [query, setQuery] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'listings' | 'users' | 'categories' | 'pages'>('all');

  const navigationPages = [
    { title: 'Dashboard Overview', path: '/admin/dashboard', icon: LayoutDashboard, category: 'Analytics' },
    { title: 'Classifieds Listings', path: '/admin/marketplace/listings', icon: ShoppingBag, category: 'Marketplace' },
    { title: 'Pending Moderation Queue', path: '/admin/marketplace/pending', icon: Shield, category: 'Moderation' },
    { title: 'Categories Management', path: '/admin/marketplace/categories', icon: Layers, category: 'Marketplace' },
    { title: 'Dynamic Attributes & EAV', path: '/admin/marketplace/attributes', icon: Settings, category: 'Marketplace' },
    { title: 'User Accounts & KYC', path: '/admin/users/all', icon: Users, category: 'Users' },
    { title: 'KYC Verification Queue', path: '/admin/users/verification', icon: Shield, category: 'Users' },
    { title: 'Moderation & Blacklists', path: '/admin/moderation', icon: Shield, category: 'Safety' },
    { title: 'Packages & Monetization', path: '/admin/commerce', icon: CreditCard, category: 'Billing' },
    { title: 'Laravel 11 & MySQL Specs', path: '/admin/laravel-specs', icon: Settings, category: 'Developer' },
  ];

  const filteredResults = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) {
      return {
        listings: listings.slice(0, 4),
        users: users.slice(0, 4),
        categories: categories.slice(0, 4),
        pages: navigationPages.slice(0, 4),
      };
    }

    return {
      listings: listings.filter(
        (l) =>
          l.title.toLowerCase().includes(q) ||
          l.location.city.toLowerCase().includes(q) ||
          l.id.toLowerCase().includes(q)
      ),
      users: users.filter(
        (u) =>
          u.name.toLowerCase().includes(q) ||
          u.email.toLowerCase().includes(q) ||
          u.phone.includes(q) ||
          u.id.toLowerCase().includes(q)
      ),
      categories: categories.filter(
        (c) => c.name.toLowerCase().includes(q) || c.slug.toLowerCase().includes(q)
      ),
      pages: navigationPages.filter((p) => p.title.toLowerCase().includes(q) || p.category.toLowerCase().includes(q)),
    };
  }, [query, listings, users, categories]);

  const totalResults =
    filteredResults.listings.length +
    filteredResults.users.length +
    filteredResults.categories.length +
    filteredResults.pages.length;

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6 animate-in fade-in duration-150">
      {/* Header & Back */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200 dark:border-slate-800">
        <div>
          <div className="flex items-center gap-2 text-xs text-slate-500 mb-1">
            <button
              onClick={() => navigateTo('/admin/dashboard')}
              className="hover:text-blue-600 flex items-center gap-1 font-medium"
            >
              <ArrowLeft className="w-3.5 h-3.5" /> Back to Dashboard
            </button>
            <span>/</span>
            <span>Global Search</span>
          </div>
          <h1 className="text-xl font-bold text-slate-900 dark:text-white tracking-tight">
            Universal Classifieds Search & Quick Actions
          </h1>
        </div>

        <span className="text-xs font-mono bg-slate-100 dark:bg-slate-800 text-slate-500 px-3 py-1 rounded-lg">
          URL: #/admin/search
        </span>
      </div>

      {/* Big Search Bar */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-4 shadow-sm space-y-3">
        <div className="relative">
          <Search className="w-5 h-5 text-slate-400 absolute left-4 top-3.5" />
          <input
            type="text"
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search classified ads by title, phone, city, user accounts, KYC status, or categories..."
            className="w-full pl-12 pr-4 py-3 text-sm bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none text-slate-900 dark:text-white"
          />
          {query && (
            <button
              onClick={() => setQuery('')}
              className="absolute right-4 top-3 text-xs text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
            >
              Clear
            </button>
          )}
        </div>

        {/* Filter Pills */}
        <div className="flex flex-wrap gap-2 pt-1 text-xs">
          {[
            { id: 'all', label: `All Results (${totalResults})` },
            { id: 'listings', label: `Listings (${filteredResults.listings.length})` },
            { id: 'users', label: `Users & KYC (${filteredResults.users.length})` },
            { id: 'categories', label: `Categories (${filteredResults.categories.length})` },
            { id: 'pages', label: `Admin Pages (${filteredResults.pages.length})` },
          ].map((pill) => (
            <button
              key={pill.id}
              onClick={() => setFilterType(pill.id as any)}
              className={`px-3 py-1 rounded-lg font-medium transition-colors ${
                filterType === pill.id
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
              }`}
            >
              {pill.label}
            </button>
          ))}
        </div>
      </div>

      {/* Results Columns */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Listings Group */}
        {(filterType === 'all' || filterType === 'listings') && (
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 shadow-sm space-y-3">
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center justify-between">
              <span>Classified Listings ({filteredResults.listings.length})</span>
              <ShoppingBag className="w-4 h-4 text-blue-500" />
            </h2>

            <div className="space-y-2">
              {filteredResults.listings.length === 0 ? (
                <p className="text-xs text-slate-400 py-2">No matching listings found.</p>
              ) : (
                filteredResults.listings.map((item) => (
                  <div
                    key={item.id}
                    onClick={() => navigateTo(`/item/${item.id}`)}
                    className="p-2.5 rounded-xl border border-slate-100 dark:border-slate-800 hover:border-blue-500/40 hover:bg-slate-50 dark:hover:bg-slate-800/50 cursor-pointer flex items-center gap-3 transition-all group"
                  >
                    <img
                      src={item.images[0]}
                      alt={item.title}
                      className="w-12 h-12 rounded-lg object-cover bg-slate-800 shrink-0"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="font-bold text-xs text-slate-900 dark:text-white truncate group-hover:text-blue-500 transition-colors">
                        {item.title}
                      </div>
                      <div className="text-[11px] text-slate-400 flex items-center gap-2 mt-0.5">
                        <span className="font-semibold text-emerald-600">
                          ₹{item.price.toLocaleString('en-IN')}
                        </span>
                        <span>•</span>
                        <span>{item.location.city}</span>
                        <span>•</span>
                        <span className="font-mono text-[10px]">#{item.id}</span>
                      </div>
                    </div>
                    <Badge variant={item.status === 'approved' ? 'success' : item.status === 'pending' ? 'warning' : 'danger'}>
                      {item.status}
                    </Badge>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* Users & KYC Group */}
        {(filterType === 'all' || filterType === 'users') && (
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 shadow-sm space-y-3">
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center justify-between">
              <span>User Accounts & KYC ({filteredResults.users.length})</span>
              <Users className="w-4 h-4 text-emerald-500" />
            </h2>

            <div className="space-y-2">
              {filteredResults.users.length === 0 ? (
                <p className="text-xs text-slate-400 py-2">No matching users found.</p>
              ) : (
                filteredResults.users.map((user) => (
                  <div
                    key={user.id}
                    onClick={() => {
                      if (user.kycStatus === 'pending') {
                        navigateTo(`/admin/users/kyc/${user.id}`);
                      } else {
                        navigateTo('/admin/users/all');
                      }
                    }}
                    className="p-2.5 rounded-xl border border-slate-100 dark:border-slate-800 hover:border-emerald-500/40 hover:bg-slate-50 dark:hover:bg-slate-800/50 cursor-pointer flex items-center gap-3 transition-all group"
                  >
                    <img
                      src={user.avatar}
                      alt={user.name}
                      className="w-10 h-10 rounded-full object-cover border border-slate-200 shrink-0"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="font-bold text-xs text-slate-900 dark:text-white truncate group-hover:text-emerald-500 transition-colors">
                        {user.name}
                      </div>
                      <div className="text-[11px] text-slate-400 truncate mt-0.5">
                        {user.email} • {user.phone}
                      </div>
                    </div>
                    <div className="text-right">
                      <Badge variant={user.kycStatus === 'verified' ? 'success' : user.kycStatus === 'pending' ? 'warning' : 'neutral'}>
                        KYC: {user.kycStatus}
                      </Badge>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* Categories Group */}
        {(filterType === 'all' || filterType === 'categories') && (
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 shadow-sm space-y-3">
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center justify-between">
              <span>Categories ({filteredResults.categories.length})</span>
              <Layers className="w-4 h-4 text-purple-500" />
            </h2>

            <div className="space-y-2">
              {filteredResults.categories.length === 0 ? (
                <p className="text-xs text-slate-400 py-2">No matching categories found.</p>
              ) : (
                filteredResults.categories.map((cat) => (
                  <div
                    key={cat.id}
                    onClick={() => navigateTo(`/admin/marketplace/categories/edit/${cat.id}`)}
                    className="p-2.5 rounded-xl border border-slate-100 dark:border-slate-800 hover:border-purple-500/40 hover:bg-slate-50 dark:hover:bg-slate-800/50 cursor-pointer flex items-center justify-between transition-all group"
                  >
                    <div>
                      <div className="font-bold text-xs text-slate-900 dark:text-white group-hover:text-purple-500 transition-colors">
                        {cat.name}
                      </div>
                      <span className="text-[10px] text-slate-400 font-mono">
                        Slug: /{cat.slug} • {cat.listingCount} listings
                      </span>
                    </div>
                    <span className="text-xs text-blue-600 font-semibold group-hover:underline flex items-center gap-1">
                      Edit <ExternalLink className="w-3 h-3" />
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* Admin Navigation Group */}
        {(filterType === 'all' || filterType === 'pages') && (
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 shadow-sm space-y-3">
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center justify-between">
              <span>Admin Page Routes ({filteredResults.pages.length})</span>
              <LayoutDashboard className="w-4 h-4 text-amber-500" />
            </h2>

            <div className="space-y-2">
              {filteredResults.pages.map((pg) => {
                const Icon = pg.icon;
                return (
                  <div
                    key={pg.path}
                    onClick={() => navigateTo(pg.path)}
                    className="p-2.5 rounded-xl border border-slate-100 dark:border-slate-800 hover:border-amber-500/40 hover:bg-slate-50 dark:hover:bg-slate-800/50 cursor-pointer flex items-center justify-between transition-all group"
                  >
                    <div className="flex items-center gap-2.5">
                      <div className="p-2 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-lg group-hover:bg-amber-500/20 group-hover:text-amber-500 transition-colors">
                        <Icon className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="font-bold text-xs text-slate-900 dark:text-white">
                          {pg.title}
                        </div>
                        <span className="text-[10px] text-slate-400 font-mono">
                          #{pg.path}
                        </span>
                      </div>
                    </div>
                    <Badge variant="neutral">{pg.category}</Badge>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
