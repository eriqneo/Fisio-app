import React, { useState, useRef, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Bell, CheckCircle2, Clock, MessageSquare, AlertCircle, Trash2 } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTenantDb } from '@/hooks/useTenantDb';
import { motion, AnimatePresence } from 'framer-motion';
import { formatDistanceToNow } from 'date-fns';

export default function NotificationCenter() {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const { notifications } = useTenantDb();
  const queryClient = useQueryClient();

  const { data: recent = [] } = useQuery({
    queryKey: ['notifications', 'recent'],
    queryFn: () => notifications.getRecent(10),
    refetchInterval: 30000 // Refresh every 30s
  });

  const unreadCount = recent.filter(n => !n.isRead).length;

  const markReadMutation = useMutation({
    mutationFn: (id: number) => notifications.markAsRead(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['notifications'] })
  });

  const markAllReadMutation = useMutation({
    mutationFn: () => notifications.markAllAsRead(),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['notifications'] })
  });

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const getIcon = (type: string) => {
    switch (type) {
      case 'appointment_reminder': return <Clock size={16} className="text-blue-500" />;
      case 'hep_reminder': return <CheckCircle2 size={16} className="text-emerald-500" />;
      case 'follow_up_due': return <AlertCircle size={16} className="text-amber-500" />;
      case 'progress_report': return <MessageSquare size={16} className="text-indigo-500" />;
      default: return <Bell size={16} className="text-primary/40" />;
    }
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-3 bg-white border border-primary/5 rounded-2xl hover:bg-primary/5 transition-all shadow-sm group"
      >
        <Bell size={20} className="text-primary group-hover:rotate-12 transition-transform duration-500" />
        {unreadCount > 0 && (
          <span className="absolute -top-1.5 -right-1.5 w-6 h-6 bg-accent text-white text-[10px] font-black rounded-full flex items-center justify-center border-4 border-white shadow-lg">
            {unreadCount}
          </span>
        )}
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div 
            initial={{ opacity: 0, y: 20, scale: 0.95, filter: 'blur(10px)' }}
            animate={{ opacity: 1, y: 0, scale: 1, filter: 'blur(0px)' }}
            exit={{ opacity: 0, y: 20, scale: 0.95, filter: 'blur(10px)' }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="absolute right-0 mt-4 w-[400px] bg-white/80 backdrop-blur-2xl rounded-[2.5rem] border border-primary/5 shadow-[0_50px_100px_rgba(0,0,0,0.1)] z-[100] overflow-hidden"
          >
            <div className="p-8 border-b border-primary/5 flex items-center justify-between bg-white/50">
              <div>
                <h3 className="text-xs font-black text-primary uppercase tracking-[0.3em]">Intelligence Feed</h3>
                <p className="text-[9px] font-black text-primary/20 uppercase tracking-[0.2em] mt-1">Operational Alerts</p>
              </div>
              {unreadCount > 0 && (
                <button 
                  onClick={() => markAllReadMutation.mutate()}
                  className="px-4 py-2 bg-primary/5 hover:bg-primary hover:text-white rounded-full text-[9px] font-black text-primary/40 uppercase tracking-[0.2em] transition-all"
                >
                  Clear All
                </button>
              )}
            </div>

            <div className="max-h-[450px] overflow-y-auto custom-scrollbar bg-white/30">
              {recent.length > 0 ? (
                <div className="divide-y divide-primary/5">
                  {recent.map((n, i) => (
                    <motion.div 
                      key={n.id}
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.05 }}
                      onClick={() => !n.isRead && markReadMutation.mutate(n.id!)}
                      className={`p-8 hover:bg-white/60 transition-all cursor-pointer relative group ${!n.isRead ? 'bg-accent/[0.02]' : ''}`}
                    >
                      {!n.isRead && (
                        <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-accent" />
                      )}
                      <div className="flex gap-6">
                        <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 shadow-sm group-hover:scale-110 transition-transform duration-500 ${
                          n.type === 'appointment_reminder' ? 'bg-blue-50 text-blue-500' :
                          n.type === 'hep_reminder' ? 'bg-emerald-50 text-emerald-500' :
                          n.type === 'follow_up_due' ? 'bg-amber-50 text-amber-500' :
                          'bg-indigo-50 text-indigo-500'
                        }`}>
                          {getIcon(n.type)}
                        </div>
                        <div className="flex-1 min-w-0 space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="text-[9px] font-black text-primary/20 uppercase tracking-[0.2em]">{n.type.replace('_', ' ')}</span>
                            <span className="text-[9px] font-black text-primary/20 uppercase tracking-[0.2em]">{formatDistanceToNow(n.scheduledAt)} ago</span>
                          </div>
                          <p className={`text-sm leading-relaxed tracking-tight ${!n.isRead ? 'font-bold text-primary' : 'text-primary/60'}`}>
                            {n.message}
                          </p>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              ) : (
                <div className="p-20 text-center space-y-6">
                  <div className="w-20 h-20 rounded-[2rem] bg-primary/5 mx-auto flex items-center justify-center text-primary/5 border border-primary/5">
                    <Bell size={32} />
                  </div>
                  <p className="text-[10px] font-black text-primary/20 uppercase tracking-[0.3em]">No active intelligence</p>
                </div>
              )}
            </div>

            <div className="p-6 bg-white/50 border-t border-primary/5">
              <Link 
                to="/notifications" 
                onClick={() => setIsOpen(false)}
                className="flex items-center justify-center gap-3 w-full py-4 bg-primary text-white rounded-2xl text-[9px] font-black uppercase tracking-[0.3em] hover:scale-[1.02] active:scale-[0.98] transition-all shadow-xl shadow-primary/20"
              >
                Nexus Dashboard
              </Link>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
