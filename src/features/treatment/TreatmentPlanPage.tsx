import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useTenantDb } from '@/hooks/useTenantDb';
import { 
  Target, 
  Activity, 
  Calendar, 
  ChevronRight, 
  Plus, 
  CheckCircle2, 
  Clock,
  ClipboardList,
  Dumbbell
} from 'lucide-react';
import { motion } from 'framer-motion';
import { format } from 'date-fns';
import { TREATMENT_MODALITIES } from '@/types';

export default function TreatmentPlanPage() {
  const { patientId } = useParams();
  const navigate = useNavigate();
  const { patients, treatmentPlans, soapNotes, hepPrograms } = useTenantDb();

  const { data: patient } = useQuery({
    queryKey: ['patient', patientId],
    queryFn: () => patients.findById(Number(patientId)),
    enabled: !!patientId
  });

  const { data: plan } = useQuery({
    queryKey: ['treatmentPlan', patientId],
    queryFn: async () => {
      const plans = await treatmentPlans.list();
      return plans.find(p => p.patientId === Number(patientId));
    },
    enabled: !!patientId
  });

  const { data: notes = [] } = useQuery({
    queryKey: ['soapNotes', patientId],
    queryFn: async () => {
      const allNotes = await soapNotes.list();
      return allNotes
        .filter(n => n.patientId === Number(patientId))
        .sort((a, b) => b.createdAt - a.createdAt);
    },
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

  if (!patient) return null;

  const progressPercentage = plan ? 65 : 0; // Simulated for now

  return (
    <div className="max-w-6xl mx-auto space-y-8 p-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-4xl font-bold text-primary tracking-tight">Treatment Plan</h1>
          <p className="text-primary/40 font-medium mt-1">
            {patient.firstName} {patient.lastName} • ID: {patient.id}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button 
            onClick={() => navigate(`/treatment/${patientId}/log`)}
            className="flex items-center gap-2 px-6 py-3 bg-primary text-white rounded-2xl font-bold text-sm uppercase tracking-widest hover:opacity-90 transition-all shadow-lg shadow-primary/10"
          >
            <Plus size={18} />
            Log Session
          </button>
          <button 
            onClick={() => navigate(`/treatment/${patientId}/hep`)}
            className="flex items-center gap-2 px-6 py-3 bg-white border border-primary/10 text-primary rounded-2xl font-bold text-sm uppercase tracking-widest hover:bg-primary/5 transition-all"
          >
            <Dumbbell size={18} />
            HEP Builder
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column: Plan Details */}
        <div className="lg:col-span-2 space-y-8">
          {/* Progress Card */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white p-8 rounded-[32px] border border-primary/5 shadow-sm"
          >
            <div className="flex items-center justify-between mb-8">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-primary/5 flex items-center justify-center text-primary">
                  <Activity size={20} />
                </div>
                <h2 className="text-xl font-bold text-primary">Overall Progress</h2>
              </div>
              <span className="text-3xl font-bold text-primary">{progressPercentage}%</span>
            </div>
            
            <div className="h-4 bg-primary/5 rounded-full overflow-hidden">
              <motion.div 
                initial={{ width: 0 }}
                animate={{ width: `${progressPercentage}%` }}
                transition={{ duration: 1, ease: "easeOut" }}
                className="h-full bg-primary"
              />
            </div>
          </motion.div>

          {/* Goals & Modalities */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="bg-white p-8 rounded-[32px] border border-primary/5 shadow-sm space-y-6"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-primary/5 flex items-center justify-center text-primary">
                  <Target size={20} />
                </div>
                <h2 className="text-xl font-bold text-primary">Active Goals</h2>
              </div>
              <div className="space-y-4">
                {plan?.goals ? (
                  plan.goals.split('\n').map((goal, i) => (
                    <div key={i} className="flex items-start gap-3">
                      <div className="mt-1 text-primary">
                        <CheckCircle2 size={16} />
                      </div>
                      <p className="text-primary/70 text-sm leading-relaxed">{goal}</p>
                    </div>
                  ))
                ) : (
                  <p className="text-primary/30 text-sm italic">No goals defined yet.</p>
                )}
              </div>
            </motion.div>

            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="bg-white p-8 rounded-[32px] border border-primary/5 shadow-sm space-y-6"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-primary/5 flex items-center justify-center text-primary">
                  <ClipboardList size={20} />
                </div>
                <h2 className="text-xl font-bold text-primary">Modalities</h2>
              </div>
              <div className="grid grid-cols-2 gap-3">
                {plan?.modalities ? (
                  plan.modalities.map((mod, i) => (
                    <div key={i} className="px-4 py-3 bg-primary/5 rounded-xl text-xs font-bold text-primary/70 uppercase tracking-wider text-center">
                      {mod}
                    </div>
                  ))
                ) : (
                  <p className="text-primary/30 text-sm italic col-span-2">No modalities selected.</p>
                )}
              </div>
            </motion.div>
          </div>

          {/* Timeline */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="bg-white p-8 rounded-[32px] border border-primary/5 shadow-sm space-y-8"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-primary/5 flex items-center justify-center text-primary">
                <Calendar size={20} />
              </div>
              <h2 className="text-xl font-bold text-primary">Session History</h2>
            </div>

            <div className="relative space-y-8 before:absolute before:left-[19px] before:top-2 before:bottom-2 before:w-px before:bg-primary/10">
              {notes.length > 0 ? (
                notes.map((note, i) => (
                  <div key={note.id} className="relative pl-12">
                    <div className="absolute left-0 top-1 w-10 h-10 rounded-full bg-white border-2 border-primary flex items-center justify-center z-10">
                      <div className="w-2 h-2 rounded-full bg-primary" />
                    </div>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-primary uppercase tracking-widest">
                          {format(note.createdAt, 'MMM d, yyyy')}
                        </span>
                        <span className="text-[10px] font-bold text-primary/30 uppercase tracking-widest">
                          Session #{notes.length - i}
                        </span>
                      </div>
                      <div className="p-4 bg-primary/5 rounded-2xl border border-primary/5">
                        <p className="text-sm text-primary/70 leading-relaxed line-clamp-2">
                          {JSON.parse(note.assessment).impression}
                        </p>
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-primary/30 text-sm italic pl-12">No sessions logged yet.</p>
              )}
            </div>
          </motion.div>
        </div>

        {/* Right Column: HEP Summary */}
        <div className="space-y-8">
          <motion.div 
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="bg-primary text-white p-8 rounded-[32px] shadow-xl shadow-primary/20 space-y-6"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Dumbbell size={24} />
                <h2 className="text-xl font-bold">Active HEP</h2>
              </div>
              <button 
                onClick={() => navigate(`/hep/${patientId}`)}
                className="text-white/60 hover:text-white transition-colors"
              >
                <ChevronRight size={24} />
              </button>
            </div>

            {hep ? (
              <div className="space-y-6">
                <div className="space-y-3">
                  {hep.exercises.slice(0, 3).map((ex, i) => (
                    <div key={i} className="flex items-center justify-between text-sm">
                      <span className="font-medium">{ex.name}</span>
                      <span className="text-white/60">{ex.sets}x{ex.reps}</span>
                    </div>
                  ))}
                  {hep.exercises.length > 3 && (
                    <p className="text-xs text-white/40 font-bold uppercase tracking-widest">
                      + {hep.exercises.length - 3} more exercises
                    </p>
                  )}
                </div>
                
                <div className="pt-6 border-t border-white/10">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-bold uppercase tracking-widest text-white/60">Adherence</span>
                    <span className="text-sm font-bold">82%</span>
                  </div>
                  <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                    <div className="h-full bg-white w-[82%]" />
                  </div>
                </div>
              </div>
            ) : (
              <div className="py-8 text-center space-y-4">
                <p className="text-white/40 text-sm italic">No exercise program assigned.</p>
                <button 
                  onClick={() => navigate(`/treatment/${patientId}/hep`)}
                  className="px-6 py-2 bg-white text-primary rounded-xl font-bold text-xs uppercase tracking-widest hover:bg-white/90 transition-all"
                >
                  Create Program
                </button>
              </div>
            )}
          </motion.div>

          <motion.div 
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-white p-8 rounded-[32px] border border-primary/5 shadow-sm space-y-6"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-primary/5 flex items-center justify-center text-primary">
                <Clock size={20} />
              </div>
              <h2 className="text-xl font-bold text-primary">Next Session</h2>
            </div>
            <div className="p-6 bg-primary/5 rounded-2xl border border-primary/5 text-center space-y-2">
              <p className="text-2xl font-bold text-primary">March 15</p>
              <p className="text-sm font-bold text-primary/40 uppercase tracking-widest">09:30 AM</p>
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
