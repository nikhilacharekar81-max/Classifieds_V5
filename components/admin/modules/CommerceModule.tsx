'use client';
import React, { useState, useEffect } from 'react';
import { useApp } from '@/context/AppContext';
import { PromotionalPackage, OrderTransaction } from '@/lib/types';
import {
  CreditCard,
  Sparkles,
  Receipt,
  Percent,
  Plus,
  CheckCircle2,
  Download,
  Settings,
  Shield,
  Zap,
  Building,
  Coins,
  ArrowLeft,
  Edit2,
} from 'lucide-react';
import { Badge } from '@/components/common/Badge';
import { useRouter, navigateTo } from '@/lib/router/useRouter';

export const CommerceModule: React.FC = () => {
  const {
    packages,
    transactions,
    addPackage,
    updatePackage,
    togglePackageStatus,
    addToast,
    setActiveSidebarTab,
  } = useApp();
  const { path } = useRouter();

  const [activeTab, setActiveTab] = useState<'packages' | 'transactions' | 'gateways' | 'taxes'>('packages');

  // URL routes for package editor
  const isAddPkgRoute = path === '/admin/commerce/packages/new';
  const editPkgMatch = path.match(/^\/admin\/commerce\/packages\/edit\/([^/]+)$/);
  const editPkgId = editPkgMatch ? editPkgMatch[1] : null;
  const editingPkg = editPkgId ? packages.find((p) => p.id === editPkgId) || null : null;

  const [pkgFormData, setPkgFormData] = useState({
    name: '',
    badge: 'BOOSTED',
    type: 'boost' as PromotionalPackage['type'],
    durationDays: 1,
    durationHours: 24,
    price: 99,
    discountPrice: 0,
    featuresString: 'Instant top placement in category feeds, High-visibility BOOSTED label, Up to 5x more clicks',
  });

  useEffect(() => {
    const pkg = editPkgId ? packages.find((p) => p.id === editPkgId) : null;
    if (pkg) {
      setPkgFormData({
        name: pkg.name,
        badge: pkg.badge,
        type: pkg.type,
        durationDays: pkg.durationDays,
        durationHours: pkg.durationHours || pkg.durationDays * 24,
        price: pkg.price,
        discountPrice: pkg.discountPrice || 0,
        featuresString: pkg.features.join(', '),
      });
    } else if (isAddPkgRoute) {
      setPkgFormData({
        name: '',
        badge: 'BOOSTED',
        type: 'boost',
        durationDays: 1,
        durationHours: 24,
        price: 99,
        discountPrice: 0,
        featuresString: 'Instant top placement in category feeds, High-visibility BOOSTED label, Up to 5x more clicks',
      });
    }
  }, [editPkgId, isAddPkgRoute]);

  const handleSavePackage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!pkgFormData.name.trim()) return;

    const features = pkgFormData.featuresString
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);

    const calculatedHours = Number(pkgFormData.durationHours) || Number(pkgFormData.durationDays) * 24;
    const calculatedDays = Math.max(1, Math.round(calculatedHours / 24));

    if (editingPkg) {
      updatePackage({
        ...editingPkg,
        name: pkgFormData.name,
        badge: pkgFormData.badge,
        type: pkgFormData.type,
        durationDays: calculatedDays,
        durationHours: calculatedHours,
        price: Number(pkgFormData.price),
        discountPrice: pkgFormData.discountPrice ? Number(pkgFormData.discountPrice) : undefined,
        features,
      });
      addToast({
        title: 'Package Updated',
        message: `Package "${pkgFormData.name}" updated successfully.`,
        type: 'success',
      });
    } else {
      addPackage({
        name: pkgFormData.name,
        badge: pkgFormData.badge,
        type: pkgFormData.type,
        durationDays: calculatedDays,
        durationHours: calculatedHours,
        price: Number(pkgFormData.price),
        discountPrice: pkgFormData.discountPrice ? Number(pkgFormData.discountPrice) : undefined,
        features,
        isActive: true,
      });
      addToast({
        title: 'Package Created',
        message: `Package "${pkgFormData.name}" created successfully.`,
        type: 'success',
      });
    }

    navigateTo('/admin/commerce');
  };

  const downloadInvoice = (tx: OrderTransaction) => {
    addToast({
      type: 'info',
      title: `Invoice ${tx.invoiceNumber} Generated`,
      message: `Tax invoice for ₹${tx.amount} (GST ₹${tx.taxAmount.toFixed(2)}) downloaded.`,
    });
  };

  // If on /admin/commerce/packages/new or /edit/:id, render dedicated form webpage!
  if (isAddPkgRoute || editPkgId) {
    return (
      <div className="p-6 space-y-6 max-w-4xl mx-auto text-slate-900 dark:text-white animate-in fade-in duration-150">
        <div className="flex items-center justify-between pb-4 border-b border-slate-200 dark:border-slate-800">
          <div>
            <div className="flex items-center gap-2 text-xs text-slate-500 mb-1">
              <button
                onClick={() => navigateTo('/admin/commerce')}
                className="hover:text-blue-600 flex items-center gap-1 font-medium"
              >
                <ArrowLeft className="w-3.5 h-3.5" /> Back to Commerce & Plans
              </button>
              <span>/</span>
              <span>{editingPkg ? 'Edit Promotion Package' : 'New Promotion Package'}</span>
            </div>
            <h1 className="text-xl font-bold tracking-tight flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-blue-600" />
              <span>{editingPkg ? `Edit Package: ${editingPkg.name}` : 'Create Seller Promotional Package'}</span>
            </h1>
          </div>
          <span className="text-xs font-mono bg-slate-100 dark:bg-slate-800 text-slate-500 px-3 py-1 rounded-lg">
            URL: {path}
          </span>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm">
          <form onSubmit={handleSavePackage} className="space-y-4 text-xs">
            <div>
              <label className="block font-semibold mb-1 text-slate-700 dark:text-slate-300">Package Name *</label>
              <input
                type="text"
                required
                value={pkgFormData.name}
                onChange={(e) => setPkgFormData({ ...pkgFormData, name: e.target.value })}
                placeholder="e.g. 14-Day Prime Spotlight"
                className="w-full text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 p-2.5 focus:ring-2 focus:ring-blue-500 focus:outline-none"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block font-semibold mb-1 text-slate-700 dark:text-slate-300">Package Type</label>
                <select
                  value={pkgFormData.type}
                  onChange={(e) =>
                    setPkgFormData({
                      ...pkgFormData,
                      type: e.target.value as PromotionalPackage['type'],
                      badge: e.target.value === 'boost' ? 'BOOSTED' : e.target.value === 'feature' ? 'FEATURED' : 'URGENT',
                    })
                  }
                  className="w-full text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 p-2.5 focus:ring-2 focus:ring-blue-500 focus:outline-none font-bold"
                >
                  <option value="boost">🚀 Boost to Top (Hourly/Daily)</option>
                  <option value="feature">⭐ Featured Ad (Top of category)</option>
                  <option value="urgent">🔥 Urgent Sale</option>
                  <option value="bump_up">⬆️ Bump Up Once</option>
                </select>
              </div>
              <div>
                <label className="block font-semibold mb-1 text-slate-700 dark:text-slate-300">Duration in Hours</label>
                <input
                  type="number"
                  min="1"
                  value={pkgFormData.durationHours}
                  onChange={(e) => {
                    const hours = Number(e.target.value);
                    setPkgFormData({
                      ...pkgFormData,
                      durationHours: hours,
                      durationDays: Math.max(1, Math.round(hours / 24)),
                    });
                  }}
                  placeholder="24 (1 day), 72 (3 days), 168 (7 days)"
                  className="w-full text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 p-2.5 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="block font-semibold mb-1 text-slate-700 dark:text-slate-300">Badge Tag</label>
                <input
                  type="text"
                  value={pkgFormData.badge}
                  onChange={(e) => setPkgFormData({ ...pkgFormData, badge: e.target.value })}
                  placeholder="e.g. POPULAR, BEST VALUE"
                  className="w-full text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 p-2.5 font-bold uppercase focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block font-semibold mb-1 text-slate-700 dark:text-slate-300">Selling Price (₹) *</label>
                <input
                  type="number"
                  required
                  value={pkgFormData.price}
                  onChange={(e) =>
                    setPkgFormData({ ...pkgFormData, price: Number(e.target.value) })
                  }
                  className="w-full text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 p-2.5 focus:ring-2 focus:ring-blue-500 focus:outline-none font-bold"
                />
              </div>
              <div>
                <label className="block font-semibold mb-1 text-slate-700 dark:text-slate-300">Strike-through Price (₹)</label>
                <input
                  type="number"
                  value={pkgFormData.discountPrice}
                  onChange={(e) =>
                    setPkgFormData({ ...pkgFormData, discountPrice: Number(e.target.value) })
                  }
                  className="w-full text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 p-2.5 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>
            </div>

            <div>
              <label className="block font-semibold mb-1 text-slate-700 dark:text-slate-300">
                Features List (comma separated) *
              </label>
              <textarea
                rows={3}
                required
                value={pkgFormData.featuresString}
                onChange={(e) =>
                  setPkgFormData({ ...pkgFormData, featuresString: e.target.value })
                }
                placeholder="e.g. Featured golden badge, Top placement for 14 days, WhatsApp push to buyers"
                className="w-full text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 p-2.5 focus:ring-2 focus:ring-blue-500 focus:outline-none"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-4 border-t border-slate-200 dark:border-slate-800">
              <button
                type="button"
                onClick={() => navigateTo('/admin/commerce')}
                className="px-4 py-2 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg font-medium"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg shadow"
              >
                {editingPkg ? 'Update Package' : 'Save Package'}
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  }

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
          <h2 className="text-xl font-bold tracking-tight">Commerce, Monetization & Payment Gateways</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Manage seller promotion packages, Indian payment gateways (UPI, Razorpay, PayTM), and GST compliance
          </p>
        </div>

        <button
          onClick={() => navigateTo('/admin/commerce/packages/new')}
          className="px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 shadow-sm transition-colors self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" /> Create Promotion Package
        </button>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 dark:border-slate-800 pb-3">
        {[
          { id: 'packages', label: 'Promotional Packages', icon: Sparkles },
          { id: 'transactions', label: 'Orders & Invoices', icon: Receipt },
          { id: 'gateways', label: 'Payment Gateway Settings', icon: CreditCard },
          { id: 'taxes', label: 'GST & Taxes Configuration', icon: Percent },
        ].map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all ${
                activeTab === tab.id
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:text-white'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Packages Tab */}
      {activeTab === 'packages' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {packages.map((pkg) => (
            <div
              key={pkg.id}
              className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm flex flex-col justify-between relative overflow-hidden"
            >
              <div className="absolute top-0 right-0 bg-blue-600 text-white text-[10px] font-black px-3 py-1 rounded-bl-xl tracking-wider uppercase">
                {pkg.badge}
              </div>

              <div>
                <div className="text-xs text-slate-400 uppercase font-semibold">
                  {pkg.type === 'boost' ? '🚀 BOOST TO TOP' : pkg.type.toUpperCase()} • {pkg.durationHours ? `${pkg.durationHours} HOURS` : `${pkg.durationDays} DAYS`}
                </div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white mt-1">
                  {pkg.name}
                </h3>

                <div className="mt-3 flex items-baseline gap-2">
                  <span className="text-2xl font-black text-slate-900 dark:text-white">
                    ₹{pkg.price.toLocaleString('en-IN')}
                  </span>
                  {pkg.discountPrice && (
                    <span className="text-xs line-through text-slate-400">
                      ₹{pkg.discountPrice.toLocaleString('en-IN')}
                    </span>
                  )}
                  <span className="text-xs text-slate-400">+ 18% GST</span>
                </div>

                <div className="mt-4 space-y-2 border-t border-slate-100 dark:border-slate-800 pt-3 text-xs">
                  {pkg.features.map((feat, idx) => (
                    <div key={idx} className="flex items-start gap-2 text-slate-600 dark:text-slate-300">
                      <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                      <span>{feat}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="mt-6 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                <div className="text-xs text-slate-400 font-medium">
                  {pkg.salesCount.toLocaleString()} units sold
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => navigateTo(`/admin/commerce/packages/edit/${pkg.id}`)}
                    className="p-1 text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 rounded transition-colors"
                    title="Edit Package Configuration"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => togglePackageStatus(pkg.id)}
                    className="cursor-pointer"
                  >
                    {pkg.isActive ? (
                      <Badge variant="success">Active</Badge>
                    ) : (
                      <Badge variant="neutral">Inactive</Badge>
                    )}
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Transactions & Invoices Tab */}
      {activeTab === 'transactions' && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-800 text-slate-500 font-semibold uppercase tracking-wider">
                  <th className="p-3">Order & Invoice ID</th>
                  <th className="p-3">User</th>
                  <th className="p-3">Package / Subscription</th>
                  <th className="p-3">Net Amount</th>
                  <th className="p-3">GST (18%)</th>
                  <th className="p-3">Payment Gateway</th>
                  <th className="p-3">Status</th>
                  <th className="p-3 text-right">Receipt</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {transactions.map((tx) => (
                  <tr key={tx.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40">
                    <td className="p-3">
                      <div className="font-bold text-slate-900 dark:text-white">{tx.orderId}</div>
                      <div className="text-[10px] text-slate-400 font-mono">{tx.invoiceNumber}</div>
                    </td>
                    <td className="p-3 text-slate-700 dark:text-slate-300 font-medium">
                      {tx.userName}
                    </td>
                    <td className="p-3 text-slate-600 dark:text-slate-400">{tx.packageName}</td>
                    <td className="p-3 font-bold text-slate-900 dark:text-white">
                      ₹{tx.amount.toLocaleString('en-IN')}
                    </td>
                    <td className="p-3 text-slate-500">₹{tx.taxAmount.toFixed(2)}</td>
                    <td className="p-3">
                      <Badge variant="info">{tx.paymentGateway}</Badge>
                    </td>
                    <td className="p-3">
                      <Badge variant="success">Completed</Badge>
                    </td>
                    <td className="p-3 text-right">
                      <button
                        onClick={() => downloadInvoice(tx)}
                        className="px-2.5 py-1 rounded bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-semibold text-[11px] flex items-center gap-1 ml-auto"
                      >
                        <Download className="w-3.5 h-3.5" /> PDF
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Payment Gateways Tab */}
      {activeTab === 'gateways' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {[
            {
              name: 'Razorpay PG',
              desc: 'UPI (Google Pay, PhonePe, Paytm), NetBanking, Credit/Debit Cards',
              status: 'Configured & Active',
              mode: 'Production Live Mode',
              active: true,
            },
            {
              name: 'UPI Intent & QR',
              desc: 'Zero-touch instant UPI payment links and dynamic QR code generation',
              status: 'Active',
              mode: 'NPCI Direct / Yes Bank Switch',
              active: true,
            },
            {
              name: 'Stripe India',
              desc: 'International payments and recurring dealer card subscriptions',
              status: 'Sandbox Mode',
              mode: 'INR & Multi-Currency',
              active: true,
            },
          ].map((gw) => (
            <div
              key={gw.name}
              className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-sm space-y-3"
            >
              <div className="flex items-center justify-between">
                <div className="p-2.5 bg-blue-50 dark:bg-blue-950/40 rounded-xl text-blue-600">
                  <CreditCard className="w-5 h-5" />
                </div>
                <Badge variant="success">{gw.status}</Badge>
              </div>

              <div>
                <h4 className="font-bold text-sm">{gw.name}</h4>
                <p className="text-xs text-slate-500 mt-0.5">{gw.desc}</p>
              </div>

              <div className="text-[11px] font-mono text-slate-400 bg-slate-50 dark:bg-slate-800 p-2 rounded-lg">
                Mode: {gw.mode}
              </div>

              <div className="pt-2">
                <button
                  onClick={() =>
                    addToast({
                      type: 'info',
                      title: `${gw.name} Settings`,
                      message: 'API keys and webhook endpoints are configured securely in server environment.',
                    })
                  }
                  className="w-full py-1.5 border border-slate-200 dark:border-slate-700 text-xs font-semibold rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                >
                  Configure Webhooks & Keys
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Taxes Configuration Tab */}
      {activeTab === 'taxes' && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 shadow-sm max-w-2xl space-y-4">
          <h3 className="text-base font-bold">Goods and Services Tax (GST) Settings</h3>
          <p className="text-xs text-slate-500">
            Compliant with Indian digital marketplace tax collection at source (TCS) rules
          </p>

          <div className="space-y-3 text-xs pt-2">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block font-semibold mb-1">Standard GST Rate (%)</label>
                <input
                  type="number"
                  defaultValue={18}
                  className="w-full text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 p-2.5 font-bold"
                />
              </div>
              <div>
                <label className="block font-semibold mb-1">Company GSTIN Number</label>
                <input
                  type="text"
                  defaultValue="27AAECO1928P1Z8"
                  className="w-full text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 p-2.5 font-mono"
                />
              </div>
            </div>

            <div>
              <label className="block font-semibold mb-1">SAC Code for Classified Advertising</label>
              <input
                type="text"
                defaultValue="998361 - Advertising services / internet space"
                className="w-full text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 p-2.5"
              />
            </div>

            <button
              onClick={() =>
                addToast({
                  type: 'success',
                  title: 'Tax Settings Saved',
                  message: 'GST rate set to 18% with SAC 998361.',
                })
              }
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold text-xs mt-2"
            >
              Save GST Rules
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
