import React, { useState, useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Users, 
  Clock, 
  CheckCircle2, 
  PlayCircle,
  Timer,
  User,
  ArrowRight,
  ClipboardList,
  History as HistoryIcon,
  Activity,
  ArrowUpRight,
  MoreHorizontal,
  Search
} from 'lucide-react';
import { useTenantDb } from '@/hooks/useTenantDb';
import { useDoctorDb } from '@/hooks/useDoctorDb';
import { isSameDay, format, differenceInMinutes } from 'date-fns';
import { Appointment, Patient, User as Therapist, BillingItem } from '@/types';
import { useAuthStore } from '@/store/useAuthStore';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import ReviewModal from './ReviewModal';
import DiarySection from './DiarySection';

export default function QueueBoard() {
  const { appointments, patients, users, billing } = useTenantDb();
  const { encounters } = useDoctorDb();
  const { user: currentUser } = useAuthStore();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const today = new Date();

  const [reviewingAptId, setReviewingAptId] = useState<number | null>(null);
  const [reviewNotes, setReviewNotes] = useState('');
  const [isEndingReview, setIsEndingReview] = useState(false);

  const { data: appointmentList = [] } = useQuery({
    queryKey: ['appointments', 'today'],
    queryFn: () => appointments.list(),
  });

  const { data: patientList = [] } = useQuery({
    queryKey: ['patients'],
    queryFn: () => patients.list(),
  });

  const { data: therapistList = [] } = useQuery({
    queryKey: ['users'],
    queryFn: () => users.list(),
  });

  const { data: encounterList = [] } = useQuery({
    queryKey: ['doctor-encounters'],
    queryFn: () => encounters.list(),
  });

  const therapists = useMemo(() => {
    const filtered = therapistList.filter(u => u.role === 'therapist' || u.role === 'doctor');
    // If current user is a doctor/therapist, put them first
    if (currentUser && (currentUser.role === 'doctor' || currentUser.role === 'therapist')) {
      return [...filtered].sort((a, b) => a.id === currentUser.id ? -1 : b.id === currentUser.id ? 1 : 0);
    }
    return filtered;
  }, [therapistList, currentUser]);

  const getQueueForTherapist = (therapistId: number) => {
    return appointmentList
      .filter(a => 
        a.therapistId === therapistId && 
        isSameDay(new Date(a.startTime), today) &&
        ['arrived', 'in-progress', 'completed'].includes(a.status)
      )
      .sort((a, b) => {
        if (a.status === 'in-progress') return -1;
        if (b.status === 'in-progress') return 1;
        if (a.status === 'completed') return 1;
        if (b.status === 'completed') return -1;
        return (a.arrivedAt || 0) - (b.arrivedAt || 0);
      });
  };

  const handleStartConsultation = (apt: Appointment) => {
    // In a real app, we'd create a ClinicalEncounter first or use the appointment ID
    // For now, we'll navigate to the wizard with the appointment ID as a placeholder for encounter ID
    navigate(`/doctor/encounters/${apt.id}/history`);
  };

  const handleStartReview = async (apt: Appointment) => {
    try {
      await appointments.update(apt.id!, { status: 'in-progress' });
      
      const existingEncounter = encounterList.find(e => e.appointmentId === apt.id);
      if (!existingEncounter) {
        await encounters.start({
          patientId: apt.patientId,
          doctorId: currentUser!.id!,
          appointmentId: apt.id,
          encounterType: 'InitialConsultation',
          chiefComplaint: '',
        });
      }
      
      setReviewingAptId(apt.id!);
      setReviewNotes('');
      queryClient.invalidateQueries({ queryKey: ['appointments'] });
      queryClient.invalidateQueries({ queryKey: ['doctor-encounters'] });
      toast.success('Review started');
    } catch (error) {
      console.error('Failed to start review:', error);
      toast.error('Failed to start review');
    }
  };

  const handleDiaryReview = (apt: Appointment) => {
    const canManage = currentUser?.id === apt.therapistId || currentUser?.role === 'admin' || currentUser?.role === 'doctor';
    if (canManage) {
      handleStartReview(apt);
    } else {
      toast.error('You do not have permission to review this session');
    }
  };

  const handleEndReview = async (notes: string, icd10_2016_version?: string, selectedServices?: BillingItem[]) => {
    if (!reviewingAptId) return;
    setIsEndingReview(true);
    try {
      const appointment = appointmentList.find(a => a.id === reviewingAptId);
      if (!appointment) throw new Error('Appointment not found');

      await appointments.update(reviewingAptId, { status: 'completed', endTime: Date.now() });
      
      const encounter = encounterList.find(e => e.appointmentId === reviewingAptId);
      if (encounter) {
        // Only save and sign if it's still a draft
        // We check the latest status from the list
        if (encounter.status === 'Draft') {
          try {
            await encounters.saveDraft(encounter.id!, { 
              chiefComplaint: notes,
              icd10_2016_version
            });
            await encounters.sign(encounter.id!, currentUser!.id!);
            toast.success('Review completed and signed');
          } catch (err: any) {
            // If it's already signed, we can ignore the saveDraft error but we should know
            if (err.message?.includes('Draft status')) {
              console.warn('Encounter already signed or not in draft status');
            } else {
              throw err;
            }
          }
        } else {
          toast.info('Review already signed, skipping update');
        }
      }

      // Create Invoice if services selected
      if (selectedServices && selectedServices.length > 0) {
        const subtotal = selectedServices.reduce((acc, item) => acc + item.price, 0);
        const tax = subtotal * 0.15; // 15% tax
        const total = subtotal + tax;
        
        await billing.invoices.create({
          patientId: appointment.patientId,
          appointmentId: reviewingAptId,
          invoiceNumber: `INV-${Date.now().toString().slice(-6)}`,
          items: selectedServices.map(item => ({
            itemId: item.id!,
            name: item.name,
            quantity: 1,
            price: item.price,
            total: item.price,
            icd10_2016_version
          })),
          subtotal,
          tax,
          total,
          status: 'Draft',
          dueDate: Date.now() + (7 * 24 * 60 * 60 * 1000),
        });
        toast.success('Invoice draft created');
      }
      
      setReviewingAptId(null);
      setReviewNotes('');
      queryClient.invalidateQueries({ queryKey: ['appointments'] });
      queryClient.invalidateQueries({ queryKey: ['doctor-encounters'] });
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
    } catch (error) {
      console.error('Failed to end review:', error);
      toast.error('Failed to end review');
    } finally {
      setIsEndingReview(false);
    }
  };

  return (
    <div className="max-w-[1600px] mx-auto px-8 py-16 space-y-20 min-h-screen pb-40 bg-[#FBFBFC]">
      {/* Header Section: Editorial Masterpiece */}
      <header className="flex flex-col lg:flex-row lg:items-end justify-between gap-16 relative">
        <div className="absolute -top-24 -left-24 w-96 h-96 bg-primary/5 rounded-full blur-[120px] -z-10" />
        
        <motion.div
          initial={{ opacity: 0, x: -30 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          className="max-w-3xl"
        >
          <div className="flex items-center gap-6 mb-8">
            <motion.div 
              whileHover={{ rotate: 12, scale: 1.1 }}
              className="w-16 h-16 rounded-[2rem] bg-primary text-white flex items-center justify-center shadow-2xl shadow-primary/30"
            >
              <Activity size={32} />
            </motion.div>
            <div className="h-px w-16 bg-primary/10" />
            <span className="text-[11px] font-black uppercase tracking-[0.5em] text-primary/30">Clinical Operations Nexus</span>
          </div>
          
          <h1 className="text-7xl lg:text-8xl font-serif text-primary tracking-tighter leading-[0.85] mb-8">
            Patient Flow <br />
            <span className="text-accent italic font-light">Intelligence</span>
          </h1>
          
          <p className="text-primary/50 text-xl font-light leading-relaxed max-w-lg border-l-2 border-accent/20 pl-8">
            Real-time synchronization of clinical encounters, therapist availability, and patient journey tracking.
          </p>
        </motion.div>
        
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="flex flex-col sm:flex-row items-center gap-8 bg-white/50 backdrop-blur-xl p-8 rounded-[3rem] border border-white shadow-2xl shadow-primary/5"
        >
          <div className="flex -space-x-4">
            {therapists.slice(0, 5).map((t, i) => (
              <motion.div 
                key={t.id} 
                whileHover={{ y: -8, scale: 1.1, zIndex: 20 }}
                className="w-14 h-14 rounded-2xl border-4 border-white bg-surface-muted flex items-center justify-center text-xs font-black shadow-xl cursor-pointer transition-all"
                style={{ zIndex: 10 - i }}
              >
                {t.name[0]}
              </motion.div>
            ))}
            {therapists.length > 5 && (
              <div className="w-14 h-14 rounded-2xl border-4 border-white bg-primary text-white flex items-center justify-center text-xs font-black z-0 shadow-xl">
                +{therapists.length - 5}
              </div>
            )}
          </div>
          <div className="h-12 w-px bg-primary/10 hidden sm:block" />
          <div className="flex items-center gap-10">
            <div className="text-center sm:text-right">
              <p className="text-[10px] font-black uppercase tracking-[0.3em] text-primary/20 mb-1">Active Staff</p>
              <p className="text-3xl font-bold text-primary tracking-tighter">{therapists.length}</p>
            </div>
            <div className="text-center sm:text-right">
              <p className="text-[10px] font-black uppercase tracking-[0.3em] text-primary/20 mb-1">Live Queue</p>
              <p className="text-3xl font-bold text-accent tracking-tighter">{appointmentList.filter(a => isSameDay(new Date(a.startTime), today) && a.status === 'arrived').length}</p>
            </div>
          </div>
        </motion.div>
      </header>

      {/* Main Grid: Technical Dashboard Reimagined */}
      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-10">
        {therapists.map((therapist, idx) => {
          const queue = getQueueForTherapist(therapist.id!);
          const activeApt = queue.find(a => a.status === 'in-progress');
          const waiting = queue.filter(a => a.status === 'arrived');
          const completed = queue.filter(a => a.status === 'completed');
          const isMe = currentUser?.id === therapist.id;
          const canManage = isMe || currentUser?.role === 'admin' || currentUser?.role === 'doctor';

          return (
            <motion.div 
              key={therapist.id}
              initial={{ opacity: 0, y: 40 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.1, duration: 0.6 }}
              className={cn(
                "flex flex-col h-full bg-white rounded-[3.5rem] border border-primary/5 shadow-[0_15px_50px_rgba(0,0,0,0.03)] overflow-hidden group transition-all duration-700 hover:shadow-[0_40px_80px_rgba(0,0,0,0.08)] hover:-translate-y-2",
                isMe && "ring-2 ring-accent/30 border-accent/20"
              )}
            >
              {/* Therapist Header: Premium Glass */}
              <div className={cn(
                "p-10 flex items-center justify-between border-b border-primary/5",
                isMe ? "bg-accent/[0.03]" : "bg-white"
              )}>
                <div className="flex items-center gap-6">
                  <div className="relative">
                    <motion.div 
                      whileHover={{ scale: 1.05 }}
                      className={cn(
                        "w-20 h-20 rounded-[2rem] flex items-center justify-center text-2xl font-black transition-all duration-700 shadow-2xl",
                        isMe 
                          ? "bg-primary text-white shadow-primary/30" 
                          : "bg-surface-muted text-primary/20 group-hover:bg-primary group-hover:text-white group-hover:shadow-primary/20"
                      )}
                    >
                      {therapist.name[0]}
                    </motion.div>
                    {isMe && (
                      <motion.div 
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        className="absolute -top-2 -right-2 w-8 h-8 bg-accent text-white rounded-full flex items-center justify-center shadow-xl border-4 border-white"
                      >
                        <User size={14} />
                      </motion.div>
                    )}
                  </div>
                  <div>
                    <h3 className="text-2xl font-bold text-primary tracking-tighter flex items-center gap-3">
                      {therapist.name}
                      {isMe && <span className="text-[10px] bg-accent text-white px-3 py-1 rounded-full font-black uppercase tracking-widest shadow-lg shadow-accent/20">Me</span>}
                    </h3>
                    <p className="text-[11px] text-primary/30 font-black uppercase tracking-[0.3em] mt-1.5">
                      {therapist.role}
                    </p>
                  </div>
                </div>
                <button className="p-3 text-primary/10 hover:text-primary hover:bg-surface-muted rounded-2xl transition-all">
                  <MoreHorizontal size={24} />
                </button>
              </div>

              {/* Queue Body */}
              <div className="flex-1 p-10 space-y-12">
                {/* Active Session: Immersive Masterpiece */}
                <section>
                  <div className="flex items-center justify-between mb-6 px-2">
                    <span className="text-[11px] font-black text-primary/20 uppercase tracking-[0.4em]">Current Session</span>
                    {activeApt && (
                      <div className="flex items-center gap-3 px-3 py-1 bg-emerald-50 rounded-full">
                        <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                        <span className="text-[10px] font-black text-emerald-600 uppercase tracking-widest">Active Now</span>
                      </div>
                    )}
                  </div>
                  
                  {activeApt ? (
                    <motion.div 
                      layoutId={`active-${activeApt.id}`}
                      className="bg-primary p-8 rounded-[2.5rem] shadow-[0_30px_60px_rgba(0,0,0,0.15)] text-white relative overflow-hidden group/active"
                    >
                      <div className="absolute top-0 right-0 w-48 h-48 -mr-24 -mt-24 bg-accent opacity-30 blur-[60px] animate-pulse" />
                      <div className="absolute bottom-0 left-0 w-32 h-32 -ml-16 -mb-16 bg-blue-500 opacity-20 blur-[40px]" />
                      
                      <div className="relative z-10 space-y-8">
                        <div className="flex items-center gap-6">
                          <div className="w-16 h-16 rounded-2xl bg-white/10 backdrop-blur-xl flex items-center justify-center text-2xl font-black border border-white/20 shadow-inner">
                            {patientList.find(p => p.id === activeApt.patientId)?.firstName[0]}
                          </div>
                          <div className="min-w-0">
                            <p className="text-2xl font-bold tracking-tighter truncate leading-none mb-2">
                              {patientList.find(p => p.id === activeApt.patientId)?.firstName} {patientList.find(p => p.id === activeApt.patientId)?.lastName}
                            </p>
                            <div className="flex items-center gap-3">
                              <span className="text-[10px] text-white/40 font-black uppercase tracking-widest">Started {format(activeApt.startTime, 'h:mm a')}</span>
                              <span className="w-1.5 h-1.5 rounded-full bg-white/10" />
                              <div className="flex items-center gap-2 text-accent font-black uppercase tracking-widest text-[10px] bg-white/5 px-2 py-1 rounded-lg">
                                <Timer size={12} className="animate-spin-slow" />
                                <span>{differenceInMinutes(new Date(), new Date(activeApt.startTime))}m</span>
                              </div>
                            </div>
                          </div>
                        </div>

                        {canManage && (
                          <div className="grid grid-cols-2 gap-4">
                            <motion.button 
                              whileHover={{ scale: 1.02, y: -2 }}
                              whileTap={{ scale: 0.98 }}
                              onClick={() => setReviewingAptId(activeApt.id!)}
                              className="py-4 bg-white text-primary rounded-2xl text-[11px] font-black uppercase tracking-[0.2em] hover:bg-accent hover:text-white transition-all flex items-center justify-center gap-3 shadow-2xl active:scale-95 group/btn"
                            >
                              <ClipboardList size={18} />
                              Review
                            </motion.button>
                            <motion.button 
                              whileHover={{ scale: 1.02, y: -2 }}
                              whileTap={{ scale: 0.98 }}
                              onClick={() => handleStartConsultation(activeApt)}
                              className="py-4 bg-white/10 text-white rounded-2xl text-[11px] font-black uppercase tracking-[0.2em] hover:bg-white/20 transition-all border border-white/10 active:scale-95 flex items-center justify-center gap-3 backdrop-blur-md"
                            >
                              <HistoryIcon size={18} />
                              History
                            </motion.button>
                          </div>
                        )}
                      </div>
                    </motion.div>
                  ) : (
                    <div className="py-16 text-center border-4 border-dashed border-primary/5 rounded-[2.5rem] bg-surface-muted/20">
                      <div className="w-16 h-16 bg-white rounded-[1.5rem] shadow-xl shadow-primary/5 flex items-center justify-center mx-auto mb-6 text-primary/10">
                        <Clock size={32} />
                      </div>
                      <p className="text-[11px] font-black text-primary/20 uppercase tracking-[0.4em]">No Active Session</p>
                    </div>
                  )}
                </section>

                {/* Waiting List: Premium Data Grid */}
                <section className="space-y-6">
                  <div className="flex items-center justify-between px-2">
                    <h4 className="text-[11px] font-black text-primary/20 uppercase tracking-[0.4em]">Waiting List ({waiting.length})</h4>
                    {waiting.length > 0 && (
                      <span className="text-[10px] font-black text-accent uppercase tracking-[0.2em] animate-pulse">Next Up</span>
                    )}
                  </div>
                  
                  <div className="space-y-3">
                    <AnimatePresence mode="popLayout">
                      {waiting.map((apt, i) => {
                        const patient = patientList.find(p => p.id === apt.patientId);
                        const waitTime = apt.arrivedAt ? differenceInMinutes(new Date(), new Date(apt.arrivedAt)) : 0;

                        return (
                          <motion.div 
                            key={apt.id}
                            layout
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            transition={{ delay: i * 0.08 }}
                            className="group/item bg-white p-6 rounded-[2rem] border border-primary/5 hover:border-accent/30 hover:shadow-2xl hover:shadow-primary/5 transition-all duration-500 flex items-center justify-between gap-6"
                          >
                            <div className="flex items-center gap-5 min-w-0">
                              <div className="w-14 h-14 rounded-2xl bg-surface-muted flex items-center justify-center text-primary/30 font-black text-lg shrink-0 group-hover/item:bg-primary group-hover/item:text-white transition-all duration-500 shadow-inner">
                                {patient?.firstName[0]}
                              </div>
                              <div className="min-w-0">
                                <p className="text-lg font-bold text-primary tracking-tighter truncate group-hover/item:text-accent transition-colors leading-none mb-2">
                                  {patient?.firstName} {patient?.lastName}
                                </p>
                                <div className="flex items-center gap-3">
                                  <span className="text-[9px] font-black uppercase tracking-widest text-primary/20 bg-primary/5 px-2 py-0.5 rounded-md">{apt.type}</span>
                                  <span className="w-1 h-1 rounded-full bg-primary/10" />
                                  <span className={cn(
                                    "text-[10px] font-black uppercase tracking-widest",
                                    waitTime > 20 ? 'text-red-500' : 'text-accent'
                                  )}>
                                    {waitTime}m wait
                                  </span>
                                </div>
                              </div>
                            </div>

                            {canManage && (
                              <motion.button 
                                whileHover={{ scale: 1.1, rotate: 90 }}
                                whileTap={{ scale: 0.9 }}
                                onClick={() => handleStartReview(apt)}
                                className="w-12 h-12 rounded-2xl bg-accent/5 text-accent flex items-center justify-center hover:bg-accent hover:text-white transition-all shadow-lg shadow-accent/5"
                              >
                                <PlayCircle size={24} />
                              </motion.button>
                            )}
                          </motion.div>
                        );
                      })}
                    </AnimatePresence>
                    
                    {waiting.length === 0 && !activeApt && (
                      <div className="py-16 text-center bg-surface-muted/10 rounded-[2.5rem] border-2 border-dashed border-primary/5">
                        <p className="text-[11px] font-black text-primary/10 uppercase tracking-[0.4em]">Queue Empty</p>
                      </div>
                    )}
                  </div>
                </section>

                {/* Completed: Minimal Log Style */}
                {completed.length > 0 && (
                  <section className="pt-10 border-t border-primary/5">
                    <div className="flex items-center justify-between mb-6 px-2">
                      <h4 className="text-[11px] font-black text-emerald-500 uppercase tracking-[0.4em]">Completed Today</h4>
                      <span className="text-[10px] font-black text-emerald-600/30 uppercase tracking-widest">{completed.length}</span>
                    </div>
                    <div className="space-y-3">
                      {completed.slice(0, 3).map((apt) => {
                        const patient = patientList.find(p => p.id === apt.patientId);
                        return (
                          <motion.div 
                            key={apt.id} 
                            whileHover={{ x: 8 }}
                            className="flex items-center justify-between p-4 rounded-2xl hover:bg-emerald-50/50 transition-all group/done cursor-pointer"
                          >
                            <div className="flex items-center gap-4">
                              <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center shadow-sm">
                                <CheckCircle2 size={18} />
                              </div>
                              <div>
                                <p className="text-sm font-bold text-primary/80 tracking-tight">{patient?.firstName} {patient?.lastName}</p>
                                <p className="text-[9px] text-primary/30 font-black uppercase tracking-widest mt-0.5">Finished {format(apt.endTime || 0, 'h:mm a')}</p>
                              </div>
                            </div>
                            <button 
                              onClick={() => navigate(`/clinical/note?appointmentId=${apt.id}`)}
                              className="p-2 text-primary/10 hover:text-primary transition-all opacity-0 group-hover/done:opacity-100"
                            >
                              <ArrowUpRight size={18} />
                            </button>
                          </motion.div>
                        );
                      })}
                      {completed.length > 3 && (
                        <button className="w-full py-4 text-[10px] font-black text-primary/20 uppercase tracking-[0.3em] hover:text-primary transition-colors border-t border-primary/5 mt-4">
                          View {completed.length - 3} more
                        </button>
                      )}
                    </div>
                  </section>
                )}
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* Clinical Diary: Premium Section */}
      <motion.section 
        initial={{ opacity: 0, y: 60 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.8 }}
        className="relative"
      >
        <div className="absolute inset-0 bg-primary/[0.02] rounded-[5rem] blur-[100px] -z-10" />
        
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-12 mb-16 px-4">
          <div>
            <div className="flex items-center gap-6 mb-6">
              <motion.div 
                whileHover={{ scale: 1.1, rotate: -12 }}
                className="w-16 h-16 rounded-[2rem] bg-white shadow-2xl shadow-primary/5 flex items-center justify-center text-primary border border-primary/5"
              >
                <ClipboardList size={32} />
              </motion.div>
              <h2 className="text-6xl font-serif text-primary tracking-tighter">Clinical Diary</h2>
            </div>
            <p className="text-primary/30 text-[11px] font-black uppercase tracking-[0.5em] ml-2 border-l-2 border-accent/30 pl-6">
              Historical encounter review and follow-up management
            </p>
          </div>
          
          <div className="flex items-center gap-4">
            <div className="relative group">
              <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-primary/20 group-focus-within:text-accent transition-colors" size={20} />
              <input 
                type="text" 
                placeholder="Search clinical records..."
                className="pl-16 pr-8 py-5 bg-white border border-primary/5 rounded-[2rem] text-base focus:outline-none focus:ring-4 focus:ring-primary/5 w-80 shadow-2xl shadow-primary/5 transition-all outline-none"
              />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-[5rem] border border-primary/5 shadow-[0_50px_100px_rgba(0,0,0,0.04)] overflow-hidden">
          <DiarySection 
            appointments={appointmentList}
            patients={patientList}
            onReview={handleDiaryReview}
          />
        </div>
      </motion.section>


      {/* Review Modal */}
      <AnimatePresence>
        {reviewingAptId && encounterList.find(e => e.appointmentId === reviewingAptId) && (
          <ReviewModal 
            isOpen={!!reviewingAptId}
            onClose={() => setReviewingAptId(null)}
            appointment={appointmentList.find(a => a.id === reviewingAptId)!}
            patient={patientList.find(p => p.id === appointmentList.find(a => a.id === reviewingAptId)?.patientId)!}
            encounter={encounterList.find(e => e.appointmentId === reviewingAptId)!}
            onComplete={handleEndReview}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
