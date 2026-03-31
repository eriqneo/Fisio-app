import React, { useState } from 'react';
import { Calendar, Clock, Plus, CheckCircle2 } from 'lucide-react';
import { useTenantDb } from '@/hooks/useTenantDb';
import { motion, AnimatePresence } from 'framer-motion';
import { format, addDays } from 'date-fns';

interface FollowUpSchedulerProps {
  patientId: number;
  therapistId: number;
  onScheduled?: (date: Date) => void;
}

export default function FollowUpScheduler({ patientId, therapistId, onScheduled }: FollowUpSchedulerProps) {
  const { appointments, notifications } = useTenantDb();
  const [selectedDate, setSelectedDate] = useState(format(addDays(new Date(), 7), 'yyyy-MM-dd'));
  const [selectedTime, setSelectedTime] = useState('09:00');
  const [isScheduled, setIsScheduled] = useState(false);

  const handleSchedule = async () => {
    const startTime = new Date(`${selectedDate}T${selectedTime}`).getTime();
    const endTime = startTime + (45 * 60 * 1000); // 45 mins

    try {
      // 1. Create appointment placeholder
      await appointments.create({
        patientId,
        therapistId,
        startTime,
        endTime,
        status: 'scheduled',
        type: 'Follow-up',
        notes: 'Automatically scheduled from SOAP note'
      });

      // 2. Schedule reminder notification (12 midnight before)
      const reminderDate = new Date(startTime);
      reminderDate.setHours(0, 0, 0, 0);
      
      await notifications.create({
        patientId,
        type: 'appointment_reminder',
        scheduledAt: reminderDate.getTime(),
        status: 'pending',
        message: `Reminder: You have a follow-up appointment scheduled for ${format(startTime, 'MMM d')} at ${format(startTime, 'h:mm a')}.`
      });

      setIsScheduled(true);
      if (onScheduled) onScheduled(new Date(startTime));
    } catch (err) {
      console.error('Failed to schedule follow-up', err);
    }
  };

  return (
    <div className="bg-primary/5 p-6 rounded-[24px] border border-primary/5 space-y-6">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-white flex items-center justify-center text-primary shadow-sm">
          <Calendar size={20} />
        </div>
        <div>
          <h3 className="text-sm font-bold text-primary">Schedule Follow-up</h3>
          <p className="text-[10px] font-bold text-primary/30 uppercase tracking-widest">Automatic reminder will be set</p>
        </div>
      </div>

      <AnimatePresence mode="wait">
        {!isScheduled ? (
          <motion.div 
            key="form"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="space-y-4"
          >
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-primary/30 uppercase tracking-widest">Date</label>
                <input 
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className="w-full px-4 py-3 bg-white border-none rounded-xl text-xs font-bold text-primary focus:ring-2 focus:ring-primary/20 transition-all shadow-sm"
                />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-primary/30 uppercase tracking-widest">Time</label>
                <input 
                  type="time"
                  value={selectedTime}
                  onChange={(e) => setSelectedTime(e.target.value)}
                  className="w-full px-4 py-3 bg-white border-none rounded-xl text-xs font-bold text-primary focus:ring-2 focus:ring-primary/20 transition-all shadow-sm"
                />
              </div>
            </div>
            <button 
              onClick={handleSchedule}
              className="w-full py-3 bg-primary text-white rounded-xl font-bold text-[10px] uppercase tracking-widest hover:opacity-90 transition-all shadow-lg shadow-primary/10 flex items-center justify-center gap-2"
            >
              <Plus size={14} />
              Schedule & Set Reminder
            </button>
          </motion.div>
        ) : (
          <motion.div 
            key="success"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="py-4 text-center space-y-2"
          >
            <div className="w-12 h-12 rounded-full bg-emerald-500 text-white mx-auto flex items-center justify-center">
              <CheckCircle2 size={24} />
            </div>
            <p className="text-sm font-bold text-primary">Follow-up Scheduled!</p>
            <p className="text-[10px] text-primary/40 font-bold uppercase tracking-widest">
              {format(new Date(`${selectedDate}T${selectedTime}`), 'MMM d, h:mm a')}
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
