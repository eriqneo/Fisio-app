import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { 
  Calendar, 
  Dumbbell, 
  MessageSquare, 
  Video, 
  Clock, 
  Activity,
  ChevronRight,
  Star,
  LogOut
} from 'lucide-react';
import { useTenantDb } from '@/hooks/useTenantDb';
import { useAuthStore } from '@/store/useAuthStore';
import { format } from 'date-fns';
import { motion } from 'framer-motion';
import ChatWidget from '../telehealth/ChatWidget';
import ExerciseVideoGallery from '../telehealth/ExerciseVideoGallery';

export default function PatientPortalDashboard() {
  const { appointments, hepPrograms, notifications } = useTenantDb();
  const { user, logout } = useAuthStore();

  const { data: appts } = useQuery({
    queryKey: ['patient-appointments', user?.id],
    queryFn: () => appointments.list() // In real app, filter by patientId
  });

  const { data: hep } = useQuery({
    queryKey: ['patient-hep', user?.id],
    queryFn: () => hepPrograms.list() // In real app, filter by patientId
  });

  const nextAppt = appts?.find(a => a.startTime > Date.now());

  return (
    <div className="space-y-10 pb-20">
      <header className="flex items-start justify-between">
        <div>
          <h1 className="text-4xl font-serif text-primary tracking-tight">Welcome back, {user?.name?.split(' ')[0]}</h1>
          <p className="text-primary/40 font-bold uppercase tracking-widest text-xs mt-2">Your recovery journey at a glance</p>
        </div>
        <button 
          onClick={logout}
          className="flex items-center gap-2 px-6 py-3 rounded-2xl bg-red-500/5 text-red-500 hover:bg-red-500 hover:text-white transition-all duration-300 font-bold text-xs uppercase tracking-widest group shadow-sm hover:shadow-red-500/20"
          title="Log Out"
        >
          <LogOut size={18} className="group-hover:-translate-x-1 transition-transform" />
          <span>Log Out</span>
        </button>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main Column */}
        <div className="lg:col-span-2 space-y-8">
          {/* Next Appointment Card */}
          <div className="bg-primary p-10 rounded-[48px] shadow-2xl shadow-primary/20 text-white relative overflow-hidden">
            <div className="absolute -top-20 -right-20 w-64 h-64 bg-white/5 rounded-full blur-3xl" />
            <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-8">
              <div className="space-y-4">
                <div className="flex items-center gap-3 text-accent">
                  <Calendar size={20} />
                  <span className="text-[10px] font-bold uppercase tracking-[0.2em]">Next Session</span>
                </div>
                {nextAppt ? (
                  <>
                    <h2 className="text-4xl font-serif">{format(nextAppt.startTime, 'EEEE, MMM d')}</h2>
                    <p className="text-white/60 text-lg font-medium">at {format(nextAppt.startTime, 'h:mm a')} with your therapist</p>
                  </>
                ) : (
                  <h2 className="text-4xl font-serif">No upcoming sessions</h2>
                )}
              </div>
              <button className="px-10 py-5 bg-accent text-primary rounded-2xl font-bold text-xs uppercase tracking-widest hover:scale-105 transition-all shadow-xl shadow-accent/20">
                Join Video Call
              </button>
            </div>
          </div>

          {/* Exercise Progress */}
          <div className="bg-white p-10 rounded-[48px] border border-primary/5 shadow-2xl shadow-primary/5 space-y-8">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-primary/5 flex items-center justify-center text-primary">
                  <Dumbbell size={24} />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-primary">Daily Exercises</h3>
                  <p className="text-[10px] font-bold text-primary/30 uppercase tracking-widest">Your prescribed HEP program</p>
                </div>
              </div>
              <button className="text-accent text-[10px] font-bold uppercase tracking-widest hover:underline">View All</button>
            </div>

            <div className="space-y-4">
              {hep?.[0]?.exercises?.slice(0, 3).map((ex, i) => (
                <div key={i} className="flex items-center gap-6 p-6 bg-surface-muted/50 rounded-3xl hover:bg-surface-muted transition-colors group cursor-pointer">
                  <div className="w-16 h-16 rounded-2xl bg-white flex items-center justify-center text-primary/20 group-hover:text-accent transition-colors">
                    <Video size={24} />
                  </div>
                  <div className="flex-1">
                    <h4 className="font-bold text-primary">{ex.name}</h4>
                    <p className="text-xs text-primary/40 font-medium">{ex.sets} sets • {ex.reps} reps</p>
                  </div>
                  <ChevronRight size={20} className="text-primary/10 group-hover:text-primary transition-colors" />
                </div>
              ))}
            </div>
          </div>

          {/* Exercise Videos Gallery */}
          <ExerciseVideoGallery patientId={user?.id!} />
        </div>

        {/* Sidebar */}
        <div className="space-y-8">
          {/* Quick Stats */}
          <div className="bg-white p-8 rounded-[40px] border border-primary/5 shadow-2xl shadow-primary/5 space-y-6">
            <h3 className="text-lg font-bold text-primary">Your Progress</h3>
            <div className="space-y-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center">
                  <Activity size={24} />
                </div>
                <div>
                  <p className="text-[10px] font-bold text-primary/30 uppercase tracking-widest">Adherence</p>
                  <p className="text-lg font-bold text-primary">85%</p>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-blue-500/10 text-blue-500 flex items-center justify-center">
                  <Clock size={24} />
                </div>
                <div>
                  <p className="text-[10px] font-bold text-primary/30 uppercase tracking-widest">Total Sessions</p>
                  <p className="text-lg font-bold text-primary">12</p>
                </div>
              </div>
            </div>
          </div>

          {/* Feedback Prompt */}
          <div className="bg-accent/10 p-8 rounded-[40px] border border-accent/20 space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-accent text-primary flex items-center justify-center">
              <Star size={24} />
            </div>
            <h3 className="text-lg font-bold text-primary leading-tight">Help us improve your care</h3>
            <p className="text-sm text-primary/60">Share your thoughts on your last session to help us serve you better.</p>
            <button className="w-full py-4 bg-primary text-white rounded-2xl font-bold text-xs uppercase tracking-widest hover:opacity-90 transition-all">
              Give Feedback
            </button>
          </div>
        </div>
      </div>

      <ChatWidget 
        otherUserId={1} // Mock therapist ID
        otherUserName="Dr. Sarah Smith" 
      />
    </div>
  );
}
