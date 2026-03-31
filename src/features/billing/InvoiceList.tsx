import React, { useState } from 'react';
import { 
  Plus, 
  Search, 
  FileText, 
  MoreVertical, 
  Eye, 
  Download, 
  Trash2, 
  Pencil,
  User,
  Calendar,
  CreditCard,
  CheckCircle2,
  Clock,
  AlertCircle,
  ArrowRight,
  FileDown,
  ChevronLeft,
  ChevronRight,
  Filter,
  ArrowUpRight,
  Send
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn, formatCurrency } from '@/lib/utils';
import { useTenantDb } from '@/hooks/useTenantDb';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Invoice, Patient } from '@/types';
import { format } from 'date-fns';
import { toast } from 'sonner';
import CreateInvoiceModal from './CreateInvoiceModal';
import InvoiceViewModal from './InvoiceViewModal';
import ConfirmationModal from '@/components/ui/ConfirmationModal';

interface InvoiceListProps {
  searchQuery: string;
}

export default function InvoiceList({ searchQuery }: InvoiceListProps) {
  const { billing, patients } = useTenantDb();
  const queryClient = useQueryClient();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [autoPrint, setAutoPrint] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 7;
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    invoiceId: number | null;
    invoiceNumber: string;
  }>({
    isOpen: false,
    invoiceId: null,
    invoiceNumber: ''
  });

  const { data: invoices = [], isLoading: isInvoicesLoading } = useQuery({
    queryKey: ['invoices'],
    queryFn: () => billing.invoices.list()
  });

  const { data: patientsList = [], isLoading: isPatientsLoading } = useQuery({
    queryKey: ['patients'],
    queryFn: () => patients.list()
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => billing.invoices.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
      toast.success('Invoice deleted successfully');
    }
  });

  const sendMutation = useMutation({
    mutationFn: (id: number) => billing.invoices.update(id, { status: 'Sent' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
      toast.success('Invoice sent successfully');
    }
  });

  const payMutation = useMutation({
    mutationFn: (id: number) => billing.invoices.update(id, { status: 'Paid' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
      toast.success('Invoice marked as paid');
    }
  });

  const getPatientName = (patientId: number) => {
    const patient = patientsList.find(p => p.id === patientId);
    return patient ? `${patient.firstName} ${patient.lastName}` : 'Unknown Patient';
  };

  const getPatient = (patientId: number) => {
    return patientsList.find(p => p.id === patientId) || null;
  };

  const filteredInvoices = invoices.filter(invoice => {
    const patientName = getPatientName(invoice.patientId).toLowerCase();
    const invoiceNumber = invoice.invoiceNumber.toLowerCase();
    const query = searchQuery.toLowerCase();
    return patientName.includes(query) || invoiceNumber.includes(query);
  });

  const handleExport = () => {
    const headers = ['Invoice Number', 'Patient', 'ICD-10', 'Date', 'Amount', 'Status'];
    const csvData = filteredInvoices.map(invoice => [
      invoice.invoiceNumber,
      getPatientName(invoice.patientId),
      invoice.items.map(i => i.icd10_2016_version).filter(Boolean).join('; '),
      format(invoice.createdAt, 'yyyy-MM-dd'),
      invoice.total,
      invoice.status
    ]);

    const csvContent = [
      headers.join(','),
      ...csvData.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `invoices_export_${format(new Date(), 'yyyy-MM-dd')}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const totalPages = Math.ceil(filteredInvoices.length / itemsPerPage);
  const paginatedInvoices = filteredInvoices.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const handleDownloadInvoice = (invoice: Invoice) => {
    setSelectedInvoice(invoice);
    setAutoPrint(true);
    setIsViewModalOpen(true);
  };

  const handleViewInvoice = (invoice: Invoice) => {
    setSelectedInvoice(invoice);
    setAutoPrint(false);
    setIsViewModalOpen(true);
  };

  const handleEditInvoice = (invoice: Invoice) => {
    setSelectedInvoice(invoice);
    setIsEditModalOpen(true);
  };

  const getStatusStyle = (status: string) => {
    switch (status) {
      case 'Paid':
        return 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20';
      case 'Draft':
        return 'bg-orange-500/10 text-orange-600 border-orange-500/20';
      case 'Overdue':
        return 'bg-rose-500/10 text-rose-600 border-rose-500/20';
      default:
        return 'bg-slate-500/10 text-slate-600 border-slate-500/20';
    }
  };

  if (isInvoicesLoading || isPatientsLoading) {
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
            <FileText size={20} />
          </div>
          <div>
            <h2 className="text-xl font-bold text-primary tracking-tight">Invoices</h2>
            <p className="text-primary/40 text-[10px] font-black uppercase tracking-widest mt-0.5">
              {filteredInvoices.length} Total Records
            </p>
          </div>
        </div>
        
        <button 
          onClick={handleExport}
          className="flex items-center gap-2 px-6 py-3 bg-white text-primary border border-primary/5 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-surface-muted transition-all shadow-sm group"
        >
          <FileDown size={16} className="group-hover:-translate-y-0.5 transition-transform" />
          <span>Export Invoices</span>
        </button>
      </div>

      {/* Table Section */}
      <div className="overflow-hidden">
        <table className="w-full border-separate border-spacing-y-4">
          <thead>
            <tr className="text-left">
              <th className="px-8 py-2 text-[10px] font-black text-primary/30 uppercase tracking-[0.2em]">Document</th>
              <th className="px-8 py-2 text-[10px] font-black text-primary/30 uppercase tracking-[0.2em]">Patient Entity</th>
              <th className="px-8 py-2 text-[10px] font-black text-primary/30 uppercase tracking-[0.2em]">ICD-10 Codes</th>
              <th className="px-8 py-2 text-[10px] font-black text-primary/30 uppercase tracking-[0.2em]">Due Date</th>
              <th className="px-8 py-2 text-[10px] font-black text-primary/30 uppercase tracking-[0.2em]">Financials</th>
              <th className="px-8 py-2 text-[10px] font-black text-primary/30 uppercase tracking-[0.2em]">Status</th>
              <th className="px-8 py-2 text-right text-[10px] font-black text-primary/30 uppercase tracking-[0.2em]">Actions</th>
            </tr>
          </thead>
          <tbody>
            {paginatedInvoices.map((invoice, i) => (
              <motion.tr 
                key={invoice.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                className="group relative"
              >
                <td className="px-8 py-6 bg-surface-muted/30 first:rounded-l-[2rem] border-y border-l border-primary/5 group-hover:bg-white group-hover:shadow-2xl group-hover:shadow-primary/5 transition-all duration-500">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center text-primary/20 group-hover:text-accent transition-colors shadow-sm">
                      <FileText size={20} />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-primary tracking-tight">{invoice.invoiceNumber}</p>
                      <p className="text-[10px] text-primary/30 font-black uppercase tracking-widest mt-0.5">Ref: {invoice.appointmentId || 'Manual'}</p>
                    </div>
                  </div>
                </td>
                <td className="px-8 py-6 bg-surface-muted/30 border-y border-primary/5 group-hover:bg-white group-hover:shadow-2xl group-hover:shadow-primary/5 transition-all duration-500">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-primary/5 text-primary flex items-center justify-center text-xs font-black border border-primary/5">
                      {getPatientName(invoice.patientId).charAt(0)}
                    </div>
                    <div>
                      <span className="text-sm font-bold text-primary block">{getPatientName(invoice.patientId)}</span>
                      <span className="text-[10px] text-primary/30 font-black uppercase tracking-widest">Patient Record</span>
                    </div>
                  </div>
                </td>
                <td className="px-8 py-6 bg-surface-muted/30 border-y border-primary/5 group-hover:bg-white group-hover:shadow-2xl group-hover:shadow-primary/5 transition-all duration-500">
                  <div className="flex flex-wrap gap-1 max-w-[150px]">
                    {Array.from(new Set(invoice.items.map(item => item.icd10_2016_version).filter(Boolean))).map((version, idx) => (
                      <span key={idx} className="px-2 py-0.5 bg-accent/5 text-accent rounded text-[10px] font-bold border border-accent/10" title={version || ''}>
                        {version?.includes(': ') ? version.split(': ')[0] : version}
                      </span>
                    ))}
                    {invoice.items.every(item => !item.icd10_2016_version) && (
                      <span className="text-primary/20 text-[10px] italic">N/A</span>
                    )}
                  </div>
                </td>
                <td className="px-8 py-6 bg-surface-muted/30 border-y border-primary/5 group-hover:bg-white group-hover:shadow-2xl group-hover:shadow-primary/5 transition-all duration-500">
                  <p className="text-sm font-medium text-primary/60">{format(invoice.dueDate, 'MMM dd, yyyy')}</p>
                  <p className="text-[10px] text-primary/30 font-black uppercase tracking-widest mt-0.5">Deadline</p>
                </td>
                <td className="px-8 py-6 bg-surface-muted/30 border-y border-primary/5 group-hover:bg-white group-hover:shadow-2xl group-hover:shadow-primary/5 transition-all duration-500">
                  <p className="text-sm font-bold text-primary">{formatCurrency(invoice.total, invoice.currency)}</p>
                  <p className="text-[10px] text-primary/30 font-black uppercase tracking-widest mt-0.5">Total Balance</p>
                </td>
                <td className="px-8 py-6 bg-surface-muted/30 border-y border-primary/5 group-hover:bg-white group-hover:shadow-2xl group-hover:shadow-primary/5 transition-all duration-500">
                  <span className={cn(
                    "inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-[0.15em] border",
                    getStatusStyle(invoice.status)
                  )}>
                    <div className={cn("w-1.5 h-1.5 rounded-full animate-pulse", 
                      invoice.status === 'Paid' ? 'bg-emerald-500' : 
                      invoice.status === 'Overdue' ? 'bg-rose-500' : 'bg-orange-500'
                    )} />
                    {invoice.status.replace('_', ' ')}
                  </span>
                </td>
                <td className="px-8 py-6 bg-surface-muted/30 last:rounded-r-[2rem] border-y border-r border-primary/5 group-hover:bg-white group-hover:shadow-2xl group-hover:shadow-primary/5 transition-all duration-500 text-right">
                  <div className="flex items-center justify-end gap-3">
                    {invoice.status === 'Draft' && (
                      <button 
                        onClick={() => sendMutation.mutate(invoice.id!)}
                        disabled={sendMutation.isPending}
                        className="p-3 bg-indigo-50 border border-indigo-100 rounded-xl text-indigo-600 hover:bg-indigo-600 hover:text-white transition-all shadow-sm hover:scale-110 disabled:opacity-50"
                        title="Send Invoice"
                      >
                        <Send size={16} />
                      </button>
                    )}
                    {invoice.status === 'Sent' && (
                      <button 
                        onClick={() => payMutation.mutate(invoice.id!)}
                        disabled={payMutation.isPending}
                        className="p-3 bg-emerald-50 border border-emerald-100 rounded-xl text-emerald-600 hover:bg-emerald-600 hover:text-white transition-all shadow-sm hover:scale-110 disabled:opacity-50"
                        title="Mark as Paid"
                      >
                        <CheckCircle2 size={16} />
                      </button>
                    )}
                    <button 
                      onClick={() => handleViewInvoice(invoice)}
                      className="p-3 bg-white border border-primary/5 rounded-xl text-primary/40 hover:text-accent hover:border-accent/20 transition-all shadow-sm hover:scale-110"
                      title="View Details"
                    >
                      <Eye size={16} />
                    </button>
                    <button 
                      onClick={() => handleEditInvoice(invoice)}
                      className="p-3 bg-blue-50 border border-blue-100 rounded-xl text-blue-600 hover:bg-blue-600 hover:text-white transition-all shadow-sm hover:scale-110"
                      title="Edit Invoice"
                    >
                      <Pencil size={16} />
                    </button>
                    <button 
                      onClick={() => handleDownloadInvoice(invoice)}
                      className="p-3 bg-white border border-primary/5 rounded-xl text-primary/40 hover:text-accent hover:border-accent/20 transition-all shadow-sm hover:scale-110"
                      title="Download PDF"
                    >
                      <Download size={16} />
                    </button>
                    <button 
                      onClick={() => {
                        setConfirmModal({
                          isOpen: true,
                          invoiceId: invoice.id!,
                          invoiceNumber: invoice.invoiceNumber
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

            {filteredInvoices.length === 0 && (
              <tr>
                <td colSpan={7} className="px-8 py-24 text-center">
                  <div className="flex flex-col items-center justify-center">
                    <div className="w-20 h-20 bg-primary/5 rounded-[2rem] flex items-center justify-center text-primary/10 mb-6">
                      <FileText size={40} />
                    </div>
                    <p className="text-sm font-black text-primary/20 uppercase tracking-[0.3em]">No Invoice Records Found</p>
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
            Showing {((currentPage - 1) * itemsPerPage) + 1} — {Math.min(currentPage * itemsPerPage, filteredInvoices.length)} of {filteredInvoices.length} Records
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
        <CreateInvoiceModal 
          isOpen={isModalOpen} 
          onClose={() => setIsModalOpen(false)} 
        />
      )}

      {isEditModalOpen && selectedInvoice && (
        <CreateInvoiceModal 
          isOpen={isEditModalOpen} 
          onClose={() => {
            setIsEditModalOpen(false);
            setSelectedInvoice(null);
          }} 
          invoice={selectedInvoice}
        />
      )}

      {isViewModalOpen && selectedInvoice && (
        <InvoiceViewModal
          isOpen={isViewModalOpen}
          onClose={() => {
            setIsViewModalOpen(false);
            setAutoPrint(false);
          }}
          invoice={selectedInvoice}
          patient={getPatient(selectedInvoice.patientId)}
          autoPrint={autoPrint}
        />
      )}

      <ConfirmationModal
        isOpen={confirmModal.isOpen}
        onClose={() => setConfirmModal({ isOpen: false, invoiceId: null, invoiceNumber: '' })}
        onConfirm={() => {
          if (confirmModal.invoiceId) {
            deleteMutation.mutate(confirmModal.invoiceId);
            setConfirmModal({ isOpen: false, invoiceId: null, invoiceNumber: '' });
          }
        }}
        title="Delete Invoice"
        description={`Are you sure you want to permanently remove invoice ${confirmModal.invoiceNumber}? This action cannot be undone and will affect financial reports.`}
        variant="danger"
        confirmText="Delete Invoice"
      />
    </div>
  );
}
