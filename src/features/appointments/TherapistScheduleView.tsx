import React, { useState, useMemo } from 'react';
import { format, isSameDay, startOfDay, endOfDay } from 'date-fns';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Clock, 
  User, 
  FileText, 
  ChevronRight, 
  Calendar as CalendarIcon,
  CheckCircle2,
  AlertCircle,
  MoreVertical,
  ExternalLink,
  PlayCircle,
  Video
} from 'lucide-react';
import { useTenantDb } from '@/hooks/useTenantDb';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '@/store/useAuthStore';
import { useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';

export default function TherapistScheduleView() {
  const [selectedDate, setSelectedDate] = useState(new Date());
  const { appointments, patients } = useTenantDb();
  const { user } = useAuthStore();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data: appointmentList = [], isLoading } = useQuery({
    queryKey: ['appointments', user?.id],
    queryFn: () => appointments.list(),
  });

  const { data: patientList = [] } = useQuery({
    queryKey: ['patients'],
    queryFn: () => patients.list(),
  });

  const dailyAppointments = useMemo(() => {
    return appointmentList
      .filter(a => a.therapistId === user?.id && isSameDay(new Date(a.startTime), selectedDate))
      .sort((a, b) => a.startTime - b.startTime);
  }, [appointmentList, user, selectedDate]);

  const stats = useMemo(() => {
    return {
      total: dailyAppointments.length,
      completed: dailyAppointments.filter(a => a.status === 'completed').length,
      remaining: dailyAppointments.filter(a => a.status === 'scheduled').length,
    };
  }, [dailyAppointments]);

  const handleStartSession = async (aptId: number) => {
    await appointments.update(aptId, { status: 'in-progress' });
    queryClient.invalidateQueries({ queryKey: ['appointments'] });
    navigate(`/clinical/note?appointmentId=${aptId}`);
  };

  return (
    <div className="space-y-10">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-8">
        <div>
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-2xl bg-primary text-white flex items-center justify-center shadow-xl shadow-primary/20">
              <CalendarIcon size={20} />
            </div>
            <h1 className="text-4xl font-serif text-primary tracking-tight">Daily Agenda</h1>
          </div>
          <p className="text-primary/40 text-[10px] font-black uppercase tracking-[0.3em] ml-1">
            {format(selectedDate, 'EEEE, MMMM do, yyyy')}
          </p>
        </div>

        <div className="flex items-center gap-4 bg-white p-2 rounded-[2rem] border border-primary/5 shadow-2xl shadow-primary/5">
          <div className="flex items-center gap-2 pl-4 pr-2 py-2 bg-surface-muted rounded-2xl border border-primary/5 group focus-within:border-accent/20 transition-all">
            <CalendarIcon size={14} className="text-primary/20 group-focus-within:text-accent" />
            <input 
              type="date" 
              value={format(selectedDate, 'yyyy-MM-dd')}
              onChange={(e) => setSelectedDate(new Date(e.target.value))}
              className="bg-transparent border-none text-[10px] font-black text-primary uppercase tracking-widest focus:ring-0 cursor-pointer p-0 w-28"
            />
          </div>
          <button className="p-4 bg-primary text-white rounded-2xl hover:opacity-90 transition-all shadow-xl shadow-primary/20 active:scale-95">
            <ChevronRight size={18} />
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-8">
        {[
          { label: 'Total Appointments', value: stats.total, icon: CalendarIcon, color: 'text-blue-500', bg: 'bg-blue-500/10', shadow: 'shadow-blue-500/10' },
          { label: 'Completed Sessions', value: stats.completed, icon: CheckCircle2, color: 'text-emerald-500', bg: 'bg-emerald-500/10', shadow: 'shadow-emerald-500/10' },
          { label: 'Pending Reviews', value: stats.remaining, icon: Clock, color: 'text-orange-500', bg: 'bg-orange-500/10', shadow: 'shadow-orange-500/10' },
        ].map((stat, i) => (
          <motion.div 
            key={i}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
            className="bg-white p-8 rounded-[2.5rem] border border-primary/5 shadow-2xl shadow-primary/5 group hover:border-accent/20 transition-all relative overflow-hidden"
          >
            <div className={`absolute top-0 right-0 w-32 h-32 -mr-16 -mt-16 rounded-full ${stat.bg} opacity-20 blur-3xl group-hover:opacity-40 transition-opacity`} />
            <div className={`w-14 h-14 rounded-2xl ${stat.bg} ${stat.color} flex items-center justify-center mb-6 shadow-2xl ${stat.shadow}`}>
              <stat.icon size={24} />
            </div>
            <p className="text-[10px] font-black text-primary/30 uppercase tracking-[0.2em] mb-2">{stat.label}</p>
            <p className="text-4xl font-serif text-primary tracking-tight">{stat.value}</p>
          </motion.div>
        ))}
      </div>

      {/* Agenda List */}
      <div className="bg-white rounded-[3rem] border border-primary/5 shadow-2xl shadow-primary/5 overflow-hidden">
        <div className="p-8 border-b border-primary/5 flex items-center justify-between bg-surface-muted/30">
          <div>
            <h3 className="font-serif text-2xl text-primary tracking-tight">Today's Schedule</h3>
            <p className="text-[10px] text-primary/40 font-black uppercase tracking-[0.2em] mt-1">Clinical sessions & consultations</p>
          </div>
          <div className="flex items-center gap-3 px-5 py-3 bg-white rounded-2xl border border-primary/5 shadow-sm">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_10px_rgba(16,185,129,0.5)]" />
            <span className="text-[10px] font-black text-primary/40 uppercase tracking-[0.2em]">Next session in 45 mins</span>
          </div>
        </div>

        <div className="divide-y divide-primary/5">
          {isLoading ? (
            <div className="p-20 text-center">
              <div className="w-12 h-12 border-4 border-primary/10 border-t-primary rounded-full animate-spin mx-auto mb-6" />
              <p className="text-[10px] font-black text-primary/20 uppercase tracking-[0.2em]">Synchronizing agenda...</p>
            </div>
          ) : dailyAppointments.length === 0 ? (
            <div className="p-32 text-center">
              <div className="w-24 h-24 bg-surface-muted rounded-[2.5rem] flex items-center justify-center mx-auto mb-8 text-primary/5 border border-primary/5 shadow-inner">
                <CalendarIcon size={48} />
              </div>
              <h4 className="text-2xl font-serif text-primary mb-3 tracking-tight">A Quiet Day Ahead</h4>
              <p className="text-sm text-primary/40 max-w-xs mx-auto leading-relaxed">Your schedule is currently clear. Use this time for administrative tasks or professional development.</p>
            </div>
          ) : (
            dailyAppointments.map((apt, i) => {
              const patient = patientList.find(p => p.id === apt.patientId);
              const isPast = new Date(apt.endTime) < new Date();
              const isCurrent = new Date(apt.startTime) <= new Date() && new Date(apt.endTime) >= new Date();

              return (
                <motion.div 
                  key={apt.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.05 }}
                  className={cn(
                    "p-8 flex flex-col lg:flex-row lg:items-center gap-8 hover:bg-surface-muted/50 transition-all group relative",
                    isCurrent && "bg-accent/[0.02] before:absolute before:left-0 before:top-0 before:bottom-0 before:w-1.5 before:bg-accent before:shadow-[0_0_15px_rgba(242,125,38,0.5)]"
                  )}
                >
                  {/* Time Column */}
                  <div className="w-40 flex-shrink-0">
                    <div className="flex items-center gap-3 text-primary mb-2">
                      <div className={cn(
                        "w-8 h-8 rounded-xl flex items-center justify-center",
                        isCurrent ? "bg-accent text-white shadow-lg shadow-accent/20" : "bg-primary/5 text-primary/40"
                      )}>
                        <Clock size={14} />
                      </div>
                      <span className="text-lg font-bold tracking-tight">{format(apt.startTime, 'h:mm a')}</span>
                    </div>
                    <div className="flex items-center gap-2 ml-1">
                      <p className="text-[10px] text-primary/30 font-black uppercase tracking-[0.2em]">
                        {Math.round((apt.endTime - apt.startTime) / 60000)} Mins
                      </p>
                      {isCurrent && (
                        <span className="text-[8px] bg-accent text-white px-2 py-0.5 rounded-full font-black uppercase tracking-widest animate-pulse">Live</span>
                      )}
                    </div>
                  </div>

                  {/* Patient Column */}
                  <div className="flex-1 flex items-center gap-6">
                    <div className="relative">
                      <div className="w-16 h-16 rounded-[1.5rem] bg-surface-muted flex items-center justify-center text-primary/40 font-bold text-xl border border-primary/5 shadow-sm group-hover:scale-105 transition-transform">
                        {patient ? `${patient.firstName[0]}${patient.lastName[0]}` : '??'}
                      </div>
                      {isCurrent && (
                        <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-emerald-500 border-4 border-white rounded-full shadow-lg" />
                      )}
                    </div>
                    <div>
                      <div className="flex flex-wrap items-center gap-3 mb-2">
                        <h4 className="text-xl font-bold text-primary tracking-tight group-hover:text-accent transition-colors">
                          {patient ? `${patient.firstName} ${patient.lastName}` : 'Unknown Patient'}
                        </h4>
                        <span className={cn(
                          "px-3 py-1 rounded-xl text-[9px] font-black uppercase tracking-[0.15em] border",
                          apt.type.includes('Initial') 
                            ? "bg-blue-500/10 text-blue-600 border-blue-500/20" 
                            : "bg-emerald-500/10 text-emerald-600 border-emerald-500/20"
                        )}>
                          {apt.type}
                        </span>
                      </div>
                      <div className="flex items-center gap-4 text-[11px] text-primary/40 font-bold uppercase tracking-widest">
                        <span className="flex items-center gap-2"><User size={12} className="text-primary/20" /> {patient?.type}</span>
                        <span className="w-1 h-1 rounded-full bg-primary/10" />
                        <span className="flex items-center gap-2"><AlertCircle size={12} className="text-primary/20" /> {apt.status}</span>
                      </div>
                    </div>
                  </div>

                  {/* Actions Column */}
                  <div className="flex items-center gap-4">
                    {apt.type.includes('Telehealth') && (
                      <button 
                        onClick={() => navigate(`/telehealth/${apt.id}`)}
                        className="flex items-center gap-3 px-6 py-3 bg-primary text-white font-black text-[10px] uppercase tracking-[0.2em] rounded-2xl hover:opacity-90 transition-all shadow-xl shadow-primary/20 active:scale-95"
                      >
                        <Video size={16} />
                        Join Call
                      </button>
                    )}
                    
                    <div className="flex items-center gap-2 p-1.5 bg-surface-muted rounded-[1.5rem] border border-primary/5">
                      {apt.status === 'arrived' ? (
                        <button 
                          onClick={() => handleStartSession(apt.id!)}
                          className="flex items-center gap-3 px-6 py-3 bg-accent text-white font-black text-[10px] uppercase tracking-[0.2em] rounded-xl hover:opacity-90 transition-all shadow-xl shadow-accent/20 active:scale-95"
                        >
                          <PlayCircle size={16} />
                          Start Session
                        </button>
                      ) : (
                        <button 
                          onClick={() => navigate(`/clinical/note?appointmentId=${apt.id}`)}
                          className="flex items-center gap-3 px-6 py-3 bg-white text-primary font-black text-[10px] uppercase tracking-[0.2em] rounded-xl border border-primary/5 hover:bg-primary hover:text-white transition-all shadow-sm group/btn active:scale-95"
                        >
                          <FileText size={16} className="text-primary/20 group-hover/btn:text-white transition-colors" />
                          {apt.status === 'completed' ? 'View Note' : 'Clinical Note'}
                        </button>
                      )}
                      
                      <button 
                        onClick={() => navigate(`/patients/${apt.patientId}`)}
                        className="p-3 text-primary/20 hover:text-primary hover:bg-white rounded-xl transition-all group/icon"
                        title="Patient Profile"
                      >
                        <ExternalLink size={18} className="group-hover/icon:scale-110 transition-transform" />
                      </button>
                      
                      <button className="p-3 text-primary/20 hover:text-primary hover:bg-white rounded-xl transition-all group/icon">
                        <MoreVertical size={18} className="group-hover/icon:scale-110 transition-transform" />
                      </button>
                    </div>
                  </div>
                </motion.div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
