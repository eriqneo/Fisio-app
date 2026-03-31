import React, { useState, useEffect, useMemo } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Save, 
  CheckCircle2, 
  History, 
  Activity, 
  ClipboardList, 
  Stethoscope, 
  Map, 
  ChevronRight,
  ChevronLeft,
  Search,
  Plus,
  X,
  Clock,
  AlertCircle
} from 'lucide-react';
import { useTenantDb } from '@/hooks/useTenantDb';
import { ICD10_DIAGNOSES, TREATMENT_MODALITIES, SOAPNote, Patient, Appointment } from '@/types';
import { format } from 'date-fns';
import FollowUpScheduler from './FollowUpScheduler';

export default function SOAPNoteEditor() {
  const [searchParams] = useSearchParams();
  const appointmentId = Number(searchParams.get('appointmentId'));
  const navigate = useNavigate();
  const { appointments, patients, soapNotes, soapNoteDrafts } = useTenantDb();
  const queryClient = useQueryClient();

  const [activeSection, setActiveSection] = useState<'S' | 'O' | 'A' | 'P'>('S');
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [diagnosisSearch, setDiagnosisSearch] = useState('');
  const [draftId, setDraftId] = useState<number | null>(null);

  // Form State
  const [formData, setFormData] = useState({
    subjective: {
      painScale: 5,
      duration: '',
      aggravating: '',
      relieving: '',
      goals: ''
    },
    objective: {
      rom: [{ joint: 'Knee', flexion: '', extension: '' }],
      strength: '5/5',
      posture: '',
      specialTests: [] as string[]
    },
    assessment: {
      diagnosis: null as typeof ICD10_DIAGNOSES[0] | null,
      icd10_2016_version: '',
      prognosis: 'Good',
      impression: ''
    },
    plan: {
      modalities: [] as string[],
      followUp: '',
      referral: ''
    }
  });

  const { data: appointment } = useQuery({
    queryKey: ['appointment', appointmentId],
    queryFn: () => appointments.findById(appointmentId),
    enabled: !!appointmentId
  });

  const { data: patient } = useQuery({
    queryKey: ['patient', appointment?.patientId],
    queryFn: () => patients.findById(appointment!.patientId),
    enabled: !!appointment?.patientId
  });

  // Load existing draft
  const { data: existingDraft } = useQuery({
    queryKey: ['soapNoteDraft', appointmentId],
    queryFn: async () => {
      const drafts = await soapNoteDrafts.list();
      return drafts.find(d => d.appointmentId === appointmentId) || null;
    },
    enabled: !!appointmentId
  });

  useEffect(() => {
    if (existingDraft) {
      setDraftId(existingDraft.id!);
      setFormData({
        subjective: JSON.parse(existingDraft.subjective),
        objective: JSON.parse(existingDraft.objective),
        assessment: JSON.parse(existingDraft.assessment),
        plan: JSON.parse(existingDraft.plan),
      });
      setLastSaved(new Date(existingDraft.updatedAt));
    }
  }, [existingDraft]);

  const { data: history = [] } = useQuery({
    queryKey: ['soapNotes', 'history', appointment?.patientId],
    queryFn: () => soapNotes.list(), // In real app, filter by patientId
    enabled: !!appointment?.patientId
  });

  // Auto-save logic
  useEffect(() => {
    const interval = setInterval(() => {
      handleSave();
    }, 30000);
    return () => clearInterval(interval);
  }, [formData, appointment, patient, draftId]);

  const handleSave = async () => {
    if (!appointmentId || !appointment || !patient) return;
    setIsSaving(true);
    try {
      const draftData = {
        appointmentId,
        patientId: patient.id!,
        therapistId: appointment.therapistId,
        subjective: JSON.stringify(formData.subjective),
        objective: JSON.stringify(formData.objective),
        assessment: JSON.stringify(formData.assessment),
        plan: JSON.stringify(formData.plan),
        icd10_2016_version: formData.assessment.icd10_2016_version,
        updatedAt: Date.now()
      };

      if (draftId) {
        await soapNoteDrafts.update(draftId, draftData);
      } else {
        const newId = await soapNoteDrafts.create(draftData);
        setDraftId(newId);
      }
      setLastSaved(new Date());
    } catch (err) {
      console.error('Auto-save failed', err);
    } finally {
      setIsSaving(false);
    }
  };

  const handleComplete = async () => {
    if (!appointmentId || !patient || !appointment) return;
    
    const note: SOAPNote = {
      tenantId: appointment.tenantId,
      appointmentId,
      patientId: patient.id!,
      therapistId: appointment.therapistId,
      subjective: JSON.stringify(formData.subjective),
      objective: JSON.stringify(formData.objective),
      assessment: JSON.stringify(formData.assessment),
      plan: JSON.stringify(formData.plan),
      icd10_2016_version: formData.assessment.icd10_2016_version,
      createdAt: Date.now(),
      updatedAt: Date.now()
    };

    await soapNotes.create(note);
    await appointments.update(appointmentId, { status: 'completed' });
    
    // Clean up draft
    if (draftId) {
      await soapNoteDrafts.delete(draftId);
    }

    queryClient.invalidateQueries({ queryKey: ['appointments'] });
    navigate('/agenda');
  };

  const filteredDiagnoses = useMemo(() => {
    if (!diagnosisSearch) return [];
    return ICD10_DIAGNOSES.filter(d => 
      d.code.toLowerCase().includes(diagnosisSearch.toLowerCase()) ||
      d.description.toLowerCase().includes(diagnosisSearch.toLowerCase())
    ).slice(0, 5);
  }, [diagnosisSearch]);

  if (!appointment || !patient) {
    return (
      <div className="p-12 text-center">
        <div className="w-12 h-12 border-4 border-primary/10 border-t-primary rounded-full animate-spin mx-auto mb-4" />
        <p className="text-primary/40 font-bold uppercase tracking-widest text-xs">Loading session data...</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col lg:flex-row gap-8 h-[calc(100vh-180px)]">
      {/* Main Editor */}
      <div className="flex-1 flex flex-col bg-white rounded-3xl border border-primary/5 shadow-xl shadow-primary/5 overflow-hidden">
        {/* Editor Header */}
        <div className="p-6 border-b border-primary/5 flex items-center justify-between bg-surface-muted/30">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-primary text-white flex items-center justify-center font-bold shadow-lg shadow-primary/10">
              {patient.firstName[0]}{patient.lastName[0]}
            </div>
            <div>
              <h2 className="text-xl font-serif text-primary">{patient.firstName} {patient.lastName}</h2>
              <p className="text-[10px] text-primary/40 font-bold uppercase tracking-widest">
                {appointment.type} • {format(appointment.startTime, 'h:mm a')}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-right">
              <p className="text-[10px] text-primary/30 font-bold uppercase tracking-widest">
                {isSaving ? 'Saving...' : lastSaved ? `Last saved ${format(lastSaved, 'HH:mm:ss')}` : 'Not saved'}
              </p>
              <button 
                onClick={handleSave}
                className="text-xs font-bold text-accent hover:underline flex items-center gap-1 justify-end"
              >
                <Save size={12} /> Save Draft
              </button>
            </div>
            <button 
              onClick={handleComplete}
              className="flex items-center gap-2 px-6 py-3 bg-emerald-500 text-white rounded-2xl font-bold text-sm hover:opacity-90 transition-all shadow-lg shadow-emerald-500/10"
            >
              <CheckCircle2 size={18} />
              Complete & Sign
            </button>
          </div>
        </div>

        {/* Section Tabs */}
        <div className="flex items-center border-b border-primary/5">
          {[
            { id: 'S', label: 'Subjective', icon: ClipboardList },
            { id: 'O', label: 'Objective', icon: Stethoscope },
            { id: 'A', label: 'Assessment', icon: Activity },
            { id: 'P', label: 'Plan', icon: Map },
          ].map((section) => (
            <button
              key={section.id}
              onClick={() => setActiveSection(section.id as any)}
              className={`flex-1 flex items-center justify-center gap-3 py-4 text-xs font-bold uppercase tracking-widest transition-all border-b-2 ${
                activeSection === section.id 
                  ? 'border-accent text-primary bg-accent/5' 
                  : 'border-transparent text-primary/30 hover:text-primary hover:bg-surface-muted/30'
              }`}
            >
              <section.icon size={16} />
              <span className="hidden sm:inline">{section.label}</span>
              <span className="sm:hidden">{section.id}</span>
            </button>
          ))}
        </div>

        {/* Editor Content */}
        <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
          <AnimatePresence mode="wait">
            {activeSection === 'S' && (
              <motion.div
                key="S"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="space-y-8"
              >
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-primary/40 uppercase tracking-widest">Pain Scale (1-10)</label>
                    <span className="text-2xl font-bold text-accent">{formData.subjective.painScale}</span>
                  </div>
                  <input 
                    type="range" min="0" max="10" 
                    value={formData.subjective.painScale}
                    onChange={(e) => setFormData({ ...formData, subjective: { ...formData.subjective, painScale: Number(e.target.value) } })}
                    className="w-full h-2 bg-surface-muted rounded-lg appearance-none cursor-pointer accent-accent"
                  />
                  <div className="flex justify-between text-[10px] font-bold text-primary/20 uppercase">
                    <span>No Pain</span>
                    <span>Severe Pain</span>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-primary/40 uppercase tracking-widest">Symptom Duration</label>
                    <input 
                      type="text" 
                      placeholder="e.g., 2 weeks, chronic"
                      value={formData.subjective.duration}
                      onChange={(e) => setFormData({ ...formData, subjective: { ...formData.subjective, duration: e.target.value } })}
                      className="w-full px-4 py-3 bg-surface-muted border-none rounded-xl text-sm focus:ring-2 focus:ring-accent/20 transition-all"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-primary/40 uppercase tracking-widest">Aggravating Factors</label>
                    <input 
                      type="text"
                      placeholder="e.g., Sitting, walking up stairs"
                      value={formData.subjective.aggravating}
                      onChange={(e) => setFormData({ ...formData, subjective: { ...formData.subjective, aggravating: e.target.value } })}
                      className="w-full px-4 py-3 bg-surface-muted border-none rounded-xl text-sm focus:ring-2 focus:ring-accent/20 transition-all"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-bold text-primary/40 uppercase tracking-widest">Patient-Reported Goals</label>
                  <textarea 
                    rows={4}
                    placeholder="What does the patient want to achieve?"
                    value={formData.subjective.goals}
                    onChange={(e) => setFormData({ ...formData, subjective: { ...formData.subjective, goals: e.target.value } })}
                    className="w-full px-4 py-3 bg-surface-muted border-none rounded-xl text-sm focus:ring-2 focus:ring-accent/20 transition-all resize-none"
                  />
                </div>
              </motion.div>
            )}

            {activeSection === 'O' && (
              <motion.div
                key="O"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="space-y-8"
              >
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-primary/40 uppercase tracking-widest">ROM Measurements</label>
                    <button 
                      onClick={() => setFormData({ ...formData, objective: { ...formData.objective, rom: [...formData.objective.rom, { joint: '', flexion: '', extension: '' }] } })}
                      className="text-[10px] font-bold text-accent uppercase tracking-widest flex items-center gap-1"
                    >
                      <Plus size={12} /> Add Joint
                    </button>
                  </div>
                  <div className="overflow-hidden rounded-2xl border border-primary/5">
                    <table className="w-full text-sm">
                      <thead className="bg-surface-muted/50 text-[10px] font-bold text-primary/40 uppercase tracking-widest">
                        <tr>
                          <th className="px-4 py-3 text-left">Joint</th>
                          <th className="px-4 py-3 text-left">Flexion</th>
                          <th className="px-4 py-3 text-left">Extension</th>
                          <th className="px-4 py-3 w-10"></th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-primary/5">
                        {formData.objective.rom.map((row, i) => (
                          <tr key={i}>
                            <td className="px-2 py-2">
                              <input 
                                type="text" value={row.joint} 
                                onChange={(e) => {
                                  const newRom = [...formData.objective.rom];
                                  newRom[i].joint = e.target.value;
                                  setFormData({ ...formData, objective: { ...formData.objective, rom: newRom } });
                                }}
                                className="w-full px-2 py-1 bg-transparent border-none focus:ring-0 font-bold text-primary" 
                              />
                            </td>
                            <td className="px-2 py-2">
                              <input 
                                type="text" value={row.flexion} 
                                onChange={(e) => {
                                  const newRom = [...formData.objective.rom];
                                  newRom[i].flexion = e.target.value;
                                  setFormData({ ...formData, objective: { ...formData.objective, rom: newRom } });
                                }}
                                className="w-full px-2 py-1 bg-transparent border-none focus:ring-0" 
                              />
                            </td>
                            <td className="px-2 py-2">
                              <input 
                                type="text" value={row.extension} 
                                onChange={(e) => {
                                  const newRom = [...formData.objective.rom];
                                  newRom[i].extension = e.target.value;
                                  setFormData({ ...formData, objective: { ...formData.objective, rom: newRom } });
                                }}
                                className="w-full px-2 py-1 bg-transparent border-none focus:ring-0" 
                              />
                            </td>
                            <td className="px-2 py-2">
                              <button 
                                onClick={() => {
                                  const newRom = formData.objective.rom.filter((_, idx) => idx !== i);
                                  setFormData({ ...formData, objective: { ...formData.objective, rom: newRom } });
                                }}
                                className="p-1 text-primary/20 hover:text-error transition-all"
                              >
                                <X size={14} />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-primary/40 uppercase tracking-widest">Strength Grade</label>
                    <select 
                      value={formData.objective.strength}
                      onChange={(e) => setFormData({ ...formData, objective: { ...formData.objective, strength: e.target.value } })}
                      className="w-full px-4 py-3 bg-surface-muted border-none rounded-xl text-sm focus:ring-2 focus:ring-accent/20 transition-all appearance-none"
                    >
                      {['0/5', '1/5', '2/5', '3/5', '4/5', '5/5'].map(g => <option key={g} value={g}>{g}</option>)}
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-primary/40 uppercase tracking-widest">Posture Observations</label>
                    <input 
                      type="text"
                      value={formData.objective.posture}
                      onChange={(e) => setFormData({ ...formData, objective: { ...formData.objective, posture: e.target.value } })}
                      className="w-full px-4 py-3 bg-surface-muted border-none rounded-xl text-sm focus:ring-2 focus:ring-accent/20 transition-all"
                    />
                  </div>
                </div>

                <div className="space-y-4">
                  <label className="text-xs font-bold text-primary/40 uppercase tracking-widest">Special Tests</label>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {['SLR', 'Spurling\'s', 'Lachman', 'McMurray', 'Empty Can', 'Hawkins-Kennedy'].map(test => (
                      <button
                        key={test}
                        onClick={() => {
                          const tests = formData.objective.specialTests.includes(test)
                            ? formData.objective.specialTests.filter(t => t !== test)
                            : [...formData.objective.specialTests, test];
                          setFormData({ ...formData, objective: { ...formData.objective, specialTests: tests } });
                        }}
                        className={`px-4 py-3 rounded-xl text-xs font-bold border transition-all ${
                          formData.objective.specialTests.includes(test)
                            ? 'bg-primary text-white border-primary shadow-lg shadow-primary/10'
                            : 'bg-white text-primary/40 border-primary/5 hover:border-primary/20'
                        }`}
                      >
                        {test}
                      </button>
                    ))}
                  </div>
                </div>
              </motion.div>
            )}

            {activeSection === 'A' && (
              <motion.div
                key="A"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="space-y-8"
              >
                <div className="space-y-2 relative">
                  <label className="text-xs font-bold text-primary/40 uppercase tracking-widest">ICD-10 2016 Diagnosis</label>
                  {formData.assessment.icd10_2016_version ? (
                    <div className="flex items-center justify-between p-4 bg-accent/5 rounded-2xl border border-accent/20">
                      <div className="flex items-center gap-3">
                        <span className="px-2 py-1 bg-accent text-white rounded text-[10px] font-bold">{formData.assessment.icd10_2016_version}</span>
                        <span className="text-sm font-bold text-primary">
                          {ICD10_DIAGNOSES.find(d => d.code === formData.assessment.icd10_2016_version)?.description || 'Custom Diagnosis'}
                        </span>
                      </div>
                      <button onClick={() => setFormData({ ...formData, assessment: { ...formData.assessment, icd10_2016_version: '' } })} className="text-primary/20 hover:text-error transition-all">
                        <X size={16} />
                      </button>
                    </div>
                  ) : (
                    <div className="relative">
                      <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-primary/20" size={18} />
                      <input 
                        type="text"
                        value={diagnosisSearch}
                        onChange={(e) => setDiagnosisSearch(e.target.value)}
                        placeholder="Search ICD-10 2016 codes or descriptions..."
                        className="w-full pl-12 pr-4 py-4 bg-surface-muted border-none rounded-2xl text-sm focus:ring-2 focus:ring-accent/20 transition-all"
                      />
                      <AnimatePresence>
                        {filteredDiagnoses.length > 0 && (
                          <motion.div 
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: 10 }}
                            className="absolute top-full left-0 right-0 mt-2 bg-white rounded-2xl shadow-xl border border-primary/5 z-20 overflow-hidden"
                          >
                            {filteredDiagnoses.map(d => (
                              <button
                                key={d.code}
                                onClick={() => {
                                  setFormData({ ...formData, assessment: { ...formData.assessment, icd10_2016_version: d.code } });
                                  setDiagnosisSearch('');
                                }}
                                className="w-full flex items-center gap-3 p-4 hover:bg-surface-muted transition-all text-left"
                              >
                                <span className="px-2 py-1 bg-surface-muted text-primary/40 rounded text-[10px] font-bold">{d.code}</span>
                                <span className="text-sm font-bold text-primary">{d.description}</span>
                              </button>
                            ))}
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  )}
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-bold text-primary/40 uppercase tracking-widest">Clinical Impression</label>
                  <textarea 
                    rows={4}
                    value={formData.assessment.impression}
                    onChange={(e) => setFormData({ ...formData, assessment: { ...formData.assessment, impression: e.target.value } })}
                    className="w-full px-4 py-3 bg-surface-muted border-none rounded-xl text-sm focus:ring-2 focus:ring-accent/20 transition-all resize-none"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-bold text-primary/40 uppercase tracking-widest">Prognosis</label>
                  <div className="flex gap-3">
                    {['Excellent', 'Good', 'Fair', 'Poor'].map(p => (
                      <button
                        key={p}
                        onClick={() => setFormData({ ...formData, assessment: { ...formData.assessment, prognosis: p } })}
                        className={`flex-1 py-3 rounded-xl text-xs font-bold border transition-all ${
                          formData.assessment.prognosis === p
                            ? 'bg-primary text-white border-primary'
                            : 'bg-white text-primary/40 border-primary/5 hover:border-primary/20'
                        }`}
                      >
                        {p}
                      </button>
                    ))}
                  </div>
                </div>
              </motion.div>
            )}

            {activeSection === 'P' && (
              <motion.div
                key="P"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="space-y-8"
              >
                <div className="space-y-4">
                  <label className="text-xs font-bold text-primary/40 uppercase tracking-widest">Treatment Modalities</label>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {TREATMENT_MODALITIES.map(mod => (
                      <button
                        key={mod}
                        onClick={() => {
                          const mods = formData.plan.modalities.includes(mod)
                            ? formData.plan.modalities.filter(m => m !== mod)
                            : [...formData.plan.modalities, mod];
                          setFormData({ ...formData, plan: { ...formData.plan, modalities: mods } });
                        }}
                        className={`px-4 py-3 rounded-xl text-[10px] font-bold border transition-all text-left flex items-center justify-between ${
                          formData.plan.modalities.includes(mod)
                            ? 'bg-accent text-white border-accent shadow-lg shadow-accent/10'
                            : 'bg-white text-primary/40 border-primary/5 hover:border-primary/20'
                        }`}
                      >
                        {mod}
                        {formData.plan.modalities.includes(mod) && <CheckCircle2 size={12} />}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div className="space-y-6">
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-primary/40 uppercase tracking-widest">Referral Needed?</label>
                      <input 
                        type="text"
                        placeholder="e.g., Orthopedic Surgeon, MRI"
                        value={formData.plan.referral}
                        onChange={(e) => setFormData({ ...formData, plan: { ...formData.plan, referral: e.target.value } })}
                        className="w-full px-4 py-3 bg-surface-muted border-none rounded-xl text-sm focus:ring-2 focus:ring-accent/20 transition-all"
                      />
                    </div>
                  </div>
                  
                  <FollowUpScheduler 
                    patientId={patient?.id!} 
                    therapistId={appointment?.therapistId!} 
                    onScheduled={(date) => setFormData({ ...formData, plan: { ...formData.plan, followUp: format(date, 'yyyy-MM-dd') } })}
                  />
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Footer Navigation */}
        <div className="p-6 border-t border-primary/5 flex items-center justify-between bg-surface-muted/30">
          <button 
            disabled={activeSection === 'S'}
            onClick={() => setActiveSection(prev => prev === 'O' ? 'S' : prev === 'A' ? 'O' : 'A')}
            className="flex items-center gap-2 px-6 py-3 text-primary/40 font-bold text-xs uppercase tracking-widest hover:text-primary transition-all disabled:opacity-0"
          >
            <ChevronLeft size={16} />
            Previous Section
          </button>
          {activeSection !== 'P' ? (
            <button 
              onClick={() => setActiveSection(prev => prev === 'S' ? 'O' : prev === 'O' ? 'A' : 'P')}
              className="flex items-center gap-2 px-8 py-3 bg-primary text-white rounded-2xl font-bold text-xs uppercase tracking-widest hover:opacity-90 transition-all shadow-lg shadow-primary/10"
            >
              Next Section
              <ChevronRight size={16} />
            </button>
          ) : (
            <button 
              onClick={handleComplete}
              className="flex items-center gap-2 px-8 py-3 bg-emerald-500 text-white rounded-2xl font-bold text-xs uppercase tracking-widest hover:opacity-90 transition-all shadow-lg shadow-emerald-500/10"
            >
              Finalize Note
              <CheckCircle2 size={16} />
            </button>
          )}
        </div>
      </div>

      {/* History Sidebar */}
      <div className="w-full lg:w-80 flex flex-col gap-6">
        <div className="bg-white rounded-3xl border border-primary/5 shadow-sm overflow-hidden flex flex-col h-full">
          <div className="p-6 border-b border-primary/5 flex items-center gap-3 bg-surface-muted/30">
            <History size={18} className="text-primary/40" />
            <h3 className="font-serif text-lg text-primary">Past Sessions</h3>
          </div>
          <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar">
            {history.length === 0 ? (
              <div className="p-8 text-center">
                <p className="text-[10px] font-bold text-primary/20 uppercase tracking-widest">No previous notes</p>
              </div>
            ) : (
              history.map((note) => (
                <div key={note.id} className="p-4 rounded-2xl border border-primary/5 hover:bg-surface-muted/30 transition-all cursor-pointer group">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[10px] font-bold text-primary/30 uppercase tracking-widest">{format(note.createdAt, 'MMM d, yyyy')}</span>
                    <ChevronRight size={14} className="text-primary/20 group-hover:text-accent transition-all" />
                  </div>
                  <p className="text-xs font-bold text-primary mb-1">Follow-up Session</p>
                  <p className="text-[10px] text-primary/40 line-clamp-2">
                    Patient reported 3/10 pain. ROM improved to 120 degrees flexion...
                  </p>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="bg-accent p-6 rounded-3xl shadow-xl shadow-accent/20 text-white">
          <div className="flex items-center gap-3 mb-4">
            <AlertCircle size={18} />
            <h4 className="font-bold text-xs uppercase tracking-widest">Clinical Tip</h4>
          </div>
          <p className="text-xs text-white/80 leading-relaxed">
            Remember to document any changes in the Home Exercise Program adherence.
          </p>
        </div>
      </div>
    </div>
  );
}
