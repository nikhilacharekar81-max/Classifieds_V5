'use client';
import React from 'react';
import { useApp } from '@/context/AppContext';
import {
  TrendingUp,
  Users,
  Eye,
  DollarSign,
  Download,
  ArrowUpRight,
  ArrowDownRight,
  MapPin,
  Smartphone,
  Globe,
} from 'lucide-react';
import { Badge } from '@/components/common/Badge';

export const AnalyticsModule: React.FC = () => {
  const { addToast } = useApp();

  const handleExport = () => {
    addToast({
      type: 'success',
      title: 'Report Downloaded',
      message: 'Monthly classified performance report (PDF/Excel) generated.',
    });
  };

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto text-slate-900 dark:text-white">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold tracking-tight">Marketplace Analytics & Conversion Metrics</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Real-time traffic trends, ad velocity, seller monetization, and regional buyer inquiry rates
          </p>
        </div>

        <button
          onClick={handleExport}
          className="px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 shadow-sm transition-colors self-start sm:self-auto"
        >
          <Download className="w-4 h-4" /> Download Executive Report
        </button>
      </div>

      {/* Primary KPI Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500">Daily Active Buyers</span>
            <span className="text-emerald-600 text-xs font-bold flex items-center">
              +14.2% <ArrowUpRight className="w-3.5 h-3.5" />
            </span>
          </div>
          <div className="text-2xl font-black mt-2">128,450</div>
          <div className="text-[11px] text-slate-400 mt-1">78% via Android & iOS App</div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500">Monthly Ad Views</span>
            <span className="text-emerald-600 text-xs font-bold flex items-center">
              +8.7% <ArrowUpRight className="w-3.5 h-3.5" />
            </span>
          </div>
          <div className="text-2xl font-black mt-2">4,890,200</div>
          <div className="text-[11px] text-slate-400 mt-1">Avg. 18 views per listing</div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500">Chat & Lead Conversion</span>
            <span className="text-emerald-600 text-xs font-bold flex items-center">
              +3.1% <ArrowUpRight className="w-3.5 h-3.5" />
            </span>
          </div>
          <div className="text-2xl font-black mt-2">24.6%</div>
          <div className="text-[11px] text-slate-400 mt-1">Visitors initiating contact</div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500">Seller ARPU (Monetized)</span>
            <span className="text-emerald-600 text-xs font-bold flex items-center">
              +19.4% <ArrowUpRight className="w-3.5 h-3.5" />
            </span>
          </div>
          <div className="text-2xl font-black mt-2">₹482</div>
          <div className="text-[11px] text-slate-400 mt-1">Avg boost spend per dealer</div>
        </div>
      </div>

      {/* Regional Dominance & Device Matrix */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top States */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-sm">
          <h3 className="text-sm font-bold flex items-center gap-2 mb-4">
            <MapPin className="w-4 h-4 text-blue-500" /> Top Indian Hubs by Ad Liquidity
          </h3>

          <div className="space-y-3 text-xs">
            {[
              { region: 'Delhi NCR (Delhi, Gurgaon, Noida)', share: 32, ads: '28,400 ads', growth: '+16%' },
              { region: 'Maharashtra (Mumbai, Pune)', share: 26, ads: '22,150 ads', growth: '+12%' },
              { region: 'Karnataka (Bengaluru, Mysuru)', share: 18, ads: '15,800 ads', growth: '+14%' },
              { region: 'Tamil Nadu (Chennai, Coimbatore)', share: 14, ads: '11,200 ads', growth: '+9%' },
              { region: 'Telangana (Hyderabad)', share: 10, ads: '8,900 ads', growth: '+15%' },
            ].map((reg, idx) => (
              <div key={idx} className="space-y-1">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-slate-800 dark:text-slate-200">
                    {reg.region}
                  </span>
                  <span className="text-slate-500 font-mono">
                    {reg.ads} ({reg.share}%)
                  </span>
                </div>
                <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-2 overflow-hidden">
                  <div
                    className="bg-blue-600 h-full rounded-full"
                    style={{ width: `${reg.share * 2.8}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Category Revenue Breakdown */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-sm">
          <h3 className="text-sm font-bold flex items-center gap-2 mb-4">
            <TrendingUp className="w-4 h-4 text-emerald-500" /> Revenue Share by Category
          </h3>

          <div className="space-y-4 text-xs">
            {[
              { cat: 'Cars & Commercial Vehicles', rev: '₹4,82,000', pct: 54, color: 'bg-blue-600' },
              { cat: 'Mobile Phones & Tablets', rev: '₹1,95,000', pct: 22, color: 'bg-indigo-500' },
              { cat: 'Real Estate / Properties', rev: '₹1,42,000', pct: 16, color: 'bg-emerald-500' },
              { cat: 'Motorcycles & Scooters', rev: '₹72,400', pct: 8, color: 'bg-amber-500' },
            ].map((item, idx) => (
              <div key={idx} className="flex items-center justify-between p-3 rounded-lg bg-slate-50 dark:bg-slate-800/50">
                <div className="flex items-center gap-2.5">
                  <span className={`w-3 h-3 rounded-full ${item.color}`} />
                  <div>
                    <div className="font-bold text-slate-900 dark:text-white">{item.cat}</div>
                    <div className="text-[11px] text-slate-400">{item.pct}% of total revenue</div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-mono font-bold text-slate-900 dark:text-white">{item.rev}</div>
                  <Badge variant="success">High Margin</Badge>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
