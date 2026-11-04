'use client';
import React from 'react';
import { Download, MessageSquare } from 'lucide-react';
import { OrderTransaction, Listing, UserAccount } from '@/lib/types';
import { ImageWithFallback } from '@/components/common/ImageWithFallback';

interface OrdersReceiptsTabProps {
  currentUser: UserAccount;
  userTransactions: OrderTransaction[];
  onDownloadInvoice: (txId: string) => void;
}

export const OrdersReceiptsTab: React.FC<OrdersReceiptsTabProps> = ({
  currentUser,
  userTransactions,
  onDownloadInvoice,
}) => {
  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm space-y-4">
      <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
        <div>
          <h3 className="text-base font-extrabold text-slate-900 dark:text-white">Purchases & Payment Invoices</h3>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Billing history for paid subcategory posting fees, featured ad promotions, and seller packages.
          </p>
        </div>

        <div className="text-xs font-bold text-slate-600 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 px-3 py-1.5 rounded-lg">
          GSTIN: {currentUser.businessDetails?.gstNumber || '27AABCU9603R1ZN'}
        </div>
      </div>

      {userTransactions.length === 0 ? (
        <div className="text-center py-8 text-slate-500 dark:text-slate-400 text-xs">
          No past transactions found for this account.
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-800/60 text-slate-600 dark:text-slate-400 border-b border-slate-200 dark:border-slate-700">
                <th className="p-3 font-extrabold">Transaction ID</th>
                <th className="p-3 font-extrabold">Package / Fee Type</th>
                <th className="p-3 font-extrabold">Payment Method</th>
                <th className="p-3 font-extrabold">Amount</th>
                <th className="p-3 font-extrabold">Status</th>
                <th className="p-3 font-extrabold">Date</th>
                <th className="p-3 font-extrabold text-right">Tax Invoice</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-medium">
              {userTransactions.map((tx) => (
                <tr key={tx.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
                  <td className="p-3 font-mono font-bold text-slate-900 dark:text-slate-100">{tx.id}</td>
                  <td className="p-3 font-bold">{tx.packageName}</td>
                  <td className="p-3 text-slate-500 dark:text-slate-400">{tx.paymentGateway}</td>
                  <td className="p-3 font-black text-blue-600 dark:text-blue-400">₹{tx.amount.toLocaleString('en-IN')}</td>
                  <td className="p-3">
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                      {tx.status.toUpperCase()}
                    </span>
                  </td>
                  <td className="p-3 text-slate-500">{tx.createdAt}</td>
                  <td className="p-3 text-right">
                    <button
                      onClick={() => onDownloadInvoice(tx.id)}
                      className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 font-bold rounded-lg text-[11px] inline-flex items-center gap-1 transition-colors cursor-pointer"
                    >
                      <Download className="w-3 h-3 text-blue-500" />
                      <span>Invoice</span>
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

interface MessagesEnquiriesTabProps {
  userListings: Listing[];
  onReplyToBuyers: (listingTitle: string) => void;
}

export const MessagesEnquiriesTab: React.FC<MessagesEnquiriesTabProps> = ({
  userListings,
  onReplyToBuyers,
}) => {
  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm space-y-4">
      <div>
        <h3 className="text-base font-extrabold text-slate-900 dark:text-white">Buyer & Seller Enquiry Chat Threads</h3>
        <p className="text-xs text-slate-500 dark:text-slate-400">
          Direct chat enquiries received on your active marketplace listings.
        </p>
      </div>

      <div className="space-y-3">
        {userListings.map((l) => (
          <div key={l.id} className="border border-slate-200 dark:border-slate-800 rounded-xl p-4 flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <ImageWithFallback src={l.images[0]} alt={l.title} categoryId={l.categoryId} className="w-12 h-12 rounded-lg object-cover" />
              <div>
                <div className="font-extrabold text-xs text-slate-900 dark:text-white">{l.title}</div>
                <div className="text-[11px] text-slate-500">₹{l.price.toLocaleString('en-IN')} • {l.chatsCount} Enquiry Messages</div>
              </div>
            </div>

            <button
              onClick={() => onReplyToBuyers(l.title)}
              className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 cursor-pointer"
            >
              <MessageSquare className="w-3.5 h-3.5" /> Reply to Buyers
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};
