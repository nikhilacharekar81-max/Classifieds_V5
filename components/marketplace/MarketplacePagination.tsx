import React from 'react';
import { NavLink } from '@/components/common/NavLink';

export interface MarketplacePaginationProps {
  currentPage: number;
  totalPages: number;
  totalMatchingListings: number;
  itemsPerPage: number;
  buildPageHref: (pageNum: number) => string;
}

export const MarketplacePagination: React.FC<MarketplacePaginationProps> = ({
  currentPage,
  totalPages,
  totalMatchingListings,
  itemsPerPage,
  buildPageHref,
}) => {
  const paginationWindow = (() => {
    const pages: Array<number | 'ellipsis-start' | 'ellipsis-end'> = [];
    if (totalPages <= 7) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
      return pages;
    }
    pages.push(1);
    const start = Math.max(2, currentPage - 2);
    const end = Math.min(totalPages - 1, currentPage + 2);
    if (start > 2) pages.push('ellipsis-start');
    for (let i = start; i <= end; i++) pages.push(i);
    if (end < totalPages - 1) pages.push('ellipsis-end');
    pages.push(totalPages);
    return pages;
  })();

  return (
    <nav
      aria-label="Pagination"
      className="flex flex-wrap items-center justify-between gap-4 pt-6 border-t border-slate-200"
    >
      <span className="text-xs text-slate-500">
        Page <strong className="text-slate-900">{currentPage}</strong> of{' '}
        <strong className="text-slate-900">{totalPages}</strong> (
        {totalMatchingListings.toLocaleString()} total listings • Max {itemsPerPage} per page)
      </span>
      <div className="flex flex-wrap items-center gap-1.5">
        {currentPage > 1 && (
          <NavLink
            href={buildPageHref(currentPage - 1)}
            className="px-3 py-1.5 rounded-lg border border-slate-300 bg-white text-xs font-semibold text-slate-700 hover:bg-slate-50 flex items-center gap-1"
          >
            Previous
          </NavLink>
        )}
        {paginationWindow.map((item) => {
          if (item === 'ellipsis-start' || item === 'ellipsis-end') {
            return (
              <span
                key={item}
                className="px-2 py-1.5 text-xs font-bold text-slate-400 select-none"
              >
                …
              </span>
            );
          }
          const pageNum = item;
          const pageHref = buildPageHref(pageNum);
          const isActivePage = pageNum === currentPage;
          return (
            <NavLink
              key={pageNum}
              href={pageHref}
              aria-current={isActivePage ? 'page' : undefined}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors flex items-center gap-1 ${
                isActivePage
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'border border-slate-300 bg-white text-slate-700 hover:bg-slate-50'
              }`}
            >
              {pageNum}
            </NavLink>
          );
        })}
        {currentPage < totalPages && (
          <NavLink
            href={buildPageHref(currentPage + 1)}
            className="px-3 py-1.5 rounded-lg border border-slate-300 bg-white text-xs font-semibold text-slate-700 hover:bg-slate-50 flex items-center gap-1"
          >
            Next
          </NavLink>
        )}
      </div>
    </nav>
  );
};
