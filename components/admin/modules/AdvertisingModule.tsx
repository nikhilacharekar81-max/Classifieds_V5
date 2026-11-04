'use client';
import React, { useState } from 'react';
import { useApp } from '@/context/AppContext';
import { Megaphone, Plus, Share2, Star, Eye, MousePointer, Calendar, Image as ImageIcon } from 'lucide-react';
import { Badge } from '@/components/common/Badge';

export const AdvertisingModule: React.FC = () => {
  const { addToast } = useApp();

  const [campaigns, setCampaigns] = useState([
    {
      id: 'cmp_1',
      title: 'Festive Diwali Mega Auto Sale 2026',
      advertiser: 'Spinny & Cars24 Partner Network',
      position: 'Homepage Top Hero Leaderboard (728x90)',
      status: 'active',
      impressions: 245900,
      clicks: 8940,
      budget: 85000,
      spent: 62400,
      startDate: '2026-09-10',
      endDate: '2026-10-15',
    },
    {
      id: 'cmp_2',
      title: 'HDFC Home Loan Zero Processing Fee',
      advertiser: 'HDFC Bank Ltd',
      position: 'Properties Category Sidebar (300x250)',
      status: 'active',
      impressions: 112000,
      clicks: 4320,
      budget: 45000,
      spent: 31200,
      startDate: '2026-09-01',
      endDate: '2026-09-30',
    },
    {
      id: 'cmp_3',
      title: 'Flipkart Big Billion Days Refurbished Tech',
      advertiser: 'Flipkart India Pvt Ltd',
      position: 'Mobiles & Electronics In-Feed Sponsored Slot',
      status: 'scheduled',
      impressions: 0,
      clicks: 0,
      budget: 120000,
      spent: 0,
      startDate: '2026-09-25',
      endDate: '2026-10-05',
    },
  ]);

  return (
    <div className="p-6 space-y-5 max-w-7xl mx-auto text-slate-900 dark:text-white">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold tracking-tight">Banner Advertising & Sponsored Campaigns</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Manage display ad inventory, programmatic slots, campaign budgets, and CPM / CPC metrics
          </p>
        </div>

        <button
          onClick={() =>
            addToast({
              type: 'info',
              title: 'Create Ad Campaign',
              message: 'Ad creative uploading and targeting rules configured.',
            })
          }
          className="px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 shadow-sm transition-colors self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" /> New Advertising Campaign
        </button>
      </div>

      {/* Campaign Cards */}
      <div className="grid grid-cols-1 gap-4">
        {campaigns.map((camp) => (
          <div
            key={camp.id}
            className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4"
          >
            <div className="space-y-1.5 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <Badge variant={camp.status === 'active' ? 'success' : 'neutral'}>
                  {camp.status.toUpperCase()}
                </Badge>
                <span className="text-xs font-mono text-slate-400">ID: {camp.id}</span>
                <span className="text-xs text-slate-400">•</span>
                <span className="text-xs text-slate-400 flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5" />
                  {camp.startDate} to {camp.endDate}
                </span>
              </div>

              <h3 className="text-base font-bold text-slate-900 dark:text-white">{camp.title}</h3>

              <div className="text-xs text-slate-500 flex items-center gap-3">
                <span>
                  Advertiser: <strong className="text-slate-800 dark:text-slate-200">{camp.advertiser}</strong>
                </span>
                <span>•</span>
                <span>Slot: {camp.position}</span>
              </div>
            </div>

            {/* Stats & Budget */}
            <div className="flex items-center gap-6 shrink-0 bg-slate-50 dark:bg-slate-800/60 p-3 rounded-xl border border-slate-100 dark:border-slate-800">
              <div className="text-center">
                <div className="text-[10px] text-slate-400 uppercase font-semibold flex items-center gap-1 justify-center">
                  <Eye className="w-3 h-3" /> Impressions
                </div>
                <div className="text-sm font-black mt-0.5">
                  {camp.impressions.toLocaleString()}
                </div>
              </div>

              <div className="text-center">
                <div className="text-[10px] text-slate-400 uppercase font-semibold flex items-center gap-1 justify-center">
                  <MousePointer className="w-3 h-3" /> Clicks
                </div>
                <div className="text-sm font-black text-blue-600 mt-0.5">
                  {camp.clicks.toLocaleString()}
                </div>
                <div className="text-[9px] text-slate-400">
                  CTR: {camp.impressions ? ((camp.clicks / camp.impressions) * 100).toFixed(2) : 0}%
                </div>
              </div>

              <div className="text-center border-l border-slate-200 dark:border-slate-700 pl-4">
                <div className="text-[10px] text-slate-400 uppercase font-semibold">Budget</div>
                <div className="text-sm font-black text-slate-900 dark:text-white mt-0.5">
                  ₹{camp.spent.toLocaleString()} / ₹{camp.budget.toLocaleString()}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
