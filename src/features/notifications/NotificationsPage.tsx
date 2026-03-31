import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Bell, 
  MessageSquare, 
  Search, 
  Plus, 
  Send, 
  User, 
  Clock, 
  CheckCheck,
  MoreVertical,
  Trash2,
  Filter,
  ArrowLeft,
  X,
  Sparkles,
  Zap,
  ShieldCheck
} from 'lucide-react';
import { useTenantDb } from '@/hooks/useTenantDb';
import { useAuthStore } from '@/store/useAuthStore';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import { ChatMessage, Notification as SystemNotification, User as SystemUser } from '@/types';
import { chatMessageService, notificationService } from '@/db/services';

export default function NotificationsPage() {
  const { tenant, user: currentUser } = useAuthStore();
  const { users, notifications: notificationActions, chat } = useTenantDb();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<'notifications' | 'messages'>('notifications');
  const [selectedConversationId, setSelectedConversationId] = useState<number | null>(null);
  const [messageInput, setMessageInput] = useState('');
  const [isNewMessageModalOpen, setIsNewMessageModalOpen] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Fetch all users for messaging
  const { data: allUsers } = useQuery({
    queryKey: ['users', tenant?.id],
    queryFn: () => users.list(),
    enabled: !!tenant?.id,
  });

  // Fetch system notifications
  const { data: notifications } = useQuery({
    queryKey: ['notifications', tenant?.id],
    queryFn: () => notificationActions.list(),
    enabled: !!tenant?.id,
  });

  // Fetch all chat messages to group into conversations
  const { data: allMessages } = useQuery({
    queryKey: ['chat-messages', tenant?.id],
    queryFn: () => chatMessageService.listByTenant(tenant!.id!),
    enabled: !!tenant?.id,
  });

  // Group messages by conversation (other user ID)
  const conversations = React.useMemo(() => {
    if (!allMessages || !currentUser?.id) return [];
    
    const groups: Record<number, ChatMessage[]> = {};
    allMessages.forEach(msg => {
      const otherId = msg.senderId === currentUser.id ? msg.receiverId : msg.senderId;
      if (!groups[otherId]) groups[otherId] = [];
      groups[otherId].push(msg);
    });

    return Object.entries(groups).map(([id, msgs]) => {
      const otherUser = allUsers?.find(u => u.id === Number(id));
      const lastMsg = msgs[msgs.length - 1];
      const unreadCount = msgs.filter(m => m.receiverId === currentUser.id && !m.isRead).length;
      
      return {
        userId: Number(id),
        user: otherUser,
        lastMessage: lastMsg,
        unreadCount,
        messages: msgs
      };
    }).sort((a, b) => b.lastMessage.timestamp - a.lastMessage.timestamp);
  }, [allMessages, currentUser?.id, allUsers]);

  const selectedConversation = conversations.find(c => c.userId === selectedConversationId);

  // Send message mutation
  const sendMessageMutation = useMutation({
    mutationFn: async (content: string) => {
      if (!tenant?.id || !currentUser?.id || !selectedConversationId) return;

      await chat.send(selectedConversationId, content);

      // Also create a notification for the receiver
      await notificationActions.create({
        patientId: 0, // System message, not patient specific
        type: 'progress_report', // Using this as a generic type for now
        message: `New message from ${currentUser.name}: ${content.substring(0, 50)}${content.length > 50 ? '...' : ''}`,
        scheduledAt: Date.now(),
        status: 'sent',
        sentAt: Date.now()
      });
    },
    onSuccess: () => {
      setMessageInput('');
      queryClient.invalidateQueries({ queryKey: ['chat-messages'] });
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    }
  });

  // Mark messages as read when conversation is selected
  useEffect(() => {
    if (selectedConversationId && tenant?.id && currentUser?.id) {
      chat.markAsRead(selectedConversationId)
        .then(() => queryClient.invalidateQueries({ queryKey: ['chat-messages'] }));
    }
  }, [selectedConversationId, tenant?.id, currentUser?.id, queryClient, chat]);

  // Scroll to bottom of chat
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [selectedConversation?.messages]);

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (messageInput.trim()) {
      sendMessageMutation.mutate(messageInput.trim());
    }
  };

  return (
    <div className="h-[calc(100vh-120px)] flex flex-col gap-4">
      {/* Header */}
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <div className="px-3 py-1 bg-accent text-white text-[8px] font-black uppercase tracking-[0.2em] rounded-full flex items-center gap-1.5">
              <div className="w-1.5 h-1.5 bg-white rounded-full animate-pulse" />
              Real-time
            </div>
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-primary/30">Communication Hub</p>
          </div>
          <h1 className="text-6xl md:text-7xl font-serif text-primary tracking-tighter leading-none">
            Nexus <span className="italic text-primary/20">Center</span>
          </h1>
          <p className="text-primary/40 font-medium text-lg max-w-xl">
            Unified communication and system intelligence feed for your clinical operations.
          </p>
        </div>
        <div className="flex items-center gap-4">
          <div className="bg-white p-1.5 rounded-[2rem] border border-primary/5 shadow-2xl shadow-primary/5 flex">
            <button 
              onClick={() => setActiveTab('notifications')}
              className={`flex items-center gap-2 px-8 py-3 rounded-[1.5rem] text-[10px] font-black uppercase tracking-[0.2em] transition-all duration-500 ${
                activeTab === 'notifications' 
                  ? 'bg-primary text-white shadow-xl shadow-primary/20' 
                  : 'text-primary/30 hover:text-primary hover:bg-primary/5'
              }`}
            >
              <Bell size={14} />
              Alerts
            </button>
            <button 
              onClick={() => setActiveTab('messages')}
              className={`flex items-center gap-2 px-8 py-3 rounded-[1.5rem] text-[10px] font-black uppercase tracking-[0.2em] transition-all duration-500 ${
                activeTab === 'messages' 
                  ? 'bg-primary text-white shadow-xl shadow-primary/20' 
                  : 'text-primary/30 hover:text-primary hover:bg-primary/5'
              }`}
            >
              <MessageSquare size={14} />
              Direct
            </button>
          </div>
          {activeTab === 'messages' && (
            <button 
              onClick={() => setIsNewMessageModalOpen(true)}
              className="p-5 bg-accent text-white rounded-[2rem] shadow-2xl shadow-accent/20 hover:scale-105 active:scale-95 transition-all group"
            >
              <Plus size={24} className="group-hover:rotate-90 transition-transform duration-500" />
            </button>
          )}
        </div>
      </header>

      {/* Main Content Area */}
      <div className="flex-1 bg-white rounded-[4rem] border border-primary/5 shadow-[0_40px_100px_rgba(0,0,0,0.04)] overflow-hidden flex">
        {/* Sidebar */}
        <div className={`w-full md:w-80 lg:w-[400px] border-r border-primary/5 flex flex-col ${selectedConversationId ? 'hidden md:flex' : 'flex'}`}>
          <div className="p-6 border-b border-primary/5 bg-surface-muted/30">
            <div className="relative group">
              <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-primary/20 group-focus-within:text-accent transition-colors" size={20} />
              <input 
                type="text"
                placeholder={activeTab === 'notifications' ? "Filter alerts..." : "Find contacts..."}
                className="w-full pl-16 pr-6 py-5 bg-white border border-transparent rounded-[2rem] text-sm focus:ring-4 focus:ring-accent/5 outline-none transition-all shadow-sm placeholder:text-primary/10"
              />
            </div>
          </div>

          <div className="flex-1 overflow-y-auto custom-scrollbar">
            {activeTab === 'notifications' ? (
              <div className="divide-y divide-primary/5">
                {notifications?.sort((a, b) => b.scheduledAt - a.scheduledAt).map((n, i) => (
                  <motion.div 
                    key={n.id} 
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.05 }}
                    className={`p-4 hover:bg-primary/5 transition-all cursor-pointer group relative ${!n.isRead ? 'bg-accent/[0.02]' : ''}`}
                    onClick={() => notificationActions.markAsRead(n.id!).then(() => queryClient.invalidateQueries({ queryKey: ['notifications'] }))}
                  >
                    {!n.isRead && (
                      <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-accent" />
                    )}
                    <div className="flex gap-6">
                      <div className={`w-14 h-14 rounded-[1.5rem] flex items-center justify-center shrink-0 shadow-sm transition-transform group-hover:scale-110 duration-500 ${
                        n.type === 'appointment_reminder' ? 'bg-blue-50 text-blue-500' :
                        n.type === 'hep_reminder' ? 'bg-emerald-50 text-emerald-500' :
                        'bg-orange-50 text-orange-500'
                      }`}>
                        <Bell size={24} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-[10px] font-black text-primary/20 uppercase tracking-[0.2em]">{n.type.replace('_', ' ')}</span>
                          <span className="text-[10px] font-black text-primary/20 uppercase tracking-[0.2em]">{format(n.scheduledAt, 'HH:mm')}</span>
                        </div>
                        <p className={`text-sm leading-relaxed tracking-tight ${!n.isRead ? 'font-bold text-primary' : 'text-primary/60'}`}>
                          {n.message}
                        </p>
                        <div className="flex items-center justify-between mt-4">
                          <span className="text-[10px] font-black text-primary/10 uppercase tracking-[0.2em]">{format(n.scheduledAt, 'MMM dd, yyyy')}</span>
                          {!n.isRead && (
                            <div className="flex items-center gap-2">
                              <div className="w-2 h-2 rounded-full bg-accent animate-pulse" />
                              <span className="text-[8px] font-black text-accent uppercase tracking-widest">New</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </motion.div>
                ))}
                {(!notifications || notifications.length === 0) && (
                  <div className="p-20 text-center space-y-6">
                    <div className="w-24 h-24 rounded-[2.5rem] bg-surface-muted flex items-center justify-center text-primary/5 mx-auto border border-primary/5">
                      <Bell size={48} />
                    </div>
                    <p className="text-[10px] font-black text-primary/20 uppercase tracking-[0.3em]">No operational alerts</p>
                  </div>
                )}
              </div>
            ) : (
              <div className="divide-y divide-primary/5">
                {conversations.map((conv, i) => (
                  <motion.div 
                    key={conv.userId} 
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.05 }}
                    onClick={() => setSelectedConversationId(conv.userId)}
                    className={`p-4 hover:bg-primary/5 transition-all cursor-pointer group relative ${selectedConversationId === conv.userId ? 'bg-primary/5' : ''}`}
                  >
                    {selectedConversationId === conv.userId && (
                      <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-primary" />
                    )}
                    <div className="flex gap-6">
                      <div className="relative shrink-0">
                        <div className="w-16 h-16 rounded-[1.5rem] bg-primary/5 flex items-center justify-center text-primary overflow-hidden shadow-sm group-hover:scale-105 transition-transform duration-500">
                          {conv.user?.avatar ? (
                            <img src={conv.user.avatar} alt={conv.user.name} className="w-full h-full object-cover" />
                          ) : (
                            <User size={28} />
                          )}
                        </div>
                        {conv.unreadCount > 0 && (
                          <div className="absolute -top-2 -right-2 w-7 h-7 bg-accent text-white text-[10px] font-black rounded-full flex items-center justify-center border-4 border-white shadow-lg">
                            {conv.unreadCount}
                          </div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-2">
                          <h4 className="text-base font-bold text-primary tracking-tight truncate">{conv.user?.name || 'Unknown User'}</h4>
                          <span className="text-[10px] font-black text-primary/20 uppercase tracking-[0.2em]">{format(conv.lastMessage.timestamp, 'HH:mm')}</span>
                        </div>
                        <p className={`text-xs truncate tracking-tight ${conv.unreadCount > 0 ? 'font-bold text-primary' : 'text-primary/40'}`}>
                          {conv.lastMessage.senderId === currentUser?.id ? (
                            <span className="text-accent font-black mr-1">You:</span>
                          ) : ''}{conv.lastMessage.content}
                        </p>
                        <div className="mt-3 flex items-center gap-2">
                          <span className="text-[9px] font-black text-primary/10 uppercase tracking-[0.2em]">{conv.user?.role}</span>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                ))}
                {conversations.length === 0 && (
                  <div className="p-20 text-center space-y-6">
                    <div className="w-24 h-24 rounded-[2.5rem] bg-surface-muted flex items-center justify-center text-primary/5 mx-auto border border-primary/5">
                      <MessageSquare size={48} />
                    </div>
                    <p className="text-[10px] font-black text-primary/20 uppercase tracking-[0.3em]">No active threads</p>
                    <button 
                      onClick={() => setIsNewMessageModalOpen(true)}
                      className="text-[10px] font-black text-accent uppercase tracking-[0.2em] hover:underline"
                    >
                      Initialize Thread
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Chat Area */}
        <div className={`flex-1 flex flex-col bg-surface-muted/20 ${!selectedConversationId && activeTab === 'messages' ? 'hidden md:flex' : 'flex'}`}>
          {activeTab === 'messages' ? (
            selectedConversationId ? (
              <>
                {/* Chat Header */}
                <div className="p-3 bg-white border-b border-primary/5 flex items-center justify-between shrink-0">
                  <div className="flex items-center gap-4">
                    <button 
                      onClick={() => setSelectedConversationId(null)}
                      className="md:hidden p-2 text-primary/40 hover:text-primary transition-all bg-primary/5 rounded-xl"
                    >
                      <ArrowLeft size={18} />
                    </button>
                    <div className="w-12 h-12 rounded-xl bg-primary/5 flex items-center justify-center text-primary overflow-hidden shadow-sm">
                      {selectedConversation?.user?.avatar ? (
                        <img src={selectedConversation.user.avatar} alt={selectedConversation.user.name} className="w-full h-full object-cover" />
                      ) : (
                        <User size={24} />
                      )}
                    </div>
                    <div>
                      <h4 className="text-lg font-bold text-primary tracking-tight">{selectedConversation?.user?.name}</h4>
                      <div className="flex items-center gap-2 mt-0.5">
                        <div className="flex items-center gap-1">
                          <div className="w-1 h-1 rounded-full bg-emerald-500 animate-pulse" />
                          <span className="text-[9px] font-black text-emerald-600 uppercase tracking-[0.2em]">Online</span>
                        </div>
                        <div className="w-0.5 h-0.5 rounded-full bg-primary/10" />
                        <span className="text-[9px] font-black text-primary/20 uppercase tracking-[0.2em]">{selectedConversation?.user?.role}</span>
                      </div>
                    </div>
                  </div>
                  <button className="p-3 text-primary/20 hover:text-primary transition-all hover:bg-primary/5 rounded-xl">
                    <MoreVertical size={20} />
                  </button>
                </div>

                {/* Messages List */}
                <div 
                  ref={scrollRef}
                  className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar"
                >
                  {selectedConversation?.messages.map((msg, idx) => {
                    const isMe = msg.senderId === currentUser?.id;
                    const showDate = idx === 0 || format(msg.timestamp, 'yyyy-MM-dd') !== format(selectedConversation.messages[idx-1].timestamp, 'yyyy-MM-dd');
                    
                    return (
                      <React.Fragment key={msg.id}>
                        {showDate && (
                          <div className="flex items-center gap-6 my-12">
                            <div className="h-[1px] flex-1 bg-primary/5" />
                            <span className="text-[10px] font-black text-primary/20 uppercase tracking-[0.3em]">{format(msg.timestamp, 'MMMM dd, yyyy')}</span>
                            <div className="h-[1px] flex-1 bg-primary/5" />
                          </div>
                        )}
                        <motion.div 
                          initial={{ opacity: 0, y: 10, scale: 0.95 }}
                          animate={{ opacity: 1, y: 0, scale: 1 }}
                          className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}
                        >
                          <div className={`max-w-[85%] space-y-1 ${isMe ? 'items-end' : 'items-start'}`}>
                            <div className={`px-6 py-3 rounded-[1.5rem] text-sm leading-relaxed shadow-xl shadow-primary/5 ${
                              isMe 
                                ? 'bg-primary text-white rounded-tr-none' 
                                : 'bg-white text-primary rounded-tl-none border border-primary/5'
                            }`}>
                              {msg.content}
                            </div>
                            <div className={`flex items-center gap-3 px-3 ${isMe ? 'justify-end' : 'justify-start'}`}>
                              <span className="text-[9px] font-black text-primary/20 uppercase tracking-[0.2em]">{format(msg.timestamp, 'HH:mm')}</span>
                              {isMe && (
                                <CheckCheck size={14} className={msg.isRead ? 'text-accent' : 'text-primary/10'} />
                              )}
                            </div>
                          </div>
                        </motion.div>
                      </React.Fragment>
                    );
                  })}
                </div>

                {/* Chat Input */}
                <div className="p-3 bg-white border-t border-primary/5 shrink-0">
                  <form onSubmit={handleSendMessage} className="flex items-center gap-4">
                    <div className="flex-1 relative group">
                      <input 
                        type="text"
                        value={messageInput}
                        onChange={(e) => setMessageInput(e.target.value)}
                        placeholder="Compose message..."
                        className="w-full px-8 py-3 bg-surface-muted/50 border border-transparent rounded-2xl text-sm focus:bg-white focus:ring-4 focus:ring-accent/5 outline-none transition-all shadow-sm placeholder:text-primary/10"
                      />
                      <div className="absolute right-4 top-1/2 -translate-y-1/2 flex items-center gap-2">
                        <button type="button" className="p-1.5 text-primary/10 hover:text-accent transition-colors">
                          <Sparkles size={16} />
                        </button>
                      </div>
                    </div>
                    <button 
                      type="submit"
                      disabled={!messageInput.trim() || sendMessageMutation.isPending}
                      className="p-3 bg-accent text-white rounded-2xl shadow-2xl shadow-accent/20 hover:scale-105 active:scale-95 transition-all disabled:opacity-50 disabled:scale-100 group"
                    >
                      <Send size={20} className="group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform duration-500" />
                    </button>
                  </form>
                </div>
              </>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center p-20 text-center space-y-10">
                <div className="relative">
                  <div className="w-40 h-40 rounded-[4rem] bg-white border border-primary/5 shadow-[0_40px_80px_rgba(0,0,0,0.06)] flex items-center justify-center text-primary/5 relative z-10">
                    <MessageSquare size={80} />
                  </div>
                  <div className="absolute -right-4 -bottom-4 w-20 h-20 bg-accent/10 rounded-[2rem] blur-2xl animate-pulse" />
                </div>
                <div className="space-y-4 max-w-sm">
                  <h3 className="text-4xl font-serif text-primary tracking-tight">Operational <span className="italic text-primary/20">Nexus</span></h3>
                  <p className="text-primary/40 text-lg font-medium leading-relaxed">
                    Select a secure communication thread to synchronize with your medical team.
                  </p>
                </div>
                <button 
                  onClick={() => setIsNewMessageModalOpen(true)}
                  className="px-12 py-5 bg-primary text-white rounded-[2rem] text-[10px] font-black uppercase tracking-[0.3em] hover:scale-105 active:scale-95 transition-all shadow-2xl shadow-primary/20"
                >
                  Initiate Thread
                </button>
              </div>
            )
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center p-20 text-center space-y-10">
              <div className="relative">
                <div className="w-40 h-40 rounded-[4rem] bg-white border border-primary/5 shadow-[0_40px_80px_rgba(0,0,0,0.06)] flex items-center justify-center text-primary/5 relative z-10">
                  <Bell size={80} />
                </div>
                <div className="absolute -right-4 -bottom-4 w-20 h-20 bg-blue-500/10 rounded-[2rem] blur-2xl animate-pulse" />
              </div>
              <div className="space-y-4 max-w-sm">
                <h3 className="text-4xl font-serif text-primary tracking-tight">System <span className="italic text-primary/20">Intelligence</span></h3>
                <p className="text-primary/40 text-lg font-medium leading-relaxed">
                  Automated clinical alerts and operational notifications are aggregated here for your review.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* New Message Modal */}
      <AnimatePresence>
        {isNewMessageModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsNewMessageModalOpen(false)}
              className="absolute inset-0 bg-primary/60 backdrop-blur-xl"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 40 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 40 }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className="relative w-full max-w-xl bg-white rounded-[4rem] shadow-[0_50px_100px_rgba(0,0,0,0.3)] overflow-hidden"
            >
              <div className="p-12 border-b border-primary/5 flex items-center justify-between bg-surface-muted/30">
                <div>
                  <h3 className="text-4xl font-serif text-primary tracking-tight">Initialize Thread</h3>
                  <p className="text-primary/30 text-[10px] font-black uppercase tracking-[0.2em] mt-2">Operational Identity Selection</p>
                </div>
                <button 
                  onClick={() => setIsNewMessageModalOpen(false)}
                  className="p-4 hover:bg-white rounded-2xl transition-all text-primary/20 hover:text-primary hover:rotate-90"
                >
                  <X size={32} />
                </button>
              </div>

              <div className="p-8 max-h-[500px] overflow-y-auto custom-scrollbar">
                <div className="grid grid-cols-1 gap-4">
                  {allUsers?.filter(u => u.id !== currentUser?.id).map(user => (
                    <button 
                      key={user.id}
                      onClick={() => {
                        setSelectedConversationId(user.id!);
                        setIsNewMessageModalOpen(false);
                        setActiveTab('messages');
                      }}
                      className="w-full flex items-center gap-6 p-6 hover:bg-primary/5 rounded-[2.5rem] transition-all group text-left border border-transparent hover:border-primary/5"
                    >
                      <div className="w-16 h-16 rounded-[1.5rem] bg-primary/5 flex items-center justify-center text-primary overflow-hidden shadow-sm group-hover:scale-105 transition-transform duration-500">
                        {user.avatar ? (
                          <img src={user.avatar} alt={user.name} className="w-full h-full object-cover" />
                        ) : (
                          <User size={28} />
                        )}
                      </div>
                      <div className="flex-1">
                        <h4 className="text-lg font-bold text-primary group-hover:text-accent transition-colors tracking-tight">{user.name}</h4>
                        <div className="flex items-center gap-3 mt-1">
                          <span className="text-[10px] font-black text-primary/20 uppercase tracking-[0.2em]">{user.role}</span>
                          <div className="w-1 h-1 rounded-full bg-primary/10" />
                          <div className="flex items-center gap-1.5">
                            <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                            <span className="text-[9px] font-black text-emerald-600 uppercase tracking-widest">Available</span>
                          </div>
                        </div>
                      </div>
                      <div className="w-12 h-12 rounded-2xl bg-primary/5 flex items-center justify-center text-primary/10 group-hover:bg-accent group-hover:text-white transition-all">
                        <Plus size={20} />
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
