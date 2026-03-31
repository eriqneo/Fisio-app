import React, { useState, useMemo, useRef } from 'react';
import { motion } from 'framer-motion';
import { 
  Users, 
  ClipboardCheck, 
  BarChart3, 
  FileText,
  Plus,
  Search,
  AlertCircle,
  ChevronRight,
  TrendingUp,
  Calendar,
  Mail,
  Clock,
  PlayCircle,
  ArrowRight
} from 'lucide-react';
import { useDoctorDb } from '@/hooks/useDoctorDb';
import { useTenantDb } from '@/hooks/useTenantDb';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import DoctorSidebar from '@/components/doctor/DoctorSidebar';
import PatientEncounterSummaryCard from '@/components/doctor/PatientEncounterSummaryCard';
import PatientQuickView from '@/components/doctor/PatientQuickView';
import { useVirtualizer } from '@tanstack/react-virtual';
import { useAuthStore } from '@/store/useAuthStore';
import { isSameDay, format } from 'date-fns';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';

const KPI_CARDS = [
  { label: 'Patients Today', value: '12', icon: Users, trend: '+2' },
  { label: 'Pending Sign-offs', value: '3', icon: ClipboardCheck, trend: '-1', alert: true },
  { label: 'Awaiting Results', value: '8', icon: BarChart3, trend: '+4' },
  { label: 'Certificates to Issue', value: '5', icon: FileText, trend: '0' },
];

export default function DoctorDashboard() {
  const { encounters } = useDoctorDb();
  const { patients, appointments } = useTenantDb();
  const { user: currentUser } = useAuthStore();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [selectedEncounterId, setSelectedEncounterId] = useState<number | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [reviewingAptId, setReviewingAptId] = useState<number | null>(null);
  const [reviewNotes, setReviewNotes] = useState('');
  const [isEndingReview, setIsEndingReview] = useState(false);

  const { data: encounterList = [], isLoading: isLoadingEncounters } = useQuery({
    queryKey: ['doctor-encounters'],
    queryFn: () => encounters.list(),
  });

  const { data: patientList = [] } = useQuery({
    queryKey: ['patients'],
    queryFn: () => patients.list(),
  });

  const { data: appointmentList = [] } = useQuery({
    queryKey: ['appointments', 'today'],
    queryFn: () => appointments.list(),
  });

  const myQueue = useMemo(() => {
    if (!currentUser) return [];
    return appointmentList
      .filter(a => 
        a.therapistId === currentUser.id && 
        isSameDay(new Date(a.startTime), new Date()) &&
        ['arrived', 'in-progress'].includes(a.status)
      )
      .sort((a, b) => {
        if (a.status === 'in-progress') return -1;
        if (b.status === 'in-progress') return 1;
        return (a.arrivedAt || 0) - (b.arrivedAt || 0);
      });
  }, [appointmentList, currentUser]);

  const filteredEncounters = useMemo(() => {
    return encounterList
      .filter(e => {
        const patient = patientList.find(p => p.id === e.patientId);
        if (!patient) return false;
        const fullName = `${patient.firstName} ${patient.lastName}`.toLowerCase();
        return fullName.includes(searchQuery.toLowerCase());
      })
      .sort((a, b) => b.encounterDate - a.encounterDate);
  }, [encounterList, patientList, searchQuery]);

  const recentPatients = useMemo(() => {
    const uniqueIds = Array.from(new Set(encounterList.map(e => e.patientId))).slice(0, 8);
    return uniqueIds.map(id => patientList.find(p => p.id === id)).filter(Boolean);
  }, [encounterList, patientList]);

  const unsignedCount = encounterList.filter(e => e.status === 'Draft').length;

  const handleStartReview = async (apt: any) => {
    try {
      // 1. Update appointment status to 'in-progress'
      await appointments.update(apt.id!, { status: 'in-progress' });
      
      // 2. Create a clinical encounter if one doesn't exist for this appointment
      const existingEncounter = encounterList.find(e => e.appointmentId === apt.id);
      if (!existingEncounter) {
        await encounters.start({
          patientId: apt.patientId,
          doctorId: currentUser!.id!,
          appointmentId: apt.id,
          encounterType: 'InitialConsultation',
          chiefComplaint: '',
        });
      }
      
      setReviewingAptId(apt.id!);
      setReviewNotes('');
      queryClient.invalidateQueries({ queryKey: ['appointments'] });
      queryClient.invalidateQueries({ queryKey: ['doctor-encounters'] });
      toast.success('Review started');
    } catch (error) {
      console.error('Failed to start review:', error);
      toast.error('Failed to start review');
    }
  };

  const handleEndReview = async () => {
    if (!reviewingAptId) return;
    setIsEndingReview(true);
    try {
      // 1. Update appointment status to 'completed'
      await appointments.update(reviewingAptId, { status: 'completed', endTime: Date.now() });
      
      // 2. Update the encounter with the notes and sign it
      const encounter = encounterList.find(e => e.appointmentId === reviewingAptId);
      if (encounter) {
        if (encounter.status === 'Draft') {
          await encounters.saveDraft(encounter.id!, { chiefComplaint: reviewNotes });
          await encounters.sign(encounter.id!, currentUser!.id!);
          toast.success('Review completed and signed');
        } else {
          toast.info('Review already signed, skipping update');
        }
      }
      
      setReviewingAptId(null);
      setReviewNotes('');
      queryClient.invalidateQueries({ queryKey: ['appointments'] });
      queryClient.invalidateQueries({ queryKey: ['doctor-encounters'] });
    } catch (error) {
      console.error('Failed to end review:', error);
      toast.error('Failed to end review');
    } finally {
      setIsEndingReview(false);
    }
  };

  // Virtualization for long lists
  const parentRef = useRef<HTMLDivElement>(null);
  const rowVirtualizer = useVirtualizer({
    count: filteredEncounters.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 100,
    overscan: 5,
  });

  return (
    <div className="p-8 space-y-8">
      {/* Page Title Section */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
        <div>
          <h1 className="text-3xl font-serif text-primary">Clinical Workspace</h1>
          <p className="text-primary/40 text-[10px] font-bold uppercase tracking-[0.2em] mt-1">
            Welcome back, {currentUser?.name} • {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
          </p>
        </div>

        <div className="flex items-center gap-4">
          <div className="relative w-72">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-primary/20" size={16} />
            <input 
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search patients..."
              className="w-full pl-12 pr-4 py-3 bg-white border border-primary/5 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-doctor-accent/20 transition-all shadow-sm"
            />
          </div>
          <button className="p-3 bg-white border border-primary/5 rounded-2xl text-primary/40 hover:text-primary transition-colors shadow-sm">
            <Calendar size={20} />
          </button>
        </div>
      </div>

      {/* Unsigned Drafts Alert */}
      {unsignedCount > 0 && (
        <motion.div 
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center justify-between p-4 bg-doctor-accent/10 border border-doctor-accent/20 rounded-2xl"
        >
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-doctor-accent text-doctor-sidebar flex items-center justify-center shadow-lg shadow-doctor-accent/20">
              <AlertCircle size={18} />
            </div>
            <p className="text-sm font-bold text-doctor-sidebar">
              You have {unsignedCount} unsigned clinical notes awaiting your review.
            </p>
          </div>
          <button className="text-[10px] font-bold uppercase tracking-widest text-doctor-sidebar hover:underline">
            Review Now
          </button>
        </motion.div>
      )}

      {/* KPI Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {KPI_CARDS.map((kpi, i) => (
          <div key={i} className="bg-white p-6 rounded-3xl border border-primary/5 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex items-start justify-between mb-4">
              <div className={`p-3 rounded-2xl ${kpi.alert ? 'bg-doctor-accent/10 text-doctor-accent' : 'bg-primary/5 text-primary/40'}`}>
                <kpi.icon size={20} />
              </div>
              <div className="flex items-center gap-1 text-[10px] font-bold text-emerald-500">
                <TrendingUp size={12} />
                {kpi.trend}
              </div>
            </div>
            <p className="text-2xl font-bold text-primary mb-1">{kpi.value}</p>
            <p className="text-[10px] font-bold text-primary/30 uppercase tracking-widest">{kpi.label}</p>
          </div>
        ))}
      </div>

      <div className="flex flex-col lg:flex-row gap-8 min-h-0">
        {/* Main Queue */}
        <div className="flex-1 flex flex-col min-w-0">
            {/* My Live Queue Section */}
            <section className="mb-10">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-lg font-bold text-primary uppercase tracking-widest flex items-center gap-3">
                  My Live Queue
                  <span className="px-2 py-0.5 bg-accent/10 text-accent text-[10px] rounded-lg">
                    {myQueue.length}
                  </span>
                </h2>
                <button 
                  onClick={() => navigate('/doctor/queue')}
                  className="text-[10px] font-bold text-accent uppercase tracking-widest hover:underline flex items-center gap-1"
                >
                  View Full Board <ArrowRight size={12} />
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {myQueue.length === 0 ? (
                  <div className="col-span-full p-8 text-center bg-white rounded-[32px] border border-dashed border-primary/10">
                    <Clock className="text-primary/10 mx-auto mb-3" size={32} />
                    <p className="text-sm text-primary/40 italic">No patients waiting in your queue.</p>
                  </div>
                ) : (
                  myQueue.map((apt) => {
                    const patient = patientList.find(p => p.id === apt.patientId);
                    const isInProgress = apt.status === 'in-progress';
                    const isReviewing = reviewingAptId === apt.id;
                    
                    return (
                      <div 
                        key={apt.id}
                        className={`p-5 rounded-[32px] border transition-all ${
                          isInProgress 
                            ? 'bg-primary text-white border-primary shadow-xl shadow-primary/20' 
                            : 'bg-white border-primary/5 shadow-sm hover:shadow-md'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-4">
                          <span className={`px-2 py-1 rounded-lg text-[9px] font-bold uppercase tracking-widest ${
                            isInProgress ? 'bg-white/10 text-white' : 'bg-accent/10 text-accent'
                          }`}>
                            {apt.status === 'in-progress' ? 'In Progress' : 'Waiting'}
                          </span>
                          {isInProgress ? <PlayCircle size={18} className="text-accent" /> : <Clock size={18} className="text-primary/20" />}
                        </div>
                        <div className="flex items-center gap-4">
                          <div className={`w-12 h-12 rounded-2xl flex items-center justify-center font-bold text-sm ${
                            isInProgress ? 'bg-white/10' : 'bg-surface-muted'
                          }`}>
                            {patient?.firstName[0]}{patient?.lastName[0]}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-bold truncate">{patient?.firstName} {patient?.lastName}</p>
                            <p className={`text-[10px] font-bold uppercase tracking-widest ${
                              isInProgress ? 'text-white/40' : 'text-primary/30'
                            }`}>
                              {apt.type} • {format(apt.startTime, 'h:mm a')}
                            </p>
                          </div>
                          
                          {!isInProgress && (
                            <button 
                              onClick={() => handleStartReview(apt)}
                              className="px-4 py-2 bg-accent text-doctor-sidebar rounded-xl text-[10px] font-bold uppercase tracking-widest hover:scale-105 transition-all"
                            >
                              Start Review
                            </button>
                          )}

                          {isInProgress && !isReviewing && (
                            <button 
                              onClick={() => setReviewingAptId(apt.id!)}
                              className="px-4 py-2 bg-white/10 text-white rounded-xl text-[10px] font-bold uppercase tracking-widest hover:bg-white/20 transition-all"
                            >
                              Open Notes
                            </button>
                          )}

                          <button 
                            onClick={() => navigate(`/doctor/encounters/${apt.id}/history`)}
                            className={`p-3 rounded-xl transition-all ${
                              isInProgress 
                                ? 'bg-white/10 text-white hover:bg-white/20' 
                                : 'bg-primary/5 text-primary/40 hover:bg-primary hover:text-white'
                            }`}
                          >
                            <ArrowRight size={18} />
                          </button>
                        </div>

                        {isReviewing && (
                          <motion.div 
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            className="mt-6 pt-6 border-t border-white/10 space-y-4"
                          >
                            <div className="space-y-2">
                              <label className="text-[10px] font-bold uppercase tracking-widest text-white/40">Clinical Notes</label>
                              <textarea 
                                value={reviewNotes}
                                onChange={(e) => setReviewNotes(e.target.value)}
                                placeholder="Enter clinical observations, symptoms, or initial assessment..."
                                className="w-full h-32 bg-white/5 border border-white/10 rounded-2xl p-4 text-sm text-white placeholder:text-white/20 focus:outline-none focus:ring-2 focus:ring-accent/50 transition-all resize-none"
                              />
                            </div>
                            <div className="flex items-center gap-3">
                              <button 
                                onClick={handleEndReview}
                                disabled={isEndingReview}
                                className="flex-1 py-3 bg-accent text-doctor-sidebar rounded-2xl text-[10px] font-bold uppercase tracking-widest hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50"
                              >
                                {isEndingReview ? 'Completing...' : 'End Review & Sign'}
                              </button>
                              <button 
                                onClick={() => setReviewingAptId(null)}
                                className="px-6 py-3 bg-white/5 text-white rounded-2xl text-[10px] font-bold uppercase tracking-widest hover:bg-white/10 transition-all"
                              >
                                Minimize
                              </button>
                            </div>
                          </motion.div>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            </section>

            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-bold text-primary uppercase tracking-widest flex items-center gap-3">
                Recent Clinical Records
                <span className="px-2 py-0.5 bg-primary/5 text-primary/40 text-[10px] rounded-lg">
                  {filteredEncounters.length}
                </span>
              </h2>
              <div className="flex items-center gap-2">
                <button className="text-[10px] font-bold text-primary/40 uppercase tracking-widest hover:text-primary transition-colors">All Statuses</button>
                <ChevronRight size={14} className="text-primary/20 rotate-90" />
              </div>
            </div>

            <div 
              ref={parentRef}
              className="flex-1 overflow-y-auto pr-2 space-y-4 scrollbar-thin scrollbar-thumb-primary/5"
            >
              {isLoadingEncounters ? (
                <div className="flex flex-col items-center justify-center h-64 gap-4">
                  <div className="w-10 h-10 border-4 border-doctor-accent border-t-transparent rounded-full animate-spin" />
                  <p className="text-[10px] font-bold text-primary/20 uppercase tracking-widest">Syncing Encounters</p>
                </div>
              ) : filteredEncounters.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-64 text-center p-10 bg-white rounded-[32px] border border-dashed border-primary/10">
                  <Users className="text-primary/10 mb-4" size={48} />
                  <p className="text-sm font-medium text-primary/40 italic">No encounters scheduled for today.</p>
                </div>
              ) : (
                <div
                  style={{
                    height: `${rowVirtualizer.getTotalSize()}px`,
                    width: '100%',
                    position: 'relative',
                  }}
                >
                  {rowVirtualizer.getVirtualItems().map((virtualRow) => {
                    const encounter = filteredEncounters[virtualRow.index];
                    if (!encounter) return null;
                    const patient = patientList.find(p => p.id === encounter.patientId);
                    if (!patient) return null;

                    return (
                      <div
                        key={virtualRow.key}
                        style={{
                          position: 'absolute',
                          top: 0,
                          left: 0,
                          width: '100%',
                          height: `${virtualRow.size}px`,
                          transform: `translateY(${virtualRow.start}px)`,
                        }}
                        className="py-2"
                      >
                        <PatientEncounterSummaryCard 
                          encounter={encounter}
                          patient={patient}
                          onClick={() => setSelectedEncounterId(encounter.id!)}
                          onSign={() => console.log('Sign encounter', encounter.id)}
                        />
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Sidebar */}
          <aside className="w-full lg:w-80 space-y-8 flex flex-col min-h-0">
            {/* Quick Actions */}
            <section className="bg-doctor-sidebar p-8 rounded-[32px] shadow-2xl shadow-doctor-sidebar/20 text-white">
              <h3 className="text-xs font-bold uppercase tracking-[0.2em] text-white/40 mb-6">Quick Actions</h3>
              <div className="grid grid-cols-1 gap-3">
                {[
                  { label: 'New Encounter', icon: Plus },
                  { label: 'Certificate', icon: FileText },
                  { label: 'Referral Letter', icon: Mail },
                  { label: 'Progress Report', icon: BarChart3 },
                ].map((action, i) => (
                  <button 
                    key={i}
                    className="flex items-center gap-3 p-4 bg-white/5 hover:bg-white/10 rounded-2xl transition-all group text-left"
                  >
                    <div className="w-8 h-8 bg-doctor-accent rounded-xl flex items-center justify-center text-doctor-sidebar group-hover:scale-110 transition-transform">
                      <action.icon size={16} />
                    </div>
                    <span className="text-sm font-medium">{action.label}</span>
                  </button>
                ))}
              </div>
            </section>

            {/* Recent Patients */}
            <section className="flex-1 flex flex-col min-h-0">
              <h3 className="text-xs font-bold uppercase tracking-[0.2em] text-primary/30 mb-6 px-2">Recent Patients</h3>
              <div className="flex-1 overflow-y-auto space-y-3 pr-2">
                {recentPatients.map((p, i) => (
                  <button 
                    key={i}
                    className="w-full flex items-center gap-4 p-4 bg-white rounded-2xl border border-primary/5 hover:border-doctor-accent/30 transition-all group"
                  >
                    <div className="w-10 h-10 rounded-xl bg-surface-muted flex items-center justify-center text-primary/40 font-bold text-xs group-hover:bg-doctor-accent group-hover:text-doctor-sidebar transition-colors">
                      {p?.firstName[0]}{p?.lastName[0]}
                    </div>
                    <div className="flex-1 text-left min-w-0">
                      <p className="text-sm font-bold text-primary truncate">{p?.firstName} {p?.lastName}</p>
                      <p className="text-[10px] text-primary/40 font-medium uppercase tracking-widest">Last seen 2 days ago</p>
                    </div>
                    <ChevronRight size={14} className="text-primary/10 group-hover:text-doctor-accent transition-colors" />
                  </button>
                ))}
              </div>
            </section>
          </aside>
        </div>

      <PatientQuickView 
        encounterId={selectedEncounterId}
        onClose={() => setSelectedEncounterId(null)}
      />
    </div>
  );
}
