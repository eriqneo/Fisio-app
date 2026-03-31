import React, { useState } from 'react';
import { 
  Plus, 
  Search, 
  Package, 
  MoreVertical, 
  Edit2, 
  Trash2, 
  Tag,
  DollarSign,
  Layers,
  CheckCircle2,
  XCircle,
  ArrowUpRight,
  ChevronRight,
  ChevronLeft,
  Info,
  Upload,
  FileSpreadsheet,
  Download
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn, formatCurrency } from '@/lib/utils';
import { useTenantDb } from '@/hooks/useTenantDb';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { BillingItem } from '@/types';
import { toast } from 'sonner';
import ConfirmationModal from '@/components/ui/ConfirmationModal';

interface BillingItemManagerProps {
  searchQuery: string;
  isCreateModalOpen?: boolean;
  setIsCreateModalOpen?: (open: boolean) => void;
}

export default function BillingItemManager({ searchQuery, isCreateModalOpen, setIsCreateModalOpen }: BillingItemManagerProps) {
  const { billing } = useTenantDb();
  const queryClient = useQueryClient();
  const [isInternalModalOpen, setIsInternalModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<BillingItem | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 6; // 2 rows of 3 items
  const [isBulkModalOpen, setIsBulkModalOpen] = useState(false);
  const [bulkFile, setBulkFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    itemId: number | null;
    itemName: string;
  }>({
    isOpen: false,
    itemId: null,
    itemName: ''
  });

  const isModalOpen = isCreateModalOpen !== undefined ? isCreateModalOpen : isInternalModalOpen;
  const setModalOpen = setIsCreateModalOpen !== undefined ? setIsCreateModalOpen : setIsInternalModalOpen;

  const closeModal = () => {
    setModalOpen(false);
    setEditingItem(null);
  };

  const { data: items = [], isLoading } = useQuery({
    queryKey: ['billing-items'],
    queryFn: () => billing.items.list()
  });

  const createMutation = useMutation({
    mutationFn: (data: Partial<BillingItem>) => billing.items.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['billing-items'] });
      toast.success('Billing item created successfully');
      closeModal();
    }
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<BillingItem> }) => billing.items.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['billing-items'] });
      toast.success('Billing item updated successfully');
      closeModal();
    }
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => billing.items.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['billing-items'] });
      toast.success('Billing item deleted successfully');
    }
  });

  const filteredItems = items.filter(item => 
    item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    item.category?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const totalPages = Math.ceil(filteredItems.length / itemsPerPage);
  const paginatedItems = filteredItems.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const handleBulkUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!bulkFile) return;

    setIsUploading(true);
    try {
      const text = await bulkFile.text();
      const lines = text.split('\n');
      const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
      
      const newItems: Partial<BillingItem>[] = [];
      
      for (let i = 1; i < lines.length; i++) {
        if (!lines[i].trim()) continue;
        const values = lines[i].split(',').map(v => v.trim());
        const item: any = {};
        
        headers.forEach((header, index) => {
          if (header === 'name') item.name = values[index];
          if (header === 'price') item.price = parseFloat(values[index]);
          if (header === 'category') item.category = values[index] as any;
          if (header === 'description') item.description = values[index];
          if (header === 'currency') item.currency = values[index];
        });

        if (item.name && !isNaN(item.price)) {
          newItems.push({
            ...item,
            currency: item.currency || 'BWP',
            category: item.category || 'Service',
            isDeleted: false
          });
        }
      }

      for (const item of newItems) {
        await billing.items.create(item);
      }

      queryClient.invalidateQueries({ queryKey: ['billing-items'] });
      toast.success(`Successfully uploaded ${newItems.length} items`);
      setIsBulkModalOpen(false);
      setBulkFile(null);
    } catch (error) {
      console.error('Bulk upload failed:', error);
      toast.error('Failed to parse CSV file. Please ensure it follows the template.');
    } finally {
      setIsUploading(false);
    }
  };

  const downloadTemplate = () => {
    const csvContent = "name,price,category,currency,description\nInitial Consultation,450,Service,BWP,Standard initial assessment\nFollow-up Session,350,Service,BWP,Standard treatment session";
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'service_catalog_template.csv';
    link.click();
  };

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const data = {
      name: formData.get('name') as string,
      description: formData.get('description') as string,
      price: parseFloat(formData.get('price') as string),
      currency: formData.get('currency') as string,
      category: formData.get('category') as any,
      isDeleted: formData.get('isActive') !== 'on'
    };

    if (editingItem) {
      updateMutation.mutate({ id: editingItem.id!, data });
    } else {
      createMutation.mutate(data);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="relative">
          <div className="w-16 h-16 border-4 border-primary/5 rounded-full" />
          <div className="w-16 h-16 border-4 border-accent border-t-transparent rounded-full animate-spin absolute top-0 left-0" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-10">
      {/* List Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-primary/5 rounded-2xl text-primary">
            <Package size={20} />
          </div>
          <div>
            <h2 className="text-xl font-bold text-primary tracking-tight">Service Catalog</h2>
            <p className="text-primary/40 text-[10px] font-black uppercase tracking-widest mt-0.5">
              {filteredItems.length} Active Offerings
            </p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <button 
            onClick={downloadTemplate}
            className="flex items-center gap-2 px-6 py-3 bg-white text-primary border border-primary/5 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-surface-muted transition-all shadow-sm group"
          >
            <Download size={16} className="group-hover:translate-y-0.5 transition-transform" />
            <span>Template</span>
          </button>
          <button 
            onClick={() => setIsBulkModalOpen(true)}
            className="flex items-center gap-2 px-6 py-3 bg-white text-primary border border-primary/5 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-surface-muted transition-all shadow-sm group"
          >
            <Upload size={16} className="group-hover:-translate-y-0.5 transition-transform" />
            <span>Bulk Upload</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        <AnimatePresence mode="popLayout">
          {paginatedItems.map((item, i) => (
            <motion.div 
              key={item.id}
              layout
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              transition={{ delay: i * 0.05 }}
              className="group bg-surface-muted/30 border border-primary/5 rounded-[2.5rem] p-8 hover:bg-white hover:shadow-[0_30px_60px_rgba(0,0,0,0.05)] transition-all duration-500 relative overflow-hidden"
            >
              {/* Status Indicator */}
              <div className="absolute top-8 right-8">
                <span className={cn(
                  "text-[8px] font-black px-3 py-1 rounded-full uppercase tracking-[0.2em] border",
                  !item.isDeleted ? "text-emerald-600 bg-emerald-500/10 border-emerald-500/20" : "text-slate-400 bg-slate-500/10 border-slate-500/20"
                )}>
                  {!item.isDeleted ? 'Available' : 'Inactive'}
                </span>
              </div>

              <div className="flex flex-col h-full">
                <div className="flex items-start gap-5 mb-8">
                  <div className="p-5 bg-white rounded-2xl text-accent shadow-sm group-hover:scale-110 group-hover:rotate-3 transition-all duration-500 border border-primary/5">
                    <Package size={28} />
                  </div>
                  <div className="flex-1 min-w-0 pt-1">
                    <h3 className="text-lg font-bold text-primary truncate leading-tight mb-1">{item.name}</h3>
                    <p className="text-[10px] text-primary/30 font-black uppercase tracking-[0.2em]">{item.category || 'Uncategorized'}</p>
                  </div>
                </div>

                <div className="mt-auto space-y-6">
                  <div className="flex items-end justify-between">
                    <div>
                      <p className="text-[10px] text-primary/30 font-black uppercase tracking-widest mb-1.5">Standard Rate</p>
                      <p className="text-3xl font-bold text-primary tracking-tighter">{formatCurrency(item.price, item.currency)}</p>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <button 
                        onClick={() => {
                          setEditingItem(item);
                          setModalOpen(true);
                        }}
                        className="p-3 bg-white border border-primary/5 rounded-xl text-primary/30 hover:text-accent hover:border-accent/20 transition-all shadow-sm hover:scale-110"
                        title="Edit Item"
                      >
                        <Edit2 size={16} />
                      </button>
                      <button 
                        onClick={() => {
                          setConfirmModal({
                            isOpen: true,
                            itemId: item.id!,
                            itemName: item.name
                          });
                        }}
                        className="p-3 bg-white border border-primary/5 rounded-xl text-primary/30 hover:text-rose-500 hover:border-rose-500/20 transition-all shadow-sm hover:scale-110"
                        title="Delete Item"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>

                  {item.description && (
                    <div className="pt-6 border-t border-primary/5">
                      <div className="flex gap-2">
                        <Info size={14} className="text-primary/20 shrink-0 mt-0.5" />
                        <p className="text-xs text-primary/50 leading-relaxed italic line-clamp-2">
                          {item.description}
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>

        {filteredItems.length === 0 && (
          <div className="col-span-full flex flex-col items-center justify-center py-32 text-center">
            <div className="w-24 h-24 bg-primary/5 rounded-[2.5rem] flex items-center justify-center text-primary/10 mb-8">
              <Package size={48} />
            </div>
            <p className="text-sm font-black text-primary/20 uppercase tracking-[0.3em]">No Catalog Items Found</p>
          </div>
        )}
      </div>

      {/* Pagination: Premium Style */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between px-10 py-6 bg-surface-muted/30 rounded-[2.5rem] border border-primary/5">
          <p className="text-[10px] font-black text-primary/30 uppercase tracking-[0.2em]">
            Showing {((currentPage - 1) * itemsPerPage) + 1} — {Math.min(currentPage * itemsPerPage, filteredItems.length)} of {filteredItems.length} Offerings
          </p>
          <div className="flex items-center gap-4">
            <button
              onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
              disabled={currentPage === 1}
              className="p-3 bg-white border border-primary/5 rounded-xl text-primary/40 hover:text-primary transition-all disabled:opacity-30 disabled:hover:scale-100 hover:scale-110 shadow-sm"
            >
              <ChevronLeft size={20} />
            </button>
            <div className="flex items-center gap-2">
              {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                <button
                  key={page}
                  onClick={() => setCurrentPage(page)}
                  className={cn(
                    "w-10 h-10 flex items-center justify-center rounded-xl text-[10px] font-black transition-all duration-500",
                    currentPage === page 
                      ? "bg-primary text-white shadow-xl shadow-primary/20 scale-110" 
                      : "text-primary/30 hover:bg-white hover:text-primary border border-transparent hover:border-primary/5"
                  )}
                >
                  {page}
                </button>
              ))}
            </div>
            <button
              onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
              disabled={currentPage === totalPages}
              className="p-3 bg-white border border-primary/5 rounded-xl text-primary/40 hover:text-primary transition-all disabled:opacity-30 disabled:hover:scale-100 hover:scale-110 shadow-sm"
            >
              <ChevronRight size={20} />
            </button>
          </div>
        </div>
      )}

      {/* Bulk Upload Modal */}
      <AnimatePresence>
        {isBulkModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsBulkModalOpen(false)}
              className="absolute inset-0 bg-primary/40 backdrop-blur-md"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-white w-full max-w-lg rounded-[3rem] shadow-[0_50px_100px_rgba(0,0,0,0.2)] overflow-hidden relative z-10"
            >
              <div className="p-10 border-b border-primary/5 flex items-center justify-between bg-surface-muted/30">
                <div>
                  <h2 className="text-3xl font-serif text-primary tracking-tight">Bulk Import</h2>
                  <p className="text-primary/30 text-[10px] mt-1.5 uppercase font-black tracking-[0.2em]">Service Catalog Expansion</p>
                </div>
                <button 
                  onClick={() => setIsBulkModalOpen(false)}
                  className="p-4 hover:bg-white rounded-2xl transition-all text-primary/20 hover:text-primary hover:rotate-90"
                >
                  <XCircle size={28} />
                </button>
              </div>

              <form onSubmit={handleBulkUpload} className="p-10 space-y-8">
                <div className="space-y-6">
                  <div className="p-10 border-2 border-dashed border-primary/10 rounded-[2.5rem] bg-surface-muted/30 text-center group hover:border-accent/30 transition-all">
                    <input 
                      type="file" 
                      accept=".csv"
                      onChange={(e) => setBulkFile(e.target.files?.[0] || null)}
                      className="hidden" 
                      id="bulk-file"
                    />
                    <label htmlFor="bulk-file" className="cursor-pointer block">
                      <div className="w-20 h-20 bg-white rounded-[2rem] flex items-center justify-center text-primary/20 mx-auto mb-6 shadow-sm group-hover:scale-110 group-hover:rotate-3 transition-all duration-500">
                        <FileSpreadsheet size={40} />
                      </div>
                      <p className="text-sm font-bold text-primary mb-2">
                        {bulkFile ? bulkFile.name : 'Select CSV Data File'}
                      </p>
                      <p className="text-[10px] text-primary/30 font-black uppercase tracking-widest">
                        Drag & drop or click to browse
                      </p>
                    </label>
                  </div>

                  <div className="bg-accent/5 p-6 rounded-[2rem] border border-accent/10">
                    <div className="flex gap-4">
                      <Info size={18} className="text-accent shrink-0" />
                      <div className="space-y-2">
                        <p className="text-[10px] font-black text-accent uppercase tracking-widest">Import Requirements</p>
                        <p className="text-xs text-primary/60 leading-relaxed">
                          Ensure your CSV includes headers: <code className="bg-white px-1.5 py-0.5 rounded border border-accent/10 font-bold">name, price, category, currency, description</code>.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex gap-4 pt-6">
                  <button 
                    type="button"
                    onClick={() => setIsBulkModalOpen(false)}
                    className="flex-1 px-8 py-5 bg-surface-muted text-primary/40 rounded-[1.5rem] font-black text-[10px] uppercase tracking-[0.2em] hover:bg-primary/5 hover:text-primary transition-all"
                  >
                    Cancel
                  </button>
                  <button 
                    type="submit"
                    disabled={!bulkFile || isUploading}
                    className="flex-2 px-8 py-5 bg-primary text-white rounded-[1.5rem] font-black text-[10px] uppercase tracking-[0.2em] hover:bg-accent transition-all shadow-2xl shadow-primary/20 disabled:opacity-50 group"
                  >
                    <span className="flex items-center justify-center gap-2">
                      {isUploading ? 'Processing...' : 'Execute Import'}
                      <ArrowUpRight size={16} className="group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
                    </span>
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Item Modal: Premium Redesign */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-[100] overflow-y-auto custom-scrollbar">
            <div className="min-h-screen px-6 py-12 flex items-center justify-center relative">
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={closeModal}
                className="fixed inset-0 bg-primary/40 backdrop-blur-md"
              />
              <motion.div 
                initial={{ opacity: 0, scale: 0.95, y: 40 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 40 }}
                transition={{ type: "spring", damping: 25, stiffness: 300 }}
                className="bg-white w-full max-w-2xl rounded-[4rem] shadow-[0_80px_160px_rgba(0,0,0,0.25)] overflow-hidden relative z-10 border border-white/20"
              >
                {/* Modal Header: Editorial Style */}
                <div className="relative p-12 pb-8 border-b border-primary/5 bg-surface-muted/30 overflow-hidden">
                  <div className="absolute top-0 right-0 w-64 h-64 bg-accent/5 rounded-full -mr-32 -mt-32 blur-3xl" />
                  
                  <div className="flex items-center justify-between relative z-10">
                    <div className="flex items-center gap-6">
                      <div className="w-16 h-16 bg-primary rounded-[2rem] flex items-center justify-center text-white shadow-2xl shadow-primary/20 -rotate-6">
                        <Tag size={28} />
                      </div>
                      <div>
                        <h2 className="text-4xl font-serif text-primary tracking-tight leading-none">
                          {editingItem ? 'Refine Service' : 'New Catalog Entry'}
                        </h2>
                        <p className="text-primary/30 text-[10px] mt-2 uppercase font-black tracking-[0.4em]">Service Architecture & Pricing</p>
                      </div>
                    </div>
                    <button 
                      onClick={closeModal}
                      className="w-12 h-12 flex items-center justify-center bg-white hover:bg-primary hover:text-white rounded-2xl transition-all duration-500 text-primary/20 shadow-sm group"
                    >
                      <XCircle size={24} className="group-hover:rotate-90 transition-transform duration-500" />
                    </button>
                  </div>
                </div>

                <form onSubmit={handleSubmit} className="p-12 space-y-10 relative z-10">
                  <div className="grid grid-cols-1 gap-10">
                    {/* Primary Identity */}
                    <div className="space-y-4">
                      <label className="text-[10px] font-black text-primary/30 uppercase tracking-[0.3em] ml-8">Service Designation</label>
                      <div className="relative group">
                        <div className="absolute left-8 top-1/2 -translate-y-1/2 text-primary/20 group-focus-within:text-accent transition-colors">
                          <Layers size={20} />
                        </div>
                        <input 
                          name="name"
                          defaultValue={editingItem?.name}
                          required
                          placeholder="e.g., Advanced Neuromuscular Rehabilitation"
                          className="w-full pl-20 pr-10 py-6 bg-surface-muted border-2 border-transparent rounded-[2.5rem] text-lg font-bold focus:ring-8 focus:ring-accent/5 focus:bg-white focus:border-accent/10 transition-all placeholder:text-primary/10 shadow-sm"
                        />
                      </div>
                    </div>

                    {/* Financials & Classification */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                      <div className="space-y-4">
                        <label className="text-[10px] font-black text-primary/30 uppercase tracking-[0.3em] ml-8">Financial Valuation</label>
                        <div className="flex gap-4">
                          <div className="relative group min-w-[120px]">
                            <select 
                              name="currency"
                              defaultValue={editingItem?.currency || 'BWP'}
                              className="w-full px-6 py-6 bg-surface-muted border-2 border-transparent rounded-[2rem] text-sm font-black focus:ring-8 focus:ring-accent/5 focus:bg-white focus:border-accent/10 transition-all appearance-none text-center shadow-sm"
                            >
                              <option value="BWP">BWP</option>
                              <option value="USD">USD</option>
                              <option value="EUR">EUR</option>
                              <option value="GBP">GBP</option>
                            </select>
                            <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-primary/20">
                              <ChevronRight size={14} className="rotate-90" />
                            </div>
                          </div>
                          <div className="relative group flex-1">
                            <div className="absolute left-6 top-1/2 -translate-y-1/2 text-primary/20 group-focus-within:text-accent transition-colors">
                              <DollarSign size={18} />
                            </div>
                            <input 
                              name="price"
                              type="number"
                              step="0.01"
                              defaultValue={editingItem?.price}
                              required
                              placeholder="0.00"
                              className="w-full pl-14 pr-8 py-6 bg-surface-muted border-2 border-transparent rounded-[2rem] text-lg font-black focus:ring-8 focus:ring-accent/5 focus:bg-white focus:border-accent/10 transition-all placeholder:text-primary/10 shadow-sm"
                            />
                          </div>
                        </div>
                      </div>

                      <div className="space-y-4">
                        <label className="text-[10px] font-black text-primary/30 uppercase tracking-[0.3em] ml-8">Classification</label>
                        <div className="relative group">
                          <div className="absolute left-8 top-1/2 -translate-y-1/2 text-primary/20 group-focus-within:text-accent transition-colors">
                            <Package size={20} />
                          </div>
                          <select 
                            name="category"
                            defaultValue={editingItem?.category}
                            className="w-full pl-20 pr-10 py-6 bg-surface-muted border-2 border-transparent rounded-[2rem] text-sm font-bold focus:ring-8 focus:ring-accent/5 focus:bg-white focus:border-accent/10 transition-all appearance-none shadow-sm"
                          >
                            <option value="Service">Clinical Service Offering</option>
                            <option value="Product">Physical Medical Product</option>
                            <option value="Other">Miscellaneous Entry</option>
                          </select>
                          <div className="absolute right-8 top-1/2 -translate-y-1/2 pointer-events-none text-primary/20">
                            <ChevronRight size={18} className="rotate-90" />
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Description */}
                    <div className="space-y-4">
                      <label className="text-[10px] font-black text-primary/30 uppercase tracking-[0.3em] ml-8">Service Narrative</label>
                      <div className="relative group">
                        <div className="absolute left-8 top-8 text-primary/20 group-focus-within:text-accent transition-colors">
                          <Info size={20} />
                        </div>
                        <textarea 
                          name="description"
                          defaultValue={editingItem?.description}
                          rows={4}
                          placeholder="Provide a comprehensive clinical overview of this service..."
                          className="w-full pl-20 pr-10 py-8 bg-surface-muted border-2 border-transparent rounded-[2.5rem] text-base font-medium focus:ring-8 focus:ring-accent/5 focus:bg-white focus:border-accent/10 transition-all resize-none placeholder:text-primary/10 leading-relaxed shadow-sm"
                        />
                      </div>
                    </div>

                    {/* Availability Toggle */}
                    <div className="p-8 bg-surface-muted/50 rounded-[2.5rem] border border-primary/5 flex items-center justify-between group hover:bg-white hover:shadow-xl hover:shadow-primary/5 transition-all duration-500">
                      <div className="flex items-center gap-6">
                        <div className={cn(
                          "w-12 h-12 rounded-2xl flex items-center justify-center transition-all duration-500 shadow-sm",
                          editingItem && editingItem.isDeleted ? "bg-slate-100 text-slate-400" : "bg-emerald-500 text-white shadow-emerald-500/20"
                        )}>
                          <CheckCircle2 size={24} />
                        </div>
                        <div>
                          <p className="text-sm font-bold text-primary">Active Availability</p>
                          <p className="text-[10px] text-primary/30 font-black uppercase tracking-widest mt-0.5">Visible for clinical billing</p>
                        </div>
                      </div>
                      <div className="relative inline-flex items-center cursor-pointer">
                        <input 
                          type="checkbox" 
                          name="isActive"
                          id="isActive"
                          defaultChecked={editingItem ? !editingItem.isDeleted : true}
                          className="sr-only peer"
                        />
                        <div className="w-14 h-8 bg-primary/10 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[4px] after:left-[4px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-6 after:w-6 after:transition-all peer-checked:bg-emerald-500 shadow-inner" />
                      </div>
                    </div>
                  </div>

                  {/* Action Footer */}
                  <div className="flex gap-6 pt-10 border-t border-primary/5">
                    <button 
                      type="button"
                      onClick={closeModal}
                      className="flex-1 px-10 py-6 bg-surface-muted text-primary/40 rounded-[2rem] font-black text-[11px] uppercase tracking-[0.3em] hover:bg-primary/5 hover:text-primary transition-all duration-500"
                    >
                      Discard Changes
                    </button>
                    <button 
                      type="submit"
                      disabled={createMutation.isPending || updateMutation.isPending}
                      className="flex-[1.5] px-10 py-6 bg-primary text-white rounded-[2rem] font-black text-[11px] uppercase tracking-[0.3em] hover:bg-accent transition-all duration-500 shadow-2xl shadow-primary/20 disabled:opacity-50 group relative overflow-hidden"
                    >
                      <div className="absolute inset-0 bg-white/10 translate-y-full group-hover:translate-y-0 transition-transform duration-500" />
                      <span className="flex items-center justify-center gap-3 relative z-10">
                        {editingItem ? 'Commit Evolution' : 'Establish Catalog Entry'}
                        <ArrowUpRight size={18} className="group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform duration-500" />
                      </span>
                    </button>
                  </div>
                </form>
              </motion.div>
            </div>
          </div>
        )}
      </AnimatePresence>

      <ConfirmationModal
        isOpen={confirmModal.isOpen}
        onClose={() => setConfirmModal({ isOpen: false, itemId: null, itemName: '' })}
        onConfirm={() => {
          if (confirmModal.itemId) {
            deleteMutation.mutate(confirmModal.itemId);
            setConfirmModal({ isOpen: false, itemId: null, itemName: '' });
          }
        }}
        title="Delete Catalog Item"
        description={`Are you sure you want to permanently remove ${confirmModal.itemName} from the service catalog? This will not affect existing invoices.`}
        variant="danger"
        confirmText="Delete Item"
      />
    </div>
  );
}
