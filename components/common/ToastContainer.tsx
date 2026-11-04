'use client';
import React from 'react';
import { useApp } from '@/context/AppContext';
import { CheckCircle2, AlertCircle, Info, AlertTriangle, X } from 'lucide-react';

export const ToastContainer: React.FC = () => {
  const { toasts, removeToast } = useApp();

  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-5 right-5 z-50 flex flex-col gap-2 max-w-md w-full pointer-events-none">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className={`pointer-events-auto flex items-start gap-3 p-4 rounded-xl shadow-xl border text-sm transition-all duration-200 backdrop-blur-md ${
            toast.type === 'success'
              ? 'bg-emerald-900/90 border-emerald-700 text-white'
              : toast.type === 'error'
              ? 'bg-rose-900/90 border-rose-700 text-white'
              : toast.type === 'warning'
              ? 'bg-amber-900/90 border-amber-700 text-white'
              : 'bg-slate-900/90 border-slate-700 text-white'
          }`}
        >
          <div className="mt-0.5 shrink-0">
            {toast.type === 'success' && <CheckCircle2 className="w-5 h-5 text-emerald-400" />}
            {toast.type === 'error' && <AlertCircle className="w-5 h-5 text-rose-400" />}
            {toast.type === 'warning' && <AlertTriangle className="w-5 h-5 text-amber-400" />}
            {toast.type === 'info' && <Info className="w-5 h-5 text-blue-400" />}
          </div>
          <div className="flex-1 min-w-0">
            <div className="font-semibold text-sm leading-tight">{toast.title}</div>
            {toast.message && <div className="text-xs text-white/80 mt-1 leading-normal">{toast.message}</div>}
            {toast.action && (
              <button
                onClick={toast.action.onClick}
                className="mt-2 text-xs font-semibold px-2.5 py-1 bg-white/20 hover:bg-white/30 rounded transition-colors"
              >
                {toast.action.label}
              </button>
            )}
          </div>
          <button
            onClick={() => removeToast(toast.id)}
            className="text-white/60 hover:text-white transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      ))}
    </div>
  );
};
