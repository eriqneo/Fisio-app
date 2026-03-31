import React, { useState, useEffect, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  MessageSquare, 
  Send, 
  X, 
  User, 
  Clock,
  MoreVertical,
  Paperclip,
  Smile,
  ChevronDown
} from 'lucide-react';
import { useTenantDb } from '@/hooks/useTenantDb';
import { format } from 'date-fns';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuthStore } from '@/store/useAuthStore';

export default function ChatWidget({ otherUserId, otherUserName }: { otherUserId: number, otherUserName: string }) {
  const { chat, auditLogs } = useTenantDb();
  const { user } = useAuthStore();
  const queryClient = useQueryClient();
  const [isOpen, setIsOpen] = useState(false);
  const [message, setMessage] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);

  const { data: messages } = useQuery({
    queryKey: ['chat', otherUserId],
    queryFn: () => chat.listConversation(otherUserId),
    refetchInterval: 3000 // Poll for new messages every 3 seconds
  });

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
    if (isOpen && messages) {
      chat.markAsRead(otherUserId);
    }
  }, [messages, isOpen]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim()) return;

    await chat.send(otherUserId, message);
    setMessage('');
    queryClient.invalidateQueries({ queryKey: ['chat', otherUserId] });
    
    // Trigger "push notification" (mocked)
    if (window.Notification && Notification.permission === 'granted') {
      new Notification(`New message from ${user?.name}`, { body: message });
    }
  };

  return (
    <div className="fixed bottom-10 right-10 z-50">
      <AnimatePresence>
        {isOpen && (
          <motion.div 
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            className="absolute bottom-20 right-0 w-[400px] h-[600px] bg-white rounded-[40px] shadow-2xl border border-primary/5 flex flex-col overflow-hidden"
          >
            {/* Header */}
            <header className="p-4 bg-primary text-white flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center">
                  <User size={18} />
                </div>
                <div>
                  <h4 className="text-sm font-bold">{otherUserName}</h4>
                  <div className="flex items-center gap-1.5">
                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                    <span className="text-[10px] font-bold text-white/40 uppercase tracking-widest">Online</span>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button className="p-2 hover:bg-white/10 rounded-lg transition-colors">
                  <MoreVertical size={18} />
                </button>
                <button 
                  onClick={() => setIsOpen(false)}
                  className="p-2 hover:bg-white/10 rounded-lg transition-colors"
                >
                  <X size={18} />
                </button>
              </div>
            </header>

            {/* Messages */}
            <div 
              ref={scrollRef}
              className="flex-1 overflow-y-auto p-4 space-y-4 bg-surface-muted/30"
            >
              {messages?.map((msg, i) => {
                const isMe = msg.senderId === user?.id;
                return (
                  <div 
                    key={msg.id || i}
                    className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}
                  >
                    <div className={`max-w-[80%] space-y-1`}>
                      <div className={`px-4 py-3 rounded-2xl text-sm ${
                        isMe 
                          ? 'bg-primary text-white rounded-tr-none' 
                          : 'bg-white text-primary border border-primary/5 rounded-tl-none'
                      }`}>
                        {msg.content}
                      </div>
                      <p className={`text-[9px] font-bold text-primary/20 uppercase tracking-widest ${isMe ? 'text-right' : 'text-left'}`}>
                        {format(msg.timestamp, 'HH:mm')}
                      </p>
                    </div>
                  </div>
                );
              })}
              {messages?.length === 0 && (
                <div className="h-full flex flex-col items-center justify-center text-center space-y-4 opacity-20">
                  <MessageSquare size={48} />
                  <p className="text-[10px] font-bold uppercase tracking-widest">Start the conversation</p>
                </div>
              )}
            </div>

            {/* Input */}
            <form onSubmit={handleSend} className="p-4 bg-white border-t border-primary/5">
              <div className="relative">
                <textarea 
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleSend(e);
                    }
                  }}
                  placeholder="Type a message..."
                  className="w-full pl-6 pr-16 py-4 bg-surface-muted border-none rounded-2xl text-sm focus:ring-2 focus:ring-accent/20 transition-all resize-none"
                  rows={1}
                />
                <div className="absolute right-4 bottom-3 flex items-center gap-2">
                  <button type="button" className="p-1.5 text-primary/20 hover:text-primary transition-colors">
                    <Smile size={18} />
                  </button>
                  <button 
                    type="submit"
                    disabled={!message.trim()}
                    className="p-2 bg-primary text-white rounded-xl hover:opacity-90 transition-all disabled:opacity-30"
                  >
                    <Send size={16} />
                  </button>
                </div>
              </div>
            </form>
          </motion.div>
        )}
      </AnimatePresence>

      <button 
        onClick={() => setIsOpen(!isOpen)}
        className={`w-16 h-16 rounded-full shadow-2xl flex items-center justify-center transition-all duration-300 ${
          isOpen ? 'bg-white text-primary rotate-90' : 'bg-primary text-white'
        }`}
      >
        {isOpen ? <X size={24} /> : <MessageSquare size={24} />}
        {!isOpen && messages?.some(m => !m.isRead && m.receiverId === user?.id) && (
          <div className="absolute -top-1 -right-1 w-5 h-5 bg-accent text-primary text-[10px] font-bold rounded-full flex items-center justify-center border-2 border-surface">
            !
          </div>
        )}
      </button>
    </div>
  );
}
