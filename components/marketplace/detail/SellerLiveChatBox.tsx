'use client';

import React, { useState } from 'react';
import { MessageCircle, Send, ShieldCheck } from 'lucide-react';
import { Listing } from '@/lib/types';

export interface SellerLiveChatBoxProps {
  listing: Listing;
}

export const SellerLiveChatBox: React.FC<SellerLiveChatBoxProps> = ({ listing }) => {
  const [chatMessages, setChatMessages] = useState<
    Array<{ sender: 'user' | 'seller'; text: string; time: string }>
  >([
    {
      sender: 'seller',
      text: 'Namaste! Thanks for your interest in this listing. Feel free to ask any questions or schedule an inspection.',
      time: 'Just now',
    },
  ]);
  const [newChatInput, setNewChatInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newChatInput.trim()) return;

    const userMsg = newChatInput.trim();
    const now = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    setChatMessages((prev) => [...prev, { sender: 'user', text: userMsg, time: now }]);
    setNewChatInput('');

    setIsTyping(true);
    setTimeout(() => {
      setIsTyping(false);
      setChatMessages((prev) => [
        ...prev,
        {
          sender: 'seller',
          text: `Yes, the ${listing.title} is available in ${listing.location.city}. You are welcome to inspect it!`,
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        },
      ]);
    }, 1200);
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
