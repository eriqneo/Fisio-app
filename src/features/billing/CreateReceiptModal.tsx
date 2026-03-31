import React, { useState, useMemo } from 'react';
import { 
  X, 
  Plus, 
  Trash2, 
  Search, 
  User, 
  Calendar as CalendarIcon,
  Package,
  DollarSign,
  Calculator,
  CreditCard,
  FileText,
  Receipt,
  ChevronRight,
  ChevronLeft,
  CheckCircle2,
  AlertCircle,
  ArrowRight
} from 'lucide-react';
import { cn, formatCurrency } from '@/lib/utils';
import { useTenantDb } from '@/hooks/useTenantDb';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { BillingItem, Patient, Receipt as ReceiptType, Invoice } from '@/types';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';

interface CreateReceiptModalProps {
  isOpen: boolean;
  onClose: () => void;
  patientId?: number;
  invoiceId?: number;
}

export default function CreateReceiptModal({ isOpen, onClose, patientId: initialPatientId, invoiceId: initialInvoiceId }: CreateReceiptModalProps) {
  const { billing, patients } = useTenantDb();
  const queryClient = useQueryClient();
  
  const [selectedPatientId, setSelectedPatientId] = useState<number | undefined>(initialPatientId);
  const [selectedInvoiceId, setSelectedInvoiceId] = useState<number | undefined>(initialInvoiceId);
  const [selectedItems, setSelectedItems] = useState<{ item: BillingItem; quantity: number }[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 7;
  const [currency, setCurrency] = useState('BWP');
  const [itemSearch, setItemSearch] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<ReceiptType['paymentMethod']>('Cash');
  const [paymentDate, setPaymentDate] = useState(new Date().toISOString().split('T')[0]);

  const { data: patientsList = [] } = useQuery({
    queryKey: ['patients'],
    queryFn: () => patients.list()
  });

  const { data: invoices = [] } = useQuery({
    queryKey: ['invoices', selectedPatientId],
    queryFn: () => selectedPatientId ? billing.invoices.listByPatient(selectedPatientId) : Promise.resolve([]),
    enabled: !!selectedPatientId
  });

  const { data: billingItems = [] } = useQuery({
    queryKey: ['billing-items'],
    queryFn: () => billing.items.list()
  });

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

  const tax = subtotal * 0.15;
  const total = subtotal + tax;

  const createMutation = useMutation({
    mutationFn: (data: Partial<ReceiptType>) => billing.receipts.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['receipts'] });
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
      toast.success('Receipt created successfully');
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
      return [...prev, { item, quantity: 1 }];
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

  const handleInvoiceSelect = (id: number) => {
    setSelectedInvoiceId(id);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPatientId) {
      toast.error('Please select a patient');
      return;
    }
    if (selectedItems.length === 0 && !selectedInvoiceId) {
      toast.error('Please add items or select an invoice');
      return;
    }

    const finalAmount = total + (selectedInvoiceId ? (invoices.find(i => i.id === selectedInvoiceId)?.total || 0) : 0);

    createMutation.mutate({
      patientId: selectedPatientId,
      invoiceId: selectedInvoiceId,
      receiptNumber: `RCP-${Date.now().toString().slice(-6)}`,
      amount: finalAmount,
      paymentMethod,
      createdAt: new Date(paymentDate).getTime(),
      items: selectedItems.map(({ item, quantity }) => ({
        name: item.name,
        quantity,
        price: item.price,
        total: item.price * quantity
      })),
      notes: selectedInvoiceId ? `Payment for Invoice #${invoices.find(i => i.id === selectedInvoiceId)?.invoiceNumber}` : 'Direct Payment'
    });
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 md:p-8 bg-slate-900/40 backdrop-blur-md">
          <motion.div 
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="bg-white w-full max-w-5xl rounded-[2.5rem] shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
          >
            {/* Header */}
            <div className="px-8 py-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center text-emerald-600 shadow-sm border border-slate-100">
                  <Receipt size={24} />
                </div>
                <div>
                  <h2 className="text-xl font-semibold text-slate-900 tracking-tight">Record Payment</h2>
                  <p className="text-slate-500 text-xs font-medium uppercase tracking-wider">Create New Receipt</p>
                </div>
              </div>
              <button 
                onClick={onClose}
                className="p-2 hover:bg-slate-100 rounded-xl transition-colors text-slate-400 hover:text-slate-600"
              >
                <X size={24} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-8 md:p-10">
              <form id="receipt-form" onSubmit={handleSubmit} className="space-y-12">
                {/* Top Section: Patient & Payment Info */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                  <div className="space-y-3">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] ml-1">Patient</label>
                    <div className="relative group">
                      <User className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-600 transition-colors w-4 h-4" />
                      <select 
                        value={selectedPatientId || ''}
                        onChange={(e) => setSelectedPatientId(Number(e.target.value))}
                        required
                        className="w-full pl-12 pr-10 py-4 bg-slate-50 border-slate-100 rounded-2xl text-sm font-medium focus:ring-2 focus:ring-indigo-600/10 focus:bg-white focus:border-indigo-600/20 transition-all appearance-none text-slate-900"
                      >
                        <option value="">Select Patient</option>
                        {patientsList.map(p => (
                          <option key={p.id} value={p.id}>{p.firstName} {p.lastName}</option>
                        ))}
                      </select>
                      <ChevronRight className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-300 w-4 h-4 rotate-90 pointer-events-none" />
                    </div>
                  </div>

                  <div className="space-y-3">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] ml-1">Link to Invoice</label>
                    <div className="relative group">
                      <FileText className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-600 transition-colors w-4 h-4" />
                      <select 
                        value={selectedInvoiceId || ''}
                        onChange={(e) => handleInvoiceSelect(Number(e.target.value))}
                        disabled={!selectedPatientId}
                        className="w-full pl-12 pr-10 py-4 bg-slate-50 border-slate-100 rounded-2xl text-sm font-medium focus:ring-2 focus:ring-indigo-600/10 focus:bg-white focus:border-indigo-600/20 transition-all appearance-none disabled:opacity-50 text-slate-900"
                      >
                        <option value="">Direct Payment (No Invoice)</option>
                        {invoices.filter(i => i.status !== 'Paid').map(i => (
                          <option key={i.id} value={i.id}>{i.invoiceNumber} — {formatCurrency(i.total, i.currency)}</option>
                        ))}
                      </select>
                      <ChevronRight className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-300 w-4 h-4 rotate-90 pointer-events-none" />
                    </div>
                  </div>

                  <div className="space-y-3">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] ml-1">Payment Method</label>
                    <div className="relative group">
                      <CreditCard className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-600 transition-colors w-4 h-4" />
                      <select 
                        value={paymentMethod}
                        onChange={(e) => setPaymentMethod(e.target.value as any)}
                        required
                        className="w-full pl-12 pr-10 py-4 bg-slate-50 border-slate-100 rounded-2xl text-sm font-medium focus:ring-2 focus:ring-indigo-600/10 focus:bg-white focus:border-indigo-600/20 transition-all appearance-none text-slate-900"
                      >
                        <option value="Cash">Cash</option>
                        <option value="Card">Credit/Debit Card</option>
                        <option value="Transfer">Bank Transfer</option>
                        <option value="Insurance">Insurance</option>
                      </select>
                      <ChevronRight className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-300 w-4 h-4 rotate-90 pointer-events-none" />
                    </div>
                  </div>
                </div>

                {/* Item Search */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between px-1">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em]">Add Items or Services</label>
                    <span className="text-[10px] text-indigo-600 font-bold uppercase tracking-widest">Optional for direct payments</span>
                  </div>
                  <div className="relative group">
                    <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-600 transition-colors w-5 h-5" />
                    <input 
                      type="text"
                      placeholder="Search clinical services, procedures, or items..."
                      value={itemSearch}
                      onChange={(e) => setItemSearch(e.target.value)}
                      className="w-full pl-14 pr-6 py-5 bg-slate-50 border-slate-100 rounded-3xl text-sm font-medium focus:ring-4 focus:ring-indigo-600/5 focus:bg-white focus:border-indigo-600/20 transition-all shadow-sm"
                    />
                    
                    <AnimatePresence>
                      {itemSearch && (
                        <motion.div 
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: 10 }}
                          className="absolute top-full left-0 right-0 mt-3 bg-white border border-slate-100 rounded-3xl shadow-2xl z-20 max-h-72 overflow-y-auto p-3 space-y-1"
                        >
                          {filteredBillingItems.length > 0 ? (
                            filteredBillingItems.map(item => (
                              <button
                                key={item.id}
                                type="button"
                                onClick={() => addItem(item)}
                                className="w-full flex items-center justify-between p-4 hover:bg-slate-50 rounded-2xl transition-all text-left group"
                              >
                                <div className="flex items-center gap-4">
                                  <div className="w-10 h-10 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center group-hover:bg-indigo-600 group-hover:text-white transition-colors">
                                    <Package size={18} />
                                  </div>
                                  <div>
                                    <p className="text-sm font-bold text-slate-900">{item.name}</p>
                                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-0.5">{item.category}</p>
                                  </div>
                                </div>
                                <div className="flex items-center gap-4">
                                  <p className="text-sm font-bold text-indigo-600">{formatCurrency(item.price, item.currency || currency)}</p>
                                  <div className="p-2 bg-slate-100 rounded-lg text-slate-400 group-hover:bg-indigo-600 group-hover:text-white transition-all">
                                    <Plus size={16} />
                                  </div>
                                </div>
                              </button>
                            ))
                          ) : (
                            <div className="p-8 text-center space-y-2">
                              <div className="w-12 h-12 bg-slate-50 rounded-full flex items-center justify-center mx-auto text-slate-300">
                                <Search size={20} />
                              </div>
                              <p className="text-sm text-slate-500 font-medium">No items matching your search</p>
                            </div>
                          )}
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                </div>

                {/* Selected Items Table */}
                <div className="space-y-4">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] ml-1">Payment Breakdown</p>
                  <div className="bg-slate-50/50 rounded-[2.5rem] border border-slate-100 overflow-hidden shadow-sm">
                    <table className="w-full border-collapse">
                      <thead>
                        <tr className="border-b border-slate-200/60 bg-slate-100/30">
                          <th className="px-8 py-5 text-left text-[10px] font-bold text-slate-500 uppercase tracking-widest">Description</th>
                          <th className="px-8 py-5 text-center text-[10px] font-bold text-slate-500 uppercase tracking-widest">Quantity</th>
                          <th className="px-8 py-5 text-right text-[10px] font-bold text-slate-500 uppercase tracking-widest">Unit Price</th>
                          <th className="px-8 py-5 text-right text-[10px] font-bold text-slate-500 uppercase tracking-widest">Total</th>
                          <th className="px-8 py-5 text-right text-[10px] font-bold text-slate-500 uppercase tracking-widest"></th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {paginatedItems.map(({ item, quantity }) => (
                          <motion.tr 
                            layout
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            key={item.id} 
                            className="hover:bg-white transition-colors"
                          >
                            <td className="px-8 py-6">
                              <p className="text-sm font-bold text-slate-900">{item.name}</p>
                              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-0.5">{item.category}</p>
                            </td>
                            <td className="px-8 py-6">
                              <div className="flex items-center justify-center gap-4">
                                <button 
                                  type="button"
                                  onClick={() => updateQuantity(item.id!, -1)}
                                  className="w-8 h-8 flex items-center justify-center rounded-xl bg-white text-slate-400 hover:text-indigo-600 shadow-sm border border-slate-200 transition-all hover:border-indigo-200"
                                >
                                  -
                                </button>
                                <span className="text-sm font-bold w-6 text-center text-slate-900">{quantity}</span>
                                <button 
                                  type="button"
                                  onClick={() => updateQuantity(item.id!, 1)}
                                  className="w-8 h-8 flex items-center justify-center rounded-xl bg-white text-slate-400 hover:text-indigo-600 shadow-sm border border-slate-200 transition-all hover:border-indigo-200"
                                >
                                  +
                                </button>
                              </div>
                            </td>
                            <td className="px-8 py-6 text-right text-sm font-medium text-slate-500">
                              {formatCurrency(item.price, item.currency || currency)}
                            </td>
                            <td className="px-8 py-6 text-right text-sm font-bold text-slate-900">
                              {formatCurrency(item.price * quantity, item.currency || currency)}
                            </td>
                            <td className="px-8 py-6 text-right">
                              <button 
                                type="button"
                                onClick={() => removeItem(item.id!)}
                                className="p-2 text-slate-300 hover:text-rose-500 transition-colors"
                              >
                                <Trash2 size={18} />
                              </button>
                            </td>
                          </motion.tr>
                        ))}
                        
                        {selectedItems.length === 0 && !selectedInvoiceId && (
                          <tr>
                            <td colSpan={5} className="px-8 py-20 text-center">
                              <div className="max-w-xs mx-auto space-y-3">
                                <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto text-slate-300">
                                  <Calculator size={28} />
                                </div>
                                <p className="text-sm text-slate-400 font-medium italic">
                                  No items added yet. Search above to add services or procedures.
                                </p>
                              </div>
                            </td>
                          </tr>
                        )}

                        {selectedInvoiceId && (
                          <tr className="bg-indigo-50/50">
                            <td colSpan={5} className="px-8 py-6">
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-4">
                                  <div className="w-10 h-10 bg-indigo-600 text-white rounded-xl flex items-center justify-center shadow-md shadow-indigo-200">
                                    <FileText size={18} />
                                  </div>
                                  <div>
                                    <p className="text-sm font-bold text-slate-900">Linked Invoice Payment</p>
                                    <p className="text-[10px] text-indigo-600 font-bold uppercase tracking-widest mt-0.5">
                                      Invoice #{invoices.find(i => i.id === selectedInvoiceId)?.invoiceNumber}
                                    </p>
                                  </div>
                                </div>
                                <div className="text-right">
                                  <p className="text-lg font-bold text-indigo-600">
                                    {formatCurrency(invoices.find(i => i.id === selectedInvoiceId)?.total || 0, invoices.find(i => i.id === selectedInvoiceId)?.currency || currency)}
                                  </p>
                                  <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Full Amount</p>
                                </div>
                              </div>
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>

                  {totalPages > 1 && (
                    <div className="px-8 py-4 bg-slate-100/30 border-t border-slate-200/60 flex items-center justify-between">
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                        Showing {((currentPage - 1) * itemsPerPage) + 1} to {Math.min(currentPage * itemsPerPage, selectedItems.length)} of {selectedItems.length} items
                      </p>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                          disabled={currentPage === 1}
                          className="p-2 hover:bg-white rounded-xl disabled:opacity-30 transition-all border border-transparent hover:border-slate-200"
                        >
                          <ChevronLeft size={16} className="text-slate-400" />
                        </button>
                        <div className="flex items-center gap-1">
                          {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                            <button
                              key={page}
                              type="button"
                              onClick={() => setCurrentPage(page)}
                              className={cn(
                                "w-8 h-8 rounded-xl text-[10px] font-bold transition-all",
                                currentPage === page 
                                  ? "bg-indigo-600 text-white shadow-lg shadow-indigo-200" 
                                  : "hover:bg-white text-slate-400 border border-transparent hover:border-slate-200"
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
                          className="p-2 hover:bg-white rounded-xl disabled:opacity-30 transition-all border border-transparent hover:border-slate-200"
                        >
                          <ChevronRight size={16} className="text-slate-400" />
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                {/* Summary & Totals */}
                <div className="flex flex-col md:flex-row justify-between items-end gap-8 pt-4">
                  <div className="flex-1 max-w-md">
                    <div className="p-6 bg-slate-50 rounded-3xl border border-slate-100 flex items-start gap-4">
                      <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center text-slate-400 shadow-sm border border-slate-100">
                        <AlertCircle size={20} />
                      </div>
                      <div className="space-y-1">
                        <p className="text-xs font-bold text-slate-900 uppercase tracking-widest">Payment Confirmation</p>
                        <p className="text-xs text-slate-500 leading-relaxed">
                          Recording this payment will update the patient's balance and mark any linked invoices as paid. A receipt will be generated automatically.
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="w-full max-w-xs space-y-4 px-4">
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-slate-400 font-medium">Subtotal</span>
                      <span className="font-bold text-slate-900">{formatCurrency(subtotal, currency)}</span>
                    </div>
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-slate-400 font-medium">Tax (15%)</span>
                      <span className="font-bold text-slate-900">{formatCurrency(tax, currency)}</span>
                    </div>
                    <div className="h-px bg-slate-100 my-2" />
                    <div className="flex justify-between items-center">
                      <div className="space-y-0.5">
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Total Received</p>
                        <p className="text-xs text-emerald-600 font-semibold">Ready to record</p>
                      </div>
                      <span className="text-4xl font-bold text-slate-900 tracking-tighter">
                        {formatCurrency(total + (selectedInvoiceId ? (invoices.find(i => i.id === selectedInvoiceId)?.total || 0) : 0), currency)}
                      </span>
                    </div>
                  </div>
                </div>
              </form>
            </div>

            {/* Footer */}
            <div className="px-8 py-6 border-t border-slate-100 bg-slate-50/50 flex gap-4">
              <button 
                type="button"
                onClick={onClose}
                className="flex-1 px-6 py-4 bg-white text-slate-600 rounded-2xl font-bold text-sm hover:bg-slate-100 transition-all border border-slate-200 shadow-sm"
              >
                Discard
              </button>
              <button 
                type="submit"
                form="receipt-form"
                disabled={createMutation.isPending || (selectedItems.length === 0 && !selectedInvoiceId)}
                className="flex-[2] px-6 py-4 bg-emerald-600 text-white rounded-2xl font-bold text-sm hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-200 disabled:opacity-50 flex items-center justify-center gap-2 group"
              >
                {createMutation.isPending ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Processing...
                  </>
                ) : (
                  <>
                    Record Payment & Generate Receipt
                    <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
                  </>
                )}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
