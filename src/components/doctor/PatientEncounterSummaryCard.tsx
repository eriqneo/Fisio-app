import React from 'react';
import { motion } from 'framer-motion';
import { 
  Clock, 
  ChevronRight, 
  FileEdit, 
  CheckCircle2, 
  History,
  User
} from 'lucide-react';
import { ClinicalEncounter, Patient } from '@/types';
import { format } from 'date-fns';

interface PatientEncounterSummaryCardProps {
  encounter: ClinicalEncounter;
  patient: Patient;
  onClick: () => void;
  onSign?: () => void;
}

const statusConfig = {
  Draft: { color: 'bg-doctor-accent/10 text-doctor-accent border-doctor-accent/20', icon: FileEdit },
  Signed: { color: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20', icon: CheckCircle2 },
  Amended: { color: 'bg-blue-500/10 text-blue-500 border-blue-500/20', icon: History },
};

export default function PatientEncounterSummaryCard({ 
  encounter, 
  patient, 
  onClick,
  onSign 
}: PatientEncounterSummaryCardProps) {
  if (!encounter || !patient) return null;
  const status = statusConfig[encounter.status] || statusConfig.Draft;
  const StatusIcon = status.icon;

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -2 }}
      className="group bg-white p-5 rounded-3xl border border-primary/5 shadow-sm hover:shadow-xl hover:shadow-primary/5 transition-all cursor-pointer relative overflow-hidden"
      onClick={onClick}
    >
      <div className="flex items-center gap-5">
        {/* Patient Avatar */}
        <div className="w-14 h-14 rounded-2xl bg-surface-muted flex items-center justify-center text-primary/40 font-bold text-lg border border-primary/5 group-hover:bg-doctor-accent/5 group-hover:text-doctor-accent transition-colors">
          {patient.firstName[0]}{patient.lastName[0]}
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <h4 className="font-bold text-primary truncate">
              {patient.firstName} {patient.lastName}
            </h4>
            <span className="text-[10px] font-bold text-primary/20 uppercase tracking-widest">
              {patient.dob ? `${new Date().getFullYear() - new Date(patient.dob).getFullYear()}Y` : 'N/A'} • {patient.type}
            </span>
          </div>
          
          <div className="flex items-center gap-3">
            <span className="px-2 py-0.5 rounded-lg bg-surface-muted text-[10px] font-bold text-primary/40 uppercase tracking-widest border border-primary/5">
              {encounter.encounterType.replace(/([A-Z])/g, ' $1').trim()}
            </span>
            <p className="text-xs text-primary/60 truncate italic">
              "{encounter.chiefComplaint}"
            </p>
          </div>
        </div>

        {/* Status & Time */}
        <div className="text-right flex flex-col items-end gap-2">
          <div className="flex items-center gap-1.5 text-primary/30">
            <Clock size={12} />
            <span className="text-[10px] font-bold uppercase tracking-widest">
              {format(encounter.encounterDate, 'h:mm a')}
            </span>
          </div>
          
          <div className={`flex items-center gap-1.5 px-3 py-1 rounded-full border text-[10px] font-bold uppercase tracking-widest ${status.color}`}>
            <StatusIcon size={10} />
            {encounter.status}
          </div>
        </div>
      </div>

      {/* Hover Actions Overlay */}
      <div className="absolute inset-y-0 right-0 w-32 bg-gradient-to-l from-white via-white to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-end px-6 gap-3">
        {encounter.status === 'Draft' && onSign && (
          <button 
            onClick={(e) => { e.stopPropagation(); onSign(); }}
            className="p-2 bg-emerald-500 text-white rounded-xl shadow-lg shadow-emerald-500/20 hover:scale-110 transition-transform"
          >
            <CheckCircle2 size={16} />
          </button>
        )}
        <div className="p-2 bg-primary text-white rounded-xl shadow-lg shadow-primary/20 hover:scale-110 transition-transform">
          <ChevronRight size={16} />
        </div>
      </div>
    </motion.div>
  );
}
