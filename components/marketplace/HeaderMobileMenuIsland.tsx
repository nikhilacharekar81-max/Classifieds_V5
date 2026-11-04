'use client';

import React, { useState } from 'react';
import { Menu, X, FolderTree, Plus, User, Shield, Tag } from 'lucide-react';
import { NavLink } from '@/components/common/NavLink';
import { ICONS_MAP } from './categoryIcons';

export interface CompactDrawerCategory {
  id: string;
  name: string;
  icon: string;
  href: string;
}

export interface HeaderMobileMenuIslandProps {
  onOpenMobileMenu?: () => void;
  drawerCategories: CompactDrawerCategory[];
}

export const HeaderMobileMenuIsland: React.FC<HeaderMobileMenuIslandProps> = ({
  onOpenMobileMenu,
  drawerCategories,
}) => {
  const [localMobileDrawerOpen, setLocalMobileDrawerOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => {
          if (onOpenMobileMenu) {
            onOpenMobileMenu();
          } else {
            setLocalMobileDrawerOpen(true);
          }
        }}
        className="sm:hidden p-2 text-[#3c4043] hover:bg-[#f1f3f4] rounded-md transition-colors cursor-pointer"
        title="Open Chillyads Menu"
      >
        <Menu className="w-5 h-5" />
      </button>

      {!onOpenMobileMenu && localMobileDrawerOpen && (
        <div className="fixed inset-0 z-50 flex">
          <div
            className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200"
            onClick={() => setLocalMobileDrawerOpen(false)}
          />
          <div className="relative w-80 max-w-[85vw] bg-white h-full shadow-2xl z-10 flex flex-col animate-in slide-in-from-left duration-300">
            <div className="p-4 bg-slate-950 text-white flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-400 text-slate-950 flex items-center justify-center font-black text-xl tracking-tighter">
                  chillyads
                </div>
                <div>
                  <h3 className="text-sm font-bold">Welcome to Chillyads</h3>
                  <p className="text-[11px] text-slate-400">India’s Marketplace</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setLocalMobileDrawerOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              <div className="space-y-1">
                <NavLink
                  href="/"
                  onClick={() => setLocalMobileDrawerOpen(false)}
                  className="w-full text-left px-3 py-2.5 rounded-xl text-xs font-bold text-slate-800 hover:bg-slate-100 flex items-center gap-3 transition-colors cursor-pointer"
                >
                  <FolderTree className="w-4 h-4 text-blue-600" />
                  <span>All Categories Directory</span>
                </NavLink>

                <NavLink
                  href="/post"
                  onClick={() => setLocalMobileDrawerOpen(false)}
                  className="w-full text-left px-3 py-2.5 rounded-xl text-xs font-extrabold text-amber-900 bg-amber-50 hover:bg-amber-100 flex items-center gap-3 transition-colors cursor-pointer border border-amber-200"
                >
                  <Plus className="w-4 h-4 text-amber-600" />
                  <span>Post Free Ad (+ SELL)</span>
                </NavLink>

                <NavLink
                  href="/my-account"
                  onClick={() => setLocalMobileDrawerOpen(false)}
                  className="w-full text-left px-3 py-2.5 rounded-xl text-xs font-bold text-slate-800 hover:bg-slate-100 flex items-center gap-3 transition-colors cursor-pointer"
                >
                  <User className="w-4 h-4 text-emerald-600" />
                  <span>My Account &amp; Saved Ads</span>
                </NavLink>

                <NavLink
                  href="/admin/dashboard"
                  onClick={() => setLocalMobileDrawerOpen(false)}
                  className="w-full text-left px-3 py-2.5 rounded-xl text-xs font-bold text-slate-800 hover:bg-slate-100 flex items-center gap-3 transition-colors cursor-pointer"
                >
                  <Shield className="w-4 h-4 text-purple-600" />
                  <span>Admin Panel &amp; Moderation</span>
                </NavLink>
              </div>

              {drawerCategories.length > 0 && (
                <div className="border-t border-slate-200 pt-3">
                  <h4 className="text-[11px] font-bold uppercase tracking-wider text-slate-400 px-3 mb-2">
                    Browse Categories
                  </h4>
                  <div className="space-y-1">
                    {drawerCategories.map((cat) => {
                      const IconComponent = ICONS_MAP[cat.icon || 'Tag'] || Tag;
                      return (
                        <NavLink
                          key={cat.id}
                          href={cat.href}
                          onClick={() => setLocalMobileDrawerOpen(false)}
                          className="w-full text-left px-3 py-2 rounded-xl text-xs font-medium text-slate-700 hover:bg-slate-100 flex items-center gap-3 transition-colors cursor-pointer"
                        >
                          <div className="p-1.5 rounded-lg bg-slate-100 text-slate-800">
                            <IconComponent className="w-3.5 h-3.5" />
                          </div>
                          <span>{cat.name}</span>
                        </NavLink>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            <div className="p-4 border-t border-slate-200 bg-slate-50 text-center">
              <p className="text-[11px] text-slate-500 font-medium">
                Chillyads Classifieds India • v2.5
              </p>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
