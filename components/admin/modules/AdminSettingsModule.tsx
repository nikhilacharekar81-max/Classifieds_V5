'use client';
import React, { useState } from 'react';
import JSZip from 'jszip';
import { useApp } from '@/context/AppContext';
import {
  ShieldCheck,
  Users,
  Settings,
  History,
  Lock,
  Plus,
  Search,
  CheckCircle2,
  Database,
  Sliders,
  RotateCcw,
  Download,
  FolderArchive,
  Server,
  Layers,
} from 'lucide-react';
import { Badge } from '@/components/common/Badge';

export const AdminSettingsModule: React.FC = () => {
  const { settings, updateSettings, auditLogs, addToast, resetAllCounters } = useApp();

  const [activeTab, setActiveTab] = useState<'admins' | 'rbac' | 'audit' | 'system'>('audit');
  const [auditSearch, setAuditSearch] = useState('');
  const [isGeneratingZip, setIsGeneratingZip] = useState(false);

  const handleDownloadDeploymentZip = async () => {
    setIsGeneratingZip(true);
    try {
      const zip = new JSZip();

      // 1. .htaccess
      zip.file(
        '.htaccess',
        `<IfModule mod_rewrite.c>
  RewriteEngine On
  RewriteBase /
  RewriteRule ^index\\.html$ - [L]
  RewriteCond %{REQUEST_FILENAME} !-f
  RewriteCond %{REQUEST_FILENAME} !-d
  RewriteRule . /index.html [L]
</IfModule>`
      );

      // 2. deploy-guide.html
      zip.file(
        'cpanel-ftp-deploy-guide.html',
        `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>cPanel & FTP Deployment Guide - Chillyads Classifieds</title>
  <style>
    body { font-family: system-ui, -apple-system, sans-serif; line-height: 1.6; max-width: 800px; margin: 40px auto; padding: 20px; color: #0f172a; }
    h1 { color: #2563eb; }
    code { background: #f1f5f9; padding: 3px 8px; border-radius: 4px; font-family: monospace; font-size: 14px; color: #2563eb; }
    pre { background: #0f172a; color: #f8fafc; padding: 16px; border-radius: 8px; overflow-x: auto; }
    .step { background: #f8fafc; border: 1px solid #e2e8f0; border-left: 4px solid #2563eb; padding: 16px 20px; margin: 16px 0; border-radius: 6px; }
    .badge { background: #dbeafe; color: #1e40af; padding: 4px 10px; border-radius: 99px; font-size: 12px; font-weight: bold; }
  </style>
</head>
<body>
  <span class="badge">Production cPanel & FTP Deployment</span>
  <h1>Chillyads Classifieds - Web Server Setup</h1>
  <p>Follow these quick steps to publish this web application onto any standard cPanel or Linux web hosting server using FTP or File Manager.</p>

  <div class="step">
    <h3>Step 1: Build Local Static Production Package</h3>
    <p>Run these standard terminal commands inside your local project root folder:</p>
    <pre>npm install\nnpm run build</pre>
    <p>This generates the optimized <code>dist/</code> folder containing <code>index.html</code>, JavaScript bundles, CSS, and web images.</p>
  </div>

  <div class="step">
    <h3>Step 2: Upload Files via FTP or cPanel File Manager</h3>
    <p>Connect to your web hosting via FileZilla or cPanel File Manager, navigate to <code>public_html</code>, and upload all files from inside the local <code>dist/</code> folder.</p>
  </div>

  <div class="step">
    <h3>Step 3: Enable .htaccess SPA Routing Rules</h3>
    <p>Upload the included <code>.htaccess</code> file directly into your <code>public_html</code> directory so client-side React routes reload without 404 errors.</p>
  </div>

  <p style="font-size: 13px; color: #64748b; margin-top: 30px;">Chillyads Classifieds Engine v2.4 • cPanel Ready Bundle</p>
</body>
</html>`
      );

      // 3. README.md
      zip.file(
        'README.md',
        `# Chillyads Classifieds - cPanel & FTP Deployment Package

This ZIP package contains ready-to-deploy server rules and installation documentation.

## File Contents:
1. \`.htaccess\` - Pre-configured Apache rewrite rules for React SPA routing.
2. \`cpanel-ftp-deploy-guide.html\` - Interactive visual deployment guide.
`
      );

      const content = await zip.generateAsync({ type: 'blob' });
      const blobUrl = URL.createObjectURL(content);

      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = `cpanel-ftp-deployment-bundle-${new Date().toISOString().split('T')[0]}.zip`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(blobUrl);

      addToast({
        type: 'success',
        title: 'Deployment ZIP Downloaded!',
        message: 'Saved .htaccess, deployment scripts, and setup guide to your computer.',
      });
    } catch (err) {
      addToast({
        type: 'error',
        title: 'ZIP Generation Failed',
        message: 'Could not generate deployment package.',
      });
    } finally {
      setIsGeneratingZip(false);
    }
  };

  const [adminUsers, setAdminUsers] = useState([
    {
      id: 'adm_1',
      name: 'Super Admin Operator',
      email: 'root@chillyads.com',
      role: 'Super Administrator',
      lastActive: 'Just now',
      twoFactor: true,
    },
    {
      id: 'adm_2',
      name: 'Priya Sharma (Mod Lead)',
      email: 'priya.trust@chillyads.com',
      role: 'Moderation Specialist',
      lastActive: '12 mins ago',
      twoFactor: true,
    },
    {
      id: 'adm_3',
      name: 'Vikram Mehta (Finance)',
      email: 'vikram.billing@chillyads.com',
      role: 'Finance Auditor',
      lastActive: '2 hours ago',
      twoFactor: true,
    },
  ]);

  const [systemSettings, setSystemSettings] = useState({
    siteName: settings.siteName || 'Chillyads Classifieds',
    supportEmail: 'trust-safety@chillyads.com',
    currency: settings.defaultCurrency || 'INR (₹)',
    requirePhoneOtp: settings.otpLoginEnabled ?? true,
    autoApproveVerifiedUsers: settings.autoApproveVerifiedUsers ?? true,
    watermarkImages: settings.watermarkImages ?? true,
    maxImagesPerAd: settings.maxPhotosPerListing || 12,
    adExpiryDays: settings.listingDurationDays || 30,
    freeListingsLimit: settings.freeListingsLimit ?? 3,
    extraListingFee: settings.extraListingFee ?? 99,
    maintenanceMode: settings.maintenanceMode ?? false,
    enablePrivacyChoices: settings.enablePrivacyChoices ?? false,
  });

  const handleSaveSettings = (e: React.FormEvent) => {
    e.preventDefault();
    updateSettings({
      siteName: systemSettings.siteName,
      listingDurationDays: Number(systemSettings.adExpiryDays),
      maxPhotosPerListing: Number(systemSettings.maxImagesPerAd),
      freeListingsLimit: Number(systemSettings.freeListingsLimit),
      extraListingFee: Number(systemSettings.extraListingFee),
      otpLoginEnabled: systemSettings.requirePhoneOtp,
      watermarkImages: systemSettings.watermarkImages,
      maintenanceMode: systemSettings.maintenanceMode,
      autoApproveVerifiedUsers: systemSettings.autoApproveVerifiedUsers,
      enablePrivacyChoices: systemSettings.enablePrivacyChoices,
    });
    addToast({
      type: 'success',
      title: 'Freemium Quotas & Configuration Saved',
      message: `Updated baseline free listings limit (${systemSettings.freeListingsLimit} ads) and extra listing fee (₹${systemSettings.extraListingFee}).`,
    });
  };

  const filteredLogs = auditLogs.filter(
    (log) =>
      log.action.toLowerCase().includes(auditSearch.toLowerCase()) ||
      log.adminName.toLowerCase().includes(auditSearch.toLowerCase()) ||
      log.details.toLowerCase().includes(auditSearch.toLowerCase()) ||
      (log.targetSummary && log.targetSummary.toLowerCase().includes(auditSearch.toLowerCase())) ||
      (log.targetId && log.targetId.toLowerCase().includes(auditSearch.toLowerCase()))
  );

  return (
    <div className="p-6 space-y-5 max-w-7xl mx-auto text-slate-900 dark:text-white">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold tracking-tight">System Settings, Staff Roles & Audit Logs</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Manage granular RBAC staff permissions, immutable audit activity streams, and platform operational policies
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Badge variant="purple">Commercial Grade RBAC</Badge>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 dark:border-slate-800 pb-3">
        {[
          { id: 'audit', label: `Audit Log Trail (${auditLogs.length})`, icon: History },
          { id: 'admins', label: 'Admin Staff & 2FA', icon: Users },
          { id: 'rbac', label: 'Roles & Permission Matrix', icon: ShieldCheck },
          { id: 'system', label: 'Marketplace Configuration', icon: Settings },
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

      {/* Tab 1: Audit Log Trail */}
      {activeTab === 'audit' && (
        <div className="space-y-3">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-3 shadow-sm flex items-center justify-between">
            <div className="relative w-full max-w-md">
              <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
              <input
                type="text"
                value={auditSearch}
                onChange={(e) => setAuditSearch(e.target.value)}
                placeholder="Search audit trail by admin, action, target ID, or note..."
                className="w-full text-xs rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/60 pl-9 pr-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div className="text-xs text-slate-400">
              Immutable Trail: <strong>{auditLogs.length} events</strong>
            </div>
          </div>

          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-800 text-slate-500 font-semibold uppercase tracking-wider">
                    <th className="p-3">Timestamp</th>
                    <th className="p-3">Admin Operator</th>
                    <th className="p-3">Action Type</th>
                    <th className="p-3">Target Reference</th>
                    <th className="p-3">Audit Details</th>
                    <th className="p-3">IP Address</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {filteredLogs.map((log) => (
                    <tr key={log.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40">
                      <td className="p-3 font-mono text-slate-500 text-[11px] whitespace-nowrap">
                        {log.timestamp}
                      </td>
                      <td className="p-3 font-bold text-slate-900 dark:text-white">
                        {log.adminName}
                      </td>
                      <td className="p-3">
                        <Badge
                          variant={
                            log.action.includes('REJECT') || log.action.includes('BAN')
                              ? 'danger'
                              : log.action.includes('APPROVE') || log.action.includes('VERIFY')
                              ? 'success'
                              : 'purple'
                          }
                        >
                          {log.action}
                        </Badge>
                      </td>
                      <td className="p-3 font-mono text-[11px] text-slate-600 dark:text-slate-300">
                        {log.targetSummary || log.targetId}
                      </td>
                      <td className="p-3 text-slate-600 dark:text-slate-400 max-w-sm truncate">
                        {log.details}
                      </td>
                      <td className="p-3 font-mono text-[11px] text-slate-400">
                        {log.ipAddress}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Tab 2: Admin Staff List */}
      {activeTab === 'admins' && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden shadow-sm">
          <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
            <h3 className="text-sm font-bold">Authorized Admin Accounts</h3>
            <button
              onClick={() =>
                addToast({
                  type: 'info',
                  title: 'Invite Admin Staff',
                  message: 'Send secure magic link with mandatory 2FA enrollment.',
                })
              }
              className="px-3 py-1.5 bg-blue-600 text-white rounded-lg text-xs font-semibold flex items-center gap-1"
            >
              <Plus className="w-3.5 h-3.5" /> Invite Staff Member
            </button>
          </div>

          <div className="divide-y divide-slate-100 dark:divide-slate-800 text-xs">
            {adminUsers.map((adm) => (
              <div key={adm.id} className="p-4 flex items-center justify-between">
                <div>
                  <div className="font-bold text-slate-900 dark:text-white text-sm">
                    {adm.name}
                  </div>
                  <div className="text-slate-400">{adm.email}</div>
                  <div className="text-[11px] text-slate-500 mt-0.5">Last active: {adm.lastActive}</div>
                </div>

                <div className="flex items-center gap-3">
                  <Badge variant="purple">{adm.role}</Badge>
                  {adm.twoFactor && (
                    <Badge variant="success">2FA Enforced</Badge>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tab 3: RBAC Matrix */}
      {activeTab === 'rbac' && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-sm space-y-4">
          <h3 className="text-sm font-bold">Role-Based Permission Matrix</h3>
          <p className="text-xs text-slate-500">
            Enforced at Laravel middleware and API layer for all administrative endpoints.
          </p>

          <div className="overflow-x-auto text-xs">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-500">
                  <th className="p-2.5">Permission / Resource</th>
                  <th className="p-2.5 text-center">Super Admin</th>
                  <th className="p-2.5 text-center">Moderation Lead</th>
                  <th className="p-2.5 text-center">Finance Auditor</th>
                  <th className="p-2.5 text-center">Support Staff</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {[
                  { perm: 'Approve & Reject Classified Listings', super: true, mod: true, fin: false, sup: false },
                  { perm: 'Ban Users & Revoke Seller Status', super: true, mod: true, fin: false, sup: false },
                  { perm: 'Impersonate User with Audit Trail', super: true, mod: true, fin: false, sup: false },
                  { perm: 'Configure Categories & Custom Attributes', super: true, mod: false, fin: false, sup: false },
                  { perm: 'Manage Pricing Packages & Gateway Keys', super: true, mod: false, fin: true, sup: false },
                  { perm: 'Export Tax Invoices & Order Data', super: true, mod: false, fin: true, sup: false },
                  { perm: 'View Immutable Admin Audit Logs', super: true, mod: true, fin: true, sup: true },
                ].map((row, idx) => (
                  <tr key={idx}>
                    <td className="p-2.5 font-medium">{row.perm}</td>
                    <td className="p-2.5 text-center">
                      <CheckCircle2 className="w-4 h-4 text-emerald-500 mx-auto" />
                    </td>
                    <td className="p-2.5 text-center">
                      {row.mod ? (
                        <CheckCircle2 className="w-4 h-4 text-emerald-500 mx-auto" />
                      ) : (
                        <span className="text-slate-300 dark:text-slate-700 font-bold">—</span>
                      )}
                    </td>
                    <td className="p-2.5 text-center">
                      {row.fin ? (
                        <CheckCircle2 className="w-4 h-4 text-emerald-500 mx-auto" />
                      ) : (
                        <span className="text-slate-300 dark:text-slate-700 font-bold">—</span>
                      )}
                    </td>
                    <td className="p-2.5 text-center">
                      {row.sup ? (
                        <CheckCircle2 className="w-4 h-4 text-emerald-500 mx-auto" />
                      ) : (
                        <span className="text-slate-300 dark:text-slate-700 font-bold">—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab 4: System Settings Form */}
      {activeTab === 'system' && (
        <form onSubmit={handleSaveSettings} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 shadow-sm max-w-2xl space-y-4 text-xs">
          <h3 className="text-base font-bold">Classified Marketplace Policy Engine</h3>

          <div className="space-y-3 pt-2">
            <div>
              <label className="block font-semibold mb-1">Marketplace Public Brand Name</label>
              <input
                type="text"
                value={systemSettings.siteName}
                onChange={(e) => setSystemSettings({ ...systemSettings, siteName: e.target.value })}
                className="w-full text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 p-2.5"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block font-semibold mb-1">Default Ad Duration (Days)</label>
                <input
                  type="number"
                  value={systemSettings.adExpiryDays}
                  onChange={(e) =>
                    setSystemSettings({ ...systemSettings, adExpiryDays: Number(e.target.value) })
                  }
                  className="w-full text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 p-2.5"
                />
              </div>
              <div>
                <label className="block font-semibold mb-1">Max Photos Allowed Per Listing</label>
                <input
                  type="number"
                  value={systemSettings.maxImagesPerAd}
                  onChange={(e) =>
                    setSystemSettings({ ...systemSettings, maxImagesPerAd: Number(e.target.value) })
                  }
                  className="w-full text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 p-2.5"
                />
              </div>
            </div>

            {/* Freemium Volume Quotas Config */}
            <div className="p-4 bg-gradient-to-r from-blue-50 to-indigo-50/60 dark:from-slate-800/80 dark:to-indigo-950/40 border border-blue-200 dark:border-blue-900/60 rounded-xl space-y-3 my-2">
              <div className="flex items-center gap-2">
                <Layers className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                <h4 className="font-extrabold text-slate-900 dark:text-white">Freemium Volume Quotas Policy</h4>
                <Badge variant="info">AUTOMATED</Badge>
              </div>
              <p className="text-[11px] text-slate-600 dark:text-slate-300 leading-relaxed">
                Grants users a baseline number of free active listings (e.g. 3 active ads) and charges a fee for each listing published beyond that limit.
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                <div>
                  <label className="block font-bold mb-1 text-slate-800 dark:text-slate-200">
                    Baseline Free Active Ads Quota
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={100}
                    value={systemSettings.freeListingsLimit}
                    onChange={(e) =>
                      setSystemSettings({ ...systemSettings, freeListingsLimit: Math.max(1, Number(e.target.value)) })
                    }
                    className="w-full text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 p-2.5 font-bold text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                  />
                  <span className="text-[10px] text-slate-500 mt-1 block">
                    Number of active ads allowed per seller for ₹0
                  </span>
                </div>

                <div>
                  <label className="block font-bold mb-1 text-slate-800 dark:text-slate-200">
                    Extra Listing Fee Beyond Quota (₹)
                  </label>
                  <input
                    type="number"
                    min={0}
                    value={systemSettings.extraListingFee}
                    onChange={(e) =>
                      setSystemSettings({ ...systemSettings, extraListingFee: Math.max(0, Number(e.target.value)) })
                    }
                    className="w-full text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 p-2.5 font-bold text-blue-600 dark:text-blue-400 focus:ring-2 focus:ring-blue-500"
                  />
                  <span className="text-[10px] text-slate-500 mt-1 block">
                    Charged for each active ad published past baseline limit
                  </span>
                </div>
              </div>
            </div>

            <div className="space-y-2 pt-2 border-t border-slate-100 dark:border-slate-800">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={systemSettings.requirePhoneOtp}
                  onChange={(e) =>
                    setSystemSettings({ ...systemSettings, requirePhoneOtp: e.target.checked })
                  }
                  className="rounded text-blue-600 focus:ring-blue-500"
                />
                <span className="font-semibold">
                  Enforce Indian Mobile Number OTP Verification Before Ad Submission
                </span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={systemSettings.watermarkImages}
                  onChange={(e) =>
                    setSystemSettings({ ...systemSettings, watermarkImages: e.target.checked })
                  }
                  className="rounded text-blue-600 focus:ring-blue-500"
                />
                <span className="font-semibold">
                  Auto-Watermark Seller Photos with Chillyads Anti-Theft Watermark
                </span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer text-purple-700 dark:text-purple-300">
                <input
                  type="checkbox"
                  checked={systemSettings.enablePrivacyChoices}
                  onChange={(e) =>
                    setSystemSettings({ ...systemSettings, enablePrivacyChoices: e.target.checked })
                  }
                  className="rounded text-purple-600 focus:ring-purple-500"
                />
                <span className="font-bold">
                  Enable Privacy Choices Banner (IAB TCF v2.2) & Footer Privacy Links
                </span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer text-rose-600">
                <input
                  type="checkbox"
                  checked={systemSettings.maintenanceMode}
                  onChange={(e) =>
                    setSystemSettings({ ...systemSettings, maintenanceMode: e.target.checked })
                  }
                  className="rounded text-rose-600 focus:ring-rose-500"
                />
                <span className="font-semibold">
                  Enable Site Maintenance Mode (Bypass for Admins Only)
                </span>
              </label>
            </div>

            <button
              type="submit"
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg shadow mt-2"
            >
              Update Marketplace Settings
            </button>
          </div>
        </form>
      )}

      {/* cPanel & FTP Deployment Bundle Download Card */}
      {activeTab === 'system' && (
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-slate-900 dark:to-indigo-950/40 border border-blue-200 dark:border-indigo-900/60 rounded-xl p-6 shadow-sm max-w-2xl space-y-3">
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <FolderArchive className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                <h3 className="text-base font-extrabold text-slate-900 dark:text-white">cPanel & FTP Server Deployment Bundle</h3>
              </div>
              <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">
                Download the cPanel deployment configuration package containing pre-configured <code>.htaccess</code> rewrite rules, Apache SPA settings, and an offline interactive installation guide for FTP/cPanel File Manager upload.
              </p>
            </div>

            <button
              type="button"
              onClick={handleDownloadDeploymentZip}
              disabled={isGeneratingZip}
              className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg text-xs flex items-center gap-2 transition-all shrink-0 shadow cursor-pointer hover:scale-102 disabled:opacity-50"
            >
              <Download className="w-3.5 h-3.5" />
              <span>{isGeneratingZip ? 'Packaging ZIP...' : 'Download Deployment ZIP'}</span>
            </button>
          </div>
        </div>
      )}

      {/* Reset Counters Action Card */}
      {activeTab === 'system' && (
        <div className="bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900/60 rounded-xl p-6 shadow-sm max-w-2xl space-y-3">
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <RotateCcw className="w-5 h-5 text-rose-600 dark:text-rose-400" />
                <h3 className="text-base font-extrabold text-slate-900 dark:text-white">Reset All Marketplace Counters</h3>
              </div>
              <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">
                Zero out all metric counters across the platform: ad view counts, listing like counts, chat inquiry counts, seller listing counts, category listing totals, location totals, and promotional package sales tallies.
              </p>
            </div>

            <button
              type="button"
              onClick={resetAllCounters}
              className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-lg text-xs flex items-center gap-2 transition-all shrink-0 shadow-sm cursor-pointer hover:scale-102"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reset All Counters</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
