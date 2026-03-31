import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { motion, AnimatePresence } from 'framer-motion';
import { X, User, Mail, Phone, Calendar, MapPin, HeartPulse } from 'lucide-react';
import { useTenantDb } from '@/hooks/useTenantDb';
import { useQueryClient } from '@tanstack/react-query';

const patientSchema = z.object({
  firstName: z.string().min(2, 'First name is required'),
  lastName: z.string().min(2, 'Last name is required'),
  email: z.string().email('Invalid email address'),
  phone: z.string().min(10, 'Valid phone number is required'),
  dob: z.string().min(1, 'Date of birth is required'),
  gender: z.enum(['male', 'female', 'other']),
  address: z.string().optional(),
  emergencyContact: z.string().optional(),
  medicalConditions: z.string().optional(),
});

type PatientFormValues = z.infer<typeof patientSchema>;

interface PatientModalProps {
  isOpen: boolean;
  onClose: () => void;
  patient?: any; // If provided, we're editing
}

export default function PatientModal({ isOpen, onClose, patient }: PatientModalProps) {
  const { patients } = useTenantDb();
  const queryClient = useQueryClient();

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    reset
  } = useForm<PatientFormValues>({
    resolver: zodResolver(patientSchema),
    defaultValues: patient || {
      gender: 'male'
    }
  });

  const onSubmit = async (data: PatientFormValues) => {
    try {
      if (patient) {
        await patients.update(patient.id, data);
      } else {
        await patients.create({
          ...data,
          status: 'active',
          createdAt: Date.now()
        });
      }
      queryClient.invalidateQueries({ queryKey: ['patients'] });
      reset();
      onClose();
    } catch (error) {
      console.error('Failed to save patient:', error);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-primary/40 backdrop-blur-sm"
          />
          
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="relative w-full max-w-2xl bg-white rounded-[32px] shadow-2xl overflow-hidden"
          >
            <div className="p-8 border-b border-primary/5 flex items-center justify-between bg-surface-muted/30">
              <div>
                <h2 className="text-2xl font-serif text-primary">
                  {patient ? 'Edit Patient Profile' : 'Register New Patient'}
                </h2>
                <p className="text-[10px] font-bold text-primary/30 uppercase tracking-widest mt-1">
                  Clinic Digital Registry
                </p>
              </div>
              <button 
                onClick={onClose}
                className="p-2 hover:bg-primary/5 rounded-xl transition-colors text-primary/20 hover:text-primary"
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSubmit(onSubmit)} className="p-8 space-y-6 max-h-[70vh] overflow-y-auto scrollbar-thin">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* First Name */}
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-primary/40 uppercase tracking-widest ml-1">First Name</label>
                  <div className="relative">
                    <User className="absolute left-4 top-1/2 -translate-y-1/2 text-primary/20" size={16} />
                    <input
                      {...register('firstName')}
                      className="w-full pl-12 pr-4 py-3 bg-surface-muted/50 border border-primary/5 rounded-2xl text-sm focus:ring-2 focus:ring-accent/20 outline-none transition-all"
                      placeholder="e.g. John"
                    />
                  </div>
                  {errors.firstName && <p className="text-[10px] text-red-500 font-bold ml-1">{errors.firstName.message}</p>}
                </div>

                {/* Last Name */}
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-primary/40 uppercase tracking-widest ml-1">Last Name</label>
                  <div className="relative">
                    <User className="absolute left-4 top-1/2 -translate-y-1/2 text-primary/20" size={16} />
                    <input
                      {...register('lastName')}
                      className="w-full pl-12 pr-4 py-3 bg-surface-muted/50 border border-primary/5 rounded-2xl text-sm focus:ring-2 focus:ring-accent/20 outline-none transition-all"
                      placeholder="e.g. Doe"
                    />
                  </div>
                  {errors.lastName && <p className="text-[10px] text-red-500 font-bold ml-1">{errors.lastName.message}</p>}
                </div>

                {/* Email */}
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-primary/40 uppercase tracking-widest ml-1">Email Address</label>
                  <div className="relative">
                    <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-primary/20" size={16} />
                    <input
                      {...register('email')}
                      type="email"
                      className="w-full pl-12 pr-4 py-3 bg-surface-muted/50 border border-primary/5 rounded-2xl text-sm focus:ring-2 focus:ring-accent/20 outline-none transition-all"
                      placeholder="john.doe@example.com"
                    />
                  </div>
                  {errors.email && <p className="text-[10px] text-red-500 font-bold ml-1">{errors.email.message}</p>}
                </div>

                {/* Phone */}
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-primary/40 uppercase tracking-widest ml-1">Phone Number</label>
                  <div className="relative">
                    <Phone className="absolute left-4 top-1/2 -translate-y-1/2 text-primary/20" size={16} />
                    <input
                      {...register('phone')}
                      className="w-full pl-12 pr-4 py-3 bg-surface-muted/50 border border-primary/5 rounded-2xl text-sm focus:ring-2 focus:ring-accent/20 outline-none transition-all"
                      placeholder="+1 (555) 000-0000"
                    />
                  </div>
                  {errors.phone && <p className="text-[10px] text-red-500 font-bold ml-1">{errors.phone.message}</p>}
                </div>

                {/* DOB */}
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-primary/40 uppercase tracking-widest ml-1">Date of Birth</label>
                  <div className="relative">
                    <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 text-primary/20" size={16} />
                    <input
                      {...register('dob')}
                      type="date"
                      className="w-full pl-12 pr-4 py-3 bg-surface-muted/50 border border-primary/5 rounded-2xl text-sm focus:ring-2 focus:ring-accent/20 outline-none transition-all"
                    />
                  </div>
                  {errors.dob && <p className="text-[10px] text-red-500 font-bold ml-1">{errors.dob.message}</p>}
                </div>

                {/* Gender */}
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-primary/40 uppercase tracking-widest ml-1">Gender</label>
                  <select
                    {...register('gender')}
                    className="w-full px-4 py-3 bg-surface-muted/50 border border-primary/5 rounded-2xl text-sm focus:ring-2 focus:ring-accent/20 outline-none transition-all appearance-none"
                  >
                    <option value="male">Male</option>
                    <option value="female">Female</option>
                    <option value="other">Other</option>
                  </select>
                </div>
              </div>

              {/* Address */}
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-primary/40 uppercase tracking-widest ml-1">Residential Address</label>
                <div className="relative">
                  <MapPin className="absolute left-4 top-3 text-primary/20" size={16} />
                  <textarea
                    {...register('address')}
                    rows={2}
                    className="w-full pl-12 pr-4 py-3 bg-surface-muted/50 border border-primary/5 rounded-2xl text-sm focus:ring-2 focus:ring-accent/20 outline-none transition-all resize-none"
                    placeholder="Street, City, State, ZIP"
                  />
                </div>
              </div>

              {/* Medical Conditions */}
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-primary/40 uppercase tracking-widest ml-1">Primary Medical Conditions / Allergies</label>
                <div className="relative">
                  <HeartPulse className="absolute left-4 top-3 text-primary/20" size={16} />
                  <textarea
                    {...register('medicalConditions')}
                    rows={3}
                    className="w-full pl-12 pr-4 py-3 bg-surface-muted/50 border border-primary/5 rounded-2xl text-sm focus:ring-2 focus:ring-accent/20 outline-none transition-all resize-none"
                    placeholder="List any chronic conditions or known allergies..."
                  />
                </div>
              </div>

              <div className="pt-6 border-t border-primary/5 flex items-center justify-end gap-4">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-6 py-3 text-sm font-bold text-primary/40 hover:text-primary transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-8 py-3 bg-primary text-white rounded-2xl font-bold text-sm hover:opacity-90 transition-all shadow-lg shadow-primary/10 disabled:opacity-50"
                >
                  {isSubmitting ? 'Saving...' : patient ? 'Update Profile' : 'Register Patient'}
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
