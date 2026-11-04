'use client';
import React from 'react';
import { useApp } from '@/context/AppContext';
import {
  Users,
  ShoppingBag,
  Clock,
  AlertTriangle,
  TrendingUp,
  CreditCard,
  CheckCircle2,
  XCircle,
  Star,
  Activity,
  ArrowUpRight,
  ShieldCheck,
  Zap,
  Globe,
} from 'lucide-react';
import { Badge } from '@/components/common/Badge';
import { navigateTo } from '@/lib/router/useRouter';

export const DashboardModule: React.FC = () => {
  const {
    listings,
    users,
    reports,
    transactions,
    auditLogs,
    setActiveSidebarTab,
    approveListing,
    rejectListing,
    featureListing,
  } = useApp();

  const totalUsers = users.length;
  const activeSellers = users.filter((u) => u.type === 'user' || u.type === 'business').length;
  const pendingApprovals = listings.filter((l) => l.status === 'pending');
  const reportedCount = reports.filter((r) => r.status === 'pending').length;
  const approvedListings = listings.filter((l) => l.status === 'approved').length;

  const totalRevenue = transactions
    .filter((t) => t.status === 'completed')
    .reduce((acc, curr) => acc + curr.amount, 0);

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto text-[#202124] dark:text-white">
      {/* Google Cloud Console Project Overview Header */}
      <div className="bg-white dark:bg-slate-900 rounded-xl p-6 border border-[#dadce0] dark:border-slate-800 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-xs text-[#5f6368] dark:text-slate-400">
            <span>Enterprise Workspace</span>
            <span aria-hidden="true">·</span>
            <span className="font-mono">chillyads-enterprise</span>
            <span aria-hidden="true">·</span>
            <span>Live Marketplace</span>
          </div>
          <h2 className="text-2xl font-display font-bold tracking-tight text-[#202124] dark:text-white">
            Marketplace Operations & Moderation Console
          </h2>
          <p className="text-sm text-[#5f6368] dark:text-slate-400 max-w-2xl">
            Manage verified sellers, real-time moderation queues, category attributes, and boost monetization packages from a unified control plane.
          </p>
        </div>
        <div className="flex items-center gap-2.5 flex-wrap shrink-0">
          <button
            onClick={() => {
              setActiveSidebarTab('marketplace/pending');
              navigateTo('/admin/marketplace/pending');
            }}
            className="px-4 py-2 bg-[#1a73e8] hover:bg-[#1557b0] text-white font-semibold rounded-md text-xs flex items-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap"
          >
            <Clock className="w-3.5 h-3.5" />
            <span>Review Queue ({pendingApprovals.length})</span>
          </button>
          <button
            onClick={() => {
              setActiveSidebarTab('moderation/reports');
              navigateTo('/admin/moderation/reports');
            }}
            className="px-4 py-2 bg-white dark:bg-slate-800 hover:bg-[#f8f9fa] dark:hover:bg-slate-700 text-[#3c4043] dark:text-slate-200 border border-[#dadce0] dark:border-slate-700 font-semibold rounded-md text-xs flex items-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap"
          >
            <AlertTriangle className="w-3.5 h-3.5 text-[#d93025]" />
            <span>Reports ({reportedCount})</span>
          </button>
          <button
            onClick={() => navigateTo('/')}
            className="px-4 py-2 bg-[#1dbf73] hover:bg-[#19a463] text-white font-semibold rounded-md text-xs flex items-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap"
          >
            <Globe className="w-3.5 h-3.5" />
            <span>Open Marketplace</span>
          </button>
        </div>
      </div>

      {/* Google Cloud Console KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Users */}
        <div
          onClick={() => {
            setActiveSidebarTab('users/all');
            navigateTo('/admin/users/all');
          }}
          className="bg-white dark:bg-slate-900 border border-[#dadce0] dark:border-slate-800 rounded-lg p-5 hover:border-[#1a73e8] cursor-pointer transition-colors group"
        >
          <div className="flex items-center justify-between text-[#5f6368] dark:text-slate-400">
            <span className="text-xs font-medium">Registered Accounts</span>
            <Users className="w-4 h-4 text-[#1a73e8]" />
          </div>
          <div className="text-2xl font-display font-bold mt-2 tracking-tight font-mono tabular-nums">
            {totalUsers.toLocaleString()}
          </div>
          <div className="flex items-center gap-1.5 text-xs text-[#137333] dark:text-emerald-400 mt-2 font-medium">
            <ArrowUpRight className="w-3.5 h-3.5" />
            <span>+18.4% in 30 days</span>
            <span className="text-[#5f6368] dark:text-slate-400 font-normal">· {activeSellers} active</span>
          </div>
        </div>

        {/* Active Classified Listings */}
        <div
          onClick={() => {
            setActiveSidebarTab('marketplace/listings');
            navigateTo('/admin/marketplace/listings');
          }}
          className="bg-white dark:bg-slate-900 border border-[#dadce0] dark:border-slate-800 rounded-lg p-5 hover:border-[#1a73e8] cursor-pointer transition-colors group"
        >
          <div className="flex items-center justify-between text-[#5f6368] dark:text-slate-400">
            <span className="text-xs font-medium">Approved Listings</span>
            <ShoppingBag className="w-4 h-4 text-[#1dbf73]" />
          </div>
          <div className="text-2xl font-display font-bold mt-2 tracking-tight font-mono tabular-nums">
            {approvedListings.toLocaleString()}
          </div>
          <div className="flex items-center gap-1.5 text-xs text-[#137333] dark:text-emerald-400 mt-2 font-medium">
            <ArrowUpRight className="w-3.5 h-3.5" />
            <span>+42 published in 24h</span>
          </div>
        </div>

        {/* Pending Moderation Approvals */}
        <div
          onClick={() => {
            setActiveSidebarTab('marketplace/pending');
            navigateTo('/admin/marketplace/pending');
          }}
          className="bg-white dark:bg-slate-900 border border-[#dadce0] dark:border-slate-800 rounded-lg p-5 hover:border-[#1a73e8] cursor-pointer transition-colors group"
        >
          <div className="flex items-center justify-between text-[#5f6368] dark:text-slate-400">
            <span className="text-xs font-medium">Pending Moderation</span>
            <Clock className="w-4 h-4 text-[#e37400]" />
          </div>
          <div className="text-2xl font-display font-bold mt-2 tracking-tight font-mono tabular-nums text-[#e37400] dark:text-amber-400">
            {pendingApprovals.length}
          </div>
          <div className="text-xs text-[#5f6368] dark:text-slate-400 mt-2">
            Median review SLA: <strong className="font-mono tabular-nums text-[#202124] dark:text-slate-200">4.2 mins</strong>
          </div>
        </div>

        {/* Revenue & Packages */}
        <div
          onClick={() => {
            setActiveSidebarTab('commerce/transactions');
            navigateTo('/admin/commerce/transactions');
          }}
          className="bg-white dark:bg-slate-900 border border-[#dadce0] dark:border-slate-800 rounded-lg p-5 hover:border-[#1a73e8] cursor-pointer transition-colors group"
        >
          <div className="flex items-center justify-between text-[#5f6368] dark:text-slate-400">
            <span className="text-xs font-medium">Boost & Ad Revenue</span>
            <CreditCard className="w-4 h-4 text-[#1a73e8]" />
          </div>
          <div className="text-2xl font-display font-bold mt-2 tracking-tight font-mono tabular-nums text-[#202124] dark:text-white">
            ₹{totalRevenue.toLocaleString('en-IN')}
          </div>
          <div className="flex items-center gap-1.5 text-xs text-[#137333] dark:text-emerald-400 mt-2 font-medium">
            <TrendingUp className="w-3.5 h-3.5" />
            <span>Promoted gigs & featured ads</span>
          </div>
        </div>
      </div>

      {/* Quick Action Approval Queue & Activity Log */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white dark:bg-slate-900 border border-[#dadce0] dark:border-slate-800 rounded-lg p-5">
          <div className="flex items-center justify-between pb-3 mb-4 border-b border-[#dadce0] dark:border-slate-800">
            <div>
              <h3 className="text-base font-display font-semibold tracking-tight">Pending Moderation Queue</h3>
              <p className="text-xs text-[#5f6368] dark:text-slate-400">
                Newly submitted listings awaiting manual trust & safety verification
              </p>
            </div>
            <button
              onClick={() => {
                setActiveSidebarTab('marketplace/pending');
                navigateTo('/admin/marketplace/pending');
              }}
              className="text-xs font-semibold text-[#1a73e8] hover:underline cursor-pointer"
            >
              View all ({pendingApprovals.length})
            </button>
          </div>

          {pendingApprovals.length === 0 ? (
            <div className="p-8 text-center text-[#5f6368] bg-[#f8f9fa] dark:bg-slate-800/40 rounded-lg border border-[#dadce0]/60 dark:border-slate-800">
              <CheckCircle2 className="w-8 h-8 mx-auto text-[#1dbf73] mb-2" />
              <p className="font-semibold text-sm text-[#202124] dark:text-white">Moderation queue is clear</p>
              <p className="text-xs mt-1">All submitted listings have been reviewed.</p>
            </div>
          ) : (
            <div className="divide-y divide-[#dadce0] dark:divide-slate-800">
              {pendingApprovals.slice(0, 3).map((item) => (
                <div
                  key={item.id}
                  className="flex flex-col sm:flex-row sm:items-center justify-between py-3.5 first:pt-0 last:pb-0 gap-3"
                >
                  <div className="flex items-start sm:items-center gap-3 min-w-0">
                    <img
                      src={item.images[0]}
                      alt={item.title}
                      referrerPolicy="no-referrer"
                      className="w-14 h-14 rounded-md object-cover shrink-0 border border-[#dadce0] dark:border-slate-700"
                    />
                    <div className="min-w-0">
                      <div className="font-semibold text-sm text-[#202124] dark:text-white truncate">{item.title}</div>
                      <div className="text-xs text-[#5f6368] dark:text-slate-400 mt-0.5 flex items-center gap-1.5 flex-wrap">
                        <span className="font-mono tabular-nums font-semibold text-[#202124] dark:text-white">
                          ₹{item.price.toLocaleString('en-IN')}
                        </span>
                        <span aria-hidden="true">·</span>
                        <span>{item.location.city}</span>
                        <span aria-hidden="true">·</span>
                        <span>Seller: {item.sellerName}</span>
                      </div>
                      <div className="text-[11px] text-[#5f6368] dark:text-slate-400 mt-1 flex items-center gap-1.5">
                        <span>Submitted {item.createdAt.split('T')[0]}</span>
                        {item.spamScore && item.spamScore > 10 && (
                          <>
                            <span aria-hidden="true">·</span>
                            <span className="text-[#d93025] font-semibold font-mono tabular-nums">
                              Spam Risk {item.spamScore}%
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Quick Moderation Actions */}
                  <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
                    <button
                      onClick={() => approveListing(item.id)}
                      className="px-3 py-1.5 bg-[#1dbf73] hover:bg-[#19a463] text-white rounded-md text-xs font-semibold flex items-center gap-1 transition-colors cursor-pointer"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" /> Approve
                    </button>
                    <button
                      onClick={() => rejectListing(item.id, 'Incomplete details or price anomaly')}
                      className="px-3 py-1.5 bg-white dark:bg-slate-800 hover:bg-rose-50 text-[#d93025] border border-[#dadce0] dark:border-slate-700 rounded-md text-xs font-semibold flex items-center gap-1 transition-colors cursor-pointer"
                    >
                      <XCircle className="w-3.5 h-3.5" /> Reject
                    </button>
                    <button
                      onClick={() => featureListing(item.id, true)}
                      className="p-1.5 border border-[#dadce0] dark:border-slate-700 hover:bg-[#f8f9fa] dark:hover:bg-slate-800 text-[#e37400] rounded-md text-xs transition-colors cursor-pointer"
                      title="Promote / Feature"
                    >
                      <Star className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Cloud Audit Logs Stream */}
        <div className="bg-white dark:bg-slate-900 border border-[#dadce0] dark:border-slate-800 rounded-lg p-5 flex flex-col">
          <div className="flex items-center justify-between pb-3 mb-4 border-b border-[#dadce0] dark:border-slate-800">
            <div className="flex items-center gap-2">
              <Activity className="w-4 h-4 text-[#1a73e8]" />
              <h3 className="text-base font-display font-semibold tracking-tight">Cloud Audit Logs</h3>
            </div>
            <button
              onClick={() => setActiveSidebarTab('admin/logs')}
              className="text-xs font-semibold text-[#1a73e8] hover:underline cursor-pointer"
            >
              View all
            </button>
          </div>

          <div className="flex-1 divide-y divide-[#dadce0]/70 dark:divide-slate-800 overflow-y-auto max-h-80 pr-1">
            {auditLogs.slice(0, 5).map((log) => (
              <div
                key={log.id}
                className="text-xs py-2.5 first:pt-0 last:pb-0 space-y-0.5"
              >
                <div className="flex items-center justify-between text-[#5f6368] dark:text-slate-400 text-[11px]">
                  <span className="font-semibold text-[#202124] dark:text-slate-200">
                    {log.adminName}
                  </span>
                  <span className="font-mono tabular-nums">{log.timestamp}</span>
                </div>
                <div className="font-medium text-[#1a73e8] dark:text-blue-400">
                  {log.action.replace(/_/g, ' ')}
                </div>
                <div className="text-[#5f6368] dark:text-slate-400 text-[11px] truncate">
                  {log.targetSummary}
                </div>
              </div>
            ))}
          </div>

          <div className="mt-4 pt-3 border-t border-[#dadce0] dark:border-slate-800 flex items-center justify-between text-xs text-[#5f6368] dark:text-slate-400">
            <span>Immutable Activity Trail</span>
            <span className="font-mono text-[11px]">Verified Audit Trail</span>
          </div>
        </div>
      </div>

      {/* Platform Telemetry & Conversion Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white dark:bg-slate-900 border border-[#dadce0] dark:border-slate-800 rounded-lg p-4 flex items-center gap-4">
          <div className="p-2.5 rounded-lg bg-[#e8f0fe] dark:bg-blue-950/40 text-[#1a73e8]">
            <Zap className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xs text-[#5f6368] dark:text-slate-400 font-medium">30-Day Unique Buyers</div>
            <div className="text-lg font-display font-bold font-mono tabular-nums mt-0.5">142,890</div>
            <div className="text-[11px] text-[#137333] dark:text-emerald-400">+12.4% vs prior 30 days</div>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-[#dadce0] dark:border-slate-800 rounded-lg p-4 flex items-center gap-4">
          <div className="p-2.5 rounded-lg bg-[#e6f4ea] dark:bg-emerald-950/40 text-[#1dbf73]">
            <TrendingUp className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xs text-[#5f6368] dark:text-slate-400 font-medium">Buyer-to-Seller Inquiry Rate</div>
            <div className="text-lg font-display font-bold font-mono tabular-nums mt-0.5">24.6%</div>
            <div className="text-[11px] text-[#5f6368] dark:text-slate-400">Direct chat & phone reveals per view</div>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-[#dadce0] dark:border-slate-800 rounded-lg p-4 flex items-center gap-4">
          <div className="p-2.5 rounded-lg bg-[#fef7e0] dark:bg-amber-950/40 text-[#e37400]">
            <Star className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xs text-[#5f6368] dark:text-slate-400 font-medium">Promoted Gig Velocity</div>
            <div className="text-lg font-display font-bold font-mono tabular-nums mt-0.5">8.4x Faster</div>
            <div className="text-[11px] text-[#5f6368] dark:text-slate-400">Median closure within 4 days</div>
          </div>
        </div>
      </div>
    </div>
  );
};

