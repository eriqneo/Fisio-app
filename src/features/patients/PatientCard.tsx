import React from 'react';
import { motion } from 'framer-motion';
import { MoreVertical, Eye, CheckCircle2, Calendar, User, MessageSquare } from 'lucide-react';
import { Patient } from '@/types';
import { useNavigate } from 'react-router-dom';

interface PatientCardProps {
  patient: Patient;
  onCheckIn?: (id: number) => void;
  onBook?: (patient: Patient) => void;
}

const typeColors = {
  NP: 'bg-blue-100 text-blue-700 border-blue-200',
  NR: 'bg-purple-100 text-purple-700 border-purple-200',
  Booked: 'bg-emerald-100 text-emerald-700 border-emerald-200',
  WalkIn: 'bg-orange-100 text-orange-700 border-orange-200',
};

const typeLabels = {
  NP: 'New Patient',
  NR: 'New Referral',
  Booked: 'Booked',
  WalkIn: 'Walk-In',
};

export default function PatientCard({ patient, onCheckIn, onBook }: PatientCardProps) {
  const navigate = useNavigate();
  const initials = `${patient.firstName[0]}${patient.lastName[0]}`.toUpperCase();

  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9 }}
      whileHover={{ y: -4 }}
      className="bg-white p-4 rounded-2xl border border-primary/5 shadow-sm hover:shadow-xl hover:shadow-primary/5 transition-all group"
    >
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-surface-muted flex items-center justify-center text-primary/40 font-bold text-sm border border-primary/5">
            {initials}
          </div>
          <div>
            <h4 className="text-sm font-bold text-primary truncate max-w-[120px]">
              {patient.firstName} {patient.lastName}
            </h4>
            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${typeColors[patient.type]}`}>
              {typeLabels[patient.type]}
            </span>
          </div>
        </div>
        <button className="p-1.5 text-primary/20 hover:text-primary hover:bg-surface-muted rounded-lg transition-all">
          <MoreVertical size={16} />
        </button>
      </div>

      <div className="space-y-2 mb-4">
        <div className="flex items-center gap-2 text-[11px] text-primary/40 font-medium">
          <Calendar size={12} />
          <span>Registered: {new Date(patient.createdAt || Date.now()).toLocaleDateString()}</span>
        </div>
      </div>

      <div className="grid grid-cols-4 gap-2">
        <button 
          onClick={() => navigate(`/patients/${patient.id}`)}
          className="flex flex-col items-center justify-center gap-1 p-2 rounded-xl bg-surface-muted hover:bg-primary hover:text-white transition-all group/btn"
        >
          <Eye size={14} className="text-primary/40 group-hover/btn:text-white" />
          <span className="text-[9px] font-bold uppercase tracking-wider">View</span>
        </button>
        <button 
          onClick={() => navigate(`/patients/${patient.id}?tab=videos`)}
          className="flex flex-col items-center justify-center gap-1 p-2 rounded-xl bg-surface-muted hover:bg-accent hover:text-white transition-all group/btn"
        >
          <MessageSquare size={14} className="text-primary/40 group-hover/btn:text-white" />
          <span className="text-[9px] font-bold uppercase tracking-wider">Chat</span>
        </button>
        <button 
          onClick={() => onCheckIn?.(patient.id!)}
          className="flex flex-col items-center justify-center gap-1 p-2 rounded-xl bg-surface-muted hover:bg-accent hover:text-white transition-all group/btn"
        >
          <CheckCircle2 size={14} className="text-primary/40 group-hover/btn:text-white" />
          <span className="text-[9px] font-bold uppercase tracking-wider">Check-in</span>
        </button>
        <button 
          onClick={() => onBook?.(patient)}
          className="flex flex-col items-center justify-center gap-1 p-2 rounded-xl bg-surface-muted hover:bg-primary hover:text-white transition-all group/btn"
        >
          <Calendar size={14} className="text-primary/40 group-hover/btn:text-white" />
          <span className="text-[9px] font-bold uppercase tracking-wider">Book</span>
        </button>
      </div>
    </motion.div>
  );
}
