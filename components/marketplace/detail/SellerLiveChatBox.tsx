'use client';

import React, { useState, useEffect } from 'react';
import { MessageCircle, Send, ShieldCheck } from 'lucide-react';
import { Listing } from '@/lib/types';
import { useAppOptional } from '@/context/AppContextInstance';

export interface SellerLiveChatBoxProps {
  listing: Listing;
}

export const SellerLiveChatBox: React.FC<SellerLiveChatBoxProps> = ({ listing }) => {
  const app = useAppOptional();
  const [chatMessages, setChatMessages] = useState<
    Array<{ id: string; sender: 'user' | 'seller'; text: string; time: string }>
  >([]);
  const [newChatInput, setNewChatInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [chatError, setChatError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;
    setLoading(true);
    fetch(`/api/chat?listingId=${encodeURIComponent(listing.id)}`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (!isMounted || !data || !Array.isArray(data.messages)) return;
        setChatMessages(
          data.messages.map((m: any) => ({
            id: m.id,
            sender: m.senderId === listing.sellerId ? 'seller' : 'user',
            text: m.messageText,
            time: new Date(m.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          }))
        );
      })
      .catch((err) => {
        console.error('Failed to load chat messages:', err);
      })
      .finally(() => {
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [listing.id, listing.sellerId]);

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
          setChatError('Please sign in to message this seller.');
          app?.addToast?.({
            type: 'warning',
            title: 'Sign In Required',
            message: 'You must be signed in to send messages to sellers.',
          });
        } else {
          setChatError(data?.error || 'Failed to send message.');
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
    <div className="bg-white rounded-xl border border-[#dadce0] overflow-hidden shadow-2xs">
      <div className="bg-[#f8f9fa] border-b border-[#dadce0] text-[#202124] px-5 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <MessageCircle className="w-4 h-4 text-[#1dbf73]" />
          <span className="font-bold text-xs">Message {listing.sellerName}</span>
        </div>
        <span className="text-[11px] text-[#137333] font-semibold">Available</span>
      </div>

      <div className="p-4 bg-white space-y-3 h-64 overflow-y-auto text-xs">
        {chatMessages.map((msg, index) => (
          <div
            key={index}
            className={`flex flex-col ${msg.sender === 'user' ? 'items-end' : 'items-start'}`}
          >
            <div
              className={`max-w-[85%] p-3 rounded-xl ${
                msg.sender === 'user'
                  ? 'bg-[#1dbf73] text-white rounded-br-none'
                  : 'bg-[#f8f9fa] text-[#202124] border border-[#dadce0] rounded-bl-none'
              }`}
            >
              <p>{msg.text}</p>
            </div>
            <span className="text-[9px] text-[#5f6368] mt-0.5 px-1 font-mono tabular-nums">
              {msg.time}
            </span>
          </div>
        ))}

        {isTyping && (
          <div className="flex items-center gap-1 text-[#5f6368] italic text-[11px]">
            <span>Seller is typing...</span>
          </div>
        )}
      </div>

      {/* Chat Input */}
      <form
        onSubmit={handleSendMessage}
        className="p-3 bg-[#f8f9fa] border-t border-[#dadce0] flex gap-2"
      >
        <input
          type="text"
          value={newChatInput}
          onChange={(e) => setNewChatInput(e.target.value)}
          placeholder="Ask a question or propose an offer..."
          className="flex-1 text-xs bg-white border border-[#dadce0] rounded-md px-3 py-2 focus:border-[#202124] focus:outline-none"
        />
        <button
          type="submit"
          disabled={!newChatInput.trim()}
          className="px-3.5 py-2 bg-[#1dbf73] hover:bg-[#19a463] disabled:opacity-50 text-white rounded-md text-xs font-semibold flex items-center gap-1 transition-colors cursor-pointer"
        >
          <Send className="w-3.5 h-3.5" />
        </button>
      </form>
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
