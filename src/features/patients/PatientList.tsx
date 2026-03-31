import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { usePatients } from './usePatients';
import { Plus, Search, MoreVertical, Mail, Phone, Users, ChevronLeft, ChevronRight, Hash, Edit2, Trash2, Calendar } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import PatientModal from './PatientModal';
import BookingModal from '../appointments/BookingModal';
import { useTenantDb } from '@/hooks/useTenantDb';
import { useQueryClient } from '@tanstack/react-query';
import ConfirmationModal from '@/components/ui/ConfirmationModal';

const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');

export default function PatientList() {
  const [page, setPage] = useState(1);
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isBookingModalOpen, setIsBookingModalOpen] = useState(false);
  const [selectedPatient, setSelectedPatient] = useState<any>(null);
  const [activeMenu, setActiveMenu] = useState<number | null>(null);
  
  const pageSize = 7;
  const { patients, total, totalPages, isLoading } = usePatients(page, pageSize);
  const { patients: patientService } = useTenantDb();
  const queryClient = useQueryClient();

  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    patientId: number | null;
    patientName: string;
  }>({
    isOpen: false,
    patientId: null,
    patientName: ''
  });

  const handleAddPatient = () => {
    setSelectedPatient(null);
    setIsModalOpen(true);
  };

  const handleEditPatient = (patient: any) => {
    setSelectedPatient(patient);
    setIsModalOpen(true);
    setActiveMenu(null);
  };

  const handleDeletePatient = (id: number) => {
    const patient = patients.find(p => p.id === id);
    if (!patient) return;

    setConfirmModal({
      isOpen: true,
      patientId: id,
      patientName: `${patient.firstName} ${patient.lastName}`
    });
    setActiveMenu(null);
  };

  const confirmDelete = async () => {
    if (confirmModal.patientId) {
      await patientService.delete(confirmModal.patientId);
      queryClient.invalidateQueries({ queryKey: ['patients'] });
      setConfirmModal({ isOpen: false, patientId: null, patientName: '' });
    }
  };

  return (
    <div className="space-y-6 relative">
      {/* Header Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-primary/20" />
          <input 
            type="text" 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search patients by name, email or phone..." 
            className="w-full pl-12 pr-4 py-3 bg-white border border-primary/5 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent transition-all shadow-sm shadow-primary/5"
          />
        </div>
        <button 
          onClick={handleAddPatient}
          className="flex items-center justify-center gap-2 px-6 py-3 bg-primary text-white rounded-2xl font-bold text-sm hover:opacity-90 transition-all shadow-lg shadow-primary/10"
        >
          <Plus className="w-4 h-4" />
          Add Patient
        </button>
      </div>

      <div className="flex gap-6">
        {/* Main List */}
        <div className="flex-1 space-y-6">
          <div className="bg-white rounded-[32px] border border-primary/5 shadow-xl shadow-primary/5 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-surface-muted border-b border-primary/5">
                    <th className="px-8 py-5 text-[10px] font-bold text-primary/40 uppercase tracking-widest">Patient Name</th>
                    <th className="px-8 py-5 text-[10px] font-bold text-primary/40 uppercase tracking-widest">Contact Info</th>
                    <th className="px-8 py-5 text-[10px] font-bold text-primary/40 uppercase tracking-widest">Date of Birth</th>
                    <th className="px-8 py-5 text-[10px] font-bold text-primary/40 uppercase tracking-widest">Status</th>
                    <th className="px-8 py-5 text-[10px] font-bold text-primary/40 uppercase tracking-widest text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-primary/5">
                  <AnimatePresence mode="wait">
                    {isLoading ? (
                      <motion.tr 
                        key="loading"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                      >
                        <td colSpan={5} className="px-8 py-16 text-center text-primary/30 font-medium">Loading clinic records...</td>
                      </motion.tr>
                    ) : patients.length === 0 ? (
                      <motion.tr 
                        key="empty"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                      >
                        <td colSpan={5} className="px-8 py-24 text-center">
                          <div className="flex flex-col items-center gap-4">
                            <div className="w-16 h-16 rounded-full bg-surface-muted flex items-center justify-center text-primary/10">
                              <Users className="w-8 h-8" />
                            </div>
                            <p className="text-primary font-serif text-xl">No patients found</p>
                            <p className="text-primary/40 text-sm max-w-xs mx-auto">Start by adding your first patient to the clinic's digital registry.</p>
                          </div>
                        </td>
                      </motion.tr>
                    ) : (
                      patients.map((patient, idx) => (
                        <motion.tr 
                          key={patient.id}
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: idx * 0.05 }}
                          className="hover:bg-surface-muted/50 transition-colors group"
                        >
                          <td className="px-8 py-5">
                            <div className="flex items-center gap-4">
                              <div className="w-12 h-12 rounded-xl bg-accent/10 flex items-center justify-center text-accent font-bold text-sm">
                                {patient.firstName[0]}{patient.lastName[0]}
                              </div>
                              <div>
                                <p className="text-base font-bold text-primary">{patient.firstName} {patient.lastName}</p>
                                <p className="text-[10px] text-primary/30 font-bold uppercase tracking-wider">ID: {patient.id}</p>
                              </div>
                            </div>
                          </td>
                          <td className="px-8 py-5">
                            <div className="space-y-1">
                              <div className="flex items-center gap-2 text-xs text-primary/60">
                                <Mail className="w-3 h-3 text-primary/20" />
                                {patient.email}
                              </div>
                              <div className="flex items-center gap-2 text-xs text-primary/60">
                                <Phone className="w-3 h-3 text-primary/20" />
                                {patient.phone}
                              </div>
                            </div>
                          </td>
                          <td className="px-8 py-5 text-sm text-primary/60 font-medium">
                            {new Date(patient.dob).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' })}
                          </td>
                          <td className="px-8 py-5">
                            <span className="px-3 py-1 rounded-full bg-accent/10 text-accent text-[10px] font-bold uppercase tracking-wider">Active</span>
                          </td>
                          <td className="px-8 py-5 text-right relative">
                            <div className="flex items-center justify-end gap-2">
                              <Link 
                                to={`/patients/${patient.id}`}
                                className="p-2 text-primary/20 hover:text-primary hover:bg-surface-muted rounded-xl transition-all"
                              >
                                <ChevronRight className="w-5 h-5" />
                              </Link>
                              <button 
                                onClick={() => setActiveMenu(activeMenu === patient.id ? null : patient.id)}
                                className="p-2 text-primary/20 hover:text-primary hover:bg-surface-muted rounded-xl transition-all"
                              >
                                <MoreVertical className="w-5 h-5" />
                              </button>
                            </div>

                            <AnimatePresence>
                              {activeMenu === patient.id && (
                                <motion.div
                                  initial={{ opacity: 0, scale: 0.95, y: -10 }}
                                  animate={{ opacity: 1, scale: 1, y: 0 }}
                                  exit={{ opacity: 0, scale: 0.95, y: -10 }}
                                  className="absolute right-8 top-12 w-48 bg-white rounded-2xl shadow-2xl border border-primary/5 z-20 overflow-hidden"
                                >
                                  <button 
                                    onClick={() => {
                                      setSelectedPatient(patient);
                                      setIsBookingModalOpen(true);
                                      setActiveMenu(null);
                                    }}
                                    className="w-full flex items-center gap-3 px-4 py-3 text-sm font-medium text-primary hover:bg-surface-muted transition-colors"
                                  >
                                    <Calendar size={14} className="text-primary/40" />
                                    Book Appointment
                                  </button>
                                  <button 
                                    onClick={() => handleEditPatient(patient)}
                                    className="w-full flex items-center gap-3 px-4 py-3 text-sm font-medium text-primary hover:bg-surface-muted transition-colors"
                                  >
                                    <Edit2 size={14} className="text-primary/40" />
                                    Edit Profile
                                  </button>
                                  <button 
                                    onClick={() => handleDeletePatient(patient.id)}
                                    className="w-full flex items-center gap-3 px-4 py-3 text-sm font-medium text-red-500 hover:bg-red-50 transition-colors"
                                  >
                                    <Trash2 size={14} className="text-red-400" />
                                    Delete Record
                                  </button>
                                </motion.div>
                              )}
                            </AnimatePresence>
                          </td>
                        </motion.tr>
                      ))
                    )}
                  </AnimatePresence>
                </tbody>
              </table>
            </div>
          </div>

          {/* Premium Pagination Slider */}
          <div className="flex items-center justify-between bg-white p-6 rounded-[32px] border border-primary/5 shadow-xl shadow-primary/5">
            <div className="flex items-center gap-6">
              <div className="flex items-center gap-2">
                <button 
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="p-3 rounded-2xl bg-surface-muted text-primary/40 hover:bg-primary hover:text-white disabled:opacity-30 transition-all"
                >
                  <ChevronLeft size={20} />
                </button>
                <button 
                  onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  className="p-3 rounded-2xl bg-surface-muted text-primary/40 hover:bg-primary hover:text-white disabled:opacity-30 transition-all"
                >
                  <ChevronRight size={20} />
                </button>
              </div>
              
              <div className="h-8 w-px bg-primary/5" />
              
              <div className="flex flex-col">
                <span className="text-[10px] font-bold uppercase tracking-widest text-primary/30">Page {page} of {totalPages}</span>
                <span className="text-sm font-bold text-primary">{total} Total Records</span>
              </div>
            </div>

            <div className="flex-1 max-w-md mx-12 relative group">
              <input 
                type="range" 
                min="1" 
                max={totalPages || 1} 
                value={page}
                onChange={(e) => setPage(parseInt(e.target.value))}
                className="w-full h-1.5 bg-primary/5 rounded-full appearance-none cursor-pointer accent-primary"
              />
              <div className="absolute -top-8 left-0 right-0 flex justify-between opacity-0 group-hover:opacity-100 transition-opacity">
                <span className="text-[10px] font-bold text-primary/20">1</span>
                <span className="text-[10px] font-bold text-primary/20">{totalPages}</span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {[...Array(Math.min(5, totalPages))].map((_, i) => {
                const p = i + 1;
                return (
                  <button
                    key={p}
                    onClick={() => setPage(p)}
                    className={cn(
                      "w-10 h-10 rounded-xl text-xs font-bold transition-all",
                      page === p 
                        ? "bg-primary text-white shadow-lg shadow-primary/20" 
                        : "bg-surface-muted text-primary/40 hover:bg-primary/5"
                    )}
                  >
                    {p}
                  </button>
                );
              })}
              {totalPages > 5 && <span className="text-primary/20">...</span>}
            </div>
          </div>
        </div>

        {/* Alphabetic Quick Jump Sidebar */}
        <div className="hidden lg:flex flex-col gap-1 p-4 bg-white rounded-[32px] border border-primary/5 shadow-xl shadow-primary/5 sticky top-24 h-fit">
          <button className="p-2 rounded-lg text-primary/20 hover:text-primary transition-colors">
            <Hash size={14} />
          </button>
          {ALPHABET.map(letter => (
            <button 
              key={letter}
              className="w-8 h-8 flex items-center justify-center text-[10px] font-bold text-primary/30 hover:bg-primary hover:text-white rounded-lg transition-all"
            >
              {letter}
            </button>
          ))}
        </div>
      </div>

      <PatientModal 
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setSelectedPatient(null);
        }}
        patient={selectedPatient}
      />

      <BookingModal 
        isOpen={isBookingModalOpen}
        onClose={() => {
          setIsBookingModalOpen(false);
          setSelectedPatient(null);
        }}
        patientId={selectedPatient?.id}
      />

      <ConfirmationModal
        isOpen={confirmModal.isOpen}
        onClose={() => setConfirmModal({ isOpen: false, patientId: null, patientName: '' })}
        onConfirm={confirmDelete}
        title="Delete Patient Record"
        description={`Are you sure you want to permanently remove ${confirmModal.patientName} from the clinic's digital registry? This action cannot be undone.`}
        variant="danger"
        confirmText="Delete Record"
      />
    </div>
  );
}
