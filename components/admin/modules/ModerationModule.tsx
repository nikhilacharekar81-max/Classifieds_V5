'use client';
import React, { useState } from 'react';
import { useApp } from '@/context/AppContext';
import { ModerationRule, ReportItem } from '@/lib/types';
import {
  ShieldAlert,
  AlertTriangle,
  Bot,
  Sliders,
  CheckCircle2,
  XCircle,
  Plus,
  Trash2,
  Check,
  Ban,
  Eye,
  Search,
  Lock,
  ArrowLeft,
} from 'lucide-react';
import { Badge } from '@/components/common/Badge';
import { useRouter, navigateTo } from '@/lib/router/useRouter';

export const ModerationModule: React.FC = () => {
  const {
    reports,
    rules,
    actionReport,
    addModerationRule,
    toggleModerationRule,
    banUser,
    rejectListing,
    listings,
    addToast,
    setActiveSidebarTab,
  } = useApp();
  const { path } = useRouter();

  const [activeTab, setActiveTab] = useState<'queue' | 'rules' | 'spam'>('queue');
  const [reportFilter, setReportFilter] = useState<'all' | 'pending' | 'actioned'>('all');

  // Dedicated Route for New Moderation Rule
  const isAddRuleRoute = path === '/admin/moderation/rules/new';

  const [newRule, setNewRule] = useState({
    title: '',
    type: 'keyword_blacklist' as ModerationRule['type'],
    action: 'flag_for_review' as ModerationRule['action'],
    keywordsString: '',
    threshold: 50,
  });

  const handleAddRule = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newRule.title.trim()) return;

    addModerationRule({
      title: newRule.title,
      type: newRule.type,
      action: newRule.action,
      keywords:
        newRule.type === 'keyword_blacklist'
          ? newRule.keywordsString.split(',').map((s) => s.trim().toLowerCase()).filter(Boolean)
          : undefined,
      threshold: newRule.type === 'price_anomaly' || newRule.type === 'rapid_posting' ? Number(newRule.threshold) : undefined,
      isActive: true,
    });

    addToast({
      title: 'Rule Deployed',
      message: `Moderation rule "${newRule.title}" is now active in the auto-moderator engine.`,
      type: 'success',
    });

    setNewRule({
      title: '',
      type: 'keyword_blacklist',
      action: 'flag_for_review',
      keywordsString: '',
      threshold: 50,
    });
    navigateTo('/admin/moderation');
  };

  // If on /admin/moderation/rules/new, render dedicated webpage view!
  if (isAddRuleRoute) {
    return (
      <div className="p-6 space-y-6 max-w-4xl mx-auto text-slate-900 dark:text-white animate-in fade-in duration-150">
        <div className="flex items-center justify-between pb-4 border-b border-slate-200 dark:border-slate-800">
          <div>
            <div className="flex items-center gap-2 text-xs text-slate-500 mb-1">
              <button
                onClick={() => navigateTo('/admin/moderation')}
                className="hover:text-blue-600 flex items-center gap-1 font-medium"
              >
                <ArrowLeft className="w-3.5 h-3.5" /> Back to Moderation Hub
              </button>
              <span>/</span>
              <span>Create Rule</span>
            </div>
            <h1 className="text-xl font-bold tracking-tight flex items-center gap-2">
              <Bot className="w-5 h-5 text-purple-600" />
              <span>Create Automated AI & Heuristic Moderation Rule</span>
            </h1>
          </div>
          <span className="text-xs font-mono bg-slate-100 dark:bg-slate-800 text-slate-500 px-3 py-1 rounded-lg">
            URL: {path}
          </span>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm">
          <form onSubmit={handleAddRule} className="space-y-4 text-xs">
            <div>
              <label className="block font-semibold mb-1 text-slate-700 dark:text-slate-300">Rule Name / Description *</label>
              <input
                type="text"
                required
                value={newRule.title}
                onChange={(e) => setNewRule({ ...newRule, title: e.target.value })}
                placeholder="e.g. Counterfeit Luxury Goods & Fake iPhone Filter"
                className="w-full text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 p-2.5 focus:ring-2 focus:ring-blue-500 focus:outline-none"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block font-semibold mb-1 text-slate-700 dark:text-slate-300">Rule Type</label>
                <select
                  value={newRule.type}
                  onChange={(e) => setNewRule({ ...newRule, type: e.target.value as any })}
                  className="w-full text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 p-2.5 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                >
                  <option value="keyword_blacklist">Keyword Blacklist</option>
                  <option value="price_anomaly">Price Anomaly</option>
                  <option value="rapid_posting">Rapid Spam Posting</option>
                </select>
              </div>
              <div>
                <label className="block font-semibold mb-1 text-slate-700 dark:text-slate-300">Triggered Action</label>
                <select
                  value={newRule.action}
                  onChange={(e) => setNewRule({ ...newRule, action: e.target.value as any })}
                  className="w-full text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 p-2.5 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                >
                  <option value="flag_for_review">Flag for Manual Review</option>
                  <option value="auto_reject">Auto-Reject Ad</option>
                  <option value="auto_ban_user">Auto-Ban User & Remove Ads</option>
                </select>
              </div>
            </div>

            {newRule.type === 'keyword_blacklist' && (
              <div>
                <label className="block font-semibold mb-1 text-slate-700 dark:text-slate-300">
                  Blacklist Keywords (comma separated) *
                </label>
                <textarea
                  rows={3}
                  required
                  value={newRule.keywordsString}
                  onChange={(e) => setNewRule({ ...newRule, keywordsString: e.target.value })}
                  placeholder="e.g. fake rolex, first copy, courier advance, lottery, telegram link, crypto pump"
                  className="w-full text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 p-2.5 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>
            )}

            {newRule.type !== 'keyword_blacklist' && (
              <div>
                <label className="block font-semibold mb-1 text-slate-700 dark:text-slate-300">Threshold Parameter</label>
                <input
                  type="number"
                  value={newRule.threshold}
                  onChange={(e) => setNewRule({ ...newRule, threshold: Number(e.target.value) })}
                  className="w-full text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 p-2.5 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>
            )}

            <div className="flex items-center justify-end gap-2 pt-4 border-t border-slate-200 dark:border-slate-800">
              <button
                type="button"
                onClick={() => navigateTo('/admin/moderation')}
                className="px-4 py-2 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg font-medium"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg shadow"
              >
                Save & Deploy Rule
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  }

  const filteredReports = reports.filter((r) => {
    if (reportFilter === 'pending') return r.status === 'pending';
    if (reportFilter === 'actioned') return r.status === 'actioned' || r.status === 'dismissed';
    return true;
  });

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
          <h2 className="text-xl font-bold tracking-tight">Trust & Safety / Moderation Engine</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Audit user complaints, advance-fee phishing traps, AI spam flags, and keyword blacklists
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => navigateTo('/admin/moderation/rules/new')}
            className="px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 shadow-sm transition-colors"
          >
            <Plus className="w-4 h-4" /> Add Moderation Rule
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 dark:border-slate-800 pb-3">
        <button
          onClick={() => setActiveTab('queue')}
          className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all ${
            activeTab === 'queue'
              ? 'bg-blue-600 text-white shadow-sm'
              : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:text-white'
          }`}
        >
          <ShieldAlert className="w-3.5 h-3.5" />
          <span>Report Queue ({reports.filter((r) => r.status === 'pending').length})</span>
        </button>

        <button
          onClick={() => setActiveTab('rules')}
          className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all ${
            activeTab === 'rules'
              ? 'bg-blue-600 text-white shadow-sm'
              : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:text-white'
          }`}
        >
          <Sliders className="w-3.5 h-3.5" />
          <span>Automated Rules & Keyword Blacklist ({rules.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('spam')}
          className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all ${
            activeTab === 'spam'
              ? 'bg-blue-600 text-white shadow-sm'
              : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:text-white'
          }`}
        >
          <Bot className="w-3.5 h-3.5" />
          <span>AI Spam Detection Engine</span>
        </button>
      </div>

      {/* Tab 1: Report Queue */}
      {activeTab === 'queue' && (
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-slate-500">Filter status:</span>
            {['all', 'pending', 'actioned'].map((st) => (
              <button
                key={st}
                onClick={() => setReportFilter(st as any)}
                className={`px-2.5 py-1 rounded text-xs capitalize ${
                  reportFilter === st
                    ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900 font-bold'
                    : 'text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                {st}
              </button>
            ))}
          </div>

          <div className="grid grid-cols-1 gap-4">
            {filteredReports.map((report) => {
              const matchedListing = listings.find((l) => l.id === report.targetId);

              return (
                <div
                  key={report.id}
                  className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4"
                >
                  <div className="flex items-start gap-3 min-w-0">
                    {report.targetImage ? (
                      <img
                        src={report.targetImage}
                        alt=""
                        className="w-16 h-16 rounded-xl object-cover shrink-0 border border-slate-200 dark:border-slate-700"
                      />
                    ) : (
                      <div className="w-16 h-16 rounded-xl bg-rose-50 dark:bg-rose-950/40 text-rose-500 flex items-center justify-center shrink-0">
                        <AlertTriangle className="w-7 h-7" />
                      </div>
                    )}

                    <div className="min-w-0 space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <Badge variant="danger">{report.reason.toUpperCase().replace('_', ' ')}</Badge>
                        <span className="text-xs font-mono text-slate-400">ID: {report.id}</span>
                        <span className="text-xs text-slate-400">•</span>
                        <span className="text-xs text-slate-400">{report.createdAt}</span>
                      </div>

                      <div className="font-bold text-slate-900 dark:text-white text-sm">
                        Target: {report.targetTitle}
                      </div>

                      <p className="text-xs text-slate-600 dark:text-slate-300 bg-slate-50 dark:bg-slate-800/60 p-2 rounded-lg border border-slate-100 dark:border-slate-800">
                        <span className="font-semibold text-slate-700 dark:text-slate-300">
                          Reported by {report.reportedByName}:
                        </span>{' '}
                        &quot;{report.notes}&quot;
                      </p>

                      {report.actionTaken && (
                        <div className="text-[11px] text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-1">
                          <CheckCircle2 className="w-3.5 h-3.5" /> Action Applied: {report.actionTaken}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Moderation Actions */}
                  <div className="flex items-center gap-2 shrink-0 self-end md:self-center">
                    {matchedListing && (
                      <button
                        onClick={() => navigateTo(`/item/${matchedListing.id}`)}
                        className="px-2.5 py-1.5 border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-xs font-medium text-slate-700 dark:text-slate-300 flex items-center gap-1"
                      >
                        <Eye className="w-3.5 h-3.5" /> View Ad
                      </button>
                    )}

                    {report.status === 'pending' ? (
                      <>
                        <button
                          onClick={() => {
                            if (report.type === 'listing') {
                              rejectListing(report.targetId, `Report confirmed: ${report.reason}`);
                            }
                            actionReport(report.id, 'Confirmed violation. Listing rejected.', 'actioned');
                          }}
                          className="px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-semibold flex items-center gap-1 shadow"
                        >
                          <XCircle className="w-3.5 h-3.5" /> Take Down & Sanction
                        </button>
                        <button
                          onClick={() => actionReport(report.id, 'False alarm. Dismissed by admin.', 'dismissed')}
                          className="px-3 py-1.5 bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 rounded-lg text-xs font-semibold"
                        >
                          Dismiss Report
                        </button>
                      </>
                    ) : (
                      <Badge variant="neutral">Status: {report.status}</Badge>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Tab 2: Moderation Rules & Blacklist */}
      {activeTab === 'rules' && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden shadow-sm">
          <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold">Active Automated Moderation Rules</h3>
              <p className="text-xs text-slate-500">
                Incoming ads are evaluated against these rules before hitting public search
              </p>
            </div>
            <button
              onClick={() => navigateTo('/admin/moderation/rules/new')}
              className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold flex items-center gap-1 shadow-sm"
            >
              <Plus className="w-3.5 h-3.5" /> New Rule
            </button>
          </div>

          <div className="divide-y divide-slate-100 dark:divide-slate-800 text-xs">
            {rules.map((rule) => (
              <div key={rule.id} className="p-4 flex items-start justify-between gap-4">
                <div className="space-y-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-slate-900 dark:text-white text-sm">
                      {rule.title}
                    </span>
                    <Badge variant="purple">{rule.type.replace('_', ' ')}</Badge>
                  </div>

                  <div className="text-slate-500">
                    Automated Trigger Action:{' '}
                    <strong className="text-slate-800 dark:text-slate-200 uppercase font-mono">
                      {rule.action.replace(/_/g, ' ')}
                    </strong>
                  </div>

                  {rule.keywords && (
                    <div className="flex flex-wrap gap-1.5 mt-2">
                      <span className="text-slate-400 font-medium">Keywords:</span>
                      {rule.keywords.map((kw) => (
                        <span
                          key={kw}
                          className="px-2 py-0.5 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded font-mono text-[11px]"
                        >
                          &quot;{kw}&quot;
                        </span>
                      ))}
                    </div>
                  )}

                  {rule.threshold !== undefined && (
                    <div className="text-slate-500">
                      Threshold Parameter: <strong>{rule.threshold}</strong>
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-3 shrink-0">
                  <button
                    onClick={() => toggleModerationRule(rule.id)}
                    className="cursor-pointer"
                  >
                    {rule.isActive ? (
                      <Badge variant="success">Active Rule</Badge>
                    ) : (
                      <Badge variant="neutral">Disabled</Badge>
                    )}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tab 3: AI Spam Engine Status */}
      {activeTab === 'spam' && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 shadow-sm space-y-4">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-emerald-50 dark:bg-emerald-950/50 rounded-xl text-emerald-600">
              <Bot className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-base font-bold">Heuristic & Keyword Anti-Phishing Guard</h3>
              <p className="text-xs text-slate-500">
                Machine-learning assisted scanning for fake QR codes, Telegram links, and lottery traps
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
            <div className="p-4 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-800">
              <div className="text-xs text-slate-400 font-semibold uppercase">Scanned Today</div>
              <div className="text-2xl font-black mt-1">1,842 ads</div>
              <div className="text-[11px] text-emerald-600 mt-1">100% throughput</div>
            </div>
            <div className="p-4 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-800">
              <div className="text-xs text-slate-400 font-semibold uppercase">Auto-Flagged Spam</div>
              <div className="text-2xl font-black mt-1 text-rose-500">38 ads</div>
              <div className="text-[11px] text-slate-500 mt-1">99.4% precision</div>
            </div>
            <div className="p-4 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-800">
              <div className="text-xs text-slate-400 font-semibold uppercase">Fraud IP Blocks</div>
              <div className="text-2xl font-black mt-1 text-amber-500">14 IPs</div>
              <div className="text-[11px] text-slate-500 mt-1">Automatic firewall sync</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
