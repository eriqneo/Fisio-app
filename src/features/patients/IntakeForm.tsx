import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { motion, AnimatePresence } from 'framer-motion';
import { Shield, Check, ChevronRight, Building2, AlertCircle } from 'lucide-react';
import { tenantService, patientService } from '@/db/services';
import { Tenant } from '@/types';

const intakeSchema = z.object({
  firstName: z.string().min(2, 'First name is required'),
  lastName: z.string().min(2, 'Last name is required'),
  dob: z.string().min(1, 'Date of birth is required'),
  phone: z.string().min(5, 'Phone number is required'),
  email: z.string().email('Invalid email address'),
  medicalHistory: z.string().min(10, 'Please provide some medical history'),
  insuranceInfo: z.string().min(1, 'Insurance info is required'),
  consentSigned: z.boolean().refine(val => val === true, 'You must consent to treatment'),
});

type IntakeFormData = z.infer<typeof intakeSchema>;

export default function IntakeForm() {
  const { tenantSlug } = useParams();
  const [tenant, setTenant] = useState<Tenant | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [error, setError] = useState('');

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<IntakeFormData>({
    resolver: zodResolver(intakeSchema),
  });

  useEffect(() => {
    async function loadTenant() {
      try {
        if (tenantSlug) {
          const t = await tenantService.findBySlug(tenantSlug);
          if (t) {
            setTenant(t);
          } else {
            setError('Clinic not found.');
          }
        }
      } catch (err) {
        setError('Failed to load clinic information.');
      } finally {
        setIsLoading(false);
      }
    }
    loadTenant();
  }, [tenantSlug]);

  const onSubmit = async (data: IntakeFormData) => {
    if (!tenant) return;

    try {
      await patientService.create({
        ...data,
        tenantId: tenant.id!,
        type: 'NP', // Default to New Patient
        createdAt: Date.now(),
      });
      setIsSubmitted(true);
    } catch (err) {
      console.error('Intake submission failed:', err);
      setError('Failed to submit form. Please try again.');
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-surface flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-primary/10 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  if (error || !tenant) {
    return (
      <div className="min-h-screen bg-surface flex items-center justify-center p-6">
        <div className="w-full max-w-md bg-white p-10 rounded-3xl shadow-xl text-center">
          <div className="w-16 h-16 bg-error/10 text-error rounded-2xl flex items-center justify-center mx-auto mb-6">
            <AlertCircle size={32} />
          </div>
          <h2 className="text-2xl font-serif text-primary mb-2">Error</h2>
          <p className="text-primary/40 mb-8">{error || 'Clinic not found'}</p>
        </div>
      </div>
    );
  }

  if (isSubmitted) {
    return (
      <div className="min-h-screen bg-surface flex items-center justify-center p-6">
        <motion.div 
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="w-full max-w-md bg-white p-10 rounded-3xl shadow-xl text-center"
        >
          <div className="w-16 h-16 bg-accent text-white rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-xl shadow-accent/20">
            <Check size={32} />
          </div>
          <h2 className="text-2xl font-serif text-primary mb-2">Form Submitted!</h2>
          <p className="text-primary/40 mb-8">Thank you for completing your intake form. We look forward to seeing you at {tenant.name}.</p>
          <div className="p-4 bg-surface-muted rounded-2xl">
            <p className="text-[10px] text-primary/30 font-bold uppercase tracking-widest">You can now close this window</p>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-surface py-12 px-6">
      <div className="max-w-3xl mx-auto">
        <header className="text-center mb-12">
          <div className="w-16 h-16 bg-primary rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-xl shadow-primary/10">
            <Shield className="text-accent" size={32} />
          </div>
          <h1 className="text-3xl font-serif text-primary mb-2">{tenant.name}</h1>
          <p className="text-primary/40 text-sm font-medium uppercase tracking-widest">Patient Intake Form</p>
        </header>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
          {/* Personal Info */}
          <section className="bg-white p-8 rounded-3xl border border-primary/5 shadow-sm">
            <h2 className="text-xl font-serif text-primary mb-6 flex items-center gap-3">
              <span className="w-8 h-8 bg-surface-muted rounded-lg flex items-center justify-center text-xs font-bold">1</span>
              Personal Information
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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
                <label className="text-xs font-bold text-primary/40 uppercase tracking-widest ml-1">Phone</label>
                <input {...register('phone')} className="w-full px-4 py-3 bg-surface-muted border-none rounded-xl text-sm focus:ring-2 focus:ring-accent/20 transition-all" />
                {errors.phone && <p className="text-[10px] text-error font-bold mt-1 ml-1">{errors.phone.message}</p>}
              </div>
              <div className="md:col-span-2 space-y-2">
                <label className="text-xs font-bold text-primary/40 uppercase tracking-widest ml-1">Email</label>
                <input {...register('email')} className="w-full px-4 py-3 bg-surface-muted border-none rounded-xl text-sm focus:ring-2 focus:ring-accent/20 transition-all" />
                {errors.email && <p className="text-[10px] text-error font-bold mt-1 ml-1">{errors.email.message}</p>}
              </div>
            </div>
          </section>

          {/* Medical History */}
          <section className="bg-white p-8 rounded-3xl border border-primary/5 shadow-sm">
            <h2 className="text-xl font-serif text-primary mb-6 flex items-center gap-3">
              <span className="w-8 h-8 bg-surface-muted rounded-lg flex items-center justify-center text-xs font-bold">2</span>
              Medical History
            </h2>
            <div className="space-y-2">
              <label className="text-xs font-bold text-primary/40 uppercase tracking-widest ml-1">Reason for Visit & History</label>
              <textarea 
                {...register('medicalHistory')} 
                rows={5}
                placeholder="Please describe your current symptoms and any relevant past medical history..."
                className="w-full px-4 py-3 bg-surface-muted border-none rounded-xl text-sm focus:ring-2 focus:ring-accent/20 transition-all resize-none"
              />
              {errors.medicalHistory && <p className="text-[10px] text-error font-bold mt-1 ml-1">{errors.medicalHistory.message}</p>}
            </div>
          </section>

          {/* Insurance & Consent */}
          <section className="bg-white p-8 rounded-3xl border border-primary/5 shadow-sm">
            <h2 className="text-xl font-serif text-primary mb-6 flex items-center gap-3">
              <span className="w-8 h-8 bg-surface-muted rounded-lg flex items-center justify-center text-xs font-bold">3</span>
              Insurance & Consent
            </h2>
            <div className="space-y-6">
              <div className="space-y-2">
                <label className="text-xs font-bold text-primary/40 uppercase tracking-widest ml-1">Insurance Provider & Policy #</label>
                <input {...register('insuranceInfo')} className="w-full px-4 py-3 bg-surface-muted border-none rounded-xl text-sm focus:ring-2 focus:ring-accent/20 transition-all" />
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
                      I hereby consent to physical therapy evaluation and treatment. I acknowledge that I have been informed of the clinic's privacy practices and financial policies.
                    </p>
                    {errors.consentSigned && <p className="text-[10px] text-error font-bold mt-2">{errors.consentSigned.message}</p>}
                  </div>
                </div>
              </div>
            </div>
          </section>

          <button 
            type="submit"
            disabled={isSubmitting}
            className="w-full py-5 bg-primary text-white rounded-3xl font-bold text-base hover:opacity-90 transition-all shadow-xl shadow-primary/20 flex items-center justify-center gap-3"
          >
            {isSubmitting ? 'Submitting...' : 'Submit Intake Form'}
            <ChevronRight size={20} />
          </button>
        </form>

        <footer className="mt-12 text-center">
          <p className="text-[10px] text-primary/20 font-bold uppercase tracking-widest">
            Powered by PhysioFlow Secure Medical Systems
          </p>
        </footer>
      </div>
    </div>
  );
}
