'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { MessageCircle, Send, ShieldCheck, Loader2, AlertCircle } from 'lucide-react';
import { Listing } from '@/lib/types';
import { useAppOptional } from '@/context/AppContextInstance';
import { dispatchPublicToast } from '@/components/common/ChunkErrorRecovery';

export interface SellerLiveChatBoxProps {
  listing: Listing;
}

export type AuthState = 'checking' | 'authenticated' | 'guest';

export const SellerLiveChatBox: React.FC<SellerLiveChatBoxProps> = ({ listing }) => {
  const app = useAppOptional();
  const currentUser = app?.currentUser || null;

  const [chatMessages, setChatMessages] = useState<
    Array<{ id: string; sender: 'user' | 'seller'; text: string; time: string }>
  >([]);
  const [newChatInput, setNewChatInput] = useState('');
  const [loading, setLoading] = useState(true);
  const [authState, setAuthState] = useState<AuthState>('checking');
  const [sending, setSending] = useState(false);
  const [chatError, setChatError] = useState<string | null>(null);

  const notify = useCallback(
    (payload: { type: 'success' | 'error' | 'warning' | 'info'; title: string; message?: string }) => {
      if (app?.addToast) {
        app.addToast(payload);
      } else {
        dispatchPublicToast(payload);
      }
    },
    [app]
  );

  const loadChatMessages = useCallback(async () => {
    setLoading(true);
    setChatError(null);
    try {
      const res = await fetch(`/api/chat?listingId=${encodeURIComponent(listing.id)}`, {
        cache: 'no-store',
      });

      if (res.status === 401) {
        setAuthState('guest');
        setChatMessages([]);
        setLoading(false);
        return;
      }

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setChatError(data?.error || `Failed to load chat messages (HTTP ${res.status}).`);
        if (currentUser) {
          setAuthState('authenticated');
        }
        setLoading(false);
        return;
      }

      const data = await res.json().catch(() => null);
      if (data && Array.isArray(data.messages)) {
        setAuthState('authenticated');
        setChatMessages(
          data.messages.map((m: any) => ({
            id: m.id,
            sender: m.senderId === listing.sellerId ? 'seller' : 'user',
            text: m.messageText,
            time: new Date(m.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          }))
        );
      } else {
        setAuthState('authenticated');
        setChatMessages([]);
      }
    } catch (err: any) {
      console.error('Failed to load chat messages:', err);
      setChatError(err?.message || 'Connection error. Unable to load chat messages.');
      if (currentUser) {
        setAuthState('authenticated');
      }
    } finally {
      setLoading(false);
    }
  }, [listing.id, listing.sellerId, currentUser]);

  useEffect(() => {
    loadChatMessages();
  }, [loadChatMessages, currentUser?.id]);

  useEffect(() => {
    const handleAuthStateChanged = () => {
      loadChatMessages();
    };
    window.addEventListener('auth_state_changed', handleAuthStateChanged);
    return () => {
      window.removeEventListener('auth_state_changed', handleAuthStateChanged);
    };
  }, [loadChatMessages]);

  const handleOpenSignUp = () => {
    window.dispatchEvent(new CustomEvent('open_auth_modal', { detail: { mode: 'signup' } }));
  };

  const handleOpenSignIn = () => {
    window.dispatchEvent(new CustomEvent('open_auth_modal', { detail: { mode: 'signin' } }));
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newChatInput.trim() || sending) return;

    const userMsg = newChatInput.trim();
    setChatError(null);
    setSending(true);

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          listingId: listing.id,
          messageText: userMsg,
        }),
      });

      const data = await res.json().catch(() => null);

      if (!res.ok) {
        if (res.status === 401) {
          setAuthState('guest');
          setChatError('Sign in or create an account to start chatting with sellers.');
          notify({
            type: 'warning',
            title: 'Sign In Required',
            message: 'Your session has expired. Please sign in to message this seller.',
          });
        } else {
          setChatError(data?.error || 'Failed to send message. Please try again.');
        }
        return;
      }

      if (data?.message) {
        const createdMsg = data.message;
        setChatMessages((prev) => [
          ...prev,
          {
            id: createdMsg.id,
            sender: createdMsg.senderId === listing.sellerId ? 'seller' : 'user',
            text: createdMsg.messageText,
            time: new Date(createdMsg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          },
        ]);
        setNewChatInput('');
      }
    } catch (err: any) {
      setChatError(err?.message || 'Network error while sending message.');
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="bg-white dark:bg-slate-900 rounded-xl border border-[#dadce0] dark:border-slate-800 overflow-hidden shadow-2xs">
      <div className="bg-[#f8f9fa] dark:bg-slate-800/80 border-b border-[#dadce0] dark:border-slate-800 text-[#202124] dark:text-white px-5 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <MessageCircle className="w-4 h-4 text-[#1dbf73]" />
          <span className="font-bold text-xs">Message {listing.sellerName}</span>
        </div>
        <span className="text-[11px] text-[#137333] dark:text-emerald-400 font-semibold">Available</span>
      </div>

      {chatError && (
        <div className="mx-4 mt-3 p-2.5 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/50 text-rose-700 dark:text-rose-300 text-xs rounded-lg flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-500" />
            <span>{chatError}</span>
          </div>
          <button
            type="button"
            onClick={loadChatMessages}
            className="px-2.5 py-1 bg-rose-100 dark:bg-rose-900/60 hover:bg-rose-200 dark:hover:bg-rose-800 text-rose-800 dark:text-rose-200 text-xs font-semibold rounded shrink-0 transition-colors cursor-pointer"
          >
            Retry
          </button>
        </div>
      )}

      {loading ? (
        <div className="p-4 bg-white dark:bg-slate-900 flex items-center justify-center h-64 text-slate-400 gap-2 text-xs font-medium">
          <Loader2 className="w-4 h-4 animate-spin text-[#1dbf73]" />
          <span>Checking chat availability...</span>
        </div>
      ) : authState === 'guest' ? (
        <div className="p-6 bg-slate-50/80 dark:bg-slate-800/40 flex flex-col items-center justify-center text-center h-64 space-y-3">
          <div className="p-3 bg-emerald-100 dark:bg-emerald-950/60 text-[#1dbf73] rounded-full">
            <MessageCircle className="w-6 h-6" />
          </div>
          <div className="space-y-1">
            <p className="font-bold text-slate-800 dark:text-slate-100 text-sm">
              Sign in or create a free account to start chatting.
            </p>
            <p className="text-xs text-slate-500 dark:text-slate-400 max-w-xs">
              Direct buyer-seller messaging is enabled for all registered members.
            </p>
          </div>
          <div className="flex items-center gap-3 pt-2">
            <button
              type="button"
              onClick={handleOpenSignUp}
              className="px-4 py-2 bg-[#1dbf73] hover:bg-[#19a463] text-white font-bold text-xs rounded-lg shadow-sm cursor-pointer transition-colors"
            >
              Sign Up
            </button>
            <button
              type="button"
              onClick={handleOpenSignIn}
              className="px-4 py-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-200 font-bold text-xs rounded-lg shadow-sm hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer transition-colors"
            >
              Log In
            </button>
          </div>
        </div>
      ) : authState === 'authenticated' ? (
        <>
          <div className="p-4 bg-white dark:bg-slate-900 space-y-3 h-64 overflow-y-auto text-xs">
            {chatMessages.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-slate-400 text-center space-y-1">
                <p className="font-semibold text-slate-600 dark:text-slate-300">No previous messages</p>
                <p className="text-[11px] text-slate-400">Ask a question or propose an offer to start the conversation.</p>
              </div>
            ) : (
              chatMessages.map((msg, index) => (
                <div
                  key={index}
                  className={`flex flex-col ${msg.sender === 'user' ? 'items-end' : 'items-start'}`}
                >
                  <div
                    className={`max-w-[85%] p-3 rounded-xl ${
                      msg.sender === 'user'
                        ? 'bg-[#1dbf73] text-white rounded-br-none'
                        : 'bg-[#f8f9fa] dark:bg-slate-800 text-[#202124] dark:text-slate-100 border border-[#dadce0] dark:border-slate-700 rounded-bl-none'
                    }`}
                  >
                    <p>{msg.text}</p>
                  </div>
                  <span className="text-[9px] text-[#5f6368] dark:text-slate-400 mt-0.5 px-1 font-mono tabular-nums">
                    {msg.time}
                  </span>
                </div>
              ))
            )}
          </div>

          <form
            onSubmit={handleSendMessage}
            className="p-3 bg-[#f8f9fa] dark:bg-slate-800/80 border-t border-[#dadce0] dark:border-slate-800 flex gap-2"
          >
            <input
              type="text"
              value={newChatInput}
              onChange={(e) => setNewChatInput(e.target.value)}
              placeholder="Ask a question or propose an offer..."
              className="flex-1 text-xs bg-white dark:bg-slate-900 border border-[#dadce0] dark:border-slate-700 text-slate-900 dark:text-white rounded-md px-3 py-2 focus:border-[#202124] dark:focus:border-emerald-500 focus:outline-none"
            />
            <button
              type="submit"
              disabled={!newChatInput.trim() || sending}
              className="px-3.5 py-2 bg-[#1dbf73] hover:bg-[#19a463] disabled:opacity-50 text-white rounded-md text-xs font-semibold flex items-center gap-1 transition-colors cursor-pointer"
            >
              {sending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
            </button>
          </form>
        </>
      ) : (
        <div className="p-6 bg-slate-50/80 dark:bg-slate-800/40 flex flex-col items-center justify-center text-center h-64 space-y-3">
          <div className="p-3 bg-amber-100 dark:bg-amber-950/60 text-amber-600 rounded-full">
            <AlertCircle className="w-6 h-6" />
          </div>
          <div className="space-y-1">
            <p className="font-bold text-slate-800 dark:text-slate-100 text-sm">
              Unable to connect to chat
            </p>
            <p className="text-xs text-slate-500 dark:text-slate-400 max-w-xs">
              {chatError || 'An error occurred while checking chat availability.'}
            </p>
          </div>
          <button
            type="button"
            onClick={loadChatMessages}
            className="px-4 py-2 bg-[#1dbf73] hover:bg-[#19a463] text-white font-bold text-xs rounded-lg shadow-sm cursor-pointer transition-colors"
          >
            Retry Connection
          </button>
        </div>
      )}
    </div>
  );
};

export const BuyerSafetyBanner: React.FC = () => (
  <div className="bg-amber-50 border border-amber-200/80 rounded-2xl p-4 text-amber-900 text-xs space-y-2">
    <div className="font-bold flex items-center gap-1.5 text-amber-800">
      <ShieldCheck className="w-4 h-4 text-amber-600" /> Safety Tips for Indian Buyers
    </div>
    <ul className="space-y-1 text-[11px] list-disc list-inside text-amber-800/90 leading-relaxed">
      <li>Meet in person in a safe, public daytime location.</li>
      <li>Never transfer advance token money via UPI or QR code.</li>
      <li>Verify vehicle registration/RC or electronic bills before payment.</li>
    </ul>
  </div>
);
