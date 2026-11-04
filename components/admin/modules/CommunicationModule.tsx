'use client';
import React, { useState } from 'react';
import { useApp } from '@/context/AppContext';
import {
  Mail,
  MessageSquare,
  Send,
  Bell,
  Smartphone,
  Edit2,
  CheckCircle2,
  ShieldCheck,
  Search,
  RotateCcw,
  Eye,
  ExternalLink,
  Clock,
  CheckCircle,
  FileText,
  Inbox,
} from 'lucide-react';
import { Badge } from '@/components/common/Badge';
import { EmailLog } from '@/lib/types';
import { navigateTo } from '@/lib/router/useRouter';

export const CommunicationModule: React.FC = () => {
  const { addToast, emailLogs, listings, sendAdExpiredEmail, renewListing } = useApp();

  const [activeChannel, setActiveChannel] = useState<'templates' | 'logs' | 'broadcast'>('templates');

  const [templates, setTemplates] = useState([
    {
      id: 'tpl_expired',
      name: 'Ad Expired - Free Renewal Notice',
      channel: 'Email + Push + WhatsApp',
      dltId: 'DLT-1107168923495',
      subject: '⚠️ Your Chillyads ad has expired - Renew it now for FREE!',
      body: 'Hi {seller_name}, your listing "{listing_title}" has reached its expiration date and is now paused. You can renew and reactivate it for FREE for another 30 days with a single click: {renew_link}',
      active: true,
    },
    {
      id: 'tpl_renewed',
      name: 'Ad Successfully Renewed',
      channel: 'Email + SMS',
      dltId: 'DLT-1107168923496',
      subject: '✅ Your listing has been renewed successfully for free!',
      body: 'Hi {seller_name}, great news! Your listing "{listing_title}" is reactivated and visible to thousands of buyers for free. View live ad: {link}',
      active: true,
    },
    {
      id: 'tpl_1',
      name: 'Ad Published & Approved',
      channel: 'SMS + Push',
      dltId: 'DLT-1107168923489',
      subject: 'Congratulations! Your ad is now live on Chillyads',
      body: 'Hi {seller_name}, your ad "{listing_title}" has passed moderation and is now live across {city}. View inquiries: {link}',
      active: true,
    },
    {
      id: 'tpl_2',
      name: 'Ad Rejected (With Reason)',
      channel: 'Email + SMS',
      dltId: 'DLT-1107168923490',
      subject: 'Action Required: Your listing needs updates',
      body: 'Hi {seller_name}, your listing "{listing_title}" was not approved due to: {rejection_reason}. Please edit and resubmit: {edit_link}',
      active: true,
    },
    {
      id: 'tpl_3',
      name: 'Buyer Chat Instant Alert',
      channel: 'Push + WhatsApp',
      dltId: 'DLT-1107168923491',
      subject: 'New message received from a buyer',
      body: 'You received an offer of ₹{offered_price} from {buyer_name} on your "{listing_title}". Reply now: {chat_link}',
      active: true,
    },
    {
      id: 'tpl_4',
      name: 'Phone OTP Authentication',
      channel: 'Fast2SMS / Twilio India',
      dltId: 'DLT-1107168923492',
      subject: 'Login OTP verification',
      body: '{otp} is your verification code for Chillyads. Valid for 10 minutes. Never share this code with anyone.',
      active: true,
    },
  ]);

  // Logs state
  const [logSearchQuery, setLogSearchQuery] = useState('');
  const [logTypeFilter, setLogTypeFilter] = useState<string>('all');
  const [viewingEmail, setViewingEmail] = useState<EmailLog | null>(null);

  // Broadcast state
  const [broadcastTarget, setBroadcastTarget] = useState('all_users');
  const [broadcastMessage, setBroadcastMessage] = useState('');

  const sendBroadcast = (e: React.FormEvent) => {
    e.preventDefault();
    if (!broadcastMessage.trim()) return;
    addToast({
      type: 'success',
      title: 'Broadcast Dispatched',
      message: `Announcement queued for ${broadcastTarget.replace('_', ' ')}. Estimated delivery: 35 seconds.`,
    });
    setBroadcastMessage('');
  };

  const filteredLogs = emailLogs.filter((log) => {
    if (logTypeFilter !== 'all' && log.type !== logTypeFilter) return false;
    if (logSearchQuery.trim()) {
      const q = logSearchQuery.toLowerCase();
      return (
        log.toEmail.toLowerCase().includes(q) ||
        log.toName.toLowerCase().includes(q) ||
        log.subject.toLowerCase().includes(q) ||
        (log.listingTitle && log.listingTitle.toLowerCase().includes(q))
      );
    }
    return true;
  });

  return (
    <div className="p-6 space-y-5 max-w-7xl mx-auto text-slate-900 dark:text-white">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold tracking-tight">Communication & Automated Email Logs</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Configure automated transactional triggers, review sent emails for expired ad renewals, and manage templates
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => navigateTo('/admin/email/dashboard')}
            className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 shadow-sm transition-all cursor-pointer"
          >
            <Mail className="w-3.5 h-3.5" />
            <span>Open Email & Newsletter Suite</span>
          </button>
          <Badge variant="info">DLT Compliant</Badge>
          <Badge variant="success">SMTP Active</Badge>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 dark:border-slate-800 pb-3 flex-wrap">
        <button
          onClick={() => setActiveChannel('templates')}
          className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
            activeChannel === 'templates'
              ? 'bg-blue-600 text-white shadow-sm'
              : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:text-white'
          }`}
        >
          <Mail className="w-3.5 h-3.5" />
          <span>Transactional Templates ({templates.length})</span>
        </button>

        <button
          onClick={() => setActiveChannel('logs')}
          className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
            activeChannel === 'logs'
              ? 'bg-blue-600 text-white shadow-sm'
              : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:text-white'
          }`}
        >
          <Inbox className="w-3.5 h-3.5" />
          <span>Sent Email Logs ({emailLogs.length})</span>
        </button>

        <button
          onClick={() => setActiveChannel('broadcast')}
          className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
            activeChannel === 'broadcast'
              ? 'bg-blue-600 text-white shadow-sm'
              : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:text-white'
          }`}
        >
          <Send className="w-3.5 h-3.5" />
          <span>Push Notification Broadcast</span>
        </button>
      </div>

      {/* TAB 1: TRANSACTIONAL TEMPLATES */}
      {activeChannel === 'templates' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {templates.map((tpl) => (
            <div
              key={tpl.id}
              className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-sm space-y-3"
            >
              <div className="flex items-center justify-between">
                <div className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-2">
                  <span>{tpl.name}</span>
                  {tpl.id === 'tpl_expired' && (
                    <span className="text-[10px] px-2 py-0.5 rounded bg-amber-100 text-amber-800 dark:bg-amber-950/80 dark:text-amber-300 font-bold">
                      Auto-Triggered
                    </span>
                  )}
                </div>
                <Badge variant="purple">{tpl.channel}</Badge>
              </div>

              <div className="text-xs text-slate-400 font-mono flex items-center gap-1">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
                DLT ID: {tpl.dltId}
              </div>

              <div className="space-y-1">
                <div className="text-[11px] font-semibold text-slate-500">Subject / Header:</div>
                <div className="text-xs font-medium text-slate-700 dark:text-slate-300">
                  {tpl.subject}
                </div>
              </div>

              <div className="space-y-1">
                <div className="text-[11px] font-semibold text-slate-500">Message Body Template:</div>
                <div className="text-xs text-slate-600 dark:text-slate-400 bg-slate-50 dark:bg-slate-800/70 p-3 rounded-lg border border-slate-200 dark:border-slate-800 font-mono leading-relaxed">
                  {tpl.body}
                </div>
              </div>

              <div className="pt-2 flex items-center justify-between">
                <span className="text-[11px] text-emerald-600 font-semibold flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" /> Template Active & Verified
                </span>
                <button
                  onClick={() =>
                    addToast({
                      type: 'info',
                      title: 'Edit Template',
                      message: 'Template modified and submitted to TRAI DLT portal for verification.',
                    })
                  }
                  className="px-2.5 py-1 text-xs font-semibold rounded bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 flex items-center gap-1 cursor-pointer"
                >
                  <Edit2 className="w-3 h-3" /> Edit
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* TAB 2: SENT EMAIL & NOTIFICATION LOGS */}
      {activeChannel === 'logs' && (
        <div className="space-y-4">
          {/* Filters Bar */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2 overflow-x-auto w-full sm:w-auto">
              {[
                { id: 'all', label: 'All Dispatches' },
                { id: 'ad_expired', label: 'Expired Ad Alerts' },
                { id: 'ad_renewed', label: 'Free Renewal Confirmations' },
                { id: 'ad_approved', label: 'Approval Notices' },
                { id: 'ad_rejected', label: 'Rejection Notices' },
              ].map((filter) => (
                <button
                  key={filter.id}
                  onClick={() => setLogTypeFilter(filter.id)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                    logTypeFilter === filter.id
                      ? 'bg-slate-900 text-white dark:bg-blue-600 dark:text-white shadow-xs'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:hover:bg-slate-700'
                  }`}
                >
                  {filter.label}
                </button>
              ))}
            </div>

            <div className="relative w-full sm:w-64">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                value={logSearchQuery}
                onChange={(e) => setLogSearchQuery(e.target.value)}
                placeholder="Search recipient or subject..."
                className="w-full text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 pl-8 pr-3 py-1.5 focus:outline-none"
              />
            </div>
          </div>

          {/* Email Logs Table */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-800 text-slate-500 font-semibold uppercase tracking-wider">
                    <th className="p-3">Time & Date</th>
                    <th className="p-3">Recipient</th>
                    <th className="p-3">Email Subject</th>
                    <th className="p-3">Trigger / Type</th>
                    <th className="p-3">Related Ad</th>
                    <th className="p-3">Status</th>
                    <th className="p-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {filteredLogs.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="p-8 text-center text-slate-400">
                        No email logs matching current filter criteria.
                      </td>
                    </tr>
                  ) : (
                    filteredLogs.map((log) => (
                      <tr key={log.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/50 transition-colors">
                        <td className="p-3 whitespace-nowrap text-slate-500 font-mono text-[11px]">
                          {log.sentAt}
                        </td>
                        <td className="p-3">
                          <div className="font-bold text-slate-900 dark:text-white">{log.toName}</div>
                          <div className="text-slate-400 text-[11px] font-mono">{log.toEmail}</div>
                        </td>
                        <td className="p-3 font-medium text-slate-800 dark:text-slate-200 max-w-xs truncate">
                          {log.subject}
                        </td>
                        <td className="p-3">
                          {log.type === 'ad_expired' && (
                            <Badge variant="danger">Expiry Notice</Badge>
                          )}
                          {log.type === 'ad_renewed' && (
                            <Badge variant="success">Free Renewal</Badge>
                          )}
                          {log.type === 'ad_approved' && (
                            <Badge variant="info">Approval</Badge>
                          )}
                          {log.type === 'ad_rejected' && (
                            <Badge variant="warning">Rejection</Badge>
                          )}
                          {!['ad_expired', 'ad_renewed', 'ad_approved', 'ad_rejected'].includes(log.type) && (
                            <Badge variant="neutral">{log.type}</Badge>
                          )}
                        </td>
                        <td className="p-3 text-slate-600 dark:text-slate-300">
                          {log.listingTitle ? (
                            <span className="font-medium truncate max-w-[160px] block" title={log.listingTitle}>
                              {log.listingTitle}
                            </span>
                          ) : (
                            <span className="text-slate-400">—</span>
                          )}
                        </td>
                        <td className="p-3">
                          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-600 dark:text-emerald-400">
                            <CheckCircle className="w-3.5 h-3.5" /> Delivered
                          </span>
                        </td>
                        <td className="p-3 text-right">
                          <button
                            onClick={() => setViewingEmail(log)}
                            className="px-2.5 py-1 text-xs font-semibold rounded bg-blue-50 text-blue-700 hover:bg-blue-100 dark:bg-blue-950/60 dark:text-blue-300 flex items-center gap-1 ml-auto cursor-pointer transition-colors"
                          >
                            <Eye className="w-3.5 h-3.5" /> View Email
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: BROADCAST */}
      {activeChannel === 'broadcast' && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 shadow-sm max-w-xl space-y-4">
          <h3 className="text-base font-bold">Push Broadcast to Mobile Apps & Web Browsers</h3>
          <p className="text-xs text-slate-500">
            Instantly send Firebase Cloud Messaging (FCM) push alerts to active device tokens
          </p>

          <form onSubmit={sendBroadcast} className="space-y-3.5 text-xs">
            <div>
              <label className="block font-semibold mb-1">Target Audience</label>
              <select
                value={broadcastTarget}
                onChange={(e) => setBroadcastTarget(e.target.value)}
                className="w-full text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 p-2.5"
              >
                <option value="all_users">All Registered Users (68,400 Devices)</option>
                <option value="active_sellers">Active Sellers Only (14,200 Devices)</option>
                <option value="delhi_ncr_users">Delhi NCR Geo-Fence Users (18,900 Devices)</option>
                <option value="mumbai_users">Mumbai Region Users (12,400 Devices)</option>
              </select>
            </div>

            <div>
              <label className="block font-semibold mb-1">Push Alert Message *</label>
              <textarea
                rows={3}
                required
                value={broadcastMessage}
                onChange={(e) => setBroadcastMessage(e.target.value)}
                placeholder="e.g. Diwali Super-Deals are live! Post your car or smartphone today with zero fees and get 3x more buyer calls."
                className="w-full text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 p-2.5 focus:ring-2 focus:ring-blue-500 focus:outline-none"
              />
            </div>

            <button
              type="submit"
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg shadow flex items-center gap-1.5 cursor-pointer"
            >
              <Send className="w-3.5 h-3.5" /> Dispatch Immediate Broadcast
            </button>
          </form>
        </div>
      )}

      {/* Email Preview Modal */}
      {viewingEmail && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 max-w-2xl w-full shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            {/* Modal Header */}
            <div className="p-4 bg-slate-900 text-white flex items-center justify-between border-b border-slate-800">
              <div className="flex items-center gap-2">
                <Mail className="w-5 h-5 text-blue-400" />
                <span className="font-bold text-sm">Transactional Email Preview</span>
              </div>
              <button
                onClick={() => setViewingEmail(null)}
                className="text-slate-400 hover:text-white text-xs font-bold px-2 py-1 bg-slate-800 rounded cursor-pointer"
              >
                ✕ Close
              </button>
            </div>

            {/* Email Metadata */}
            <div className="p-4 bg-slate-50 dark:bg-slate-800/40 border-b border-slate-200 dark:border-slate-800 space-y-1.5 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-slate-500 font-semibold">To:</span>
                <span className="font-bold text-slate-900 dark:text-white">
                  {viewingEmail.toName} &lt;{viewingEmail.toEmail}&gt;
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-500 font-semibold">Subject:</span>
                <span className="font-extrabold text-blue-600 dark:text-blue-400">{viewingEmail.subject}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-500 font-semibold">Sent At:</span>
                <span className="text-slate-600 dark:text-slate-300 font-mono text-[11px]">{viewingEmail.sentAt}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-500 font-semibold">Delivery Status:</span>
                <Badge variant="success">SMTP Delivered 250 OK</Badge>
              </div>
            </div>

            {/* Simulated Email Render */}
            <div className="p-6 overflow-y-auto space-y-4 bg-white dark:bg-slate-950 text-slate-900 dark:text-white">
              <div className="p-6 border border-slate-200 dark:border-slate-800 rounded-xl bg-slate-50/40 dark:bg-slate-900 space-y-4 font-sans">
                {/* Brand Logo in Email */}
                <div className="border-b border-slate-200 dark:border-slate-800 pb-3 flex items-center justify-between">
                  <div className="text-lg font-black tracking-tight text-blue-600 dark:text-blue-400">
                    Chillyads <span className="text-amber-500 text-xs uppercase tracking-widest font-bold">India Marketplace</span>
                  </div>
                  <span className="text-[11px] text-slate-400">Official System Notification</span>
                </div>

                <div className="text-sm font-bold text-slate-800 dark:text-slate-100">
                  Hi {viewingEmail.toName},
                </div>

                <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed">
                  {viewingEmail.body}
                </p>

                {viewingEmail.listingTitle && (
                  <div className="p-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs space-y-1">
                    <div className="text-[11px] text-slate-400 font-semibold">Listing Details:</div>
                    <div className="font-extrabold text-slate-900 dark:text-white">{viewingEmail.listingTitle}</div>
                    {viewingEmail.listingId && (
                      <div className="text-[10px] text-slate-400 font-mono">ID: {viewingEmail.listingId}</div>
                    )}
                  </div>
                )}

                {viewingEmail.actionLabel && (
                  <div className="pt-2 text-center">
                    <button
                      onClick={() => {
                        if (viewingEmail.listingId && viewingEmail.type === 'ad_expired') {
                          renewListing(viewingEmail.listingId, 30);
                          setViewingEmail(null);
                        } else if (viewingEmail.actionUrl) {
                          navigateTo(viewingEmail.actionUrl);
                          setViewingEmail(null);
                        }
                      }}
                      className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-extrabold text-xs shadow transition-colors inline-flex items-center gap-1.5 cursor-pointer"
                    >
                      <RotateCcw className="w-4 h-4" /> {viewingEmail.actionLabel}
                    </button>
                    <p className="text-[10px] text-slate-400 mt-1.5">Zero fees charged. 100% Free renewal.</p>
                  </div>
                )}

                <div className="pt-4 border-t border-slate-200 dark:border-slate-800 text-[10px] text-slate-400 text-center leading-relaxed">
                  You received this email because you registered an ad on Chillyads. For security, never share your OTP or passwords with anyone.
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-3 bg-slate-100 dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 flex justify-end">
              <button
                onClick={() => setViewingEmail(null)}
                className="px-4 py-1.5 bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold rounded-lg cursor-pointer"
              >
                Close Preview
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

