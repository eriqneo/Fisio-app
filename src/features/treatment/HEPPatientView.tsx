import React, { useState } from 'react';
import { useParams } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useTenantDb } from '@/hooks/useTenantDb';
import { 
  Play, 
  CheckCircle2, 
  XCircle, 
  HelpCircle,
  ChevronRight,
  Dumbbell,
  Calendar,
  Award
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { format } from 'date-fns';

export default function HEPPatientView() {
  const { patientId } = useParams();
  const queryClient = useQueryClient();
  const { patients, hepPrograms } = useTenantDb();
  const [activeExercise, setActiveExercise] = useState<number | null>(null);

  const { data: patient } = useQuery({
    queryKey: ['patient', patientId],
    queryFn: () => patients.findById(Number(patientId)),
    enabled: !!patientId
  });

  const { data: hep } = useQuery({
    queryKey: ['hepProgram', patientId],
    queryFn: async () => {
      const programs = await hepPrograms.list();
      return programs.find(p => p.patientId === Number(patientId));
    },
    enabled: !!patientId
  });

  const today = format(new Date(), 'yyyy-MM-dd');
  const todayAdherence = hep?.adherenceLog?.[today] || null;

  const logAdherence = async (status: 'Yes' | 'Partially' | 'No') => {
    if (!hep) return;
    
    const newAdherenceLog = {
      ...(hep.adherenceLog || {}),
      [today]: status
    };

    try {
      await hepPrograms.update(hep.id!, { adherenceLog: newAdherenceLog });
      queryClient.invalidateQueries({ queryKey: ['hepProgram', patientId] });
    } catch (err) {
      console.error('Failed to log adherence', err);
    }
  };

  if (!patient || !hep) return (
    <div className="min-h-screen bg-primary/5 flex items-center justify-center p-6">
      <div className="text-center space-y-4">
        <div className="w-16 h-16 rounded-full bg-primary/10 mx-auto flex items-center justify-center text-primary">
          <Dumbbell size={32} />
        </div>
        <h1 className="text-2xl font-bold text-primary">No Program Found</h1>
        <p className="text-primary/40">Please contact your therapist to assign a program.</p>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-primary/5 pb-20">
      {/* Header */}
      <div className="bg-primary text-white p-8 rounded-b-[40px] shadow-xl space-y-6">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <h1 className="text-2xl font-bold">Hello, {patient.firstName}!</h1>
            <p className="text-white/60 text-sm">Ready for today's recovery session?</p>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-white/10 flex items-center justify-center">
            <Award size={24} className="text-white" />
          </div>
        </div>

        {/* Adherence Check-in */}
        <div className="bg-white/10 p-6 rounded-[24px] backdrop-blur-md space-y-4">
          <div className="flex items-center gap-3">
            <Calendar size={18} className="text-white/60" />
            <h2 className="text-sm font-bold uppercase tracking-widest">Today's Progress</h2>
          </div>
          
          {!todayAdherence ? (
            <div className="space-y-4">
              <p className="text-sm font-medium">Did you complete your exercises today?</p>
              <div className="grid grid-cols-3 gap-3">
                <button 
                  onClick={() => logAdherence('Yes')}
                  className="py-3 bg-white text-primary rounded-xl font-bold text-xs uppercase tracking-widest hover:bg-white/90 transition-all"
                >
                  Yes
                </button>
                <button 
                  onClick={() => logAdherence('Partially')}
                  className="py-3 bg-white/20 text-white rounded-xl font-bold text-xs uppercase tracking-widest hover:bg-white/30 transition-all"
                >
                  Part
                </button>
                <button 
                  onClick={() => logAdherence('No')}
                  className="py-3 bg-white/10 text-white/60 rounded-xl font-bold text-xs uppercase tracking-widest hover:bg-white/20 transition-all"
                >
                  No
                </button>
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-3 py-2">
              <CheckCircle2 size={24} className="text-emerald-400" />
              <p className="font-bold">Logged: {todayAdherence}</p>
            </div>
          )}
        </div>
      </div>

      {/* Exercise List */}
      <div className="max-w-xl mx-auto p-6 space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-primary">Your Exercises</h2>
          <span className="text-xs font-bold text-primary/30 uppercase tracking-widest">
            {hep.exercises.length} Total
          </span>
        </div>

        <div className="space-y-4">
          {hep.exercises.map((ex, i) => (
            <motion.div 
              key={i}
              layout
              className="bg-white rounded-[24px] border border-primary/5 shadow-sm overflow-hidden"
            >
              <div 
                onClick={() => setActiveExercise(activeExercise === i ? null : i)}
                className="p-6 flex items-center justify-between cursor-pointer"
              >
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 rounded-2xl overflow-hidden bg-primary/5">
                    <img 
                      src={ex.imageUrl} 
                      alt={ex.name}
                      className="w-full h-full object-cover"
                      referrerPolicy="no-referrer"
                    />
                  </div>
                  <div>
                    <h3 className="font-bold text-primary">{ex.name}</h3>
                    <p className="text-xs font-bold text-primary/30 uppercase tracking-widest">
                      {ex.sets} Sets • {ex.reps} Reps
                    </p>
                  </div>
                </div>
                <ChevronRight 
                  size={20} 
                  className={`text-primary/20 transition-transform ${activeExercise === i ? 'rotate-90' : ''}`} 
                />
              </div>

              <AnimatePresence>
                {activeExercise === i && (
                  <motion.div 
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="border-t border-primary/5 bg-primary/5"
                  >
                    <div className="p-6 space-y-6">
                      <div className="relative aspect-video rounded-2xl overflow-hidden bg-black group">
                        <img 
                          src={ex.imageUrl} 
                          alt={ex.name}
                          className="w-full h-full object-cover opacity-60"
                          referrerPolicy="no-referrer"
                        />
                        <button className="absolute inset-0 flex items-center justify-center text-white">
                          <div className="w-16 h-16 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center group-hover:scale-110 transition-transform">
                            <Play size={32} fill="currentColor" />
                          </div>
                        </button>
                      </div>

                      <div className="space-y-4">
                        <div className="space-y-2">
                          <h4 className="text-[10px] font-bold text-primary/30 uppercase tracking-widest">Instructions</h4>
                          <p className="text-sm text-primary/70 leading-relaxed">{ex.description}</p>
                        </div>
                        {ex.notes && (
                          <div className="p-4 bg-primary/10 rounded-xl border border-primary/10">
                            <h4 className="text-[10px] font-bold text-primary/40 uppercase tracking-widest mb-1">Therapist Notes</h4>
                            <p className="text-sm text-primary italic">"{ex.notes}"</p>
                          </div>
                        )}
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
}
