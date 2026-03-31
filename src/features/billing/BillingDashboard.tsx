import React, { useState, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  Plus, 
  Search, 
  FileText, 
  Receipt as ReceiptIcon, 
  Filter,
  Download,
  MoreVertical,
  ChevronRight,
  Package,
  ArrowUpRight,
  ArrowDownLeft,
  Clock,
  CheckCircle2,
  AlertCircle,
  TrendingUp,
  CreditCard,
  Wallet,
  Activity
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { useTenantDb } from '@/hooks/useTenantDb';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import { Invoice, Receipt, BillingItem } from '@/types';
import { formatCurrency } from '@/lib/utils';

// Sub-components will be defined here or imported
import InvoiceList from './InvoiceList';
import ReceiptList from './ReceiptList';
import BillingItemManager from './BillingItemManager';
import CreateInvoiceModal from './CreateInvoiceModal';
import CreateReceiptModal from './CreateReceiptModal';

export default function BillingDashboard() {
  const { type = 'invoices' } = useParams<{ type: string }>();
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  const tabs = [
    { id: 'invoices', label: 'Invoices', icon: FileText, description: 'Manage patient billing' },
    { id: 'receipts', label: 'Receipts', icon: ReceiptIcon, description: 'Track payment history' },
    { id: 'items', label: 'Catalog', icon: Package, description: 'Service & item pricing' },
  ];

  return (
    <div className="max-w-[1600px] mx-auto px-8 py-12 space-y-16 min-h-screen pb-32 bg-[#F8F9FA] relative overflow-hidden">
      {/* Background Accents */}
      <div className="absolute top-0 right-0 w-[800px] h-[800px] bg-primary/[0.02] rounded-full -mr-96 -mt-96 blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-[600px] h-[600px] bg-accent/[0.02] rounded-full -ml-72 -mb-72 blur-3xl pointer-events-none" />

      {/* Header Section: Editorial Style */}
      <header className="flex flex-col lg:flex-row lg:items-end justify-between gap-12 relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-2xl"
        >
          <div className="flex items-center gap-4 mb-8">
            <div className="w-16 h-16 rounded-[2rem] bg-primary text-white flex items-center justify-center shadow-2xl shadow-primary/30 -rotate-6 transition-transform hover:rotate-0 duration-500 cursor-pointer">
              <Wallet size={32} />
            </div>
            <div className="h-px w-16 bg-primary/10" />
            <div className="flex flex-col">
              <span className="text-[10px] font-black uppercase tracking-[0.5em] text-primary/40 leading-none">Financial Operations</span>
              <span className="text-[9px] font-bold uppercase tracking-[0.2em] text-accent mt-1">MedFlow Clinical Suite</span>
            </div>
          </div>
          
          <h1 className="text-7xl font-serif text-primary tracking-tighter leading-[0.85] mb-8">
            Revenue <br />
            <span className="text-accent italic font-light">& Billing Control</span>
          </h1>
          
          <p className="text-primary/60 text-xl font-light leading-relaxed max-w-lg border-l-2 border-primary/5 pl-8 py-2">
            A sophisticated financial ecosystem designed for clinical precision. Manage patient invoicing, track revenue streams, and automate receipting with world-class efficiency.
          </p>
        </motion.div>
        
        <div className="flex items-center gap-6">
          <div className="hidden xl:flex flex-col items-end gap-1 px-6 border-r border-primary/5">
            <span className="text-[10px] font-black text-primary/20 uppercase tracking-widest">System Status</span>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-xs font-bold text-primary/60">Financial Engine Active</span>
            </div>
          </div>
          <button 
            onClick={() => setIsCreateModalOpen(true)}
            className="flex items-center gap-4 px-10 py-5 bg-primary text-white rounded-[2.5rem] font-black text-[11px] uppercase tracking-[0.25em] hover:bg-accent transition-all shadow-[0_25px_60px_rgba(0,0,0,0.2)] hover:shadow-accent/40 hover:scale-[1.05] active:scale-[0.95] group relative overflow-hidden"
          >
            <div className="absolute inset-0 bg-white/10 translate-y-full group-hover:translate-y-0 transition-transform duration-500" />
            <Plus size={20} className="group-hover:rotate-180 transition-transform duration-700 relative z-10" />
            <span className="relative z-10">Create {type === 'items' ? 'Catalog Item' : type === 'invoices' ? 'New Invoice' : 'Payment Receipt'}</span>
          </button>
        </div>
      </header>

      {/* Stats Overview: Refined Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-10 relative z-10">
        {[
          { 
            label: 'Total Revenue', 
            value: 42500, 
            trend: '+12.5%', 
            icon: TrendingUp, 
            color: 'text-emerald-500', 
            bg: 'bg-emerald-500/10',
            isCurrency: true,
            description: 'Monthly growth'
          },
          { 
            label: 'Outstanding', 
            value: 3240.50, 
            trend: '8 Overdue', 
            icon: Clock, 
            color: 'text-orange-500', 
            bg: 'bg-orange-500/10',
            isCurrency: true,
            description: 'Action required'
          },
          { 
            label: 'Collection Rate', 
            value: 94.8, 
            trend: '95% Paid', 
            icon: Activity, 
            color: 'text-blue-500', 
            bg: 'bg-blue-500/10',
            isCurrency: false,
            suffix: '%',
            description: 'Efficiency metric'
          }
        ].map((stat, i) => (
          <motion.div 
            key={stat.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
            className="bg-white p-12 rounded-[3rem] border border-primary/5 shadow-[0_10px_40px_rgba(0,0,0,0.02)] group hover:shadow-[0_40px_80px_rgba(0,0,0,0.08)] transition-all duration-700 cursor-default relative overflow-hidden"
          >
            <div className="absolute top-0 right-0 w-32 h-32 bg-primary/[0.01] rounded-full -mr-16 -mt-16 transition-transform group-hover:scale-150 duration-700" />
            
            <div className="flex items-center justify-between mb-10 relative z-10">
              <div className={cn("p-5 rounded-2xl transition-all duration-700 group-hover:rotate-12 group-hover:scale-110 shadow-sm", stat.bg, stat.color)}>
                <stat.icon size={28} />
              </div>
              <div className="flex flex-col items-end">
                <span className={cn("text-[10px] font-black px-4 py-2 rounded-full uppercase tracking-widest shadow-sm", stat.bg, stat.color)}>
                  {stat.trend}
                </span>
                <span className="text-[9px] font-bold text-primary/20 uppercase tracking-widest mt-2">{stat.description}</span>
              </div>
            </div>
            
            <p className="text-primary/30 text-[10px] font-black uppercase tracking-[0.4em] mb-3">{stat.label}</p>
            <h3 className="text-5xl font-bold text-primary tracking-tighter leading-none group-hover:text-accent transition-colors duration-500">
              {stat.isCurrency ? formatCurrency(stat.value) : `${stat.value}${stat.suffix || ''}`}
            </h3>
          </motion.div>
        ))}
      </div>

      {/* Main Content Area */}
      <div className="space-y-12 relative z-10">
        {/* Navigation Tabs & Search */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-10 px-4">
          <div className="flex bg-white p-2 rounded-[2.5rem] border border-primary/5 shadow-2xl shadow-primary/5 backdrop-blur-sm">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => navigate(`/billing/${tab.id}`)}
                className={cn(
                  "flex items-center gap-4 px-10 py-4.5 rounded-[2rem] text-[11px] font-black uppercase tracking-[0.25em] transition-all duration-700 relative group",
                  type === tab.id 
                    ? "bg-primary text-white shadow-2xl shadow-primary/30 scale-[1.05]" 
                    : "text-primary/30 hover:text-primary/60 hover:bg-primary/5"
                )}
              >
                <tab.icon size={18} className={cn("transition-transform duration-500", type === tab.id ? "scale-110" : "group-hover:scale-110")} />
                <span>{tab.label}</span>
                {type === tab.id && (
                  <motion.div 
                    layoutId="activeTab"
                    className="absolute inset-0 bg-primary rounded-[2rem] -z-10"
                    transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                  />
                )}
              </button>
            ))}
          </div>

          <div className="relative group max-w-lg w-full">
            <div className="absolute inset-0 bg-accent/5 rounded-[2.5rem] blur-2xl opacity-0 group-focus-within:opacity-100 transition-opacity duration-700" />
            <Search className="absolute left-8 top-1/2 -translate-y-1/2 text-primary/20 group-focus-within:text-accent transition-all duration-500 group-focus-within:scale-110" size={20} />
            <input 
              type="text" 
              placeholder={`Search through ${type}...`}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-16 pr-10 py-5 bg-white border border-primary/5 rounded-[2.5rem] text-base font-medium focus:outline-none focus:ring-8 focus:ring-accent/5 focus:border-accent transition-all shadow-2xl shadow-primary/5 placeholder:text-primary/10 relative z-10"
            />
            <div className="absolute right-8 top-1/2 -translate-y-1/2 flex items-center gap-2 pointer-events-none opacity-40">
              <span className="text-[10px] font-black text-primary/40 uppercase tracking-widest">Filter</span>
              <Filter size={14} className="text-primary/40" />
            </div>
          </div>
        </div>

        {/* Dynamic Content: Wrapped in Premium Container */}
        <motion.div 
          key={type}
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.7, ease: [0.23, 1, 0.32, 1] }}
          className="bg-white rounded-[4rem] border border-primary/5 shadow-[0_40px_100px_rgba(0,0,0,0.04)] overflow-hidden relative"
        >
          <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-primary via-accent to-primary opacity-10" />
          <div className="p-12 md:p-16">
            {type === 'invoices' && <InvoiceList searchQuery={searchQuery} />}
            {type === 'receipts' && <ReceiptList searchQuery={searchQuery} />}
            {type === 'items' && (
              <BillingItemManager 
                searchQuery={searchQuery} 
                isCreateModalOpen={isCreateModalOpen}
                setIsCreateModalOpen={setIsCreateModalOpen}
              />
            )}
          </div>
        </motion.div>
      </div>

      {/* Creation Modals */}
      {type === 'invoices' && (
        <CreateInvoiceModal 
          isOpen={isCreateModalOpen} 
          onClose={() => setIsCreateModalOpen(false)} 
        />
      )}
      {type === 'receipts' && (
        <CreateReceiptModal 
          isOpen={isCreateModalOpen} 
          onClose={() => setIsCreateModalOpen(false)} 
        />
      )}
    </div>
  );
}
