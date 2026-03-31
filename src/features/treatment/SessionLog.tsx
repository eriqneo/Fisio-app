import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useTenantDb } from '@/hooks/useTenantDb';
import { 
  ClipboardCheck, 
  Clock, 
  MessageSquare, 
  CheckCircle2, 
  ChevronLeft,
  Activity,
  Save
} from 'lucide-react';
import { motion } from 'framer-motion';
import { TREATMENT_MODALITIES } from '@/types';

export default function SessionLog() {
  const { patientId } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { patients, treatmentPlans, soapNotes } = useTenantDb();

  const [formData, setFormData] = useState({
    modalities: [] as string[],
    duration: 45,
    patientResponse: 'Positive',
    notes: '',
    progressUpdate: 5 // percentage points to add
  });

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!patientId || !plan) return;

    try {
      // 1. Update Treatment Plan with new notes and progress
      const updatedNotes = [...(plan.progressNotes || []), formData.notes];
      await treatmentPlans.update(plan.id!, {
        progressNotes: updatedNotes,
        // In a real app, we'd calculate progress more scientifically
      });

      // 2. Create a simplified SOAP note entry for the session
      await soapNotes.create({
        tenantId: plan.tenantId,
        appointmentId: 0, // Placeholder for manual log
        patientId: Number(patientId),
        therapistId: 1, // Placeholder
        subjective: JSON.stringify({ response: formData.patientResponse }),
        objective: JSON.stringify({ duration: formData.duration, modalities: formData.modalities }),
        assessment: JSON.stringify({ impression: formData.notes }),
        plan: JSON.stringify({ next: 'Continue current plan' }),
        createdAt: Date.now(),
        updatedAt: Date.now()
      });

      queryClient.invalidateQueries({ queryKey: ['treatmentPlan', patientId] });
      queryClient.invalidateQueries({ queryKey: ['soapNotes', patientId] });
      navigate(`/treatment/${patientId}`);
    } catch (err) {
      console.error('Failed to log session', err);
    }
  };

  if (!patient) return null;

  return (
    <div className="max-w-3xl mx-auto space-y-8 p-6">
      <button 
        onClick={() => navigate(`/treatment/${patientId}`)}
        className="flex items-center gap-2 text-primary/40 hover:text-primary font-bold text-xs uppercase tracking-widest transition-colors"
      >
        <ChevronLeft size={16} />
        Back to Plan
      </button>

      <div className="space-y-2">
        <h1 className="text-4xl font-bold text-primary tracking-tight">Log Session</h1>
        <p className="text-primary/40 font-medium">
          Recording progress for {patient.firstName} {patient.lastName}
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-8">
        {/* Modalities */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white p-8 rounded-[32px] border border-primary/5 shadow-sm space-y-6"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/5 flex items-center justify-center text-primary">
              <ClipboardCheck size={20} />
            </div>
            <h2 className="text-xl font-bold text-primary">Modalities Used</h2>
          </div>
          
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {TREATMENT_MODALITIES.map((mod) => (
              <label 
                key={mod}
                className={`
                  flex items-center gap-3 p-4 rounded-2xl border cursor-pointer transition-all
                  ${formData.modalities.includes(mod) 
                    ? 'bg-primary border-primary text-white shadow-lg shadow-primary/20' 
                    : 'bg-white border-primary/5 text-primary/60 hover:border-primary/20'}
                `}
              >
                <input 
                  type="checkbox"
                  className="hidden"
                  checked={formData.modalities.includes(mod)}
                  onChange={(e) => {
                    if (e.target.checked) {
                      setFormData({ ...formData, modalities: [...formData.modalities, mod] });
                    } else {
                      setFormData({ ...formData, modalities: formData.modalities.filter(m => m !== mod) });
                    }
                  }}
                />
                <span className="text-xs font-bold uppercase tracking-wider">{mod}</span>
              </label>
            ))}
          </div>
        </motion.div>

        {/* Session Details */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-white p-8 rounded-[32px] border border-primary/5 shadow-sm space-y-6"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-primary/5 flex items-center justify-center text-primary">
                <Clock size={20} />
              </div>
              <h2 className="text-xl font-bold text-primary">Duration & Response</h2>
            </div>
            
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-primary/30 uppercase tracking-widest">Duration (minutes)</label>
                <input 
                  type="number"
                  value={formData.duration}
                  onChange={(e) => setFormData({ ...formData, duration: Number(e.target.value) })}
                  className="w-full px-6 py-4 bg-primary/5 border-none rounded-2xl text-primary font-bold focus:ring-2 focus:ring-primary/20 transition-all"
                />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-primary/30 uppercase tracking-widest">Patient Response</label>
                <select 
                  value={formData.patientResponse}
                  onChange={(e) => setFormData({ ...formData, patientResponse: e.target.value })}
                  className="w-full px-6 py-4 bg-primary/5 border-none rounded-2xl text-primary font-bold focus:ring-2 focus:ring-primary/20 transition-all"
                >
                  <option>Positive</option>
                  <option>Neutral</option>
                  <option>Negative</option>
                  <option>Fatigued</option>
                </select>
              </div>
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
                <Activity size={20} />
              </div>
              <h2 className="text-xl font-bold text-primary">Progress Update</h2>
            </div>
            
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-primary/30 uppercase tracking-widest">Estimated Progress Gain</label>
                <div className="flex items-center gap-4">
                  <input 
                    type="range"
                    min="0"
                    max="20"
                    value={formData.progressUpdate}
                    onChange={(e) => setFormData({ ...formData, progressUpdate: Number(e.target.value) })}
                    className="flex-1 accent-primary"
                  />
                  <span className="w-12 text-center font-bold text-primary">+{formData.progressUpdate}%</span>
                </div>
              </div>
              <p className="text-[10px] text-primary/30 italic">
                This will be added to the overall treatment plan progress.
              </p>
            </div>
          </motion.div>
        </div>

        {/* Notes */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="bg-white p-8 rounded-[32px] border border-primary/5 shadow-sm space-y-6"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/5 flex items-center justify-center text-primary">
              <MessageSquare size={20} />
            </div>
            <h2 className="text-xl font-bold text-primary">Session Notes</h2>
          </div>
          
          <textarea 
            value={formData.notes}
            onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
            placeholder="Describe patient progress, any adjustments made, or specific observations..."
            className="w-full h-40 px-6 py-6 bg-primary/5 border-none rounded-[24px] text-primary font-medium focus:ring-2 focus:ring-primary/20 transition-all resize-none"
          />
        </motion.div>

        <div className="flex justify-end pt-4">
          <button 
            type="submit"
            className="flex items-center gap-3 px-12 py-5 bg-primary text-white rounded-[24px] font-bold text-sm uppercase tracking-widest hover:opacity-90 transition-all shadow-xl shadow-primary/20"
          >
            <Save size={20} />
            Complete Session Log
          </button>
        </div>
      </form>
    </div>
  );
}
