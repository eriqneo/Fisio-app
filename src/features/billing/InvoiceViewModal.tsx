import React from 'react';
import { createPortal } from 'react-dom';
import { 
  X, 
  Download, 
  Printer, 
  FileText, 
  User, 
  Calendar,
  Activity,
  CheckCircle2,
  Clock,
  AlertCircle,
  Mail,
  Phone,
  MapPin,
  Building2,
  CreditCard,
  Receipt
} from 'lucide-react';
import { cn, formatCurrency } from '@/lib/utils';
import { Invoice, Patient } from '@/types';
import { format } from 'date-fns';
import { motion, AnimatePresence } from 'framer-motion';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useTenantDb } from '@/hooks/useTenantDb';
import { toast } from 'sonner';
import { Send } from 'lucide-react';

interface InvoiceViewModalProps {
  isOpen: boolean;
  onClose: () => void;
  invoice: Invoice;
  patient: Patient | null;
  autoPrint?: boolean;
}

export default function InvoiceViewModal({ isOpen, onClose, invoice, patient, autoPrint }: InvoiceViewModalProps) {
  const { billing } = useTenantDb();
  const queryClient = useQueryClient();

  const sendMutation = useMutation({
    mutationFn: () => billing.invoices.update(invoice.id!, { status: 'Sent' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
      toast.success('Invoice sent successfully');
      onClose();
    }
  });

  React.useEffect(() => {
    if (isOpen && autoPrint) {
      const timer = setTimeout(() => {
        window.print();
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [isOpen, autoPrint]);

  if (!isOpen) return null;

  const getStatusColor = (status: Invoice['status']) => {
    switch (status) {
      case 'Paid': return 'text-emerald-600 bg-emerald-50 border-emerald-100';
      case 'Draft': return 'text-amber-600 bg-amber-50 border-amber-100';
      case 'Overdue': return 'text-rose-600 bg-rose-50 border-rose-100';
      default: return 'text-slate-400 bg-slate-50 border-slate-100';
    }
  };

  const getStatusIcon = (status: Invoice['status']) => {
    switch (status) {
      case 'Paid': return <CheckCircle2 size={14} />;
      case 'Draft': return <Clock size={14} />;
      case 'Overdue': return <AlertCircle size={14} />;
      default: return <Clock size={14} />;
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const modalContent = (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[10000] flex items-start justify-center p-4 md:p-8 bg-slate-900/60 backdrop-blur-xl overflow-y-auto pt-12 pb-12 print:p-0 print:bg-white print:static print:block custom-scrollbar">
          <style dangerouslySetInnerHTML={{ __html: `
            @media print {
              @page {
                size: A4;
                margin: 0;
              }
              body {
                background: white;
                -webkit-print-color-adjust: exact;
              }
              .print-container {
                width: 210mm;
                min-height: 297mm;
                padding: 20mm;
                margin: 0 auto;
                background: white !important;
                box-shadow: none !important;
                border-radius: 0 !important;
              }
              .no-print {
                display: none !important;
              }
            }
          `}} />
          
          <motion.div 
            initial={{ opacity: 0, scale: 0.9, y: 40 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 40 }}
            className="bg-white w-full max-w-5xl rounded-[2.5rem] shadow-[0_50px_100px_rgba(0,0,0,0.4)] overflow-hidden flex flex-col max-h-[92vh] print:shadow-none print:rounded-none print:max-h-none print:w-full print:h-auto print-container relative"
          >
            {/* Header - Hidden on Print */}
            <div className="px-10 py-8 border-b border-slate-100 flex items-center justify-between bg-slate-50/80 backdrop-blur-md sticky top-0 z-10 no-print">
              <div className="flex items-center gap-5">
                <div className="w-14 h-14 bg-white rounded-2xl flex items-center justify-center text-indigo-600 shadow-xl border border-slate-100">
                  <FileText size={28} />
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-slate-900 tracking-tight">Invoice Preview</h2>
                  <p className="text-slate-500 text-xs font-black uppercase tracking-[0.2em] mt-0.5">{invoice.invoiceNumber}</p>
                </div>
              </div>
              
              <div className="flex items-center gap-4">
                {invoice.status === 'Draft' && (
                  <button 
                    onClick={() => sendMutation.mutate()}
                    disabled={sendMutation.isPending}
                    className="flex items-center gap-3 px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl transition-all shadow-2xl shadow-indigo-200 text-sm font-bold uppercase tracking-widest group disabled:opacity-50"
                  >
                    <Send size={20} className="text-indigo-100 group-hover:text-white transition-colors" />
                    {sendMutation.isPending ? 'Sending...' : 'Send Invoice'}
                  </button>
                )}
                <button 
                  onClick={handlePrint}
                  className="flex items-center gap-3 px-6 py-3 bg-white hover:bg-slate-50 text-slate-700 rounded-2xl transition-all border border-slate-200 shadow-sm text-sm font-bold uppercase tracking-widest group"
                >
                  <Printer size={20} className="text-slate-400 group-hover:text-indigo-600 transition-colors" />
                  Print
                </button>
                <button 
                  className="flex items-center gap-3 px-6 py-3 bg-white hover:bg-slate-50 text-slate-700 rounded-2xl transition-all border border-slate-200 shadow-sm text-sm font-bold uppercase tracking-widest group"
                >
                  <Download size={20} className="text-slate-400 group-hover:text-indigo-600 transition-colors" />
                  Download PDF
                </button>
                <div className="w-px h-10 bg-slate-200 mx-2" />
                <button 
                  onClick={onClose}
                  className="p-4 hover:bg-slate-100 rounded-2xl transition-all text-slate-400 hover:text-slate-900 hover:rotate-90 duration-300"
                >
                  <X size={28} />
                </button>
              </div>
            </div>

            {/* Invoice Content */}
            <div className="flex-1 overflow-y-auto p-12 md:p-20 space-y-20 print:overflow-visible print:p-0 print:h-auto custom-scrollbar">
              {/* Top Section: Branding & Status */}
              <div className="flex flex-col md:flex-row justify-between items-start gap-12">
                <div className="space-y-8">
                  <div className="flex items-center gap-4">
                    <div className="w-16 h-16 bg-indigo-600 rounded-[2rem] flex items-center justify-center text-white shadow-2xl shadow-indigo-200">
                      <Building2 size={36} />
                    </div>
                    <div>
                      <h1 className="text-4xl font-bold text-slate-900 tracking-tighter leading-none">MedFlow</h1>
                      <p className="text-indigo-600 font-black tracking-[0.3em] uppercase text-[10px] mt-2">Clinical Excellence</p>
                    </div>
                  </div>
                  <div className="space-y-3 text-sm text-slate-500 font-medium">
                    <div className="flex items-center gap-3">
                      <MapPin size={16} className="text-slate-300" />
                      <p>123 Healthcare Avenue, Medical District, Suite 400</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <Mail size={16} className="text-slate-300" />
                      <p>billing@medflow.clinic</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <Phone size={16} className="text-slate-300" />
                      <p>+1 (555) 000-1234</p>
                    </div>
                  </div>
                </div>

                <div className="text-right space-y-8">
                  <div className={cn(
                    "inline-flex items-center gap-2.5 px-5 py-2 rounded-full text-[10px] font-black uppercase tracking-[0.2em] border shadow-sm",
                    getStatusColor(invoice.status)
                  )}>
                    {getStatusIcon(invoice.status)}
                    {invoice.status.replace('_', ' ')}
                  </div>
                  <div className="space-y-2">
                    <h2 className="text-6xl font-light text-slate-900 tracking-tighter">INVOICE</h2>
                    <p className="text-slate-400 text-sm font-black tracking-[0.3em] uppercase">#{invoice.invoiceNumber}</p>
                  </div>
                </div>
              </div>

              {/* Info Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-20 py-16 border-y border-slate-100">
                <div className="space-y-10">
                  <div>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] mb-6">Billed To</p>
                    <div className="flex items-start gap-6">
                      <div className="w-20 h-20 rounded-[2.5rem] bg-indigo-50 text-indigo-600 flex items-center justify-center text-3xl font-bold border border-indigo-100 shadow-inner">
                        {patient?.firstName.charAt(0)}
                      </div>
                      <div className="space-y-2">
                        <p className="text-2xl font-bold text-slate-900 tracking-tight">{patient ? `${patient.firstName} ${patient.lastName}` : 'Unknown Patient'}</p>
                        <div className="space-y-1 text-sm text-slate-500 font-medium">
                          <p>{patient?.email}</p>
                          <p>{patient?.phone}</p>
                          <p className="text-slate-300 text-xs mt-2 font-black uppercase tracking-widest">ID: {patient?.id.toString().substring(0, 8).toUpperCase()}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-12">
                  <div className="space-y-2">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] mb-3">Issue Date</p>
                    <p className="text-lg font-bold text-slate-900">{format(invoice.createdAt, 'MMMM dd, yyyy')}</p>
                  </div>
                  <div className="space-y-2">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] mb-3">Due Date</p>
                    <p className="text-lg font-bold text-indigo-600">{format(invoice.dueDate, 'MMMM dd, yyyy')}</p>
                  </div>
                  <div className="space-y-2">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] mb-3">Reference</p>
                    <p className="text-lg font-bold text-slate-900">{invoice.appointmentId ? `Appt #${invoice.appointmentId.toString().substring(0, 6)}` : 'Direct Billing'}</p>
                  </div>
                  <div className="space-y-2">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] mb-3">Payment Method</p>
                    <div className="flex items-center gap-3 text-lg font-bold text-slate-900">
                      <CreditCard size={20} className="text-slate-300" />
                      <span>Credit Card</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Items Table */}
              <div className="space-y-8">
                <div className="flex items-center justify-between px-6">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em]">Services & Procedures</p>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em]">Amount ({invoice.currency})</p>
                </div>
                <div className="bg-slate-50/30 rounded-[3rem] border border-slate-100 overflow-hidden shadow-sm">
                  <table className="w-full border-collapse">
                    <thead>
                      <tr className="border-b border-slate-200/40 bg-slate-100/20">
                        <th className="px-10 py-6 text-left text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">Description</th>
                        <th className="px-10 py-6 text-left text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">ICD-10 Code</th>
                        <th className="px-10 py-6 text-center text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">Qty</th>
                        <th className="px-10 py-6 text-right text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">Unit Price</th>
                        <th className="px-10 py-6 text-right text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">Total</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {invoice.items.map((item, idx) => (
                        <tr key={idx} className="hover:bg-white transition-colors group">
                          <td className="px-10 py-8">
                            <p className="text-base font-bold text-slate-900">{item.name}</p>
                            <p className="text-[10px] text-slate-400 mt-1.5 font-black uppercase tracking-widest">Professional Service</p>
                          </td>
                          <td className="px-10 py-8">
                            <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-indigo-50 text-indigo-600 rounded-xl text-[10px] font-black border border-indigo-100 shadow-sm">
                              <Activity size={12} />
                              {item.icd10_2016_version || 'N/A'}
                            </div>
                          </td>
                          <td className="px-10 py-8 text-center">
                            <span className="text-base font-bold text-slate-600">{item.quantity}</span>
                          </td>
                          <td className="px-10 py-8 text-right">
                            <span className="text-base font-medium text-slate-600">{formatCurrency(item.price, invoice.currency)}</span>
                          </td>
                          <td className="px-10 py-8 text-right">
                            <span className="text-base font-black text-slate-900">{formatCurrency(item.total, invoice.currency)}</span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Totals & Footer */}
              <div className="flex flex-col md:flex-row justify-between gap-16 pt-12">
                <div className="max-w-sm space-y-8">
                  <div className="p-8 bg-slate-50 rounded-[2.5rem] border border-slate-100 space-y-4 shadow-inner">
                    <div className="flex items-center gap-3 text-slate-900 font-black text-[10px] uppercase tracking-[0.2em]">
                      <Receipt size={16} className="text-indigo-600" />
                      Payment Instructions
                    </div>
                    <p className="text-xs text-slate-500 leading-relaxed font-medium">
                      Please settle this invoice within the due date. You can pay via bank transfer or through our online patient portal using the reference number above.
                    </p>
                  </div>
                  <div className="flex items-center gap-5 px-4">
                    <div className="w-12 h-12 rounded-2xl border-2 border-slate-100 flex items-center justify-center text-slate-200">
                      <CheckCircle2 size={24} />
                    </div>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] leading-tight">
                      Verified by MedFlow<br/>Billing Department
                    </p>
                  </div>
                </div>

                <div className="w-full max-w-md">
                  <div className="space-y-5 px-6">
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-slate-400 font-black uppercase tracking-widest">Subtotal</span>
                      <span className="text-lg font-bold text-slate-900">{formatCurrency(invoice.subtotal, invoice.currency)}</span>
                    </div>
                    <div className="flex justify-between items-center text-sm">
                      <div className="flex items-center gap-2">
                        <span className="text-slate-400 font-black uppercase tracking-widest">Tax</span>
                        <span className="px-2 py-0.5 bg-slate-100 text-slate-500 text-[8px] font-black rounded">15%</span>
                      </div>
                      <span className="text-lg font-bold text-slate-900">{formatCurrency(invoice.tax, invoice.currency)}</span>
                    </div>
                    <div className="h-px bg-slate-100 my-4" />
                    <div className="flex justify-between items-end">
                      <div className="space-y-1">
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em]">Total Amount Due</p>
                        <p className="text-xs text-indigo-600 font-bold uppercase tracking-widest">Net Payable</p>
                      </div>
                      <span className="text-6xl font-bold text-slate-900 tracking-tighter">
                        {formatCurrency(invoice.total, invoice.currency)}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Footer Note */}
              <div className="pt-20 border-t border-slate-100 text-center space-y-6">
                <div className="flex items-center justify-center gap-10">
                  <div className="h-px w-16 bg-slate-100" />
                  <p className="text-[10px] text-slate-400 font-black uppercase tracking-[0.4em]">Thank you for choosing MedFlow</p>
                  <div className="h-px w-16 bg-slate-100" />
                </div>
                <p className="text-[9px] text-slate-300 max-w-lg mx-auto leading-relaxed uppercase tracking-[0.2em] font-medium">
                  This is a computer-generated document. No signature is required. For any billing inquiries, please contact our support team at support@medflow.clinic
                </p>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );

  return createPortal(modalContent, document.body);
}
