import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ChevronRight, ChevronLeft, Check, User, Activity, ShieldCheck } from 'lucide-react';
import { useTenantDb } from '@/hooks/useTenantDb';
import { useQueryClient } from '@tanstack/react-query';

const patientSchema = z.object({
  firstName: z.string().min(2, 'First name is required'),
  lastName: z.string().min(2, 'Last name is required'),
  dob: z.string().min(1, 'Date of birth is required'),
  phone: z.string().min(5, 'Phone number is required'),
  email: z.string().email('Invalid email address'),
  type: z.enum(['NP', 'NR', 'Booked', 'WalkIn']),
  medicalHistory: z.string().optional(),
  insuranceInfo: z.string().min(1, 'Insurance info is required'),
  consentSigned: z.boolean().refine(val => val === true, 'Consent must be signed'),
});

type PatientFormData = z.infer<typeof patientSchema>;

interface AddPatientModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function AddPatientModal({ isOpen, onClose }: AddPatientModalProps) {
  const [step, setStep] = useState(1);
  const { patients } = useTenantDb();
  const queryClient = useQueryClient();

  const {
    register,
    handleSubmit,
    trigger,
    formState: { errors, isSubmitting },
    reset,
  } = useForm<PatientFormData>({
    resolver: zodResolver(patientSchema),
    defaultValues: {
      type: 'NP',
      consentSigned: false,
    },
  });

  const onSubmit = async (data: PatientFormData) => {
    try {
      await patients.create({
        ...data,
        createdAt: Date.now(),
      });
      queryClient.invalidateQueries({ queryKey: ['patients'] });
      reset();
      onClose();
      setStep(1);
    } catch (error) {
      console.error('Failed to add patient:', error);
    }
  };

  const nextStep = async () => {
    let fieldsToValidate: (keyof PatientFormData)[] = [];
    if (step === 1) {
      fieldsToValidate = ['firstName', 'lastName', 'dob', 'phone', 'email', 'type'];
    } else if (step === 2) {
      fieldsToValidate = ['medicalHistory'];
    }

    const isValid = await trigger(fieldsToValidate);
    if (isValid) setStep(prev => prev + 1);
  };

  const prevStep = () => setStep(prev => prev - 1);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="absolute inset-0 bg-primary/20 backdrop-blur-sm"
      />
      
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        className="relative w-full max-w-2xl bg-white rounded-3xl shadow-2xl overflow-hidden"
      >
        <div className="flex items-center justify-between p-6 border-b border-primary/5">
          <div>
            <h2 className="text-xl font-serif text-primary">Add New Patient</h2>
            <p className="text-xs text-primary/40 font-bold uppercase tracking-widest mt-1">
              Step {step} of 3: {step === 1 ? 'Personal Info' : step === 2 ? 'Medical History' : 'Insurance & Consent'}
            </p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-surface-muted rounded-xl transition-all">
            <X size={20} className="text-primary/40" />
          </button>
        </div>

        <div className="p-8">
          {/* Progress Bar */}
          <div className="flex items-center gap-4 mb-10">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex-1 flex items-center gap-2">
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold transition-all ${
                  step >= i ? 'bg-primary text-white shadow-lg shadow-primary/20' : 'bg-surface-muted text-primary/20'
                }`}>
                  {step > i ? <Check size={14} /> : i}
                </div>
                {i < 3 && <div className={`flex-1 h-1 rounded-full transition-all ${step > i ? 'bg-primary' : 'bg-surface-muted'}`} />}
              </div>
            ))}
          </div>

          <form onSubmit={handleSubmit(onSubmit)}>
            <AnimatePresence mode="wait">
              {step === 1 && (
                <motion.div
                  key="step1"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="grid grid-cols-2 gap-6"
                >
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-primary/40 uppercase tracking-widest ml-1">First Name</label>
                    <input {...register('firstName')} className="w-full px-4 py-3 bg-surface-muted border-none rounded-xl text-sm focus:ring-2 focus:ring-accent/20 transition-all" />
                    {errors.firstName && <p className="text-[10px] text-error font-bold mt-1 ml-1">{errors.firstName.message}</p>}
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-primary/40 uppercase tracking-widest ml-1">Last Name</label>
                    <input {...register('lastName')} className="w-full px-4 py-3 bg-surface-muted border-none rounded-xl text-sm focus:ring-2 focus:ring-accent/20 transition-all" />
                    {errors.lastName && <p className="text-[10px] text-error font-bold mt-1 ml-1">{errors.lastName.message}</p>}
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-primary/40 uppercase tracking-widest ml-1">Date of Birth</label>
                    <input type="date" {...register('dob')} className="w-full px-4 py-3 bg-surface-muted border-none rounded-xl text-sm focus:ring-2 focus:ring-accent/20 transition-all" />
                    {errors.dob && <p className="text-[10px] text-error font-bold mt-1 ml-1">{errors.dob.message}</p>}
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-primary/40 uppercase tracking-widest ml-1">Patient Type</label>
                    <select {...register('type')} className="w-full px-4 py-3 bg-surface-muted border-none rounded-xl text-sm focus:ring-2 focus:ring-accent/20 transition-all appearance-none">
                      <option value="NP">New Patient</option>
                      <option value="NR">New Referral</option>
                      <option value="Booked">Booked</option>
                      <option value="WalkIn">Walk-In</option>
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-primary/40 uppercase tracking-widest ml-1">Phone</label>
                    <input {...register('phone')} className="w-full px-4 py-3 bg-surface-muted border-none rounded-xl text-sm focus:ring-2 focus:ring-accent/20 transition-all" />
                    {errors.phone && <p className="text-[10px] text-error font-bold mt-1 ml-1">{errors.phone.message}</p>}
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-primary/40 uppercase tracking-widest ml-1">Email</label>
                    <input {...register('email')} className="w-full px-4 py-3 bg-surface-muted border-none rounded-xl text-sm focus:ring-2 focus:ring-accent/20 transition-all" />
                    {errors.email && <p className="text-[10px] text-error font-bold mt-1 ml-1">{errors.email.message}</p>}
                  </div>
                </motion.div>
              )}

              {step === 2 && (
                <motion.div
                  key="step2"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="space-y-6"
                >
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-primary/40 uppercase tracking-widest ml-1">Medical History & Notes</label>
                    <textarea 
                      {...register('medicalHistory')} 
                      rows={6}
                      placeholder="List any chronic conditions, previous surgeries, or current medications..."
                      className="w-full px-4 py-3 bg-surface-muted border-none rounded-xl text-sm focus:ring-2 focus:ring-accent/20 transition-all resize-none"
                    />
                  </div>
                </motion.div>
              )}

              {step === 3 && (
                <motion.div
                  key="step3"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="space-y-6"
                >
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-primary/40 uppercase tracking-widest ml-1">Insurance Information</label>
                    <input {...register('insuranceInfo')} placeholder="Provider Name & Policy Number" className="w-full px-4 py-3 bg-surface-muted border-none rounded-xl text-sm focus:ring-2 focus:ring-accent/20 transition-all" />
                    {errors.insuranceInfo && <p className="text-[10px] text-error font-bold mt-1 ml-1">{errors.insuranceInfo.message}</p>}
                  </div>
                  
                  <div className="p-6 bg-surface-muted rounded-2xl border border-primary/5">
                    <div className="flex items-start gap-4">
                      <div className="mt-1">
                        <input type="checkbox" {...register('consentSigned')} className="w-5 h-5 rounded border-primary/10 text-primary focus:ring-accent/20" />
                      </div>
                      <div>
                        <p className="text-sm font-bold text-primary mb-1">Consent to Treatment</p>
                        <p className="text-xs text-primary/60 leading-relaxed">
                          By checking this box, the patient (or legal guardian) consents to physical therapy evaluation and treatment. They acknowledge receipt of the clinic's privacy practices and financial policies.
                        </p>
                        {errors.consentSigned && <p className="text-[10px] text-error font-bold mt-2">{errors.consentSigned.message}</p>}
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            <div className="flex items-center justify-between mt-10 pt-6 border-t border-primary/5">
              <button
                type="button"
                onClick={step === 1 ? onClose : prevStep}
                className="flex items-center gap-2 px-6 py-3 text-primary/40 font-bold text-sm hover:text-primary transition-all"
              >
                <ChevronLeft size={16} />
                {step === 1 ? 'Cancel' : 'Back'}
              </button>
              
              {step < 3 ? (
                <button
                  type="button"
                  onClick={nextStep}
                  className="flex items-center gap-2 px-8 py-3 bg-primary text-white rounded-2xl font-bold text-sm hover:opacity-90 transition-all shadow-lg shadow-primary/10"
                >
                  Next Step
                  <ChevronRight size={16} />
                </button>
              ) : (
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex items-center gap-2 px-8 py-3 bg-accent text-white rounded-2xl font-bold text-sm hover:opacity-90 transition-all shadow-lg shadow-accent/10"
                >
                  {isSubmitting ? 'Saving...' : 'Complete & Save'}
                  <Check size={16} />
                </button>
              )}
            </div>
          </form>
        </div>
      </motion.div>
    </div>
  );
}
