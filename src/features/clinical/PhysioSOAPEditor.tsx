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
  AlertCircle,
  Flag,
  Thermometer,
  Move,
  Dumbbell,
  Brain,
  UserCheck,
  Hand,
  Target,
  Info,
  MapPin,
  ShieldCheck,
  Home,
  Calendar,
  DollarSign,
  Zap,
  TrendingUp
} from 'lucide-react';
import { useTenantDb } from '@/hooks/useTenantDb';
import { ICD10_DIAGNOSES, TREATMENT_MODALITIES, SOAPNote, Patient, Appointment } from '@/types';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import FollowUpScheduler from './FollowUpScheduler';

const VISIT_TYPES = ['Initial', 'Follow-up', 'Discharge'];
const NOTE_TYPES = ['SOAP initial', 'SOAP progress', 'SOAP discharge'];
const PAIN_BEHAVIOURS = ['Constant', 'Intermittent', 'Morning stiffness', 'Nocturnal', 'Worse with activity', 'Better with rest'];
const RED_FLAGS = ['Unexplained weight loss', 'Night pain', 'Saddle anaesthesia', 'Bladder/Bowel dysfunction', 'Fever/Chills', 'History of malignancy'];
const YELLOW_FLAGS = ['Fear avoidance', 'Anxiety', 'Depression', 'Work-related stress', 'Catastrophizing'];
const PROGNOSIS_OPTIONS = ['Excellent', 'Good', 'Fair', 'Guarded', 'Poor'];
const REHAB_POTENTIAL = ['High', 'Moderate', 'Low'];
const MMT_GRADES = ['0/5', '1/5', '2/5', '3/5', '4/5', '5/5'];
const LOCATIONS = ['Clinic', 'Home Visit', 'Telehealth', 'Gym'];

export default function PhysioSOAPEditor() {
  const [searchParams] = useSearchParams();
  const appointmentId = Number(searchParams.get('appointmentId'));
  const navigate = useNavigate();
  const { appointments, patients, soapNotes, soapNoteDrafts } = useTenantDb();
  const queryClient = useQueryClient();

  const [activeSection, setActiveSection] = useState<'S' | 'O' | 'A' | 'P' | 'M'>('S');
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [diagnosisSearch, setDiagnosisSearch] = useState('');
  const [draftId, setDraftId] = useState<number | null>(null);

  // Form State
  const [formData, setFormData] = useState({
    metadata: {
      sessionDuration: 30,
      location: 'Clinic',
      patientConsent: true,
      noteType: 'SOAP progress'
    },
    subjective: {
      visitType: 'Follow-up',
      chiefComplaint: '',
      onsetDuration: '',
      painLocation: '',
      painIntensity: {
        current: 0,
        worst: 0,
        best: 0
      },
      painBehaviour: [] as string[],
      redFlags: [] as string[],
      yellowFlags: [] as string[],
      patientGoals: '',
      responseToPrevious: ''
    },
    objective: {
      observationPosture: '',
      rom: [] as { joint: string; movement: string; active: string; passive: string; endFeel: string }[],
      mmt: [] as { muscle: string; grade: string }[],
      neuroScreen: {
        dermatomes: '',
        myotomes: '',
        reflexes: ''
      },
      specialTests: [] as { test: string; result: 'Positive' | 'Negative' | 'Equivocal'; notes: string }[],
      functionalTests: '',
      palpation: ''
    },
    assessment: {
      clinicalImpression: '',
      diagnosis: null as typeof ICD10_DIAGNOSES[0] | null,
      prognosis: 'Good',
      rehabPotential: 'High'
    },
    plan: {
      shortTermGoals: '',
      longTermGoals: '',
      treatmentPlan: [] as string[],
      hep: '',
      precautions: '',
      followUpFrequency: ''
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
      try {
        const safeParse = (str: string) => {
          try {
            const parsed = JSON.parse(str);
            return (parsed && typeof parsed === 'object') ? parsed : {};
          } catch {
            return {};
          }
        };

        const parsedSubjective = safeParse(existingDraft.subjective);
        const parsedObjective = safeParse(existingDraft.objective);
        const parsedAssessment = safeParse(existingDraft.assessment);
        const parsedPlan = safeParse(existingDraft.plan);
        
        setFormData(prev => ({
          ...prev,
          subjective: { ...prev.subjective, ...parsedSubjective },
          objective: { ...prev.objective, ...parsedObjective },
          assessment: { ...prev.assessment, ...parsedAssessment },
          plan: { ...prev.plan, ...parsedPlan },
          metadata: parsedPlan.metadata || prev.metadata
        }));
      } catch (e) {
        console.error("Failed to parse draft", e);
      }
      setLastSaved(new Date(existingDraft.updatedAt));
    }
  }, [existingDraft]);

  const { data: history = [] } = useQuery({
    queryKey: ['soapNotes', 'history', appointment?.patientId],
    queryFn: () => soapNotes.listByPatient(appointment!.patientId),
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
        plan: JSON.stringify({ ...formData.plan, metadata: formData.metadata }),
        icd10_2016_version: formData.assessment.diagnosis?.code || '',
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
      toast.error("Failed to save draft");
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
      plan: JSON.stringify({ ...formData.plan, metadata: formData.metadata }),
      icd10_2016_version: formData.assessment.diagnosis?.code || '',
      createdAt: Date.now(),
      updatedAt: Date.now()
    };

    try {
      await soapNotes.create(note);
      await appointments.update(appointmentId, { status: 'completed' });
      
      if (draftId) {
        await soapNoteDrafts.delete(draftId);
      }

      queryClient.invalidateQueries({ queryKey: ['appointments'] });
      toast.success("SOAP Note completed and signed");
      navigate('/agenda');
    } catch (err) {
      console.error("Failed to complete note", err);
      toast.error("Failed to complete note");
    }
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
    <div className="flex flex-col lg:flex-row gap-10 h-[calc(100vh-140px)] max-w-[1600px] mx-auto">
      {/* Main Editor */}
      <div className="flex-1 flex flex-col bg-white rounded-[3.5rem] border border-primary/5 shadow-[0_40px_80px_rgba(0,0,0,0.06)] overflow-hidden">
        {/* Editor Header */}
        <div className="p-10 border-b border-primary/5 flex items-center justify-between bg-surface-muted/10">
          <div className="flex items-center gap-6">
            <motion.div 
              whileHover={{ scale: 1.05, rotate: 5 }}
              className="w-20 h-20 rounded-[2rem] bg-primary text-white flex items-center justify-center text-2xl font-black shadow-2xl shadow-primary/20 border-4 border-white"
            >
              {patient.firstName[0]}{patient.lastName[0]}
            </motion.div>
            <div>
              <div className="flex items-center gap-3 mb-1">
                <h2 className="text-4xl font-serif text-primary tracking-tight">{patient.firstName} {patient.lastName}</h2>
                <span className="px-3 py-1 rounded-full bg-accent/10 text-accent text-[9px] font-black uppercase tracking-widest border border-accent/10">Active Session</span>
              </div>
              <p className="text-[11px] text-primary/30 font-black uppercase tracking-[0.3em] flex items-center gap-3">
                <span className="w-8 h-px bg-primary/10" />
                {appointment.type} • {format(appointment.startTime, 'h:mm a')} • {format(new Date(), 'MMM do, yyyy')}
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-8">
            <div className="text-right hidden md:block">
              <div className="flex items-center gap-2 justify-end mb-1">
                {isSaving ? (
                  <div className="flex items-center gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-accent animate-pulse" />
                    <span className="text-[10px] font-black text-accent uppercase tracking-widest">Auto-saving...</span>
                  </div>
                ) : (
                  <span className="text-[10px] text-primary/20 font-black uppercase tracking-widest">
                    {lastSaved ? `Last saved ${format(lastSaved, 'HH:mm:ss')}` : 'Draft not saved'}
                  </span>
                )}
              </div>
              <button 
                onClick={handleSave}
                className="text-[10px] font-black text-primary/40 hover:text-accent uppercase tracking-widest flex items-center gap-2 justify-end transition-colors group"
              >
                <Save size={12} className="group-hover:scale-110 transition-transform" /> Force Save Draft
              </button>
            </div>

            <motion.button 
              whileHover={{ scale: 1.02, y: -2 }}
              whileTap={{ scale: 0.98 }}
              onClick={handleComplete}
              className="flex items-center gap-4 px-10 py-5 bg-emerald-500 text-white rounded-[1.5rem] font-black text-[11px] uppercase tracking-[0.2em] hover:shadow-2xl hover:shadow-emerald-500/30 transition-all shadow-xl shadow-emerald-500/10"
            >
              <CheckCircle2 size={18} />
              Complete & Sign Note
            </motion.button>
          </div>
        </div>

        {/* Section Tabs */}
        <div className="flex items-center bg-surface-muted/5 p-2 gap-2">
          {[
            { id: 'S', label: 'Subjective', icon: ClipboardList, color: 'text-blue-500', bg: 'bg-blue-500/5' },
            { id: 'O', label: 'Objective', icon: Stethoscope, color: 'text-purple-500', bg: 'bg-purple-500/5' },
            { id: 'A', label: 'Assessment', icon: Activity, color: 'text-accent', bg: 'bg-accent/5' },
            { id: 'P', label: 'Plan', icon: Map, color: 'text-emerald-500', bg: 'bg-emerald-500/5' },
            { id: 'M', label: 'Metadata', icon: Info, color: 'text-slate-500', bg: 'bg-slate-500/5' },
          ].map((section) => (
            <button
              key={section.id}
              onClick={() => setActiveSection(section.id as any)}
              className={cn(
                "flex-1 flex items-center justify-center gap-4 py-5 rounded-[1.25rem] text-[10px] font-black uppercase tracking-[0.2em] transition-all relative group",
                activeSection === section.id 
                  ? 'bg-white shadow-xl shadow-primary/5 text-primary' 
                  : 'text-primary/30 hover:text-primary hover:bg-white/50'
              )}
            >
              <div className={cn(
                "w-8 h-8 rounded-xl flex items-center justify-center transition-all",
                activeSection === section.id ? section.bg + ' ' + section.color : 'bg-primary/5 text-primary/20 group-hover:bg-primary/10'
              )}>
                <section.icon size={16} />
              </div>
              <span className="hidden xl:inline">{section.label}</span>
              <span className="xl:hidden">{section.id}</span>
              {activeSection === section.id && (
                <motion.div 
                  layoutId="activeTab"
                  className="absolute bottom-2 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-primary"
                />
              )}
            </button>
          ))}
        </div>

        {/* Editor Content */}
        <div className="flex-1 overflow-y-auto p-12 custom-scrollbar bg-[#FBFBFC]/30">
          <AnimatePresence mode="wait">
            {activeSection === 'S' && (
              <motion.div
                key="S"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="space-y-12"
              >
                <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                  <div className="space-y-3">
                    <label className="text-[10px] font-black text-primary/30 uppercase tracking-[0.3em] ml-1">Visit Type</label>
                    <div className="relative group">
                      <select 
                        value={formData.subjective.visitType}
                        onChange={(e) => setFormData({ ...formData, subjective: { ...formData.subjective, visitType: e.target.value } })}
                        className="w-full px-6 py-4 bg-white border border-primary/5 rounded-2xl text-sm font-bold text-primary focus:ring-4 focus:ring-primary/5 transition-all appearance-none shadow-sm"
                      >
                        {VISIT_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                      </select>
                      <ChevronRight className="absolute right-4 top-1/2 -translate-y-1/2 text-primary/20 rotate-90 pointer-events-none" size={16} />
                    </div>
                  </div>
                  <div className="space-y-3">
                    <label className="text-[10px] font-black text-primary/30 uppercase tracking-[0.3em] ml-1">Pain Location</label>
                    <div className="relative group">
                      <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 text-primary/20 group-focus-within:text-accent transition-colors" size={18} />
                      <input 
                        type="text" 
                        placeholder="e.g., Lower back, Right shoulder"
                        value={formData.subjective.painLocation}
                        onChange={(e) => setFormData({ ...formData, subjective: { ...formData.subjective, painLocation: e.target.value } })}
                        className="w-full pl-12 pr-6 py-4 bg-white border border-primary/5 rounded-2xl text-sm font-bold text-primary focus:ring-4 focus:ring-primary/5 transition-all shadow-sm outline-none"
                      />
                    </div>
                  </div>
                </div>

                <div className="space-y-3">
                  <label className="text-[10px] font-black text-primary/30 uppercase tracking-[0.3em] ml-1">Chief Complaint</label>
                  <textarea 
                    rows={4}
                    placeholder="Describe the patient's main concern in detail..."
                    value={formData.subjective.chiefComplaint}
                    onChange={(e) => setFormData({ ...formData, subjective: { ...formData.subjective, chiefComplaint: e.target.value } })}
                    className="w-full px-6 py-4 bg-white border border-primary/5 rounded-[2rem] text-sm font-medium text-primary focus:ring-4 focus:ring-primary/5 transition-all resize-none shadow-sm outline-none leading-relaxed"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                  {['current', 'worst', 'best'].map((type) => (
                    <div key={type} className="space-y-6 p-8 bg-white rounded-[2.5rem] border border-primary/5 shadow-sm group hover:shadow-xl hover:shadow-primary/5 transition-all">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className={cn(
                            "w-8 h-8 rounded-xl flex items-center justify-center",
                            type === 'worst' ? 'bg-red-50 text-red-500' : type === 'best' ? 'bg-emerald-50 text-emerald-500' : 'bg-primary/5 text-primary'
                          )}>
                            <Thermometer size={16} />
                          </div>
                          <label className="text-[10px] font-black text-primary/30 uppercase tracking-widest">
                            Pain ({type})
                          </label>
                        </div>
                        <span className={cn(
                          "text-3xl font-black tracking-tighter",
                          type === 'worst' ? 'text-red-500' : type === 'best' ? 'text-emerald-500' : 'text-primary'
                        )}>
                          {(formData.subjective.painIntensity as any)[type]}
                        </span>
                      </div>
                      <div className="relative h-2 bg-surface-muted rounded-full">
                        <input 
                          type="range" min="0" max="10" 
                          value={(formData.subjective.painIntensity as any)[type]}
                          onChange={(e) => setFormData({ 
                            ...formData, 
                            subjective: { 
                              ...formData.subjective, 
                              painIntensity: { ...formData.subjective.painIntensity, [type]: Number(e.target.value) } 
                            } 
                          })}
                          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                        />
                        <motion.div 
                          initial={false}
                          animate={{ width: `${((formData.subjective.painIntensity as any)[type] / 10) * 100}%` }}
                          className={cn(
                            "h-full rounded-full transition-all",
                            type === 'worst' ? 'bg-red-500' : type === 'best' ? 'bg-emerald-500' : 'bg-primary'
                          )}
                        />
                      </div>
                      <div className="flex justify-between text-[8px] font-black text-primary/10 uppercase tracking-widest">
                        <span>No Pain</span>
                        <span>Severe</span>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="space-y-6">
                  <label className="text-[10px] font-black text-primary/30 uppercase tracking-[0.3em] ml-1">Pain Behaviour</label>
                  <div className="flex flex-wrap gap-3">
                    {PAIN_BEHAVIOURS.map(behaviour => (
                      <motion.button
                        key={behaviour}
                        whileHover={{ scale: 1.02, y: -1 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => {
                          const current = formData.subjective.painBehaviour;
                          const updated = current.includes(behaviour) 
                            ? current.filter(b => b !== behaviour)
                            : [...current, behaviour];
                          setFormData({ ...formData, subjective: { ...formData.subjective, painBehaviour: updated } });
                        }}
                        className={cn(
                          "px-6 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest border transition-all",
                          formData.subjective.painBehaviour.includes(behaviour)
                            ? 'bg-primary text-white border-primary shadow-xl shadow-primary/20'
                            : 'bg-white text-primary/40 border-primary/5 hover:border-primary/20 hover:bg-surface-muted/30'
                        )}
                      >
                        {behaviour}
                      </motion.button>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                  <div className="space-y-6">
                    <div className="flex items-center gap-3 ml-1">
                      <div className="w-8 h-8 rounded-xl bg-red-50 text-red-500 flex items-center justify-center">
                        <Flag size={14} />
                      </div>
                      <label className="text-[10px] font-black text-red-500/60 uppercase tracking-[0.3em]">Red Flags</label>
                    </div>
                    <div className="grid grid-cols-1 gap-3">
                      {RED_FLAGS.map(flag => (
                        <label key={flag} className={cn(
                          "flex items-center gap-4 p-4 rounded-2xl cursor-pointer transition-all border group",
                          formData.subjective.redFlags.includes(flag)
                            ? 'bg-red-50/50 border-red-500/20 shadow-sm'
                            : 'bg-white border-primary/5 hover:border-red-500/20'
                        )}>
                          <div className={cn(
                            "w-5 h-5 rounded-lg border-2 flex items-center justify-center transition-all",
                            formData.subjective.redFlags.includes(flag) ? 'bg-red-500 border-red-500' : 'border-primary/10 group-hover:border-red-500/30'
                          )}>
                            <input 
                              type="checkbox"
                              className="hidden"
                              checked={formData.subjective.redFlags.includes(flag)}
                              onChange={() => {
                                const current = formData.subjective.redFlags;
                                const updated = current.includes(flag) 
                                  ? current.filter(f => f !== flag)
                                  : [...current, flag];
                                setFormData({ ...formData, subjective: { ...formData.subjective, redFlags: updated } });
                              }}
                            />
                            {formData.subjective.redFlags.includes(flag) && <CheckCircle2 size={12} className="text-white" />}
                          </div>
                          <span className={cn(
                            "text-xs font-bold transition-colors",
                            formData.subjective.redFlags.includes(flag) ? 'text-red-600' : 'text-primary/60'
                          )}>{flag}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                  <div className="space-y-6">
                    <div className="flex items-center gap-3 ml-1">
                      <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-500 flex items-center justify-center">
                        <Flag size={14} />
                      </div>
                      <label className="text-[10px] font-black text-amber-500/60 uppercase tracking-[0.3em]">Yellow Flags</label>
                    </div>
                    <div className="grid grid-cols-1 gap-3">
                      {YELLOW_FLAGS.map(flag => (
                        <label key={flag} className={cn(
                          "flex items-center gap-4 p-4 rounded-2xl cursor-pointer transition-all border group",
                          formData.subjective.yellowFlags.includes(flag)
                            ? 'bg-amber-50/50 border-amber-500/20 shadow-sm'
                            : 'bg-white border-primary/5 hover:border-amber-500/20'
                        )}>
                          <div className={cn(
                            "w-5 h-5 rounded-lg border-2 flex items-center justify-center transition-all",
                            formData.subjective.yellowFlags.includes(flag) ? 'bg-amber-500 border-amber-500' : 'border-primary/10 group-hover:border-amber-500/30'
                          )}>
                            <input 
                              type="checkbox"
                              className="hidden"
                              checked={formData.subjective.yellowFlags.includes(flag)}
                              onChange={() => {
                                const current = formData.subjective.yellowFlags;
                                const updated = current.includes(flag) 
                                  ? current.filter(f => f !== flag)
                                  : [...current, flag];
                                setFormData({ ...formData, subjective: { ...formData.subjective, yellowFlags: updated } });
                              }}
                            />
                            {formData.subjective.yellowFlags.includes(flag) && <CheckCircle2 size={12} className="text-white" />}
                          </div>
                          <span className={cn(
                            "text-xs font-bold transition-colors",
                            formData.subjective.yellowFlags.includes(flag) ? 'text-amber-600' : 'text-primary/60'
                          )}>{flag}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="space-y-3">
                  <label className="text-[10px] font-black text-primary/30 uppercase tracking-[0.3em] ml-1">Response to Previous Treatment</label>
                  <textarea 
                    rows={3}
                    placeholder="How did the patient feel after the last session?"
                    value={formData.subjective.responseToPrevious}
                    onChange={(e) => setFormData({ ...formData, subjective: { ...formData.subjective, responseToPrevious: e.target.value } })}
                    className="w-full px-6 py-4 bg-white border border-primary/5 rounded-[2rem] text-sm font-medium text-primary focus:ring-4 focus:ring-primary/5 transition-all resize-none shadow-sm outline-none leading-relaxed"
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
                className="space-y-12"
              >
                <div className="space-y-6">
                  <div className="flex items-center justify-between ml-1">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-500 flex items-center justify-center">
                        <Move size={14} />
                      </div>
                      <label className="text-[10px] font-black text-blue-500/60 uppercase tracking-[0.3em]">Range of Motion (ROM)</label>
                    </div>
                    <motion.button 
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => setFormData({ ...formData, objective: { ...formData.objective, rom: [...formData.objective.rom, { joint: '', movement: '', active: '', passive: '', endFeel: '' }] } })}
                      className="px-4 py-2 bg-primary text-white rounded-xl text-[9px] font-black uppercase tracking-widest flex items-center gap-2 shadow-lg shadow-primary/10"
                    >
                      <Plus size={12} /> Add Measurement
                    </motion.button>
                  </div>
                  <div className="bg-white rounded-[2.5rem] border border-primary/5 shadow-sm overflow-hidden">
                    <table className="w-full">
                      <thead>
                        <tr className="bg-surface-muted/30 border-b border-primary/5">
                          <th className="px-8 py-5 text-left text-[9px] font-black text-primary/30 uppercase tracking-[0.2em]">Joint</th>
                          <th className="px-8 py-5 text-left text-[9px] font-black text-primary/30 uppercase tracking-[0.2em]">Movement</th>
                          <th className="px-8 py-5 text-left text-[9px] font-black text-primary/30 uppercase tracking-[0.2em]">Active</th>
                          <th className="px-8 py-5 text-left text-[9px] font-black text-primary/30 uppercase tracking-[0.2em]">Passive</th>
                          <th className="px-8 py-5 text-left text-[9px] font-black text-primary/30 uppercase tracking-[0.2em]">End Feel</th>
                          <th className="px-8 py-5 w-16"></th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-primary/5">
                        {formData.objective.rom.map((row, i) => (
                          <motion.tr 
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            key={i} 
                            className="group hover:bg-surface-muted/20 transition-colors"
                          >
                            <td className="px-4 py-3">
                              <input 
                                type="text" value={row.joint} placeholder="Joint"
                                onChange={(e) => {
                                  const newRom = [...formData.objective.rom];
                                  newRom[i].joint = e.target.value;
                                  setFormData({ ...formData, objective: { ...formData.objective, rom: newRom } });
                                }}
                                className="w-full px-4 py-2 bg-transparent border-none focus:ring-0 font-bold text-primary placeholder:text-primary/10" 
                              />
                            </td>
                            <td className="px-4 py-3">
                              <input 
                                type="text" value={row.movement} placeholder="e.g. Flexion"
                                onChange={(e) => {
                                  const newRom = [...formData.objective.rom];
                                  newRom[i].movement = e.target.value;
                                  setFormData({ ...formData, objective: { ...formData.objective, rom: newRom } });
                                }}
                                className="w-full px-4 py-2 bg-transparent border-none focus:ring-0 text-primary/60 placeholder:text-primary/10" 
                              />
                            </td>
                            <td className="px-4 py-3">
                              <input 
                                type="text" value={row.active} placeholder="e.g. 120°"
                                onChange={(e) => {
                                  const newRom = [...formData.objective.rom];
                                  newRom[i].active = e.target.value;
                                  setFormData({ ...formData, objective: { ...formData.objective, rom: newRom } });
                                }}
                                className="w-full px-4 py-2 bg-transparent border-none focus:ring-0 text-primary/60 placeholder:text-primary/10" 
                              />
                            </td>
                            <td className="px-4 py-3">
                              <input 
                                type="text" value={row.passive} placeholder="e.g. 130°"
                                onChange={(e) => {
                                  const newRom = [...formData.objective.rom];
                                  newRom[i].passive = e.target.value;
                                  setFormData({ ...formData, objective: { ...formData.objective, rom: newRom } });
                                }}
                                className="w-full px-4 py-2 bg-transparent border-none focus:ring-0 text-primary/60 placeholder:text-primary/10" 
                              />
                            </td>
                            <td className="px-4 py-3">
                              <input 
                                type="text" value={row.endFeel} placeholder="e.g. Firm"
                                onChange={(e) => {
                                  const newRom = [...formData.objective.rom];
                                  newRom[i].endFeel = e.target.value;
                                  setFormData({ ...formData, objective: { ...formData.objective, rom: newRom } });
                                }}
                                className="w-full px-4 py-2 bg-transparent border-none focus:ring-0 text-primary/60 placeholder:text-primary/10" 
                              />
                            </td>
                            <td className="px-4 py-3">
                              <button 
                                onClick={() => {
                                  const newRom = formData.objective.rom.filter((_, idx) => idx !== i);
                                  setFormData({ ...formData, objective: { ...formData.objective, rom: newRom } });
                                }}
                                className="p-2 text-primary/10 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all opacity-0 group-hover:opacity-100"
                              >
                                <X size={16} />
                              </button>
                            </td>
                          </motion.tr>
                        ))}
                      </tbody>
                    </table>
                    {formData.objective.rom.length === 0 && (
                      <div className="p-12 text-center">
                        <p className="text-[10px] font-black text-primary/10 uppercase tracking-[0.3em]">No ROM measurements recorded</p>
                      </div>
                    )}
                  </div>
                </div>

                <div className="space-y-6">
                  <div className="flex items-center justify-between ml-1">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-xl bg-purple-50 text-purple-500 flex items-center justify-center">
                        <Dumbbell size={14} />
                      </div>
                      <label className="text-[10px] font-black text-purple-500/60 uppercase tracking-[0.3em]">Manual Muscle Testing (MMT)</label>
                    </div>
                    <motion.button 
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => setFormData({ ...formData, objective: { ...formData.objective, mmt: [...formData.objective.mmt, { muscle: '', grade: '5/5' }] } })}
                      className="px-4 py-2 bg-primary text-white rounded-xl text-[9px] font-black uppercase tracking-widest flex items-center gap-2 shadow-lg shadow-primary/10"
                    >
                      <Plus size={12} /> Add Muscle
                    </motion.button>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {formData.objective.mmt.map((row, i) => (
                      <motion.div 
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        key={i} 
                        className="flex items-center gap-4 p-5 bg-white rounded-[2rem] border border-primary/5 shadow-sm group hover:shadow-xl hover:shadow-primary/5 transition-all"
                      >
                        <input 
                          type="text" value={row.muscle} placeholder="Muscle Group"
                          onChange={(e) => {
                            const newMmt = [...formData.objective.mmt];
                            newMmt[i].muscle = e.target.value;
                            setFormData({ ...formData, objective: { ...formData.objective, mmt: newMmt } });
                          }}
                          className="flex-1 bg-transparent border-none focus:ring-0 text-sm font-bold text-primary placeholder:text-primary/10" 
                        />
                        <div className="relative">
                          <select 
                            value={row.grade}
                            onChange={(e) => {
                              const newMmt = [...formData.objective.mmt];
                              newMmt[i].grade = e.target.value;
                              setFormData({ ...formData, objective: { ...formData.objective, mmt: newMmt } });
                            }}
                            className="bg-surface-muted border-none rounded-xl text-[10px] font-black px-4 py-2 focus:ring-0 appearance-none pr-8"
                          >
                            {MMT_GRADES.map(g => <option key={g} value={g}>{g}</option>)}
                          </select>
                          <ChevronRight className="absolute right-2 top-1/2 -translate-y-1/2 text-primary/20 rotate-90 pointer-events-none" size={12} />
                        </div>
                        <button 
                          onClick={() => {
                            const newMmt = formData.objective.mmt.filter((_, idx) => idx !== i);
                            setFormData({ ...formData, objective: { ...formData.objective, mmt: newMmt } });
                          }}
                          className="p-2 text-primary/10 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all opacity-0 group-hover:opacity-100"
                        >
                          <X size={16} />
                        </button>
                      </motion.div>
                    ))}
                    {formData.objective.mmt.length === 0 && (
                      <div className="col-span-full p-12 bg-white rounded-[2rem] border border-dashed border-primary/10 text-center">
                        <p className="text-[10px] font-black text-primary/10 uppercase tracking-[0.3em]">No MMT records added</p>
                      </div>
                    )}
                  </div>
                </div>

                <div className="space-y-6">
                  <div className="flex items-center gap-3 ml-1">
                    <div className="w-8 h-8 rounded-xl bg-indigo-50 text-indigo-500 flex items-center justify-center">
                      <Brain size={14} />
                    </div>
                    <label className="text-[10px] font-black text-indigo-500/60 uppercase tracking-[0.3em]">Neurological Screen</label>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                    {['dermatomes', 'myotomes', 'reflexes'].map((field) => (
                      <div key={field} className="space-y-3 p-8 bg-white rounded-[2.5rem] border border-primary/5 shadow-sm">
                        <label className="text-[10px] font-black text-primary/20 uppercase tracking-[0.3em] ml-1">{field}</label>
                        <input 
                          type="text"
                          placeholder={`Enter ${field}...`}
                          value={(formData.objective.neuroScreen as any)[field]}
                          onChange={(e) => setFormData({ 
                            ...formData, 
                            objective: { 
                              ...formData.objective, 
                              neuroScreen: { ...formData.objective.neuroScreen, [field]: e.target.value } 
                            } 
                          })}
                          className="w-full px-6 py-4 bg-surface-muted/30 border-none rounded-2xl text-sm font-bold text-primary focus:ring-4 focus:ring-primary/5 transition-all outline-none"
                        />
                      </div>
                    ))}
                  </div>
                </div>

                <div className="space-y-6">
                  <div className="flex items-center justify-between ml-1">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-500 flex items-center justify-center">
                        <Search size={14} />
                      </div>
                      <label className="text-[10px] font-black text-emerald-500/60 uppercase tracking-[0.3em]">Special Tests</label>
                    </div>
                    <motion.button 
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => setFormData({ ...formData, objective: { ...formData.objective, specialTests: [...formData.objective.specialTests, { test: '', result: 'Negative', notes: '' }] } })}
                      className="px-4 py-2 bg-primary text-white rounded-xl text-[9px] font-black uppercase tracking-widest flex items-center gap-2 shadow-lg shadow-primary/10"
                    >
                      <Plus size={12} /> Add Test
                    </motion.button>
                  </div>
                  <div className="space-y-4">
                    {formData.objective.specialTests.map((row, i) => (
                      <motion.div 
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        key={i} 
                        className="grid grid-cols-1 md:grid-cols-12 gap-6 p-8 bg-white rounded-[2.5rem] border border-primary/5 shadow-sm group hover:shadow-xl hover:shadow-primary/5 transition-all items-center"
                      >
                        <div className="md:col-span-4">
                          <input 
                            type="text" value={row.test} placeholder="Test Name"
                            onChange={(e) => {
                              const newTests = [...formData.objective.specialTests];
                              newTests[i].test = e.target.value;
                              setFormData({ ...formData, objective: { ...formData.objective, specialTests: newTests } });
                            }}
                            className="w-full bg-transparent border-none focus:ring-0 text-lg font-bold text-primary placeholder:text-primary/10" 
                          />
                        </div>
                        <div className="md:col-span-3 flex gap-2">
                          {['Positive', 'Negative', 'Equivocal'].map((res) => (
                            <button
                              key={res}
                              onClick={() => {
                                const newTests = [...formData.objective.specialTests];
                                newTests[i].result = res as any;
                                setFormData({ ...formData, objective: { ...formData.objective, specialTests: newTests } });
                              }}
                              className={cn(
                                "flex-1 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest border transition-all",
                                row.result === res
                                  ? res === 'Positive' ? 'bg-red-500 text-white border-red-500 shadow-lg shadow-red-500/20' : 'bg-primary text-white border-primary shadow-lg shadow-primary/20'
                                  : 'bg-white text-primary/40 border-primary/5 hover:border-primary/20'
                              )}
                            >
                              {res}
                            </button>
                          ))}
                        </div>
                        <div className="md:col-span-4">
                          <input 
                            type="text" value={row.notes} placeholder="Additional findings..."
                            onChange={(e) => {
                              const newTests = [...formData.objective.specialTests];
                              newTests[i].notes = e.target.value;
                              setFormData({ ...formData, objective: { ...formData.objective, specialTests: newTests } });
                            }}
                            className="w-full bg-surface-muted/30 px-6 py-3 rounded-xl border-none focus:ring-0 text-sm font-medium text-primary/60" 
                          />
                        </div>
                        <div className="md:col-span-1 flex justify-end">
                          <button 
                            onClick={() => {
                              const newTests = formData.objective.specialTests.filter((_, idx) => idx !== i);
                              setFormData({ ...formData, objective: { ...formData.objective, specialTests: newTests } });
                            }}
                            className="p-3 text-primary/10 hover:text-red-500 hover:bg-red-50 rounded-2xl transition-all opacity-0 group-hover:opacity-100"
                          >
                            <X size={20} />
                          </button>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                  <div className="space-y-4">
                    <div className="flex items-center gap-3 ml-1">
                      <div className="w-8 h-8 rounded-xl bg-orange-50 text-orange-500 flex items-center justify-center">
                        <UserCheck size={14} />
                      </div>
                      <label className="text-[10px] font-black text-orange-500/60 uppercase tracking-[0.3em]">Functional Tests</label>
                    </div>
                    <textarea 
                      rows={4}
                      placeholder="e.g. Squat mechanics, Single leg hop distance, TUG test results..."
                      value={formData.objective.functionalTests}
                      onChange={(e) => setFormData({ ...formData, objective: { ...formData.objective, functionalTests: e.target.value } })}
                      className="w-full px-8 py-6 bg-white border border-primary/5 rounded-[2.5rem] text-sm font-medium text-primary focus:ring-4 focus:ring-primary/5 transition-all resize-none shadow-sm outline-none leading-relaxed"
                    />
                  </div>
                  <div className="space-y-4">
                    <div className="flex items-center gap-3 ml-1">
                      <div className="w-8 h-8 rounded-xl bg-teal-50 text-teal-500 flex items-center justify-center">
                        <Hand size={14} />
                      </div>
                      <label className="text-[10px] font-black text-teal-500/60 uppercase tracking-[0.3em]">Palpation</label>
                    </div>
                    <textarea 
                      rows={4}
                      placeholder="Local tenderness, trigger points, swelling, skin temperature, tissue texture..."
                      value={formData.objective.palpation}
                      onChange={(e) => setFormData({ ...formData, objective: { ...formData.objective, palpation: e.target.value } })}
                      className="w-full px-8 py-6 bg-white border border-primary/5 rounded-[2.5rem] text-sm font-medium text-primary focus:ring-4 focus:ring-primary/5 transition-all resize-none shadow-sm outline-none leading-relaxed"
                    />
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
                className="space-y-12"
              >
                <div className="space-y-6">
                  <div className="flex items-center gap-3 ml-1">
                    <div className="w-8 h-8 rounded-xl bg-indigo-50 text-indigo-500 flex items-center justify-center">
                      <Stethoscope size={14} />
                    </div>
                    <label className="text-[10px] font-black text-indigo-500/60 uppercase tracking-[0.3em]">Clinical Impression</label>
                  </div>
                  <textarea 
                    rows={6}
                    placeholder="Synthesize subjective and objective findings into a clinical reasoning statement..."
                    value={formData.assessment.clinicalImpression}
                    onChange={(e) => setFormData({ ...formData, assessment: { ...formData.assessment, clinicalImpression: e.target.value } })}
                    className="w-full px-10 py-8 bg-white border border-primary/5 rounded-[3rem] text-base font-medium text-primary focus:ring-4 focus:ring-primary/5 transition-all resize-none shadow-sm outline-none leading-relaxed placeholder:text-primary/10"
                  />
                </div>

                <div className="space-y-6">
                  <div className="flex items-center gap-3 ml-1">
                    <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-500 flex items-center justify-center">
                      <Activity size={14} />
                    </div>
                    <label className="text-[10px] font-black text-emerald-500/60 uppercase tracking-[0.3em]">Diagnosis (ICD-10)</label>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div className="space-y-4">
                      <div className="relative group">
                        <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-primary/20 group-focus-within:text-primary transition-colors" size={18} />
                        <input 
                          type="text"
                          value={diagnosisSearch}
                          onChange={(e) => setDiagnosisSearch(e.target.value)}
                          placeholder="Search ICD-10 codes or descriptions..."
                          className="w-full pl-16 pr-8 py-5 bg-white border border-primary/5 rounded-[2rem] text-sm font-bold text-primary focus:ring-4 focus:ring-primary/5 transition-all outline-none shadow-sm"
                        />
                      </div>
                      <div className="bg-white rounded-[2.5rem] border border-primary/5 shadow-sm overflow-hidden max-h-[400px] overflow-y-auto custom-scrollbar">
                        {filteredDiagnoses.map((diag) => (
                          <button
                            key={diag.code}
                            onClick={() => {
                              setFormData({ ...formData, assessment: { ...formData.assessment, diagnosis: diag } });
                              setDiagnosisSearch('');
                            }}
                            className="w-full px-8 py-5 text-left hover:bg-surface-muted/30 transition-all border-b border-primary/5 last:border-0 group"
                          >
                            <div className="flex items-center justify-between">
                              <div>
                                <span className="text-[10px] font-black text-primary/20 uppercase tracking-widest block mb-1">{diag.code}</span>
                                <span className="text-sm font-bold text-primary group-hover:text-accent transition-colors">{diag.description}</span>
                              </div>
                              <Plus className="text-primary/10 group-hover:text-accent group-hover:scale-110 transition-all" size={16} />
                            </div>
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="space-y-4">
                      <label className="text-[10px] font-black text-primary/20 uppercase tracking-[0.3em] ml-1">Selected Diagnosis</label>
                      <div className="space-y-3">
                        {formData.assessment.diagnosis ? (
                          <motion.div 
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            className="flex items-center justify-between p-6 bg-emerald-50/50 border border-emerald-100 rounded-2xl group"
                          >
                            <div className="flex items-center gap-4">
                              <div className="w-10 h-10 rounded-xl bg-emerald-500 text-white flex items-center justify-center text-[10px] font-black">
                                {formData.assessment.diagnosis.code}
                              </div>
                              <span className="text-sm font-bold text-emerald-900">{formData.assessment.diagnosis.description}</span>
                            </div>
                            <button 
                              onClick={() => setFormData({ ...formData, assessment: { ...formData.assessment, diagnosis: null } })}
                              className="p-2 text-emerald-300 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all opacity-0 group-hover:opacity-100"
                            >
                              <X size={16} />
                            </button>
                          </motion.div>
                        ) : (
                          <div className="p-12 bg-surface-muted/20 rounded-[2.5rem] border border-dashed border-primary/10 text-center">
                            <p className="text-[10px] font-black text-primary/10 uppercase tracking-[0.3em]">No diagnosis selected</p>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                  <div className="space-y-6">
                    <div className="flex items-center gap-3 ml-1">
                      <div className="w-8 h-8 rounded-xl bg-orange-50 text-orange-500 flex items-center justify-center">
                        <TrendingUp size={14} />
                      </div>
                      <label className="text-[10px] font-black text-orange-500/60 uppercase tracking-[0.3em]">Prognosis</label>
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                      {PROGNOSIS_OPTIONS.map(p => (
                        <button
                          key={p}
                          onClick={() => setFormData({ ...formData, assessment: { ...formData.assessment, prognosis: p } })}
                          className={cn(
                            "py-4 rounded-2xl text-[9px] font-black uppercase tracking-widest border transition-all",
                            formData.assessment.prognosis === p
                              ? 'bg-primary text-white border-primary shadow-lg shadow-primary/20'
                              : 'bg-white text-primary/40 border-primary/5 hover:border-primary/20'
                          )}
                        >
                          {p}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="space-y-6">
                    <div className="flex items-center gap-3 ml-1">
                      <div className="w-8 h-8 rounded-xl bg-teal-50 text-teal-500 flex items-center justify-center">
                        <Zap size={14} />
                      </div>
                      <label className="text-[10px] font-black text-teal-500/60 uppercase tracking-[0.3em]">Rehab Potential</label>
                    </div>
                    <div className="flex gap-3">
                      {REHAB_POTENTIAL.map(rp => (
                        <button
                          key={rp}
                          onClick={() => setFormData({ ...formData, assessment: { ...formData.assessment, rehabPotential: rp } })}
                          className={cn(
                            "flex-1 py-4 rounded-2xl text-[9px] font-black uppercase tracking-widest border transition-all",
                            formData.assessment.rehabPotential === rp
                              ? 'bg-primary text-white border-primary shadow-lg shadow-primary/20'
                              : 'bg-white text-primary/40 border-primary/5 hover:border-primary/20'
                          )}
                        >
                          {rp}
                        </button>
                      ))}
                    </div>
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
                className="space-y-12"
              >
                <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                  <div className="space-y-4">
                    <div className="flex items-center gap-3 ml-1">
                      <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-500 flex items-center justify-center">
                        <Target size={14} />
                      </div>
                      <label className="text-[10px] font-black text-blue-500/60 uppercase tracking-[0.3em]">Short-term Goals</label>
                    </div>
                    <textarea 
                      rows={4}
                      placeholder="Specific, measurable goals for the next 1-2 weeks..."
                      value={formData.plan.shortTermGoals}
                      onChange={(e) => setFormData({ ...formData, plan: { ...formData.plan, shortTermGoals: e.target.value } })}
                      className="w-full px-8 py-6 bg-white border border-primary/5 rounded-[2.5rem] text-sm font-medium text-primary focus:ring-4 focus:ring-primary/5 transition-all resize-none shadow-sm outline-none leading-relaxed placeholder:text-primary/10"
                    />
                  </div>
                  <div className="space-y-4">
                    <div className="flex items-center gap-3 ml-1">
                      <div className="w-8 h-8 rounded-xl bg-purple-50 text-purple-500 flex items-center justify-center">
                        <Target size={14} />
                      </div>
                      <label className="text-[10px] font-black text-purple-500/60 uppercase tracking-[0.3em]">Long-term Goals</label>
                    </div>
                    <textarea 
                      rows={4}
                      placeholder="Overall functional outcomes and discharge criteria..."
                      value={formData.plan.longTermGoals}
                      onChange={(e) => setFormData({ ...formData, plan: { ...formData.plan, longTermGoals: e.target.value } })}
                      className="w-full px-8 py-6 bg-white border border-primary/5 rounded-[2.5rem] text-sm font-medium text-primary focus:ring-4 focus:ring-primary/5 transition-all resize-none shadow-sm outline-none leading-relaxed placeholder:text-primary/10"
                    />
                  </div>
                </div>

                <div className="space-y-6">
                  <div className="flex items-center gap-3 ml-1">
                    <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-500 flex items-center justify-center">
                      <ClipboardList size={14} />
                    </div>
                    <label className="text-[10px] font-black text-emerald-500/60 uppercase tracking-[0.3em]">Treatment Plan (Modalities)</label>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                    {TREATMENT_MODALITIES.map(mod => (
                      <motion.button
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        key={mod}
                        onClick={() => {
                          const mods = formData.plan.treatmentPlan.includes(mod)
                            ? formData.plan.treatmentPlan.filter(m => m !== mod)
                            : [...formData.plan.treatmentPlan, mod];
                          setFormData({ ...formData, plan: { ...formData.plan, treatmentPlan: mods } });
                        }}
                        className={cn(
                          "px-6 py-5 rounded-[2rem] text-[10px] font-black uppercase tracking-widest border transition-all text-left flex items-center justify-between group",
                          formData.plan.treatmentPlan.includes(mod)
                            ? 'bg-primary text-white border-primary shadow-xl shadow-primary/10'
                            : 'bg-white text-primary/40 border-primary/5 hover:border-primary/20'
                        )}
                      >
                        {mod}
                        {formData.plan.treatmentPlan.includes(mod) ? (
                          <CheckCircle2 size={16} className="text-white" />
                        ) : (
                          <Plus size={16} className="text-primary/10 group-hover:text-primary/30" />
                        )}
                      </motion.button>
                    ))}
                  </div>
                </div>

                <div className="space-y-6">
                  <div className="flex items-center gap-3 ml-1">
                    <div className="w-8 h-8 rounded-xl bg-indigo-50 text-indigo-500 flex items-center justify-center">
                      <Home size={14} />
                    </div>
                    <label className="text-[10px] font-black text-indigo-500/60 uppercase tracking-[0.3em]">Home Exercise Program (HEP)</label>
                  </div>
                  <textarea 
                    rows={4}
                    placeholder="Specific exercises, frequency, and intensity for home practice..."
                    value={formData.plan.hep}
                    onChange={(e) => setFormData({ ...formData, plan: { ...formData.plan, hep: e.target.value } })}
                    className="w-full px-8 py-6 bg-white border border-primary/5 rounded-[2.5rem] text-sm font-medium text-primary focus:ring-4 focus:ring-primary/5 transition-all resize-none shadow-sm outline-none leading-relaxed placeholder:text-primary/10"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                  <div className="space-y-6">
                    <div className="space-y-4">
                      <div className="flex items-center gap-3 ml-1">
                        <div className="w-8 h-8 rounded-xl bg-red-50 text-red-500 flex items-center justify-center">
                          <AlertCircle size={14} />
                        </div>
                        <label className="text-[10px] font-black text-red-500/60 uppercase tracking-[0.3em]">Precautions / Contraindications</label>
                      </div>
                      <input 
                        type="text"
                        placeholder="e.g. No heavy lifting, avoid end-range flexion"
                        value={formData.plan.precautions}
                        onChange={(e) => setFormData({ ...formData, plan: { ...formData.plan, precautions: e.target.value } })}
                        className="w-full px-8 py-5 bg-red-50/30 border border-red-100 rounded-[2rem] text-sm font-bold text-red-900 focus:ring-4 focus:ring-red-500/5 transition-all outline-none shadow-sm placeholder:text-red-300"
                      />
                    </div>
                    <div className="space-y-4">
                      <div className="flex items-center gap-3 ml-1">
                        <div className="w-8 h-8 rounded-xl bg-slate-50 text-slate-500 flex items-center justify-center">
                          <Calendar size={14} />
                        </div>
                        <label className="text-[10px] font-black text-slate-500/60 uppercase tracking-[0.3em]">Follow-up Frequency</label>
                      </div>
                      <input 
                        type="text"
                        placeholder="e.g. 2x per week for 4 weeks"
                        value={formData.plan.followUpFrequency}
                        onChange={(e) => setFormData({ ...formData, plan: { ...formData.plan, followUpFrequency: e.target.value } })}
                        className="w-full px-8 py-5 bg-white border border-primary/5 rounded-[2rem] text-sm font-bold text-primary focus:ring-4 focus:ring-primary/5 transition-all outline-none shadow-sm placeholder:text-primary/10"
                      />
                    </div>
                  </div>
                  
                  <div className="bg-white rounded-[3rem] border border-primary/5 shadow-sm overflow-hidden">
                    <FollowUpScheduler 
                      patientId={patient?.id!} 
                      therapistId={appointment?.therapistId!} 
                      onScheduled={(date) => setFormData({ ...formData, plan: { ...formData.plan, followUpFrequency: `Next session: ${format(date, 'MMM d')}` } })}
                    />
                  </div>
                </div>
              </motion.div>
            )}


            {activeSection === 'M' && (
              <motion.div
                key="M"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="space-y-12"
              >
                <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                  <div className="space-y-8">
                    <div className="space-y-4">
                      <div className="flex items-center gap-3 ml-1">
                        <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-500 flex items-center justify-center">
                          <Clock size={14} />
                        </div>
                        <label className="text-[10px] font-black text-blue-500/60 uppercase tracking-[0.3em]">Session Duration (minutes)</label>
                      </div>
                      <input 
                        type="number"
                        value={formData.metadata.sessionDuration}
                        onChange={(e) => setFormData({ ...formData, metadata: { ...formData.metadata, sessionDuration: Number(e.target.value) } })}
                        className="w-full px-8 py-5 bg-white border border-primary/5 rounded-[2rem] text-sm font-bold text-primary focus:ring-4 focus:ring-primary/5 transition-all outline-none shadow-sm placeholder:text-primary/10"
                      />
                    </div>
                    <div className="space-y-4">
                      <div className="flex items-center gap-3 ml-1">
                        <div className="w-8 h-8 rounded-xl bg-purple-50 text-purple-500 flex items-center justify-center">
                          <MapPin size={14} />
                        </div>
                        <label className="text-[10px] font-black text-purple-500/60 uppercase tracking-[0.3em]">Location</label>
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        {LOCATIONS.map(loc => (
                          <motion.button
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                            key={loc}
                            onClick={() => setFormData({ ...formData, metadata: { ...formData.metadata, location: loc } })}
                            className={cn(
                              "py-4 rounded-2xl text-[9px] font-black uppercase tracking-widest border transition-all",
                              formData.metadata.location === loc
                                ? 'bg-primary text-white border-primary shadow-lg shadow-primary/20'
                                : 'bg-white text-primary/40 border-primary/5 hover:border-primary/20'
                            )}
                          >
                            {loc}
                          </motion.button>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="space-y-8">
                    <div className="space-y-4">
                      <div className="flex items-center gap-3 ml-1">
                        <div className="w-8 h-8 rounded-xl bg-indigo-50 text-indigo-500 flex items-center justify-center">
                          <ClipboardList size={14} />
                        </div>
                        <label className="text-[10px] font-black text-indigo-500/60 uppercase tracking-[0.3em]">Note Type</label>
                      </div>
                      <div className="grid grid-cols-1 gap-3">
                        {NOTE_TYPES.map(type => (
                          <motion.button
                            whileHover={{ x: 4 }}
                            key={type}
                            onClick={() => setFormData({ ...formData, metadata: { ...formData.metadata, noteType: type } })}
                            className={cn(
                              "w-full py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest border transition-all",
                              formData.metadata.noteType === type
                                ? 'bg-primary text-white border-primary shadow-lg shadow-primary/20'
                                : 'bg-white text-primary/40 border-primary/5 hover:border-primary/20'
                            )}
                          >
                            {type}
                          </motion.button>
                        ))}
                      </div>
                    </div>
                    <div className="p-8 bg-emerald-50/50 rounded-[2.5rem] border border-emerald-100 flex items-start gap-5 shadow-sm">
                      <div className="w-12 h-12 rounded-2xl bg-emerald-500 text-white flex items-center justify-center shrink-0 shadow-lg shadow-emerald-500/20">
                        <ShieldCheck size={24} />
                      </div>
                      <div className="flex-1">
                        <h4 className="text-sm font-black text-emerald-900 uppercase tracking-wider mb-1">Patient Consent</h4>
                        <p className="text-[11px] font-medium text-emerald-700/60 mb-4 leading-relaxed">Patient has provided informed consent for this assessment and treatment plan.</p>
                        <label className="flex items-center gap-3 cursor-pointer group">
                          <div className="relative flex items-center justify-center">
                            <input 
                              type="checkbox"
                              checked={formData.metadata.patientConsent}
                              onChange={(e) => setFormData({ ...formData, metadata: { ...formData.metadata, patientConsent: e.target.checked } })}
                              className="peer appearance-none w-6 h-6 rounded-lg border-2 border-emerald-200 checked:bg-emerald-500 checked:border-emerald-500 transition-all cursor-pointer"
                            />
                            <CheckCircle2 size={14} className="absolute text-white opacity-0 peer-checked:opacity-100 transition-opacity pointer-events-none" />
                          </div>
                          <span className="text-[10px] font-black text-emerald-900/40 group-hover:text-emerald-900/60 uppercase tracking-widest transition-colors">Consent Confirmed</span>
                        </label>
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Footer Navigation */}
        <div className="px-12 py-8 border-t border-primary/5 flex items-center justify-between bg-white/50 backdrop-blur-xl">
          <motion.button 
            whileHover={{ x: -4 }}
            whileTap={{ scale: 0.95 }}
            disabled={activeSection === 'S'}
            onClick={() => {
              const order: any[] = ['S', 'O', 'A', 'P', 'M'];
              const idx = order.indexOf(activeSection);
              setActiveSection(order[idx - 1]);
            }}
            className="flex items-center gap-3 px-8 py-4 text-primary/30 font-black text-[10px] uppercase tracking-[0.3em] hover:text-primary transition-all disabled:opacity-0"
          >
            <ChevronLeft size={18} />
            Previous Section
          </motion.button>
          {activeSection !== 'M' ? (
            <motion.button 
              whileHover={{ x: 4 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => {
                const order: any[] = ['S', 'O', 'A', 'P', 'M'];
                const idx = order.indexOf(activeSection);
                setActiveSection(order[idx + 1]);
              }}
              className="flex items-center gap-3 px-10 py-5 bg-primary text-white rounded-[2rem] font-black text-[10px] uppercase tracking-[0.3em] hover:opacity-90 transition-all shadow-2xl shadow-primary/20"
            >
              Next Section
              <ChevronRight size={18} />
            </motion.button>
          ) : (
            <motion.button 
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.95 }}
              onClick={handleComplete}
              className="flex items-center gap-3 px-12 py-5 bg-emerald-500 text-white rounded-[2rem] font-black text-[10px] uppercase tracking-[0.3em] hover:opacity-90 transition-all shadow-2xl shadow-emerald-500/20"
            >
              Finalize Note
              <CheckCircle2 size={18} />
            </motion.button>
          )}
        </div>

      </div>

      {/* History Sidebar */}
      <div className="w-full lg:w-80 flex flex-col gap-6">
        <div className="bg-white rounded-3xl border border-primary/5 p-6 shadow-xl shadow-primary/5 flex-1 flex flex-col overflow-hidden">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-xl bg-primary/5 text-primary flex items-center justify-center">
              <History size={20} />
            </div>
            <div>
              <h3 className="text-sm font-bold text-primary">Session History</h3>
              <p className="text-[10px] text-primary/30 font-bold uppercase tracking-widest">Past clinical notes</p>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto space-y-4 custom-scrollbar pr-2">
            {history.length === 0 ? (
              <div className="py-12 text-center">
                <div className="w-12 h-12 rounded-2xl bg-surface-muted flex items-center justify-center mx-auto mb-4 text-primary/10">
                  <ClipboardList size={24} />
                </div>
                <p className="text-[10px] text-primary/30 font-bold uppercase tracking-widest">No past sessions</p>
              </div>
            ) : (
              history.map((note: any) => (
                <div 
                  key={note.id}
                  className="group p-4 rounded-2xl border border-primary/5 hover:border-accent/20 hover:bg-accent/5 transition-all cursor-pointer"
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[10px] font-bold text-primary/30 uppercase tracking-widest">{format(note.createdAt, 'MMM d, yyyy')}</span>
                    <ChevronRight size={14} className="text-primary/20 group-hover:text-accent transition-all" />
                  </div>
                  <p className="text-xs font-bold text-primary mb-1">
                    {(() => {
                      try {
                        const subj = JSON.parse(note.subjective);
                        return subj.visitType || 'Session';
                      } catch (e) {
                        return 'Session';
                      }
                    })()}
                  </p>
                  <p className="text-[10px] text-primary/40 line-clamp-2">
                    {(() => {
                      try {
                        const assess = JSON.parse(note.assessment);
                        return assess.clinicalImpression || 'No impression recorded';
                      } catch (e) {
                        return 'No impression recorded';
                      }
                    })()}
                  </p>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Quick Stats/Alerts */}
        <div className="bg-error/5 rounded-3xl border border-error/10 p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-8 h-8 rounded-lg bg-error text-white flex items-center justify-center">
              <AlertCircle size={16} />
            </div>
            <h4 className="text-xs font-bold text-error uppercase tracking-widest">Clinical Alerts</h4>
          </div>
          <div className="space-y-3">
            {formData.subjective.redFlags.length > 0 ? (
              formData.subjective.redFlags.map(flag => (
                <div key={flag} className="flex items-center gap-2 text-[10px] font-bold text-error/70">
                  <Flag size={10} /> {flag}
                </div>
              ))
            ) : (
              <p className="text-[10px] text-primary/30 font-bold italic">No red flags identified</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
