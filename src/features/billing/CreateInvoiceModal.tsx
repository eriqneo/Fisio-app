import React, { useState, useMemo, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { 
  XCircle, 
  Plus, 
  Trash2, 
  Search, 
  User, 
  Calendar as CalendarIcon,
  Package,
  DollarSign,
  Calculator,
  Activity,
  ArrowUpRight,
  ChevronRight,
  ChevronLeft,
  Info,
  Minus
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn, formatCurrency } from '@/lib/utils';
import { useTenantDb } from '@/hooks/useTenantDb';
import { useDoctorDb } from '@/hooks/useDoctorDb';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { BillingItem, Patient, Invoice, ICD10_DIAGNOSES } from '@/types';
import { toast } from 'sonner';

interface CreateInvoiceModalProps {
  isOpen: boolean;
  onClose: () => void;
  patientId?: number;
  appointmentId?: number;
  invoice?: Invoice;
}

function Icd10SearchInput({ 
  value, 
  onSelect 
}: { 
  value: string; 
  onSelect: (code: string) => void 
}) {
  const [search, setSearch] = useState('');
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="relative min-w-[240px]">
      <Activity className="absolute left-4 top-1/2 -translate-y-1/2 text-primary/20 w-3.5 h-3.5" />
      <input 
        type="text"
        value={isOpen ? search : value}
        onFocus={() => {
          setSearch(value);
          setIsOpen(true);
        }}
        onBlur={() => {
          setTimeout(() => setIsOpen(false), 200);
        }}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="Search ICD-10 Diagnosis..."
        className="w-full pl-10 pr-4 py-3 bg-white border border-primary/5 rounded-xl text-[11px] font-medium focus:ring-4 focus:ring-accent/5 focus:border-accent/20 transition-all placeholder:text-primary/20"
      />
      
      <AnimatePresence>
        {isOpen && search && (
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            className="absolute top-full left-0 right-0 mt-2 bg-white border border-primary/5 rounded-2xl shadow-[0_30px_60px_rgba(0,0,0,0.15)] z-[100] max-h-64 overflow-y-auto p-2 ring-1 ring-black/5"
          >
            {ICD10_DIAGNOSES.filter(d => 
              d.code.toLowerCase().includes(search.toLowerCase()) || 
              d.description.toLowerCase().includes(search.toLowerCase())
            ).slice(0, 10).map(d => (
              <button
                key={d.code}
                type="button"
                onMouseDown={(e) => {
                  e.preventDefault();
                  onSelect(`${d.code}: ${d.description}`);
                  setSearch('');
                  setIsOpen(false);
                }}
                className="w-full p-3 hover:bg-surface-muted rounded-xl transition-all text-left group"
              >
                <p className="text-[10px] font-black text-primary group-hover:text-accent uppercase tracking-widest">{d.code}</p>
                <p className="text-[11px] text-primary/40 truncate mt-0.5">{d.description}</p>
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default function CreateInvoiceModal({ isOpen, onClose, patientId: initialPatientId, appointmentId, invoice }: CreateInvoiceModalProps) {
  const { billing, patients, soapNotes } = useTenantDb();
  const { encounters } = useDoctorDb();
  const queryClient = useQueryClient();
  
  const [selectedPatientId, setSelectedPatientId] = useState<number | null>(initialPatientId || invoice?.patientId || null);
  const [selectedItems, setSelectedItems] = useState<{ item: BillingItem; quantity: number; icd10_2016_version?: string }[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 7;
  const [currency, setCurrency] = useState(invoice?.currency || 'BWP');
  const [itemSearch, setItemSearch] = useState('');
  const [dueDate, setDueDate] = useState(invoice ? new Date(invoice.dueDate).toISOString().split('T')[0] : new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]);

  const { data: patientsList = [] } = useQuery({
    queryKey: ['patients'],
    queryFn: () => patients.list()
  });

  const { data: billingItems = [] } = useQuery({
    queryKey: ['billing-items'],
    queryFn: () => billing.items.list()
  });

  useEffect(() => {
    if (invoice && billingItems.length > 0) {
      const items = invoice.items.map(invItem => {
        const billingItem = billingItems.find(bi => bi.id === invItem.itemId);
        return {
          item: billingItem || { 
            id: invItem.itemId, 
            name: invItem.name, 
            price: invItem.price, 
            category: 'Service', 
            tenantId: invoice.tenantId 
          } as BillingItem,
          quantity: invItem.quantity,
          icd10_2016_version: invItem.icd10_2016_version
        };
      });
      setSelectedItems(items);
    }
  }, [invoice, billingItems]);

  const { data: soapNote } = useQuery({
    queryKey: ['soapNote', appointmentId],
    queryFn: async () => {
      const notes = await soapNotes.list();
      return notes.find(n => n.appointmentId === appointmentId);
    },
    enabled: !!appointmentId
  });

  const { data: encounter } = useQuery({
    queryKey: ['encounter', appointmentId],
    queryFn: async () => {
      const list = await encounters.list();
      return list.find(e => e.appointmentId === appointmentId);
    },
    enabled: !!appointmentId
  });

  const defaultIcd10 = useMemo(() => {
    if (encounter?.icd10_2016_version) {
      return { version2016: encounter.icd10_2016_version };
    }
    if (!soapNote) return { version2016: '' };
    try {
      const assessment = JSON.parse(soapNote.assessment);
      return {
        version2016: soapNote.icd10_2016_version || assessment.icd10_2016_version || assessment.diagnosis?.code || ''
      };
    } catch (e) {
      return { version2016: '' };
    }
  }, [soapNote, encounter]);

  const filteredBillingItems = billingItems.filter(item => 
    !item.isDeleted && item.name.toLowerCase().includes(itemSearch.toLowerCase())
  );

  const subtotal = useMemo(() => 
    selectedItems.reduce((sum, { item, quantity }) => sum + (item.price * quantity), 0)
  , [selectedItems]);

  const totalPages = Math.ceil(selectedItems.length / itemsPerPage);
  const paginatedItems = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return selectedItems.slice(start, start + itemsPerPage);
  }, [selectedItems, currentPage]);

  useEffect(() => {
    if (currentPage > totalPages && totalPages > 0) {
      setCurrentPage(totalPages);
    }
  }, [totalPages, currentPage]);

  const tax = subtotal * 0.15;
  const total = subtotal + tax;

  const createMutation = useMutation({
    mutationFn: (data: Partial<Invoice>) => billing.invoices.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
      toast.success('Invoice created successfully');
      onClose();
    }
  });

  const updateMutation = useMutation({
    mutationFn: (data: Partial<Invoice>) => billing.invoices.update(invoice!.id!, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
      toast.success('Invoice updated successfully');
      onClose();
    }
  });

  const addItem = (item: BillingItem) => {
    if (selectedItems.length === 0 && item.currency) {
      setCurrency(item.currency);
    }
    setSelectedItems(prev => {
      const existing = prev.find(i => i.item.id === item.id);
      if (existing) {
        return prev.map(i => i.item.id === item.id ? { ...i, quantity: i.quantity + 1 } : i);
      }
      return [...prev, { item, quantity: 1, icd10_2016_version: defaultIcd10.version2016 }];
    });
    setItemSearch('');
  };

  const removeItem = (itemId: number) => {
    setSelectedItems(prev => prev.filter(i => i.item.id !== itemId));
  };

  const updateQuantity = (itemId: number, delta: number) => {
    setSelectedItems(prev => prev.map(i => {
      if (i.item.id === itemId) {
        const newQty = Math.max(1, i.quantity + delta);
        return { ...i, quantity: newQty };
      }
      return i;
    }));
  };

  const updateIcd10_2016 = (itemId: number, version: string) => {
    setSelectedItems(prev => prev.map(i => {
      if (i.item.id === itemId) {
        return { ...i, icd10_2016_version: version };
      }
      return i;
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPatientId) {
      toast.error('Please select a patient');
      return;
    }
    if (selectedItems.length === 0) {
      toast.error('Please add at least one item');
      return;
    }

    const invoiceData = {
      patientId: selectedPatientId,
      appointmentId: invoice?.appointmentId || appointmentId,
      invoiceNumber: invoice?.invoiceNumber || `INV-${Date.now().toString().slice(-6)}`,
      currency,
      items: selectedItems.map(({ item, quantity, icd10_2016_version }) => ({
        itemId: item.id!,
        name: item.name,
        quantity,
        price: item.price,
        total: item.price * quantity,
        icd10_2016_version
      })),
      subtotal,
      tax,
      total,
      status: ((e.nativeEvent as any).submitter?.name === 'draft' ? 'Draft' : 'Sent') as 'Draft' | 'Sent',
      dueDate: new Date(dueDate).getTime(),
      createdAt: invoice?.createdAt || Date.now()
    };

    if (invoice) {
      updateMutation.mutate(invoiceData);
    } else {
      createMutation.mutate(invoiceData);
    }
  };

  const modalContent = (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 md:p-8 bg-slate-900/60 backdrop-blur-xl">
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0"
          />
          <motion.div 
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="bg-white w-full max-w-6xl rounded-[3.5rem] shadow-[0_50px_100px_rgba(0,0,0,0.4)] overflow-hidden relative z-10 flex flex-col max-h-[92vh]"
          >
            {/* Header */}
            <div className="p-10 border-b border-primary/5 flex items-center justify-between bg-surface-muted/30 sticky top-0 z-20 backdrop-blur-md">
              <div>
                <h2 className="text-4xl font-serif text-primary tracking-tight">{invoice ? 'Update Invoice' : 'Generate Invoice'}</h2>
                <p className="text-primary/30 text-[10px] mt-2 uppercase font-black tracking-[0.2em]">{invoice ? `Editing ${invoice.invoiceNumber}` : 'Invoice Details'}</p>
              </div>
              <button 
                onClick={onClose}
                className="p-4 hover:bg-white rounded-2xl transition-all text-primary/20 hover:text-primary hover:rotate-90"
              >
                <XCircle size={32} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-10 custom-scrollbar">
              <form id="invoice-form" onSubmit={handleSubmit} className="space-y-12">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                  {/* Patient Selection */}
                  <div className="space-y-4">
                    <label className="text-[10px] font-black text-primary/30 uppercase tracking-[0.2em] ml-8">Patient Entity</label>
                    <div className="relative group">
                      <User className="absolute left-6 top-1/2 -translate-y-1/2 text-primary/20 w-5 h-5 group-focus-within:text-accent transition-colors" />
                      <select 
                        value={selectedPatientId || ''}
                        onChange={(e) => setSelectedPatientId(Number(e.target.value))}
                        required
                        className="w-full pl-16 pr-8 py-6 bg-surface-muted border-none rounded-[2rem] text-sm font-bold focus:ring-4 focus:ring-accent/5 focus:bg-white transition-all appearance-none"
                      >
                        <option value="">Select Patient Record</option>
                        {patientsList.map(p => (
                          <option key={p.id} value={p.id}>{p.firstName} {p.lastName}</option>
                        ))}
                      </select>
                      <ChevronRight className="absolute right-6 top-1/2 -translate-y-1/2 text-primary/20 w-5 h-5 rotate-90" />
                    </div>
                  </div>

                  {/* Due Date */}
                  <div className="space-y-4">
                    <label className="text-[10px] font-black text-primary/30 uppercase tracking-[0.2em] ml-8">Payment Deadline</label>
                    <div className="relative group">
                      <CalendarIcon className="absolute left-6 top-1/2 -translate-y-1/2 text-primary/20 w-5 h-5 group-focus-within:text-accent transition-colors" />
                      <input 
                        type="date"
                        value={dueDate}
                        onChange={(e) => setDueDate(e.target.value)}
                        required
                        className="w-full pl-16 pr-8 py-6 bg-surface-muted border-none rounded-[2rem] text-sm font-bold focus:ring-4 focus:ring-accent/5 focus:bg-white transition-all"
                      />
                    </div>
                  </div>
                </div>

                {/* Item Search & Selection */}
                <div className="space-y-4">
                  <label className="text-[10px] font-black text-primary/30 uppercase tracking-[0.2em] ml-8">Catalog Integration</label>
                  <div className="relative group">
                    <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-primary/20 w-5 h-5 group-focus-within:text-accent transition-colors" />
                    <input 
                      type="text"
                      placeholder="Search service catalog (e.g. Consultation, Massage, Dry Needling)..."
                      value={itemSearch}
                      onChange={(e) => setItemSearch(e.target.value)}
                      className="w-full pl-16 pr-8 py-6 bg-surface-muted border-2 border-transparent rounded-[2rem] text-base font-bold focus:ring-8 focus:ring-accent/5 focus:bg-white focus:border-accent/10 transition-all placeholder:text-primary/20 shadow-sm"
                    />
                    
                    <AnimatePresence>
                      {itemSearch && (
                        <motion.div 
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: 10 }}
                          className="absolute top-full left-0 right-0 mt-4 bg-white border border-primary/5 rounded-[3rem] shadow-[0_40px_80px_rgba(0,0,0,0.2)] z-50 max-h-96 overflow-y-auto p-4 ring-1 ring-black/5 custom-scrollbar"
                        >
                          <div className="px-4 py-2 mb-2">
                            <p className="text-[10px] font-black text-primary/20 uppercase tracking-widest">Search Results ({filteredBillingItems.length})</p>
                          </div>
                          {filteredBillingItems.map(item => (
                            <button
                              key={item.id}
                              type="button"
                              onClick={() => addItem(item)}
                              className="w-full flex items-center justify-between p-5 hover:bg-accent/5 rounded-[2rem] transition-all text-left group"
                            >
                              <div className="flex items-center gap-5">
                                <div className={cn(
                                  "w-14 h-14 rounded-2xl flex items-center justify-center transition-all shadow-sm",
                                  item.category === 'Service' 
                                    ? "bg-emerald-500/10 text-emerald-600 group-hover:bg-emerald-500 group-hover:text-white" 
                                    : "bg-blue-500/10 text-blue-600 group-hover:bg-blue-500 group-hover:text-white"
                                )}>
                                  {item.category === 'Service' ? <Activity size={24} /> : <Package size={24} />}
                                </div>
                                <div>
                                  <p className="text-base font-bold text-primary group-hover:text-accent transition-colors">{item.name}</p>
                                  <div className="flex items-center gap-2 mt-1">
                                    <p className="text-[10px] text-primary/30 font-black uppercase tracking-widest">{item.category}</p>
                                    {item.description && (
                                      <>
                                        <span className="text-primary/10">•</span>
                                        <p className="text-[10px] text-primary/20 truncate max-w-[200px]">{item.description}</p>
                                      </>
                                    )}
                                  </div>
                                </div>
                              </div>
                              <div className="text-right">
                                <p className="text-lg font-black text-primary group-hover:text-accent transition-colors">{formatCurrency(item.price, item.currency || currency)}</p>
                                <p className="text-[9px] text-primary/20 font-black uppercase tracking-widest mt-1">Unit Rate</p>
                              </div>
                            </button>
                          ))}
                          {filteredBillingItems.length === 0 && (
                            <div className="py-16 text-center">
                              <div className="w-20 h-20 bg-primary/5 rounded-[2rem] flex items-center justify-center text-primary/10 mx-auto mb-6">
                                <Package size={40} />
                              </div>
                              <p className="text-sm font-black text-primary/20 uppercase tracking-[0.3em]">No Catalog Items Found</p>
                              <p className="text-[10px] text-primary/10 font-black uppercase tracking-widest mt-2">Try searching for 'Consultation' or 'Physio'</p>
                            </div>
                          )}
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                </div>

                {/* Selected Items Table */}
                <div className="bg-surface-muted/30 rounded-[3rem] border border-primary/5 overflow-hidden">
                  <table className="w-full border-collapse">
                    <thead>
                      <tr className="bg-white/50">
                        <th className="px-8 py-6 text-left text-[10px] font-black text-primary/30 uppercase tracking-[0.2em]">Service / Item</th>
                        <th className="px-8 py-6 text-left text-[10px] font-black text-primary/30 uppercase tracking-[0.2em]">ICD-10 Diagnostic</th>
                        <th className="px-8 py-6 text-center text-[10px] font-black text-primary/30 uppercase tracking-[0.2em]">Quantity</th>
                        <th className="px-8 py-6 text-right text-[10px] font-black text-primary/30 uppercase tracking-[0.2em]">Unit Rate</th>
                        <th className="px-8 py-6 text-right text-[10px] font-black text-primary/30 uppercase tracking-[0.2em]">Aggregate</th>
                        <th className="px-8 py-6 text-right"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-primary/5">
                      <AnimatePresence mode="popLayout">
                        {paginatedItems.map(({ item, quantity, icd10_2016_version }) => (
                          <motion.tr 
                            key={item.id}
                            layout
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: 20 }}
                            className="group hover:bg-white/50 transition-colors"
                          >
                            <td className="px-8 py-8">
                              <p className="text-sm font-bold text-primary">{item.name}</p>
                              <p className="text-[10px] text-primary/30 font-black uppercase tracking-widest mt-0.5">{item.category}</p>
                            </td>
                            <td className="px-8 py-8">
                              <Icd10SearchInput 
                                value={icd10_2016_version || ''} 
                                onSelect={(code) => updateIcd10_2016(item.id!, code)} 
                              />
                            </td>
                            <td className="px-8 py-8">
                              <div className="flex items-center justify-center gap-4">
                                <button 
                                  type="button"
                                  onClick={() => updateQuantity(item.id!, -1)}
                                  className="w-10 h-10 flex items-center justify-center rounded-xl bg-white border border-primary/5 text-primary/30 hover:text-primary hover:border-primary/20 transition-all shadow-sm hover:scale-110"
                                >
                                  <Minus size={14} />
                                </button>
                                <span className="text-sm font-black w-6 text-center text-primary">{quantity}</span>
                                <button 
                                  type="button"
                                  onClick={() => updateQuantity(item.id!, 1)}
                                  className="w-10 h-10 flex items-center justify-center rounded-xl bg-white border border-primary/5 text-primary/30 hover:text-primary hover:border-primary/20 transition-all shadow-sm hover:scale-110"
                                >
                                  <Plus size={14} />
                                </button>
                              </div>
                            </td>
                            <td className="px-8 py-8 text-right text-sm font-medium text-primary/60">
                              {formatCurrency(item.price, item.currency || currency)}
                            </td>
                            <td className="px-8 py-8 text-right text-sm font-black text-primary">
                              {formatCurrency(item.price * quantity, item.currency || currency)}
                            </td>
                            <td className="px-8 py-8 text-right">
                              <button 
                                type="button"
                                onClick={() => removeItem(item.id!)}
                                className="p-4 text-primary/10 hover:text-rose-500 hover:bg-rose-50 rounded-2xl transition-all"
                              >
                                <Trash2 size={18} />
                              </button>
                            </td>
                          </motion.tr>
                        ))}
                      </AnimatePresence>
                      {selectedItems.length === 0 && (
                        <tr>
                          <td colSpan={6} className="px-8 py-24 text-center">
                            <div className="flex flex-col items-center justify-center">
                              <div className="w-20 h-20 bg-primary/5 rounded-[2rem] flex items-center justify-center text-primary/10 mb-6">
                                <Calculator size={40} />
                              </div>
                              <p className="text-sm font-black text-primary/20 uppercase tracking-[0.3em]">No Items Selected For Billing</p>
                            </div>
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                  
                  {totalPages > 1 && (
                    <div className="px-8 py-4 bg-white/50 border-t border-primary/5 flex items-center justify-between">
                      <p className="text-[10px] font-black text-primary/30 uppercase tracking-widest">
                        Showing {((currentPage - 1) * itemsPerPage) + 1} to {Math.min(currentPage * itemsPerPage, selectedItems.length)} of {selectedItems.length} items
                      </p>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                          disabled={currentPage === 1}
                          className="p-2 hover:bg-primary/5 rounded-xl disabled:opacity-30 transition-all"
                        >
                          <ChevronLeft size={16} />
                        </button>
                        <div className="flex items-center gap-1">
                          {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                            <button
                              key={page}
                              type="button"
                              onClick={() => setCurrentPage(page)}
                              className={cn(
                                "w-8 h-8 rounded-xl text-[10px] font-black transition-all",
                                currentPage === page 
                                  ? "bg-primary text-white shadow-lg shadow-primary/20" 
                                  : "hover:bg-primary/5 text-primary/40"
                              )}
                            >
                              {page}
                            </button>
                          ))}
                        </div>
                        <button
                          type="button"
                          onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                          disabled={currentPage === totalPages}
                          className="p-2 hover:bg-primary/5 rounded-xl disabled:opacity-30 transition-all"
                        >
                          <ChevronRight size={16} />
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                {/* Summary */}
                <div className="flex justify-end pt-6">
                  <div className="w-full max-w-md bg-surface-muted/30 rounded-[2.5rem] p-10 space-y-6 border border-primary/5">
                    <div className="flex justify-between items-center">
                      <span className="text-[10px] font-black text-primary/30 uppercase tracking-[0.2em]">Subtotal Aggregate</span>
                      <span className="text-lg font-bold text-primary">{formatCurrency(subtotal, currency)}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-black text-primary/30 uppercase tracking-[0.2em]">Value Added Tax</span>
                        <span className="px-2 py-0.5 bg-primary/5 rounded text-[8px] font-black text-primary/40">15%</span>
                      </div>
                      <span className="text-lg font-bold text-primary">{formatCurrency(tax, currency)}</span>
                    </div>
                    <div className="h-px bg-primary/5" />
                    <div className="flex justify-between items-center">
                      <span className="text-xs font-black text-primary uppercase tracking-[0.3em]">Total Payable</span>
                      <div className="text-right">
                        <span className="text-4xl font-bold text-accent tracking-tighter">{formatCurrency(total, currency)}</span>
                        <p className="text-[8px] font-black text-primary/20 uppercase tracking-widest mt-1">All taxes included</p>
                      </div>
                    </div>
                  </div>
                </div>
              </form>
            </div>

            {/* Footer */}
            <div className="p-10 border-t border-primary/5 bg-surface-muted/30 flex gap-6 sticky bottom-0 z-20 backdrop-blur-md">
              <button 
                type="submit"
                form="invoice-form"
                name="draft"
                disabled={createMutation.isPending || updateMutation.isPending || selectedItems.length === 0}
                className="flex-1 px-10 py-6 bg-white text-primary/40 rounded-[2rem] font-black text-[10px] uppercase tracking-[0.2em] hover:bg-primary/5 hover:text-primary transition-all border border-primary/5"
              >
                {invoice?.status === 'Draft' ? 'Update Draft' : 'Save as Draft'}
              </button>
              <button 
                type="submit"
                form="invoice-form"
                name="send"
                disabled={createMutation.isPending || updateMutation.isPending || selectedItems.length === 0}
                className="flex-[2] px-10 py-6 bg-primary text-white rounded-[2rem] font-black text-[10px] uppercase tracking-[0.2em] hover:bg-accent transition-all shadow-[0_20px_40px_rgba(0,0,0,0.15)] disabled:opacity-50 group"
              >
                <span className="flex items-center justify-center gap-3">
                  {createMutation.isPending || updateMutation.isPending ? 'Processing Transaction...' : invoice ? 'Finalize & Update' : 'Finalize & Transmit Invoice'}
                  <ArrowUpRight size={20} className="group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
                </span>
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );

  return createPortal(modalContent, document.body);
}
