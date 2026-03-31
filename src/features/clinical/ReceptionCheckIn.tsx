import React, { useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  UserCheck, 
  Clock, 
  Search, 
  CheckCircle2, 
  AlertCircle, 
  MoreVertical,
  Timer
} from 'lucide-react';
import { useTenantDb } from '@/hooks/useTenantDb';
import { format, isSameDay, differenceInMinutes } from 'date-fns';
import { cn } from '@/lib/utils';
import { Appointment, Patient, User } from '@/types';

export default function ReceptionCheckIn() {
  const { appointments, patients, users } = useTenantDb();
  const queryClient = useQueryClient();
  const today = new Date();

  const { data: appointmentList = [], isLoading } = useQuery({
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

  const todayAppointments = useMemo(() => {
    return appointmentList
      .filter(a => isSameDay(new Date(a.startTime), today))
      .sort((a, b) => a.startTime - b.startTime);
  }, [appointmentList]);

  const handleCheckIn = async (id: number) => {
    await appointments.update(id, {
      status: 'arrived',
      arrivedAt: Date.now()
    });
    queryClient.invalidateQueries({ queryKey: ['appointments'] });
  };

  const calculateWaitTime = (apt: Appointment) => {
    if (apt.status !== 'arrived' || !apt.arrivedAt) return null;
    return differenceInMinutes(new Date(), new Date(apt.arrivedAt));
  };

  const getEstimatedWait = (apt: Appointment) => {
    if (apt.status !== 'scheduled') return null;
    
    // Simple estimate: 30 mins per patient already in 'arrived' or 'in-progress' status for the same therapist
    const ahead = todayAppointments.filter(a => 
      a.therapistId === apt.therapistId && 
      ['arrived', 'in-progress'].includes(a.status) &&
      a.startTime < apt.startTime
    ).length;
    
    return ahead * 30;
  };

  return (
    <div className="space-y-12 max-w-[1400px] mx-auto">
      <motion.div 
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col md:flex-row md:items-end justify-between gap-8"
      >
        <div>
          <div className="flex items-center gap-4 mb-4">
            <div className="w-12 h-12 rounded-2xl bg-primary text-white flex items-center justify-center shadow-xl shadow-primary/20">
              <UserCheck size={24} />
            </div>
            <h1 className="text-5xl font-serif text-primary tracking-tight">Reception Desk</h1>
          </div>
          <p className="text-primary/30 text-[11px] font-black uppercase tracking-[0.4em] ml-1 flex items-center gap-3">
            <span className="w-8 h-px bg-primary/10" />
            {format(today, 'EEEE, MMMM do')} • Today's Arrivals
          </p>
        </div>
        
        <div className="flex items-center gap-4 bg-white p-2 rounded-2xl border border-primary/5 shadow-sm">
          <div className="relative group">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-primary/20 group-focus-within:text-accent transition-colors" size={16} />
            <input 
              type="text" 
              placeholder="Search arrivals..."
              className="pl-11 pr-6 py-2.5 bg-surface-muted/50 border border-transparent rounded-xl text-sm focus:bg-white focus:ring-4 focus:ring-primary/5 transition-all outline-none w-64"
            />
          </div>
        </div>
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
        {/* Main Check-in List */}
        <div className="lg:col-span-8 space-y-8">
          <motion.div 
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-[3rem] border border-primary/5 shadow-[0_30px_60px_rgba(0,0,0,0.03)] overflow-hidden"
          >
            <div className="p-10 border-b border-primary/5 flex items-center justify-between bg-surface-muted/10">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-xl bg-primary/5 text-primary flex items-center justify-center">
                  <Clock size={20} />
                </div>
                <h3 className="font-serif text-2xl text-primary">Appointment Queue</h3>
              </div>
              <div className="flex items-center gap-3 px-4 py-2 bg-white rounded-full shadow-sm border border-primary/5">
                <span className="w-2 h-2 rounded-full bg-accent animate-pulse" />
                <span className="text-[10px] font-black text-primary/40 uppercase tracking-widest">Live Operations</span>
              </div>
            </div>

            <div className="divide-y divide-primary/5">
              {isLoading ? (
                <div className="p-24 text-center">
                  <div className="w-12 h-12 border-4 border-primary/5 border-t-primary rounded-full animate-spin mx-auto mb-6" />
                  <p className="text-[11px] font-black text-primary/20 uppercase tracking-[0.3em]">Synchronizing Queue...</p>
                </div>
              ) : todayAppointments.length === 0 ? (
                <div className="p-32 text-center">
                  <div className="w-20 h-20 bg-surface-muted rounded-[2.5rem] flex items-center justify-center mx-auto mb-8 text-primary/10">
                    <UserCheck size={40} />
                  </div>
                  <p className="text-xl font-serif text-primary/30 italic">No appointments scheduled for today</p>
                  <p className="text-[10px] font-black text-primary/20 uppercase tracking-[0.3em] mt-4">The queue is currently clear</p>
                </div>
              ) : (
                <AnimatePresence mode="popLayout">
                  {todayAppointments.map((apt, idx) => {
                    const patient = patientList.find(p => p.id === apt.patientId);
                    const therapist = therapistList.find(u => u.id === apt.therapistId);
                    const waitTime = calculateWaitTime(apt);

                    return (
                      <motion.div 
                        key={apt.id}
                        layout
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        transition={{ delay: idx * 0.05 }}
                        className={cn(
                          "p-8 flex flex-col sm:flex-row sm:items-center gap-10 hover:bg-surface-muted/20 transition-all group",
                          apt.status === 'arrived' ? 'bg-accent/[0.02]' : ''
                        )}
                      >
                        <div className="w-28 flex-shrink-0">
                          <p className="text-2xl font-bold text-primary tracking-tighter leading-none mb-1">{format(apt.startTime, 'h:mm')}</p>
                          <p className="text-[9px] text-primary/30 font-black uppercase tracking-widest">{format(apt.startTime, 'a')} • Scheduled</p>
                        </div>

                        <div className="flex-1 flex items-center gap-6">
                          <div className="w-16 h-16 rounded-[1.5rem] bg-surface-muted flex items-center justify-center text-primary/30 font-black text-xl border border-primary/5 shadow-inner group-hover:bg-primary group-hover:text-white transition-all duration-500">
                            {patient ? `${patient.firstName[0]}${patient.lastName[0]}` : '??'}
                          </div>
                          <div className="min-w-0">
                            <h4 className="text-xl font-bold text-primary tracking-tighter group-hover:text-accent transition-colors leading-none mb-2">
                              {patient ? `${patient.firstName} ${patient.lastName}` : 'Unknown Patient'}
                            </h4>
                            <div className="flex items-center gap-3">
                              <span className="text-[10px] text-primary/40 font-bold">with {therapist?.name || 'Any Therapist'}</span>
                              <span className="w-1 h-1 rounded-full bg-primary/10" />
                              <span className="text-[9px] font-black text-primary/20 uppercase tracking-widest">{apt.type}</span>
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-6">
                          {apt.status === 'scheduled' ? (
                            <div className="flex items-center gap-6">
                              <div className="flex flex-col items-end">
                                <span className="text-[9px] font-black text-primary/20 uppercase tracking-widest mb-1">Est. Wait</span>
                                <span className="text-sm font-bold text-primary/40">{getEstimatedWait(apt)}m</span>
                              </div>
                              <motion.button 
                                whileHover={{ scale: 1.05, y: -2 }}
                                whileTap={{ scale: 0.95 }}
                                onClick={() => handleCheckIn(apt.id!)}
                                className="flex items-center gap-3 px-8 py-4 bg-primary text-white rounded-2xl font-black text-[10px] uppercase tracking-[0.2em] hover:shadow-2xl hover:shadow-primary/30 transition-all shadow-xl shadow-primary/10"
                              >
                                <UserCheck size={16} />
                                Check In
                              </motion.button>
                            </div>
                          ) : apt.status === 'arrived' ? (
                            <div className="flex items-center gap-6">
                              <div className="flex flex-col items-end">
                                <span className="text-[9px] font-black text-accent uppercase tracking-widest mb-1">Waiting</span>
                                <span className="text-sm font-bold text-primary flex items-center gap-2">
                                  <Timer size={14} className="text-accent animate-pulse" />
                                  {waitTime}m
                                </span>
                              </div>
                              <div className="w-14 h-14 rounded-2xl bg-accent/10 text-accent flex items-center justify-center shadow-lg shadow-accent/5 border border-accent/10">
                                <CheckCircle2 size={28} />
                              </div>
                            </div>
                          ) : (
                            <span className="px-6 py-3 rounded-2xl bg-surface-muted text-[10px] font-black text-primary/30 uppercase tracking-[0.2em] border border-primary/5">
                              {apt.status}
                            </span>
                          )}
                          <button className="p-3 text-primary/10 hover:text-primary hover:bg-surface-muted rounded-2xl transition-all">
                            <MoreVertical size={24} />
                          </button>
                        </div>
                      </motion.div>
                    );
                  })}
                </AnimatePresence>
              )}
            </div>
          </motion.div>
        </div>

        {/* Sidebar Stats */}
        <div className="lg:col-span-4 space-y-8">
          <motion.div 
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-white p-10 rounded-[3rem] border border-primary/5 shadow-[0_30px_60px_rgba(0,0,0,0.03)]"
          >
            <h3 className="font-serif text-2xl text-primary mb-10">Queue Summary</h3>
            <div className="space-y-8">
              <div className="flex items-center justify-between group cursor-pointer">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-xl bg-primary/5 text-primary flex items-center justify-center group-hover:bg-primary group-hover:text-white transition-all">
                    <Clock size={18} />
                  </div>
                  <span className="text-sm font-bold text-primary/40">Total Today</span>
                </div>
                <span className="text-2xl font-bold text-primary tracking-tighter">{todayAppointments.length}</span>
              </div>
              
              <div className="flex items-center justify-between group cursor-pointer">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-xl bg-accent/5 text-accent flex items-center justify-center group-hover:bg-accent group-hover:text-white transition-all">
                    <UserCheck size={18} />
                  </div>
                  <span className="text-sm font-bold text-primary/40">Checked In</span>
                </div>
                <span className="text-2xl font-bold text-accent tracking-tighter">
                  {todayAppointments.filter(a => a.status === 'arrived').length}
                </span>
              </div>

              <div className="flex items-center justify-between group cursor-pointer">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-500 flex items-center justify-center group-hover:bg-emerald-500 group-hover:text-white transition-all">
                    <CheckCircle2 size={18} />
                  </div>
                  <span className="text-sm font-bold text-primary/40">Completed</span>
                </div>
                <span className="text-2xl font-bold text-emerald-500 tracking-tighter">
                  {todayAppointments.filter(a => a.status === 'completed').length}
                </span>
              </div>
            </div>

            <div className="mt-12 pt-10 border-t border-primary/5">
              <div className="flex items-center justify-between mb-6">
                <span className="text-[10px] font-black text-primary/20 uppercase tracking-[0.3em]">Efficiency Index</span>
                <span className="text-xs font-bold text-emerald-500">94%</span>
              </div>
              <div className="h-2 bg-surface-muted rounded-full overflow-hidden">
                <motion.div 
                  initial={{ width: 0 }}
                  animate={{ width: '94%' }}
                  transition={{ duration: 1.5, ease: "easeOut" }}
                  className="h-full bg-emerald-500 rounded-full"
                />
              </div>
            </div>
          </motion.div>

          <motion.div 
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.3 }}
            className="bg-primary p-10 rounded-[3rem] shadow-[0_40px_80px_rgba(0,0,0,0.15)] text-white relative overflow-hidden group"
          >
            <div className="absolute top-0 right-0 w-32 h-32 -mr-16 -mt-16 bg-accent opacity-20 blur-3xl group-hover:opacity-40 transition-opacity" />
            
            <div className="relative z-10">
              <div className="flex items-center gap-4 mb-8">
                <div className="w-12 h-12 rounded-2xl bg-white/10 backdrop-blur-xl flex items-center justify-center text-accent border border-white/10">
                  <AlertCircle size={24} />
                </div>
                <h4 className="font-black text-[11px] uppercase tracking-[0.3em]">Reception Intelligence</h4>
              </div>
              <p className="text-lg font-light text-white/70 leading-relaxed italic">
                "Average wait time is currently 12 minutes. Please ensure all new patients have completed their digital intake forms."
              </p>
              <div className="mt-8 flex items-center gap-3">
                <div className="w-2 h-2 rounded-full bg-accent animate-pulse" />
                <span className="text-[9px] font-black uppercase tracking-widest text-white/30">Last updated 2m ago</span>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </div>

  );
}
