'use client';
import React, { useState, useMemo } from 'react';
import { useApp } from '@/context/AppContext';
import { UserAccount, UserType, UserStatus, KycStatus } from '@/lib/types';
import {
  Search,
  Filter,
  UserCheck,
  UserX,
  Shield,
  Download,
  Eye,
  FileText,
  Building,
  CheckCircle2,
  XCircle,
  Clock,
  ExternalLink,
  ChevronLeft,
  ChevronRight,
  Star,
  Smartphone,
  MapPin,
  ArrowLeft,
} from 'lucide-react';
import { Badge } from '@/components/common/Badge';
import { ConfirmDialog } from '@/components/common/ConfirmDialog';
import { navigateTo } from '@/lib/router/useRouter';
import { buildCsvContent } from '@/lib/utils/csvHelper';

interface UsersModuleProps {
  initialTab?: 'all' | 'users' | 'businesses' | 'verification' | 'banned';
}

export const UsersModule: React.FC<UsersModuleProps> = ({ initialTab = 'all' }) => {
  const {
    users,
    verifyUserKyc,
    banUser,
    unbanUser,
    impersonateUser,
    addToast,
    setActiveSidebarTab,
  } = useApp();

  const [activeTab, setActiveTab] = useState<string>(initialTab);
  const [searchTerm, setSearchTerm] = useState('');

  // Ban Dialog
  const [banDialog, setBanDialog] = useState<{ isOpen: boolean; user?: UserAccount }>({
    isOpen: false,
  });

  // Pagination & Server-Side State (#17)
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize] = useState(10);
  const [serverUsers, setServerUsers] = useState<UserAccount[] | null>(null);
  const [serverTotal, setServerTotal] = useState<number | null>(null);
  const [serverCounts, setServerCounts] = useState<{
    all: number;
    users: number;
    businesses: number;
    verification: number;
    banned: number;
  } | null>(null);
  const [usersFetchError, setUsersFetchError] = useState<string | null>(null);

  const fetchAdminUsers = React.useCallback(
    async (page = currentPage, tab = activeTab, search = searchTerm) => {
      setIsLoadingUsers(true);
      setUsersFetchError(null);
      try {
        const params = new URLSearchParams();
        params.set('paginated', '1');
        params.set('filter', tab);
        if (search.trim()) {
          params.set('search', search.trim());
        }
        params.set('limit', String(pageSize));
        params.set('offset', String(Math.max(0, (page - 1) * pageSize)));

        const res = await fetch(`/api/admin/users?${params.toString()}`, {
          credentials: 'include',
        });
        if (res.ok) {
          const data = await res.json();
          if (Array.isArray(data.users)) {
            setServerUsers(data.users);
            setServerTotal(typeof data.total === 'number' ? data.total : data.users.length);
            if (data.counts) {
              setServerCounts(data.counts);
            }
          }
        } else {
          const errData = await res.json().catch(() => ({}));
          const errMsg = errData.error || `Failed to fetch users (HTTP ${res.status})`;
          setUsersFetchError(errMsg);
          addToast({
            type: 'error',
            title: 'User Fetch Failed',
            message: errMsg,
          });
        }
      } catch (err: any) {
        console.error('Failed to fetch paginated admin users:', err);
        const errMsg = err?.message || 'Network error fetching users';
        setUsersFetchError(errMsg);
        addToast({
          type: 'error',
          title: 'User Fetch Failed',
          message: errMsg,
        });
      } finally {
        setIsLoadingUsers(false);
      }
    },
    [currentPage, activeTab, searchTerm, pageSize, addToast]
  );

  React.useEffect(() => {
    const timer = setTimeout(() => {
      fetchAdminUsers(currentPage, activeTab, searchTerm);
    }, 150);
    return () => clearTimeout(timer);
  }, [currentPage, activeTab, searchTerm, fetchAdminUsers]);

  const filteredUsers = useMemo(() => {
    return users.filter((u) => {
      if (activeTab === 'users' && u.type !== 'user') return false;
      if (activeTab === 'businesses' && u.type !== 'business') return false;
      if (activeTab === 'verification' && u.kycStatus !== 'pending') return false;
      if (activeTab === 'banned' && u.status !== 'banned') return false;

      if (searchTerm.trim()) {
        const q = searchTerm.toLowerCase();
        const matchName = u.name.toLowerCase().includes(q);
        const matchEmail = u.email.toLowerCase().includes(q);
        const matchPhone = u.phone.includes(q);
        const matchCity = u.location.city.toLowerCase().includes(q);
        if (!matchName && !matchEmail && !matchPhone && !matchCity) return false;
      }

      return true;
    });
  }, [users, activeTab, searchTerm]);

  const totalMatchingUsers = serverTotal !== null ? serverTotal : filteredUsers.length;
  const totalPages = Math.max(1, Math.ceil(totalMatchingUsers / pageSize));
  const paginatedUsers = useMemo(() => {
    if (serverUsers !== null) return serverUsers;
    const start = (currentPage - 1) * pageSize;
    return filteredUsers.slice(start, start + pageSize);
  }, [serverUsers, filteredUsers, currentPage, pageSize]);

  // Multi-batch CSV Export (fetches complete set limit=200 per batch from server without loading all at once) (#17)
  const exportUsersCSV = async () => {
    setIsLoadingUsers(true);
    let allExportUsers: UserAccount[] = [];
    let currentOffset = 0;
    const batchSize = 200;
    let hasMore = true;
    let fetchError: string | null = null;

    try {
      while (hasMore) {
        const params = new URLSearchParams();
        params.set('paginated', '1');
        params.set('filter', activeTab);
        if (searchTerm.trim()) {
          params.set('search', searchTerm.trim());
        }
        params.set('limit', String(batchSize));
        params.set('offset', String(currentOffset));

        const res = await fetch(`/api/admin/users?${params.toString()}`, { credentials: 'include' });
        if (!res.ok) {
          const errData = await res.json().catch(() => ({}));
          throw new Error(errData.error || `HTTP error ${res.status}`);
        }

        const data = await res.json();
        const batch: UserAccount[] = Array.isArray(data.users) ? data.users : [];
        allExportUsers = [...allExportUsers, ...batch];

        const total = typeof data.total === 'number' ? data.total : allExportUsers.length;
        if (batch.length < batchSize || allExportUsers.length >= total) {
          hasMore = false;
        } else {
          currentOffset += batchSize;
        }
      }
    } catch (err: any) {
      console.error('Failed to export complete user CSV:', err);
      fetchError = err.message || 'Failed to fetch user export data';
    } finally {
      setIsLoadingUsers(false);
    }

    if (fetchError) {
      addToast({
        type: 'error',
        title: 'Export Failed',
        message: `Could not export user list: ${fetchError}`,
      });
      return;
    }

    if (allExportUsers.length === 0) {
      addToast({
        type: 'warning',
        title: 'No Data to Export',
        message: 'No users found matching current filters.',
      });
      return;
    }

    const headers = ['ID', 'Name', 'Email', 'Phone', 'Type', 'Status', 'KYC', 'City', 'Listings', 'Joined Date', 'Last IP'];
    const rows = allExportUsers.map((u) => [
      u.id,
      u.name,
      u.email,
      u.phone,
      u.type,
      u.status,
      u.kycStatus,
      u.location.city,
      u.totalListings,
      u.joinedDate,
      u.lastIp && u.lastIp !== 'unknown' ? u.lastIp : 'Not recorded',
    ]);
    const csvContent = buildCsvContent(headers, rows);
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `chillyads_users_export_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    addToast({
      type: 'success',
      title: 'Users Export Generated',
      message: `Exported ${allExportUsers.length} users across ${Math.ceil(allExportUsers.length / batchSize)} server batch(es) to CSV.`,
    });
  };

  const getKycBadge = (status: KycStatus) => {
    switch (status) {
      case 'verified':
        return <Badge variant="success">KYC Verified</Badge>;
      case 'pending':
        return <Badge variant="warning">KYC Pending</Badge>;
      case 'rejected':
        return <Badge variant="danger">KYC Rejected</Badge>;
      default:
        return <Badge variant="neutral">Not Submitted</Badge>;
    }
  };

  return (
    <div className="p-4 sm:p-6 space-y-5 max-w-7xl mx-auto text-slate-900 dark:text-white overflow-x-hidden">
      {/* Header */}
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
          <h2 className="text-xl font-bold tracking-tight">User Accounts & KYC Verification</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Manage buyers, sellers, business profiles, Aadhaar/PAN checks, and security sanctions
          </p>
        </div>

        <button
          onClick={exportUsersCSV}
          className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center gap-1.5 transition-colors self-start sm:self-auto"
        >
          <Download className="w-3.5 h-3.5" /> Export Users
        </button>
      </div>

      {/* Filter Tabs & Toolbar */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-sm space-y-3">
        <div className="flex flex-wrap items-center gap-2 pb-3 border-b border-slate-100 dark:border-slate-800">
          {[
            { id: 'all', label: 'All Users', count: serverCounts ? serverCounts.all : users.length },
            {
              id: 'users',
              label: 'Regular Users',
              count: serverCounts ? serverCounts.users : users.filter((u) => u.type === 'user').length,
            },
            {
              id: 'businesses',
              label: 'Dealers & Businesses',
              count: serverCounts ? serverCounts.businesses : users.filter((u) => u.type === 'business').length,
            },
            {
              id: 'verification',
              label: 'Pending KYC',
              count: serverCounts ? serverCounts.verification : users.filter((u) => u.kycStatus === 'pending').length,
              isHighlight: true,
            },
            {
              id: 'banned',
              label: 'Banned Accounts',
              count: serverCounts ? serverCounts.banned : users.filter((u) => u.status === 'banned').length,
            },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => {
                setActiveTab(tab.id);
                setCurrentPage(1);
              }}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-2 transition-all ${
                activeTab === tab.id
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <span>{tab.label}</span>
              <span
                className={`px-1.5 py-0.2 rounded-full text-[10px] ${
                  tab.isHighlight && tab.count > 0
                    ? 'bg-amber-500 text-slate-950 font-bold'
                    : activeTab === tab.id
                    ? 'bg-white/25 text-white'
                    : 'bg-slate-200 dark:bg-slate-700'
                }`}
              >
                {tab.count}
              </span>
            </button>
          ))}
        </div>

        <div className="relative max-w-md">
          <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setCurrentPage(1);
            }}
            placeholder="Search by name, email, phone, or Indian city..."
            className="w-full text-xs rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/60 pl-9 pr-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>

      {/* Users Table */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-800 text-slate-500 font-semibold uppercase tracking-wider">
                <th className="p-3">User & Contact</th>
                <th className="p-3">Account Type</th>
                <th className="p-3">Location</th>
                <th className="p-3">KYC Status</th>
                <th className="p-3">Account Status</th>
                <th className="p-3">Ads Posted</th>
                <th className="p-3">Login IP & Activity</th>
                <th className="p-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {paginatedUsers.length === 0 ? (
                <tr>
                  <td colSpan={8} className="p-12 text-center text-slate-400">
                    No users found matching criteria
                  </td>
                </tr>
              ) : (
                paginatedUsers.map((user) => (
                  <tr
                    key={user.id}
                    className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors"
                  >
                    <td className="p-3">
                      <div className="flex items-center gap-3">
                        <img
                          src={user.avatar}
                          alt=""
                          className="w-9 h-9 rounded-full object-cover shrink-0 border border-slate-200 dark:border-slate-700"
                        />
                        <div className="min-w-0">
                          <div className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                            <span>{user.name}</span>
                            {user.businessDetails?.verifiedBusiness && (
                              <Badge variant="info" size="sm">
                                Verified Business
                              </Badge>
                            )}
                          </div>
                          <div className="text-slate-400 text-[11px] truncate">{user.email}</div>
                          <div className="text-slate-400 text-[11px]">{user.phone}</div>
                        </div>
                      </div>
                    </td>

                    <td className="p-3 capitalize font-medium text-slate-700 dark:text-slate-300">
                      {user.type === 'business' ? (
                        <div className="flex items-center gap-1 text-blue-600 dark:text-blue-400">
                          <Building className="w-3.5 h-3.5" /> Dealer/Corp
                        </div>
                      ) : (
                        user.type
                      )}
                    </td>

                    <td className="p-3 text-slate-600 dark:text-slate-400">
                      <div className="flex items-center gap-1">
                        <MapPin className="w-3 h-3 text-slate-400" />
                        <span>{user.location.city}</span>
                      </div>
                      <div className="text-[10px] text-slate-400">{user.location.state}</div>
                    </td>

                    <td className="p-3">
                      <div className="flex items-center gap-1.5">
                        {getKycBadge(user.kycStatus)}
                        {user.kycDocument && (
                          <button
                            onClick={() => navigateTo(`/admin/users/kyc/${user.id}`)}
                            className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded text-blue-600 text-[11px] font-semibold flex items-center gap-0.5"
                            title="Inspect Government KYC Document at URL"
                          >
                            <FileText className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </td>

                    <td className="p-3">
                      {user.status === 'active' ? (
                        <Badge variant="success">Active</Badge>
                      ) : user.status === 'banned' ? (
                        <Badge variant="danger">Banned</Badge>
                      ) : (
                        <Badge variant="warning">Suspended</Badge>
                      )}
                    </td>

                    <td className="p-3 font-semibold text-slate-900 dark:text-white">
                      {user.activeListings} active / {user.totalListings} total
                    </td>

                    <td className="p-3 text-[11px] text-slate-500">
                      <div className="font-mono text-[10px] text-slate-400">
                        IP: {user.lastIp && user.lastIp !== 'unknown' ? user.lastIp : 'Not recorded'}
                      </div>
                      <div>Last: {user.lastLogin}</div>
                    </td>

                    <td className="p-3 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        {/* Impersonate User with Audit Trail */}
                        <button
                          onClick={() => impersonateUser(user)}
                          className="px-2 py-1 bg-amber-500/10 hover:bg-amber-500/20 text-amber-600 dark:text-amber-400 rounded font-semibold text-[11px] flex items-center gap-1 transition-colors"
                          title="Impersonate / Login as user (logged in audit trail)"
                        >
                          <Shield className="w-3 h-3" /> Login As
                        </button>

                        {/* Ban / Unban */}
                        {user.status === 'banned' ? (
                          <button
                            onClick={async () => {
                              await unbanUser(user.id);
                              fetchAdminUsers(currentPage, activeTab, searchTerm);
                            }}
                            className="p-1.5 hover:bg-emerald-50 dark:hover:bg-emerald-950 text-emerald-600 rounded transition-colors"
                            title="Restore Account"
                          >
                            <CheckCircle2 className="w-3.5 h-3.5" />
                          </button>
                        ) : (
                          <button
                            onClick={() => setBanDialog({ isOpen: true, user })}
                            className="p-1.5 hover:bg-rose-50 dark:hover:bg-rose-950 text-rose-500 rounded transition-colors"
                            title="Ban User & Deactivate Listings"
                          >
                            <UserX className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="p-4 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs text-slate-500">
          <div>
            {totalMatchingUsers === 0
              ? 'Showing 0 users'
              : `Showing ${(currentPage - 1) * pageSize + 1} - ${Math.min(
                  currentPage * pageSize,
                  totalMatchingUsers
                )} of ${totalMatchingUsers} users`}
          </div>
          <div className="flex items-center gap-2">
            <button
              disabled={currentPage === 1 || isLoadingUsers}
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              className="p-1.5 rounded border border-slate-200 dark:border-slate-800 disabled:opacity-40 hover:bg-slate-100 dark:hover:bg-slate-800"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="font-semibold text-slate-700 dark:text-slate-300">
              Page {currentPage} of {totalPages}
            </span>
            <button
              disabled={currentPage >= totalPages || isLoadingUsers}
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              className="p-1.5 rounded border border-slate-200 dark:border-slate-800 disabled:opacity-40 hover:bg-slate-100 dark:hover:bg-slate-800"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Ban Confirmation Dialog */}
      <ConfirmDialog
        isOpen={banDialog.isOpen}
        onClose={() => setBanDialog({ isOpen: false })}
        onConfirm={async (reason) => {
          if (banDialog.user) {
            await banUser(banDialog.user.id, reason || 'Safety policy violation');
            fetchAdminUsers(currentPage, activeTab, searchTerm);
          }
        }}
        title={`Ban Account: ${banDialog.user?.name}`}
        description="Banning this user will immediately deactivate all their active classified ads and restrict their phone/email from further postings."
        confirmText="Ban User"
        isDestructive={true}
        requireReason={true}
        reasonPlaceholder="Specify reason (e.g., fraud attempt, scam links, abusive behavior)..."
      />
    </div>
  );
};
