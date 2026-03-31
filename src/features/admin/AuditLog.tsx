import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { 
  Search, 
  Filter, 
  Clock, 
  User, 
  Database,
  ArrowRight,
  Shield,
  Activity,
  Calendar,
  Lock,
  Zap,
  ShieldCheck,
  FileText,
  ChevronRight,
  ChevronLeft,
  X
} from 'lucide-react';
import { useTenantDb } from '@/hooks/useTenantDb';
import { format } from 'date-fns';
import { motion, AnimatePresence } from 'framer-motion';

export default function AuditLog() {
  const { auditLogs } = useTenantDb();
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 7;

  const { data: logs } = useQuery({ 
    queryKey: ['admin', 'auditLogs'], 
    queryFn: () => auditLogs.listRecent(100) 
  });

  const [selectedLog, setSelectedLog] = useState<any>(null);

  const filteredLogs = logs?.filter(log => 
    log.userName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    log.action.toLowerCase().includes(searchTerm.toLowerCase()) ||
    log.entityType.toLowerCase().includes(searchTerm.toLowerCase()) ||
    log.details.toLowerCase().includes(searchTerm.toLowerCase())
  ) || [];

  const totalPages = Math.ceil(filteredLogs.length / itemsPerPage);
  const paginatedLogs = filteredLogs.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  const getActionColor = (action: string) => {
    switch (action) {
      case 'create': return 'text-emerald-500 bg-emerald-500/10';
      case 'update': return 'text-blue-500 bg-blue-500/10';
      case 'delete': return 'text-error bg-error/10';
      case 'login': return 'text-accent bg-accent/10';
      default: return 'text-primary/40 bg-primary/5';
    }
  };

  return (
    <div className="space-y-16">
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-12">
        <div className="space-y-6">
          <div className="flex items-center gap-3">
            <div className="px-3 py-1 bg-primary/5 text-primary/40 text-[8px] font-black uppercase tracking-[0.2em] rounded-full border border-primary/5">
              System Activity
            </div>
            <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-[8px] font-black text-emerald-600 uppercase tracking-widest">Activity Log Active</span>
          </div>
          <h1 className="text-7xl md:text-8xl font-serif text-primary tracking-tighter leading-none">
            Activity <span className="italic text-primary/20">Logs</span>
          </h1>
          <p className="text-primary/40 font-medium text-xl max-w-2xl leading-relaxed">
            A complete record of all system activities, 
            data changes, and security events within the clinical environment.
          </p>
        </div>
        <div className="flex items-center gap-4">
          <div className="px-6 py-4 bg-white border border-primary/5 rounded-2xl shadow-xl shadow-primary/5 flex items-center gap-4">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-500 flex items-center justify-center">
              <ShieldCheck size={20} />
            </div>
            <div>
              <p className="text-[10px] font-black text-primary/20 uppercase tracking-widest">Compliance Status</p>
              <p className="text-xs font-bold text-emerald-600 uppercase tracking-widest">Verified & Secure</p>
            </div>
          </div>
        </div>
      </header>

      <div className="flex flex-col md:flex-row gap-6">
        <div className="flex-1 relative group">
          <Search className="absolute left-8 top-1/2 -translate-y-1/2 text-primary/20 group-focus-within:text-accent transition-colors" size={24} />
          <input 
            type="text"
            placeholder="Search by actor, action, or entity..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-20 pr-8 py-7 bg-white border border-primary/5 rounded-[3rem] text-lg focus:ring-8 focus:ring-accent/5 transition-all shadow-[0_40px_100px_rgba(0,0,0,0.04)] placeholder:text-primary/10 outline-none"
          />
        </div>
        <button className="px-10 py-7 bg-white border border-primary/5 rounded-[3rem] text-primary/40 hover:text-primary transition-all shadow-[0_40px_100px_rgba(0,0,0,0.04)] flex items-center gap-3 font-black text-[10px] uppercase tracking-widest">
          <Filter size={18} />
          Filters
        </button>
      </div>

      <div className="bg-white rounded-[4rem] border border-primary/5 shadow-[0_40px_100px_rgba(0,0,0,0.04)] overflow-hidden">
        <div className="overflow-x-auto custom-scrollbar">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-surface-muted/30 border-b border-primary/5">
                <th className="px-12 py-8 text-[10px] font-black text-primary/20 uppercase tracking-[0.3em]">When</th>
                <th className="px-12 py-8 text-[10px] font-black text-primary/20 uppercase tracking-[0.3em]">Who</th>
                <th className="px-12 py-8 text-[10px] font-black text-primary/20 uppercase tracking-[0.3em]">What</th>
                <th className="px-12 py-8 text-[10px] font-black text-primary/20 uppercase tracking-[0.3em]">Where</th>
                <th className="px-12 py-8 text-[10px] font-black text-primary/20 uppercase tracking-[0.3em]">Description</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-primary/5">
              {paginatedLogs.map((log, i) => (
                <motion.tr 
                  key={log.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.01, duration: 0.5 }}
                  onClick={() => setSelectedLog(log)}
                  className="hover:bg-surface-muted/30 transition-all group cursor-pointer"
                >
                  <td className="px-12 py-8">
                    <div className="flex items-center gap-4 text-primary/40">
                      <div className="w-10 h-10 rounded-xl bg-primary/5 flex items-center justify-center text-primary/20 group-hover:bg-primary/10 group-hover:text-primary transition-all">
                        <Clock size={16} />
                      </div>
                      <div className="flex flex-col">
                        <span className="text-xs font-bold text-primary">{format(log.timestamp, 'MMM d, yyyy')}</span>
                        <span className="text-[10px] font-mono opacity-40">{format(log.timestamp, 'HH:mm:ss')}</span>
                      </div>
                    </div>
                  </td>
                  <td className="px-12 py-8">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-xl bg-primary/5 flex items-center justify-center text-primary font-serif text-lg group-hover:bg-primary group-hover:text-white transition-all duration-500">
                        {log.userName.charAt(0)}
                      </div>
                      <div className="flex flex-col">
                        <span className="text-sm font-bold text-primary">{log.userName}</span>
                        <span className="text-[9px] font-black text-accent uppercase tracking-widest">Authorized</span>
                      </div>
                    </div>
                  </td>
                  <td className="px-12 py-8">
                    <span className={`px-4 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest border ${
                      log.action === 'create' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' :
                      log.action === 'update' ? 'bg-blue-50 text-blue-600 border-blue-100' :
                      log.action === 'delete' ? 'bg-error/5 text-error border-error/10' :
                      'bg-primary/5 text-primary/40 border-primary/10'
                    }`}>
                      {log.action}
                    </span>
                  </td>
                  <td className="px-12 py-8">
                    <div className="flex items-center gap-3 text-primary/60">
                      <div className="w-8 h-8 rounded-lg bg-primary/5 flex items-center justify-center text-primary/30">
                        <Database size={14} />
                      </div>
                      <div className="flex flex-col">
                        <span className="text-xs font-bold uppercase tracking-widest">{log.entityType}</span>
                        {log.entityId && (
                          <span className="text-[9px] font-mono opacity-40">#{log.entityId}</span>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="px-12 py-8">
                    <div className="flex items-center justify-between gap-6">
                      <span className="text-sm text-primary/40 truncate max-w-md font-medium">{log.details}</span>
                      <div className="w-8 h-8 rounded-full bg-white shadow-sm flex items-center justify-center text-primary/20 opacity-0 group-hover:opacity-100 group-hover:translate-x-2 transition-all">
                        <ChevronRight size={16} />
                      </div>
                    </div>
                  </td>
                </motion.tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination Controls */}
        {totalPages > 1 && (
          <div className="px-12 py-8 border-t border-primary/5 flex items-center justify-between bg-surface-muted/10">
            <div className="text-[10px] font-black text-primary/20 uppercase tracking-widest">
              Showing {Math.min(filteredLogs.length, (currentPage - 1) * itemsPerPage + 1)} - {Math.min(filteredLogs.length, currentPage * itemsPerPage)} of {filteredLogs.length} Records
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                disabled={currentPage === 1}
                className="p-3 bg-white border border-primary/5 rounded-xl text-primary/20 hover:text-primary disabled:opacity-30 transition-all"
              >
                <ChevronLeft size={16} />
              </button>
              <div className="flex items-center gap-1">
                {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                  <button
                    key={page}
                    onClick={() => setCurrentPage(page)}
                    className={`w-10 h-10 rounded-xl text-[10px] font-black transition-all ${
                      currentPage === page 
                        ? 'bg-primary text-white shadow-xl shadow-primary/20' 
                        : 'bg-white border border-primary/5 text-primary/40 hover:border-primary/20'
                    }`}
                  >
                    {page}
                  </button>
                ))}
              </div>
              <button
                onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                disabled={currentPage === totalPages}
                className="p-3 bg-white border border-primary/5 rounded-xl text-primary/20 hover:text-primary disabled:opacity-30 transition-all"
              >
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        )}

        {!filteredLogs?.length && (
          <div className="p-32 text-center space-y-6">
            <div className="w-24 h-24 bg-primary/5 rounded-full flex items-center justify-center mx-auto text-primary/10">
              <Shield size={48} />
            </div>
            <div className="space-y-2">
              <p className="text-[10px] font-black text-primary/20 uppercase tracking-[0.3em]">No Audit Records Found</p>
              <p className="text-sm text-primary/30 font-medium">The system has not logged any events matching your criteria.</p>
            </div>
          </div>
        )}
      </div>

      {/* Detail Modal */}
      <AnimatePresence>
        {selectedLog && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-6 overflow-y-auto">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedLog(null)}
              className="fixed inset-0 bg-primary/60 backdrop-blur-xl"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 60, filter: 'blur(10px)' }}
              animate={{ opacity: 1, scale: 1, y: 0, filter: 'blur(0px)' }}
              exit={{ opacity: 0, scale: 0.9, y: 60, filter: 'blur(10px)' }}
              transition={{ type: 'spring', damping: 30, stiffness: 200 }}
              className="relative w-full max-w-2xl bg-white rounded-[4rem] shadow-[0_80px_160px_rgba(0,0,0,0.4)] overflow-hidden my-auto"
            >
              <div className="p-16 space-y-12">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-6">
                    <div className={`w-16 h-16 rounded-[2rem] flex items-center justify-center shadow-xl ${
                      selectedLog.action === 'create' ? 'bg-emerald-500 text-white' :
                      selectedLog.action === 'update' ? 'bg-blue-500 text-white' :
                      selectedLog.action === 'delete' ? 'bg-error text-white' :
                      'bg-primary text-white'
                    }`}>
                      <ShieldCheck size={32} />
                    </div>
                    <div>
                      <div className="flex items-center gap-3 mb-1">
                        <h3 className="text-3xl font-serif text-primary capitalize">{selectedLog.action} Record</h3>
                        <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                      </div>
                      <p className="text-[10px] font-black text-primary/30 uppercase tracking-[0.3em]">Log ID: {selectedLog.id}</p>
                    </div>
                  </div>
                  <button 
                    onClick={() => setSelectedLog(null)}
                    className="p-4 hover:bg-primary/5 rounded-2xl transition-all text-primary/20 hover:text-primary hover:rotate-90"
                  >
                    <X size={32} />
                  </button>
                </div>
 
                <div className="grid grid-cols-2 gap-10">
                  <div className="space-y-2">
                    <p className="text-[10px] font-black text-primary/20 uppercase tracking-[0.2em] ml-2">Time & Date</p>
                    <div className="p-6 bg-surface-muted/50 rounded-3xl border border-primary/5">
                      <p className="text-sm font-bold text-primary">{format(selectedLog.timestamp, 'MMMM d, yyyy')}</p>
                      <p className="text-[10px] font-mono opacity-40 mt-1">{format(selectedLog.timestamp, 'HH:mm:ss.SSS')}</p>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <p className="text-[10px] font-black text-primary/20 uppercase tracking-[0.2em] ml-2">Performed By</p>
                    <div className="p-6 bg-surface-muted/50 rounded-3xl border border-primary/5">
                      <p className="text-sm font-bold text-primary">{selectedLog.userName}</p>
                      <p className="text-[10px] font-black text-accent uppercase tracking-widest mt-1">Authorized Access</p>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <p className="text-[10px] font-black text-primary/20 uppercase tracking-[0.2em] ml-2">Resource Type</p>
                    <div className="p-6 bg-surface-muted/50 rounded-3xl border border-primary/5">
                      <p className="text-sm font-bold text-primary uppercase tracking-widest">{selectedLog.entityType}</p>
                      <p className="text-[10px] font-mono opacity-40 mt-1">Ref: #{selectedLog.entityId || 'SYSTEM'}</p>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <p className="text-[10px] font-black text-primary/20 uppercase tracking-[0.2em] ml-2">Activity</p>
                    <div className="p-6 bg-surface-muted/50 rounded-3xl border border-primary/5">
                      <p className="text-sm font-bold text-primary capitalize">{selectedLog.action}</p>
                      <p className="text-[10px] font-black text-primary/20 uppercase tracking-widest mt-1">Confirmed Change</p>
                    </div>
                  </div>
                </div>
 
                <div className="space-y-4">
                  <p className="text-[10px] font-black text-primary/20 uppercase tracking-[0.2em] ml-2">Activity Details</p>
                  <div className="p-10 bg-primary text-white/90 rounded-[3rem] text-sm leading-relaxed font-mono shadow-2xl shadow-primary/20 relative overflow-hidden group">
                    <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:opacity-10 transition-opacity">
                      <FileText size={120} />
                    </div>
                    <div className="relative z-10">
                      {selectedLog.details}
                    </div>
                  </div>
                </div>

                <button 
                  onClick={() => setSelectedLog(null)}
                  className="w-full py-6 bg-primary text-white rounded-[2.5rem] font-black text-[10px] uppercase tracking-[0.3em] hover:scale-[1.02] active:scale-[0.98] transition-all shadow-2xl shadow-primary/20"
                >
                  Close
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
