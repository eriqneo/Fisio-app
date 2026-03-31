import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  X, 
  Activity, 
  Stethoscope, 
  Pill, 
  AlertCircle,
  Calendar,
  ChevronRight,
  FileText
} from 'lucide-react';
import { useDoctorDb } from '@/hooks/useDoctorDb';
import { useQuery } from '@tanstack/react-query';
import { format } from 'date-fns';

interface PatientQuickViewProps {
  encounterId: number | null;
  onClose: () => void;
}

export default function PatientQuickView({ encounterId, onClose }: PatientQuickViewProps) {
  const { encounters } = useDoctorDb();

  const { data: bundle, isLoading } = useQuery({
    queryKey: ['encounter-bundle', encounterId],
    queryFn: () => encounters.getBundle(encounterId!),
    enabled: !!encounterId,
  });

  return (
    <AnimatePresence>
      {encounterId && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-doctor-sidebar/40 backdrop-blur-sm z-40"
          />

          {/* Panel */}
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="fixed inset-y-0 right-0 w-full max-w-xl bg-white shadow-2xl z-50 flex flex-col overflow-hidden"
          >
            {isLoading ? (
              <div className="flex-1 flex flex-col items-center justify-center gap-4">
                <div className="w-12 h-12 border-4 border-doctor-accent border-t-transparent rounded-full animate-spin" />
                <p className="text-primary/40 font-bold uppercase tracking-widest text-xs">Loading Patient Context</p>
              </div>
            ) : bundle ? (
              <>
                {/* Header */}
                <div className="p-8 border-b border-primary/5 bg-surface-muted/30">
                  <div className="flex items-start justify-between mb-6">
                    <div className="flex items-center gap-5">
                      <div className="w-16 h-16 rounded-2xl bg-doctor-accent text-doctor-sidebar flex items-center justify-center text-2xl font-bold shadow-xl shadow-doctor-accent/20">
                        P
                      </div>
                      <div>
                        <h2 className="text-2xl font-serif text-primary">Patient Record</h2>
                        <p className="text-primary/40 text-[10px] font-bold uppercase tracking-widest mt-1">
                          Encounter ID: #{bundle.encounter.id}
                        </p>
                      </div>
                    </div>
                    <button 
                      onClick={onClose}
                      className="p-2 hover:bg-white rounded-xl transition-colors text-primary/20 hover:text-primary"
                    >
                      <X size={24} />
                    </button>
                  </div>

                  {/* Allergies Strip */}
                  {bundle.medicalHistory?.allergies && bundle.medicalHistory.allergies.length > 0 && (
                    <div className="flex items-center gap-3 p-4 bg-red-500/5 border border-red-500/10 rounded-2xl mb-6">
                      <AlertCircle className="text-red-500" size={20} />
                      <div className="flex-1">
                        <p className="text-[10px] font-bold text-red-500 uppercase tracking-widest">Allergies Alert</p>
                        <p className="text-xs font-medium text-red-900">
                          {bundle.medicalHistory.allergies.map(a => `${a.substance} (${a.severity})`).join(', ')}
                        </p>
                      </div>
                    </div>
                  )}
                </div>

                <div className="flex-1 overflow-y-auto p-8 space-y-10">
                  {/* Vitals Section */}
                  <section>
                    <div className="flex items-center gap-3 mb-6">
                      <Activity className="text-doctor-accent" size={20} />
                      <h3 className="text-sm font-bold text-primary uppercase tracking-widest">Recent Vitals</h3>
                    </div>
                    {bundle.physicalExam?.vitalSigns ? (
                      <div className="grid grid-cols-3 gap-4">
                        {[
                          { label: 'BP', value: bundle.physicalExam.vitalSigns.bp, unit: 'mmHg' },
                          { label: 'HR', value: bundle.physicalExam.vitalSigns.hr, unit: 'bpm' },
                          { label: 'SpO2', value: bundle.physicalExam.vitalSigns.spo2, unit: '%' },
                          { label: 'Temp', value: bundle.physicalExam.vitalSigns.temp, unit: '°C' },
                          { label: 'RR', value: bundle.physicalExam.vitalSigns.rr, unit: 'bpm' },
                          { label: 'BMI', value: bundle.physicalExam.vitalSigns.bmi, unit: '' },
                        ].map((v, i) => (
                          <div key={i} className="p-4 bg-surface-muted/50 rounded-2xl border border-primary/5">
                            <p className="text-[10px] font-bold text-primary/30 uppercase tracking-widest mb-1">{v.label}</p>
                            <p className="text-lg font-bold text-primary">{v.value} <span className="text-[10px] text-primary/40 font-medium">{v.unit}</span></p>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-sm text-primary/40 italic">No vitals recorded for this encounter.</p>
                    )}
                  </section>

                  {/* Diagnoses */}
                  <section>
                    <div className="flex items-center gap-3 mb-6">
                      <Stethoscope className="text-doctor-accent" size={20} />
                      <h3 className="text-sm font-bold text-primary uppercase tracking-widest">Active Diagnoses</h3>
                    </div>
                    {bundle.clinicalImpression ? (
                      <div className="p-5 bg-white rounded-2xl border border-primary/5 shadow-sm">
                        <div className="flex items-start justify-between mb-2">
                          <h4 className="font-bold text-primary">{bundle.clinicalImpression.primaryDiagnosis.description}</h4>
                          <span className="px-2 py-0.5 bg-primary/5 text-primary text-[10px] font-bold rounded-lg">
                            {bundle.clinicalImpression.primaryDiagnosis.icd10Code}
                          </span>
                        </div>
                        <p className="text-xs text-primary/60">
                          {bundle.clinicalImpression.primaryDiagnosis.onset} • {bundle.clinicalImpression.primaryDiagnosis.severity}
                        </p>
                      </div>
                    ) : (
                      <p className="text-sm text-primary/40 italic">No primary diagnosis recorded.</p>
                    )}
                  </section>

                  {/* Medications */}
                  <section>
                    <div className="flex items-center gap-3 mb-6">
                      <Pill className="text-doctor-accent" size={20} />
                      <h3 className="text-sm font-bold text-primary uppercase tracking-widest">Current Medications</h3>
                    </div>
                    <div className="space-y-3">
                      {bundle.medicalHistory?.currentMedications && bundle.medicalHistory.currentMedications.length > 0 ? (
                        bundle.medicalHistory.currentMedications.map((med, i) => (
                          <div key={i} className="flex items-center justify-between p-4 bg-surface-muted/30 rounded-2xl border border-primary/5">
                            <div>
                              <p className="text-sm font-bold text-primary">{med.name}</p>
                              <p className="text-[10px] text-primary/40 font-medium uppercase tracking-widest">
                                {med.dose} • {med.frequency}
                              </p>
                            </div>
                            <ChevronRight size={16} className="text-primary/10" />
                          </div>
                        ))
                      ) : (
                        <p className="text-sm text-primary/40 italic">No medications listed in history.</p>
                      )}
                    </div>
                  </section>

                  {/* Orders & Prescriptions */}
                  <section className="grid grid-cols-2 gap-6">
                    <div>
                      <div className="flex items-center gap-3 mb-4">
                        <FileText className="text-doctor-accent" size={18} />
                        <h3 className="text-xs font-bold text-primary uppercase tracking-widest">Active Orders</h3>
                      </div>
                      <div className="bg-surface-muted/20 p-4 rounded-2xl border border-primary/5 text-center">
                        <p className="text-2xl font-bold text-primary">{bundle.orders.length}</p>
                        <p className="text-[10px] font-bold text-primary/30 uppercase tracking-widest">Pending Fulfillment</p>
                      </div>
                    </div>
                    <div>
                      <div className="flex items-center gap-3 mb-4">
                        <Pill className="text-doctor-accent" size={18} />
                        <h3 className="text-xs font-bold text-primary uppercase tracking-widest">Prescriptions</h3>
                      </div>
                      <div className="bg-surface-muted/20 p-4 rounded-2xl border border-primary/5 text-center">
                        <p className="text-2xl font-bold text-primary">{bundle.prescriptions.length}</p>
                        <p className="text-[10px] font-bold text-primary/30 uppercase tracking-widest">Issued Today</p>
                      </div>
                    </div>
                  </section>
                </div>

                {/* Footer Actions */}
                <div className="p-8 border-t border-primary/5 bg-white">
                  <button className="w-full py-5 bg-doctor-sidebar text-white rounded-2xl font-bold text-xs uppercase tracking-widest hover:bg-doctor-sidebar-hover transition-all shadow-xl shadow-doctor-sidebar/20">
                    Open Full Clinical Record
                  </button>
                </div>
              </>
            ) : null}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
