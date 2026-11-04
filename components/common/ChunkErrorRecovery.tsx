'use client';

import React, { useEffect, useState } from 'react';
import { usePathname, useRouter as useNextRouter } from '@/src/shims/next-navigation';
import { CheckCircle2, AlertCircle, Info, AlertTriangle, X } from 'lucide-react';
import {
  attemptChunkErrorRecovery,
  isChunkLoadFailure,
} from '@/lib/router/chunkErrorRecovery';
import { clearNavigationFeedback, registerActiveNextRouter } from '@/lib/router/useRouter';

export interface PublicToastPayload {
  id?: string;
  type: 'success' | 'error' | 'warning' | 'info';
  title: string;
  message?: string;
}

export function dispatchPublicToast(payload: PublicToastPayload) {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new CustomEvent('chilly_public_toast', { detail: payload }));
}

export function ChunkErrorRecovery() {
  const nextRouter = useNextRouter();
  const pathname = usePathname();
  const [toasts, setToasts] = useState<Array<PublicToastPayload & { id: string }>>([]);

  useEffect(() => {
    registerActiveNextRouter(nextRouter);
  }, [nextRouter]);

  useEffect(() => {
    clearNavigationFeedback();
  }, [pathname]);

  useEffect(() => {
    const handleWindowError = (event: ErrorEvent) => {
      if (isChunkLoadFailure(event.error) || isChunkLoadFailure(event.message)) {
        event.preventDefault?.();
        attemptChunkErrorRecovery();
        return;
      }
      const target = event.target as HTMLElement | null;
      if (
        target &&
        target.tagName === 'SCRIPT' &&
        typeof (target as HTMLScriptElement).src === 'string' &&
        (target as HTMLScriptElement).src.includes('/_next/static/chunks/')
      ) {
        event.preventDefault?.();
        attemptChunkErrorRecovery();
      }
    };

    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      if (isChunkLoadFailure(event.reason)) {
        event.preventDefault?.();
        attemptChunkErrorRecovery();
      }
    };

    const handlePublicToast = (event: Event) => {
      const customEvent = event as CustomEvent<PublicToastPayload>;
      const detail = customEvent.detail;
      if (!detail || !detail.title) return;
      const id = detail.id || `pt_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
      setToasts((prev) => [...prev, { ...detail, id }]);
      setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
      }, 3500);
    };

    window.addEventListener('error', handleWindowError, true);
    window.addEventListener('unhandledrejection', handleUnhandledRejection);
    window.addEventListener('chilly_public_toast', handlePublicToast);
    return () => {
      window.removeEventListener('error', handleWindowError, true);
      window.removeEventListener('unhandledrejection', handleUnhandledRejection);
      window.removeEventListener('chilly_public_toast', handlePublicToast);
    };
  }, []);

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
            {toast.message && (
              <div className="text-xs text-white/80 mt-1 leading-normal">{toast.message}</div>
            )}
          </div>
          <button
            type="button"
            onClick={() => setToasts((prev) => prev.filter((t) => t.id !== toast.id))}
            className="text-white/60 hover:text-white transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      ))}
    </div>
  );
}
