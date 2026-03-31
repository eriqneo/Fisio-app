import React, { useState, useEffect, useRef, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  X, 
  Upload, 
  FileText, 
  Printer, 
  Trash2, 
  File, 
  CheckCircle2,
  Loader2,
  Search,
  Activity,
  AlertCircle,
  Thermometer,
  Clock,
  MapPin,
  ClipboardList,
  History,
  Target,
  Dumbbell,
  Pill,
  UserCheck
} from 'lucide-react';
import { Appointment, Patient, ClinicalEncounter, PatientDocument, ICD10_DIAGNOSES, BillingItem } from '@/types';
import { useDoctorDb } from '@/hooks/useDoctorDb';
import { useTenantDb } from '@/hooks/useTenantDb';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import RichTextEditor from '../doctor/RichTextEditor';
import { format } from 'date-fns';

const PAIN_BEHAVIOURS = [
  'Constant',
  'Intermittent',
  'Night pain',
  'Morning stiffness',
  'Worse with activity',
  'Better with rest'
];

const RED_FLAGS = [
  'Unexplained weight loss',
  'Night sweats',
  'Saddle anaesthesia',
  'Bladder/Bowel changes',
  'Fever/Chills',
  'History of malignancy'
];

interface ReviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  appointment: Appointment;
  patient: Patient;
  encounter: ClinicalEncounter;
  onComplete: (notes: string, icd10_2016_version?: string, selectedServices?: BillingItem[]) => void;
}

export default function ReviewModal({ 
  isOpen, 
  onClose, 
  appointment, 
  patient, 
  encounter,
  onComplete 
}: ReviewModalProps) {
  const { documents } = useDoctorDb();
  const { billing } = useTenantDb();
  
  // Structured Fields
  const [chiefComplaint, setChiefComplaint] = useState(encounter?.chiefComplaint || '');
  const [onsetDuration, setOnsetDuration] = useState('');
  const [painLocation, setPainLocation] = useState('');
  const [painCurrent, setPainCurrent] = useState(0);
  const [painWorst, setPainWorst] = useState(0);
  const [painBest, setPainBest] = useState(0);
  const [painBehaviour, setPainBehaviour] = useState<string[]>([]);
  const [aggravatingFactors, setAggravatingFactors] = useState('');
  const [relievingFactors, setRelievingFactors] = useState('');
  const [redFlags, setRedFlags] = useState<string[]>([]);
  
  const [functionalLimitations, setFunctionalLimitations] = useState('');
  const [relevantHistory, setRelevantHistory] = useState('');
  const [currentMedications, setCurrentMedications] = useState('');
  const [previousTreatment, setPreviousTreatment] = useState('');
  const [patientGoals, setPatientGoals] = useState('');
  
  const [physicalExamROM, setPhysicalExamROM] = useState('');
  const [physicalExamStrength, setPhysicalExamStrength] = useState('');
  const [physicalExamPalpation, setPhysicalExamPalpation] = useState('');
  
  const [additionalNotes, setAdditionalNotes] = useState('');
  const [icd10_2016_version, setIcd10_2016_version] = useState(encounter?.icd10_2016_version || '');
  const [diagnosisSearch, setDiagnosisSearch] = useState('');
  const [uploadedFiles, setUploadedFiles] = useState<PatientDocument[]>([]);
  const [isUploading, setIsUploading] = useState(false);

  // Billing Integration
  const [allBillingItems, setAllBillingItems] = useState<BillingItem[]>([]);
  const [selectedServices, setSelectedServices] = useState<BillingItem[]>([]);
  const [serviceSearch, setServiceSearch] = useState('');
  const [isServiceSearchFocused, setIsServiceSearchFocused] = useState(false);

  const filteredServices = useMemo(() => {
    const search = serviceSearch.toLowerCase().trim();
    return allBillingItems
      .filter(item => {
        const matchesSearch = search === '' || 
          item.name.toLowerCase().includes(search) || 
          item.category.toLowerCase().includes(search) ||
          (item.description && item.description.toLowerCase().includes(search));
        const isNotSelected = !selectedServices.find(s => s.id === item.id);
        return matchesSearch && isNotSelected;
      })
      .sort((a, b) => {
        // Prioritize services over products
        if (a.category === 'Service' && b.category === 'Product') return -1;
        if (a.category === 'Product' && b.category === 'Service') return 1;
        return a.name.localeCompare(b.name);
      })
      .slice(0, 20); // Show more results
  }, [allBillingItems, serviceSearch, selectedServices]);

  const filteredDiagnoses = diagnosisSearch.length >= 2 
    ? ICD10_DIAGNOSES.filter(d => 
        d.code.toLowerCase().includes(diagnosisSearch.toLowerCase()) || 
        d.description.toLowerCase().includes(diagnosisSearch.toLowerCase())
      ).slice(0, 5)
    : [];

  useEffect(() => {
    if (isOpen && patient.id) {
      loadDocuments();
      loadBillingItems();
    }
  }, [isOpen, patient.id]);

  const loadBillingItems = async () => {
    try {
      const items = await billing.items.list();
      // Include both services and products, but prioritize services
      setAllBillingItems(items.filter(i => !i.isDeleted));
    } catch (error) {
      console.error('Failed to load billing items:', error);
    }
  };

  const loadDocuments = async () => {
    try {
      const docs = await documents.listByPatient(patient.id!);
      setUploadedFiles(docs.filter(d => !d.isDeleted));
    } catch (error) {
      console.error('Failed to load documents:', error);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setIsUploading(true);
    try {
      for (const file of Array.from(files)) {
        const reader = new FileReader();
        const base64Promise = new Promise<string>((resolve) => {
          reader.onload = () => resolve(reader.result as string);
        });
        reader.readAsDataURL(file);
        const base64 = await base64Promise;

        await documents.create({
          patientId: patient.id!,
          doctorId: encounter.doctorId,
          encounterId: encounter.id,
          name: file.name,
          type: file.type.includes('image') ? 'Imaging' : 'Report',
          fileData: base64,
          mimeType: file.type,
          uploadedAt: Date.now(),
        } as PatientDocument);
      }
      toast.success('Files uploaded successfully');
      loadDocuments();
    } catch (error) {
      console.error('Upload failed:', error);
      toast.error('Failed to upload files');
    } finally {
      setIsUploading(false);
    }
  };

  const handlePrint = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      toast.error('Pop-up blocked. Please allow pop-ups to print.');
      return;
    }

    const formattedNotes = `
      <div style="margin-bottom: 20px;">
        <h2 style="font-size: 16px; border-bottom: 1px solid #eee; padding-bottom: 5px;">Subjective Assessment</h2>
        <p><strong>Chief Complaint:</strong> ${chiefComplaint}</p>
        <p><strong>Onset & Duration:</strong> ${onsetDuration}</p>
        <p><strong>Pain Location:</strong> ${painLocation}</p>
        <p><strong>Pain Intensity:</strong> Current: ${painCurrent}/10, Worst: ${painWorst}/10, Best: ${painBest}/10</p>
        <p><strong>Pain Behaviour:</strong> ${painBehaviour.join(', ') || 'None reported'}</p>
        <p><strong>Aggravating Factors:</strong> ${aggravatingFactors}</p>
        <p><strong>Relieving Factors:</strong> ${relievingFactors}</p>
        <p><strong>Red Flags:</strong> ${redFlags.join(', ') || 'None identified'}</p>
      </div>
      <div style="margin-bottom: 20px;">
        <h2 style="font-size: 16px; border-bottom: 1px solid #eee; padding-bottom: 5px;">Functional & History</h2>
        <p><strong>Functional Limitations:</strong> ${functionalLimitations}</p>
        <p><strong>Relevant History:</strong> ${relevantHistory}</p>
        <p><strong>Current Medications:</strong> ${currentMedications || 'None reported'}</p>
        <p><strong>Previous Treatment & Response:</strong> ${previousTreatment}</p>
        <p><strong>Patient Goals:</strong> ${patientGoals}</p>
      </div>
      <div style="margin-top: 20px;">
        <h2 style="font-size: 16px; border-bottom: 1px solid #eee; padding-bottom: 5px;">Clinical Documentation</h2>
        ${additionalNotes}
      </div>
    `;

    printWindow.document.write(`
      <html>
        <head>
          <title>Clinical Notes - ${patient.firstName} ${patient.lastName}</title>
          <style>
            body { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; padding: 40px; color: #141414; line-height: 1.6; }
            .header { border-bottom: 2px solid #141414; padding-bottom: 20px; margin-bottom: 30px; }
            .header h1 { margin: 0; font-size: 28px; font-family: 'Georgia', serif; font-style: italic; }
            .meta { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 40px; font-size: 12px; text-transform: uppercase; letter-spacing: 0.05em; }
            .content { font-size: 14px; }
            .footer { margin-top: 50px; pt-20; border-top: 1px solid #eee; font-size: 10px; color: #999; text-align: center; }
            @media print {
              body { padding: 0; }
              .no-print { display: none; }
            }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>Clinical Review Notes</h1>
          </div>
          <div class="meta">
            <div>
              <p><strong>Patient:</strong> ${patient.firstName} ${patient.lastName}</p>
              <p><strong>DOB:</strong> ${patient.dob || 'N/A'}</p>
            </div>
            <div>
              <p><strong>Date:</strong> ${format(Date.now(), 'PPP p')}</p>
              <p><strong>Encounter ID:</strong> ${encounter.id}</p>
            </div>
          </div>
          <div class="content">
            ${formattedNotes}
          </div>
          <div class="footer">
            <p>Generated by PhysioFlow Clinical System • ${format(Date.now(), 'yyyy-MM-dd HH:mm')}</p>
          </div>
          <script>
            window.onload = () => {
              window.print();
              setTimeout(() => window.close(), 500);
            };
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  const handleComplete = () => {
    const finalNotes = `
      <h3>Subjective Assessment</h3>
      <p><strong>Chief Complaint:</strong> ${chiefComplaint}</p>
      <p><strong>Onset & Duration:</strong> ${onsetDuration}</p>
      <p><strong>Pain Location:</strong> ${painLocation}</p>
      <p><strong>Pain Intensity:</strong> Current: ${painCurrent}/10, Worst: ${painWorst}/10, Best: ${painBest}/10</p>
      <p><strong>Pain Behaviour:</strong> ${painBehaviour.join(', ')}</p>
      <p><strong>Aggravating Factors:</strong> ${aggravatingFactors}</p>
      <p><strong>Relieving Factors:</strong> ${relievingFactors}</p>
      <p><strong>Red Flags:</strong> ${redFlags.join(', ')}</p>
      <hr />
      <h3>Functional & History</h3>
      <p><strong>Functional Limitations:</strong> ${functionalLimitations}</p>
      <p><strong>Relevant History:</strong> ${relevantHistory}</p>
      <p><strong>Current Medications:</strong> ${currentMedications}</p>
      <p><strong>Previous Treatment & Response:</strong> ${previousTreatment}</p>
      <p><strong>Patient Goals:</strong> ${patientGoals}</p>
      <hr />
      <h3>Additional Notes</h3>
      ${additionalNotes}
    `;
    onComplete(finalNotes, icd10_2016_version, selectedServices);
  };

  if (!isOpen) return null;

  const modalContent = (
    <div className="fixed inset-0 z-[10000] flex items-start justify-center p-4 sm:p-8 overflow-y-auto pt-12 pb-12 custom-scrollbar">
      {/* Immersive Backdrop */}
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="fixed inset-0 bg-primary/40 backdrop-blur-[20px] z-[-1]"
      />

      <motion.div
        initial={{ opacity: 0, scale: 0.9, y: 40 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.9, y: 40 }}
        transition={{ type: "spring", damping: 25, stiffness: 200 }}
        className="bg-white w-full max-w-7xl min-h-[600px] rounded-[60px] shadow-[0_40px_100px_rgba(0,0,0,0.2)] flex flex-col overflow-hidden border border-white/20 relative"
      >
        {/* Premium Header */}
        <div className="px-12 py-10 border-b border-primary/5 flex items-center justify-between bg-surface-muted/30 shrink-0">
          <div className="flex items-center gap-10">
            <div className="relative">
              <div className="w-24 h-24 rounded-[40px] bg-primary text-white flex items-center justify-center text-4xl font-serif italic shadow-2xl shadow-primary/30">
                {patient.firstName[0]}
              </div>
              <div className="absolute -bottom-2 -right-2 w-10 h-10 bg-accent text-white rounded-2xl flex items-center justify-center shadow-xl border-4 border-white">
                <ClipboardList size={20} />
              </div>
            </div>
            <div>
              <h2 className="text-4xl font-serif text-primary tracking-tight">
                Clinical Review <span className="text-primary/20 mx-2">/</span> 
                <span className="text-accent">{patient.firstName} {patient.lastName}</span>
              </h2>
              <div className="flex items-center gap-6 mt-3">
                <div className="flex items-center gap-2 px-4 py-1.5 bg-primary/5 text-primary/40 rounded-full text-[10px] font-black uppercase tracking-[0.2em] border border-primary/5">
                  <UserCheck size={14} className="text-accent" />
                  {appointment.type}
                </div>
                <div className="flex items-center gap-2 text-[10px] text-primary/30 font-black uppercase tracking-[0.2em]">
                  <Clock size={14} />
                  {format(appointment.startTime, 'MMMM d, yyyy • h:mm a')}
                </div>
              </div>
            </div>
          </div>
          
          <div className="flex items-center gap-4">
            <button 
              onClick={handlePrint}
              className="p-5 bg-white text-primary/40 rounded-[24px] hover:text-primary hover:bg-white transition-all shadow-sm border border-primary/5 active:scale-95 group"
              title="Print Clinical Note"
            >
              <Printer size={24} className="group-hover:scale-110 transition-transform" />
            </button>
            <button 
              onClick={onClose}
              className="p-5 bg-white text-primary/40 rounded-[24px] hover:text-red-500 hover:bg-white transition-all shadow-sm border border-primary/5 active:scale-95"
            >
              <X size={24} />
            </button>
          </div>
        </div>

        {/* Main Content Area */}
        <div className="flex-1 overflow-hidden flex flex-col lg:flex-row">
          {/* Left Column: Structured Assessment */}
          <div className="flex-1 overflow-y-auto p-12 space-y-24 custom-scrollbar bg-white">
            
            {/* Section 01: Subjective */}
            <section className="space-y-12">
              <div className="flex items-center gap-6">
                <span className="text-7xl font-serif text-primary/5 italic select-none">01</span>
                <div>
                  <h3 className="text-3xl font-serif text-primary tracking-tight">Subjective Assessment</h3>
                  <p className="text-[10px] text-primary/30 font-black uppercase tracking-[0.3em] mt-1">Patient's perspective & history</p>
                </div>
                <div className="h-px bg-primary/5 flex-1 ml-4" />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
                {/* Pain Intensity Grid */}
                <div className="space-y-8 bg-surface-muted/20 p-10 rounded-[48px] border border-primary/5 shadow-inner">
                  <div className="flex items-center justify-between mb-4">
                    <label className="text-[10px] font-black text-primary/40 uppercase tracking-[0.3em] flex items-center gap-2">
                      <Activity size={16} className="text-accent" />
                      Pain Intensity (VAS)
                    </label>
                    <div className="flex items-baseline gap-1">
                      <span className={cn(
                        "text-5xl font-serif italic transition-colors duration-500",
                        painCurrent > 7 ? "text-red-500" : painCurrent > 3 ? "text-accent" : "text-emerald-500"
                      )}>
                        {painCurrent}
                      </span>
                      <span className="text-primary/20 text-xl font-serif italic">/10</span>
                    </div>
                  </div>
                  
                  <div className="space-y-10">
                    {[
                      { label: 'Current', value: painCurrent, setter: setPainCurrent },
                      { label: 'Worst (24h)', value: painWorst, setter: setPainWorst },
                      { label: 'Best (24h)', value: painBest, setter: setPainBest }
                    ].map((item) => (
                      <div key={item.label} className="space-y-4">
                        <div className="flex justify-between text-[9px] font-black text-primary/30 uppercase tracking-widest">
                          <span>{item.label}</span>
                          <span className="text-accent">{item.value}/10</span>
                        </div>
                        <input 
                          type="range" min="0" max="10" 
                          value={item.value}
                          onChange={(e) => item.setter(Number(e.target.value))}
                          className="w-full h-2 bg-primary/5 rounded-full appearance-none cursor-pointer accent-accent hover:accent-primary transition-all"
                        />
                      </div>
                    ))}
                  </div>
                </div>

                {/* Chief Complaint & Behaviour */}
                <div className="space-y-10">
                  <div className="space-y-4">
                    <label className="text-[10px] font-black text-primary/40 uppercase tracking-[0.3em] ml-4">Chief Complaint</label>
                    <textarea 
                      value={chiefComplaint}
                      onChange={(e) => setChiefComplaint(e.target.value)}
                      placeholder="Describe the primary reason for visit..."
                      className="w-full h-40 bg-surface-muted/10 border border-primary/5 rounded-[32px] p-8 text-primary placeholder:text-primary/20 focus:ring-4 focus:ring-accent/5 focus:border-accent/20 transition-all resize-none shadow-sm text-lg font-medium"
                    />
                  </div>
                  <div className="space-y-4">
                    <label className="text-[10px] font-black text-primary/40 uppercase tracking-[0.3em] ml-4">Pain Behaviour</label>
                    <div className="flex flex-wrap gap-3">
                      {PAIN_BEHAVIOURS.map(behaviour => (
                        <button
                          key={behaviour}
                          onClick={() => {
                            setPainBehaviour(prev => 
                              prev.includes(behaviour) ? prev.filter(b => b !== behaviour) : [...prev, behaviour]
                            );
                          }}
                          className={cn(
                            "px-6 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest border transition-all duration-300",
                            painBehaviour.includes(behaviour)
                              ? 'bg-primary text-white border-primary shadow-xl shadow-primary/20 scale-105'
                              : 'bg-white text-primary/40 border-primary/5 hover:border-primary/20 hover:bg-surface-muted/50'
                          )}
                        >
                          {behaviour}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* Functional & History Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
                <div className="space-y-4">
                  <label className="text-[10px] font-black text-primary/40 uppercase tracking-[0.3em] ml-4">Functional Limitations</label>
                  <textarea 
                    value={functionalLimitations}
                    onChange={(e) => setFunctionalLimitations(e.target.value)}
                    placeholder="Activities restricted by current condition..."
                    className="w-full h-32 bg-white border border-primary/5 rounded-[32px] p-6 text-sm focus:ring-4 focus:ring-accent/5 transition-all shadow-sm"
                  />
                </div>
                <div className="space-y-4">
                  <label className="text-[10px] font-black text-primary/40 uppercase tracking-[0.3em] ml-4">Relevant History</label>
                  <textarea 
                    value={relevantHistory}
                    onChange={(e) => setRelevantHistory(e.target.value)}
                    placeholder="Previous injuries, surgeries, co-morbidities..."
                    className="w-full h-32 bg-white border border-primary/5 rounded-[32px] p-6 text-sm focus:ring-4 focus:ring-accent/5 transition-all shadow-sm"
                  />
                </div>
                <div className="space-y-4">
                  <label className="text-[10px] font-black text-primary/40 uppercase tracking-[0.3em] ml-4">Patient Goals</label>
                  <textarea 
                    value={patientGoals}
                    onChange={(e) => setPatientGoals(e.target.value)}
                    placeholder="What does the patient hope to achieve? (e.g. Return to sport, pain-free walking)..."
                    className="w-full h-32 bg-white border border-primary/5 rounded-[32px] p-6 text-sm focus:ring-4 focus:ring-accent/5 transition-all shadow-sm"
                  />
                </div>
              </div>

              {/* Red Flags - Critical Section */}
              <div className="p-10 bg-red-500/[0.02] rounded-[48px] border border-red-500/10 space-y-6">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-2xl bg-red-500 text-white flex items-center justify-center shadow-lg shadow-red-500/20">
                    <AlertCircle size={20} />
                  </div>
                  <h4 className="text-[10px] font-black text-red-500 uppercase tracking-[0.3em]">Safety Screening / Red Flags</h4>
                </div>
                <div className="flex flex-wrap gap-3">
                  {RED_FLAGS.map(flag => (
                    <button
                      key={flag}
                      onClick={() => {
                        setRedFlags(prev => 
                          prev.includes(flag) ? prev.filter(f => f !== flag) : [...prev, flag]
                        );
                      }}
                      className={cn(
                        "px-6 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest border transition-all duration-300",
                        redFlags.includes(flag)
                          ? 'bg-red-500 text-white border-red-500 shadow-xl shadow-red-500/20 scale-105'
                          : 'bg-white text-red-500/40 border-red-500/10 hover:border-red-500/30'
                      )}
                    >
                      {flag}
                    </button>
                  ))}
                </div>
              </div>
            </section>

            {/* Section 02: Objective Findings */}
            <section className="space-y-12">
              <div className="flex items-center gap-6">
                <span className="text-7xl font-serif text-primary/5 italic select-none">02</span>
                <div>
                  <h3 className="text-3xl font-serif text-primary tracking-tight">Objective Findings</h3>
                  <p className="text-[10px] text-primary/30 font-black uppercase tracking-[0.3em] mt-1">Clinical examination & tests</p>
                </div>
                <div className="h-px bg-primary/5 flex-1 ml-4" />
              </div>

              <div className="grid grid-cols-1 gap-12">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
                  <div className="space-y-4">
                    <label className="text-[10px] font-black text-primary/40 uppercase tracking-[0.3em] ml-4">Current Medications</label>
                    <div className="relative">
                      <Pill className="absolute left-6 top-1/2 -translate-y-1/2 text-primary/20" size={18} />
                      <input 
                        value={currentMedications}
                        onChange={(e) => setCurrentMedications(e.target.value)}
                        placeholder="List any current medications..."
                        className="w-full pl-16 pr-8 py-5 bg-white border border-primary/5 rounded-[24px] text-sm focus:ring-4 focus:ring-accent/5 transition-all shadow-sm"
                      />
                    </div>
                  </div>
                  <div className="space-y-4">
                    <label className="text-[10px] font-black text-primary/40 uppercase tracking-[0.3em] ml-4">Previous Treatment Response</label>
                    <input 
                      value={previousTreatment}
                      onChange={(e) => setPreviousTreatment(e.target.value)}
                      placeholder="Response to prior care, HEP adherence..."
                      className="w-full px-8 py-5 bg-white border border-primary/5 rounded-[24px] text-sm focus:ring-4 focus:ring-accent/5 transition-all shadow-sm"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                  <div className="space-y-4">
                    <label className="text-[10px] font-black text-primary/40 uppercase tracking-[0.3em] ml-4">Range of Motion (ROM)</label>
                    <textarea 
                      value={physicalExamROM}
                      onChange={(e) => setPhysicalExamROM(e.target.value)}
                      placeholder="Active/Passive ROM findings..."
                      className="w-full h-32 bg-white border border-primary/5 rounded-[32px] p-6 text-sm focus:ring-4 focus:ring-accent/5 transition-all shadow-sm resize-none"
                    />
                  </div>
                  <div className="space-y-4">
                    <label className="text-[10px] font-black text-primary/40 uppercase tracking-[0.3em] ml-4">Muscle Strength (MMT)</label>
                    <textarea 
                      value={physicalExamStrength}
                      onChange={(e) => setPhysicalExamStrength(e.target.value)}
                      placeholder="Strength grading (e.g. 4/5)..."
                      className="w-full h-32 bg-white border border-primary/5 rounded-[32px] p-6 text-sm focus:ring-4 focus:ring-accent/5 transition-all shadow-sm resize-none"
                    />
                  </div>
                  <div className="space-y-4">
                    <label className="text-[10px] font-black text-primary/40 uppercase tracking-[0.3em] ml-4">Palpation & Sensation</label>
                    <textarea 
                      value={physicalExamPalpation}
                      onChange={(e) => setPhysicalExamPalpation(e.target.value)}
                      placeholder="Tenderness, swelling, dermatomes..."
                      className="w-full h-32 bg-white border border-primary/5 rounded-[32px] p-6 text-sm focus:ring-4 focus:ring-accent/5 transition-all shadow-sm resize-none"
                    />
                  </div>
                </div>
                
                <div className="space-y-6">
                  <div className="flex items-center justify-between px-4">
                    <label className="text-[10px] font-black text-primary/40 uppercase tracking-[0.3em]">Clinical Documentation & Physical Exam</label>
                    <div className="flex items-center gap-2 text-[9px] font-black text-primary/20 uppercase tracking-widest">
                      <FileText size={12} />
                      Rich Text Enabled
                    </div>
                  </div>
                  <div className="bg-surface-muted/10 p-2 rounded-[40px] border border-primary/5">
                    <RichTextEditor 
                      content={additionalNotes}
                      onChange={setAdditionalNotes}
                      placeholder="Document physical exam, ROM, strength, special tests, neurological findings..."
                    />
                  </div>
                </div>
              </div>
            </section>

            {/* Section 03: Diagnosis & Plan */}
            <section className="space-y-12">
              <div className="flex items-center gap-6">
                <span className="text-7xl font-serif text-primary/5 italic select-none">03</span>
                <div>
                  <h3 className="text-3xl font-serif text-primary tracking-tight">Assessment & Plan</h3>
                  <p className="text-[10px] text-primary/30 font-black uppercase tracking-[0.3em] mt-1">Diagnosis, goals & next steps</p>
                </div>
                <div className="h-px bg-primary/5 flex-1 ml-4" />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
                {/* ICD-10 Search */}
                <div className="space-y-6 bg-accent/[0.02] p-10 rounded-[48px] border border-accent/10">
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-[10px] font-black text-accent uppercase tracking-[0.3em] flex items-center gap-2">
                      <Search size={16} />
                      ICD-10 Diagnosis Library
                    </label>
                  </div>
                  
                  <div className="relative">
                    <input 
                      type="text"
                      value={diagnosisSearch}
                      onChange={(e) => setDiagnosisSearch(e.target.value)}
                      placeholder="Search clinical codes..."
                      className="w-full px-8 py-5 bg-white border border-primary/5 rounded-[24px] text-sm focus:ring-4 focus:ring-accent/10 transition-all shadow-sm"
                    />
                    <AnimatePresence>
                      {filteredDiagnoses.length > 0 && (
                        <motion.div 
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: 10 }}
                          className="absolute top-full left-0 right-0 mt-4 bg-white rounded-[32px] shadow-2xl border border-primary/5 z-50 overflow-hidden p-3"
                        >
                          {filteredDiagnoses.map(d => (
                            <button
                              key={d.code}
                              onClick={() => {
                                setIcd10_2016_version(d.code);
                                setDiagnosisSearch('');
                              }}
                              className="w-full flex items-center gap-4 p-4 hover:bg-surface-muted rounded-2xl transition-all text-left group"
                            >
                              <span className="px-3 py-1 bg-primary/5 text-primary/40 rounded-lg text-[10px] font-black group-hover:bg-accent group-hover:text-white transition-colors">{d.code}</span>
                              <span className="text-sm font-bold text-primary group-hover:text-accent transition-colors">{d.description}</span>
                            </button>
                          ))}
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>

                  {icd10_2016_version && (
                    <div className="flex items-center gap-4 p-6 bg-white rounded-[32px] border border-accent/20 shadow-sm animate-in fade-in slide-in-from-top-2">
                      <div className="w-12 h-12 rounded-2xl bg-accent text-white flex items-center justify-center text-xs font-black">
                        {icd10_2016_version}
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-bold text-primary truncate">
                          {ICD10_DIAGNOSES.find(d => d.code === icd10_2016_version)?.description}
                        </p>
                        <p className="text-[9px] text-primary/30 font-black uppercase tracking-widest mt-1">Selected Diagnosis</p>
                      </div>
                      <button 
                        onClick={() => setIcd10_2016_version('')}
                        className="ml-auto p-3 text-primary/10 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all"
                      >
                        <X size={18} />
                      </button>
                    </div>
                  )}
                </div>

                {/* Goals & Plan */}
                <div className="space-y-8">
                  <div className="space-y-4">
                    <label className="text-[10px] font-black text-primary/40 uppercase tracking-[0.3em] ml-4">Patient's Own Goals</label>
                    <div className="relative">
                      <Target className="absolute left-6 top-6 text-primary/20" size={18} />
                      <textarea 
                        value={patientGoals}
                        onChange={(e) => setPatientGoals(e.target.value)}
                        placeholder="What does the patient want to achieve?"
                        className="w-full h-32 pl-16 pr-8 py-6 bg-white border border-primary/5 rounded-[32px] text-sm focus:ring-4 focus:ring-accent/5 transition-all shadow-sm"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </section>

            {/* Section 04: Services & Billing */}
            <section className="space-y-12 pb-12">
              <div className="flex items-center gap-6">
                <span className="text-7xl font-serif text-primary/5 italic select-none">04</span>
                <div>
                  <h3 className="text-3xl font-serif text-primary tracking-tight">Services & Billing</h3>
                  <p className="text-[10px] text-primary/30 font-black uppercase tracking-[0.3em] mt-1">Add services rendered to invoice</p>
                </div>
                <div className="h-px bg-primary/5 flex-1 ml-4" />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
                {/* Service Selection */}
                <div className="space-y-6 bg-emerald-500/[0.02] p-10 rounded-[48px] border border-emerald-500/10">
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-[10px] font-black text-emerald-600 uppercase tracking-[0.3em] flex items-center gap-2">
                      <Search size={16} />
                      Select Services
                    </label>
                  </div>
                  
                  <div className="relative">
                    <input 
                      type="text"
                      value={serviceSearch}
                      onChange={(e) => setServiceSearch(e.target.value)}
                      onFocus={() => setIsServiceSearchFocused(true)}
                      onBlur={() => setTimeout(() => setIsServiceSearchFocused(false), 200)}
                      placeholder="Search services (e.g. Consultation, Massage, Dry Needling)..."
                      className="w-full px-8 py-6 bg-white border-2 border-emerald-500/10 rounded-[28px] text-base font-medium focus:ring-8 focus:ring-emerald-500/5 focus:border-emerald-500/30 transition-all shadow-lg placeholder:text-primary/20"
                    />
                    <AnimatePresence>
                      {(isServiceSearchFocused || serviceSearch.length >= 1) && (
                        <motion.div 
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: 10 }}
                          className="absolute top-full left-0 right-0 mt-4 bg-white rounded-[32px] shadow-2xl border border-primary/5 z-50 overflow-hidden p-3 max-h-[400px] overflow-y-auto custom-scrollbar"
                        >
                          {filteredServices.length > 0 ? (
                            <>
                              <div className="px-4 py-2 mb-2">
                                <p className="text-[10px] font-black text-primary/20 uppercase tracking-widest">
                                  {serviceSearch.length === 0 ? 'Available Services & Products' : `Search Results (${filteredServices.length})`}
                                </p>
                              </div>
                              {filteredServices.map(item => (
                                <button
                                  key={item.id}
                                  onClick={() => {
                                    setSelectedServices(prev => [...prev, item]);
                                    setServiceSearch('');
                                  }}
                                  className="w-full flex items-center justify-between p-4 hover:bg-emerald-50 rounded-2xl transition-all text-left group"
                                >
                                  <div className="flex items-center gap-4">
                                    <div className={cn(
                                      "w-10 h-10 rounded-xl flex items-center justify-center transition-colors",
                                      item.category === 'Service' 
                                        ? "bg-emerald-500/10 text-emerald-600 group-hover:bg-emerald-500 group-hover:text-white" 
                                        : "bg-blue-500/10 text-blue-600 group-hover:bg-blue-500 group-hover:text-white"
                                    )}>
                                      {item.category === 'Service' ? <Activity size={18} /> : <Pill size={18} />}
                                    </div>
                                    <div>
                                      <p className="text-sm font-bold text-primary group-hover:text-emerald-600 transition-colors">{item.name}</p>
                                      <div className="flex items-center gap-2">
                                        <p className="text-[9px] text-primary/30 font-black uppercase tracking-widest">{item.category}</p>
                                        {item.description && (
                                          <>
                                            <span className="text-primary/10">•</span>
                                            <p className="text-[9px] text-primary/20 truncate max-w-[150px]">{item.description}</p>
                                          </>
                                        )}
                                      </div>
                                    </div>
                                  </div>
                                  <div className="text-right">
                                    <p className="text-sm font-black text-primary">{item.currency} {item.price.toFixed(2)}</p>
                                  </div>
                                </button>
                              ))}
                            </>
                          ) : (
                            <div className="p-8 text-center">
                              <AlertCircle className="mx-auto mb-3 text-primary/10" size={32} />
                              <p className="text-sm font-bold text-primary">No items found</p>
                              <p className="text-[10px] text-primary/30 font-black uppercase tracking-widest mt-1">Try a different search term</p>
                            </div>
                          )}
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                </div>

                {/* Selected Services List */}
                <div className="space-y-6">
                  <label className="text-[10px] font-black text-primary/40 uppercase tracking-[0.3em] ml-4">Selected Services</label>
                  <div className="space-y-4">
                    {selectedServices.map((service) => (
                      <motion.div 
                        key={service.id}
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        className="flex items-center justify-between p-6 bg-white rounded-[32px] border border-primary/5 shadow-sm group"
                      >
                        <div className="flex items-center gap-4">
                          <div className="w-12 h-12 rounded-2xl bg-emerald-500 text-white flex items-center justify-center">
                            <CheckCircle2 size={20} />
                          </div>
                          <div>
                            <p className="text-sm font-bold text-primary">{service.name}</p>
                            <p className="text-[10px] text-primary/30 font-black uppercase tracking-widest">${service.price}</p>
                          </div>
                        </div>
                        <button 
                          onClick={() => setSelectedServices(prev => prev.filter(s => s.id !== service.id))}
                          className="p-3 text-primary/10 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all opacity-0 group-hover:opacity-100"
                        >
                          <X size={18} />
                        </button>
                      </motion.div>
                    ))}
                    {selectedServices.length === 0 && (
                      <div className="text-center py-12 bg-surface-muted/20 rounded-[32px] border border-dashed border-primary/5">
                        <p className="text-[10px] font-black text-primary/20 uppercase tracking-widest">No services selected</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </section>

          </div>

          {/* Right Column: Files & Attachments */}
          <div className="w-full lg:w-[450px] bg-surface-muted/30 p-12 border-l border-primary/5 overflow-y-auto space-y-12 custom-scrollbar">
            <div className="space-y-8">
              <div className="flex items-center justify-between">
                <h3 className="text-[10px] font-black text-primary/30 uppercase tracking-[0.3em] flex items-center gap-3">
                  <Upload size={18} className="text-accent" />
                  Clinical Media
                </h3>
                <span className="px-3 py-1 bg-white rounded-full text-[10px] font-black text-primary/40 border border-primary/5 shadow-sm">
                  {uploadedFiles.length} Files
                </span>
              </div>
              
              <label className="block group">
                <div className={cn(
                  "border-2 border-dashed border-primary/10 rounded-[48px] p-12 text-center transition-all duration-500 cursor-pointer relative overflow-hidden",
                  isUploading ? "bg-accent/5 border-accent/30" : "bg-white hover:border-accent/50 hover:bg-accent/[0.02] hover:shadow-2xl hover:shadow-accent/5"
                )}>
                  {isUploading ? (
                    <div className="space-y-4">
                      <Loader2 className="mx-auto text-accent animate-spin" size={48} />
                      <p className="text-[10px] font-black text-accent uppercase tracking-widest animate-pulse">Uploading Clinical Data...</p>
                    </div>
                  ) : (
                    <>
                      <div className="w-20 h-20 bg-surface-muted rounded-[32px] flex items-center justify-center mx-auto mb-6 group-hover:scale-110 group-hover:bg-accent group-hover:text-white transition-all duration-500 shadow-inner">
                        <Upload size={32} />
                      </div>
                      <h4 className="text-lg font-bold text-primary mb-2">Add Attachments</h4>
                      <p className="text-[10px] text-primary/30 font-black uppercase tracking-[0.2em]">CT, MRI, X-Ray or Reports</p>
                    </>
                  )}
                  <input 
                    type="file" 
                    multiple 
                    className="hidden" 
                    onChange={handleFileUpload}
                    disabled={isUploading}
                  />
                </div>
              </label>
            </div>

            <div className="space-y-6">
              <AnimatePresence mode="popLayout">
                {uploadedFiles.map((file, i) => (
                  <motion.div 
                    key={file.id}
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                    transition={{ delay: i * 0.05 }}
                    className="bg-white p-6 rounded-[32px] border border-primary/5 flex items-center justify-between group hover:shadow-2xl hover:shadow-primary/5 transition-all duration-500"
                  >
                    <div className="flex items-center gap-5">
                      <div className="w-14 h-14 rounded-2xl bg-accent/5 flex items-center justify-center text-accent shadow-inner group-hover:bg-accent group-hover:text-white transition-colors">
                        {file.type.includes('image') ? <Activity size={24} /> : <FileText size={24} />}
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-bold text-primary truncate max-w-[180px] group-hover:text-accent transition-colors">{file.name}</p>
                        <p className="text-[10px] text-primary/30 font-black uppercase tracking-widest mt-1">{format(file.uploadedAt, 'MMM d, HH:mm')}</p>
                      </div>
                    </div>
                    <button 
                      onClick={async () => {
                        await documents.delete(file.id as number);
                        loadDocuments();
                      }}
                      className="p-4 text-primary/10 hover:text-red-500 hover:bg-red-50 rounded-2xl transition-all opacity-0 group-hover:opacity-100"
                    >
                      <Trash2 size={20} />
                    </button>
                  </motion.div>
                ))}
              </AnimatePresence>
              
              {uploadedFiles.length === 0 && (
                <div className="text-center py-24 bg-white/40 rounded-[48px] border border-dashed border-primary/5">
                  <File size={48} className="mx-auto mb-4 text-primary/5" />
                  <p className="text-[10px] font-black text-primary/10 uppercase tracking-[0.3em]">No documents attached</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Action Footer */}
        <div className="px-12 py-10 border-t border-primary/5 bg-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-3 px-5 py-2.5 bg-emerald-500/10 text-emerald-600 rounded-full border border-emerald-500/10">
              <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-[10px] font-black uppercase tracking-widest">Cloud Sync Active</span>
            </div>
            <p className="text-[10px] text-primary/20 font-black uppercase tracking-widest hidden md:block">
              Last saved {format(new Date(), 'HH:mm:ss')}
            </p>
          </div>
          
          <div className="flex items-center gap-8">
            <button 
              onClick={onClose}
              className="px-10 py-5 text-primary/30 text-[10px] font-black uppercase tracking-[0.3em] hover:text-primary transition-colors"
            >
              Discard Draft
            </button>
            <button 
              onClick={handleComplete}
              disabled={encounter.status !== 'Draft'}
              className={cn(
                "px-16 py-6 rounded-[32px] text-[10px] font-black uppercase tracking-[0.3em] transition-all shadow-[0_20px_50px_rgba(0,0,0,0.15)] flex items-center gap-4 group",
                encounter.status === 'Draft'
                  ? "bg-primary text-white hover:bg-accent hover:shadow-accent/30 hover:scale-[1.02] active:scale-[0.98]"
                  : "bg-primary/10 text-primary/30 cursor-not-allowed"
              )}
            >
              <CheckCircle2 size={20} className="group-hover:scale-110 transition-transform" />
              {encounter.status === 'Draft' ? 'Complete & Sign Review' : 'Review Already Signed'}
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );

  return createPortal(modalContent, document.body);
}
