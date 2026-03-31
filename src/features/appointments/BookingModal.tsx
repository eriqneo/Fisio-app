import React, { useState, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Calendar, Clock, User, FileText, Check, AlertCircle, Search, ChevronRight, ChevronDown } from 'lucide-react';
import { useTenantDb } from '@/hooks/useTenantDb';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { cn } from '@/lib/utils';
import { format, addMinutes, startOfDay, parse, isBefore, isAfter, isEqual } from 'date-fns';
import { Patient, User as Therapist, Appointment } from '@/types';

const bookingSchema = z.object({
  patientId: z.number().min(1, 'Please select a patient'),
  therapistId: z.number().min(1, 'Please select a therapist'),
  date: z.string().min(1, 'Date is required'),
  startTime: z.string().min(1, 'Start time is required'),
  duration: z.string().min(1, 'Duration is required'),
  type: z.string().min(1, 'Appointment type is required'),
  notes: z.string().optional(),
});

type BookingFormData = z.infer<typeof bookingSchema>;

interface BookingModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialData?: Partial<BookingFormData>;
  patientId?: number;
}

export default function BookingModal({ isOpen, onClose, initialData, patientId }: BookingModalProps) {
  const { patients, appointments, users } = useTenantDb();
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);

  const { data: patientList = [] } = useQuery({
    queryKey: ['patients'],
    queryFn: () => patients.list(),
  });

  const { data: therapists = [] } = useQuery({
    queryKey: ['therapists'],
    queryFn: async () => {
      const allUsers = await users.list();
      return allUsers.filter(u => u.role === 'therapist' || u.role === 'doctor');
    }
  });

  const filteredPatients = useMemo(() => {
    if (!searchQuery) return [];
    return patientList.filter(p => 
      `${p.firstName} ${p.lastName}`.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.email.toLowerCase().includes(searchQuery.toLowerCase())
    ).slice(0, 5);
  }, [patientList, searchQuery]);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors, isSubmitting },
    reset,
  } = useForm<BookingFormData>({
    resolver: zodResolver(bookingSchema),
    defaultValues: {
      duration: '60',
      type: 'Initial Assessment',
      ...initialData
    },
  });

  // Auto-select patient if patientId is provided
  React.useEffect(() => {
    if (isOpen && patientId) {
      // Only fetch if the selected patient is different from the patientId
      if (selectedPatient?.id !== patientId) {
        patients.findById(patientId).then(p => {
          if (p) {
            setSelectedPatient(p);
            setValue('patientId', p.id!);
          }
        });
      }
    } else if (!isOpen) {
      // Clear selection when modal closes
      if (selectedPatient !== null) {
        setSelectedPatient(null);
        reset();
      }
    }
  }, [isOpen, patientId, patients, selectedPatient?.id, setValue, reset]);

  const selectedTherapistId = watch('therapistId');
  const selectedDate = watch('date');

  const { data: existingAppointments = [] } = useQuery({
    queryKey: ['appointments', selectedDate],
    queryFn: () => appointments.list(),
    enabled: !!selectedDate,
  });

  const availableSlots = useMemo(() => {
    if (!selectedTherapistId || !selectedDate) return [];
    
    const therapist = therapists.find(t => t.id === selectedTherapistId);
    if (!therapist || !therapist.workingHours) {
      // Default working hours if not set
      const defaultHours = { start: '09:00', end: '17:00', lunchStart: '12:00', lunchEnd: '13:00' };
      return generateSlots(defaultHours, existingAppointments.filter(a => a.therapistId === selectedTherapistId), selectedDate);
    }
    
    return generateSlots(therapist.workingHours, existingAppointments.filter(a => a.therapistId === selectedTherapistId), selectedDate);
  }, [selectedTherapistId, selectedDate, therapists, existingAppointments]);

  function generateSlots(hours: any, dayAppointments: Appointment[], dateStr: string) {
    const slots = [];
    let current = parse(hours.start, 'HH:mm', new Date());
    const end = parse(hours.end, 'HH:mm', new Date());
    const lunchStart = hours.lunchStart ? parse(hours.lunchStart, 'HH:mm', new Date()) : null;
    const lunchEnd = hours.lunchEnd ? parse(hours.lunchEnd, 'HH:mm', new Date()) : null;

    while (isBefore(current, end)) {
      const timeStr = format(current, 'HH:mm');
      const slotStart = parse(`${dateStr} ${timeStr}`, 'yyyy-MM-dd HH:mm', new Date()).getTime();
      
      // Check if in lunch break
      const isLunch = lunchStart && lunchEnd && 
                     (isEqual(current, lunchStart) || (isAfter(current, lunchStart) && isBefore(current, lunchEnd)));

      // Check if overlaps with existing appointment
      const isBooked = dayAppointments.some(a => {
        return slotStart >= a.startTime && slotStart < a.endTime;
      });

      if (!isLunch && !isBooked) {
        slots.push(timeStr);
      }
      
      current = addMinutes(current, 30);
    }
    return slots;
  }

  const onSubmit = async (data: BookingFormData) => {
    try {
      const start = parse(`${data.date} ${data.startTime}`, 'yyyy-MM-dd HH:mm', new Date()).getTime();
      const end = addMinutes(start, parseInt(data.duration)).getTime();

      await appointments.create({
        patientId: data.patientId,
        therapistId: data.therapistId,
        startTime: start,
        endTime: end,
        status: 'scheduled',
        type: data.type,
        notes: data.notes,
      });

      queryClient.invalidateQueries({ queryKey: ['appointments'] });
      reset();
      onClose();
    } catch (error) {
      console.error('Failed to book appointment:', error);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="absolute inset-0 bg-primary/40 backdrop-blur-md"
      />
      
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        className="relative w-full max-w-2xl bg-white rounded-[2.5rem] shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-8 border-b border-primary/5 bg-white/80 backdrop-blur-md sticky top-0 z-10">
          <div>
            <h2 className="text-2xl font-serif text-primary tracking-tight">New Appointment</h2>
            <p className="text-[10px] text-primary/40 font-black uppercase tracking-[0.2em] mt-2">Schedule a clinical session</p>
          </div>
          <button onClick={onClose} className="p-3 hover:bg-surface-muted rounded-2xl transition-all group active:scale-95">
            <X size={20} className="text-primary/40 group-hover:text-primary transition-colors" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto custom-scrollbar p-8">
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-10">
            {/* Patient Selection Section */}
            <section className="space-y-4">
              <div className="flex items-center justify-between px-1">
                <label className="text-[10px] font-black text-primary/30 uppercase tracking-[0.2em]">Patient Information</label>
                {selectedPatient && (
                  <button 
                    type="button"
                    onClick={() => {
                      setSelectedPatient(null);
                      setValue('patientId', undefined as any);
                    }}
                    className="text-[10px] font-black text-accent uppercase tracking-[0.2em] hover:opacity-70 transition-opacity"
                  >
                    Change Patient
                  </button>
                )}
              </div>
              
              {selectedPatient ? (
                <motion.div 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex items-center justify-between p-5 bg-surface-muted/50 rounded-3xl border border-primary/5 group hover:border-accent/20 transition-all"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-14 h-14 rounded-2xl bg-primary text-white flex items-center justify-center font-bold text-lg shadow-xl shadow-primary/10">
                      {selectedPatient.firstName[0]}{selectedPatient.lastName[0]}
                    </div>
                    <div>
                      <p className="text-base font-bold text-primary tracking-tight">{selectedPatient.firstName} {selectedPatient.lastName}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-[10px] text-primary/40 font-bold uppercase tracking-widest">{selectedPatient.type}</span>
                        <span className="w-1 h-1 rounded-full bg-primary/10" />
                        <span className="text-[10px] text-primary/40 font-bold uppercase tracking-widest">{selectedPatient.email}</span>
                      </div>
                    </div>
                  </div>
                  <div className="w-10 h-10 rounded-full bg-emerald-500/10 text-emerald-500 flex items-center justify-center">
                    <Check size={18} />
                  </div>
                </motion.div>
              ) : (
                <div className="relative group">
                  <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-primary/20 group-focus-within:text-accent transition-colors" size={20} />
                  <input 
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search patient by name, email, or ID..."
                    className="w-full pl-14 pr-6 py-5 bg-surface-muted border-2 border-transparent rounded-3xl text-sm focus:bg-white focus:border-accent/20 focus:ring-4 focus:ring-accent/5 transition-all placeholder:text-primary/20"
                  />
                  <AnimatePresence>
                    {filteredPatients.length > 0 && (
                      <motion.div 
                        initial={{ opacity: 0, y: 10, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 10, scale: 0.95 }}
                        className="absolute top-full left-0 right-0 mt-3 bg-white rounded-[2rem] shadow-2xl border border-primary/5 z-20 overflow-hidden p-2"
                      >
                        {filteredPatients.map(p => (
                          <button
                            key={p.id}
                            type="button"
                            onClick={() => {
                              setSelectedPatient(p);
                              setValue('patientId', p.id!);
                              setSearchQuery('');
                            }}
                            className="w-full flex items-center gap-4 p-4 hover:bg-surface-muted rounded-2xl transition-all text-left group/item"
                          >
                            <div className="w-12 h-12 rounded-xl bg-primary/5 text-primary/40 flex items-center justify-center font-bold text-sm group-hover/item:bg-primary group-hover/item:text-white transition-all">
                              {p.firstName[0]}{p.lastName[0]}
                            </div>
                            <div className="flex-1">
                              <p className="text-sm font-bold text-primary tracking-tight">{p.firstName} {p.lastName}</p>
                              <p className="text-[10px] text-primary/30 font-bold uppercase tracking-widest mt-0.5">{p.email}</p>
                            </div>
                            <ChevronRight size={16} className="text-primary/10 group-hover/item:text-primary/40 transition-all group-hover/item:translate-x-1" />
                          </button>
                        ))}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              )}
              {errors.patientId && <p className="text-[10px] text-error font-black uppercase tracking-widest mt-2 ml-4 flex items-center gap-2"><AlertCircle size={12} /> {errors.patientId.message}</p>}
            </section>

            {/* Schedule Section */}
            <section className="space-y-6">
              <label className="text-[10px] font-black text-primary/30 uppercase tracking-[0.2em] px-1">Schedule Details</label>
              
              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-2">
                  <div className="relative group">
                    <User className="absolute left-5 top-1/2 -translate-y-1/2 text-primary/20 group-focus-within:text-accent transition-colors" size={18} />
                    <select 
                      {...register('therapistId', { valueAsNumber: true })} 
                      className="w-full pl-14 pr-10 py-5 bg-surface-muted border-2 border-transparent rounded-3xl text-sm focus:bg-white focus:border-accent/20 focus:ring-4 focus:ring-accent/5 transition-all appearance-none cursor-pointer"
                    >
                      <option value="">Select Therapist</option>
                      {therapists.map(t => (
                        <option key={t.id} value={t.id}>{t.name}</option>
                      ))}
                    </select>
                    <ChevronDown className="absolute right-5 top-1/2 -translate-y-1/2 text-primary/20 pointer-events-none" size={16} />
                  </div>
                  {errors.therapistId && <p className="text-[10px] text-error font-black uppercase tracking-widest mt-1 ml-4">{errors.therapistId.message}</p>}
                </div>

                <div className="space-y-2">
                  <div className="relative group">
                    <Calendar className="absolute left-5 top-1/2 -translate-y-1/2 text-primary/20 group-focus-within:text-accent transition-colors" size={18} />
                    <input 
                      type="date" 
                      {...register('date')} 
                      className="w-full pl-14 pr-6 py-5 bg-surface-muted border-2 border-transparent rounded-3xl text-sm focus:bg-white focus:border-accent/20 focus:ring-4 focus:ring-accent/5 transition-all cursor-pointer" 
                    />
                  </div>
                  {errors.date && <p className="text-[10px] text-error font-black uppercase tracking-widest mt-1 ml-4">{errors.date.message}</p>}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-2">
                  <div className="relative group">
                    <Clock className="absolute left-5 top-1/2 -translate-y-1/2 text-primary/20 group-focus-within:text-accent transition-colors" size={18} />
                    <select 
                      {...register('duration')} 
                      className="w-full pl-14 pr-10 py-5 bg-surface-muted border-2 border-transparent rounded-3xl text-sm focus:bg-white focus:border-accent/20 focus:ring-4 focus:ring-accent/5 transition-all appearance-none cursor-pointer"
                    >
                      <option value="30">30 Minutes</option>
                      <option value="60">60 Minutes</option>
                      <option value="90">90 Minutes</option>
                    </select>
                    <ChevronDown className="absolute right-5 top-1/2 -translate-y-1/2 text-primary/20 pointer-events-none" size={16} />
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="relative group">
                    <FileText className="absolute left-5 top-1/2 -translate-y-1/2 text-primary/20 group-focus-within:text-accent transition-colors" size={18} />
                    <select 
                      {...register('type')} 
                      className="w-full pl-14 pr-10 py-5 bg-surface-muted border-2 border-transparent rounded-3xl text-sm focus:bg-white focus:border-accent/20 focus:ring-4 focus:ring-accent/5 transition-all appearance-none cursor-pointer"
                    >
                      <option value="Initial Assessment">Initial Assessment</option>
                      <option value="Follow-up Session">Follow-up Session</option>
                      <option value="Manual Therapy">Manual Therapy</option>
                      <option value="Exercise Prescription">Exercise Prescription</option>
                      <option value="Telehealth Consultation">Telehealth Consultation</option>
                    </select>
                    <ChevronDown className="absolute right-5 top-1/2 -translate-y-1/2 text-primary/20 pointer-events-none" size={16} />
                  </div>
                </div>
              </div>
            </section>

            {/* Time Slot Selection */}
            <section className="space-y-4">
              <label className="text-[10px] font-black text-primary/30 uppercase tracking-[0.2em] px-1">Available Time Slots</label>
              {availableSlots.length > 0 ? (
                <div className="grid grid-cols-4 sm:grid-cols-6 gap-3">
                  {availableSlots.map(slot => {
                    const isSelected = watch('startTime') === slot;
                    return (
                      <button
                        key={slot}
                        type="button"
                        onClick={() => setValue('startTime', slot)}
                        className={cn(
                          "py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all border-2",
                          isSelected 
                            ? "bg-primary text-white border-primary shadow-xl shadow-primary/20 scale-105" 
                            : "bg-surface-muted/50 text-primary/40 border-transparent hover:bg-white hover:border-accent/20 hover:text-primary"
                        )}
                      >
                        {slot}
                      </button>
                    );
                  })}
                </div>
              ) : (
                <div className="p-10 text-center bg-surface-muted/30 rounded-[2rem] border border-dashed border-primary/10">
                  <Clock className="mx-auto text-primary/10 mb-3" size={32} />
                  <p className="text-[10px] font-black text-primary/20 uppercase tracking-[0.2em]">
                    {selectedTherapistId && selectedDate ? 'No available slots for this day' : 'Select therapist and date to see slots'}
                  </p>
                </div>
              )}
              {errors.startTime && <p className="text-[10px] text-error font-black uppercase tracking-widest mt-2 ml-4">{errors.startTime.message}</p>}
            </section>

            <section className="space-y-4">
              <label className="text-[10px] font-black text-primary/30 uppercase tracking-[0.2em] px-1">Additional Notes</label>
              <textarea 
                {...register('notes')} 
                rows={3} 
                placeholder="Any specific requirements or notes for this session..."
                className="w-full px-6 py-5 bg-surface-muted border-2 border-transparent rounded-[2rem] text-sm focus:bg-white focus:border-accent/20 focus:ring-4 focus:ring-accent/5 transition-all resize-none placeholder:text-primary/20" 
              />
            </section>

            <div className="pt-4">
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-6 bg-primary text-white rounded-[2rem] font-black text-xs uppercase tracking-[0.3em] hover:opacity-90 transition-all shadow-2xl shadow-primary/20 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed group"
              >
                {isSubmitting ? (
                  <div className="flex items-center justify-center gap-3">
                    <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                    <span>Processing...</span>
                  </div>
                ) : (
                  <div className="flex items-center justify-center gap-3">
                    <span>Confirm Booking</span>
                    <ChevronRight size={16} className="group-hover:translate-x-1 transition-transform" />
                  </div>
                )}
              </button>
            </div>
          </form>
        </div>
      </motion.div>
    </div>
  );
}
