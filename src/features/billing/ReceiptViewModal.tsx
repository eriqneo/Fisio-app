import React from 'react';
import { 
  X, 
  Download, 
  Printer, 
  Receipt as ReceiptIcon, 
  User, 
  Calendar,
  CreditCard,
  CheckCircle2,
  Clock,
  AlertCircle,
  Mail,
  Phone,
  MapPin,
  Building2,
  ShieldCheck,
  ArrowRight
} from 'lucide-react';
import { cn, formatCurrency } from '@/lib/utils';
import { Receipt, Patient } from '@/types';
import { format } from 'date-fns';
import { motion, AnimatePresence } from 'framer-motion';

interface ReceiptViewModalProps {
  isOpen: boolean;
  onClose: () => void;
  receipt: Receipt;
  patient: Patient | null;
  autoPrint?: boolean;
}

export default function ReceiptViewModal({ isOpen, onClose, receipt, patient, autoPrint }: ReceiptViewModalProps) {
  React.useEffect(() => {
    if (isOpen && autoPrint) {
      const timer = setTimeout(() => {
        window.print();
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [isOpen, autoPrint]);

  if (!isOpen) return null;

  const handlePrint = () => {
    window.print();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 md:p-8 bg-slate-900/40 backdrop-blur-md print:p-0 print:bg-white print:static print:block">
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
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="bg-white w-full max-w-4xl rounded-[2.5rem] shadow-2xl overflow-hidden flex flex-col max-h-[90vh] print:shadow-none print:rounded-none print:max-h-none print:w-full print:h-auto print-container relative"
          >
            {/* Header - Hidden on Print */}
            <div className="px-8 py-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50 no-print">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center text-emerald-600 shadow-sm border border-slate-100">
                  <ReceiptIcon size={24} />
                </div>
                <div>
                  <h2 className="text-xl font-semibold text-slate-900 tracking-tight">Payment Receipt</h2>
                  <p className="text-slate-500 text-xs font-medium uppercase tracking-wider">{receipt.receiptNumber}</p>
                </div>
              </div>
              
              <div className="flex items-center gap-3">
                <button 
                  onClick={handlePrint}
                  className="flex items-center gap-2 px-4 py-2 bg-white hover:bg-slate-50 text-slate-700 rounded-xl transition-all border border-slate-200 shadow-sm text-sm font-medium group"
                >
                  <Printer size={18} className="text-slate-400 group-hover:text-emerald-600 transition-colors" />
                  Print
                </button>
                <button 
                  className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl transition-all shadow-md shadow-emerald-200 text-sm font-medium group"
                >
                  <Download size={18} className="text-emerald-100 group-hover:text-white transition-colors" />
                  Download PDF
                </button>
                <div className="w-px h-8 bg-slate-200 mx-1" />
                <button 
                  onClick={onClose}
                  className="p-2 hover:bg-slate-100 rounded-xl transition-colors text-slate-400 hover:text-slate-600"
                >
                  <X size={24} />
                </button>
              </div>
            </div>

            {/* Receipt Content */}
            <div className="flex-1 overflow-y-auto p-10 md:p-16 space-y-16 print:overflow-visible print:p-0 print:h-auto">
              {/* Top Section: Branding & Status */}
              <div className="flex flex-col md:flex-row justify-between items-start gap-12">
                <div className="space-y-6">
                  <div className="flex items-center gap-3">
                    <div className="w-14 h-14 bg-indigo-600 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-indigo-200">
                      <Building2 size={32} />
                    </div>
                    <div>
                      <h1 className="text-3xl font-bold text-slate-900 tracking-tight leading-none">MedFlow</h1>
                      <p className="text-indigo-600 font-semibold tracking-[0.2em] uppercase text-[10px] mt-1">Clinical Excellence</p>
                    </div>
                  </div>
                  <div className="space-y-2 text-sm text-slate-500">
                    <div className="flex items-center gap-2">
                      <MapPin size={14} className="text-slate-400" />
                      <p>123 Healthcare Avenue, Medical District, Suite 400</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Mail size={14} className="text-slate-400" />
                      <p>billing@medflow.clinic</p>
                    </div>
                  </div>
                </div>

                <div className="text-right space-y-6">
                  <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-widest border border-emerald-100 bg-emerald-50 text-emerald-600 shadow-sm">
                    <CheckCircle2 size={14} />
                    Payment Confirmed
                  </div>
                  <div className="space-y-1">
                    <h2 className="text-5xl font-light text-slate-900 tracking-tighter uppercase">Receipt</h2>
                    <p className="text-slate-400 text-sm font-medium tracking-widest uppercase">#{receipt.receiptNumber}</p>
                  </div>
                </div>
              </div>

              {/* Info Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-16 py-12 border-y border-slate-100">
                <div className="space-y-8">
                  <div>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-4">Received From</p>
                    <div className="flex items-start gap-5">
                      <div className="w-16 h-16 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center text-2xl font-bold border border-indigo-100 shadow-sm">
                        {patient?.firstName.charAt(0)}
                      </div>
                      <div className="space-y-1">
                        <p className="text-xl font-bold text-slate-900">{patient ? `${patient.firstName} ${patient.lastName}` : 'Unknown Patient'}</p>
                        <div className="space-y-0.5 text-sm text-slate-500">
                          <p>{patient?.email}</p>
                          <p>{patient?.phone}</p>
                          <p className="text-slate-400 text-xs mt-1 uppercase tracking-widest">Patient ID: {patient?.id.toString().substring(0, 8).toUpperCase()}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-10">
                  <div className="space-y-1">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Payment Date</p>
                    <p className="text-base font-semibold text-slate-900">{format(receipt.createdAt, 'MMMM dd, yyyy')}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Payment Method</p>
                    <div className="flex items-center gap-2 text-base font-semibold text-slate-900">
                      <CreditCard size={16} className="text-slate-400" />
                      <span>{receipt.paymentMethod}</span>
                    </div>
                  </div>
                  <div className="space-y-1">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Invoice Reference</p>
                    <p className="text-base font-semibold text-indigo-600">
                      {receipt.invoiceId ? `Invoice #${receipt.invoiceId}` : 'Direct Payment'}
                    </p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Transaction ID</p>
                    <p className="text-base font-semibold text-slate-900">TXN-{receipt.id.toString().padStart(6, '0')}</p>
                  </div>
                </div>
              </div>

              {/* Payment Summary */}
              <div className="space-y-8">
                <div className="flex items-center justify-between px-2">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Transaction Summary</p>
                  <p className="text-[10px] font-bold text-emerald-600 uppercase tracking-widest">Settled in Full</p>
                </div>
                <div className="bg-slate-50/50 rounded-[2.5rem] border border-slate-100 p-12 shadow-sm relative overflow-hidden group">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/5 rounded-full -mr-16 -mt-16 transition-transform group-hover:scale-110 duration-700" />
                  <div className="flex flex-col md:flex-row justify-between items-center gap-8 relative z-10">
                    <div className="space-y-2 text-center md:text-left">
                      <h3 className="text-lg font-bold text-slate-900">Total Amount Received</h3>
                      <p className="text-sm text-slate-500 max-w-xs leading-relaxed">
                        This payment has been processed and applied to the patient's account balance.
                      </p>
                    </div>
                    <div className="text-center md:text-right">
                      <p className="text-6xl font-bold text-slate-900 tracking-tighter">
                        {formatCurrency(receipt.amount)}
                      </p>
                      <p className="text-[10px] text-emerald-600 font-bold uppercase tracking-[0.2em] mt-2">
                        Electronic Payment Confirmed
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Verification & Footer */}
              <div className="flex flex-col md:flex-row justify-between items-center gap-12 pt-8">
                <div className="flex items-center gap-6">
                  <div className="w-16 h-16 rounded-full border-2 border-emerald-100 flex items-center justify-center text-emerald-500 bg-emerald-50/50">
                    <ShieldCheck size={32} />
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs font-bold text-slate-900 uppercase tracking-widest">Secure Transaction</p>
                    <p className="text-[10px] text-slate-400 font-medium uppercase tracking-widest">Verified by MedFlow Finance</p>
                  </div>
                </div>
                
                <div className="text-center md:text-right space-y-2">
                  <p className="text-[10px] text-slate-400 font-bold uppercase tracking-[0.3em]">Thank you for your payment</p>
                  <p className="text-[9px] text-slate-300 uppercase tracking-widest">MedFlow Clinical Excellence — Patient Billing</p>
                </div>
              </div>

              {/* Footer Note */}
              <div className="pt-16 border-t border-slate-100 text-center space-y-4">
                <p className="text-[9px] text-slate-300 max-w-lg mx-auto leading-relaxed uppercase tracking-widest">
                  This is a computer-generated receipt and serves as official proof of payment. No physical signature is required. For any inquiries regarding this transaction, please quote the receipt number above.
                </p>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
