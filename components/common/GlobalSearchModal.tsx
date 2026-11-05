'use client';
import React, { useState, useEffect } from 'react';
import { useApp } from '@/context/AppContext';
import { Search, Tag, User, ShoppingBag, ShieldAlert, ArrowRight, X } from 'lucide-react';
import { ImageWithFallback } from './ImageWithFallback';

export const GlobalSearchModal: React.FC = () => {
  const {
    globalSearchOpen,
    setGlobalSearchOpen,
    listings,
    users,
    reports,
    transactions,
    setActiveSidebarTab,
    setActiveViewingListing,
  } = useApp();

  const [query, setQuery] = useState('');

  // Keyboard shortcut Cmd+K or Ctrl+K
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setGlobalSearchOpen(!globalSearchOpen);
      } else if (e.key === 'Escape' && globalSearchOpen) {
        setGlobalSearchOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [globalSearchOpen, setGlobalSearchOpen]);

  if (!globalSearchOpen) return null;

  const trimmed = query.trim().toLowerCase();

  const filteredListings = trimmed
    ? listings.filter(
        (l) =>
          l.title.toLowerCase().includes(trimmed) ||
          l.location.city.toLowerCase().includes(trimmed) ||
          l.id.toLowerCase().includes(trimmed)
      ).slice(0, 4)
    : [];

  const filteredUsers = trimmed
    ? users.filter(
        (u) =>
          u.name.toLowerCase().includes(trimmed) ||
          u.email.toLowerCase().includes(trimmed) ||
          u.phone.includes(trimmed) ||
          u.id.toLowerCase().includes(trimmed)
      ).slice(0, 3)
    : [];

  const filteredReports = trimmed
    ? reports.filter(
        (r) =>
          r.targetTitle.toLowerCase().includes(trimmed) ||
          r.reason.toLowerCase().includes(trimmed) ||
          r.notes.toLowerCase().includes(trimmed)
      ).slice(0, 3)
    : [];

  const filteredTransactions = trimmed
    ? transactions.filter(
        (t) =>
          t.orderId.toLowerCase().includes(trimmed) ||
          t.userName.toLowerCase().includes(trimmed) ||
          t.invoiceNumber.toLowerCase().includes(trimmed)
      ).slice(0, 3)
    : [];

  const totalResults =
    filteredListings.length +
    filteredUsers.length +
    filteredReports.length +
    filteredTransactions.length;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-20 p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-100">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl max-w-2xl w-full overflow-hidden text-slate-900 dark:text-white flex flex-col max-h-[80vh]">
        {/* Search Input Bar */}
        <div className="flex items-center px-4 py-3.5 border-b border-slate-200 dark:border-slate-800 gap-3">
          <Search className="w-5 h-5 text-slate-400 shrink-0" />
          <input
            type="text"
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search listings, users, orders, reports by ID, name, city... (Press ESC to close)"
            className="w-full bg-transparent text-sm focus:outline-none placeholder-slate-400 text-slate-900 dark:text-white"
          />
          {query && (
            <button onClick={() => setQuery('')} className="text-slate-400 hover:text-slate-600">
              <X className="w-4 h-4" />
            </button>
          )}
          <kbd className="hidden sm:inline-block px-2 py-0.5 text-[10px] font-mono text-slate-400 bg-slate-100 dark:bg-slate-800 rounded border border-slate-200 dark:border-slate-700">
            ESC
          </kbd>
        </div>

        {/* Search Results */}
        <div className="overflow-y-auto p-3 space-y-4 text-xs">
          {!trimmed && (
            <div className="p-6 text-center text-slate-400">
              <p className="text-sm font-medium">Quick Jump & Global Search</p>
              <p className="text-xs mt-1">
                Type anything to search across Listings, Sellers, Verification KYC, Invoices, and Reports.
              </p>
            </div>
          )}

          {trimmed && totalResults === 0 && (
            <div className="p-8 text-center text-slate-400">
              <p className="text-sm font-medium">No results found for "{query}"</p>
              <p className="text-xs mt-1">Try searching by category, vehicle model, seller name, or order ID.</p>
            </div>
          )}

          {/* Listings */}
          {filteredListings.length > 0 && (
            <div>
              <div className="px-2 py-1 text-[11px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                <Tag className="w-3.5 h-3.5" /> Listings ({filteredListings.length})
              </div>
              <div className="space-y-1 mt-1">
                {filteredListings.map((item) => (
                  <div
                    key={item.id}
                    onClick={() => {
                      setActiveViewingListing(item);
                      setGlobalSearchOpen(false);
                      setActiveSidebarTab('marketplace/listings');
                    }}
                    className="flex items-center justify-between p-2.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer group transition-colors"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <ImageWithFallback
                        src={item.images[0]}
                        alt=""
                        categoryId={item.categoryId}
                        className="w-10 h-10 rounded object-cover shrink-0"
                      />
                      <div className="min-w-0">
                        <div className="font-semibold text-sm truncate group-hover:text-blue-600 dark:group-hover:text-blue-400">
                          {item.title}
                        </div>
                        <div className="text-slate-400 text-xs">
                          {item.price !== null && item.price !== undefined ? `₹${item.price.toLocaleString('en-IN')}` : 'Price on request'} • {item.location.city} • ID: {item.id}
                        </div>
                      </div>
                    </div>
                    <ArrowRight className="w-4 h-4 text-slate-400 group-hover:translate-x-0.5 transition-transform" />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Users */}
          {filteredUsers.length > 0 && (
            <div>
              <div className="px-2 py-1 text-[11px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                <User className="w-3.5 h-3.5" /> Users & Sellers ({filteredUsers.length})
              </div>
              <div className="space-y-1 mt-1">
                {filteredUsers.map((user) => (
                  <div
                    key={user.id}
                    onClick={() => {
                      setGlobalSearchOpen(false);
                      setActiveSidebarTab('users/all');
                    }}
                    className="flex items-center justify-between p-2.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer group transition-colors"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <img
                        src={user.avatar}
                        alt=""
                        className="w-8 h-8 rounded-full object-cover shrink-0"
                      />
                      <div className="min-w-0">
                        <div className="font-semibold text-sm truncate group-hover:text-blue-600 dark:group-hover:text-blue-400">
                          {user.name} <span className="text-xs text-slate-400">({user.type})</span>
                        </div>
                        <div className="text-slate-400 text-xs">
                          {user.email} • {user.location.city} • {user.status.toUpperCase()}
                        </div>
                      </div>
                    </div>
                    <ArrowRight className="w-4 h-4 text-slate-400 group-hover:translate-x-0.5 transition-transform" />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Reports */}
          {filteredReports.length > 0 && (
            <div>
              <div className="px-2 py-1 text-[11px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                <ShieldAlert className="w-3.5 h-3.5" /> Moderation Reports ({filteredReports.length})
              </div>
              <div className="space-y-1 mt-1">
                {filteredReports.map((r) => (
                  <div
                    key={r.id}
                    onClick={() => {
                      setGlobalSearchOpen(false);
                      setActiveSidebarTab('moderation/reports');
                    }}
                    className="flex items-center justify-between p-2.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer group transition-colors"
                  >
                    <div className="min-w-0">
                      <div className="font-semibold text-sm truncate text-rose-500">
                        [{r.reason.toUpperCase()}] {r.targetTitle}
                      </div>
                      <div className="text-slate-400 text-xs truncate">
                        Reported by: {r.reportedByName} • Status: {r.status}
                      </div>
                    </div>
                    <ArrowRight className="w-4 h-4 text-slate-400" />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Orders */}
          {filteredTransactions.length > 0 && (
            <div>
              <div className="px-2 py-1 text-[11px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                <ShoppingBag className="w-3.5 h-3.5" /> Orders & Invoices ({filteredTransactions.length})
              </div>
              <div className="space-y-1 mt-1">
                {filteredTransactions.map((tx) => (
                  <div
                    key={tx.id}
                    onClick={() => {
                      setGlobalSearchOpen(false);
                      setActiveSidebarTab('commerce/transactions');
                    }}
                    className="flex items-center justify-between p-2.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer group transition-colors"
                  >
                    <div className="min-w-0">
                      <div className="font-semibold text-sm truncate">
                        {tx.orderId} • {tx.packageName} (₹{tx.amount})
                      </div>
                      <div className="text-slate-400 text-xs">
                        User: {tx.userName} • {tx.paymentGateway} • Invoice: {tx.invoiceNumber}
                      </div>
                    </div>
                    <ArrowRight className="w-4 h-4 text-slate-400" />
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
