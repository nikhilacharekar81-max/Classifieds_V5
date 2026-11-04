'use client';
import React, { useState, useMemo } from 'react';
import { useApp } from '@/context/AppContext';
import { Listing, ListingStatus } from '@/lib/types';
import {
  Search,
  Filter,
  Download,
  CheckCircle2,
  XCircle,
  Star,
  Trash2,
  Calendar,
  AlertTriangle,
  SlidersHorizontal,
  ChevronLeft,
  ChevronRight,
  Eye,
  Edit,
  CheckSquare,
  Square,
  ShieldAlert,
  ArrowLeft,
  RotateCcw,
  Mail,
  AlertCircle,
  Sparkles,
  Clock,
} from 'lucide-react';
import { Badge } from '@/components/common/Badge';
import { ConfirmDialog } from '@/components/common/ConfirmDialog';
import { navigateTo } from '@/lib/router/useRouter';

interface ListingsModuleProps {
  initialStatusFilter?: ListingStatus | 'all';
}

export const ListingsModule: React.FC<ListingsModuleProps> = ({
  initialStatusFilter = 'all',
}) => {
  const {
    listings,
    categories,
    locations,
    approveListing,
    rejectListing,
    featureListing,
    markAsSold,
    deleteListing,
    extendExpiration,
    renewListing,
    bulkRenewListings,
    markListingAsExpired,
    sendAdExpiredEmail,
    bulkApproveListings,
    bulkRejectListings,
    bulkDeleteListings,
    setActiveViewingListing,
    addToast,
    setActiveSidebarTab,
  } = useApp();

  // Filters state (temporary inputs)
  const [tempSearchTerm, setTempSearchTerm] = useState('');
  const [tempCategory, setTempCategory] = useState('all');
  const [tempSubcategory, setTempSubcategory] = useState('all');
  const [tempLocation, setTempLocation] = useState('all');
  const [tempStatus, setTempStatus] = useState<string>(initialStatusFilter);
  const [tempCondition, setTempCondition] = useState('all');
  const [tempMinPrice, setTempMinPrice] = useState('');
  const [tempMaxPrice, setTempMaxPrice] = useState('');
  const [tempDateFrom, setTempDateFrom] = useState('');
  const [tempDateTo, setTempDateTo] = useState('');
  const [tempRiskLevel, setTempRiskLevel] = useState('all');

  // Applied filter criteria state
  const [appliedFilters, setAppliedFilters] = useState({
    search: '',
    category: 'all',
    subcategory: 'all',
    location: 'all',
    status: initialStatusFilter as string,
    condition: 'all',
    minPrice: '',
    maxPrice: '',
    dateFrom: '',
    dateTo: '',
    risk: 'all',
  });

  const [selectedItems, setSelectedItems] = useState<string[]>([]);

  // Synchronize initialStatusFilter prop with filter states
  React.useEffect(() => {
    if (tempStatus !== initialStatusFilter) {
      setTempStatus(initialStatusFilter);
      setAppliedFilters((prev) => ({
        ...prev,
        status: initialStatusFilter,
      }));
    }
  }, [initialStatusFilter, tempStatus]);

  // Dialog states
  const [rejectDialog, setRejectDialog] = useState<{ isOpen: boolean; id?: string }>({
    isOpen: false,
  });
  const [bulkRejectDialog, setBulkRejectDialog] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<{ isOpen: boolean; id?: string }>({
    isOpen: false,
  });
  const [bulkDeleteConfirm, setBulkDeleteConfirm] = useState(false);
  const [bulkRenewDialog, setBulkRenewDialog] = useState<{ isOpen: boolean; days: number }>({
    isOpen: false,
    days: 30,
  });
  const [singleRenewDialog, setSingleRenewDialog] = useState<{ isOpen: boolean; id?: string; title?: string; days: number }>({
    isOpen: false,
    days: 30,
  });

  // Column visibility
  const [showColumns, setShowColumns] = useState({
    image: true,
    title: true,
    price: true,
    category: true,
    location: true,
    seller: true,
    status: true,
    spamScore: true,
    views: true,
    actions: true,
  });
  const [columnMenuOpen, setColumnMenuOpen] = useState(false);

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // Get matching subcategories list for the selected category
  const subcategoriesList = useMemo(() => {
    return categories.filter((c) => c.parentId && (tempCategory === 'all' || c.parentId === tempCategory));
  }, [categories, tempCategory]);

  // Filter listings based on applied criteria
  const filteredListings = useMemo(() => {
    return listings.filter((item) => {
      // Status filter
      if (appliedFilters.status !== 'all' && item.status !== appliedFilters.status) return false;

      // Category filter
      if (appliedFilters.category !== 'all' && item.categoryId !== appliedFilters.category) return false;

      // Subcategory filter
      if (appliedFilters.subcategory !== 'all' && item.subcategoryId !== appliedFilters.subcategory) return false;

      // Location filter
      if (appliedFilters.location !== 'all' && item.location.city !== appliedFilters.location) return false;

      // Condition filter
      if (appliedFilters.condition !== 'all') {
        const itemCond = (item.customAttributes?.condition as string || '').toLowerCase();
        if (!itemCond.includes(appliedFilters.condition.toLowerCase())) return false;
      }

      // Price filter
      if (appliedFilters.minPrice) {
        const min = parseFloat(appliedFilters.minPrice);
        if (!isNaN(min) && item.price < min) return false;
      }
      if (appliedFilters.maxPrice) {
        const max = parseFloat(appliedFilters.maxPrice);
        if (!isNaN(max) && item.price > max) return false;
      }

      // Date filters (comparing item.createdAt date parts)
      if (appliedFilters.dateFrom) {
        const fromDate = new Date(appliedFilters.dateFrom);
        const itemDate = new Date(item.createdAt);
        fromDate.setHours(0, 0, 0, 0);
        itemDate.setHours(0, 0, 0, 0);
        if (itemDate < fromDate) return false;
      }
      if (appliedFilters.dateTo) {
        const toDate = new Date(appliedFilters.dateTo);
        const itemDate = new Date(item.createdAt);
        toDate.setHours(23, 59, 59, 999);
        itemDate.setHours(0, 0, 0, 0);
        if (itemDate > toDate) return false;
      }

      // Risk Level filter (based on spamScore)
      if (appliedFilters.risk !== 'all') {
        const score = item.spamScore || 0;
        if (appliedFilters.risk === 'high' && score < 75) return false;
        if (appliedFilters.risk === 'medium' && (score < 40 || score >= 75)) return false;
        if (appliedFilters.risk === 'low' && score >= 40) return false;
      }

      // Search term (Matches Ad ID, Title, Seller, or Phone)
      if (appliedFilters.search.trim()) {
        const q = appliedFilters.search.toLowerCase();
        const matchTitle = item.title.toLowerCase().includes(q);
        const matchId = item.id.toLowerCase().includes(q);
        const matchSeller = item.sellerName.toLowerCase().includes(q);
        const matchPhone = (item.sellerPhone || '').toLowerCase().includes(q);
        const matchLoc = item.location.city.toLowerCase().includes(q);
        if (!matchTitle && !matchId && !matchSeller && !matchPhone && !matchLoc) return false;
      }

      return true;
    });
  }, [listings, appliedFilters]);

  // Paginated listings
  const totalPages = Math.ceil(filteredListings.length / pageSize) || 1;
  const paginatedListings = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredListings.slice(start, start + pageSize);
  }, [filteredListings, currentPage, pageSize]);

  // Selection handlers
  const isPageAllSelected = useMemo(() => {
    return paginatedListings.length > 0 && paginatedListings.every((l) => selectedItems.includes(l.id));
  }, [paginatedListings, selectedItems]);

  const toggleSelectAll = () => {
    if (isPageAllSelected) {
      // Unselect all on the current page
      const pageIds = paginatedListings.map((l) => l.id);
      setSelectedItems((prev) => prev.filter((id) => !pageIds.includes(id)));
    } else {
      // Select all on the current page
      const pageIds = paginatedListings.map((l) => l.id);
      setSelectedItems((prev) => {
        const otherSelected = prev.filter((id) => !pageIds.includes(id));
        return [...otherSelected, ...pageIds];
      });
    }
  };

  const toggleSelectItem = (id: string) => {
    setSelectedItems((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const handleSearch = () => {
    setAppliedFilters({
      search: tempSearchTerm,
      category: tempCategory,
      subcategory: tempSubcategory,
      location: tempLocation,
      status: tempStatus,
      condition: tempCondition,
      minPrice: tempMinPrice,
      maxPrice: tempMaxPrice,
      dateFrom: tempDateFrom,
      dateTo: tempDateTo,
      risk: tempRiskLevel,
    });
    setCurrentPage(1);
  };

  const handleReset = () => {
    setTempSearchTerm('');
    setTempCategory('all');
    setTempSubcategory('all');
    setTempLocation('all');
    setTempStatus('all');
    setTempCondition('all');
    setTempMinPrice('');
    setTempMaxPrice('');
    setTempDateFrom('');
    setTempDateTo('');
    setTempRiskLevel('all');

    setAppliedFilters({
      search: '',
      category: 'all',
      subcategory: 'all',
      location: 'all',
      status: 'all',
      condition: 'all',
      minPrice: '',
      maxPrice: '',
      dateFrom: '',
      dateTo: '',
      risk: 'all',
    });
    setCurrentPage(1);
  };

  // CSV Export
  const exportToCSV = () => {
    const headers = ['ID', 'Title', 'Price', 'Category', 'City', 'Seller', 'Status', 'Views', 'Created Date'];
    const rows = filteredListings.map((l) => [
      l.id,
      `"${l.title.replace(/"/g, '""')}"`,
      l.price,
      categories.find((c) => c.id === l.categoryId)?.name || l.categoryId,
      l.location.city,
      `"${l.sellerName.replace(/"/g, '""')}"`,
      l.status,
      l.views,
      l.createdAt,
    ]);
    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `chillyads_listings_export_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    addToast({
      type: 'success',
      title: 'CSV Export Generated',
      message: `Exported ${filteredListings.length} listings to CSV.`,
    });
  };

  const getStatusBadge = (status: ListingStatus) => {
    switch (status) {
      case 'approved':
        return <Badge variant="success">Approved</Badge>;
      case 'pending':
        return <Badge variant="warning">Pending Review</Badge>;
      case 'rejected':
        return <Badge variant="danger">Rejected</Badge>;
      case 'sold':
        return <Badge variant="neutral">Sold</Badge>;
      case 'expired':
        return <Badge variant="danger">Expired</Badge>;
      default:
        return <Badge variant="neutral">{status}</Badge>;
    }
  };

  return (
    <div className="p-4 sm:p-6 space-y-5 max-w-7xl mx-auto text-slate-900 dark:text-white overflow-x-hidden">
      {/* Header & Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <button
            onClick={() => {
              setActiveSidebarTab('dashboard');
              navigateTo('/admin/dashboard');
            }}
            className="text-xs text-blue-600 hover:text-blue-700 dark:text-blue-400 font-semibold flex items-center gap-1 mb-2"
          >
            <ArrowLeft className="w-3.5 h-3.5" /> Back to Dashboard
          </button>
          <h2 className="text-xl font-bold tracking-tight">Listings Management</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Filter, moderate, promote, and audit classifieds across all India categories
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* Column Customizer */}
          <div className="relative">
            <button
              onClick={() => setColumnMenuOpen(!columnMenuOpen)}
              className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center gap-1.5 transition-colors"
            >
              <SlidersHorizontal className="w-3.5 h-3.5" />
              Columns
            </button>
            {columnMenuOpen && (
              <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-xl p-3 z-40 text-xs space-y-2">
                <div className="font-bold text-slate-400 uppercase tracking-wider text-[10px]">
                  Visible Columns
                </div>
                {Object.keys(showColumns).map((col) => (
                  <label key={col} className="flex items-center gap-2 cursor-pointer capitalize">
                    <input
                      type="checkbox"
                      checked={showColumns[col as keyof typeof showColumns]}
                      onChange={(e) =>
                        setShowColumns((prev) => ({
                          ...prev,
                          [col]: e.target.checked,
                        }))
                      }
                      className="rounded text-blue-600 focus:ring-blue-500"
                    />
                    <span>{col}</span>
                  </label>
                ))}
              </div>
            )}
          </div>

          {/* Export CSV */}
          <button
            onClick={exportToCSV}
            className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center gap-1.5 transition-colors"
          >
            <Download className="w-3.5 h-3.5" />
            Export CSV
          </button>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-sm space-y-4">
        {/* Status Pill Tabs */}
        <div className="flex flex-wrap items-center gap-2 pb-3 border-b border-slate-100 dark:border-slate-800/80">
          {[
            { id: 'all', label: 'All Listings', count: listings.length },
            { id: 'pending', label: 'Pending Review', count: listings.filter((l) => l.status === 'pending').length },
            { id: 'approved', label: 'Approved', count: listings.filter((l) => l.status === 'approved').length },
            { id: 'rejected', label: 'Rejected', count: listings.filter((l) => l.status === 'rejected').length },
            { id: 'expired', label: 'Expired Ads', count: listings.filter((l) => l.status === 'expired').length },
            { id: 'sold', label: 'Sold', count: listings.filter((l) => l.status === 'sold').length },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => {
                setTempStatus(tab.id);
                // Also apply status filter immediately on tab click for snappy UX
                setAppliedFilters((prev) => ({
                  ...prev,
                  status: tab.id,
                }));
                setCurrentPage(1);
              }}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-2 transition-all cursor-pointer ${
                appliedFilters.status === tab.id
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <span>{tab.label}</span>
              <span
                className={`px-1.5 py-0.2 rounded-full text-[10px] ${
                  appliedFilters.status === tab.id
                    ? 'bg-white/25 text-white'
                    : 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300'
                }`}
              >
                {tab.count}
              </span>
            </button>
          ))}
        </div>

        {/* Filter Controls Row */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {/* Search Listing */}
          <div className="space-y-1">
            <label className="block text-xs font-bold text-slate-600 dark:text-slate-400">Search Listing</label>
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400" />
              <input
                type="text"
                value={tempSearchTerm}
                onChange={(e) => setTempSearchTerm(e.target.value)}
                placeholder="Ad ID / Title / Seller / Phone"
                className="w-full text-xs rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/60 pl-9 pr-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-900 dark:text-white"
              />
            </div>
          </div>

          {/* Category Filter */}
          <div className="space-y-1">
            <label className="block text-xs font-bold text-slate-600 dark:text-slate-400">Category</label>
            <select
              value={tempCategory}
              onChange={(e) => {
                setTempCategory(e.target.value);
                setTempSubcategory('all');
              }}
              className="w-full text-xs rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/60 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-700 dark:text-slate-300"
            >
              <option value="all">All Categories</option>
              {categories.filter((c) => !c.parentId).map((cat) => (
                <option key={cat.id} value={cat.id}>
                  {cat.name}
                </option>
              ))}
            </select>
          </div>

          {/* Subcategory Filter */}
          <div className="space-y-1">
            <label className="block text-xs font-bold text-slate-600 dark:text-slate-400">Subcategory</label>
            <select
              value={tempSubcategory}
              onChange={(e) => setTempSubcategory(e.target.value)}
              className="w-full text-xs rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/60 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-700 dark:text-slate-300"
            >
              <option value="all">All Subcategories</option>
              {subcategoriesList.map((sub) => (
                <option key={sub.id} value={sub.id}>
                  {sub.name}
                </option>
              ))}
            </select>
          </div>

          {/* Location Filter */}
          <div className="space-y-1">
            <label className="block text-xs font-bold text-slate-600 dark:text-slate-400">Location</label>
            <select
              value={tempLocation}
              onChange={(e) => setTempLocation(e.target.value)}
              className="w-full text-xs rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/60 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-700 dark:text-slate-300"
            >
              <option value="all">All Cities</option>
              {locations
                .filter((l) => l.type === 'city')
                .map((loc) => (
                  <option key={loc.id} value={loc.name}>
                    {loc.name}
                  </option>
                ))}
            </select>
          </div>

          {/* Status Filter */}
          <div className="space-y-1">
            <label className="block text-xs font-bold text-slate-600 dark:text-slate-400">Status</label>
            <select
              value={tempStatus}
              onChange={(e) => setTempStatus(e.target.value)}
              className="w-full text-xs rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/60 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-700 dark:text-slate-300"
            >
              <option value="all">All Statuses</option>
              <option value="pending">Pending Review</option>
              <option value="approved">Approved</option>
              <option value="rejected">Rejected</option>
              <option value="sold">Sold</option>
              <option value="expired">Expired</option>
            </select>
          </div>

          {/* Condition Filter */}
          <div className="space-y-1">
            <label className="block text-xs font-bold text-slate-600 dark:text-slate-400">Condition</label>
            <select
              value={tempCondition}
              onChange={(e) => setTempCondition(e.target.value)}
              className="w-full text-xs rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/60 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-700 dark:text-slate-300"
            >
              <option value="all">All Conditions</option>
              <option value="new">New</option>
              <option value="gently_used">Gently Used / Like New</option>
              <option value="used">Used</option>
              <option value="refurbished">Refurbished</option>
            </select>
          </div>

          {/* Price Filter */}
          <div className="space-y-1">
            <label className="block text-xs font-bold text-slate-600 dark:text-slate-400">Price Range</label>
            <div className="flex items-center gap-2">
              <input
                type="number"
                value={tempMinPrice}
                onChange={(e) => setTempMinPrice(e.target.value)}
                placeholder="Min"
                className="w-full text-xs rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/60 px-2.5 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-900 dark:text-white"
              />
              <span className="text-slate-400 text-xs">to</span>
              <input
                type="number"
                value={tempMaxPrice}
                onChange={(e) => setTempMaxPrice(e.target.value)}
                placeholder="Max"
                className="w-full text-xs rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/60 px-2.5 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-900 dark:text-white"
              />
            </div>
          </div>

          {/* Date Filter */}
          <div className="space-y-1">
            <label className="block text-xs font-bold text-slate-600 dark:text-slate-400">Date Range</label>
            <div className="flex items-center gap-2">
              <input
                type="date"
                value={tempDateFrom}
                onChange={(e) => setTempDateFrom(e.target.value)}
                className="w-full text-xs rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/60 px-2.5 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-700 dark:text-slate-300"
              />
              <span className="text-slate-400 text-xs">to</span>
              <input
                type="date"
                value={tempDateTo}
                onChange={(e) => setTempDateTo(e.target.value)}
                className="w-full text-xs rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/60 px-2.5 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-700 dark:text-slate-300"
              />
            </div>
          </div>

          {/* Risk Level Filter */}
          <div className="space-y-1">
            <label className="block text-xs font-bold text-slate-600 dark:text-slate-400">Risk Level</label>
            <select
              value={tempRiskLevel}
              onChange={(e) => setTempRiskLevel(e.target.value)}
              className="w-full text-xs rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/60 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-700 dark:text-slate-300"
            >
              <option value="all">All Risk Levels</option>
              <option value="low">Low Risk (Spam &lt; 40)</option>
              <option value="medium">Medium Risk (Spam 40-74)</option>
              <option value="high">High Risk (Spam &ge; 75)</option>
            </select>
          </div>
        </div>

        {/* Buttons Row */}
        <div className="flex flex-wrap items-center justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800/80">
          <button
            onClick={handleSearch}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold shadow-sm transition-colors cursor-pointer flex items-center gap-1.5"
          >
            <Search className="w-3.5 h-3.5" />
            Search
          </button>
          <button
            onClick={handleReset}
            className="px-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-lg text-xs font-bold transition-colors cursor-pointer"
          >
            Reset
          </button>
          <button
            onClick={exportToCSV}
            className="px-4 py-2 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-lg text-xs font-bold transition-colors cursor-pointer flex items-center gap-1.5"
          >
            <Download className="w-3.5 h-3.5" />
            Export
          </button>
        </div>

        {/* Bulk Actions Banner (When items selected) */}
        {selectedItems.length > 0 && (
          <div className="flex flex-wrap items-center justify-between p-3 bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-900 rounded-lg text-xs gap-2">
            <div className="font-semibold text-blue-900 dark:text-blue-200">
              {selectedItems.length} listing{selectedItems.length > 1 ? 's' : ''} selected
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setBulkRenewDialog({ isOpen: true, days: 30 })}
                className="px-3 py-1 bg-amber-600 hover:bg-amber-700 text-white rounded font-semibold flex items-center gap-1 transition-colors shadow-sm cursor-pointer"
                title="Bulk Renew expired ads (Free of charge) and notify sellers"
              >
                <RotateCcw className="w-3.5 h-3.5" /> Bulk Renew ({selectedItems.length})
              </button>
              <button
                onClick={() => {
                  bulkApproveListings(selectedItems);
                  setSelectedItems([]);
                }}
                className="px-3 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded font-semibold flex items-center gap-1 transition-colors"
              >
                <CheckCircle2 className="w-3.5 h-3.5" /> Approve Selected
              </button>
              <button
                onClick={() => setBulkRejectDialog(true)}
                className="px-3 py-1 bg-rose-600 hover:bg-rose-700 text-white rounded font-semibold flex items-center gap-1 transition-colors"
              >
                <XCircle className="w-3.5 h-3.5" /> Reject Selected
              </button>
              <button
                onClick={() => setBulkDeleteConfirm(true)}
                className="px-3 py-1 bg-slate-700 hover:bg-slate-800 text-white rounded font-semibold flex items-center gap-1 transition-colors"
              >
                <Trash2 className="w-3.5 h-3.5" /> Delete
              </button>
              <button
                onClick={() => setSelectedItems([])}
                className="text-slate-500 hover:text-slate-700 underline px-1"
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Main Table */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-800 text-slate-500 font-semibold uppercase tracking-wider">
                <th className="p-3 w-8">
                  <button onClick={toggleSelectAll} className="flex items-center text-slate-400">
                    {isPageAllSelected ? (
                      <CheckSquare className="w-4 h-4 text-blue-600" />
                    ) : (
                      <Square className="w-4 h-4" />
                    )}
                  </button>
                </th>
                {showColumns.image && <th className="p-3 w-16">Photo</th>}
                {showColumns.title && <th className="p-3 min-w-[220px]">Listing Title</th>}
                {showColumns.price && <th className="p-3">Price</th>}
                {showColumns.category && <th className="p-3">Category</th>}
                {showColumns.location && <th className="p-3">Location</th>}
                {showColumns.seller && <th className="p-3">Seller</th>}
                {showColumns.status && <th className="p-3">Status</th>}
                {showColumns.spamScore && <th className="p-3">Spam Score</th>}
                {showColumns.views && <th className="p-3">Views</th>}
                {showColumns.actions && <th className="p-3 text-right">Moderation Actions</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {paginatedListings.length === 0 ? (
                <tr>
                  <td colSpan={11} className="p-12 text-center text-slate-400">
                    <AlertTriangle className="w-8 h-8 mx-auto text-slate-300 mb-2" />
                    <p className="font-semibold text-sm">No listings found matching criteria</p>
                    <p className="text-xs mt-1">Try resetting your filters or search terms.</p>
                  </td>
                </tr>
              ) : (
                paginatedListings.map((item) => {
                  const isSelected = selectedItems.includes(item.id);
                  const cat = categories.find((c) => c.id === item.categoryId);

                  return (
                    <tr
                      key={item.id}
                      className={`hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors ${
                        isSelected ? 'bg-blue-50/50 dark:bg-blue-950/20' : ''
                      }`}
                    >
                      <td className="p-3">
                        <button
                          onClick={() => toggleSelectItem(item.id)}
                          className="flex items-center text-slate-400"
                        >
                          {isSelected ? (
                            <CheckSquare className="w-4 h-4 text-blue-600" />
                          ) : (
                            <Square className="w-4 h-4" />
                          )}
                        </button>
                      </td>

                      {/* Photo Thumbnail */}
                      {showColumns.image && (
                        <td className="p-3">
                          <img
                            src={item.images[0]}
                            alt=""
                            className="w-12 h-12 rounded-lg object-cover border border-slate-200 dark:border-slate-800"
                          />
                        </td>
                      )}

                      {/* Title & ID */}
                      {showColumns.title && (
                        <td className="p-3">
                          <div className="font-bold text-slate-900 dark:text-white leading-snug line-clamp-1">
                            {item.title}
                          </div>
                          <div className="text-[11px] text-slate-400 flex items-center gap-1.5 mt-0.5">
                            <span className="font-mono">{item.id}</span>
                            <span>•</span>
                            <span>Exp: {item.expiresAt}</span>
                            {item.isFeatured && (
                              <span className="px-1.5 py-0.2 bg-amber-400 text-slate-950 font-black rounded text-[9px] uppercase">
                                Featured
                              </span>
                            )}
                          </div>
                          {item.rejectionReason && (
                            <div className="text-[10px] text-rose-500 font-medium mt-0.5">
                              Rejected: {item.rejectionReason}
                            </div>
                          )}
                        </td>
                      )}

                      {/* Price in ₹ */}
                      {showColumns.price && (
                        <td className="p-3 font-bold text-slate-900 dark:text-white">
                          ₹{item.price.toLocaleString('en-IN')}
                        </td>
                      )}

                      {/* Category */}
                      {showColumns.category && (
                        <td className="p-3 text-slate-600 dark:text-slate-300">
                          {cat?.name || item.categoryId}
                        </td>
                      )}

                      {/* Location */}
                      {showColumns.location && (
                        <td className="p-3 text-slate-600 dark:text-slate-300">
                          <div>{item.location.city}</div>
                          <div className="text-[10px] text-slate-400">{item.location.locality}</div>
                        </td>
                      )}

                      {/* Seller */}
                      {showColumns.seller && (
                        <td className="p-3">
                          <div className="font-medium text-slate-900 dark:text-white">
                            {item.sellerName}
                          </div>
                          <div className="text-[10px] text-slate-400 capitalize">
                            {item.sellerType} account
                          </div>
                        </td>
                      )}

                      {/* Status */}
                      {showColumns.status && <td className="p-3">{getStatusBadge(item.status)}</td>}

                      {/* Spam Score */}
                      {showColumns.spamScore && (
                        <td className="p-3">
                          <div className="flex items-center gap-1.5">
                            <div className="w-12 bg-slate-100 dark:bg-slate-800 rounded-full h-1.5 overflow-hidden">
                              <div
                                className={`h-full rounded-full ${
                                  (item.spamScore || 0) > 70
                                    ? 'bg-rose-500'
                                    : (item.spamScore || 0) > 25
                                    ? 'bg-amber-500'
                                    : 'bg-emerald-500'
                                }`}
                                style={{ width: `${Math.min(100, item.spamScore || 0)}%` }}
                              />
                            </div>
                            <span className="text-[11px] font-mono text-slate-400">
                              {item.spamScore || 0}%
                            </span>
                          </div>
                        </td>
                      )}

                      {/* Views */}
                      {showColumns.views && (
                        <td className="p-3 text-slate-600 dark:text-slate-300 font-medium">
                          {item.views.toLocaleString()}
                        </td>
                      )}

                      {/* Row Actions */}
                      {showColumns.actions && (
                        <td className="p-3 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            {/* Preview Detail */}
                            <button
                              onClick={() => navigateTo('/ad/' + item.id)}
                              className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded text-slate-500 hover:text-slate-900 dark:hover:text-white transition-colors"
                              title="View Ad Webpage"
                            >
                              <Eye className="w-4 h-4" />
                            </button>

                            {/* Approve */}
                            {item.status !== 'approved' && (
                              <button
                                onClick={() => approveListing(item.id)}
                                className="p-1.5 hover:bg-emerald-50 dark:hover:bg-emerald-950 text-emerald-600 rounded transition-colors"
                                title="Approve Listing"
                              >
                                <CheckCircle2 className="w-4 h-4" />
                              </button>
                            )}

                            {/* Reject with Reason */}
                            {item.status !== 'rejected' && (
                              <button
                                onClick={() => setRejectDialog({ isOpen: true, id: item.id })}
                                className="p-1.5 hover:bg-rose-50 dark:hover:bg-rose-950 text-rose-600 rounded transition-colors"
                                title="Reject with Reason"
                              >
                                <XCircle className="w-4 h-4" />
                              </button>
                            )}

                            {/* Feature Toggle */}
                            <button
                              onClick={() => featureListing(item.id, !item.isFeatured)}
                              className={`p-1.5 rounded transition-colors ${
                                item.isFeatured
                                  ? 'text-amber-500 hover:bg-amber-50 dark:hover:bg-amber-950'
                                  : 'text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                              }`}
                              title={item.isFeatured ? 'Remove Featured' : 'Feature Listing'}
                            >
                              <Star className="w-4 h-4" />
                            </button>

                            {/* Extend Expiration */}
                            <button
                              onClick={() => extendExpiration(item.id, 30)}
                              className="p-1.5 hover:bg-blue-50 dark:hover:bg-blue-950 text-blue-600 rounded transition-colors"
                              title="Extend +30 Days"
                            >
                              <Calendar className="w-4 h-4" />
                            </button>

                            {/* Renew Expired Ad */}
                            {item.status === 'expired' && (
                              <>
                                <button
                                  onClick={() => setSingleRenewDialog({ isOpen: true, id: item.id, title: item.title, days: 30 })}
                                  className="p-1.5 hover:bg-emerald-50 dark:hover:bg-emerald-950 text-emerald-600 rounded transition-colors font-medium"
                                  title="Renew Expired Ad (Free)"
                                >
                                  <RotateCcw className="w-4 h-4" />
                                </button>
                                <button
                                  onClick={() => sendAdExpiredEmail(item.id)}
                                  className="p-1.5 hover:bg-amber-50 dark:hover:bg-amber-950 text-amber-600 rounded transition-colors"
                                  title="Send / Resend Expiry Notice Email"
                                >
                                  <Mail className="w-4 h-4" />
                                </button>
                              </>
                            )}

                            {/* Mark Expired (Moderation / Testing) */}
                            {item.status === 'approved' && (
                              <button
                                onClick={() => markListingAsExpired(item.id)}
                                className="p-1.5 hover:bg-amber-50 dark:hover:bg-amber-950 text-slate-400 hover:text-amber-600 rounded transition-colors"
                                title="Expire Ad & Send Free Renewal Notice"
                              >
                                <Clock className="w-4 h-4" />
                              </button>
                            )}

                            {/* Delete */}
                            <button
                              onClick={() => setDeleteConfirm({ isOpen: true, id: item.id })}
                              className="p-1.5 hover:bg-rose-50 dark:hover:bg-rose-950 text-slate-400 hover:text-rose-600 rounded transition-colors"
                              title="Delete Listing"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      )}
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Footer */}
        <div className="p-4 border-t border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-slate-500">
          <div className="flex items-center gap-2">
            <span>Rows per page:</span>
            <select
              value={pageSize}
              onChange={(e) => {
                setPageSize(Number(e.target.value));
                setCurrentPage(1);
              }}
              className="border border-slate-200 dark:border-slate-800 rounded px-2 py-1 bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300"
            >
              <option value={5}>5</option>
              <option value={10}>10</option>
              <option value={25}>25</option>
              <option value={50}>50</option>
            </select>
            <span>
              Showing {(currentPage - 1) * pageSize + 1} -{' '}
              {Math.min(currentPage * pageSize, filteredListings.length)} of {filteredListings.length}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              disabled={currentPage === 1}
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              className="p-1.5 rounded border border-slate-200 dark:border-slate-800 disabled:opacity-40 hover:bg-slate-100 dark:hover:bg-slate-800"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="font-semibold text-slate-700 dark:text-slate-300">
              Page {currentPage} of {totalPages}
            </span>
            <button
              disabled={currentPage >= totalPages}
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              className="p-1.5 rounded border border-slate-200 dark:border-slate-800 disabled:opacity-40 hover:bg-slate-100 dark:hover:bg-slate-800"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Rejection Dialog */}
      <ConfirmDialog
        isOpen={rejectDialog.isOpen}
        onClose={() => setRejectDialog({ isOpen: false })}
        onConfirm={(reason) => {
          if (rejectDialog.id) {
            rejectListing(rejectDialog.id, reason || 'Incomplete details');
          }
        }}
        title="Reject Listing"
        description="Specify the reason why this listing does not satisfy Chillyads moderation guidelines. The seller will be notified."
        confirmText="Reject Ad"
        isDestructive={true}
        requireReason={true}
        reasonPlaceholder="e.g., Unrealistic pricing, counterfeit brand, watermark from competitor, or invalid phone number..."
      />

      {/* Bulk Rejection Dialog */}
      <ConfirmDialog
        isOpen={bulkRejectDialog}
        onClose={() => setBulkRejectDialog(false)}
        onConfirm={(reason) => {
          bulkRejectListings(selectedItems, reason || 'Bulk moderation rejection');
          setSelectedItems([]);
        }}
        title={`Reject ${selectedItems.length} Selected Listings`}
        description="Are you sure you want to reject these items in bulk?"
        confirmText="Reject Selected"
        isDestructive={true}
        requireReason={true}
        reasonPlaceholder="Provide moderation rejection reason for sellers..."
      />

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        isOpen={deleteConfirm.isOpen}
        onClose={() => setDeleteConfirm({ isOpen: false })}
        onConfirm={() => {
          if (deleteConfirm.id) {
            deleteListing(deleteConfirm.id);
          }
        }}
        title="Delete Listing Permanently"
        description="This action cannot be undone. The listing will be erased from search and buyer favorites."
        confirmText="Delete Ad"
        isDestructive={true}
      />

      {/* Bulk Delete Confirmation Dialog */}
      <ConfirmDialog
        isOpen={bulkDeleteConfirm}
        onClose={() => setBulkDeleteConfirm(false)}
        onConfirm={() => {
          bulkDeleteListings(selectedItems);
          setSelectedItems([]);
        }}
        title={`Delete ${selectedItems.length} Selected Listings`}
        description="Are you sure you want to permanently delete all selected classified ads?"
        confirmText="Delete All"
        isDestructive={true}
      />

      {/* Bulk Renew Modal */}
      {bulkRenewDialog.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 max-w-md w-full shadow-2xl space-y-4">
            <div className="flex items-center gap-3 text-amber-600 dark:text-amber-400">
              <div className="p-3 bg-amber-50 dark:bg-amber-950/50 rounded-xl border border-amber-200 dark:border-amber-900">
                <RotateCcw className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  Bulk Renew {selectedItems.length} Classified Ads
                </h3>
                <p className="text-xs text-slate-500">Free Renewal & Reactivation</p>
              </div>
            </div>

            <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
              Selected listings will be reactivated with an extended expiration date and marked as active/approved. An automated renewal confirmation email will be dispatched to each seller.
            </p>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                Extend Expiration Period
              </label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { days: 30, label: '30 Days (Standard)' },
                  { days: 60, label: '60 Days' },
                  { days: 90, label: '90 Days' },
                ].map((opt) => (
                  <button
                    key={opt.days}
                    type="button"
                    onClick={() => setBulkRenewDialog((prev) => ({ ...prev, days: opt.days }))}
                    className={`py-2 px-3 rounded-lg text-xs font-semibold border transition-all cursor-pointer ${
                      bulkRenewDialog.days === opt.days
                        ? 'bg-amber-50 dark:bg-amber-950/60 border-amber-500 text-amber-700 dark:text-amber-300 ring-2 ring-amber-500/20'
                        : 'border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="p-3 bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-900 rounded-xl flex items-start gap-2.5 text-xs text-blue-800 dark:text-blue-300">
              <Mail className="w-4 h-4 shrink-0 mt-0.5" />
              <span>
                <strong>Zero Charge:</strong> All {selectedItems.length} sellers will receive an email stating their listing is reactivated for free for {bulkRenewDialog.days} days.
              </span>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setBulkRenewDialog({ isOpen: false, days: 30 })}
                className="px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  bulkRenewListings(selectedItems, bulkRenewDialog.days);
                  setSelectedItems([]);
                  setBulkRenewDialog({ isOpen: false, days: 30 });
                }}
                className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold rounded-lg shadow-sm transition-colors flex items-center gap-1.5 cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" /> Confirm Free Bulk Renewal
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Single Listing Renew Modal */}
      {singleRenewDialog.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 max-w-md w-full shadow-2xl space-y-4">
            <div className="flex items-center gap-3 text-emerald-600 dark:text-emerald-400">
              <div className="p-3 bg-emerald-50 dark:bg-emerald-950/50 rounded-xl border border-emerald-200 dark:border-emerald-900">
                <RotateCcw className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  Renew Expired Listing
                </h3>
                <p className="text-xs text-slate-500 line-clamp-1">{singleRenewDialog.title}</p>
              </div>
            </div>

            <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
              This ad will be restored to active status immediately. Expiration will be extended by {singleRenewDialog.days} days from today.
            </p>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                Extension Duration
              </label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { days: 30, label: '30 Days' },
                  { days: 60, label: '60 Days' },
                  { days: 90, label: '90 Days' },
                ].map((opt) => (
                  <button
                    key={opt.days}
                    type="button"
                    onClick={() => setSingleRenewDialog((prev) => ({ ...prev, days: opt.days }))}
                    className={`py-2 px-3 rounded-lg text-xs font-semibold border transition-all cursor-pointer ${
                      singleRenewDialog.days === opt.days
                        ? 'bg-emerald-50 dark:bg-emerald-950/60 border-emerald-500 text-emerald-700 dark:text-emerald-300 ring-2 ring-emerald-500/20'
                        : 'border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setSingleRenewDialog({ isOpen: false, days: 30 })}
                className="px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  if (singleRenewDialog.id) {
                    renewListing(singleRenewDialog.id, singleRenewDialog.days);
                  }
                  setSingleRenewDialog({ isOpen: false, days: 30 });
                }}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg shadow-sm transition-colors flex items-center gap-1.5 cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" /> Renew Ad (Free)
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
