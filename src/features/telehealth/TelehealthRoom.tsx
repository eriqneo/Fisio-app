import React, { useEffect, useRef, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import DailyIframe from '@daily-co/daily-js';
import { useQuery } from '@tanstack/react-query';
import { useTenantDb } from '@/hooks/useTenantDb';
import { 
  Clock, 
  User, 
  FileText, 
  X, 
  Maximize2, 
  Minimize2,
  MessageSquare,
  ChevronRight,
  ChevronLeft
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { format } from 'date-fns';

export default function TelehealthRoom() {
  const { appointmentId } = useParams();
  const navigate = useNavigate();
  const { appointments, patients, soapNotes, soapNoteDrafts } = useTenantDb();
  const videoRef = useRef<HTMLDivElement>(null);
  const [callFrame, setCallFrame] = useState<any>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [timer, setTimer] = useState(0);

  const { data: appointment } = useQuery({
    queryKey: ['appointment', appointmentId],
    queryFn: () => appointments.findById(Number(appointmentId))
  });

  const { data: patient } = useQuery({
    queryKey: ['patient', appointment?.patientId],
    queryFn: () => patients.findById(appointment?.patientId!),
    enabled: !!appointment?.patientId
  });

  useEffect(() => {
    if (!videoRef.current || !appointment) return;

    const frame = DailyIframe.createFrame(videoRef.current, {
      iframeStyle: {
        width: '100%',
        height: '100%',
        border: '0',
        borderRadius: '24px'
      },
      showLeaveButton: true,
    });

    // In a real app, you'd fetch a room URL from your backend
    // For this demo, we'll use a placeholder or a public room if available
    frame.join({ url: `https://physioflow.daily.co/demo-room` });

    setCallFrame(frame);

    const interval = setInterval(() => {
      setTimer(prev => prev + 1);
    }, 1000);

    return () => {
      frame.destroy();
      clearInterval(interval);
    };
  }, [appointment]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="h-[calc(100vh-120px)] flex gap-6 overflow-hidden">
      {/* Video Area */}
      <div className="flex-1 flex flex-col gap-6 min-w-0">
        <header className="bg-white p-6 rounded-[32px] border border-primary/5 shadow-xl shadow-primary/5 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-accent/10 flex items-center justify-center text-accent">
              <User size={24} />
            </div>
            <div>
              <h2 className="text-lg font-bold text-primary">
                {patient ? `${patient.firstName} ${patient.lastName}` : 'Loading Patient...'}
              </h2>
              <p className="text-[10px] font-bold text-primary/30 uppercase tracking-widest">
                Telehealth Consultation
              </p>
            </div>
          </div>

          <div className="flex items-center gap-6">
            <div className="flex items-center gap-3 px-4 py-2 bg-primary/5 rounded-xl">
              <Clock size={16} className="text-primary/40" />
              <span className="text-sm font-mono font-bold text-primary">{formatTime(timer)}</span>
            </div>
            <button 
              onClick={() => navigate(-1)}
              className="p-3 text-primary/20 hover:text-error transition-colors"
            >
              <X size={24} />
            </button>
          </div>
        </header>

        <div className="flex-1 bg-primary rounded-[40px] relative overflow-hidden shadow-2xl">
          <div ref={videoRef} className="w-full h-full" />
          
          {/* Overlay Controls if needed */}
          <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex gap-4">
            {/* Custom controls could go here if not using Daily's UI */}
          </div>
        </div>
      </div>

      {/* Sidebar - SOAP Notes */}
      <motion.aside 
        initial={false}
        animate={{ width: isSidebarOpen ? 400 : 0, opacity: isSidebarOpen ? 1 : 0 }}
        className="bg-white rounded-[40px] border border-primary/5 shadow-2xl shadow-primary/5 flex flex-col overflow-hidden relative"
      >
        <div className="p-8 border-b border-primary/5 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <FileText size={20} className="text-accent" />
            <h3 className="text-lg font-bold text-primary">Quick SOAP Note</h3>
          </div>
          <button 
            onClick={() => setIsSidebarOpen(false)}
            className="p-2 text-primary/20 hover:text-primary"
          >
            <ChevronRight size={20} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-8 space-y-8">
          <div className="space-y-4">
            <label className="text-[10px] font-bold text-primary/30 uppercase tracking-widest">Subjective</label>
            <textarea 
              className="w-full p-4 bg-surface-muted border-none rounded-2xl text-sm focus:ring-2 focus:ring-accent/20 transition-all min-h-[100px] resize-none"
              placeholder="Patient's reported symptoms..."
            />
          </div>
          <div className="space-y-4">
            <label className="text-[10px] font-bold text-primary/30 uppercase tracking-widest">Objective</label>
            <textarea 
              className="w-full p-4 bg-surface-muted border-none rounded-2xl text-sm focus:ring-2 focus:ring-accent/20 transition-all min-h-[100px] resize-none"
              placeholder="Clinical observations..."
            />
          </div>
          <div className="space-y-4">
            <label className="text-[10px] font-bold text-primary/30 uppercase tracking-widest">Assessment</label>
            <textarea 
              className="w-full p-4 bg-surface-muted border-none rounded-2xl text-sm focus:ring-2 focus:ring-accent/20 transition-all min-h-[100px] resize-none"
              placeholder="Diagnosis and progress..."
            />
          </div>
          <div className="space-y-4">
            <label className="text-[10px] font-bold text-primary/30 uppercase tracking-widest">Plan</label>
            <textarea 
              className="w-full p-4 bg-surface-muted border-none rounded-2xl text-sm focus:ring-2 focus:ring-accent/20 transition-all min-h-[100px] resize-none"
              placeholder="Next steps and exercises..."
            />
          </div>
        </div>

        <div className="p-8 border-t border-primary/5 shrink-0">
          <button className="w-full py-4 bg-primary text-white rounded-2xl font-bold text-xs uppercase tracking-widest hover:opacity-90 transition-all shadow-xl shadow-primary/20">
            Save Draft
          </button>
        </div>
      </motion.aside>

      {!isSidebarOpen && (
        <button 
          onClick={() => setIsSidebarOpen(true)}
          className="fixed right-10 top-1/2 -translate-y-1/2 w-12 h-12 bg-white rounded-full border border-primary/5 shadow-2xl flex items-center justify-center text-primary hover:text-accent transition-colors z-40"
        >
          <ChevronLeft size={24} />
        </button>
      )}
    </div>
  );
}
