import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ChevronDown, 
  ChevronRight,
  ChevronUp, 
  Save, 
  CheckCircle2, 
  AlertTriangle, 
  Plus, 
  Trash2, 
  Search,
  Stethoscope,
  Activity,
  Users as UsersIcon,
  Heart,
  Pill,
  ClipboardList,
  Info
} from 'lucide-react';
import { useForm, useFieldArray, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import RichTextEditor from './RichTextEditor';
import BodyMap from './BodyMap';
import { HPI_SUGGESTIONS, TOP_MEDICATIONS } from './medicalHistoryData';
import { useDoctorDb } from '@/hooks/useDoctorDb';
import { cn } from '@/lib/utils';

// --- Validation Schema ---
const medicalHistorySchema = z.object({
  chiefComplaint: z.string().min(1, 'Required'),
  complaintDuration: z.string().min(1, 'Required'),
  hpi: z.string().min(1, 'Required'),
  painPoints: z.array(z.object({
    x: z.number(),
    y: z.number(),
    quality: z.string()
  })),
  pastMedicalConditions: z.array(z.string()),
  otherMedicalConditions: z.string().optional(),
  surgicalHistory: z.array(z.object({
    procedure: z.string(),
    date: z.string(),
    hospital: z.string(),
    surgeon: z.string(),
    outcome: z.string()
  })),
  familyHistory: z.record(z.string(), z.record(z.string(), z.boolean())),
  socialHistory: z.object({
    occupation: z.string(),
    functionalDemand: z.enum(['Sedentary', 'Light', 'Moderate', 'Heavy', 'Very Heavy']),
    activityLevel: z.enum(['Sedentary', 'Lightly Active', 'Moderately Active', 'Very Active', 'Athlete']),
    smokingStatus: z.enum(['Never', 'Former', 'Current']),
    packYears: z.number().optional(),
    alcoholUnits: z.number(),
    livingSituation: z.enum(['Alone', 'With family', 'Care facility'])
  }),
  allergies: z.array(z.object({
    substance: z.string(),
    reaction: z.enum(['Anaphylaxis', 'Rash', 'GI', 'Respiratory', 'Unknown']),
    severity: z.enum(['Mild', 'Moderate', 'Severe'])
  })),
  currentMedications: z.array(z.object({
    name: z.string(),
    dose: z.string(),
    route: z.string(),
    frequency: z.string(),
    prescribingDoctor: z.string()
  })),
  reviewOfSystems: z.record(z.string(), z.array(z.string()))
});

type MedicalHistoryForm = z.infer<typeof medicalHistorySchema>;

interface MedicalHistoryWizardProps {
  patientId: number;
  encounterId: number;
  onComplete: () => void;
  readOnly?: boolean;
  initialData?: Partial<MedicalHistoryForm>;
}

const SECTIONS = [
  { id: 'hpi', title: 'Chief Complaint & HPI', icon: Stethoscope },
  { id: 'past', title: 'Medical & Surgical History', icon: Activity },
  { id: 'family', title: 'Family History', icon: UsersIcon },
  { id: 'social', title: 'Social History', icon: Heart },
  { id: 'allergies', title: 'Allergies', icon: AlertTriangle },
  { id: 'meds', title: 'Current Medications', icon: Pill },
  { id: 'ros', title: 'Review of Systems', icon: ClipboardList },
];

const ROS_SYSTEMS = [
  { name: 'Musculoskeletal', items: ['Joint Pain', 'Stiffness', 'Swelling', 'Muscle Weakness', 'Back Pain'] },
  { name: 'Neurological', items: ['Headaches', 'Dizziness', 'Numbness', 'Tingling', 'Seizures'] },
  { name: 'Cardiovascular', items: ['Chest Pain', 'Palpitations', 'Shortness of Breath', 'Swelling in Legs'] },
  { name: 'Respiratory', items: ['Cough', 'Wheezing', 'Shortness of Breath', 'Sputum'] },
  { name: 'GI', items: ['Nausea', 'Vomiting', 'Abdominal Pain', 'Constipation', 'Diarrhea'] },
  { name: 'GU', items: ['Frequency', 'Urgency', 'Dysuria', 'Incontinence'] },
  { name: 'Dermatological', items: ['Rash', 'Itching', 'Dryness', 'Changes in Moles'] },
  { name: 'Psychological', items: ['Anxiety', 'Depression', 'Sleep Disturbances', 'Memory Loss'] },
];

const PRE_BUILT_CONDITIONS = [
  'Hypertension', 'Diabetes Mellitus', 'Osteoporosis', 'Osteoarthritis', 
  'Rheumatoid Arthritis', 'Previous Fracture', 'Stroke', 'Cardiac Disease', 
  'Asthma', 'Thyroid'
];

export default function MedicalHistoryWizard({ 
  patientId, 
  encounterId, 
  onComplete, 
  readOnly = false,
  initialData 
}: MedicalHistoryWizardProps) {
  const [expandedSections, setExpandedSections] = useState<string[]>(['hpi']);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [hpiRegion, setHpiRegion] = useState<string>('Spine');
  const { medicalHistories } = useDoctorDb();

  const { 
    control, 
    handleSubmit, 
    watch, 
    setValue, 
    formState: { errors, isDirty } 
  } = useForm<MedicalHistoryForm>({
    resolver: zodResolver(medicalHistorySchema),
    defaultValues: initialData || {
      chiefComplaint: '',
      complaintDuration: '',
      hpi: '',
      painPoints: [],
      pastMedicalConditions: [],
      surgicalHistory: [],
      familyHistory: {},
      socialHistory: {
        occupation: '',
        functionalDemand: 'Moderate',
        activityLevel: 'Moderately Active',
        smokingStatus: 'Never',
        alcoholUnits: 0,
        livingSituation: 'With family'
      },
      allergies: [],
      currentMedications: [],
      reviewOfSystems: {}
    }
  });

  const { fields: surgicalFields, append: appendSurgical, remove: removeSurgical } = useFieldArray({
    control,
    name: 'surgicalHistory'
  });

  const { fields: allergyFields, append: appendAllergy, remove: removeAllergy } = useFieldArray({
    control,
    name: 'allergies'
  });

  const { fields: medFields, append: appendMed, remove: removeMed } = useFieldArray({
    control,
    name: 'currentMedications'
  });

  const watchedValues = watch();

  // --- Auto-save Logic ---
  const saveDraft = useCallback(async (data: MedicalHistoryForm) => {
    if (readOnly) return;
    try {
      await medicalHistories.create({
        ...data,
        patientId,
        encounterId,
        status: 'Draft',
        recordedAt: Date.now()
      });
      setLastSaved(new Date());
    } catch (err) {
      console.error('Auto-save failed:', err);
    }
  }, [patientId, encounterId, medicalHistories, readOnly]);

  useEffect(() => {
    const timer = setInterval(() => {
      if (isDirty) {
        handleSubmit(saveDraft)();
      }
    }, 20000);
    return () => clearInterval(timer);
  }, [isDirty, handleSubmit, saveDraft]);

  // --- Progress Tracking ---
  const progress = useMemo(() => {
    let completed = 0;
    if (watchedValues.chiefComplaint && watchedValues.hpi) completed++;
    if (watchedValues.pastMedicalConditions.length > 0 || watchedValues.surgicalHistory.length > 0) completed++;
    if (Object.keys(watchedValues.familyHistory).length > 0) completed++;
    if (watchedValues.socialHistory.occupation) completed++;
    if (watchedValues.allergies.length >= 0) completed++; // Allergies is always "complete" if reviewed
    if (watchedValues.currentMedications.length >= 0) completed++;
    if (Object.keys(watchedValues.reviewOfSystems).length > 0) completed++;
    return completed;
  }, [watchedValues]);

  const hasSevereAllergy = watchedValues.allergies.some(a => a.reaction === 'Anaphylaxis');

  const toggleSection = (id: string) => {
    setExpandedSections(prev => 
      prev.includes(id) ? prev.filter(s => s !== id) : [...prev, id]
    );
  };

  const insertHpiPhrase = (phrase: string) => {
    const currentHpi = watchedValues.hpi || '';
    setValue('hpi', currentHpi + (currentHpi ? '<br>' : '') + phrase, { shouldDirty: true });
  };

  if (readOnly) {
    return <MedicalHistoryReadOnly data={watchedValues} />;
  }

  return (
    <div className="max-w-5xl mx-auto pb-32">
      {/* Progress Header */}
      <div className="sticky top-0 z-20 bg-surface/80 backdrop-blur-md pt-4 pb-6 border-b border-primary/5 mb-8">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-2xl font-serif text-primary">Medical History Wizard</h2>
            <p className="text-[10px] font-bold uppercase tracking-widest text-primary/40 mt-1">
              Patient ID: #{patientId} • Encounter: #{encounterId}
            </p>
          </div>
          <div className="text-right">
            <p className="text-sm font-bold text-primary">{progress} / {SECTIONS.length} Sections Complete</p>
            <div className="w-48 h-1.5 bg-primary/5 rounded-full mt-2 overflow-hidden">
              <motion.div 
                className="h-full bg-doctor-accent"
                initial={{ width: 0 }}
                animate={{ width: `${(progress / SECTIONS.length) * 100}%` }}
              />
            </div>
          </div>
        </div>

        {hasSevereAllergy && (
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="flex items-center gap-3 p-4 bg-red-500 text-white rounded-2xl shadow-lg shadow-red-500/20"
          >
            <AlertTriangle size={20} className="animate-pulse" />
            <div>
              <p className="text-xs font-bold uppercase tracking-widest">Critical Alert: Anaphylaxis Risk</p>
              <p className="text-sm opacity-90">Patient has history of severe anaphylactic reactions. Review allergy list immediately.</p>
            </div>
          </motion.div>
        )}
      </div>

      <form onSubmit={handleSubmit(onComplete)} className="space-y-6">
        {SECTIONS.map((section) => (
          <div key={section.id} className="bg-white rounded-[32px] border border-primary/5 shadow-sm overflow-hidden">
            <button
              type="button"
              onClick={() => toggleSection(section.id)}
              className="w-full flex items-center justify-between p-8 hover:bg-primary/5 transition-colors group"
            >
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-surface-muted flex items-center justify-center text-primary/40 group-hover:bg-doctor-accent group-hover:text-doctor-sidebar transition-all">
                  <section.icon size={24} />
                </div>
                <div className="text-left">
                  <h3 className="text-lg font-bold text-primary">{section.title}</h3>
                  <p className="text-[10px] font-bold text-primary/30 uppercase tracking-widest">Section {SECTIONS.indexOf(section) + 1}</p>
                </div>
              </div>
              {expandedSections.includes(section.id) ? <ChevronUp className="text-primary/20" /> : <ChevronDown className="text-primary/20" />}
            </button>

            <AnimatePresence>
              {expandedSections.includes(section.id) && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="px-8 pb-8 border-t border-primary/5"
                >
                  <div className="pt-8">
                    {section.id === 'hpi' && (
                      <div className="space-y-8">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          <div className="space-y-2">
                            <label className="text-[10px] font-bold uppercase tracking-widest text-primary/40">Chief Complaint</label>
                            <input 
                              {...control.register('chiefComplaint')}
                              placeholder="e.g. Lower back pain"
                              className="w-full p-4 bg-surface-muted rounded-2xl border-none focus:ring-2 focus:ring-doctor-accent/20"
                            />
                          </div>
                          <div className="space-y-2">
                            <label className="text-[10px] font-bold uppercase tracking-widest text-primary/40">Duration</label>
                            <input 
                              {...control.register('complaintDuration')}
                              placeholder="e.g. 3 weeks"
                              className="w-full p-4 bg-surface-muted rounded-2xl border-none focus:ring-2 focus:ring-doctor-accent/20"
                            />
                          </div>
                        </div>

                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                          <div className="lg:col-span-2 space-y-4">
                            <label className="text-[10px] font-bold uppercase tracking-widest text-primary/40">History of Present Illness</label>
                            <Controller
                              name="hpi"
                              control={control}
                              render={({ field }) => (
                                <RichTextEditor 
                                  content={field.value} 
                                  onChange={field.onChange}
                                  placeholder="Describe the progression of symptoms..."
                                />
                              )}
                            />
                            
                            {/* HPI Suggestions */}
                            <div className="p-6 bg-surface-muted/50 rounded-3xl border border-primary/5">
                              <div className="flex items-center justify-between mb-4">
                                <h4 className="text-[10px] font-bold uppercase tracking-widest text-primary/40">Clinical Templates</h4>
                                <select 
                                  value={hpiRegion} 
                                  onChange={(e) => setHpiRegion(e.target.value)}
                                  className="text-[10px] font-bold bg-transparent border-none focus:ring-0 text-doctor-accent cursor-pointer"
                                >
                                  {HPI_SUGGESTIONS.map(s => <option key={s.region} value={s.region}>{s.region}</option>)}
                                </select>
                              </div>
                              <div className="flex flex-wrap gap-2">
                                {HPI_SUGGESTIONS.find(s => s.region === hpiRegion)?.phrases.map((phrase, i) => (
                                  <button
                                    key={i}
                                    type="button"
                                    onClick={() => insertHpiPhrase(phrase)}
                                    className="px-3 py-1.5 bg-white border border-primary/5 rounded-xl text-[11px] text-primary/60 hover:border-doctor-accent hover:text-primary transition-all text-left max-w-xs truncate"
                                    title={phrase}
                                  >
                                    {phrase}
                                  </button>
                                ))}
                              </div>
                            </div>
                          </div>

                          <div className="space-y-4">
                            <label className="text-[10px] font-bold uppercase tracking-widest text-primary/40">Pain Characterization</label>
                            <Controller
                              name="painPoints"
                              control={control}
                              render={({ field }) => (
                                <BodyMap points={field.value} onChange={field.onChange} />
                              )}
                            />
                          </div>
                        </div>
                      </div>
                    )}

                    {section.id === 'past' && (
                      <div className="space-y-12">
                        <div className="space-y-4">
                          <label className="text-[10px] font-bold uppercase tracking-widest text-primary/40">Medical Conditions</label>
                          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                            {PRE_BUILT_CONDITIONS.map(condition => (
                              <label 
                                key={condition}
                                className={cn(
                                  "flex items-center gap-3 p-4 rounded-2xl border transition-all cursor-pointer",
                                  watchedValues.pastMedicalConditions.includes(condition)
                                    ? "bg-doctor-accent/10 border-doctor-accent text-doctor-sidebar"
                                    : "bg-surface-muted border-primary/5 text-primary/40 hover:border-primary/20"
                                )}
                              >
                                <input 
                                  type="checkbox"
                                  className="hidden"
                                  checked={watchedValues.pastMedicalConditions.includes(condition)}
                                  onChange={(e) => {
                                    const current = watchedValues.pastMedicalConditions;
                                    setValue('pastMedicalConditions', 
                                      e.target.checked ? [...current, condition] : current.filter(c => c !== condition),
                                      { shouldDirty: true }
                                    );
                                  }}
                                />
                                <span className="text-xs font-bold">{condition}</span>
                              </label>
                            ))}
                          </div>
                          <div className="mt-4">
                            <input 
                              {...control.register('otherMedicalConditions')}
                              placeholder="Other conditions (comma separated)..."
                              className="w-full p-4 bg-surface-muted rounded-2xl border-none focus:ring-2 focus:ring-doctor-accent/20 text-sm"
                            />
                          </div>
                        </div>

                        <div className="space-y-4">
                          <div className="flex items-center justify-between">
                            <label className="text-[10px] font-bold uppercase tracking-widest text-primary/40">Surgical History</label>
                            <button 
                              type="button"
                              onClick={() => appendSurgical({ procedure: '', date: '', hospital: '', surgeon: '', outcome: '' })}
                              className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-doctor-accent hover:underline"
                            >
                              <Plus size={14} /> Add Procedure
                            </button>
                          </div>
                          <div className="overflow-x-auto">
                            <table className="w-full border-collapse">
                              <thead>
                                <tr className="text-[10px] font-bold uppercase tracking-widest text-primary/20 text-left">
                                  <th className="pb-4 pr-4">Procedure</th>
                                  <th className="pb-4 pr-4">Date</th>
                                  <th className="pb-4 pr-4">Hospital</th>
                                  <th className="pb-4 pr-4">Surgeon</th>
                                  <th className="pb-4 pr-4">Outcome</th>
                                  <th className="pb-4"></th>
                                </tr>
                              </thead>
                              <tbody className="space-y-2">
                                {surgicalFields.map((field, index) => (
                                  <tr key={field.id} className="group">
                                    <td className="pb-2 pr-2">
                                      <input {...control.register(`surgicalHistory.${index}.procedure`)} className="w-full p-3 bg-surface-muted rounded-xl border-none text-sm" />
                                    </td>
                                    <td className="pb-2 pr-2">
                                      <input type="date" {...control.register(`surgicalHistory.${index}.date`)} className="w-full p-3 bg-surface-muted rounded-xl border-none text-sm" />
                                    </td>
                                    <td className="pb-2 pr-2">
                                      <input {...control.register(`surgicalHistory.${index}.hospital`)} className="w-full p-3 bg-surface-muted rounded-xl border-none text-sm" />
                                    </td>
                                    <td className="pb-2 pr-2">
                                      <input {...control.register(`surgicalHistory.${index}.surgeon`)} className="w-full p-3 bg-surface-muted rounded-xl border-none text-sm" />
                                    </td>
                                    <td className="pb-2 pr-2">
                                      <input {...control.register(`surgicalHistory.${index}.outcome`)} className="w-full p-3 bg-surface-muted rounded-xl border-none text-sm" />
                                    </td>
                                    <td className="pb-2">
                                      <button type="button" onClick={() => removeSurgical(index)} className="p-2 text-primary/10 hover:text-red-500 transition-colors">
                                        <Trash2 size={16} />
                                      </button>
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      </div>
                    )}

                    {section.id === 'family' && (
                      <div className="space-y-4">
                        <label className="text-[10px] font-bold uppercase tracking-widest text-primary/40">Related Conditions</label>
                        <div className="overflow-x-auto bg-surface-muted/30 rounded-3xl border border-primary/5 p-6">
                          <table className="w-full">
                            <thead>
                              <tr>
                                <th className="text-left pb-6 text-[10px] font-bold uppercase tracking-widest text-primary/20">Condition</th>
                                {['Father', 'Mother', 'Sibling', 'Grandparent'].map(rel => (
                                  <th key={rel} className="pb-6 text-[10px] font-bold uppercase tracking-widest text-primary/20">{rel}</th>
                                ))}
                              </tr>
                            </thead>
                            <tbody>
                              {['Diabetes', 'Hypertension', 'Heart Disease', 'Cancer', 'Stroke', 'Arthritis'].map(condition => (
                                <tr key={condition} className="border-t border-primary/5">
                                  <td className="py-4 text-sm font-bold text-primary">{condition}</td>
                                  {['Father', 'Mother', 'Sibling', 'Grandparent'].map(rel => (
                                    <td key={rel} className="py-4 text-center">
                                      <input 
                                        type="checkbox"
                                        checked={watchedValues.familyHistory[condition]?.[rel] || false}
                                        onChange={(e) => {
                                          const current = watchedValues.familyHistory[condition] || {};
                                          setValue(`familyHistory.${condition}.${rel}`, e.target.checked, { shouldDirty: true });
                                        }}
                                        className="w-5 h-5 rounded-lg border-primary/10 text-doctor-accent focus:ring-doctor-accent/20"
                                      />
                                    </td>
                                  ))}
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    )}

                    {section.id === 'social' && (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        <div className="space-y-6">
                          <div className="space-y-2">
                            <label className="text-[10px] font-bold uppercase tracking-widest text-primary/40">Occupation</label>
                            <input {...control.register('socialHistory.occupation')} className="w-full p-4 bg-surface-muted rounded-2xl border-none focus:ring-2 focus:ring-doctor-accent/20" />
                          </div>
                          <div className="space-y-2">
                            <label className="text-[10px] font-bold uppercase tracking-widest text-primary/40">Functional Demand</label>
                            <select {...control.register('socialHistory.functionalDemand')} className="w-full p-4 bg-surface-muted rounded-2xl border-none focus:ring-2 focus:ring-doctor-accent/20">
                              {['Sedentary', 'Light', 'Moderate', 'Heavy', 'Very Heavy'].map(opt => <option key={opt} value={opt}>{opt}</option>)}
                            </select>
                          </div>
                          <div className="space-y-2">
                            <label className="text-[10px] font-bold uppercase tracking-widest text-primary/40">Activity Level</label>
                            <select {...control.register('socialHistory.activityLevel')} className="w-full p-4 bg-surface-muted rounded-2xl border-none focus:ring-2 focus:ring-doctor-accent/20">
                              {['Sedentary', 'Lightly Active', 'Moderately Active', 'Very Active', 'Athlete'].map(opt => <option key={opt} value={opt}>{opt}</option>)}
                            </select>
                          </div>
                        </div>
                        <div className="space-y-6">
                          <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                              <label className="text-[10px] font-bold uppercase tracking-widest text-primary/40">Smoking Status</label>
                              <select {...control.register('socialHistory.smokingStatus')} className="w-full p-4 bg-surface-muted rounded-2xl border-none focus:ring-2 focus:ring-doctor-accent/20">
                                {['Never', 'Former', 'Current'].map(opt => <option key={opt} value={opt}>{opt}</option>)}
                              </select>
                            </div>
                            <div className="space-y-2">
                              <label className="text-[10px] font-bold uppercase tracking-widest text-primary/40">Pack-Years</label>
                              <input type="number" {...control.register('socialHistory.packYears', { valueAsNumber: true })} className="w-full p-4 bg-surface-muted rounded-2xl border-none focus:ring-2 focus:ring-doctor-accent/20" />
                            </div>
                          </div>
                          <div className="space-y-2">
                            <label className="text-[10px] font-bold uppercase tracking-widest text-primary/40">Alcohol (Units/Week)</label>
                            <input type="number" {...control.register('socialHistory.alcoholUnits', { valueAsNumber: true })} className="w-full p-4 bg-surface-muted rounded-2xl border-none focus:ring-2 focus:ring-doctor-accent/20" />
                          </div>
                          <div className="space-y-2">
                            <label className="text-[10px] font-bold uppercase tracking-widest text-primary/40">Living Situation</label>
                            <select {...control.register('socialHistory.livingSituation')} className="w-full p-4 bg-surface-muted rounded-2xl border-none focus:ring-2 focus:ring-doctor-accent/20">
                              {['Alone', 'With family', 'Care facility'].map(opt => <option key={opt} value={opt}>{opt}</option>)}
                            </select>
                          </div>
                        </div>
                      </div>
                    )}

                    {section.id === 'allergies' && (
                      <div className="space-y-6">
                        <div className="flex items-center justify-between">
                          <label className="text-[10px] font-bold uppercase tracking-widest text-primary/40">Allergy List</label>
                          <button 
                            type="button"
                            onClick={() => appendAllergy({ substance: '', reaction: 'Unknown', severity: 'Mild' })}
                            className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-doctor-accent hover:underline"
                          >
                            <Plus size={14} /> Add Allergy
                          </button>
                        </div>
                        <div className="space-y-3">
                          {allergyFields.map((field, index) => (
                            <div key={field.id} className="flex items-center gap-4 p-4 bg-surface-muted rounded-2xl border border-primary/5">
                              <div className="flex-1">
                                <input {...control.register(`allergies.${index}.substance`)} placeholder="Substance (e.g. Penicillin)" className="w-full bg-transparent border-none focus:ring-0 text-sm font-bold" />
                              </div>
                              <select {...control.register(`allergies.${index}.reaction`)} className="bg-white/50 border-none rounded-xl text-xs font-bold">
                                {['Anaphylaxis', 'Rash', 'GI', 'Respiratory', 'Unknown'].map(opt => <option key={opt} value={opt}>{opt}</option>)}
                              </select>
                              <select {...control.register(`allergies.${index}.severity`)} className="bg-white/50 border-none rounded-xl text-xs font-bold">
                                {['Mild', 'Moderate', 'Severe'].map(opt => <option key={opt} value={opt}>{opt}</option>)}
                              </select>
                              <button type="button" onClick={() => removeAllergy(index)} className="p-2 text-primary/10 hover:text-red-500 transition-colors">
                                <Trash2 size={16} />
                              </button>
                            </div>
                          ))}
                          {allergyFields.length === 0 && (
                            <div className="text-center py-8 bg-surface-muted/30 rounded-3xl border border-dashed border-primary/10">
                              <p className="text-xs text-primary/30 italic">No allergies reported. Click "Add Allergy" to record.</p>
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {section.id === 'meds' && (
                      <div className="space-y-8">
                        <div className="flex items-center justify-between">
                          <label className="text-[10px] font-bold uppercase tracking-widest text-primary/40">Current Medications</label>
                          <button 
                            type="button"
                            onClick={() => appendMed({ name: '', dose: '', route: 'Oral', frequency: '', prescribingDoctor: '' })}
                            className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-doctor-accent hover:underline"
                          >
                            <Plus size={14} /> Add Medication
                          </button>
                        </div>
                        
                        <div className="space-y-4">
                          {medFields.map((field, index) => {
                            const medName = watchedValues.currentMedications[index]?.name;
                            const medInfo = TOP_MEDICATIONS.find(m => m.name.toLowerCase() === medName?.toLowerCase());
                            
                            return (
                              <div key={field.id} className="p-6 bg-surface-muted rounded-3xl border border-primary/5 space-y-4">
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                  <div className="relative">
                                    <input 
                                      {...control.register(`currentMedications.${index}.name`)} 
                                      placeholder="Drug Name" 
                                      className="w-full p-3 bg-white rounded-xl border-none text-sm font-bold focus:ring-2 focus:ring-doctor-accent/20" 
                                    />
                                    {/* Simple Autocomplete Placeholder */}
                                  </div>
                                  <input {...control.register(`currentMedications.${index}.dose`)} placeholder="Dose (e.g. 500mg)" className="w-full p-3 bg-white rounded-xl border-none text-sm" />
                                  <input {...control.register(`currentMedications.${index}.frequency`)} placeholder="Frequency (e.g. BD)" className="w-full p-3 bg-white rounded-xl border-none text-sm" />
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                  <input {...control.register(`currentMedications.${index}.route`)} placeholder="Route (e.g. Oral)" className="w-full p-3 bg-white rounded-xl border-none text-sm" />
                                  <input {...control.register(`currentMedications.${index}.prescribingDoctor`)} placeholder="Prescribing Doctor" className="w-full p-3 bg-white rounded-xl border-none text-sm" />
                                </div>
                                
                                {medInfo?.warning && (
                                  <div className="flex items-start gap-3 p-3 bg-doctor-accent/10 border border-doctor-accent/20 rounded-xl">
                                    <Info size={14} className="text-doctor-accent mt-0.5" />
                                    <p className="text-[10px] font-bold text-doctor-sidebar leading-relaxed">
                                      <span className="uppercase tracking-widest mr-1">Interaction Alert:</span>
                                      {medInfo.warning}
                                    </p>
                                  </div>
                                )}
                                <div className="flex justify-end">
                                  <button type="button" onClick={() => removeMed(index)} className="text-[10px] font-bold uppercase tracking-widest text-red-500 hover:underline">Remove</button>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {section.id === 'ros' && (
                      <div className="space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          {ROS_SYSTEMS.map(system => (
                            <div key={system.name} className="p-6 bg-surface-muted rounded-3xl border border-primary/5">
                              <div className="flex items-center justify-between mb-4">
                                <h4 className="text-sm font-bold text-primary">{system.name}</h4>
                                <button 
                                  type="button"
                                  onClick={() => {
                                    setValue(`reviewOfSystems.${system.name}`, [], { shouldDirty: true });
                                  }}
                                  className="text-[10px] font-bold uppercase tracking-widest text-primary/30 hover:text-primary transition-colors"
                                >
                                  Mark All Negative
                                </button>
                              </div>
                              <div className="grid grid-cols-1 gap-2">
                                {system.items.map(item => (
                                  <label key={item} className="flex items-center gap-3 p-2 hover:bg-white/50 rounded-xl transition-colors cursor-pointer group">
                                    <input 
                                      type="checkbox"
                                      checked={watchedValues.reviewOfSystems[system.name]?.includes(item) || false}
                                      onChange={(e) => {
                                        const current = watchedValues.reviewOfSystems[system.name] || [];
                                        setValue(`reviewOfSystems.${system.name}`, 
                                          e.target.checked ? [...current, item] : current.filter(i => i !== item),
                                          { shouldDirty: true }
                                        );
                                      }}
                                      className="w-4 h-4 rounded border-primary/10 text-doctor-accent focus:ring-doctor-accent/20"
                                    />
                                    <span className="text-xs text-primary/60 group-hover:text-primary transition-colors">{item}</span>
                                  </label>
                                ))}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        ))}

        {/* Sticky Footer */}
        <div className="fixed bottom-0 left-0 right-0 bg-white/80 backdrop-blur-xl border-t border-primary/5 p-6 z-30">
          <div className="max-w-5xl mx-auto flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-primary/30">
                {lastSaved ? (
                  <>
                    <CheckCircle2 size={14} className="text-emerald-500" />
                    Last saved: {lastSaved.toLocaleTimeString()}
                  </>
                ) : (
                  <>
                    <Save size={14} />
                    Auto-saving every 20s...
                  </>
                )}
              </div>
            </div>
            
            <button 
              type="submit"
              className="px-8 py-4 bg-doctor-sidebar text-white rounded-2xl font-bold text-sm shadow-xl shadow-doctor-sidebar/20 hover:scale-105 transition-all flex items-center gap-3"
            >
              Save & Proceed to Physical Examination
              <ChevronRight size={18} />
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}

function MedicalHistoryReadOnly({ data }: { data: MedicalHistoryForm }) {
  if (!data) return null;
  return (
    <div className="max-w-4xl mx-auto bg-white p-12 rounded-[48px] shadow-2xl border border-primary/5 font-serif text-primary">
      <div className="flex justify-between items-start border-b-2 border-primary/10 pb-8 mb-8">
        <div>
          <h1 className="text-3xl font-bold mb-2">Clinical Medical History</h1>
          <p className="text-sm font-sans text-primary/40 uppercase tracking-widest font-bold">PhysioFlow Digital Health Record</p>
        </div>
        <div className="text-right font-sans">
          <p className="text-xs font-bold text-primary/40 uppercase tracking-widest">Date Recorded</p>
          <p className="text-lg font-bold">{new Date().toLocaleDateString()}</p>
        </div>
      </div>

      <div className="space-y-12">
        <section>
          <h2 className="text-xl font-bold border-b border-primary/5 pb-2 mb-4">I. Chief Complaint & HPI</h2>
          <div className="grid grid-cols-2 gap-8 mb-6 font-sans">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-primary/30">Complaint</p>
              <p className="text-lg font-bold">{data.chiefComplaint}</p>
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-primary/30">Duration</p>
              <p className="text-lg font-bold">{data.complaintDuration}</p>
            </div>
          </div>
          <div className="prose prose-sm max-w-none font-sans text-primary/80" dangerouslySetInnerHTML={{ __html: data.hpi }} />
        </section>

        <section>
          <h2 className="text-xl font-bold border-b border-primary/5 pb-2 mb-4">II. Medical & Surgical History</h2>
          <div className="font-sans space-y-4">
            <p className="text-sm"><span className="font-bold">Conditions:</span> {data.pastMedicalConditions.join(', ') || 'None reported'}</p>
            {data.surgicalHistory.length > 0 && (
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-primary/40 border-b border-primary/5">
                    <th className="py-2">Procedure</th>
                    <th className="py-2">Date</th>
                    <th className="py-2">Outcome</th>
                  </tr>
                </thead>
                <tbody>
                  {data.surgicalHistory.map((s, i) => (
                    <tr key={i}>
                      <td className="py-2 font-bold">{s.procedure}</td>
                      <td className="py-2">{s.date}</td>
                      <td className="py-2">{s.outcome}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </section>

        <section>
          <h2 className="text-xl font-bold border-b border-primary/5 pb-2 mb-4">III. Allergies & Medications</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 font-sans">
            <div className="space-y-3">
              <p className="text-[10px] font-bold uppercase tracking-widest text-primary/30">Allergies</p>
              {data.allergies.map((a, i) => (
                <div key={i} className="flex items-center justify-between p-3 bg-primary/5 rounded-xl">
                  <span className="font-bold">{a.substance}</span>
                  <span className={cn(
                    "px-2 py-0.5 rounded text-[10px] font-bold uppercase",
                    a.reaction === 'Anaphylaxis' ? "bg-red-500 text-white" : "bg-primary/10 text-primary/60"
                  )}>{a.reaction}</span>
                </div>
              ))}
            </div>
            <div className="space-y-3">
              <p className="text-[10px] font-bold uppercase tracking-widest text-primary/30">Medications</p>
              {data.currentMedications.map((m, i) => (
                <div key={i} className="p-3 border border-primary/5 rounded-xl">
                  <p className="font-bold">{m.name}</p>
                  <p className="text-[10px] text-primary/40">{m.dose} • {m.frequency}</p>
                </div>
              ))}
            </div>
          </div>
        </section>
      </div>

      <div className="mt-24 pt-12 border-t-2 border-primary/10 flex justify-between items-end font-sans">
        <div className="space-y-1">
          <p className="text-[10px] font-bold uppercase tracking-widest text-primary/30">Digitally Signed By</p>
          <p className="text-xl font-serif italic">Dr. Sarah Smith, PT, DPT</p>
          <p className="text-[10px] font-bold text-primary/40">License: #MD-12345-PF</p>
        </div>
        <div className="w-32 h-32 border-2 border-doctor-accent/20 rounded-full flex items-center justify-center text-doctor-accent opacity-20 rotate-12">
          <div className="text-center">
            <p className="text-[10px] font-bold uppercase tracking-tighter">PhysioFlow</p>
            <p className="text-[8px] font-bold">VERIFIED</p>
          </div>
        </div>
      </div>
    </div>
  );
}
