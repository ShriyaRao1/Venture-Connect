import { useState, useEffect, useRef, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';
import { messageAPI } from '../api/api';
import { useAuth } from '../context/AuthContext';

export default function Messages() {
  const { user } = useAuth();
  const [searchParams] = useSearchParams();
  const [inbox, setInbox] = useState([]);
  const [selectedPartnerId, setSelectedPartnerId] = useState(null);
  const [selectedPartnerName, setSelectedPartnerName] = useState('');
  const [conversation, setConversation] = useState([]);
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const endRef = useRef(null);
  const pollRef = useRef(null);

  // Helper: resolve the conversation partner from an inbox message object
  const resolvePartner = useCallback((msg) => {
    const senderId = msg.sender?._id?.toString() ?? msg.sender?.toString();
    const myId = user._id?.toString();
    if (senderId === myId) {
      return { id: msg.receiver?._id?.toString() ?? msg.receiver?.toString(), name: msg.receiver?.name ?? '' };
    }
    return { id: senderId, name: msg.sender?.name ?? '' };
  }, [user._id]);

  // Fetch inbox
  const fetchInbox = useCallback(() => {
    messageAPI.inbox()
      .then(({ data }) => setInbox(data.inbox ?? []))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    fetchInbox();
  }, [fetchInbox]);

  // Handle ?with=<userId>&name=<name> query param — open/start a conversation directly
  useEffect(() => {
    const withId = searchParams.get('with');
    const withName = searchParams.get('name');
    if (withId && withName) {
      setSelectedPartnerId(withId);
      setSelectedPartnerName(decodeURIComponent(withName));
      setConversation([]);
    }
  }, [searchParams]);

  // Fetch conversation for selected partner
  const fetchConversation = useCallback((partnerId) => {
    if (!partnerId) return;
    messageAPI.conversation(partnerId)
      .then(({ data }) => setConversation(data.messages ?? []))
      .catch(() => {});
  }, []);

  // When a partner is selected, load conversation and start polling
  useEffect(() => {
    if (!selectedPartnerId) return;
    fetchConversation(selectedPartnerId);

    // Poll every 3s for new messages
    clearInterval(pollRef.current);
    pollRef.current = setInterval(() => {
      fetchConversation(selectedPartnerId);
    }, 3000);

    return () => clearInterval(pollRef.current);
  }, [selectedPartnerId, fetchConversation]);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [conversation]);

  const handleSelectConversation = (msg) => {
    const partner = resolvePartner(msg);
    setSelectedPartnerId(partner.id);
    setSelectedPartnerName(partner.name);
    setConversation([]);
  };

  const handleSend = async (e) => {
    e.preventDefault();
    if (!text.trim() || !selectedPartnerId) return;
    setSending(true);
    try {
      const { data } = await messageAPI.send({ receiverId: selectedPartnerId, content: text });
      setConversation((prev) => [...prev, data.message]);
      setText('');
      fetchInbox();
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Failed to send message');
    } finally {
      setSending(false);
    }
  };

  const myId = user._id?.toString();

  return (
    <div className="flex h-[calc(100vh-56px)] overflow-hidden">

      {/* ── Inbox ──────────────────────────────────── */}
      <div className="w-64 shrink-0 border-r border-[#2a2a2a] flex flex-col overflow-hidden bg-[#0c0c0c]">
        <div className="px-4 py-3 border-b border-[#2a2a2a]">
          <h2 className="text-xs font-black text-white uppercase tracking-widest">Messages</h2>
        </div>
        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="p-3 space-y-2">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="flex gap-2.5 p-2">
                  <div className="skeleton w-8 h-8 rounded-full shrink-0" />
                  <div className="flex-1 pt-1 space-y-1.5">
                    <div className="skeleton w-20 h-2.5 rounded" />
                    <div className="skeleton w-full h-2 rounded" />
                  </div>
                </div>
              ))}
            </div>
          ) : inbox.length === 0 ? (
            <div className="py-12 px-4 text-center text-[#555] text-xs">
              No conversations yet.<br />
              <span className="text-[#444]">Visit an investor or startup profile to start one.</span>
            </div>
          ) : inbox.map((msg) => {
            const partner = resolvePartner(msg);
            const isSelected = selectedPartnerId === partner.id;
            return (
              <button key={msg._id} onClick={() => handleSelectConversation(msg)}
                className={`w-full flex items-center gap-2.5 px-3 py-3 text-left transition-colors ${
                  isSelected ? 'bg-[#1a1a1a]' : 'hover:bg-[#141414]'
                }`}>
                <div className="w-8 h-8 rounded-full bg-[#00c853] flex items-center justify-center text-black font-bold text-xs shrink-0">
                  {partner.name?.[0]?.toUpperCase() ?? '?'}
                </div>
                <div className="overflow-hidden flex-1">
                  <p className={`text-xs font-semibold truncate ${isSelected ? 'text-white' : 'text-[#aaa]'}`}>
                    {partner.name}
                  </p>
                  <p className="text-[10px] text-[#444] truncate">{msg.content?.slice(0, 30)}...</p>
                </div>
                {isSelected && <div className="w-1.5 h-1.5 rounded-full bg-[#00c853] shrink-0" />}
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Chat ──────────────────────────────────── */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {!selectedPartnerId ? (
          <div className="flex-1 flex flex-col items-center justify-center gap-2 text-[#333]">
            <span className="text-4xl">✉</span>
            <span className="text-xs font-medium">Select a conversation</span>
          </div>
        ) : (
          <>
            {/* Chat header */}
            <div className="flex items-center gap-3 px-5 py-3 border-b border-[#2a2a2a] bg-[#0c0c0c] shrink-0">
              <div className="w-7 h-7 rounded-full bg-[#00c853] flex items-center justify-center text-black font-bold text-xs">
                {selectedPartnerName?.[0]?.toUpperCase() ?? '?'}
              </div>
              <span className="text-sm font-bold text-white">{selectedPartnerName}</span>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto px-5 py-4 space-y-2.5">
              {conversation.length === 0 && (
                <p className="text-center text-[#444] text-xs py-8">No messages yet. Say hello! 👋</p>
              )}
              {conversation.map((msg) => {
                const senderId = msg.sender?._id?.toString() ?? msg.sender?.toString();
                const isMe = senderId === myId;
                return (
                  <motion.div key={msg._id}
                    initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }}
                    className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[60%] px-3.5 py-2.5 rounded-xl text-xs leading-relaxed ${
                      isMe
                        ? 'bg-[#00c853] text-black font-medium rounded-br-md'
                        : 'bg-[#1e1e1e] border border-[#2a2a2a] text-[#ddd] rounded-bl-md'
                    }`}>
                      <p>{msg.content}</p>
                      <p className={`text-[9px] mt-1 text-right ${isMe ? 'text-black/50' : 'text-[#888]'}`}>
                        {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>
                  </motion.div>
                );
              })}
              <div ref={endRef} />
            </div>

            {/* Input */}
            <form onSubmit={handleSend}
              className="flex gap-2 px-4 py-3 border-t border-[#2a2a2a] bg-[#0c0c0c] shrink-0">
              <input value={text} onChange={(e) => setText(e.target.value)}
                placeholder="Type a message..." className="al-input flex-1 py-2" />
              <button type="submit" disabled={sending || !text.trim()}
                className="btn-al px-4 py-2 text-xs rounded-md disabled:opacity-50 disabled:cursor-not-allowed">
                {sending ? '...' : 'Send'}
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
