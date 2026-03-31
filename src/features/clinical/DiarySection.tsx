import React, { useMemo, useState } from 'react';
import { format, isToday, isTomorrow, isFuture, startOfDay, addDays, isWithinInterval, parseISO } from 'date-fns';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Calendar, 
  Clock, 
  User, 
  ChevronRight, 
  MapPin, 
  Filter, 
  Search, 
  Plus, 
  X, 
  Check,
  CalendarDays,
  ArrowRight,
  Clock3,
  Stethoscope
} from 'lucide-react';
import { Appointment, Patient } from '@/types';
import { useTenantDb } from '@/hooks/useTenantDb';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';

interface DiarySectionProps {
  appointments: Appointment[];
  patients: Patient[];
  onReview?: (apt: Appointment) => void;
}

type FilterType = 'today' | 'tomorrow' | 'week' | 'all';

export default function DiarySection({ appointments, patients, onReview }: DiarySectionProps) {
  const { appointments: appointmentApi } = useTenantDb();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [activeFilter, setActiveFilter] = useState<FilterType>('today');
  const [searchQuery, setSearchQuery] = useState('');
  const [schedulingFollowUpId, setSchedulingFollowUpId] = useState<number | null>(null);
  const [followUpDate, setFollowUpDate] = useState(format(addDays(new Date(), 7), 'yyyy-MM-dd'));
  const [followUpTime, setFollowUpTime] = useState('10:00');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'arrived':
        return 'bg-orange-500'; // Waiting
      case 'in-progress':
        return 'bg-blue-500'; // Being reviewed
      case 'completed':
        return 'bg-green-500'; // Completed
      default:
        return 'bg-slate-300'; // Scheduled/Other
    }
  };

  const handleScheduleFollowUp = async (originalApt: Appointment) => {
    if (!followUpDate || !followUpTime) {
      toast.error('Please select date and time');
      return;
    }

    setIsSubmitting(true);
    try {
      const startTime = new Date(`${followUpDate}T${followUpTime}:00`).getTime();
      const endTime = startTime + (45 * 60 * 1000); // Default 45 mins

      await appointmentApi.create({
        patientId: originalApt.patientId,
        therapistId: originalApt.therapistId,
        startTime,
        endTime,
        type: 'Follow-up',
        status: 'scheduled',
      });

      toast.success('Follow-up appointment scheduled');
      setSchedulingFollowUpId(null);
      queryClient.invalidateQueries({ queryKey: ['appointments'] });
      
      // Navigate to appointments section
      navigate('/appointments');
    } catch (error) {
      console.error('Failed to schedule follow-up:', error);
      toast.error('Failed to schedule follow-up');
    } finally {
      setIsSubmitting(false);
    }
  };

  const filteredAppointments = useMemo(() => {
    const now = new Date();
    const todayStart = startOfDay(now);
    const tomorrowStart = startOfDay(addDays(now, 1));
    const nextWeekEnd = addDays(todayStart, 7);

    return appointments
      .filter(a => {
        if (a.isDeleted) return false;
        
        const aptDate = new Date(a.startTime);

        // Date Filter
        let dateMatch = false;
        if (activeFilter === 'today') dateMatch = isToday(aptDate);
        else if (activeFilter === 'tomorrow') dateMatch = isTomorrow(aptDate);
        else if (activeFilter === 'week') dateMatch = isWithinInterval(aptDate, { start: todayStart, end: nextWeekEnd });
        else if (activeFilter === 'all') dateMatch = isToday(aptDate) || isFuture(aptDate);

        if (!dateMatch) return false;

        // Search Filter
        if (searchQuery) {
          const patient = patients.find(p => p.id === a.patientId);
          const fullName = `${patient?.firstName} ${patient?.lastName}`.toLowerCase();
          return fullName.includes(searchQuery.toLowerCase()) || a.type.toLowerCase().includes(searchQuery.toLowerCase());
        }

        return true;
      })
      .sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime());
  }, [appointments, activeFilter, searchQuery, patients]);

  const groupedAppointments = useMemo(() => {
    const groups: { [key: string]: Appointment[] } = {};
    filteredAppointments.forEach(apt => {
      const dateKey = startOfDay(new Date(apt.startTime)).toISOString();
      if (!groups[dateKey]) groups[dateKey] = [];
      groups[dateKey].push(apt);
    });
    return groups;
  }, [filteredAppointments]);

  const dateKeys = Object.keys(groupedAppointments).sort();

  const filters: { id: FilterType; label: string }[] = [
    { id: 'today', label: 'Today' },
    { id: 'tomorrow', label: 'Tomorrow' },
    { id: 'week', label: 'Next 7 Days' },
    { id: 'all', label: 'All Upcoming' },
  ];

  return (
    <div className="space-y-12">
      {/* Filters & Controls */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-8 px-8 py-10 bg-white border-b border-primary/5">
        <div className="flex bg-surface-muted/50 p-1.5 rounded-2xl border border-primary/5 w-fit">
          {filters.map((f) => (
            <button
              key={f.id}
              onClick={() => setActiveFilter(f.id)}
              className={cn(
                "px-6 py-2.5 rounded-xl text-[11px] font-black uppercase tracking-widest transition-all duration-300",
                activeFilter === f.id 
                  ? "bg-white text-primary shadow-xl shadow-primary/5 ring-1 ring-primary/5" 
                  : "text-primary/40 hover:text-primary/60"
              )}
            >
              {f.label}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-6">
          {/* Status Legend */}
          <div className="hidden xl:flex items-center gap-6 px-6 py-3 bg-primary/[0.02] rounded-2xl border border-primary/5">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-orange-500 shadow-[0_0_8px_rgba(249,115,22,0.4)]" />
              <span className="text-[9px] font-black text-primary/40 uppercase tracking-widest">Waiting</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.4)]" />
              <span className="text-[9px] font-black text-primary/40 uppercase tracking-widest">Reviewing</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.4)]" />
              <span className="text-[9px] font-black text-primary/40 uppercase tracking-widest">Completed</span>
            </div>
          </div>
        </div>
      </div>

      {/* Content Section */}
      <div className="px-8 pb-12">
        <AnimatePresence mode="wait">
          {dateKeys.length === 0 ? (
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="py-32 text-center"
            >
              <div className="w-24 h-24 bg-surface-muted rounded-[40px] flex items-center justify-center mx-auto mb-8 shadow-inner">
                <CalendarDays className="text-primary/10" size={40} />
              </div>
              <p className="text-xl font-serif text-primary/30 italic">No clinical entries found for this period</p>
              <p className="text-[10px] font-black text-primary/20 uppercase tracking-[0.3em] mt-4">Try adjusting your filters or search query</p>
            </motion.div>
          ) : (
            <div className="space-y-16">
              {dateKeys.map((dateKey, dateIdx) => {
                const date = new Date(dateKey);
                const appointmentsForDate = groupedAppointments[dateKey];
                
                return (
                  <motion.div 
                    key={dateKey}
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: dateIdx * 0.1 }}
                    className="space-y-8"
                  >
                    {/* Date Header */}
                    <div className="flex items-center gap-6">
                      <div className="flex items-baseline gap-3">
                        <span className="text-5xl font-serif text-primary tracking-tighter">
                          {format(date, 'dd')}
                        </span>
                        <div className="flex flex-col">
                          <span className="text-sm font-bold text-primary tracking-tight">
                            {isToday(date) ? 'Today' : isTomorrow(date) ? 'Tomorrow' : format(date, 'EEEE')}
                          </span>
                          <span className="text-[9px] text-primary/30 font-black uppercase tracking-widest">
                            {format(date, 'MMMM yyyy')}
                          </span>
                        </div>
                      </div>
                      <div className="flex-1 h-px bg-gradient-to-r from-primary/10 to-transparent" />
                    </div>

                    {/* Timeline Grid */}
                    <div className="grid grid-cols-1 gap-4">
                      {appointmentsForDate.map((apt, idx) => {
                        const patient = patients.find(p => p.id === apt.patientId);
                        const startTime = new Date(apt.startTime);
                        const isScheduling = schedulingFollowUpId === apt.id;
                        
                        return (
                          <motion.div 
                            key={apt.id}
                            layout
                            className={cn(
                              "group relative bg-white rounded-[32px] border border-primary/5 transition-all duration-500 hover:shadow-2xl hover:shadow-primary/5 hover:border-primary/10",
                              isScheduling && "ring-2 ring-accent/20 border-accent/20"
                            )}
                          >
                            <div className="p-6 flex flex-col lg:flex-row lg:items-center justify-between gap-8">
                              {/* Left: Time & Patient */}
                              <div className="flex items-center gap-8 flex-1 min-w-0">
                                {/* Time */}
                                <div className="w-20 flex flex-col items-end shrink-0">
                                  <span className="text-2xl font-bold text-primary tracking-tighter leading-none">
                                    {format(startTime, 'h:mm')}
                                  </span>
                                  <span className="text-[10px] font-black text-primary/30 uppercase tracking-widest mt-1">
                                    {format(startTime, 'a')}
                                  </span>
                                </div>

                                {/* Vertical Divider */}
                                <div className="h-12 w-px bg-primary/5 hidden sm:block" />

                                {/* Patient Card */}
                                <div className="flex items-center gap-5 flex-1 min-w-0">
                                  <div className="w-14 h-14 rounded-2xl bg-surface-muted flex items-center justify-center text-primary/40 font-bold text-xl shadow-inner shrink-0 group-hover:bg-primary group-hover:text-white transition-all duration-500">
                                    {patient?.firstName[0]}
                                  </div>
                                  <div className="min-w-0">
                                    <div className="flex items-center gap-3 mb-1">
                                      <h4 className="text-xl font-bold text-primary tracking-tight truncate group-hover:text-accent transition-colors">
                                        {patient?.firstName} {patient?.lastName}
                                      </h4>
                                      <div className={cn(
                                        "w-2 h-2 rounded-full",
                                        getStatusColor(apt.status)
                                      )} />
                                    </div>
                                    <div className="flex flex-wrap items-center gap-4">
                                      <div className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-primary/40">
                                        <Stethoscope size={12} />
                                        <span>{apt.type}</span>
                                      </div>
                                      <span className="w-1 h-1 rounded-full bg-primary/10" />
                                      <div className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-primary/40">
                                        <Clock3 size={12} />
                                        <span>45 min</span>
                                      </div>
                                      <span className="w-1 h-1 rounded-full bg-primary/10" />
                                      <div className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-primary/40">
                                        <MapPin size={12} />
                                        <span>Room 302</span>
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              </div>

                              {/* Right: Actions */}
                              <div className="flex items-center gap-4 shrink-0">
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setSchedulingFollowUpId(isScheduling ? null : apt.id!);
                                  }}
                                  className={cn(
                                    "px-6 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all duration-300 flex items-center gap-2 shadow-sm",
                                    isScheduling 
                                      ? "bg-primary text-white" 
                                      : "bg-accent/5 text-accent hover:bg-accent hover:text-white"
                                  )}
                                >
                                  {isScheduling ? <X size={14} /> : <Plus size={14} />}
                                  {isScheduling ? 'Cancel' : 'Follow-up'}
                                </button>

                                <button
                                  onClick={() => onReview?.(apt)}
                                  className="w-12 h-12 rounded-2xl bg-primary/5 text-primary/20 flex items-center justify-center hover:bg-primary hover:text-white transition-all duration-300 shadow-sm group-hover:scale-110"
                                >
                                  <ChevronRight size={20} />
                                </button>
                              </div>
                            </div>

                            {/* Follow-up Form: Integrated Design */}
                            <AnimatePresence>
                              {isScheduling && (
                                <motion.div
                                  initial={{ height: 0, opacity: 0 }}
                                  animate={{ height: 'auto', opacity: 1 }}
                                  exit={{ height: 0, opacity: 0 }}
                                  className="overflow-hidden bg-surface-muted/30 border-t border-primary/5"
                                >
                                  <div className="p-8 grid grid-cols-1 md:grid-cols-3 gap-8 items-end">
                                    <div className="space-y-3">
                                      <label className="text-[10px] font-black text-primary/40 uppercase tracking-[0.2em] block ml-1">Follow-up Date</label>
                                      <input 
                                        type="date"
                                        value={followUpDate}
                                        onChange={(e) => setFollowUpDate(e.target.value)}
                                        className="w-full bg-white border border-primary/10 rounded-2xl px-5 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent shadow-sm"
                                      />
                                    </div>
                                    <div className="space-y-3">
                                      <label className="text-[10px] font-black text-primary/40 uppercase tracking-[0.2em] block ml-1">Preferred Time</label>
                                      <input 
                                        type="time"
                                        value={followUpTime}
                                        onChange={(e) => setFollowUpTime(e.target.value)}
                                        className="w-full bg-white border border-primary/10 rounded-2xl px-5 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent shadow-sm"
                                      />
                                    </div>
                                    <button
                                      disabled={isSubmitting}
                                      onClick={() => handleScheduleFollowUp(apt)}
                                      className="w-full py-4 bg-accent text-white rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] hover:shadow-2xl hover:shadow-accent/30 active:scale-[0.98] transition-all flex items-center justify-center gap-3 shadow-xl shadow-accent/20 disabled:opacity-50"
                                    >
                                      {isSubmitting ? (
                                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                      ) : (
                                        <Calendar size={16} />
                                      )}
                                      Confirm Appointment
                                    </button>
                                  </div>
                                </motion.div>
                              )}
                            </AnimatePresence>
                          </motion.div>
                        );
                      })}
                    </div>
                  </motion.div>
                );
              })}
            </div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
