import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { format } from 'date-fns';
import { 
  ArrowLeft, 
  Mail, 
  Phone, 
  Calendar, 
  FileText, 
  Activity, 
  History, 
  ClipboardList,
  ChevronRight,
  ExternalLink,
  ShieldCheck,
  Clock,
  Video,
  MessageSquare,
  LayoutGrid,
  Printer
} from 'lucide-react';
import { useTenantDb } from '@/hooks/useTenantDb';
import { useDoctorDb } from '@/hooks/useDoctorDb';
import ChatWidget from '../telehealth/ChatWidget';
import ExerciseVideoGallery from '../telehealth/ExerciseVideoGallery';
import BookingModal from '../appointments/BookingModal';

export default function PatientProfilePage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { patients, users, appointments } = useTenantDb();
  const { encounters } = useDoctorDb();
  const [activeTab, setActiveTab] = useState<'overview' | 'medical' | 'appointments' | 'clinical' | 'videos'>('overview');
  const [isBookingModalOpen, setIsBookingModalOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState<string>('');

  const { data: patient, isLoading } = useQuery({
    queryKey: ['patient', id],
    queryFn: () => patients.findById(Number(id)),
    enabled: !!id,
  });

  const { data: patientAppointments } = useQuery({
    queryKey: ['patient-appointments', id],
    queryFn: () => appointments.listByPatient(Number(id)),
    enabled: !!id,
  });

  const { data: clinicalEncounters } = useQuery({
    queryKey: ['clinical-encounters', id],
    queryFn: () => encounters.listByPatient(Number(id)),
    enabled: !!id,
  });

  const { data: doctors } = useQuery({
    queryKey: ['doctors-list'],
    queryFn: () => users.list(),
  });

  const handlePrintNotes = (encounter: any) => {
    const doctor = doctors?.find(d => d.id === encounter.signedBy);
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    printWindow.document.write(`
      <html>
        <head>
          <title>Clinical Notes - ${patient?.firstName} ${patient?.lastName}</title>
          <style>
            body { font-family: sans-serif; padding: 40px; color: #1a1a1a; line-height: 1.6; }
            .header { border-bottom: 2px solid #eee; padding-bottom: 20px; margin-bottom: 30px; }
            .patient-info { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 30px; }
            .section { margin-bottom: 25px; }
            .section-title { font-weight: bold; text-transform: uppercase; font-size: 12px; color: #666; margin-bottom: 10px; border-bottom: 1px solid #eee; }
            .notes { white-space: pre-wrap; background: #f9f9f9; padding: 20px; border-radius: 8px; }
            .footer { margin-top: 50px; padding-top: 20px; border-top: 1px solid #eee; font-size: 12px; color: #999; }
          </style>
        </head>
        <body>
          <div class="header">
            <h1 style="margin: 0; font-family: serif;">Clinical Consultation Record</h1>
            <p style="margin: 5px 0 0; color: #666;">Date: ${new Date(encounter.encounterDate).toLocaleDateString()} ${new Date(encounter.encounterDate).toLocaleTimeString()}</p>
          </div>

          <div class="patient-info">
            <div>
              <div class="section-title">Patient Details</div>
              <strong>${patient?.firstName} ${patient?.lastName}</strong><br>
              DOB: ${new Date(patient?.dob || '').toLocaleDateString()}<br>
              ID: ${patient?.id}
            </div>
            <div>
              <div class="section-title">Provider Details</div>
              <strong>Dr. ${doctor?.name || 'Unknown'}</strong><br>
              Status: ${encounter.status}
            </div>
          </div>

          <div class="section">
            <div class="section-title">Clinical Notes / Chief Complaint</div>
            <div class="notes">${encounter.chiefComplaint || 'No notes recorded.'}</div>
          </div>

          <div class="footer">
            <p>This is a confidential medical record. Generated on ${new Date().toLocaleString()}</p>
          </div>
          <script>
            window.onload = () => { window.print(); window.close(); };
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  if (isLoading) {
    return (
      <div className="h-96 flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-primary/10 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  if (!patient) {
    return (
      <div className="p-12 text-center">
        <h2 className="text-2xl font-serif text-primary mb-4">Patient not found</h2>
        <button 
          onClick={() => navigate('/patients')}
          className="px-6 py-3 bg-primary text-white rounded-2xl font-bold text-sm"
        >
          Back to Dashboard
        </button>
      </div>
    );
  }

  const initials = `${patient.firstName[0]}${patient.lastName[0]}`.toUpperCase();

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div className="flex items-center gap-6">
          <button 
            onClick={() => navigate('/patients')}
            className="p-3 bg-white border border-primary/5 rounded-2xl text-primary/40 hover:text-primary transition-all shadow-sm"
          >
            <ArrowLeft size={20} />
          </button>
          
          <div className="flex items-center gap-5">
            <div className="w-20 h-20 rounded-3xl bg-primary flex items-center justify-center text-white text-2xl font-bold shadow-xl shadow-primary/20">
              {initials}
            </div>
            <div>
              <div className="flex items-center gap-3 mb-1">
                <h1 className="text-3xl font-serif text-primary">{patient.firstName} {patient.lastName}</h1>
                <span className="px-3 py-1 rounded-full bg-accent/10 text-accent text-[10px] font-bold uppercase tracking-widest">
                  {patient.type}
                </span>
              </div>
              <div className="flex items-center gap-4 text-sm text-primary/40 font-medium">
                <span className="flex items-center gap-1.5"><Calendar size={14} /> {new Date(patient.dob).toLocaleDateString()}</span>
                <span className="flex items-center gap-1.5"><ShieldCheck size={14} /> ID: {patient.id}</span>
              </div>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button className="flex items-center gap-2 px-6 py-3 bg-white border border-primary/5 text-primary font-bold text-sm rounded-2xl hover:bg-surface-muted transition-all shadow-sm">
            <Mail size={16} />
            Message
          </button>
          <button 
            onClick={() => setIsBookingModalOpen(true)}
            className="flex items-center gap-2 px-6 py-3 bg-primary text-white font-bold text-sm rounded-2xl hover:opacity-90 transition-all shadow-lg shadow-primary/10"
          >
            <Calendar size={16} />
            Book Appointment
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1 p-1 bg-surface-muted rounded-2xl w-fit">
        {[
          { id: 'overview', label: 'Overview', icon: LayoutGrid },
          { id: 'medical', label: 'Medical History', icon: Activity },
          { id: 'appointments', label: 'Appointments', icon: Clock },
          { id: 'clinical', label: 'Clinical Notes', icon: FileText },
          { id: 'videos', label: 'Videos', icon: Video },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`flex items-center gap-2 px-6 py-2.5 rounded-xl text-xs font-bold transition-all ${
              activeTab === tab.id 
                ? 'bg-white text-primary shadow-sm' 
                : 'text-primary/40 hover:text-primary'
            }`}
          >
            <tab.icon size={14} />
            {tab.label}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-8">
          {activeTab === 'overview' && (
            <>
              {/* Stats Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                {[
                  { label: 'Total Sessions', value: clinicalEncounters?.length.toString() || '0', icon: History, color: 'text-blue-500', bg: 'bg-blue-50' },
                  { label: 'Next Session', value: 'Mar 15, 10:00 AM', icon: Calendar, color: 'text-emerald-500', bg: 'bg-emerald-50' },
                  { label: 'Active Plan', value: 'Knee Rehab', icon: Activity, color: 'text-purple-500', bg: 'bg-purple-50' },
                ].map((stat, i) => (
                  <div key={i} className="bg-white p-6 rounded-3xl border border-primary/5 shadow-sm">
                    <div className={`w-10 h-10 rounded-xl ${stat.bg} ${stat.color} flex items-center justify-center mb-4`}>
                      <stat.icon size={20} />
                    </div>
                    <p className="text-[10px] font-bold text-primary/30 uppercase tracking-widest mb-1">{stat.label}</p>
                    <p className="text-lg font-bold text-primary">{stat.value}</p>
                  </div>
                ))}
              </div>

              {/* Recent Activity */}
              <div className="bg-white rounded-3xl border border-primary/5 shadow-sm overflow-hidden">
                <div className="p-6 border-b border-primary/5 flex items-center justify-between">
                  <h3 className="font-serif text-xl text-primary">Recent Activity</h3>
                  <button 
                    onClick={() => setActiveTab('clinical')}
                    className="text-[10px] font-bold text-accent uppercase tracking-widest hover:underline"
                  >
                    View All
                  </button>
                </div>
                <div className="divide-y divide-primary/5">
                  {clinicalEncounters?.slice(0, 3).map((encounter, i) => (
                    <div 
                      key={encounter.id} 
                      className="p-6 flex items-start gap-4 hover:bg-surface-muted/30 transition-all cursor-pointer"
                      onClick={() => setActiveTab('clinical')}
                    >
                      <div className="w-10 h-10 rounded-xl bg-surface-muted flex items-center justify-center text-primary/40">
                        <FileText size={20} />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center justify-between mb-1">
                          <p className="font-bold text-primary">Clinical Consultation</p>
                          <span className="text-[10px] text-primary/30 font-bold uppercase">
                            {new Date(encounter.encounterDate).toLocaleDateString()}
                          </span>
                        </div>
                        <p 
                          className="text-sm text-primary/60 line-clamp-2 prose prose-sm"
                          dangerouslySetInnerHTML={{ __html: encounter.chiefComplaint || 'No notes recorded.' }}
                        />
                      </div>
                      <ChevronRight size={16} className="text-primary/20 mt-1" />
                    </div>
                  ))}
                  {(!clinicalEncounters || clinicalEncounters.length === 0) && (
                    <div className="p-12 text-center text-primary/20 font-bold uppercase tracking-widest text-xs">
                      No recent clinical activity
                    </div>
                  )}
                </div>
              </div>
            </>
          )}

          {activeTab === 'medical' && (
            <div className="bg-white p-8 rounded-3xl border border-primary/5 shadow-sm space-y-8">
              <section>
                <h3 className="font-serif text-xl text-primary mb-4">Medical History</h3>
                <div className="p-6 bg-surface-muted rounded-2xl text-sm text-primary/60 leading-relaxed">
                  {patient.medicalHistory || 'No medical history recorded.'}
                </div>
              </section>
              
              <section>
                <h3 className="font-serif text-xl text-primary mb-4">Insurance Details</h3>
                <div className="flex items-center gap-4 p-6 border border-primary/5 rounded-2xl">
                  <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-500 flex items-center justify-center">
                    <ShieldCheck size={24} />
                  </div>
                  <div>
                    <p className="font-bold text-primary">{patient.insuranceInfo}</p>
                    <p className="text-xs text-primary/40 font-medium uppercase tracking-widest mt-0.5">Primary Coverage</p>
                  </div>
                </div>
              </section>
            </div>
          )}

          {activeTab === 'clinical' && (
            <div className="space-y-6">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 px-4">
                <div>
                  <h3 className="font-serif text-2xl text-primary">Clinical Consultation Notes</h3>
                  <p className="text-primary/40 text-xs font-bold uppercase tracking-widest mt-1">
                    Select a date to view and print consultation records
                  </p>
                </div>
                <div className="flex items-center gap-4">
                  <div className="relative">
                    <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 text-primary/20" size={16} />
                    <input 
                      type="date"
                      value={selectedDate}
                      onChange={(e) => setSelectedDate(e.target.value)}
                      className="pl-12 pr-4 py-3 bg-white border border-primary/5 rounded-2xl text-sm font-bold text-primary focus:ring-2 focus:ring-accent/20 outline-none transition-all shadow-sm"
                    />
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-[40px] border border-primary/5 shadow-2xl shadow-primary/5 overflow-hidden min-h-[400px] flex flex-col">
                {(() => {
                  const filteredEncounters = selectedDate 
                    ? clinicalEncounters?.filter(enc => new Date(enc.encounterDate).toISOString().split('T')[0] === selectedDate)
                    : clinicalEncounters?.slice(0, 1); // Default to most recent if no date selected

                  if (!filteredEncounters || filteredEncounters.length === 0) {
                    return (
                      <div className="flex-1 flex flex-col items-center justify-center p-20 text-center">
                        <div className="w-20 h-20 rounded-3xl bg-surface-muted flex items-center justify-center text-primary/10 mb-6">
                          <FileText size={40} />
                        </div>
                        <p className="text-xl font-bold text-primary/20 uppercase tracking-[0.2em]">
                          {selectedDate ? `No records for ${new Date(selectedDate).toLocaleDateString()}` : 'No clinical records found'}
                        </p>
                        <p className="text-sm text-primary/40 mt-2 max-w-xs mx-auto">
                          {selectedDate ? 'Try selecting another date from the calendar above.' : 'Consultation notes will appear here once recorded.'}
                        </p>
                      </div>
                    );
                  }

                  return (
                    <div className="divide-y divide-primary/5">
                      {filteredEncounters.map((encounter) => {
                        if (!encounter) return null;
                        const doctor = doctors?.find(d => d.id === encounter.signedBy);
                        return (
                          <div key={encounter.id} className="p-10 space-y-10">
                            <div className="flex items-start justify-between">
                              <div className="flex items-center gap-6">
                                <div className="w-16 h-16 rounded-2xl bg-primary/5 flex items-center justify-center text-primary">
                                  <Activity size={28} />
                                </div>
                                <div>
                                  <h4 className="text-2xl font-bold text-primary tracking-tight">Consultation Record</h4>
                                  <div className="flex items-center gap-4 mt-1.5">
                                    <span className="text-sm font-bold text-primary/40 uppercase tracking-widest">
                                      {new Date(encounter.encounterDate).toLocaleDateString(undefined, { dateStyle: 'full' })}
                                    </span>
                                    <span className="w-1.5 h-1.5 rounded-full bg-primary/10" />
                                    <span className="text-sm font-bold text-primary/40 uppercase tracking-widest">
                                      Dr. {doctor?.name || 'Unknown'}
                                    </span>
                                  </div>
                                </div>
                              </div>
                              <div className="flex items-center gap-4">
                                <span className={`px-5 py-2 rounded-xl text-xs font-bold uppercase tracking-widest border ${
                                  encounter.status === 'Signed' 
                                    ? 'bg-emerald-50 text-emerald-600 border-emerald-100' 
                                    : 'bg-orange-50 text-orange-600 border-orange-100'
                                }`}>
                                  {encounter.status}
                                </span>
                                <button 
                                  onClick={() => handlePrintNotes(encounter)}
                                  className="flex items-center gap-3 px-6 py-3 bg-accent text-white rounded-2xl text-xs font-bold uppercase tracking-widest hover:opacity-90 transition-all shadow-lg shadow-accent/20"
                                >
                                  <Printer size={18} />
                                  Print Record
                                </button>
                              </div>
                            </div>

                            <div className="bg-surface-muted/30 rounded-[32px] p-10 border border-primary/5 min-h-[300px]">
                              <div className="flex items-center gap-3 mb-8">
                                <div className="h-px flex-1 bg-primary/5" />
                                <span className="text-[10px] font-bold text-primary/20 uppercase tracking-[0.3em]">Clinical Findings & Assessment</span>
                                <div className="h-px flex-1 bg-primary/5" />
                              </div>
                              <div 
                                className="text-primary/80 leading-relaxed prose prose-lg max-w-none"
                                dangerouslySetInnerHTML={{ __html: encounter.chiefComplaint || 'No clinical notes recorded for this session.' }}
                              />
                            </div>

                            <div className="flex items-center justify-between pt-4">
                              <div className="flex items-center gap-3 text-primary/30">
                                <ShieldCheck size={16} />
                                <span className="text-[10px] font-bold uppercase tracking-widest">Digitally Signed & Verified</span>
                              </div>
                              <div className="text-[10px] font-bold text-primary/20 uppercase tracking-widest">
                                Encounter ID: {encounter.id}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  );
                })()}
              </div>
            </div>
          )}

          {activeTab === 'appointments' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h3 className="font-serif text-2xl text-primary">Appointment History</h3>
                <button 
                  onClick={() => setIsBookingModalOpen(true)}
                  className="px-4 py-2 bg-primary text-white rounded-xl font-bold text-xs uppercase tracking-widest hover:bg-accent transition-all flex items-center gap-2"
                >
                  <Calendar size={14} />
                  Book New
                </button>
              </div>

              <div className="grid gap-4">
                {!patientAppointments || patientAppointments.length === 0 ? (
                  <div className="bg-white p-12 rounded-3xl border border-dashed border-primary/20 text-center">
                    <div className="w-16 h-16 bg-primary/5 rounded-full flex items-center justify-center mx-auto mb-4 text-primary/20">
                      <Calendar size={32} />
                    </div>
                    <p className="text-primary/40 font-medium">No appointments found for this patient.</p>
                  </div>
                ) : (
                  patientAppointments.map((apt) => {
                    const doctor = doctors?.find(d => d.id === apt.therapistId);
                    const isPast = new Date(apt.startTime) < new Date();
                    
                    return (
                      <div 
                        key={apt.id}
                        className={`bg-white p-6 rounded-3xl border border-primary/5 shadow-sm flex items-center justify-between group hover:border-primary/20 transition-all ${isPast ? 'opacity-75' : ''}`}
                      >
                        <div className="flex items-center gap-6">
                          <div className={`w-14 h-14 rounded-2xl flex flex-col items-center justify-center font-bold ${isPast ? 'bg-primary/5 text-primary/40' : 'bg-accent/10 text-accent'}`}>
                            <span className="text-lg leading-none">{format(new Date(apt.startTime), 'dd')}</span>
                            <span className="text-[10px] uppercase tracking-widest">{format(new Date(apt.startTime), 'MMM')}</span>
                          </div>
                          
                          <div>
                            <div className="flex items-center gap-2 mb-1">
                              <h4 className="font-bold text-primary">{apt.type}</h4>
                              <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-widest ${
                                apt.status === 'completed' ? 'bg-emerald-500/10 text-emerald-500' :
                                apt.status === 'cancelled' ? 'bg-rose-500/10 text-rose-500' :
                                'bg-amber-500/10 text-amber-500'
                              }`}>
                                {apt.status}
                              </span>
                            </div>
                            <div className="flex items-center gap-4 text-xs text-primary/40 font-medium">
                              <span className="flex items-center gap-1.5">
                                <Clock size={12} />
                                {format(new Date(apt.startTime), 'HH:mm')} - {format(new Date(apt.endTime), 'HH:mm')}
                              </span>
                              <span className="flex items-center gap-1.5">
                                <ShieldCheck size={12} />
                                Dr. {doctor?.name || 'Unknown'}
                              </span>
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-3">
                          <button className="p-2 text-primary/20 group-hover:text-primary transition-all">
                            <ChevronRight size={20} />
                          </button>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          )}

          {activeTab === 'videos' && (
            <ExerciseVideoGallery patientId={patient.id!} />
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-8">
          {/* Contact Card */}
          <div className="bg-white p-8 rounded-3xl border border-primary/5 shadow-sm">
            <h3 className="font-serif text-xl text-primary mb-6">Contact Information</h3>
            <div className="space-y-6">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-xl bg-surface-muted flex items-center justify-center text-primary/40">
                  <Mail size={18} />
                </div>
                <div>
                  <p className="text-xs text-primary/40 font-bold uppercase tracking-widest mb-0.5">Email</p>
                  <p className="text-sm font-bold text-primary">{patient.email}</p>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-xl bg-surface-muted flex items-center justify-center text-primary/40">
                  <Phone size={18} />
                </div>
                <div>
                  <p className="text-xs text-primary/40 font-bold uppercase tracking-widest mb-0.5">Phone</p>
                  <p className="text-sm font-bold text-primary">{patient.phone}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Active Treatment Plan */}
          <div className="bg-primary p-8 rounded-3xl shadow-xl shadow-primary/20 text-white relative overflow-hidden">
            <div className="absolute -top-10 -right-10 w-40 h-40 bg-white/5 rounded-full blur-3xl" />
            <div className="relative z-10">
              <div className="flex items-center justify-between mb-6">
                <h3 className="font-serif text-xl">Active Plan</h3>
                <Activity size={24} className="text-accent" />
              </div>
              <div className="space-y-4 mb-8">
                <div className="flex items-center justify-between text-xs font-bold uppercase tracking-widest text-white/40">
                  <span>Progress</span>
                  <span>65%</span>
                </div>
                <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                  <div className="h-full bg-accent w-[65%] rounded-full" />
                </div>
              </div>
              <button className="w-full py-3 bg-white text-primary rounded-xl font-bold text-xs uppercase tracking-widest hover:bg-accent hover:text-white transition-all">
                View Full Plan
              </button>
            </div>
          </div>
        </div>
      </div>
      
      <ChatWidget 
        otherUserId={patient.id!} 
        otherUserName={`${patient.firstName} ${patient.lastName}`} 
      />

      <BookingModal 
        isOpen={isBookingModalOpen}
        onClose={() => setIsBookingModalOpen(false)}
        patientId={patient.id}
      />
    </div>
  );
}

