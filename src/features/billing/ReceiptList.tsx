import React, { useState } from 'react';
import { 
  Plus, 
  Search, 
  Receipt as ReceiptIcon, 
  MoreVertical, 
  Eye, 
  Download, 
  Trash2, 
  User,
  Calendar,
  CreditCard,
  CheckCircle2,
  Clock,
  AlertCircle,
  ArrowRight,
  XCircle,
  FileDown,
  ChevronLeft,
  ChevronRight,
  ArrowUpRight
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn, formatCurrency } from '@/lib/utils';
import { useTenantDb } from '@/hooks/useTenantDb';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Receipt, Patient } from '@/types';
import { format } from 'date-fns';
import { toast } from 'sonner';
import CreateReceiptModal from './CreateReceiptModal';
import ReceiptViewModal from './ReceiptViewModal';
import ConfirmationModal from '@/components/ui/ConfirmationModal';

interface ReceiptListProps {
  searchQuery: string;
}

export default function ReceiptList({ searchQuery }: ReceiptListProps) {
  const { billing, patients } = useTenantDb();
  const queryClient = useQueryClient();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedReceipt, setSelectedReceipt] = useState<Receipt | null>(null);
  const [autoPrint, setAutoPrint] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 7;
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    receiptId: number | null;
    receiptNumber: string;
  }>({
    isOpen: false,
    receiptId: null,
    receiptNumber: ''
  });

  const { data: receipts = [], isLoading: isReceiptsLoading } = useQuery({
    queryKey: ['receipts'],
    queryFn: () => billing.receipts.list()
  });

  const { data: patientsList = [], isLoading: isPatientsLoading } = useQuery({
    queryKey: ['patients'],
    queryFn: () => patients.list()
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => billing.receipts.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['receipts'] });
      toast.success('Receipt deleted successfully');
    }
  });

  const getPatientName = (patientId: number) => {
    const patient = patientsList.find(p => p.id === patientId);
    return patient ? `${patient.firstName} ${patient.lastName}` : 'Unknown Patient';
  };

  const filteredReceipts = receipts.filter(receipt => {
    const patientName = getPatientName(receipt.patientId).toLowerCase();
    const receiptNumber = receipt.receiptNumber.toLowerCase();
    const query = searchQuery.toLowerCase();
    return patientName.includes(query) || receiptNumber.includes(query);
  });

  const handleExport = () => {
    const headers = ['Receipt Number', 'Patient', 'Date', 'Amount', 'Method'];
    const csvData = filteredReceipts.map(receipt => [
      receipt.receiptNumber,
      getPatientName(receipt.patientId),
      format(receipt.createdAt, 'yyyy-MM-dd'),
      receipt.amount,
      receipt.paymentMethod
    ]);

    const csvContent = [
      headers.join(','),
      ...csvData.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `receipts_export_${format(new Date(), 'yyyy-MM-dd')}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const totalPages = Math.ceil(filteredReceipts.length / itemsPerPage);
  const paginatedReceipts = filteredReceipts.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const handleDownloadReceipt = (receipt: Receipt) => {
    setSelectedReceipt(receipt);
    setAutoPrint(true);
  };

  if (isReceiptsLoading || isPatientsLoading) {
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
            <ReceiptIcon size={20} />
          </div>
          <div>
            <h2 className="text-xl font-bold text-primary tracking-tight">Receipts</h2>
            <p className="text-primary/40 text-[10px] font-black uppercase tracking-widest mt-0.5">
              {filteredReceipts.length} Total Receipts
            </p>
          </div>
        </div>
        
        <button 
          onClick={handleExport}
          className="flex items-center gap-2 px-6 py-3 bg-white text-primary border border-primary/5 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-surface-muted transition-all shadow-sm group"
        >
          <FileDown size={16} className="group-hover:-translate-y-0.5 transition-transform" />
          <span>Export Receipts</span>
        </button>
      </div>

      {/* Table Section */}
      <div className="overflow-hidden">
        <table className="w-full border-separate border-spacing-y-4">
          <thead>
            <tr className="text-left">
              <th className="px-8 py-2 text-[10px] font-black text-primary/30 uppercase tracking-[0.2em]">Transaction</th>
              <th className="px-8 py-2 text-[10px] font-black text-primary/30 uppercase tracking-[0.2em]">Patient Entity</th>
              <th className="px-8 py-2 text-[10px] font-black text-primary/30 uppercase tracking-[0.2em]">Payment Date</th>
              <th className="px-8 py-2 text-[10px] font-black text-primary/30 uppercase tracking-[0.2em]">Amount Paid</th>
              <th className="px-8 py-2 text-[10px] font-black text-primary/30 uppercase tracking-[0.2em]">Method</th>
              <th className="px-8 py-2 text-right text-[10px] font-black text-primary/30 uppercase tracking-[0.2em]">Actions</th>
            </tr>
          </thead>
          <tbody>
            {paginatedReceipts.map((receipt, i) => (
              <motion.tr 
                key={receipt.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                className="group relative"
              >
                <td className="px-8 py-6 bg-surface-muted/30 first:rounded-l-[2rem] border-y border-l border-primary/5 group-hover:bg-white group-hover:shadow-2xl group-hover:shadow-primary/5 transition-all duration-500">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center text-primary/20 group-hover:text-accent transition-colors shadow-sm">
                      <ReceiptIcon size={20} />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-primary tracking-tight">{receipt.receiptNumber}</p>
                      <p className="text-[10px] text-primary/30 font-black uppercase tracking-widest mt-0.5">Inv: {receipt.invoiceId || 'Direct'}</p>
                    </div>
                  </div>
                </td>
                <td className="px-8 py-6 bg-surface-muted/30 border-y border-primary/5 group-hover:bg-white group-hover:shadow-2xl group-hover:shadow-primary/5 transition-all duration-500">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-primary/5 text-primary flex items-center justify-center text-xs font-black border border-primary/5">
                      {getPatientName(receipt.patientId).charAt(0)}
                    </div>
                    <div>
                      <span className="text-sm font-bold text-primary block">{getPatientName(receipt.patientId)}</span>
                      <span className="text-[10px] text-primary/30 font-black uppercase tracking-widest">Patient Record</span>
                    </div>
                  </div>
                </td>
                <td className="px-8 py-6 bg-surface-muted/30 border-y border-primary/5 group-hover:bg-white group-hover:shadow-2xl group-hover:shadow-primary/5 transition-all duration-500">
                  <p className="text-sm font-medium text-primary/60">{format(receipt.createdAt, 'MMM dd, yyyy')}</p>
                  <p className="text-[10px] text-primary/30 font-black uppercase tracking-widest mt-0.5">Cleared</p>
                </td>
                <td className="px-8 py-6 bg-surface-muted/30 border-y border-primary/5 group-hover:bg-white group-hover:shadow-2xl group-hover:shadow-primary/5 transition-all duration-500">
                  <p className="text-sm font-bold text-primary">{formatCurrency(receipt.amount)}</p>
                  <p className="text-[10px] text-primary/30 font-black uppercase tracking-widest mt-0.5">Total Received</p>
                </td>
                <td className="px-8 py-6 bg-surface-muted/30 border-y border-primary/5 group-hover:bg-white group-hover:shadow-2xl group-hover:shadow-primary/5 transition-all duration-500">
                  <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-[0.15em] border border-primary/5 bg-primary/5 text-primary/60">
                    <CreditCard size={14} />
                    {receipt.paymentMethod}
                  </span>
                </td>
                <td className="px-8 py-6 bg-surface-muted/30 last:rounded-r-[2rem] border-y border-r border-primary/5 group-hover:bg-white group-hover:shadow-2xl group-hover:shadow-primary/5 transition-all duration-500 text-right">
                  <div className="flex items-center justify-end gap-3">
                    <button 
                      onClick={() => {
                        setSelectedReceipt(receipt);
                        setAutoPrint(false);
                      }}
                      className="p-3 bg-white border border-primary/5 rounded-xl text-primary/40 hover:text-accent hover:border-accent/20 transition-all shadow-sm hover:scale-110"
                      title="View Details"
                    >
                      <Eye size={16} />
                    </button>
                    <button 
                      onClick={() => handleDownloadReceipt(receipt)}
                      className="p-3 bg-white border border-primary/5 rounded-xl text-primary/40 hover:text-accent hover:border-accent/20 transition-all shadow-sm hover:scale-110"
                      title="Download PDF"
                    >
                      <Download size={16} />
                    </button>
                    <button 
                      onClick={() => {
                        setConfirmModal({
                          isOpen: true,
                          receiptId: receipt.id!,
                          receiptNumber: receipt.receiptNumber
                        });
                      }}
                      className="p-3 bg-white border border-primary/5 rounded-xl text-primary/40 hover:text-rose-500 hover:border-rose-500/20 transition-all shadow-sm hover:scale-110"
                      title="Delete Record"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </td>
              </motion.tr>
            ))}

            {filteredReceipts.length === 0 && (
              <tr>
                <td colSpan={6} className="px-8 py-24 text-center">
                  <div className="flex flex-col items-center justify-center">
                    <div className="w-20 h-20 bg-primary/5 rounded-[2rem] flex items-center justify-center text-primary/10 mb-6">
                      <ReceiptIcon size={40} />
                    </div>
                    <p className="text-sm font-black text-primary/20 uppercase tracking-[0.3em]">No Receipt Records Found</p>
                  </div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination: Premium Style */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between px-10 py-6 bg-surface-muted/30 rounded-[2.5rem] border border-primary/5">
          <p className="text-[10px] font-black text-primary/30 uppercase tracking-[0.2em]">
            Showing {((currentPage - 1) * itemsPerPage) + 1} — {Math.min(currentPage * itemsPerPage, filteredReceipts.length)} of {filteredReceipts.length} Records
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

      {isModalOpen && (
        <CreateReceiptModal 
          isOpen={isModalOpen} 
          onClose={() => setIsModalOpen(false)} 
        />
      )}

      {selectedReceipt && (
        <ReceiptViewModal
          isOpen={!!selectedReceipt}
          onClose={() => {
            setSelectedReceipt(null);
            setAutoPrint(false);
          }}
          receipt={selectedReceipt}
          patient={patientsList.find(p => p.id === selectedReceipt.patientId) || null}
          autoPrint={autoPrint}
        />
      )}

      <ConfirmationModal
        isOpen={confirmModal.isOpen}
        onClose={() => setConfirmModal({ isOpen: false, receiptId: null, receiptNumber: '' })}
        onConfirm={() => {
          if (confirmModal.receiptId) {
            deleteMutation.mutate(confirmModal.receiptId);
            setConfirmModal({ isOpen: false, receiptId: null, receiptNumber: '' });
          }
        }}
        title="Delete Receipt"
        description={`Are you sure you want to permanently remove receipt ${confirmModal.receiptNumber}? This action cannot be undone and will affect financial reports.`}
        variant="danger"
        confirmText="Delete Receipt"
      />
    </div>
  );
}
